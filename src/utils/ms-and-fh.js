const ora = require('ora');
const { promisify } = require('util');
const baseExec = require('child_process').exec;
const exec = promisify(baseExec);

async function initialiseTerraform() {
  const process = ora('Initialising terraform').start();
  try {
    await exec("cd ../terraform && terraform init");
    process.succeed('Terraform initialised');
  } catch (e) {
    process.fail('Terraform unable to initialise');
    console.log(e);
  }
}

async function setupMetricStreamAndFirehose(httpsAddress, s3BackupDays, region) {
  await initialiseTerraform();
  const applyCmd = `cd ../terraform && terraform apply -auto-approve \
  -var 'aws_region=${region}' \
  -var 'ingest_endpoint=${httpsAddress}' \
  -var 'expiration_days=${s3BackupDays}'`;
  console.log('> Deploying metric stream and firehose');
  try {
    const applyProcess = baseExec(applyCmd);
    applyProcess.stdout.pipe(process.stdout);
  } catch (e) {
    console.log(e);
  }
}

exports.setupMetricStreamAndFirehose = setupMetricStreamAndFirehose;
