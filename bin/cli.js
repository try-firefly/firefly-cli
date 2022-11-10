#!/usr/bin/env node

const process = require('process');
process.chdir('./bin');
const AWS = require('aws-sdk');
const { createYamlZip } = require('../src/helpers/yaml-generator');
const { createFireflyLayer } = require('../src/helpers/layer-generator');
const { fireFlyArt } = require('../src/ascii/fireflyLogo');
const { setRegion } = require('../src/utils/set-region');
const { getHttpsAddress } = require('../src/utils/https-address');
const { getList } = require('../src/utils/function-list');
const { getS3BackupDays } = require('../src/utils/backup-days');
const { getFunctionsToInstrument } = require('../src/utils/functions-to-instrument');
const { publishOtelConfigLayer, publishFireflyLayer } = require('../src/utils/publish-layer');
const { instrumentFunctions } = require('../src/utils/instrument-functions');
const { setupMetricStreamAndFirehose } = require('../src/utils/ms-and-fh');

async function main() {
  fireFlyArt();
  const region = await setRegion();
  const lambda = new AWS.Lambda({region});
  const httpsAddress = await getHttpsAddress();
  await createYamlZip(httpsAddress);
  await createFireflyLayer();
  const functionList = await getList(lambda);
  const s3BackupDays = await getS3BackupDays();
  const functionsToInstrument = await getFunctionsToInstrument(functionList);
  const otelConfigLayerArn = await publishOtelConfigLayer(lambda);
  const fireflyLayerArn = await publishFireflyLayer(lambda);
  await instrumentFunctions(functionsToInstrument, lambda, otelConfigLayerArn, fireflyLayerArn);
  await setupMetricStreamAndFirehose(httpsAddress, s3BackupDays, region);
}

main();
