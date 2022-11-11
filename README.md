## Prerequisites

1. AWS account
2. A Lambda function to monitor
3. AWS credentials in a [shared file](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html)
4. [Node.js](https://nodejs.org/en/download/)
5. [Terraform](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli)
6. [Server](https://github.com/try-firefly/firefly-pipeline) accessible via an HTTPS address

Your AWS accout needs to have IAM permissions to create the following resources:

* aws_cloudwatch_metric_stream
* aws_iam_role
* aws_iam_role_policy
* aws_kinesis_firehose_delivery_stream
* aws_s3_bucket
* aws_s3_bucket_public_access_block

## Install

Install the firefly cli using `npm`. Run `npm install -g try-firefly`


## Getting started

1. Run `firefly` to see command usage:

<p align="center">
  <img src="docs/assets/usage.gif">
</p>

The `cli` instruments functions based on region. If you have functions residing in different regions, simply run the CLI again to setup the necessary infrastructure in that region.
