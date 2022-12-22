import { Injectable } from '@angular/core';

import { AttributeValue, BatchWriteItemCommand, BatchWriteItemCommandInput, DescribeTableCommand, DynamoDBClient, ScanCommand, ScanCommandInput, WriteRequest } from '@aws-sdk/client-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';
import { marshall, unmarshall } from '@aws-sdk/util-dynamodb';

import { AhdbService } from './ahdb.service';

import { FAQ } from './ahdb.types';

import { delay, finalize, forkJoin, from, map, startWith, Subject, switchMap, takeWhile, tap } from 'rxjs';

const REGION = 'us-east-1';
const READER_IDENTITY_POOL_ID = 'us-east-1:f88541e9-22b6-41e7-8835-17ca4a61c009';
const faqs = [] as {
  code: string;
  name: string;
  html: string;
  text: string;
  updated: {
      date: string;
      timezone_type: number;
      timezone: string;
  };
}[];
const codeNames = [] as Array<readonly [string, string]>;

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
      identityPoolId: READER_IDENTITY_POOL_ID,
    })
  });

  private _storedFAQs = new Map<string, Set<FAQ>>();

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
      attributeNames: {
        '#text': 'text',
        '#name': 'name',
      } as Record<string, string>,
      attributeValues: { ':value': { S: searchValue } } as Record<string, AttributeValue>
    };
    const projectionExpression = '#name,html';

    return this.readItems({ table: 'faqs', projectionExpression, filter }).pipe(map(output => output.Items?.map(item => unmarshall(item)) ?? []));
  }

  // next steps:
  //    investigate making them searchable
  //      elasticsearch?

  persistFAQs(startCode: string) {
    const commandInput: BatchWriteItemCommandInput = {
      RequestItems: { 'faqs': [] }
    };
    const accum = new Subject<Record<string, AttributeValue> | undefined>();
    const item: Record<string, AttributeValue> | undefined = startCode ? { code: { S: startCode } } : undefined;

    return accum.pipe(
      takeWhile(lastEvaluatedKey => !!lastEvaluatedKey),
      startWith(item),
      delay(1500),
      switchMap(start =>
        this.readItems({ table: 'cards', projectionExpression: 'code', limit: 10, start}).pipe(
          map(output => {
            accum.next(output.LastEvaluatedKey);
            console.log('last evaluated key: ', output.LastEvaluatedKey);
            return output.Items?.map(item => unmarshall(item)) ?? [];
          }))
      ),
      switchMap(items => forkJoin([
        ...items.map(item => item['code'] ?? '').filter(code => !!code).map(code => this._ahdb.getFAQ(code))
      ])),
      map(faqs => faqs.reduce((prev, curr) => prev.concat(curr), [])),
      tap(faqs => {
        console.log('fetched', faqs);
        // deal with duplicates returned from faqs endpoint
        marshall(faqs[0])
        faqs.map(faq => this._storedFAQs.set(faq.code, (this._storedFAQs.get(faq.code) ?? new Set<FAQ>()).add(faq)));
      }),
      finalize(() => {
        // this._storedFAQs.values().
        // commandInput.RequestItems = {
        //   'faqs': faqs.map<WriteRequest>(faq => ({
        //       PutRequest:  {
        //         Item: marshall(faq), 
        //       }
        //     }))
        // };
        // this._dynamoClient.send(new BatchWriteItemCommand(commandInput));
      })       
    );

  }

  searchFAQs(filter: string) {
    return this.readItems({ table: 'faqs', limit: 5 }).pipe(map(output => output.Items?.map(item => unmarshall(item)['html'] ?? '') ?? []));
  }

  writeFAQs() {
    const nameMap = new Map<string, string>(codeNames.values())

    let start = 0;
    let end = 10;

    while(start < faqs.length) {
      this._batchWriteElements(faqs.slice(start, end).map(faq => marshall(Object.assign(faq, { name: nameMap.get(faq.code) }))));
      start = end;
      end += 10;
    }
  }

  private async _log(cmd: DescribeTableCommand | ScanCommand, msg: string) {
    try {
      await this._dynamoClient.send(cmd);
      console.log('Success', msg);
    } catch (err) {
        console.log('Error', err);
    }
  }

  private _batchWriteElements(els: Record<string, AttributeValue>[]) {
    const commandInput: BatchWriteItemCommandInput = {
      RequestItems: { 'faqs': [] }
    };

    commandInput.RequestItems = {
      'faqs': els.map<WriteRequest>(faq => ({
          PutRequest:  {
            Item: faq,
          }
        }))
    };

    this._dynamoClient.send(new BatchWriteItemCommand(commandInput));
  }
}
