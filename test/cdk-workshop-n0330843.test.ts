import { expect as expectCDK, haveResource } from '@aws-cdk/assert';
import cdk = require('@aws-cdk/core');
import CdkWorkshopN0330843 = require('../lib/cdk-workshop-n0330843-stack');

test('SQS Queue Created', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new CdkWorkshopN0330843.CdkWorkshopN0330843Stack(app, 'MyTestStack');
    // THEN
    expectCDK(stack).to(haveResource("AWS::SQS::Queue",{
      VisibilityTimeout: 300
    }));
});

test('SNS Topic Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new CdkWorkshopN0330843.CdkWorkshopN0330843Stack(app, 'MyTestStack');
  // THEN
  expectCDK(stack).to(haveResource("AWS::SNS::Topic"));
});