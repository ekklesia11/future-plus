#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FuturePlusStack } from '../lib/future-plus-stack';
import { config } from 'dotenv';

config();

const app = new cdk.App();

const hostedZoneName = process.env.HOSTED_ZONE_NAME;
if (!hostedZoneName) throw Error('APP_NAME must be set in env');

const hasuraAdminSecret = process.env.HASURA_ADMIN_SECRET;
if (!hasuraAdminSecret) throw Error('APP_NAME must be set in env');

const hasuraHostname = process.env.HASURA_HOSTNAME;
if (!hasuraHostname) throw Error('APP_NAME must be set in env');

const apiHostname = process.env.API_HOSTNAME;
if (!apiHostname) throw Error('APP_NAME must be set in env');

const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT,
  region: process.env.CDK_DEFAULT_REGION,
};

new FuturePlusStack(app, 'FuturePlusStack', {
  hostedZoneName,
  hasuraAdminSecret,
  hasuraHostname,
  apiHostname,
  env
});