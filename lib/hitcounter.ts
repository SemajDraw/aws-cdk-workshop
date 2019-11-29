import cdk = require('@aws-cdk/core');
import lambda = require('@aws-cdk/aws-lambda');
import dynamodb = require('@aws-cdk/aws-dynamodb');
import iam = require('@aws-cdk/aws-iam');
import { ManagedPolicy } from '@aws-cdk/aws-iam';

export interface HitCounterProps {
    /** the function for which we want to count url hits **/
    downstream: lambda.Function;
}

export class HitCounter extends cdk.Construct {

    /** allows accessing the counter function */
    public readonly handler: lambda.Function;

    /** Variable to hold Lambda Role */
    lambdaIAM:iam.Role;

    /** the hit counter table */
    public readonly table: dynamodb.Table;

    constructor(scope: cdk.Construct, id: string, props: HitCounterProps) {
        super(scope, id);
        this.lambdaIAM = this.getLambdaHandlerIamRole(this);

        const table = new dynamodb.Table(this, 'Hits', {
            partitionKey: { name: 'path', type: dynamodb.AttributeType.STRING },
            serverSideEncryption: true,  // FOR LM Compliance
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST  // To Minimize costs
        });

        this.table = table;

        this.handler = new lambda.Function(this, 'HitCounterHandler', {
            runtime: lambda.Runtime.NODEJS_8_10,
            handler: 'hitcounter.handler',
            code: lambda.Code.asset('lambda'),
            role: this.lambdaIAM,
            environment: {
                DOWNSTREAM_FUNCTION_NAME: props.downstream.functionName,
                HITS_TABLE_NAME: this.table.tableName
            }
        });

        // grant the lambda role read/write permissions to our table
        table.grantReadWriteData(this.handler);

        // grant the lambda role invoke permissions to the downstream function
        props.downstream.grantInvoke(this.handler);
    }

    /**
     * Method that returns an IAM role with some managed policies on it for lambdas
     */
    getLambdaHandlerIamRole(scope:any){
        return new iam.Role(scope, 'HitCounterLambdaHanderRole', {
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
