const AWS = require("aws-sdk");
const inquirer = require('inquirer');
const { createYamlZip } = require('../src/helpers/yaml-generator');
const { createFireflyLayer } = require('../src/helpers/layer-generator');
const { fireFlyArt } = require('../src/ascii/fireflyLogo');
var term = require( 'terminal-kit' ).terminal ;
const AdmZip = require("adm-zip");
const iam = new AWS.IAM();
let lambda;
let otelConfigLayerArn;
let fireflyLayerArn;
  
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

async function getList() {
  const data = await lambda.listFunctions().promise();
  return extractFunctionData(data.Functions);
}

function getRole(arn) {
  return arn.split('/')[2];
}

function getRegion(arn) {
  return arn.split(':')[3];
}

function logger(str) {
  console.log('> ', str);
}

function completionLogger(str) {
  console.log('\u2714 ', str);
}

function extractFunctionData(functions) {
  const functionData = [];

  for (let i = 0; i < functions.length; i++) {
    const f = functions[i];
    const fObj = {};
    fObj.name = f.FunctionName;
    fObj.region = getRegion(f.FunctionArn);
    fObj.runtime = f.Runtime;
    fObj.role = getRole(f.Role);
    fObj.roleArn = f.Role;
    fObj.architecture = f.Architectures[0];
    functionData.push(fObj);
  }

  return functionData;
}

async function getHttpsAddress() {
  const question = {
    type: 'input',
    name: 'httpsAddress',
    prefix: '',
    message: 'Please provide an HTTPS address to send Telemetry data to (https://example.com):',
    validate: httpsAddressValid
  }

  const answer = await inquirer.prompt(question);
  return answer.httpsAddress;
}

async function httpsAddressValid(address) {
  const pattern = new RegExp('^https://.*');
  return pattern.test(address);
}

async function setRegion() {
  const question = {
    type: 'input',
    name: 'region',
    prefix: '',
    message: 'Please provide your AWS region:',
  }

  const answer = await inquirer.prompt(question);
  const region = answer.region;
  lambda = new AWS.Lambda({region});
}

async function getFunctionsToInstrument(functionList) {
  const functionNames = functionList.map(f => f.name);

  const question = {
    type: 'checkbox',
    name: 'functions',
    prefix: '',
    message: 'Select the functions you would like to instrument',
    choices: functionNames
  }

  const answers = await inquirer.prompt(question);
  return functionList.filter(f => answers.functions.includes(f.name));
}

async function publishLayer(layerName, layerZipLocation) {
  const zip = new AdmZip(layerZipLocation).toBuffer();

  let params = {
    Content: {
      ZipFile: zip
    },
    LayerName: layerName,
  }
  
  let result = await lambda.publishLayerVersion(params).promise();
  return result.LayerVersionArn;
}

async function publishOtelConfigLayer() {
  logger('Publishing OpenTelemetry config layer');
  otelConfigLayerArn = await publishLayer('otel-collector-config', './collector.zip');
  completionLogger('OpenTelemetry config layer published');
}

async function publishFireflyLayer() {
  logger('Publishing Firefly layer');
  fireflyLayerArn = await publishLayer('firefly-layer', './firefly-layer.zip');
  completionLogger('Firefly layer published');
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

async function instrumentFunctions(functionsToInstrument) {
  for (const fObj of functionsToInstrument) {
    logger(`Instrumenting ${fObj.name}`);
    const otel = getOtelCollector(fObj.runtime, fObj.architecture);

    if (!otel) {
      logger(`${fObj.name} can't be instrumented, ${fObj.runtime} runtime not supported`);
      continue;
    }
  
    if (!supportedRegions[fObj.architecture].includes(fObj.region)) {
      logger(`${fObj.name} can't be instrumented, ${fObj.region} not supported`);
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
  }

  completionLogger('Instrumentation complete');
}

async function main() {
  term.bold.brightBlue('                              Firefly');
  fireFlyArt();
  await setRegion();
  const httpsAddress = await getHttpsAddress();
  await createYamlZip(httpsAddress);
  await createFireflyLayer();
  const functionList = await getList();
  const functionsToInstrument = await getFunctionsToInstrument(functionList);
  await publishOtelConfigLayer();
  await publishFireflyLayer();
  await instrumentFunctions(functionsToInstrument);
}

main();
