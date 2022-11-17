import { Injectable } from '@angular/core';

import { DescribeTableCommand, DynamoDBClient, ScanCommand } from '@aws-sdk/client-dynamodb';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { CognitoIdentityClient } from '@aws-sdk/client-cognito-identity';

import { from, map } from 'rxjs';

const REGION = 'us-east-1';
const IDENTITY_POOL_ID = 'us-east-1:f88541e9-22b6-41e7-8835-17ca4a61c009';
const TABLE_NAME = 'cards';

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

  constructor() { }

  readItems() {
    return from(this._dynamoClient.send(new ScanCommand({ TableName: TABLE_NAME }))).pipe(
      map(x => x?.Items || [])
    );
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
