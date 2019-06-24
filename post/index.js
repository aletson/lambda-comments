// Params: uid (or parent_comment), author, email, comment_text, timestamp, approval_uuid (default random uuid)
var AWS = require("aws-sdk");
const uuidv4 = require('uuid/v4');
var xss = require('xss');

AWS.config.update({
	 region: "us-east-1"
});
const allowedOrigins = [
    "http://ajl.io",
    "http://www.ajl.io",
    "https://ajl.io",
    "https?://[a-z]*.?ajl.io",
];

var from = "comments@ajl.io";


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
    var body = JSON.parse(event.body);
    // Sanitize - https://jsxss.com/en/examples/no_tag.html
    body.text = xss(body.text, {
      whiteList: {
        u: [],
        em: [],
        strong: [],
        i: [],
        b: [],
        pre: [],
        code: [],
        kbd: [],
        a: ['href', 'title']
      },
      stripIgnoreTag: true,
      stripIgnoreTagBody: ['script']
    });
    body.author = xss(body.author, {stripIgnoreTagBody: true});

    // DynamoDB
    var dynamoClient = new AWS.DynamoDB.DocumentClient();
    var approval_uuid = uuidv4();
    var comment_id = uuidv4();
    if(typeof body.parent_comment === 'undefined' || body.parent_comment === null) {
      var params = {
        TableName: 'comments',
        Item: {
          'author': body.author,
          'text': body.comment_text,
          'ts': body.timestamp,
          'approval_uuid': approval_uuid,
          'post_uid': body.uid,
          'id': comment_id,
          'sortKey': body.parent_comment + '#' + body.timestamp + '#' + comment_id
        }
      };
    } else {
      var params = {
        TableName: 'comments',
        Item: {
          'author': body.author,
          'text': body.comment_text,
          'ts': body.timestamp,
          'approval_uuid': approval_uuid,
          'post_uid': body.uid,
          'id': comment_id,
          'parent': body.parent_comment,
          'sortKey': body.uid + '#' + body.timestamp + '#' + comment_id
        }
      };
    }
    dynamoClient.putItem(params, function(err, data) {
      if(err) {
        console.log('Error: ', err);
      } else {
        //send email
        sendEmail(approval_uuid, body.email, function(err, data) {
          var response = {
            "isBase64Encoded": false,
            "headers": { "Content-Type": "application/json", "Access-Control-Allow-Origin": origin },
            "statusCode": 200,
            "body": "{\"result\": \"Success\"}"
          }; // This will get processed from the client end to display message "hey buddy, check your email to approve this comment"
          callback(err, response);
        });
      }
    });
    // send email
  } //automatic 502 if origin's not okay
};



function sendEmail(approval_uuid, email, done) {
  var ses = new AWS.SES();
  var params = {
    Destination: {
      ToAddresses: [
        email
      ]
    },
    Message: {
      Body: {
        Text: {
          Data: 'Your comment on ajl.io requires email verification before appearing on the website. Use the following link: https://comments.ajl.io/approve?uid=' + approval_uuid,
          Charset: 'UTF-8'
        }
      },
      Subject: {
        Data: 'Approve Comment - ajl.io',
        Charset: 'UTF-8'
      }
    },
    Source: from
  };
  ses.sendEmail(params, done);
}
