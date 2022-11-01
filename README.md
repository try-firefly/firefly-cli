## Prerequisites

1. AWS account
2. (AWS CLI)[https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html]
3. [AWS Access Key/Secret](https://docs.aws.amazon.com/powershell/latest/userguide/pstools-appendix-sign-up.html)
4. [terraform](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli)
5. HTTPS address in which you can send telemetry data to

## Instrumentation

1. git clone this repo
2. `cd` into the `bin` directory and run `node cli.js`

* This cli will instrument your functions to send trace data
* During setup you will be asked to enter an HTTPS address
* You will then be asked to select the functions you wish to instrument
* The HTTPS address you entered will be used as the traces endpoint for the selected functions
* If you wish, you can set different endpoints for functions in different regions. Simply run the cli again using a different endpoint for those functions

3. `cd` into the terraform directory in order to setup the metric-stream and firehose
4. Run the following commands replacing `<access-key>` and `<secret-key>` with your keys:

```
$ export AWS_ACCESS_KEY_ID=<access-key>
$ export AWS_SECRET_ACCESS_KEY=<secret-key>

$ terraform init
$ terraform apply
```

Terraform is configured to setup a metric-stream and firehose one region at a time. Each configuration uses one endpoint. See setup options below based on your trace configuration:

* You have used one endpoint for all functions and they all reside in the same region:<br>
**Run `terraform apply` once using the same HTTPS address you used for your trace data**

* You have used one endpoint for all functions, but the functions reside in different regions:<br>
**Run `terraform apply` for each different region. Use the same HTTPS address each time**

* You have used different endpoints for functions residing in different regions:<br>
**Run `terraform apply` for each region using the relevant HTTPS address for that region**
