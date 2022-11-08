// Users must change their Runtime Handler to /opt/nodejs/firefly-handler.handler (this file)
const opentelemetry = require('@opentelemetry/api');
const userFunction = require('/var/task/index.js'); // TODO: allow users to change this and the handling function

console.log('WORKING DIR', process.cwd()); // Debugging

function extractContextFromTraceparent(traceparent) {
  const [_, traceId, spanId] = traceparent.split('-');
  return { traceId, spanId };
}

function addSpanToTrace(span, parentCtx) {
  let spanCtx = span.spanContext();
  spanCtx.traceId = parentCtx.traceId;
  span.parentSpanId = parentCtx.spanId;
}

function tryParseTraceparent(callback) {
  let traceparent;
  try {
    traceparent = callback();
  } catch (err) {
    if (err instanceof TypeError) {
      return undefined;
    } else {
      throw err;
    }
  }

  return traceparent;
}

function getMsgAttributesTraceparent(event) {
  // TODO: Check for/handle multi-record events
  return tryParseTraceparent(() => event.Records[0].messageAttributes.traceparent.stringValue);
}

function getfireflyHeadersTraceparent(event) {
  return tryParseTraceparent(() => event.fireflyHeaders.traceparent);
}

// Extract parent context from fireflyHeaders or messageAttributes
function fireflyTraceparentExtractor(event) {
  const messageAttrbiutesTraceparent = getMsgAttributesTraceparent(event);

  if (messageAttrbiutesTraceparent) return messageAttrbiutesTraceparent;

  const fireflyHeadersTraceparent = getfireflyHeadersTraceparent(event);

  if (fireflyHeadersTraceparent) return fireflyHeadersTraceparent;
}


// For handling incoming SQS/SNS events:
// If event has a messageAttributes.traceparent (true for SQS/SNS), get the stringValue and use it as replacement to span;
// otherwise, assume instrumentation has already parsed out context via default context extractor (looks in HTTP headers) and continue
exports.handler = async (event, context, callback) => {
  const traceparent = fireflyTraceparentExtractor(event);

  if (traceparent) {
    console.log('FIREFLY: Reassigning span to correct trace');
    const parentCtx = extractContextFromTraceparent(traceparent);
    const activeSpan = opentelemetry.trace.getActiveSpan();

    addSpanToTrace(activeSpan, parentCtx);
  }

  console.log('FIREFLY: Executing user handler');
  return userFunction.handler(event, context, callback);
}
