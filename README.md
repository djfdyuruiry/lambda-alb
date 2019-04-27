# lambda-alb

A mock ALB using express that enables invoking a lambda locally using HTTP.

It supports multple lambda's mapped to various routes. Can be configured to use either a mock AWS setup, such as [localstack](https://localstack.cloud/), or an actual AWS region.

[NPM Package](https://www.npmjs.com/package/lambda-alb)
[GitHub Repo](https://github.com/djfdyuruiry/lambda-alb/)

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
    "region": "eu-west-1",
    "targets": {
        "some-lambda":{
            "lambdaName": "some-lambda-function"
        }
    }
}
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
