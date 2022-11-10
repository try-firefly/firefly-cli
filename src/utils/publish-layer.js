const ora = require('ora');
const AdmZip = require('adm-zip');

async function publishLayer(layerName, layerZipLocation, lambda) {
  const zip = new AdmZip(layerZipLocation).toBuffer();

  let params = {
    Content: {
      ZipFile: zip
    },
    LayerName: layerName,
  }

  let result = await lambda.publishLayerVersion(params).promise();
  return result.LayerVersionArn;
}

async function publishOtelConfigLayer(lambda) {
  const process = ora('Deploying OpenTelemetry configuration layer').start();
  const otelConfigLayerArn = await publishLayer('otel-collector-config', './collector.zip', lambda);
  process.succeed('Deployed OpenTelemetry configuration layer');
  return otelConfigLayerArn;
}

async function publishFireflyLayer(lambda) {
  const process = ora('Deploying Firefly layer').start();
  const fireflyLayerArn = await publishLayer('firefly-layer', './firefly-layer.zip', lambda);
  process.succeed('Deployed Firefly layer');
  return fireflyLayerArn;
}

module.exports = {
  publishOtelConfigLayer,
  publishFireflyLayer
};
