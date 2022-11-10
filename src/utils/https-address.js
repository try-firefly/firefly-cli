const inquirer = require('inquirer');

async function getHttpsAddress() {
  const question = {
    type: 'input',
    name: 'httpsAddress',
    prefix: '',
    message: 'Please provide an HTTPS address to send Telemetry data to (https://example.com):',
    validate: httpsAddressValid,
  }

  const answer = await inquirer.prompt(question);
  return answer.httpsAddress;
}

async function httpsAddressValid(address) {
  const pattern = new RegExp('^https://.*');
  return pattern.test(address);
}


exports.getHttpsAddress = getHttpsAddress;
