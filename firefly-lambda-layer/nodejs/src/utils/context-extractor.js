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

function traceparentExtractor(event) {
  const messageAttributesTraceparent = getMsgAttributesTraceparent(event);

  if (messageAttributesTraceparent) return messageAttributesTraceparent;

  const fireflyHeadersTraceparent = getfireflyHeadersTraceparent(event);

  if (fireflyHeadersTraceparent) return fireflyHeadersTraceparent;
}

function extractContextFromTraceparent(traceparent) {
  const [_, traceId, spanId] = traceparent.split('-');
  return { traceId, spanId };
}

function reassignContext(span, parentCtx) {
  let spanCtx = span.spanContext();
  spanCtx.traceId = parentCtx.traceId;
  span.parentSpanId = parentCtx.spanId;
}

exports.traceparentExtractor = traceparentExtractor;
exports.extractContext = extractContextFromTraceparent;
exports.reassignContext = reassignContext;