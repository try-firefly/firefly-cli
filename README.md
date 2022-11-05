## Prerequisites

1. AWS account
2. AWS credentials in a [shared file](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/loading-node-credentials-shared.html)
3. [terraform](https://developer.hashicorp.com/terraform/tutorials/aws-get-started/install-cli)
4. Server with an HTTPS address in which telemetry data can be sent to

## Instrumentation

1. `git clone` this repo with `--recurse-submodules` flag
2. Run `npm install` in the root directory
3. `cd` into the `bin` directory and run `node cli.js`

The `cli` instruments functions based on region. If you have functions residing in different regions, simply run the CLI again to setup the necessary infrastructure in that region.

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
