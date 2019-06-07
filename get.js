// Parameters: uid

// Get all from DynamoDB
// Sort key: timestamp
// Partition key for table: uid

var AWS = require("aws-sdk");

AWS.config.update({
	 region: "us-east-1"
});
const allowedOrigins = [
    "http://ajl.io",
    "http://www.ajl.io",
    "https://ajl.io",
    "https?://[a-z]*.?ajl.io",
];

exports.handler = function(event,context,callback) {
  const origin = event.headers.Origin || event.headers.origin;
  var goodOrigin = false;

  if (origin) {
    allowedOrigins.forEach( allowedOrigin => {
      if (!goodOrigin && origin.match(allowedOrigin)) {
        goodOrigin = true;
      }
    });
  }
  if(goodOrigin) {
    var dynamoClient = new AWS.DynamoDB.DocumentClient();
    
    var params = {
	  TableName: "comments",
	  KeyConditionExpression: "post_uid = :uid and begins_with(sortKey, :uid) ",
    ScanIndexForward: false,
	  ExpressionAttributeValues: {
	      ":uid": event.queryStringParameters.uid
	  }
    };
    
    dynamoClient.query(params, function(err, data) {
	    if (err) {
	      console.log("Error on parent");
	    } else {
        var comments = {};
        //data is in data.Items, parse it...
        data.Items.forEach(function(comment) {
          if (comment.approval_uuid == '') {
	    	    comments.rootComments[] = comment;
            var params = {
              TableName: "comments",
              KeyConditionExpression: "post_uid = :uid and begins_with(sortKey, :parent)",
              ExpressionAttributeValues: {
                ":parent": comment.id,
		":uid": event.queryStringParameters.uid
              },
              ScanIndexForward: true
            }
            dynamoClient.query(params, function(err, children) {
              if(err) {
                console.log("Error on children");
              } else {
                children.Items.forEach(function(child) {
                  if(child.approval_uuid == '') {
                    comments.childComments[comment.uid] = child;
                  }
                });
              }
            });
          }
        });
	      //...and return a JSON object
        var response = {
          "isBase64Encoded": false,
          "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": goodOrigin ? origin : allowedOrigins[0] }, //This is a totally unnecessary ternary
          "statusCode": 200,
          "body": JSON.stringify(comments);
	      };
        callback(err, response);
      }
    });
  } //no else: 502 if bad origin
};
