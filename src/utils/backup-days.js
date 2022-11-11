const inquirer = require('inquirer');

async function getS3BackupDays() {
  const question = {
    type: 'input',
    name: 's3BackupDays',
    prefix: '',
    message: 'Please specify the number of days you would like to keep failed metric requests in your backup s3 bucket (e.g. 90):',
  }

  const answer = await inquirer.prompt(question);
  return answer.s3BackupDays;
}

exports.getS3BackupDays = getS3BackupDays;
