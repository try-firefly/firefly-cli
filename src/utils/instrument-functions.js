const ora = require('ora');
const AWS = require('aws-sdk');
const iam = new AWS.IAM();

const supportedRegions = {
  'x86_64': [
    "ap-northeast-1",
    "ap-northeast-2",
    "ap-south-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "ca-central-1",
    "eu-central-1",
    "eu-north-1",
    "eu-west-1",
    "eu-west-2",
    "eu-west-3",
    "sa-east-1",
    "us-east-1",
    "us-east-2",
    "us-west-1",
    "us-west-2"
  ],
  'arm64': [
    "ap-northeast-1",
    "ap-south-1",
    "ap-southeast-1",
    "ap-southeast-2",
    "eu-central-1",
    "eu-west-1",
    "eu-west-2",
    "us-east-1",
    "us-east-2",
    "us-west-2"
  ]
}

const arnLambdaInsights = {
  'x86_64': {
    "ap-northeast-1": "arn:aws:lambda:ap-northeast-1:580247275435:layer:LambdaInsightsExtension:32",
    "ap-northeast-2": "arn:aws:lambda:ap-northeast-2:580247275435:layer:LambdaInsightsExtension:20",
    "ap-south-1": "arn:aws:lambda:ap-south-1:580247275435:layer:LambdaInsightsExtension:21",
    "ap-southeast-1": "arn:aws:lambda:ap-southeast-1:580247275435:layer:LambdaInsightsExtension:21",
    "ap-southeast-2": "arn:aws:lambda:ap-southeast-2:580247275435:layer:LambdaInsightsExtension:21",
    "ca-central-1": "arn:aws:lambda:ca-central-1:580247275435:layer:LambdaInsightsExtension:20",
    "eu-central-1": "arn:aws:lambda:eu-central-1:580247275435:layer:LambdaInsightsExtension:21",
    "eu-north-1": "arn:aws:lambda:eu-north-1:580247275435:layer:LambdaInsightsExtension:20",
    "eu-west-1": "arn:aws:lambda:eu-west-1:580247275435:layer:LambdaInsightsExtension:21",
    "eu-west-2": "arn:aws:lambda:eu-west-2:580247275435:layer:LambdaInsightsExtension:21",
    "eu-west-3": "arn:aws:lambda:eu-west-3:580247275435:layer:LambdaInsightsExtension:20",
    "sa-east-1": "arn:aws:lambda:sa-east-1:580247275435:layer:LambdaInsightsExtension:20",
    "us-east-1": "arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension:21",
    "us-east-2": "arn:aws:lambda:us-east-2:580247275435:layer:LambdaInsightsExtension:21",
    "us-west-1": "arn:aws:lambda:us-west-1:580247275435:layer:LambdaInsightsExtension:20",
    "us-west-2": "arn:aws:lambda:us-west-2:580247275435:layer:LambdaInsightsExtension:21",
  },
  'arm64': {
    "us-east-1": "arn:aws:lambda:us-east-1:580247275435:layer:LambdaInsightsExtension-Arm64:2",
    "us-east-2": "arn:aws:lambda:us-east-2:580247275435:layer:LambdaInsightsExtension-Arm64:2",
    "us-west-2": "arn:aws:lambda:us-west-2:580247275435:layer:LambdaInsightsExtension-Arm64:2",
    "ap-south-1": "arn:aws:lambda:ap-south-1:580247275435:layer:LambdaInsightsExtension-Arm64:2",
    "ap-southeast-1": "arn:aws:lambda:ap-southeast-1:580247275435:layer:LambdaInsightsExtension-Arm64:2",
    "ap-southeast-2": "arn:aws:lambda:ap-southeast-2:580247275435:layer:LambdaInsightsExtension-Arm64:2",
    "ap-northeast-1": "arn:aws:lambda:ap-northeast-1:580247275435:layer:LambdaInsightsExtension-Arm64:2",
    "eu-central-1": "arn:aws:lambda:eu-central-1:580247275435:layer:LambdaInsightsExtension-Arm64:2",
    "eu-west-1": "arn:aws:lambda:eu-west-1:580247275435:layer:LambdaInsightsExtension-Arm64:2",
    "eu-west-2": "arn:aws:lambda:eu-west-2:580247275435:layer:LambdaInsightsExtension-Arm64:2"
  }
}

async function instrumentFunctions(functionsToInstrument, lambda, otelConfigLayerArn, fireflyLayerArn) {
  for (const fObj of functionsToInstrument) {
    const process = ora(`Instrumenting ${fObj.name}`).start();
    const otel = getOtelCollector(fObj.runtime, fObj.architecture);

    if (!otel) {
      process.warn(`${fObj.name} cannot be instrumented, ${fObj.runtime} runtime not supported`);
      continue;
    }
  
    if (!supportedRegions[fObj.architecture].includes(fObj.region)) {
      process.warn(`${fObj.name} cannot be instrumented, ${fObj.region} not supported`);
      continue;
    }

    const params = {
      FunctionName: fObj.name,
      Environment: {
        Variables: {
          'AWS_LAMBDA_EXEC_WRAPPER': '/opt/otel-handler',
          'OPENTELEMETRY_COLLECTOR_CONFIG_FILE': '/opt/collector.yaml',
          'OTEL_PROPAGATORS': 'tracecontext',
          'OTEL_TRACES_SAMPLER': 'always_on'
        }
      },
      Handler: '/opt/nodejs/firefly-handler.handler',
      Layers: [
        otelConfigLayerArn,
        fireflyLayerArn,
        `arn:aws:lambda:${fObj.region}:901920570463:layer:${otel}`, // OTel layer
        arnLambdaInsights[fObj.architecture][fObj.region] // Lambda Insights layer
      ],
      Role: fObj.roleArn,
      TracingConfig: {
        Mode: 'PassThrough'
      }
    };

    const iamParams = {
      PolicyArn: "arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy", 
      RoleName: fObj.role
    };
  
    await iam.attachRolePolicy(iamParams).promise();
    await lambda.updateFunctionConfiguration(params).promise();
    process.succeed(`${fObj.name} instrumented`);
  }

  ora('Instrumentation complete').start().succeed();
}

function getOtelCollector(runtime, architecture) {
  if (runtime.match(/.*node.*/gi) && architecture === 'x86_64') {
    return "aws-otel-nodejs-amd64-ver-1-7-0:1";
  } else if (runtime.match(/.*node.*/gi) && architecture === 'arm64') {
    return "aws-otel-nodejs-arm64-ver-1-7-0:1";
  } else {
    return null;
  }
}

exports.instrumentFunctions = instrumentFunctions;
