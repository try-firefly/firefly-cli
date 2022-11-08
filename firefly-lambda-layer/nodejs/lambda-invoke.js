// require('/opt/nodejs/lambda-invoke.js') to use the invokeLambda function in your handler.
const AWS = require('aws-sdk');
const opentelemetry = require('@opentelemetry/api');

function getTraceparent() {
  const activeSpan = opentelemetry.trace.getActiveSpan();
  const spanId = activeSpan._spanContext.spanId;
  const traceId = activeSpan._spanContext.traceId;
  return `00-${traceId}-${spanId}-01`;
}

// inject fireflyHeaders into params.Payload to carry tracecontext
exports.invokeLambda = async (region, params, callback) => {
  AWS.config.region = region;
  const lambda = new AWS.Lambda();
  const traceparent = getTraceparent();
  const payload = JSON.parse(params.Payload) || {};

  if (payload.fireflyHeaders) {
    console.log('FIREFLY DEBUG: reassigning traceparent');
    payload.fireflyHeaders.traceparent = traceparent;
  } else {
    console.log('FIREFLY DEBUG: setting traceparent');
    payload.fireflyHeaders = { traceparent };
  }
  params.Payload = JSON.stringify(payload);
  console.log('FIREFLY DEBUG: PAYLOAD', payload);
  console.log('FIREFLY DEBUG: PARAMS.PAYLOAD', params.Payload);

  return lambda.invoke(params, callback);
}
