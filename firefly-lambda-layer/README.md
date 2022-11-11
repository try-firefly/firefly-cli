A Node.js Lambda layer to assist in Open Telemetry trace instrumentation and context propagation.
To be used in conjunction with the [AWS managed Open Telemetry Layer for JavaScript](https://aws-otel.github.io/docs/getting-started/lambda/lambda-js).
Uses a custom handler which wraps the user defined handler.

## Functionality

- If incoming `event` has `messageAttributes.traceparent`, uses the `stringValue` of `traceparent` to parse parent context and reassigns it in auto-instrumented span
- If need to invoke lambda, use require `/opt/nodejs/lambda-invoke.js` and use exported `invokeLambda` function. Given `params` should follow AWS SDK's format.

## Instructions

1. In the root directory, run the following command on Linux: `bash build.sh`
   - This will build the layer as a `.zip` file in the root directory.
2. Upload the generated `firefly-layer.zip` file to AWS Lambda Layers
   - This will make the layer available to use across your AWS Lambdas within the region
3. Add uploaded layer to AWS Lambda that you wish to instrument
   - This will add the contents of the `firefly-layer.zip` to the `/opt` folder within your Lambda's container, and allow the files to be accessible at runtime.
4. Add the AWS OpenTelemetry Lambda Layer for Node.js, along with the following environment variables (under Configuration):
   | Key | Value |
   | ----------------------------------- | ------------------------- |
   | AWS_LAMBDA_EXEC_WRAPPER | /opt/otel-handler |
   | OPENTELEMETRY_COLLECTOR_CONFIG_FILE | /var/task/collector.yaml |
   | OTEL_PROPAGATORS | tracecontext |
   | OTEL_TRACES_SAMPLER | always_on |
5. Ensure Active Tracing is **not enabled** under Monitoring and operations tools.
6. Add an appropriate `collector.yaml` file in your Lambda's root directory .
7. Change the Lambda's Hander under Runtime settings to `/opt/nodejs/firefly-handler.handler`
   - This will change the Lambda's handler to Firefly's handler, which wraps your `index.handler` (`handler` export from `index.js`) to supplement the auto-instrumentation provided AWS's OpenTelemetry Lambda Layer.
8. **To invoke another Lambda directly while propagating context**

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
