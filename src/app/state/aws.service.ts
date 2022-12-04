import { Injectable } from '@angular/core';

import { AttributeValue, BatchWriteItemCommand, BatchWriteItemCommandInput, DescribeTableCommand, DynamoDBClient, ScanCommand, ScanCommandInput, WriteRequest } from '@aws-sdk/client-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

import { AhdbService } from './ahdb.service';

import { delay, filter, forkJoin, from, map, startWith, Subject, switchMap, tap } from 'rxjs';

const REGION = 'us-east-1';
const IDENTITY_POOL_ID = 'us-east-1:f88541e9-22b6-41e7-8835-17ca4a61c009';
type TableName = 'cards' | 'faqs';
interface ReadItemsParameters {
  filter?: {
    expression: string,
    attributeNames: Record<string, string>,
    attributeValues: Record<string, AttributeValue>
  },
  limit?: number,
  projectionExpression?: string,
  start?: Record<string, AttributeValue>,
  table: TableName,
};

@Injectable({
  providedIn: 'root'
})
export class AwsService {
  private _dynamoClient = new DynamoDBClient({
    region: REGION,
    credentials: fromCognitoIdentityPool({
      client: new CognitoIdentityClient({ region: REGION}),
      identityPoolId: IDENTITY_POOL_ID,
    })
  });

  private _storedFAQs: Record<string, AttributeValue>[] = [];

  constructor(private _ahdb: AhdbService) { }

  readItems({table, projectionExpression, limit = 100, start, filter}: ReadItemsParameters) {
    let commandInput: ScanCommandInput = {
      TableName: table,
      ...(projectionExpression
        ? { ProjectionExpression: projectionExpression }
        : {}),
      ...(limit
        ? { Limit: limit }
        : {}),
      ...(start
        ? { ExclusiveStartKey: start }
        : {}),
      ...(filter
        ? {
          FilterExpression: filter.expression,
          ExpressionAttributeNames: { ...filter.attributeNames },
          ExpressionAttributeValues: { ...filter.attributeValues}
        }
        : {})
    };

    return from(this._dynamoClient.send(new ScanCommand(commandInput)));
  }

  getFAQs(searchValue: string) {
    const filter = {
      expression: 'contains(#text, :value)',
      attributeNames: { '#text': 'text' } as Record<string, string>,
      attributeValues: { ':value': { S: searchValue } } as Record<string, AttributeValue>
    };

    return this.readItems({ table: 'faqs', limit: 5, filter }).pipe(map(output => output.Items?.map(item => unmarshall(item)['html'] ?? '') ?? []));
  }

  // next steps:
  //    fetch all FAQ entries
  //    investigate making them searchable
  //      elasticsearch?
  //    lower permissions for unauth user

  persistFAQs(startCode: string) {
    const commandInput: BatchWriteItemCommandInput = {
      RequestItems: { 'faqs': [] }
    };
    const accum = new Subject<Record<string, AttributeValue> | undefined>();
    const item: Record<string, AttributeValue> | undefined = startCode ? { code: { S: startCode } } : undefined;

    this._storedFAQs = [];

    return accum.pipe(
      startWith(item),
      delay(3000),
      switchMap(start => this.readItems({ table: 'cards', projectionExpression: 'code', limit: 10, start}).pipe(
        map(output => {
          accum.next(output.LastEvaluatedKey);
          return output.Items?.map(item => unmarshall(item)) ?? [];
        }))),
        switchMap(items => forkJoin([
          ...items.map(item => item['code'] ?? '').filter(code => !!code).map(code => this._ahdb.getFAQ(code))
        ])),
        map(faqs => faqs.reduce((prev, curr) => prev.concat(curr), []).map(faq => marshall(faq))),
        filter(faqs => faqs?.length > 0),
        tap(faqs => {
          console.log('fetched', faqs);
          // deal with duplicates returned from faqs endpoint
          this._storedFAQs = this._storedFAQs.concat(faqs);
        }),
        switchMap(faqs => {
          commandInput.RequestItems = {
            'faqs': faqs.map(faq => ({
                PutRequest:  {
                  Item: faq
                }
              })
            )
          };
          return from(this._dynamoClient.send(new BatchWriteItemCommand(commandInput)));
        })
    );
  }

  searchFAQs(filter: string) {
    return this.readItems({ table: 'faqs', limit: 5 }).pipe(map(output => output.Items?.map(item => unmarshall(item)['html'] ?? '') ?? []));
  }

  private async _log(cmd: DescribeTableCommand | ScanCommand, msg: string) {
    try {
      await this._dynamoClient.send(cmd);
      console.log('Success', msg);
    } catch (err) {
        console.log('Error', err);
    }
  }
}
