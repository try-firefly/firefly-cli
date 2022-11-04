const AWS = require("aws-sdk");
const uuid = require('uuid');
const inquirer = require('inquirer');
const { createYamlZip } = require('../src/helpers/yaml-generator');
let lambda;

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

async function main() {
  await setRegion();
  const functionList = await getList();
  console.log(functionList);
}

main();


/*

- Get the https address and create yaml file

- Get all lambda functions
- Extract data from list
  - look at data and adapt existing functions
- 

*/
