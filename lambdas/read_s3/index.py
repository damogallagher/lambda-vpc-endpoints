import json
import os
import boto3

print('Loading read S3 function')

s3 = boto3.resource('s3')

def lambda_handler(event, context):
    # print("Received event: " + json.dumps(event, indent=2))
    s3_bucket = os.getenv('S3_BUCKET')
    print("s3_bucket = " + s3_bucket)

    bucket = s3.Bucket(s3_bucket)
    # Iterates through all the objects, doing the pagination for you. Each obj
    # is an ObjectSummary, so it doesn't contain the body. You'll need to call
    # get to get the whole body.
    for obj in bucket.objects.all():
        key = obj.key
        body = obj.get()['Body'].read()
        print(f"key:{key}, body:{body}")

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({
            "s3_bucket ": s3_bucket
        })
    }    
