import sns = require('@aws-cdk/aws-sns');
import subs = require('@aws-cdk/aws-sns-subscriptions');
import sqs = require('@aws-cdk/aws-sqs');
import cdk = require('@aws-cdk/core');
import iam = require('@aws-cdk/aws-iam');
import { ManagedPolicy} from "@aws-cdk/aws-iam";
import lambda = require("@aws-cdk/aws-lambda");
import apigw =  require("@aws-cdk/aws-apigateway");
import { HitCounter } from "./hitcounter";
import { TableViewer } from "@lmig/lm-cdk-dynamo-table-viewer";

import { defaultsDeep } from 'lodash';


export class CdkWorkshopN0330843Stack extends cdk.Stack {

  lambdaIAM: iam.Role;

  constructor(scope: cdk.App, id: string, props?: cdk.StackProps) {
    let properties = defaultsDeep({}, props, {
      tags: {
        "name": "lm-aws-cdk-intro-workshop-sandbox",
        "artifactKey": "lm-aws-cdk-intro-workshop",
        "lm_app": "aws-lm-aws-cdk-intro-workshop",
        "lm_app_env": "sandbox",
        "lm_sbu": "global-risk-solutions",
        "lm_troux_uid": "3FF608EC-F029-47A6-A652-125D290B7A01",
        "deployment_guid": "1c5a72cd-5223-477c-8d0e-14fa2de2e027",
      }
    });
    super(scope, id, properties);

    this.lambdaIAM = this.getLambdaHandlerIamRole(this);

    // defines an AWS Lambda resource
    const hello = new lambda.Function(this, 'HelloHandler', {
      runtime: lambda.Runtime.NODEJS_8_10,// execution environment
      code: lambda.Code.asset('lambda'),  // code loaded from the "lambda" directory
      handler: 'hello.handler',           // file is "hello", function is "handler"
      role: this.lambdaIAM                // LM Compliant Lambda Role
    });

    const helloWithCounter = new HitCounter(this, 'HelloHitCounter', {
      downstream: hello
    });

    // defines an API Gateway REST API resource backed by our "hello" function.
    // Due to LM RADAR auto-remediation we cannot set the cloudWatchRole, due to way it leverages 'PATCH' rest resource.
    // We add the Policy to allow APIGW to create cloudwatch logs manually.
    const api = new apigw.LambdaRestApi(this, "Endpoint", {
      handler: helloWithCounter.handler,
      cloudWatchRole: false,
      proxy: false,
      endpointTypes: [apigw.EndpointType.REGIONAL]
    });

    new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      principals: [new iam.AnyPrincipal()],
      actions: [
        "execute-api:Invoke",
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams",
        "logs:PutLogEvents",
        "logs:GetLogEvents",
        "logs:FilterLogEvents"
      ],
      resources: [api.arnForExecuteApi()]
    });

    // Add proxy outside of LambdaRest API call. (Weird bug)
    const proxy = api.root.addProxy({
      defaultIntegration: new apigw.LambdaIntegration(helloWithCounter.handler)
    });

    new TableViewer(this, 'ViewHitCounter', {
          title: 'Hello Hits',
          table: helloWithCounter.table,
          sortBy: '-hits',
        cloudWatchRole: false,
        role:this.lambdaIAM
    });
  }

  /**
   * Method that returns an IAM role with some managed policies on it for lambdas to comply with LM Standards
   */
  getLambdaHandlerIamRole(scope:any) {
    return new iam.Role(scope, 'cdkWorkshopLambdaHanderRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
      managedPolicies: [
        ManagedPolicy.fromManagedPolicyName(scope, 'global-deny', 'cloud-services/cloud-services-global-deny'),
        ManagedPolicy.fromManagedPolicyName(scope, 'shared-global-deny', 'cloud-services/cloud-services-shared-global-deny'),
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaBasicExecutionRole'),
        ManagedPolicy.fromAwsManagedPolicyName('service-role/AWSLambdaVPCAccessExecutionRole')
      ],
    })
  }
}
