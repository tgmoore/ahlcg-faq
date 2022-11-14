import { Injectable } from '@angular/core';

import { DescribeTableCommand, DescribeTableCommandInput, DescribeTableCommandOutput, DynamoDBClient, DynamoDBClientResolvedConfig } from '@aws-sdk/client-dynamodb';
import { CognitoIdentityClient, ServiceInputTypes, ServiceOutputTypes } from '@aws-sdk/client-cognito-identity';
import { fromCognitoIdentityPool } from '@aws-sdk/credential-provider-cognito-identity';
import { NodeHttpHandler } from '@aws-sdk/node-http-handler';

import { Agent } from 'https';

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
    this._log(new DescribeTableCommand({ TableName: TABLE_NAME }), 'Describe Table')
  }

  private async _log(cmd: DescribeTableCommand, msg: string) {
    try {
      await this._dynamoClient.send(cmd);
      console.log('Success', msg);
    } catch (err) {
        console.log('Error', err);
    }
  }
}
