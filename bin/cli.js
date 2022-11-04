const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const inquirer = require('inquirer');
const { createYamlZip } = require('../src/helpers/yaml-generator');
const { createFireflyLayer } = require('../src/helpers/layer-generator');

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
    fObj.role = getRole(f.Role);
    functionData.push(fObj);
  }

  return functionData;
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

async function publishConfigLayer() {
  const cmd = "aws lambda publish-layer-version --layer-name otel-collector-config --zip-file fileb://collector.zip";
  logger('Publishing configuration layer');
  const result = await exec(cmd);
  completionLogger('Configuration layer published');
  const output = JSON.parse(result.stdout);
  return output.LayerArn + `:${output.Version}`;
}

async function publishFireflyLayer() {
  const cmd = "aws lambda publish-layer-version --layer-name firefly-lambda-layer --zip-file fileb://firefly-layer.zip";
  logger('Publishing Firefly layer');
  const result = await exec(cmd);
  completionLogger('Firefly layer published');
  const output = JSON.parse(result.stdout);
  return output.LayerArn + `:${output.Version}`;
}

async function waitForAws(sec) {
  return new Promise(resolve => setTimeout(resolve, sec * 1000));
}

async function addLayers(addLayersCmd) {
  logger('Adding OpenTelemetry collector, Lambda Insights and Firefly layers');
  await exec(addLayersCmd);
  completionLogger('Layers added');
  await waitForAws(2);
}

async function addTracingPolicy(addTracePolicyCmd) {
  logger('Adding tracing policy');
  await exec(addTracePolicyCmd);
  completionLogger('Tracing policy added');
  await waitForAws(2);
}

async function deactivateTracing(setTracingCmd) {
  logger('Deactivating active tracing');
  await exec(setTracingCmd);
  completionLogger('Active tracing deactivated');
  await waitForAws(2);
}

async function changeLambdaHandler(changeHandlerCmd) {
  logger('Changing default Lambda handler to Firefly handler');
  await exec(changeHandlerCmd);
  completionLogger('Lambda handler changed');
  await waitForAws(2);
}

async function addEnhancedMonitoringPolicy(addEnhancedMonitoringPolicyCmd) {
  logger('Adding enhanced monitoring policy');
  await exec(addEnhancedMonitoringPolicyCmd);
  completionLogger('Enhanced monitoring policy added');
  await waitForAws(2);
}

async function addEnvironmentVariables(addEnvVariablesCmd) {
  logger('Adding environment variables');
  await exec(addEnvVariablesCmd);
  completionLogger('Environment variables added');
}

async function instrumentFunctions(functionsToInstrument) {
  const otelConfigArn = await publishConfigLayer();
  const fireflyArn = await publishFireflyLayer();

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
    const lambdaInsightsArn = "arn:aws:lambda:eu-central-1:580247275435:layer:LambdaInsightsExtension:21";
    const envVariables = `Variables={AWS_LAMBDA_EXEC_WRAPPER=/opt/otel-handler,OPENTELEMETRY_COLLECTOR_CONFIG_FILE=${configPath},OTEL_PROPAGATORS=tracecontext,OTEL_TRACES_SAMPLER=always_on}`;
    const addLayersCmd = `aws lambda update-function-configuration --function-name ${fObj.name} --layers ${otelArn} ${otelConfigArn} ${fireflyArn} ${lambdaInsightsArn}`;
    const addTracePolicyCmd = `aws iam attach-role-policy --role-name ${fObj.role} --policy-arn "arn:aws:iam::aws:policy/AWSXrayWriteOnlyAccess"`
    const setTracingCmd = `aws lambda update-function-configuration --function-name ${fObj.name} --tracing-config Mode=PassThrough`;
    const changeHandlerCmd = `aws lambda update-function-configuration --function-name ${fObj.name} --handler=/opt/nodejs/firefly-handler.handler`;
    const addEnhancedMonitoringPolicyCmd = `aws iam attach-role-policy --role-name ${fObj.role} --policy-arn "arn:aws:iam::aws:policy/CloudWatchLambdaInsightsExecutionRolePolicy"`
    const addEnvVariablesCmd = `aws lambda update-function-configuration --function-name ${fObj.name} --environment "${envVariables}"`;

    try {
      await addLayers(addLayersCmd);
      // await addTracingPolicy(addTracePolicyCmd);
      await changeLambdaHandler(changeHandlerCmd);
      await deactivateTracing(setTracingCmd);
      // await addEnhancedMonitoringPolicy(addEnhancedMonitoringPolicyCmd);
      await addEnvironmentVariables(addEnvVariablesCmd);
    } catch (e) {
      console.log(e);
    }
  }

  completionLogger("Instrumentation complete");
}

async function main() {
  const httpsAddress = await getHttpsAddress();
  await createYamlZip(httpsAddress);
  await createFireflyLayer();
  const functionList = await getFunctionList();
  const functionsToInstrument = await getFunctionsToInstrument(functionList);
  await instrumentFunctions(functionsToInstrument);
}

main();
