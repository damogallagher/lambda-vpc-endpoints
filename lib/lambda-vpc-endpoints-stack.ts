import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as s3Deployment from 'aws-cdk-lib/aws-s3-deployment'
import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as secretsManager from 'aws-cdk-lib/aws-secretsmanager';

export class LambdaVpcEndpointsStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    const vpc = new ec2.Vpc(this, "Vpc", {
      vpcName: "LambdaVPCEndpoints",
      subnetConfiguration: [
        {
          cidrMask: 24,
          name: 'Ingress',
          subnetType: ec2.SubnetType.PRIVATE_ISOLATED,
        }
      ]
    });

    // Start of S3 Functionality
    const s3Bucket = new s3.Bucket(this, 'vpc-endpoints-bkt-test', {
      bucketName: 'vpc-endpoints-bkt-test',
      autoDeleteObjects: true,
      removalPolicy: RemovalPolicy.DESTROY
    });
    new s3Deployment.BucketDeployment(this, 'DeployWebsite', {
      sources: [s3Deployment.Source.asset('./s3bucket-dist')],
      destinationBucket: s3Bucket,
    });

    const s3GatewayEndpoint = vpc.addGatewayEndpoint('s3-gateway-endpoint', {
      service: ec2.GatewayVpcEndpointAwsService.S3
    });


    // add this code after the VPC code
    const readS3LambdaHandler = new lambda.Function(this, "ReadS3Lambda", {
      functionName: "readS3Lambda",
      runtime: lambda.Runtime.PYTHON_3_9,
      code: new lambda.AssetCode("lambdas/read_s3"),
      handler: "index.lambda_handler",
      memorySize: 1024,
      timeout: Duration.seconds(60),
      architecture: lambda.Architecture.ARM_64,
      vpc: vpc,
      vpcSubnets:
      {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      environment: {
        S3_BUCKET: s3Bucket.bucketName
      }
    });

    // 👇 create a policy statement
    const readS3BucketPolicy = new iam.PolicyStatement({
      actions: [
        's3:ListBucket',
        's3:GetObject'
      ],
      resources: [
        'arn:aws:s3:::' + s3Bucket.bucketName,
        'arn:aws:s3:::' + s3Bucket.bucketName + '/*'],
    });

    // 👇 add the policy to the Function's role
    readS3LambdaHandler.role?.attachInlinePolicy(
      new iam.Policy(this, 'readS3Lambda-buckets-policy', {
        statements: [readS3BucketPolicy],
      }),
    );
    const readS3ApiGateway = new apigw.LambdaRestApi(this, "readS3ApiGateway", {
      restApiName: "readS3ApiGateway",
      endpointExportName: "readS3ApiGatewayExport",
      handler: readS3LambdaHandler
    });
    // End of S3 Functionality

    // Start of Secrets Manager Functionality
    const templatedSecret = new secretsManager.Secret(this, 'LambdaS3Secret', {
      secretName: 'LambdaVPCSecret',
      generateSecretString: {
        secretStringTemplate: JSON.stringify({ username: 'postgres' }),
        generateStringKey: 'password',
      },
    });

    const readSecretsManagerLambdaHandler = new lambda.Function(this, "ReadSecretsManagerLambda", {
      functionName: "readSecretsManagerLambda",
      runtime: lambda.Runtime.PYTHON_3_9,
      code: new lambda.AssetCode("lambdas/read_secrets_manager"),
      handler: "index.lambda_handler",
      memorySize: 1024,
      timeout: Duration.seconds(60),
      architecture: lambda.Architecture.ARM_64,
      vpc: vpc,
      vpcSubnets:
      {
        subnetType: ec2.SubnetType.PRIVATE_ISOLATED
      },
      environment: {
        SECRET_NAME: templatedSecret.secretName
      }
    });

    const readSecretsManagerApiGateway = new apigw.LambdaRestApi(this, "readSecretsManagerApiGateway", {
      restApiName: "readSecretsManagerApiGateway",
      endpointExportName: "readSecretsManagerApiGatewayExport",
      handler: readS3LambdaHandler
    });

    // // End of Secrets Manager Functionality
    // new cdk.CfnOutput(this, 'readS3ApiGateway', {
    //   value: readS3ApiGateway.url,
    //   description: 'The url for the read S3 API Gateway Endpoint',
    //   exportName: 'readS3ApiGatewayExport',
    // });
    // new cdk.CfnOutput(this, 'readSecretsManagerApiGateway', {
    //   value: readSecretsManagerApiGateway.url,
    //   description: 'The url for the read Secrets Manager API Gateway Endpoint',
    //   exportName: 'readSecretsManagerApiGatewayExport',
    // });
  }
}
