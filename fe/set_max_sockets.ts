import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { NodeHttpHandler } from "@aws-sdk/node-http-handler";
import  https from "https";

var agent = new https.Agent({
	// keep sockets alive to avoid TCP connection overhead
  keepAlive: true,
  // keep alive for the default 1000 ms
  keepAliveMsecs: 1000,
	// allow maximum 5 sockets per host
  maxSockets: 5
});

var dynamodbClient = new DynamoDBClient({
  requestHandler: new NodeHttpHandler({
    httpsAgent: agent
 })
});