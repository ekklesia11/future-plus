"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FuturePlusStack = void 0;
const aws_cdk_lib_1 = require("aws-cdk-lib");
const rds = require("aws-cdk-lib/aws-rds");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const iam = require("aws-cdk-lib/aws-iam");
const lambda = require("aws-cdk-lib/aws-lambda");
const route53 = require("aws-cdk-lib/aws-route53");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const targets = require("aws-cdk-lib/aws-route53-targets");
const ecsPatterns = require("aws-cdk-lib/aws-ecs-patterns");
const certificateManager = require("aws-cdk-lib/aws-certificatemanager");
;
class FuturePlusStack extends aws_cdk_lib_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        { /* VPC */ }
        const vpc = new ec2.Vpc(this, 'VPC');
        { /* ROUTE53 && CERTIFICATE */ }
        const hostedZone = route53.HostedZone.fromLookup(this, 'HostedZone', {
            domainName: props.hostedZoneName,
        });
        const hasuraCertificate = new certificateManager.DnsValidatedCertificate(this, 'HasuraCertificate', {
            hostedZone,
            domainName: props.hasuraHostname,
        });
        { /* DATABASE */ }
        const database = new rds.DatabaseInstance(this, 'FuturePlusDatabase', {
            engine: rds.DatabaseInstanceEngine.POSTGRES,
            vpc,
            databaseName: 'FuturePlusDB',
            instanceType: ec2.InstanceType.of(ec2.InstanceClass.BURSTABLE3, ec2.InstanceSize.MICRO),
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.DESTROY,
            storageEncrypted: true,
            allocatedStorage: 20,
            maxAllocatedStorage: 100,
            credentials: rds.Credentials.fromGeneratedSecret('FuturePlusAdmin'),
        });
        new aws_cdk_lib_1.CfnOutput(this, 'Database Url', {
            value: `${database.dbInstanceEndpointAddress}:${database.dbInstanceEndpointPort}`,
        });
        const DBcredentials = {
            dbName: 'FuturePlusDB',
            username: 'FuturePlusAdmin',
            password: database.secret.secretValueFromJson('password'),
            port: database.dbInstanceEndpointPort,
            url: database.dbInstanceEndpointAddress,
        };
        const databaseUrl = `postgres://${DBcredentials.username}:${DBcredentials.password}@${DBcredentials.url}:${DBcredentials.port}/${DBcredentials.dbName}`;
        { /* ECS CLUSTER */ }
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
            openListener: true,
            publicLoadBalancer: true,
            healthCheckGracePeriod: aws_cdk_lib_1.Duration.seconds(90),
        });
        { /* DB CONNECTION WITH ECS */ }
        database.connections.allowFrom(ecsCluster.service, ec2.Port.tcp(DBcredentials.port));
        { /* LAMBDA */ }
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
        const DBpermissions = new iam.PolicyStatement({
            actions: ['rds:*'],
            resources: ['*'],
        });
        apiService.connections.allowTo(database, ec2.Port.tcp(DBcredentials.port));
        apiService.addToRolePolicy(DBpermissions);
        { /* REST API */ }
        const apiCertificate = new certificateManager.DnsValidatedCertificate(this, 'ApiCertificate', {
            hostedZone,
            domainName: props.apiHostname,
        });
        const api = new apigateway.RestApi(this, 'API', {
            description: 'create program api',
            defaultCorsPreflightOptions: {
                allowHeaders: [
                    'Content-Type',
                    'X-Amz-Date',
                    'Authorization',
                    'X-Api-Key',
                ],
                allowMethods: ['POST'],
                allowCredentials: true,
                allowOrigins: ['http://localhost:3000'],
            },
            deploy: true,
            domainName: {
                domainName: props.apiHostname,
                certificate: apiCertificate,
            }
        });
        new aws_cdk_lib_1.CfnOutput(this, 'apiUrl', {
            value: api.url
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
exports.FuturePlusStack = FuturePlusStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZnV0dXJlLXBsdXMtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJmdXR1cmUtcGx1cy1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSw2Q0FBaUc7QUFFakcsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQywyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLGlEQUFpRDtBQUNqRCxtREFBbUQ7QUFDbkQseURBQXlEO0FBQ3pELDJEQUEyRDtBQUMzRCw0REFBNEQ7QUFDNUQseUVBQXlFO0FBT3hFLENBQUM7QUFVRixNQUFhLGVBQWdCLFNBQVEsbUJBQUs7SUFDeEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUF5QjtRQUNqRSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV4QixFQUFDLFNBQVMsRUFBQztRQUNYLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFckMsRUFBQyw0QkFBNEIsRUFBQztRQUM5QixNQUFNLFVBQVUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ25FLFVBQVUsRUFBRSxLQUFLLENBQUMsY0FBYztTQUNqQyxDQUFDLENBQUM7UUFFSCxNQUFNLGlCQUFpQixHQUFHLElBQUksa0JBQWtCLENBQUMsdUJBQXVCLENBQUMsSUFBSSxFQUFFLG1CQUFtQixFQUFFO1lBQ2xHLFVBQVU7WUFDVixVQUFVLEVBQUUsS0FBSyxDQUFDLGNBQWM7U0FDakMsQ0FBQyxDQUFDO1FBRUgsRUFBQyxjQUFjLEVBQUM7UUFDaEIsTUFBTSxRQUFRLEdBQUcsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQ3BFLE1BQU0sRUFBRSxHQUFHLENBQUMsc0JBQXNCLENBQUMsUUFBUTtZQUMzQyxHQUFHO1lBQ0gs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WUFBWSxFQUFFLENBQUMsdUJBQXVCLENBQUM7YUFDeEM7WUFDRCxNQUFNLEVBQUUsSUFBSTtZQUNaLFVBQVUsRUFBRTtnQkFDVixVQUFVLEVBQUUsS0FBSyxDQUFDLFdBQVc7Z0JBQzdCLFdBQVcsRUFBRSxjQUFjO2FBQzVCO1NBQ0YsQ0FBQyxDQUFDO1FBRUgsSUFBSSx1QkFBUyxDQUFDLElBQUksRUFBRSxRQUFRLEVBQUU7WUFDNUIsS0FBSyxFQUFFLEdBQUcsQ0FBQyxHQUFHO1NBQ2YsQ0FBQyxDQUFDO1FBRUgsSUFBSSxPQUFPLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRSxVQUFVLEVBQUU7WUFDcEMsSUFBSSxFQUFFLFVBQVU7WUFDaEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLElBQUksT0FBTyxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQztZQUNuRSxVQUFVLEVBQUUsS0FBSyxDQUFDLFdBQVc7U0FDOUIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxFQUFFLEdBQUcsR0FBRyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsSUFBSSxDQUFDLENBQUM7UUFDdEMsTUFBTSxPQUFPLEdBQUcsRUFBRSxDQUFDLFdBQVcsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBQ2pELE9BQU8sQ0FBQyxTQUFTLENBQUMsTUFBTSxFQUFFLElBQUksVUFBVSxDQUFDLGlCQUFpQixDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7SUFDMUUsQ0FBQztDQUNGO0FBaEpELDBDQWdKQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFN0YWNrLCBTdGFja1Byb3BzLCBDZm5PdXRwdXQsIFJlbW92YWxQb2xpY3ksIER1cmF0aW9uLCBTZWNyZXRWYWx1ZSB9IGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuaW1wb3J0ICogYXMgcmRzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1yZHMnO1xuaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgZWNzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lY3MnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgbGFtYmRhIGZyb20gJ2F3cy1jZGstbGliL2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgcm91dGU1MyBmcm9tICdhd3MtY2RrLWxpYi9hd3Mtcm91dGU1Myc7XG5pbXBvcnQgKiBhcyBhcGlnYXRld2F5IGZyb20gJ2F3cy1jZGstbGliL2F3cy1hcGlnYXRld2F5JztcbmltcG9ydCAqIGFzIHRhcmdldHMgZnJvbSAnYXdzLWNkay1saWIvYXdzLXJvdXRlNTMtdGFyZ2V0cyc7XG5pbXBvcnQgKiBhcyBlY3NQYXR0ZXJucyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzLXBhdHRlcm5zJztcbmltcG9ydCAqIGFzIGNlcnRpZmljYXRlTWFuYWdlciBmcm9tICdhd3MtY2RrLWxpYi9hd3MtY2VydGlmaWNhdGVtYW5hZ2VyJztcblxuaW50ZXJmYWNlIEV4dGVuZGVkU3RhY2tQcm9wcyBleHRlbmRzIFN0YWNrUHJvcHMge1xuICBob3N0ZWRab25lTmFtZTogc3RyaW5nO1xuICBoYXN1cmFBZG1pblNlY3JldDogc3RyaW5nO1xuICBoYXN1cmFIb3N0bmFtZTogc3RyaW5nO1xuICBhcGlIb3N0bmFtZTogc3RyaW5nO1xufTtcblxudHlwZSBEQmNyZWRlbnRpYWxzID0ge1xuICBkYk5hbWU6IHN0cmluZztcbiAgdXNlcm5hbWU6IHN0cmluZztcbiAgcGFzc3dvcmQ6IFNlY3JldFZhbHVlO1xuICBwb3J0OiBudW1iZXI7XG4gIHVybDogc3RyaW5nO1xufTtcblxuZXhwb3J0IGNsYXNzIEZ1dHVyZVBsdXNTdGFjayBleHRlbmRzIFN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IEV4dGVuZGVkU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgey8qIFZQQyAqL31cbiAgICBjb25zdCB2cGMgPSBuZXcgZWMyLlZwYyh0aGlzLCAnVlBDJyk7XG5cbiAgICB7LyogUk9VVEU1MyAmJiBDRVJUSUZJQ0FURSAqL31cbiAgICBjb25zdCBob3N0ZWRab25lID0gcm91dGU1My5Ib3N0ZWRab25lLmZyb21Mb29rdXAodGhpcywgJ0hvc3RlZFpvbmUnLCB7XG4gICAgICBkb21haW5OYW1lOiBwcm9wcy5ob3N0ZWRab25lTmFtZSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGhhc3VyYUNlcnRpZmljYXRlID0gbmV3IGNlcnRpZmljYXRlTWFuYWdlci5EbnNWYWxpZGF0ZWRDZXJ0aWZpY2F0ZSh0aGlzLCAnSGFzdXJhQ2VydGlmaWNhdGUnLCB7XG4gICAgICBob3N0ZWRab25lLFxuICAgICAgZG9tYWluTmFtZTogcHJvcHMuaGFzdXJhSG9zdG5hbWUsXG4gICAgfSk7XG5cbiAgICB7LyogREFUQUJBU0UgKi99XG4gICAgY29uc3QgZGF0YWJhc2UgPSBuZXcgcmRzLkRhdGFiYXNlSW5zdGFuY2UodGhpcywgJ0Z1dHVyZVBsdXNEYXRhYmFzZScsIHtcbiAgICAgIGVuZ2luZTogcmRzLkRhdGFiYXNlSW5zdGFuY2VFbmdpbmUuUE9TVEdSRVMsXG4gICAgICB2cGMsXG4gICAgICBkYXRhYmFzZU5hbWU6ICdGdXR1cmVQbHVzREInLFxuICAgICAgaW5zdGFuY2VUeXBlOiBlYzIuSW5zdGFuY2VUeXBlLm9mKGVjMi5JbnN0YW5jZUNsYXNzLkJVUlNUQUJMRTMsIGVjMi5JbnN0YW5jZVNpemUuTUlDUk8pLFxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgc3RvcmFnZUVuY3J5cHRlZDogdHJ1ZSxcbiAgICAgIGFsbG9jYXRlZFN0b3JhZ2U6IDIwLFxuICAgICAgbWF4QWxsb2NhdGVkU3RvcmFnZTogMTAwLFxuICAgICAgY3JlZGVudGlhbHM6IHJkcy5DcmVkZW50aWFscy5mcm9tR2VuZXJhdGVkU2VjcmV0KCdGdXR1cmVQbHVzQWRtaW4nKSxcbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgJ0RhdGFiYXNlIFVybCcsIHtcbiAgICAgIHZhbHVlOiBgJHtkYXRhYmFzZS5kYkluc3RhbmNlRW5kcG9pbnRBZGRyZXNzfToke2RhdGFiYXNlLmRiSW5zdGFuY2VFbmRwb2ludFBvcnR9YCxcbiAgICB9KTtcblxuICAgIGNvbnN0IERCY3JlZGVudGlhbHM6IERCY3JlZGVudGlhbHMgPSB7XG4gICAgICBkYk5hbWU6ICdGdXR1cmVQbHVzREInLFxuICAgICAgdXNlcm5hbWU6ICdGdXR1cmVQbHVzQWRtaW4nLFxuICAgICAgcGFzc3dvcmQ6IGRhdGFiYXNlLnNlY3JldCEuc2VjcmV0VmFsdWVGcm9tSnNvbigncGFzc3dvcmQnKSxcbiAgICAgIHBvcnQ6IChkYXRhYmFzZS5kYkluc3RhbmNlRW5kcG9pbnRQb3J0IGFzIHVua25vd24pIGFzIG51bWJlcixcbiAgICAgIHVybDogZGF0YWJhc2UuZGJJbnN0YW5jZUVuZHBvaW50QWRkcmVzcyxcbiAgICB9O1xuXG4gICAgY29uc3QgZGF0YWJhc2VVcmwgPSBgcG9zdGdyZXM6Ly8ke0RCY3JlZGVudGlhbHMudXNlcm5hbWV9OiR7REJjcmVkZW50aWFscy5wYXNzd29yZH1AJHtEQmNyZWRlbnRpYWxzLnVybH06JHtEQmNyZWRlbnRpYWxzLnBvcnR9LyR7REJjcmVkZW50aWFscy5kYk5hbWV9YDtcblxuICAgIHsvKiBFQ1MgQ0xVU1RFUiAqL31cbiAgICBjb25zdCBjbHVzdGVyID0gbmV3IGVjcy5DbHVzdGVyKHRoaXMsICdDbHVzdGVyJywge1xuICAgICAgdnBjLFxuICAgIH0pO1xuXG4gICAgY2x1c3Rlci5hZGRDYXBhY2l0eSgnQXV0b1NjYWxpbmdHcm91cENhcGFjaXR5Jywge1xuICAgICAgaW5zdGFuY2VUeXBlOiBuZXcgZWMyLkluc3RhbmNlVHlwZShcInQzLm1lZGl1bVwiKSxcbiAgICAgIGRlc2lyZWRDYXBhY2l0eTogMSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGVjc0NsdXN0ZXIgPSBuZXcgZWNzUGF0dGVybnMuQXBwbGljYXRpb25Mb2FkQmFsYW5jZWRFYzJTZXJ2aWNlKHRoaXMsICdFY3NDbHVzdGVyJywge1xuICAgICAgY2x1c3RlcixcbiAgICAgIG1lbW9yeUxpbWl0TWlCOiAyMDQ4LFxuICAgICAgdGFza0ltYWdlT3B0aW9uczoge1xuICAgICAgICBpbWFnZTogZWNzLkNvbnRhaW5lckltYWdlLmZyb21SZWdpc3RyeSgnaGFzdXJhL2dyYXBocWwtZW5naW5lOmxhdGVzdCcpLFxuICAgICAgICBjb250YWluZXJQb3J0OiA4MDgwLFxuICAgICAgICBlbmFibGVMb2dnaW5nOiB0cnVlLFxuICAgICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICAgIEhBU1VSQV9HUkFQSFFMX0VOQUJMRV9DT05TT0xFOiAndHJ1ZScsXG4gICAgICAgICAgSEFTVVJBX0dSQVBIUUxfUEdfQ09OTkVDVElPTlM6ICcxMDAnLFxuICAgICAgICAgIEhBU1VSQV9HUkFQSFFMX0RBVEFCQVNFX1VSTDogZGF0YWJhc2VVcmwsXG4gICAgICAgICAgSEFTVVJBX0dSQVBIUUxfQURNSU5fU0VDUkVUOiBwcm9wcy5oYXN1cmFBZG1pblNlY3JldCxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBkZXNpcmVkQ291bnQ6IDEsXG4gICAgICBsaXN0ZW5lclBvcnQ6IDQ0MyxcbiAgICAgIGRvbWFpbk5hbWU6IHByb3BzLmhhc3VyYUhvc3RuYW1lLFxuICAgICAgZG9tYWluWm9uZTogaG9zdGVkWm9uZSxcbiAgICAgIGNlcnRpZmljYXRlOiBoYXN1cmFDZXJ0aWZpY2F0ZSxcbiAgICAgIHJlZGlyZWN0SFRUUDogdHJ1ZSxcbiAgICAgIG9wZW5MaXN0ZW5lcjogdHJ1ZSxcbiAgICAgIHB1YmxpY0xvYWRCYWxhbmNlcjogdHJ1ZSxcbiAgICAgIGhlYWx0aENoZWNrR3JhY2VQZXJpb2Q6IER1cmF0aW9uLnNlY29uZHMoOTApLFxuICAgIH0pO1xuXG4gICAgey8qIERCIENPTk5FQ1RJT04gV0lUSCBFQ1MgKi99XG4gICAgZGF0YWJhc2UuY29ubmVjdGlvbnMuYWxsb3dGcm9tKGVjc0NsdXN0ZXIuc2VydmljZSwgZWMyLlBvcnQudGNwKERCY3JlZGVudGlhbHMucG9ydCkpO1xuXG4gICAgey8qIExBTUJEQSAqL31cbiAgICBjb25zdCBhcGlTZXJ2aWNlID0gbmV3IGxhbWJkYS5GdW5jdGlvbih0aGlzLCAnQVBJU2VydmljZScsIHtcbiAgICAgIHJ1bnRpbWU6IGxhbWJkYS5SdW50aW1lLk5PREVKU18xNF9YLFxuICAgICAgaGFuZGxlcjogJ2FwcC5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IG5ldyBsYW1iZGEuQXNzZXRDb2RlKCdhcGknKSxcbiAgICAgIHZwYyxcbiAgICAgIHZwY1N1Ym5ldHM6IHtcbiAgICAgICAgc3VibmV0VHlwZTogZWMyLlN1Ym5ldFR5cGUuUFJJVkFURVxuICAgICAgfSxcbiAgICAgIGVudmlyb25tZW50OiB7XG4gICAgICAgIGRhdGFiYXNlVXJsXG4gICAgICB9XG4gICAgfSk7XG5cbiAgICBjb25zdCBEQnBlcm1pc3Npb25zID0gbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xuICAgICAgYWN0aW9uczogWydyZHM6KiddLFxuICAgICAgcmVzb3VyY2VzOiBbJyonXSxcbiAgICB9KTtcblxuICAgIGFwaVNlcnZpY2UuY29ubmVjdGlvbnMuYWxsb3dUbyhkYXRhYmFzZSwgZWMyLlBvcnQudGNwKERCY3JlZGVudGlhbHMucG9ydCkpO1xuICAgIGFwaVNlcnZpY2UuYWRkVG9Sb2xlUG9saWN5KERCcGVybWlzc2lvbnMpO1xuXG4gICAgey8qIFJFU1QgQVBJICovfVxuICAgIGNvbnN0IGFwaUNlcnRpZmljYXRlID0gbmV3IGNlcnRpZmljYXRlTWFuYWdlci5EbnNWYWxpZGF0ZWRDZXJ0aWZpY2F0ZSh0aGlzLCAnQXBpQ2VydGlmaWNhdGUnLCB7XG4gICAgICBob3N0ZWRab25lLFxuICAgICAgZG9tYWluTmFtZTogcHJvcHMuYXBpSG9zdG5hbWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCBhcGkgPSBuZXcgYXBpZ2F0ZXdheS5SZXN0QXBpKHRoaXMsICdBUEknLCB7XG4gICAgICBkZXNjcmlwdGlvbjogJ2NyZWF0ZSBwcm9ncmFtIGFwaScsXG4gICAgICBkZWZhdWx0Q29yc1ByZWZsaWdodE9wdGlvbnM6IHtcbiAgICAgICAgYWxsb3dIZWFkZXJzOiBbXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZScsXG4gICAgICAgICAgJ1gtQW16LURhdGUnLFxuICAgICAgICAgICdBdXRob3JpemF0aW9uJyxcbiAgICAgICAgICAnWC1BcGktS2V5JyxcbiAgICAgICAgXSxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBbJ1BPU1QnXSxcbiAgICAgICAgYWxsb3dDcmVkZW50aWFsczogdHJ1ZSxcbiAgICAgICAgYWxsb3dPcmlnaW5zOiBbJ2h0dHA6Ly9sb2NhbGhvc3Q6MzAwMCddLFxuICAgICAgfSxcbiAgICAgIGRlcGxveTogdHJ1ZSxcbiAgICAgIGRvbWFpbk5hbWU6IHtcbiAgICAgICAgZG9tYWluTmFtZTogcHJvcHMuYXBpSG9zdG5hbWUsXG4gICAgICAgIGNlcnRpZmljYXRlOiBhcGlDZXJ0aWZpY2F0ZSxcbiAgICAgIH1cbiAgICB9KTtcblxuICAgIG5ldyBDZm5PdXRwdXQodGhpcywgJ2FwaVVybCcsIHtcbiAgICAgIHZhbHVlOiBhcGkudXJsXG4gICAgfSk7XG5cbiAgICBuZXcgcm91dGU1My5BUmVjb3JkKHRoaXMsICdBcGlBbGlhcycsIHtcbiAgICAgIHpvbmU6IGhvc3RlZFpvbmUsXG4gICAgICB0YXJnZXQ6IHJvdXRlNTMuUmVjb3JkVGFyZ2V0LmZyb21BbGlhcyhuZXcgdGFyZ2V0cy5BcGlHYXRld2F5KGFwaSkpLFxuICAgICAgcmVjb3JkTmFtZTogcHJvcHMuYXBpSG9zdG5hbWUsXG4gICAgfSk7XG5cbiAgICBjb25zdCB2MSA9IGFwaS5yb290LmFkZFJlc291cmNlKCd2MScpO1xuICAgIGNvbnN0IHByb2dyYW0gPSB2MS5hZGRSZXNvdXJjZSgnY3JlYXRlLXByb2dyYW0nKTtcbiAgICBwcm9ncmFtLmFkZE1ldGhvZCgnUE9TVCcsIG5ldyBhcGlnYXRld2F5LkxhbWJkYUludGVncmF0aW9uKGFwaVNlcnZpY2UpKTtcbiAgfVxufSJdfQ==