import { existsSync, readFileSync, PathLike } from "fs"

import AWS from "aws-sdk"
import { InvocationRequest } from "aws-sdk/clients/lambda"
import { raw as rawBodyParser } from "body-parser"
import commandLineArgs, { OptionDefinition } from "command-line-args"
import cors from "cors"
import express, { Request, Response, Application } from "express"
import { Server } from "http"

import { AlbConfig } from "./model/AlbConfig"
import { AlbRequest } from "./model/AlbRequest"
import { AlbResponse } from "./model/AlbResponse"
import { AlbTarget } from "./model/AlbTarget"
import { Options } from "./model/Options";

/**
 * Simple console application that hosts an express HTTP
 * server that simulates an AWS ALB.
 *
 * A request is mapped from the HTTP request to the appropriate lambda
 * target, the response response from invoking the lambda is mapped to
 * a standard HTTP response and returned to the express client.
 */
export class AlbApp {
    private static readonly MAX_REQUEST_BODY_SIZE = "1024kb"
    private static readonly HTTP_METHODS_WITH_ENTITY = ["POST", "PUT", "PATCH"]
    private static readonly APP_OPTIONS: OptionDefinition[] = [
        { name: "port", alias: "p", type: Number, defaultValue: 8080 },
        { name: "host", alias: "h", type: String, defaultValue: "*" },
        { name: "corsOrigin", alias: "o", type: String, defaultValue: "*" },
        { name: "debug", alias: "d", type: Boolean, defaultValue: false },
        { name: "config", alias: "c", type: String }
    ]

    protected readonly expressApp: Application

    private server?: Server
    private debugEnabled: boolean
    private config: AlbConfig
    private lambdaClient: AWS.Lambda

    public constructor() {
        this.expressApp = express()
        this.debugEnabled = false
    }

    /**
     * Starts the express server.
     *
     * @param args Command line arguments for this server, see --help for more info.
     */
    public async runServer(args: string[]) {
        let options = this.parseArguments(args)

        this.debugEnabled = options.debug

        let listenOnAllHosts = options.host === "*"
        let baseUrl = `http://${options.host}:${options.port}`

        this.config = this.readConfig(options.config)

        this.configureAws()
        this.configureServer(options)
        this.setupAlbTargetListeners()

        // health check endpoint for testing
        this.expressApp.get("/", (_, res) => res.status(204).send())
        this.expressApp.get("*", (req, res) => {
            let errMessage = `Request does not match any configured ALB target group: ${req.path}`

            if (this.debugEnabled) {
                this.log(errMessage)
            }

            res.status(500).send("Request does not match any configured ALB target group")
        })

        await this.startServer(options.host, options.port, listenOnAllHosts)

        this.log(`Listening for HTTP requests on ${baseUrl} ...`)
    }

    private log(message: string, ...args: any[]) {
        console.log(`${new Date().toISOString()} lambda-alb - ${message}`, ...args)
    }

    private parseArguments(args: string[]): Options {
        if (args && (args.includes("--debug") || args.includes("-d"))) {
            this.log("Command line arguments: %s", args)
        }

        let options = commandLineArgs(AlbApp.APP_OPTIONS, {
            argv: args
        }) as Options

        if (!options.config || options.config.trim() === "") {
            throw new Error("--config or -c option must be specified")
        }

        if (!existsSync(options.config)) {
            throw new Error(`Config file '${options.config}' not found`)
        }

        return options
    }

    private readConfig(configPath: PathLike): AlbConfig {
        return JSON.parse(readFileSync(configPath, {
            encoding: "UTF8"
        }))
    }

    private configureServer(options: Options) {
        this.log("CORS origin set to: %s", options.corsOrigin)

        this.expressApp.use(cors({
            origin: options.corsOrigin
        }))

        // setup body parser to Base64 encode request's
        this.expressApp.use(rawBodyParser({
            limit: AlbApp.MAX_REQUEST_BODY_SIZE,
            type: r => true
        }))

        this.log(
            "WARNING: To simulate an AWS ALB or Application Gateway the max size for requests is limited to %s",
            AlbApp.MAX_REQUEST_BODY_SIZE
        )
    }

    private configureAws() {
        AWS.config.update({
            region: this.config.region
        })

        this.lambdaClient = new AWS.Lambda({
            endpoint: this.config.lambdaEndpoint
        })
    }

    private setupAlbTargetListeners() {
        let self = this

        for (let targetKey in this.config.targets) {
            if (!this.config.targets.hasOwnProperty(targetKey)) {
                continue
            }

            let target: AlbTarget = this.config.targets[targetKey]
            let basePath = target.routeUrl ? target.routeUrl : `/${targetKey}`

            this.log("ALB target configured for lambda '%s' @ path: %s", target.lambdaName, basePath)

            this.expressApp.all(
                `${basePath}*`,
                (req, res) => self.handleHttpRequest(self, target, basePath, req, res)
            )
        }
    }

