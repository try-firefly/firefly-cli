- A Node.js Lambda layer to assist in Open Telemetry trace instrumentation and context propagation.
- To be used in conjunction with the [AWS managed Open Telemetry Layer for JavaScript](https://aws-otel.github.io/docs/getting-started/lambda/lambda-js)
- Uses a custom handler which wraps the user defined handler.

## Functionality

- **Context propgation for invocations via SNS/SQS**: If first record of incoming `event` has `messageAttributes.traceparent`, uses the `stringValue` of `traceparent` to parse parent context and reassigns it in auto-instrumented span
  - Limitation: cannot parse `traceparent` from multiple records (if multiple records are sent)
- **Context propagation for invocations via AWS SDK**:
  - For incoming events, if `event` has `fireflyHeaders.traceparent`, uses the value to parse parent context and reassigns it in auto-instrumented span
  - For outgoing Lambda invocations, uses a wrapper function around AWS SDK's Lambda invoking function to inject `traceparent` (containing context information) into `params.payload` under `fireflyHeaders`

## Requirements (automatically handled via Firefly CLI)

1. [AWS managed Open Telemetry Layer for JavaScript](https://aws-otel.github.io/docs/getting-started/lambda/lambda-js) should be installed on Lambda
2. Directory contents should be added to a `.zip` file and uploaded to AWS Lambda Layers

- This will make the layer available to use across your AWS Lambdas within the region.

3. Newly created Firefly Lambda Layer should be added to the Lambda you wish to instrument

- This will add the contents of the layer to the `/opt` folder within your Lambda's container, and allow the files to be accessible at runtime.

4. The following environment variables should be set (under Configuration):
   | Key | Value |
   | ----------------------------------- | ------------------------- |
   | AWS_LAMBDA_EXEC_WRAPPER | /opt/otel-handler |
   | OPENTELEMETRY_COLLECTOR_CONFIG_FILE | /var/task/collector.yaml |
   | OTEL_PROPAGATORS | tracecontext |
   | OTEL_TRACES_SAMPLER | always_on |
5. Active Tracing should be **not enabled** under Monitoring and operations tools.
6. Lambda Handler under Runtime settings should be changed to to `/opt/nodejs/firefly-handler.handler`
   - This will change the Lambda's handler to Firefly's handler, which wraps your `index.handler` (`handler` export from `index.js` or `index.mjs`) to supplement the auto-instrumentation provided AWS's OpenTelemetry Lambda Layer.

## To invoke another Lambda directly while propagating context

- Add `require('/opt/nodejs/lambda-invoke.js')` in your handler and use the `invokeLambda` export.
- `invokeLambda` takes three arguments: `region` (string corresponding to AWS region for Lambda), `params` (object following AWS SDK's required `params` format), `callback` (function). It is a wrapper for [AWS SDK's `invoke` method for Lambdas](https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/Lambda.html#invoke-property).
- For example:

```javascript
const { invokeLambda } = require("/opt/nodejs/lambda-invoke.js");

exports.handler = async (event) => {
  invokeLambda("us-east-2", params, (err, data) => {
    // do something when invocation completes here
  });
};
```

## Limitations

- Context propagation for Lambda A invoking Lambda B results in a span from Lambda B that is a sibling to the Lambda invocation span from Lambda A, not a child span (as one would expect)
- Any other service wishing to invoke the Lambda via AWS SDK should also use the wrapper function found in `lambda-invoke.js`
