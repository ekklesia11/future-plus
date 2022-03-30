import { Stack, StackProps, CfnOutput, RemovalPolicy, Duration, SecretValue } from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as nodeLambda from 'aws-cdk-lib/aws-lambda-nodejs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as rds from 'aws-cdk-lib/aws-rds';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as certificateManager from 'aws-cdk-lib/aws-certificatemanager';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as path from 'path';

interface ExtendedStackProps extends StackProps {
  hostedZoneName: string;
  hasuraAdminSecret: string;
  hasuraHostname: string;
  apiHostname: string;
};

type DBcredentials = {
  dbName: string;
  username: string;
  password: SecretValue;
  port: number;
  url: string;
};

export class FuturePlusStack extends Stack {
  constructor(scope: Construct, id: string, props: ExtendedStackProps) {
    super(scope, id, props);

    {/* VPC */}
    const vpc = new ec2.Vpc(this, 'VPC');

    {/* ROUTE53 && CERTIFICATE */}
    const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
      domainName: props.hostedZoneName,
    });

    const hasuraCertificate = new certificateManager.DnsValidatedCertificate(this, 'HasuraCertificate', {
      hostedZone,
      domainName: props.hasuraHostname,
    });

    {/* DATABASE */}
    const database = new rds.DatabaseInstance(this, 'FuturePlusDatabase', {
      engine: rds.DatabaseInstanceEngine.POSTGRES,
      vpc,
      databaseName: 'FuturePlusDB',
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
      removalPolicy: RemovalPolicy.DESTROY,
      storageEncrypted: true,
      allocatedStorage: 20,
      maxAllocatedStorage: 100,
      credentials: rds.Credentials.fromGeneratedSecret('FuturePlusAdmin'),
    });

    new CfnOutput(this, 'Database Url', {
      value: `${database.dbInstanceEndpointAddress}:${database.dbInstanceEndpointPort}`,
    });

    const DBcredentials: DBcredentials = {
      dbName: 'FuturePlusDB',
      username: 'FuturePlusAdmin',
      password: database.secret!.secretValueFromJson('password'),
      port: (database.dbInstanceEndpointPort as unknown) as number,
      url: database.dbInstanceEndpointAddress,
    };

    const databaseUrl = `postgres://${DBcredentials.username}:${DBcredentials.password}@${DBcredentials.url}:${DBcredentials.port}/${DBcredentials.dbName}`;

    {/* ECS CLUSTER */}
    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
    });

    cluster.addCapacity('AutoScalingGroupCapacity', {
      instanceType: new ec2.InstanceType("t3.medium"),
      desiredCapacity: 1,
    });

    const ecsCluster = new ecsPatterns.ApplicationLoadBalancedEc2Service(this, 'EcsCluster', {
      cluster,
      memoryLimitMiB: 2048,
      taskImageOptions: {
        image: ecs.ContainerImage.fromRegistry('hasura/graphql-engine:latest'),
        containerPort: 8080,
        enableLogging: true,
        environment: {
          HASURA_GRAPHQL_ENABLE_CONSOLE: 'true',
          HASURA_GRAPHQL_PG_CONNECTIONS: '100',
          HASURA_GRAPHQL_DATABASE_URL: databaseUrl,
          HASURA_GRAPHQL_ADMIN_SECRET: props.hasuraAdminSecret,
        },
      },
      desiredCount: 1,
      listenerPort: 443,
      domainName: props.hasuraHostname,
      domainZone: hostedZone,
      certificate: hasuraCertificate,
      redirectHTTP: true,
      publicLoadBalancer: true,
      openListener: true,
      healthCheckGracePeriod: Duration.seconds(90),
    });

    {/* DB CONNECTION WITH ECS */}
    database.connections.allowFrom(ecsCluster.service, ec2.Port.tcp(DBcredentials.port));

    {/* LAMBDA REST API */}
    const apiService = new lambda.Function(this, 'APIService', {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'app.handler',
      code: new lambda.AssetCode('api'),
      vpc,
      vpcSubnets: {
        subnetType: ec2.SubnetType.PRIVATE
      },
      environment: {
        databaseUrl
      }
    });

    apiService.connections.allowTo(database, ec2.Port.tcp(DBcredentials.port));
    // apiService.connections.allowFromAnyIpv4(ec2.Port.tcp(443));

    const DBpermissions = new iam.PolicyStatement({
      actions: ['rds:*'],
      resources: ['*'],
    });

    apiService.addToRolePolicy(DBpermissions);

    const apiCertificate = new certificateManager.DnsValidatedCertificate(this, 'ApiCertificate', {
      hostedZone,
      domainName: props.apiHostname,
    });

    const api = new apigateway.LambdaRestApi(this, 'API', {
      handler: apiService,
      proxy: false,
      domainName: {
        domainName: props.apiHostname,
        certificate: apiCertificate,
      }
    });

    new route53.ARecord(this, 'ApiAlias', {
      zone: hostedZone,
      target: route53.RecordTarget.fromAlias(new targets.ApiGateway(api)),
      recordName: props.apiHostname,
    });

    const v1 = api.root.addResource('v1');
    const program = v1.addResource('create-program');
    program.addMethod('POST', new apigateway.LambdaIntegration(apiService));

  }
}