const opentelemetry = require('@opentelemetry/api');
const userFunction = require('/var/task/index.js');

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
  return tryParseTraceparent(() => event.Records[0].messageAttributes.traceparent.stringValue);
}

function getfireflyHeadersTraceparent(event) {
  return tryParseTraceparent(() => event.fireflyHeaders.traceparent);
}

function fireflyTraceparentExtractor(event) {
  const messageAttrbiutesTraceparent = getMsgAttributesTraceparent(event);

  if (messageAttrbiutesTraceparent) return messageAttrbiutesTraceparent;

  const fireflyHeadersTraceparent = getfireflyHeadersTraceparent(event);

  if (fireflyHeadersTraceparent) return fireflyHeadersTraceparent;
}

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
