const baseExec = require('child_process').exec;
const inquirer = require('inquirer');
const { readVariablesFromFile } = require('../utils/write-to-file');

async function confirmDeletion() {
  const question = {
    type: 'input',
    name: 'delete',
    prefix: '',
    message: "Are you sure you want to delete the metric stream and firehose? Type 'yes' to proceed:"
  }

  const answer = await inquirer.prompt(question);
  return answer.delete;
}

async function destroyMetricStreamAndFirehose() {
  const answer = await confirmDeletion();
  const data = readVariablesFromFile();

  if (answer !== 'yes') return;
  const destroyCmd = `cd ../terraform && terraform destroy -auto-approve \
  -var 'aws_region=${data.aws_region}' \
  -var 'ingest_endpoint=${data.ingest_endpoint}' \
  -var 'expiration_days=${data.expiration_days}'`;

  try {
    const destroyProcess = baseExec(destroyCmd);
    destroyProcess.stdout.pipe(process.stdout);
  } catch (e) {
    console.log(e);
  }
}

exports.destroyMetricStreamAndFirehose = destroyMetricStreamAndFirehose;
