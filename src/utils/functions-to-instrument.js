const inquirer = require('inquirer');

async function getFunctionsToInstrument(functionList) {
  const functionNames = functionList.map(f => f.name);

  const question = {
    type: 'checkbox',
    name: 'functions',
    prefix: '',
    message: 'Please select the functions you would like to instrument:',
    choices: functionNames,
  }

  const answers = await inquirer.prompt(question);
  return functionList.filter(f => answers.functions.includes(f.name));
}

exports.getFunctionsToInstrument = getFunctionsToInstrument;
