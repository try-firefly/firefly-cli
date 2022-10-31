const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const inquirer = require('inquirer');
const { createYamlZip } = require('./yaml-generator');

const suppportRegions = [
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
  "us-west-2",
];

async function getFunctionList() {
  let list;

  try {
    logger('Retrieving lambda functions');
    list = await exec("aws lambda list-functions");
  } catch (e) {
    console.log('Please make sure you have installed the AWS CLI');
    console.log(`Error: ${e}`);
  }

  list = JSON.parse(list.stdout);
  return extractFunctionData(list.Functions);
}

function extractFunctionData(functions) {
  const functionData = [];

  for (let i = 0; i < functions.length; i++) {
    const f = functions[i];
    const fObj = {};
    fObj.name = f.FunctionName;
    fObj.region = getRegion(f.FunctionArn);
    fObj.runtime = f.Runtime;
    functionData.push(fObj);
  }

  return functionData;
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

async function getHttpsAddress() {
  const question = {
    type: 'input',
    name: 'httpsAddress',
    prefix: '',
    message: 'Please provide an HTTPS address to send Telemetry data to (https://example.com):',
    validate: httpAddressValid
  }

  const answer = await inquirer.prompt(question);
  return answer.httpsAddress;
}

async function httpAddressValid(address) {
  const pattern = new RegExp('^https://.*');
  return pattern.test(address);
}

function getOtelCollector(runtime) {
  if (runtime.match(/.*node.*/gi)) {
    return "aws-otel-nodejs-amd64-ver-1-7-0:1";
  } else if (runtime.match(/.*python.*/gi)) {
    return "aws-otel-python-amd64-ver-1-13-0:1"
  } else {
    return null;
  }
}

async function publishLayer() {
  const cmd = "aws lambda publish-layer-version --layer-name otel-collector-config-test --zip-file fileb://collector.zip"
  logger('Publishing configuration layer');
  const result = await exec(cmd);
  const output = JSON.parse(result.stdout);
  return output.LayerArn + `:${output.Version}`;
}

async function waitForAws(sec) {
  await new Promise(resolve => setTimeout(resolve, sec * 1000));
}

async function addCollector(addOtelLayerCmd) {
  logger('Adding OpenTelemetry collector');
  await exec(addOtelLayerCmd);
  completionLogger('Collector added');
  waitForAws(1);
}

async function activateTracing(setTraceModeToActiveCmd) {
  logger('Activating trace mode');
  await exec(setTraceModeToActiveCmd);
  completionLogger('Trace mode activated');
  waitForAws(2);
}

async function addEnvironmentVariables(addEnvVariablesCmd) {
  logger('Adding environment variables');
  await exec(addEnvVariablesCmd);
  completionLogger('Environment variables added');
}

async function instrumentFunctions(functionsToInstrument) {
  const otelConfigArn = await publishLayer();

  for (const fObj of functionsToInstrument) {
    console.log('');
    logger(`Instrumenting ${fObj.name}`);
    const otel = getOtelCollector(fObj.runtime);

    if (!otel) {
      logger(`${fObj.name} can't be instrumented, ${fObj.runtime} runtime not supported`);
      continue;
    }

    if (!suppportRegions.includes(fObj.region)) {
      logger(`${fObj.name} can't be instrumented, ${fObj.region} not supported`);
      continue;
    }

    const configPath = fObj.runtime.match(/.*node.*/gi) ? "/opt/collector.yaml" : "/opt/otel-instrument";
    const otelArn = `arn:aws:lambda:${fObj.region}:901920570463:layer:${otel}`;
    const envVariables = `Variables={AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-handler,OPENTELEMETRY_COLLECTOR_CONFIG_FILE=${configPath}}`;
    const addOtelLayerCmd = `aws lambda update-function-configuration --function-name ${fObj.name} --layers ${otelArn} ${otelConfigArn}`;
    const setTraceModeToActiveCmd = `aws lambda update-function-configuration --function-name ${fObj.name} --tracing-config Mode=Active`;
    const addEnvVariablesCmd = `aws lambda update-function-configuration --function-name ${fObj.name} --environment "${envVariables}"`;

    try {
      await addCollector(addOtelLayerCmd, fObj);
      await activateTracing(setTraceModeToActiveCmd, fObj);
      await addEnvironmentVariables(addEnvVariablesCmd, fObj);
    } catch (e) {
      console.log(e);
    }
  }
}

async function main() {
  const httpsAddress = await getHttpsAddress();
  await createYamlZip(httpsAddress);
  const functionList = await getFunctionList();
  const functionsToInstrument = await getFunctionsToInstrument(functionList);
  await instrumentFunctions(functionsToInstrument);
  console.log("** Instrumentation complete **");
}

main();
