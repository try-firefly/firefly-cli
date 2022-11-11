const inquirer = require('inquirer');

async function setRegion() {
  const question = {
    type: 'input',
    name: 'region',
    prefix: '',
    message: 'Please provide your AWS region:',
  }

  const answer = await inquirer.prompt(question);
  return answer.region;
}

exports.setRegion = setRegion;
