import json
import os
import boto3

print('Loading read secrets function')

secrets_manager = boto3.client('secretsmanager')

def lambda_handler(event, context):
    # print("Received event: " + json.dumps(event, indent=2))
    secret_name = os.getenv('SECRET_NAME')
    print("secret_name = " + secret_name)

    response = secrets_manager.get_secret_value(
        SecretId=secret_name
    )
    print(f"response:{response}")

    secret_response = json.loads(response['SecretString'])
    print(f"secret_response:{secret_response}")

    return {
        "statusCode": 200,
        "headers": {
            "Content-Type": "application/json"
        },
        "body": json.dumps({
            "secret_response ": secret_response
        })
    }       
