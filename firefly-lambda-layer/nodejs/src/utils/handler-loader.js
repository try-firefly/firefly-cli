const loadUserHandler = async (path) => {
  let index;
  try {
    console.log('FIREFLY: Loading user handler')
    index = await import('/var/task/index.mjs');
  } catch (e) {
    console.log('FIREFLY: User handler not found at /var/task/index.mjs, trying /var/task/index.js');
    index = require('/var/task/index.js');
  }

  return index.handler;
}

exports.loadUserHandler = loadUserHandler;