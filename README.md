## Prerequisites

1. AWS account
2. [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)
3. [AWS Access Key/Secret](https://docs.aws.amazon.com/powershell/latest/userguide/pstools-appendix-sign-up.html)
4. [terraform](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli)
5. HTTPS address in which you can send telemetry data to

## Instrumentation

1. `git clone` this repo with `--recurse-submodules` flag
2. Run `npm install` in the root directory
3. `cd` into the `bin` directory and run `node cli.js`

- This cli will instrument your functions to send trace data
- During setup you will be asked to enter an HTTPS address
- You will then be asked to select the functions you wish to instrument
- The HTTPS address you entered will be used as the traces endpoint for the selected functions
- If you wish, you can set different endpoints for functions in different regions. Simply run the cli again using a different endpoint for those functions

4. `cd` into the terraform directory in order to setup the metric-stream and firehose
5. Run the following commands replacing `<access-key>` and `<secret-key>` with your keys:

```
$ export AWS_ACCESS_KEY_ID=<access-key>
$ export AWS_SECRET_ACCESS_KEY=<secret-key>

$ terraform init
$ terraform apply
```

Terraform is configured to setup a metric-stream and firehose one region at a time. Each configuration uses one endpoint. See setup options below based on your trace configuration:

- You have used one endpoint for all functions and they all reside in the same region:<br>
  **Run `terraform apply` once using the same HTTPS address you used for your trace data**

- You have used one endpoint for all functions, but the functions reside in different regions:<br>
  **Run `terraform apply` for each different region. Use the same HTTPS address each time**

## Dev notes

- This Git repo uses [Git submodules](https://gist.github.com/gitaarik/8735255) to link to the Firefly Lambda Layer's repo. To update the submodule link (when the Firefly Lambda Layer updates), use the following:

```
git submodule update
```

To pull from remote with submodules' current commits, use:

```
git pull --recurse-submodules
```

[See this for more information about updating submodules](https://stackoverflow.com/questions/5828324/update-git-submodule-to-latest-commit-on-origin/5828396#5828396)

## New readme

- make sure you have credentials loaded
- https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html
