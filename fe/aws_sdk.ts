AWS.config.region = 'us-east-1'; // Region
AWS.config.credentials = new AWS.CognitoIdentityCredentials({
    IdentityPoolId: 'us-east-1:f88541e9-22b6-41e7-8835-17ca4a61c009',
	RoleArn: 'arn:aws:iam::336112483177:role/Cognito_DynamoPoolUnauth_Role'
});