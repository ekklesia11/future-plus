import { Stack, StackProps } from 'aws-cdk-lib';
import { Construct } from 'constructs';
interface ExtendedStackProps extends StackProps {
    hostedZoneName: string;
    hasuraAdminSecret: string;
    hasuraHostname: string;
    apiHostname: string;
}
export declare class FuturePlusStack extends Stack {
    constructor(scope: Construct, id: string, props: ExtendedStackProps);
}
export {};
