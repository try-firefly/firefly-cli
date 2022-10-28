const yaml = require('js-yaml');
const fs = require('fs');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

function read(path) {
  let fileContents = fs.readFileSync(path, 'utf8');
  let data = yaml.load(fileContents);
  return data;
}

function write(data) {
  const config = { 'flowLevel': 4, styles: { '!!null': 'empty' } }
  const yamlStr = yaml.dump(data, config);
  fs.writeFileSync('collector.yaml', yamlStr, 'utf8');
}

async function createYamlZip(httpsAddress) {
  const data = read('./setup.yaml');
  data.exporters.otlphttp.endpoint = httpsAddress;
  write(data);
  await exec("zip collector.zip collector.yaml");
}

exports.createYamlZip = createYamlZip;
