# lambda-alb

A mock ALB using express that enables invoking a lambda locally using HTTP.

It supports multple lambda's mapped to various routes. Can be configured to use either a mock AWS setup, such as [localstack](https://localstack.cloud/), or an actual AWS region.

GitHub Repo: https://github.com/djfdyuruiry/lambda-alb

[![NPM](https://nodei.co/npm/lambda-alb.png)](https://nodei.co/npm/lambda-alb/)

Read the full `typedoc` documentation: https://djfdyuruiry.github.io/lambda-alb/

---

## Getting Started

---

- Install this package using npm

```shell
npm install -g lambda-alb
```

- Deploy some code to an AWS Lambda Function that processes ALB or API Gateway request events (see [here](https://docs.aws.amazon.com/elasticloadbalancing/latest/application/lambda-functions.html))

- Create a new JSON file `config.json`, add the following:

```json
{
    "region": "eu-west-1",
    "targets": {
        "some-lambda":{
            "lambdaName": "some-lambda-function"
        },
        "another-lambda":{
            "lambdaName": "another-lambda-function"
        }
    }
}
```

*Ensure the region of your function is correct when copying the above*

- Ensure that your AWS credentials are set up correctly, see [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html) if you need help doing this

- Start the ALB mock using your new config file:

```shell
lambda-alb --config config.json
```

- Start making requests using the target routes:

```
curl http://localhost:8080/some-lambda/
curl http://localhost:8080/another-lambda/
```

----

# Local AWS Mocks

----

If you are using a local AWS Mock to run your lambda's, specify it's endpoint in the JSON configuration file:

```json
{
    "lambdaEndpoint": "http://localhost:4574",
    "targets": {
        "some-lambda":{
            "lambdaName": "some-lambda-function"
        }
    }
}
```

If you get errors similar to `Missing credentials in config`, run the below to set mock credential env vars before starting `lambda-alb`:

```bash
export AWS_ACCESS_KEY_ID=MOCK
export AWS_SECRET_ACCESS_KEY=MOCK
```

----

# Docker

----

A `Dockerfile` is provided in this repository that will create an image containing the latest version of this package on the global path.

To use the image:

- Place a `config.json` file in the current directory containing your setup

- Run the below commands:

    ```bash
    docker build --tag lambda-alb .
    dokcer run --rm -v $(pwd):/etc/lambda-alb -p 8080:8080 lambda-alb
    ```

    *Don't forget to pass your AWS credentials in as environment variables, or mount a volume to supply a credentials file. See [here](https://docs.aws.amazon.com/sdk-for-javascript/v2/developer-guide/setting-credentials-node.html) for more info.*

- You can now access your `lambda-alb` on http://localhost:8080

### docker-compose

If you are using `docker-compose` it's very simple to add `lambda-alb` to your stack:

```yaml
version: "3"

services:
  alb:
    build: github.com/djfdyuruiry/lambda-alb.git
    ports:
      - 8080:8080
    volumes:
      - ${PWD}/config.json:/etc/lambda-alb/config.json
```

----

# Command Line Arguments

----

`lambda-alb` supports several command line parameters:

- `-c` or `--config`:        Path to JSON configuration file
- `-p` or `--port`:          (Optional) Port to listen on, defaults to `8080`
- `-h` or `--host`:          (Optional) Host to accept requests on, defaults to `*` (any hostname/ip)
- `-o` or `--cors-origin`:   (Optional) CORS origins to allow, defaults to `*` (any origin)
- `-d` or `--debug`:         (Optional) Enable debug logging

----

# Configuration

----

Below is an overview of the JSON configuration file schema:

| Key            | Description                                               | Example                                                        | Required? |
|----------------|-----------------------------------------------------------|----------------------------------------------------------------|-----------|
| region         | AWS region that your Lambda targets have been deployed to | `eu-west-1`                                                    | ✘         |
| lambdaEndpoint | Custom service endpoint for AWS Lambda                    | `http://localhost:4574`                                        | ✘         |
| targets        | Map of target route to AWS Lambda definition              | ` { "some-lambda": { "lambdaName": "some-lambda-function "} }` | ✔         |

AWS Lambda Definition (`targets`) schema:

| Key            | Description                                  | Example         | Required? |
|----------------|----------------------------------------------|-----------------|-----------|
| lambdaName     | Name of the target Lambda function           | `a-lambda-name` |     ✔     |
| versionOrAlias | A version or alias of the function to invoke | `DEV`           |     ✘     |
| routeUrl       | Override the target route for this Lambda    | `/special-route`|     ✘     |
