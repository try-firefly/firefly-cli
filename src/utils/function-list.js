async function getList(lambda) {
  const data = await lambda.listFunctions().promise();
  return extractFunctionData(data.Functions);
}

function extractFunctionData(functions) {
  const functionData = [];

  for (let i = 0; i < functions.length; i++) {
    const f = functions[i];
    const fObj = {};
    fObj.name = f.FunctionName;
    fObj.region = getRegion(f.FunctionArn);
    fObj.runtime = f.Runtime;
    fObj.role = getRole(f.Role);
    fObj.roleArn = f.Role;
    fObj.architecture = f.Architectures[0];
    functionData.push(fObj);
  }

  return functionData;
}

function getRole(arn) {
  let splitArn = arn.split('/');
  return splitArn[splitArn.length - 1];
}

function getRegion(arn) {
  return arn.split(':')[3];
}

exports.getList = getList;
