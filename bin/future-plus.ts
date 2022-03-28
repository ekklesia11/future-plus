#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { FuturePlusStack } from '../lib/future-plus-stack';
import { config } from 'dotenv';

config();

const app = new cdk.App();

const { env } = process;

const appName = env.APP_NAME;
if (!appName) throw Error('APP_NAME must be set in env');

const awsRegion = env.AWS_REGION;
if (!awsRegion) throw Error('APP_NAME must be set in env');

const hostedZoneId = env.HOSTED_ZONE_ID;
if (!hostedZoneId) throw Error('APP_NAME must be set in env');

const hostedZoneName = env.HOSTED_ZONE_NAME;
if (!hostedZoneName) throw Error('APP_NAME must be set in env');

const hasuraAdminSecret = env.HASURA_ADMIN_SECRET;
if (!hasuraAdminSecret) throw Error('APP_NAME must be set in env');

const hasuraHostname = env.HASURA_HOSTNAME;
if (!hasuraHostname) throw Error('APP_NAME must be set in env');

const apiHostname = env.API_HOSTNAME;
if (!apiHostname) throw Error('APP_NAME must be set in env');

new FuturePlusStack(app, 'FuturePlusStack', {
  appName,
  awsRegion,
  hostedZoneId,
  hostedZoneName,
  hasuraAdminSecret,
  hasuraHostname,
  apiHostname,
});