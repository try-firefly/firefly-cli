const AWS = require('aws-sdk');
const opentelemetry = require('@opentelemetry/api');

function getTraceparent() {
  const activeSpan = opentelemetry.trace.getActiveSpan();
  const spanId = activeSpan._spanContext.spanId;
  const traceId = activeSpan._spanContext.traceId;
  return `00-${traceId}-${spanId}-01`;
}

exports.invokeLambda = async (region, params, callback) => {
  AWS.config.region = region;
  const lambda = new AWS.Lambda();
  const traceparent = getTraceparent();
  const payload = JSON.parse(params.Payload) || {};

  if (payload.fireflyHeaders) {
    console.log('FIREFLY: reassigning traceparent');
    payload.fireflyHeaders.traceparent = traceparent;
  } else {
    console.log('FIREFLY: setting traceparent');
    payload.fireflyHeaders = { traceparent };
  }
  params.Payload = JSON.stringify(payload);
  return lambda.invoke(params, callback);
}
