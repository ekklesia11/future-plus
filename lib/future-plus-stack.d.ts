import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
interface ExtendedStackProps extends StackProps {
    appName: string;
    awsRegion: string;
    hostedZoneId: string;
    hostedZoneName: string;
    hasuraAdminSecret: string;
    hasuraHostname: string;
    apiHostname: string;
}
export declare class FuturePlusStack extends Stack {
    readonly response: string;
    constructor(scope: Construct, id: string, props: ExtendedStackProps);
}
export {};
