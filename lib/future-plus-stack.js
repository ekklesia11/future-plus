"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FuturePlusStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const lambda = require("aws-cdk-lib/aws-lambda");
const apigw = require("aws-cdk-lib/aws-apigateway");
const rds = require("aws-cdk-lib/aws-rds");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const ecsPatterns = require("aws-cdk-lib/aws-ecs-patterns");
const secretManager = require("aws-cdk-lib/aws-secretsmanager");
const route53 = require("aws-cdk-lib/aws-route53");
const certificateManager = require("aws-cdk-lib/aws-certificatemanager");
;
class FuturePlusStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
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
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
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
        });
        const hasuraJwtSecret = new secretManager.Secret(this, 'HasuraJwtSecret', {
            secretName: `${props.appName}-HasuraJWTSecret`,
            generateSecretString: {
                includeSpace: false,
                passwordLength: 32,
                excludePunctuation: true
            }
        });
        new aws_cdk_lib_1.CfnOutput(this, 'HasuraDatabase', {
            description: 'DB info',
            value: database.dbInstanceEndpointAddress,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'HasuraDatabaseUserSecretArn', {
            value: databaseUserSecret.secretArn,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'HasuraDatabaseMasterSecretArn', {
            value: database.secret.secretArn,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'HasuraDatabaseUrlSecretArn', {
            value: hasuraDatabaseUrlSecret.secretArn,
        });
        new aws_cdk_lib_1.CfnOutput(this, 'HasuraAdminSecretArn', {
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
exports.FuturePlusStack = FuturePlusStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnV0dXJlLXBsdXMtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmdXR1cmUtcGx1cy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBMEU7QUFFMUUsaURBQWlEO0FBQ2pELG9EQUFvRDtBQUNwRCwyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQyw0REFBNEQ7QUFDNUQsZ0VBQWdFO0FBQ2hFLG1EQUFtRDtBQUNuRCx5RUFBeUU7QUFVeEUsQ0FBQztBQUVGLE1BQWEsZUFBZ0IsU0FBUSxtQkFBSztJQUd4QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXlCO1FBQ2pFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsVUFBVSxDQUFDLENBQUM7UUFFMUMsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLGdCQUFnQixDQUFDLHdCQUF3QixDQUFDLElBQUksRUFBRSxZQUFZLEVBQUU7WUFDdkYsWUFBWSxFQUFFLEtBQUssQ0FBQyxZQUFZO1lBQ2hDLFFBQVEsRUFBRSxLQUFLLENBQUMsY0FBYztTQUMvQixDQUFDLENBQUM7UUFFSCxNQUFNLGlCQUFpQixHQUFHLElBQUksa0JBQWtCLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ2xHLFVBQVU7WUFDVixVQUFVLEVBQUUsS0FBSyxDQUFDLGNBQWM7U0FDakMsQ0FBQyxDQUFDO1FBRUgsTUFBTSxrQkFBa0IsR0FBRyxJQUFJLGtCQUFrQixDQUFDLHVCQUF1QixDQUFDLElBQUksRUFBRSxvQkFBb0IsRUFBRTtZQUNsRyxVQUFVO1lBQ1YsVUFBVSxFQUFFLEtBQUssQ0FBQyxXQUFXO1NBQ2hDLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLElBQUksR0FBRyxDQUFDLGdCQUFn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Q3RFLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTyxDQUFDLFdBQVc7WUFDbkMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQztZQUNyQyxPQUFPLEVBQUUsdUJBQXVCO1NBQ2pDLENBQUMsQ0FBQztRQUVILDJFQUEyRTtRQUMzRSxJQUFJLEtBQUssQ0FBQyxhQUFhLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUN4QyxPQUFPLEVBQUUsYUFBYTtTQUN2QixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF6SUQsMENBeUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU3RhY2ssIFN0YWNrUHJvcHMsIENmbk91dHB1dCwgUmVtb3ZhbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgYXBpZ3cgZnJvbSAnYXdzLWNkay1saWIvYXdzLWFwaWdhdGV3YXknO1xuaW1wb3J0ICogYXMgcmRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yZHMnO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgZWNzUGF0dGVybnMgZnJvbSAnYXdzLWNkay1saWIvYXdzLWVjcy1wYXR0ZXJucyc7XG5pbXBvcnQgKiBhcyBzZWNyZXRNYW5hZ2VyIGZyb20gXCJhd3MtY2RrLWxpYi9hd3Mtc2VjcmV0c21hbmFnZXJcIjtcbmltcG9ydCAqIGFzIHJvdXRlNTMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMnO1xuaW1wb3J0ICogYXMgY2VydGlmaWNhdGVNYW5hZ2VyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1jZXJ0aWZpY2F0ZW1hbmFnZXInO1xuXG5pbnRlcmZhY2UgRXh0ZW5kZWRTdGFja1Byb3BzIGV4dGVuZHMgU3RhY2tQcm9wcyB7XG4gIGFwcE5hbWU6IHN0cmluZztcbiAgYXdzUmVnaW9uOiBzdHJpbmc7XG4gIGhvc3RlZFpvbmVJZDogc3RyaW5nO1xuICBob3N0ZWRab25lTmFtZTogc3RyaW5nO1xuICBoYXN1cmFBZG1pblNlY3JldDogc3RyaW5nO1xuICBoYXN1cmFIb3N0bmFtZTogc3RyaW5nO1xuICBhcGlIb3N0bmFtZTogc3RyaW5nO1xufTtcblxuZXhwb3J0IGNsYXNzIEZ1dHVyZVBsdXNTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgcHVibGljIHJlYWRvbmx5IHJlc3BvbnNlOiBzdHJpbmc7XG5cbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEV4dGVuZGVkU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3QgdnBjID0gbmV3IGVjMi5WcGModGhpcywgJ21haW4tVlBDJyk7XG5cbiAgICBjb25zdCBob3N0ZWRab25lID0gcm91dGU1My5QdWJsaWNIb3N0ZWRab25lLmZyb21Ib3N0ZWRab25lQXR0cmlidXRlcyh0aGlzLCAnSG9zdGVkWm9uZScsIHtcbiAgICAgIGhvc3RlZFpvbmVJZDogcHJvcHMuaG9zdGVkWm9uZUlkLFxuICAgICAgem9uZU5hbWU6IHByb3BzLmhvc3RlZFpvbmVOYW1lLFxuICAgIH0pO1xuXG4gICAgY29uc3QgaGFzdXJhQ2VydGlmaWNhdGUgPSBuZXcgY2VydGlmaWNhdGVNYW5hZ2VyLkRuc1ZhbGlkYXRlZENlcnRpZmljYXRlKHRoaXMsICdIYXN1cmFDZXJ0aWZpY2F0ZScsIHtcbiAgICAgIGhvc3RlZFpvbmUsXG4gICAgICBkb21haW5OYW1lOiBwcm9wcy5oYXN1cmFIb3N0bmFtZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IHJlc3RBcGlDZXJ0aWZpY2F0ZSA9IG5ldyBjZXJ0aWZpY2F0ZU1hbmFnZXIuRG5zVmFsaWRhdGVkQ2VydGlmaWNhdGUodGhpcywgJ0FjdGlvbnNDZXJ0aWZpY2F0ZScsIHtcbiAgICAgICAgaG9zdGVkWm9uZSxcbiAgICAgICAgZG9tYWluTmFtZTogcHJvcHMuYXBpSG9zdG5hbWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCBkYXRhYmFzZSA9IG5ldyByZHMuRGF0YWJhc2VJbnN0YW5jZSh0aGlzLCAnRGF0YWJhc2UnLCB7XG4gICAgICBlbmdpbmU6IHJkcy5EYXRhYmFzZUluc3RhbmNlRW5naW5lLlBPU1RHUkVTLFxuICAgICAgdnBjLFxuICAgICAgZGF0YWJhc2VOYW1lOiAnZnV0dXJlUGx1cycsXG4gICAgICBpbnN0YW5jZVR5cGU6IGVjMi5JbnN0YW5jZVR5cGUub2YoZWMyLkluc3RhbmNlQ2xhc3MuQlVSU1RBQkxFMywgZWMyLkluc3RhbmNlU2l6ZS5NSUNSTyksXG4gICAgICByZW1vdmFsUG9saWN5OiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXG4gICAgICBzdG9yYWdlRW5jcnlwdGVkOiB0cnVlLFxuICAgICAgYWxsb2NhdGVkU3RvcmFnZTogMjAsXG4gICAgICBtYXhBbGxvY2F0ZWRTdG9yYWdlOiAxMDAsXG4gICAgfSk7XG5cbiAgICBjb25zdCBkYXRhYmFzZVVzZXJTZWNyZXQgPSBuZXcgcmRzLkRhdGFiYXNlU2VjcmV0KHRoaXMsICdEYXRhYmFzZVVzZXInLCB7XG4gICAgICB1c2VybmFtZTogJ2FkbWluJyxcbiAgICAgIG1hc3RlclNlY3JldDogZGF0YWJhc2Uuc2VjcmV0LFxuICAgIH0pO1xuXG4gICAgZGF0YWJhc2VVc2VyU2VjcmV0LmF0dGFjaChkYXRhYmFzZSk7XG5cbiAgICBjb25zdCBoYXN1cmFEYXRhYmFzZVVybFNlY3JldCA9IG5ldyBzZWNyZXRNYW5hZ2VyLlNlY3JldCh0aGlzLCAnSGFzdXJhRGF0YWJhc2VVcmxTZWNyZXQnLCB7XG4gICAgICBzZWNyZXROYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS1IYXN1cmFEYXRhYmFzZVVybGAsXG4gICAgICBzZWNyZXRTdHJpbmdCZXRhMTogc2VjcmV0TWFuYWdlci5TZWNyZXRTdHJpbmdWYWx1ZUJldGExLmZyb21VbnNhZmVQbGFpbnRleHQoZGF0YWJhc2UuZGJJbnN0YW5jZUVuZHBvaW50QWRkcmVzcyksXG4gICAgfSk7XG5cbiAgICBjb25zdCBoYXN1cmFBZG1pblNlY3JldCA9IG5ldyBzZWNyZXRNYW5hZ2VyLlNlY3JldCh0aGlzLCAnSGFzdXJhQWRtaW5TZWNyZXQnLCB7XG4gICAgICBzZWNyZXROYW1lOiBgJHtwcm9wcy5hcHBOYW1lfS1IYXN1cmFBZG1pblNlY3JldGAsXG4gICAgICBzZWNyZXRTdHJpbmdCZXRhMTogc2VjcmV0TWFuYWdlci5TZWNyZXRTdHJpbmdWYWx1ZUJldGExLmZyb21VbnNhZmVQbGFpbnRleHQocHJvcHMuaGFzdXJhQWRtaW5TZWNyZXQpLFxuICAgICAgLy8gZ2VuZXJhdGVTZWNyZXRTdHJpbmc6IHtcbiAgICAgIC8vICAgaW5jbHVkZVNwYWNlOiBmYWxzZSxcbiAgICAgIC8vICAgcGFzc3dvcmRMZW5ndGg6IDMyLFxuICAgICAgLy8gICBleGNsdWRlUHVuY3R1YXRpb246IHRydWVcbiAgICAgIC8vIH1cbiAgICB9KTtcblxuICAgIGNvbnN0IGhhc3VyYUp3dFNlY3JldCA9IG5ldyBzZWNyZXRNYW5hZ2VyLlNlY3JldCh0aGlzLCAnSGFzdXJhSnd0U2VjcmV0Jywge1xuICAgICAgc2VjcmV0TmFtZTogYCR7cHJvcHMuYXBwTmFtZX0tSGFzdXJhSldUU2VjcmV0YCxcbiAgICAgIGdlbmVyYXRlU2VjcmV0U3RyaW5nOiB7XG4gICAgICAgIGluY2x1ZGVTcGFjZTogZmFsc2UsXG4gICAgICAgIHBhc3N3b3JkTGVuZ3RoOiAzMixcbiAgICAgICAgZXhjbHVkZVB1bmN0dWF0aW9uOiB0cnVlXG4gICAgICB9XG4gIH0pO1xuXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCAnSGFzdXJhRGF0YWJhc2UnLCB7XG4gICAgICBkZXNjcmlwdGlvbjogJ0RCIGluZm8nLFxuICAgICAgdmFsdWU6IGRhdGFiYXNlLmRiSW5zdGFuY2VFbmRwb2ludEFkZHJlc3MsXG4gICAgfSk7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsICdIYXN1cmFEYXRhYmFzZVVzZXJTZWNyZXRBcm4nLCB7XG4gICAgICB2YWx1ZTogZGF0YWJhc2VVc2VyU2VjcmV0LnNlY3JldEFybixcbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgJ0hhc3VyYURhdGFiYXNlTWFzdGVyU2VjcmV0QXJuJywge1xuICAgICAgICB2YWx1ZTogZGF0YWJhc2Uuc2VjcmV0IS5zZWNyZXRBcm4sXG4gICAgfSk7XG4gICAgXG4gICAgbmV3IENmbk91dHB1dCh0aGlzLCAnSGFzdXJhRGF0YWJhc2VVcmxTZWNyZXRBcm4nLCB7XG4gICAgICAgIHZhbHVlOiBoYXN1cmFEYXRhYmFzZVVybFNlY3JldC5zZWNyZXRBcm4sXG4gICAgfSk7XG5cbiAgICBuZXcgQ2ZuT3V0cHV0KHRoaXMsICdIYXN1cmFBZG1pblNlY3JldEFybicsIHtcbiAgICAgICAgdmFsdWU6IGhhc3VyYUFkbWluU2VjcmV0LnNlY3JldEFybixcbiAgICB9KTtcblxuICAgIGNvbnN0IGZhcmdhdGUgPSBuZXcgZWNzUGF0dGVybnMuQXBwbGljYXRpb25Mb2FkQmFsYW5jZWRGYXJnYXRlU2VydmljZSh0aGlzLCAnRmFyZ2F0ZVNlcnZpY2UnLCB7XG4gICAgICB2cGMsXG4gICAgICBtZW1vcnlMaW1pdE1pQjogNTEyLFxuICAgICAgY3B1OiAyNTYsXG4gICAgICB0YXNrSW1hZ2VPcHRpb25zOiB7XG4gICAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbVJlZ2lzdHJ5KCdoYXN1cmEvZ3JhcGhxbC1lbmdpbmU6bGF0ZXN0JyksXG4gICAgICAgIGNvbnRhaW5lclBvcnQ6IDgwODAsXG4gICAgICAgIGVuYWJsZUxvZ2dpbmc6IHRydWUsXG4gICAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgICAgSEFTVVJBX0dSQVBIUUxfRU5BQkxFX0NPTlNPTEU6ICd0cnVlJyxcbiAgICAgICAgICBIQVNVUkFfR1JBUEhRTF9QR19DT05ORUNUSU9OUzogJzEwMCcsXG4gICAgICAgICAgSEFTVVJBX0dSQVBIUUxfTE9HX0xFVkVMOiAnZGVidWcnLFxuICAgICAgICAgIEhBU1VSQV9HUkFQSFFMX0pXVF9TRUNSRVQ6IGB7XCJ0eXBlXCI6IFwiSFMyNTZcIiwgXCJrZXlcIjogXCIke2hhc3VyYUp3dFNlY3JldC5zZWNyZXRWYWx1ZS50b1N0cmluZygpfVwifWAsXG4gICAgICAgIH0sXG4gICAgICAgIHNlY3JldHM6IHtcbiAgICAgICAgICBIQVNVUkFfR1JBUEhRTF9EQVRBQkFTRV9VUkw6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKGhhc3VyYURhdGFiYXNlVXJsU2VjcmV0KSxcbiAgICAgICAgICBIQVNVUkFfR1JBUEhRTF9BRE1JTl9TRUNSRVQ6IGVjcy5TZWNyZXQuZnJvbVNlY3JldHNNYW5hZ2VyKGhhc3VyYUFkbWluU2VjcmV0KSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBwdWJsaWNMb2FkQmFsYW5jZXI6IHRydWUsXG4gICAgICBjZXJ0aWZpY2F0ZTogaGFzdXJhQ2VydGlmaWNhdGUsXG4gICAgICBkb21haW5OYW1lOiBwcm9wcy5oYXN1cmFIb3N0bmFtZSxcbiAgICAgIGRvbWFpblpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICBhc3NpZ25QdWJsaWNJcDogdHJ1ZSxcbiAgICB9KTtcblxuICAgIGZhcmdhdGUudGFyZ2V0R3JvdXAuY29uZmlndXJlSGVhbHRoQ2hlY2soe1xuICAgICAgZW5hYmxlZDogdHJ1ZSxcbiAgICAgIHBhdGg6ICcvY2hlY2staGVhbHRoJyxcbiAgICAgIGhlYWx0aHlIdHRwQ29kZXM6ICcyMDAnLFxuICAgIH0pO1xuXG4gICAgZGF0YWJhc2UuY29ubmVjdGlvbnMuYWxsb3dGcm9tKGZhcmdhdGUuc2VydmljZSwgbmV3IGVjMi5Qb3J0KHtcbiAgICAgIHByb3RvY29sOiBlYzIuUHJvdG9jb2wuVENQLFxuICAgICAgc3RyaW5nUmVwcmVzZW50YXRpb246ICdQb3N0Z3JlcyBQb3J0JyxcbiAgICAgIGZyb21Qb3J0OiA1NDMyLFxuICAgICAgdG9Qb3J0OiA1NDMyLFxuICAgIH0pKTtcblxuICAgIC8vIGRlZmluZXMgYW4gQVdTIExhbWJkYSByZXNvdXJjZVxuICAgIGNvbnN0IGNyZWF0ZVByb2dyYW0gPSBuZXcgbGFtYmRhLkZ1bmN0aW9uKHRoaXMsICdjcmVhdGVQcm9ncmFtSGFuZGxlcicsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNF9YLFxuICAgICAgY29kZTogbGFtYmRhLkNvZGUuZnJvbUFzc2V0KCdsYW1iZGEnKSxcbiAgICAgIGhhbmRsZXI6ICdjcmVhdGVQcm9ncmFtLmhhbmRsZXInLFxuICAgIH0pO1xuXG4gICAgLy8gZGVmaW5lcyBhbiBBUEkgR2F0ZXdheSBSRVNUIEFQSSByZXNvdXJjZSBiYWNrZWQgYnkgb3VyIFwiaGVsbG9cIiBmdW5jdGlvbi5cbiAgICBuZXcgYXBpZ3cuTGFtYmRhUmVzdEFwaSh0aGlzLCAnRW5kcG9pbnQnLCB7XG4gICAgICBoYW5kbGVyOiBjcmVhdGVQcm9ncmFtXG4gICAgfSk7XG4gIH1cbn0iXX0=