    private async handleHttpRequest(
        self: AlbApp,
        target: AlbTarget,
        basePath: string,
        request: Request,
        response: Response
    ) {
        try {
            let apiRequestEvent = await self.mapRequestToApiEvent(request, basePath)
            let apiResponse = await self.run(target, apiRequestEvent, {})

            self.forwardApiResponse(apiResponse, response)
        } catch (ex) {
            if (this.debugEnabled) {
                this.log("Target lambda '%s' invocation error", target.lambdaName)
                console.dir(ex)
            }

            response.status(500)
                .header("content-type", "text/plain")
                .send(
                    `Target lambda '${target.lambdaName}' invocation error:\n${JSON.stringify(ex)}`
                )
        }
    }

    private async mapRequestToApiEvent(request: Request, basePath: string): Promise<AlbRequest> {
        if (this.debugEnabled) {
            this.log("Mapping express request to AWS model")
        }

        let apiRequest = new AlbRequest()

        apiRequest.httpMethod = request.method
        apiRequest.path = request.path.substr(basePath.length)

        if (apiRequest.path.trim() === "") {
            apiRequest.path = "/"
        }

        Object.keys(request.headers)
            .forEach(h => apiRequest.headers[h] = request.headers[h])
        Object.keys(request.query)
            .forEach(q => apiRequest.queryStringParameters[q] = request.query[q])

        if (!AlbApp.HTTP_METHODS_WITH_ENTITY.includes(request.method)) {
            return apiRequest
        }

        let body = request.body as Buffer

        apiRequest.body = body.toString("base64")
        apiRequest.isBase64Encoded = true

        return apiRequest
    }

    private async run(target: AlbTarget, request: AlbRequest, context: any): Promise<AlbResponse> {
        let contextBuffer = Buffer.from(JSON.stringify(context))
        let lambaRequest: InvocationRequest = {
            ClientContext: contextBuffer.toString("base64"),
            FunctionName : target.lambdaName,
            InvocationType : "RequestResponse",
            LogType : "None",
            Payload: JSON.stringify(request),
            Qualifier: target.versionOrAlias
        }

        if (this.debugEnabled) {
            this.log("Sending request to AWS Lambda:")

            let loggableRequest = JSON.parse(JSON.stringify(request)) as AlbRequest

            if (loggableRequest.isBase64Encoded) {
                loggableRequest.body = `${loggableRequest.body.substr(0, 32)}...`
            }

            console.dir(loggableRequest)
        }

        return await (new Promise((resolve, reject) => {
            this.lambdaClient.invoke(lambaRequest, (error, data) => {
                if (error) {
                    reject(error)
                    return
                }

                resolve(
                    JSON.parse(data.Payload as string)
                )
            })
        }))
    }

    private forwardApiResponse(apiResponse: AlbResponse, response: Response) {
        if (this.debugEnabled) {
            this.log("Mapping AWS response model to express response")

            let loggableResponse = JSON.parse(JSON.stringify(apiResponse)) as AlbResponse

            if (loggableResponse.isBase64Encoded) {
                loggableResponse.body = `${loggableResponse.body.substr(0, 32)}...`
            }

            console.dir(loggableResponse)
        }

        let headers = apiResponse.headers

        response.status(apiResponse.statusCode)

        Object.keys(headers).forEach(h => response.header(h, headers[h]))

        if (apiResponse.isBase64Encoded) {
            response.contentType(
                apiResponse.headers["content-type"] || "application/octet-stream"
            )

            response.end(
                Buffer.from(apiResponse.body, "base64")
            )
        } else {
            response.send(apiResponse.body)
        }
    }

    private async startServer(host: string, port: number, listenOnAllHosts: boolean) {
        await new Promise<Server> ((resolve, reject) => {
            try {
                if (listenOnAllHosts) {
                    this.log("Listening on all hosts")

                    this.server = this.expressApp.listen(port, resolve)
                } else {
                    this.log("Listening on host: %s", host)

                    this.server = this.expressApp.listen(
                        port,
                        host,
                        resolve
                    )
                }
            } catch (ex) {
                reject(ex)
            }
        })
    }

    public async stopServer() {
        if (!this.server) {
            throw new Error("stopServer can only be called after runServer has been called and has completed")
        }

        this.log("Server shutting down")

        await new Promise<void>((resolve, reject) => {
            try {
                this.server.close(() => resolve())
            } catch (ex) {
                reject(ex)
            }
        })
    }
}
