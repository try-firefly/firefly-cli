const yaml = require('js-yaml');
const fs = require('fs');

function read(path) {
  let fileContents = fs.readFileSync(path, 'utf8');
  let data = yaml.load(fileContents);
  console.dir(data, { depth: null });
  return data;
}

function write() {

}

function main() {
  const file = read('./collector.yaml');
}

main();
