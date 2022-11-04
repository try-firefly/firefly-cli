const AWS = require("aws-sdk");
const uuid = require('uuid');
const inquirer = require('inquirer');
const { createYamlZip } = require('../src/helpers/yaml-generator');
const AdmZip = require("adm-zip");
let lambda;
let otelConfigLayerArn;

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

async function publishLayer() {
  const zip = new AdmZip("./collector.zip").toBuffer();

  let params = {
    Content: {
      ZipFile: zip
    },
    LayerName: 'otel-collector-config-test',
  }
  
  let result = await lambda.publishLayerVersion(params).promise();
  otelConfigLayerArn = result.LayerVersionArn;
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
    console.log('');
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

    
  
  }
}

async function main() {
  await setRegion();
  // const httpsAddress = await getHttpsAddress();
  // await createYamlZip(httpsAddress);
  // await publishLayer();

  const functionList = await getList();
  console.log(functionList);
  // const functionsToInstrument = await getFunctionsToInstrument(functionList);
}

main();

/*

- Get the https address and create yaml file

- Get all lambda functions
- Extract data from list
  - look at data and adapt existing functions
- 


What are we trying to do?
- check what arc is
- based on arc return correct string with arc
- check region based on arc and see if supported


*/


