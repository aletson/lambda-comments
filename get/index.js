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
const dynamoClient = new AWS.DynamoDB.DocumentClient();

exports.handler = async (event,context) => {
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
    var comments = {};
    comments.rootComments = [];
    comments.childComments = [];
    
    var params = {
	    TableName: "comments",
	    KeyConditionExpression: "post_uid = :uid and begins_with(sortKey, :uid) ",
      ScanIndexForward: false,
	    ExpressionAttributeValues: {
	      ":uid": event.queryStringParameters.uid
	    }
    };
    var rootComments = await retrieveComments(params);
    var childComments = [];
    await asyncForEach(rootComments, async(comment) => {
      if(typeof comment.approval_uuid === "undefined") {
        comment.children = [];
      
        var params = {
          TableName: "comments",
          KeyConditionExpression: "post_uid = :uid and begins_with(sortKey, :parent)",
          ExpressionAttributeValues: {
            ":parent": comment.id,
           	":uid": event.queryStringParameters.uid
          },
          ScanIndexForward: true
        };
        childComments[comment.id] = await retrieveComments(params);
        await asyncForEach(childComments[comment.id], async (child) => {
          if(typeof child.approval_uuid === "undefined") {
            comment.children.push(child);
          }
        });
        comments.rootComments.push(comment);
      }
    });
  }
  var response = {
          "isBase64Encoded": false,
          "headers": {"Content-Type": "application/json", "Access-Control-Allow-Origin": origin},
          "statusCode": 200,
          "body": JSON.stringify(comments)
  };
  console.log(response);
  return response;
};
    
async function retrieveComments(params) {
  try {
    let data = await dynamoClient.query(params).promise();
    return data.Items;
  } catch(err) {
    console.log(err);
  }
}

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}