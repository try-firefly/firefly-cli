const opentelemetry = require('@opentelemetry/api');
const { 
  traceparentExtractor,
  extractContext,reassignContext
} = require('./src/utils/context-extractor');
const { loadUserHandler } = require('./src/utils/handler-loader');

exports.handler = async (event, context, callback) => {
  const traceparent = traceparentExtractor(event);

  if (traceparent) {
    console.log('FIREFLY: Reassigning span to correct trace');
    const parentCtx = extractContext(traceparent);
    const activeSpan = opentelemetry.trace.getActiveSpan();

    reassignContext(activeSpan, parentCtx);
  }

  const handler = await loadUserHandler();

  console.log('FIREFLY: Executing user handler');
  return handler(event, context, callback);
}
