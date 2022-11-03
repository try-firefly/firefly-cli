const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

async function createFireflyLayer() {
  const buildFile = './build-layer.sh';
  await exec(`chmod u+x ${buildFile}`);
  await exec(buildFile);
}

exports.createFireflyLayer = createFireflyLayer;
