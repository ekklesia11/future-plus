import { Stack, StackProps, CfnOutput, RemovalPolicy } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigw from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as secretManager from "aws-cdk-lib/aws-secretsmanager";
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as certificateManager from 'aws-cdk-lib/aws-certificatemanager';

interface ExtendedStackProps extends StackProps {
  appName: string;
  awsRegion: string;
  hostedZoneId: string;
  hostedZoneName: string;
  hasuraAdminSecret: string;
  hasuraHostname: string;
  apiHostname: string;
};

export class FuturePlusStack extends Stack {
  public readonly response: string;

  constructor(scope: Construct, id: string, props: ExtendedStackProps) {
    super(scope, id, props);

    const vpc = new ec2.Vpc(this, 'main-VPC');

    const hostedZone = route53.PublicHostedZone.fromHostedZoneAttributes(this, 'HostedZone', {
      hostedZoneId: props.hostedZoneId,
      zoneName: props.hostedZoneName,
    });

    const hasuraCertificate = new certificateManager.DnsValidatedCertificate(this, 'HasuraCertificate', {
      hostedZone,
      domainName: props.hasuraHostname,
    });

    const restApiCertificate = new certificateManager.DnsValidatedCertificate(this, 'ActionsCertificate', {
        hostedZone,
        domainName: props.apiHostname,
    });

    const database = new rds.DatabaseInstance(this, 'Database', {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc,
      databaseName: 'futurePlus',
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      removalPolicy: RemovalPolicy.DESTROY,
      storageEncrypted: true,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
    });

    const databaseUserSecret = new rds.DatabaseSecret(this, 'DatabaseUser', {
      username: 'admin',
      masterSecret: database.secret,
    });

    databaseUserSecret.attach(database);

    const hasuraDatabaseUrlSecret = new secretManager.Secret(this, 'HasuraDatabaseUrlSecret', {
      secretName: `${props.appName}-HasuraDatabaseUrl`,
      secretStringBeta1: secretManager.SecretStringValueBeta1.fromUnsafePlaintext(database.dbInstanceEndpointAddress),
    });

    const hasuraAdminSecret = new secretManager.Secret(this, 'HasuraAdminSecret', {
      secretName: `${props.appName}-HasuraAdminSecret`,
      secretStringBeta1: secretManager.SecretStringValueBeta1.fromUnsafePlaintext(props.hasuraAdminSecret),
      // generateSecretString: {
      //   includeSpace: false,
      //   passwordLength: 32,
      //   excludePunctuation: true
      // }
    });

    const hasuraJwtSecret = new secretManager.Secret(this, 'HasuraJwtSecret', {
      secretName: `${props.appName}-HasuraJWTSecret`,
      generateSecretString: {
        includeSpace: false,
        passwordLength: 32,
        excludePunctuation: true
      }
  });

    new CfnOutput(this, 'HasuraDatabase', {
      description: 'DB info',
      value: database.dbInstanceEndpointAddress,
    });

    new CfnOutput(this, 'HasuraDatabaseUserSecretArn', {
      value: databaseUserSecret.secretArn,
    });

    new CfnOutput(this, 'HasuraDatabaseMasterSecretArn', {
        value: database.secret!.secretArn,
    });
    
    new CfnOutput(this, 'HasuraDatabaseUrlSecretArn', {
        value: hasuraDatabaseUrlSecret.secretArn,
    });

    new CfnOutput(this, 'HasuraAdminSecretArn', {
        value: hasuraAdminSecret.secretArn,
    });

    const fargate = new ecsPatterns.ApplicationLoadBalancedFargateService(this, 'FargateService', {
      vpc,
      memoryLimitMiB: 512,
      cpu: 256,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('hasura/graphql-engine:latest'),
        containerPort: 8080,
        enableLogging: true,
        environment: {
          HASURA_GRAPHQL_ENABLE_CONSOLE: 'true',
          HASURA_GRAPHQL_PG_CONNECTIONS: '100',
          HASURA_GRAPHQL_LOG_LEVEL: 'debug',
          HASURA_GRAPHQL_JWT_SECRET: `{"type": "HS256", "key": "${hasuraJwtSecret.secretValue.toString()}"}`,
        },
        secrets: {
          HASURA_GRAPHQL_DATABASE_URL: ecs.Secret.fromSecretsManager(hasuraDatabaseUrlSecret),
          HASURA_GRAPHQL_ADMIN_SECRET: ecs.Secret.fromSecretsManager(hasuraAdminSecret),
        },
      },
      publicLoadBalancer: true,
      certificate: hasuraCertificate,
      domainName: props.hasuraHostname,
      domainZone: hostedZone,
      assignPublicIp: true,
    });

    fargate.targetGroup.configureHealthCheck({
      enabled: true,
      path: '/check-health',
      healthyHttpCodes: '200',
    });

    database.connections.allowFrom(fargate.service, new ec2.Port({
      protocol: ec2.Protocol.TCP,
      stringRepresentation: 'Postgres Port',
      fromPort: 5432,
      toPort: 5432,
    }));

    // defines an AWS Lambda resource
    const createProgram = new lambda.Function(this, 'createProgramHandler', {
      runtime: lambda.Runtime.NODEJS_14_X,
      code: lambda.Code.fromAsset('lambda'),
      handler: 'createProgram.handler',
    });

    // defines an API Gateway REST API resource backed by our "hello" function.
    new apigw.LambdaRestApi(this, 'Endpoint', {
      handler: createProgram
    });
  }
}