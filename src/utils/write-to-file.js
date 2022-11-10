const fs = require('fs');

function writeVariablesToFile(region, s3BackupDays, httpsAddress) {
  const variables = {
    aws_region: region,
    ingest_endpoint: httpsAddress,
    expiration_days: s3BackupDays
  }
  let data = JSON.stringify(variables);
  fs.writeFileSync('../src/config/variables.json', data);
}

function readVariablesFromFile() {
  let fileContents = fs.readFileSync('../src/config/variables.json');
  return JSON.parse(fileContents);
}

module.exports = {
  writeVariablesToFile,
  readVariablesFromFile
};
