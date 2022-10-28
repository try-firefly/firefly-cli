const { promisify } = require('util');
const exec = promisify(require('child_process').exec);
const inquirer = require('inquirer');

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
]

async function getFunctionList() {
  let list;

  try {
    list = await exec("aws lambda list-functions");
  } catch {
    console.log('Please make sure you have installed the AWS CLI');
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

async function getFunctionsToInstrument(functionList) {
  const functionNames = functionList.map(f => f.name);

  const question = {
    type: 'checkbox',
    name: 'functions',
    message: 'Which functions would you like to instrument?',
    choices: functionNames
  }

  const answers = await inquirer.prompt(question);
  return functionList.filter(f => answers.functions.includes(f.name));
}

function getOtelCollector(runtime) {
  if (runtime.match(/.*java.*/gi)) {
    return "aws-otel-java-wrapper-amd64-ver-1-18-0:1";
  } else if (runtime.match(/.*node.*/gi)) {
    return "aws-otel-nodejs-amd64-ver-1-7-0:1";
  } else if (runtime.match(/.*python.*/gi)) {
    return "aws-otel-python-amd64-ver-1-13-0:1"
  } else {
    return null;
  }
}

async function instrumentFunctions(functionsToInstrument) {
  for (const fObj of functionsToInstrument) {
    const otel = getOtelCollector(fObj.runtime);

    if (!otel) {
      console.log(`${fObj.name} can't be instrumented, ${fObj.runtime} not supported`);
      continue;
    }

    if (!suppportRegions.includes(fObj.region)) {
      console.log(`${fObj.name} can't be instrumented, ${fObj.region} not supported`);
      continue;
    }

    const layerArn = `arn:aws:lambda:${fObj.region}:901920570463:layer:${otel}`
    const command = `aws lambda update-function-configuration --function-name ${fObj.name} --layers ${layerArn}`;

    try {
      await exec(command);
    } catch (e) {
      console.log(e);
    }
  }
}

async function main() {
  const functionList = await getFunctionList();
  const functionsToInstrument = await getFunctionsToInstrument(functionList);
  await instrumentFunctions(functionsToInstrument);
}

main();

// work out which chipset is being used and use the correct layer for it
// enable active tracing when updating the function
// add the environment variables based on the language
