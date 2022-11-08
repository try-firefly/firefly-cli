## Prerequisites

1. AWS account
2. AWS credentials in a [shared file](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html)
3. [terraform](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli)
4. Server with an HTTPS address in which telemetry data can be sent to

## Instrumentation

1. `git clone` this repo
2. Run `npm install` in the root directory
3. `cd` into the `bin` directory and run `node cli.js`

The `cli` instruments functions based on region. If you have functions residing in different regions, simply run the CLI again to setup the necessary infrastructure in that region.
