const loadUserHandler = async (path) => {
  let userHandler;
  try {
    console.log('FIREFLY: Loading user handler')
    userHandler = require('/var/task/index.js');
  } catch (e) {
    console.log('FIREFLY: User handler not found at /var/task/index.js, trying /var/task/index.mjs');
    userHandler = import('/var/task/index.mjs');
  }

  return userHandler;
}

exports.loadUserHandler = loadUserHandler;