var AWS = require('aws-sdk');

exports.handler = function(event,context,callback) {
  var dynamoClient = new AWS.DynamoDB.DocumentClient()
  
  var params = {
    TableName: 'comments',
    Key: {
      'approved': event.queryStringParameters.uid
    },
    UpdateExpression: "set approved = :a",
    ExpressionAttributeValues:{
      ":a": ''
    }, 
    ReturnValues: "UPDATED_NEW"
  };
  dynamoClient.update(params, function(err, data) {
    if (err) {
      console.error('Update failed: ', JSON.stringify(err, null, 2));
    } else {
      var response = {
        "isBase64Encoded": false,
        "headers": {"Content-Type": "text/html"}, //This is a totally unnecessary ternary
        "statusCode": 200,
        "body": '<html><head><title>Comment Approved - ajl.io</title></head><body>Approval successful! This window can now be closed.</body></html>;'
	    };
      callback(err, response);
    }
}
