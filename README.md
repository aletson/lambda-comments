# lambda-comments

## Setup

- `npm install` for post/
- set up a DynamoDB table as described in the screenshots
- upload each folder as a distinct lambda function.
- for each function, grant access based on the included IAM policy template (substitute your account ID and region where appropriate)
- (optional) create API Gateway endpoints for each Lambda function
- (optional) create ACM certificate and associate with API Gateway stage
