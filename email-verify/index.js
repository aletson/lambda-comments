var AWS = require('aws-sdk');

exports.handler = function(event,context,callback) {
  var dynamoClient = new AWS.DynamoDB.DocumentClient()
  var params = {
	  TableName: "comments",
    IndexName: "approval_uuid-index",
	  KeyConditionExpression: "approval_uuid = :uuid",
    ExpressionAttributeValues: {
      ":uuid": event.queryStringParameters.uid
    }
  };
    
  dynamoClient.query(params, function(err, data) {
    if(err) {
      console.error('Query failed: ', JSON.stringify(err, null, 2));
    } else {
      data.Items.forEach(function(comment) {
        var params = {
          TableName: 'comments',
          Key: {
            "post_uid": comment.post_uid,
            "sortKey": comment.sortKey
          },
          UpdateExpression: "remove approval_uuid",
          ReturnValues: "ALL_NEW"
        };
        dynamoClient.update(params, function(err, data) {
          if (err) {
            console.error('Update failed: ', JSON.stringify(err, null, 2));
          } else {
            var response = {
              "isBase64Encoded": false,
              "headers": {"Content-Type": "text/html"},
              "statusCode": 200,
              "body": '<html><head><title>Comment Approved - ajl.io</title></head><body>Approval successful! This window can now be closed.</body></html>'
	          };
            callback(err, response);
          }
        });
      });
    }
  });    
};
