#!/usr/bin/env node
import cdk = require('@aws-cdk/core');
import { CdkWorkshopN0330843Stack } from '../lib/cdk-workshop-n0330843-stack';

const app = new cdk.App();
new CdkWorkshopN0330843Stack(app, 'CdkWorkshopN0330843Stack');