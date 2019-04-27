import { AsyncTest, AsyncSetup, AsyncTeardown, Expect, TestCase, TestFixture, Timeout } from "alsatian"
import { createWriteStream, createReadStream, statSync as statFileSync, writeFileSync } from "fs"
import { sync as calculateFileMd5Sync } from "md5-file"
import { join as joinPath } from "path"
import { openSync as openTempFileSync } from "temp"
import { RestClient } from "typed-rest-client"
import { HttpClient } from "typed-rest-client/HttpClient"

import { AlbApp, AlbConfig } from "../../dist/lambda-alb"
import { IHttpClientResponse } from "typed-rest-client/Interfaces";

@TestFixture()
export class AlbAppAcceptanceTests {
    private static readonly BASE_URL = "http://localhost:8080"
    private static readonly TEST_CFG_PATH = joinPath(__dirname, "../test-config.json")
    private static readonly TEST_FILE_PATH = joinPath(__dirname, "../test.pdf")
    private static readonly TEST_FILE_SIZE = 19605
    private static readonly TEST_FILE_MD5 = "bb0cf6ccd0fe8e18e0a14e8028709abe"

    private appArgs: string[]
    private app: AlbApp
    private appConfig: AlbConfig
    private restClient: RestClient
    private httpClient: HttpClient

    @AsyncSetup
    public async setup() {
        this.restClient = new RestClient(
            "alsatian tests",
            AlbAppAcceptanceTests.BASE_URL,
            null,
            { allowRedirects: false }
        )
        this.httpClient = this.restClient.client
        this.appArgs = []

        await this.buildApp()
    }

    @AsyncTeardown
    public async teardown() {
        try {
            await this.app.stopServer()
        } catch(ex) {
            // do nothing...
        }

        this.app = undefined
    }

    @AsyncTest()
    @Timeout(60000)
    public async when_valid_target_request_received_then_200_OK_response_is_returned_from_lambda() {
        let response = await this.httpClient.get(`${AlbAppAcceptanceTests.BASE_URL}/test/api/v1/hello-world`)

        Expect(response.message.statusCode).toEqual(200)
    }

    @AsyncTest()
    @Timeout(60000)
    public async when_valid_target_request_received_then_request_parameters_are_passed_to_lambda() {
        let name = "sandy"
        let region = "central europe"

        let response = await this.httpClient.get(
            `${AlbAppAcceptanceTests.BASE_URL}/test/api/v1/hello-world/echo-params?name=${name}`,
            { region }
        )

        Expect(response.message.statusCode).toEqual(200)
        Expect(
            JSON.parse(await response.readBody())
        ).toEqual({
            name,
            region
        })
    }

    @AsyncTest()
    @Timeout(60000)
    public async when_valid_target_post_request_received_then_body_is_passed_to_lambda() {
        let body = "I am the body of the POST request, so I am"
        let response = await this.httpClient.post(
            `${AlbAppAcceptanceTests.BASE_URL}/test/api/v1/hello-world/echo-body`,
            body
        )

        Expect(response.message.statusCode).toEqual(200)
        Expect(await response.readBody()).toEqual(body)
    }

    @AsyncTest()
    @Timeout(60000)
    public async when_valid_target_post_request_with_binary_content_received_then_body_is_passed_to_lambda() {
        let response: IHttpClientResponse
        let testFileStream = createReadStream(AlbAppAcceptanceTests.TEST_FILE_PATH)

        try {
            response = await this.httpClient.sendStream(
                "POST",
                `${AlbAppAcceptanceTests.BASE_URL}/test/api/v1/hello-world/echo-binary-body`,
                testFileStream,
                {
                    "content-type": "application/pdf"
                }
            )
        } finally {
            testFileStream.close()
        }

        let outputFile = openTempFileSync()
        let outputStream = createWriteStream(null, { fd: outputFile.fd })

        try {
            response.message.pipe(outputStream)
            await new Promise(r => response.message.on("end", r))
        } finally {
            outputStream.close()
        }

        Expect(response.message.statusCode).toEqual(200)

        Expect(
            statFileSync(outputFile.path).size
        ).toBe(
            AlbAppAcceptanceTests.TEST_FILE_SIZE
        )

        Expect(
            calculateFileMd5Sync(outputFile.path)
        ).toBe(
            AlbAppAcceptanceTests.TEST_FILE_MD5
        )
    }

    @AsyncTest()
    @Timeout(60000)
    public async when_valid_target_request_received_and_path_is_not_found_by_lambda_then_404_not_response_is_returned_from_lambda() {
        let response = await this.httpClient.get(`${AlbAppAcceptanceTests.BASE_URL}/test/api/v1/hello-wat`)

        Expect(response.message.statusCode).toEqual(404)
    }

    @AsyncTest()
    @Timeout(60000)
    public async when_invalid_target_request_received_then_500_server_error_response_is_returned() {
        let response = await this.httpClient.get(`${AlbAppAcceptanceTests.BASE_URL}/shop/api/v1/hello-world`)

        Expect(response.message.statusCode).toEqual(500)
    }

    @AsyncTest()
    @Timeout(60000)
    public async when_valid_target_request_received_and_lambda_does_not_exit_then_500_server_error_response_is_returned_from_lambda() {
        let response = await this.httpClient.get(`${AlbAppAcceptanceTests.BASE_URL}/broken/api/v1/hello-wat`)

        Expect(response.message.statusCode).toEqual(500)
    }

    @AsyncTest()
    public async when_app_args_do_not_contain_config_path_and_runServer_called_then_error_is_thrown() {
        await Expect(async () => {
            this.appArgs = []
            await this.buildApp(false)
        }).toThrowAsync()
    }

    @AsyncTest()
    public async when_app_argt_contain_config_path_that_does_not_exist_and_runServer_called_then_error_is_thrown() {
        await Expect(async () => {
            this.appArgs = ["-c", "/i/dont/exist.json"]
            await this.buildApp(false)
        }).toThrowAsync()
    }

    @TestCase("--port")
    @TestCase("-p")
    @AsyncTest()
    public async when_port_set_in_app_args_then_app_listens_on_given_port(portFlag: string) {
        this.appArgs = [portFlag, "3669"]

        await this.buildApp()

        let response = await this.httpClient.get("http://localhost:3669/")

        Expect(response.message.statusCode).toBe(204)
    }

    @TestCase("--host")
    @TestCase("-h")
    @AsyncTest()
    public async when_host_set_in_app_args_then_app_listens_on_given_host(hostFlag: string) {
        this.appArgs = [hostFlag, "127.0.0.1"]

        await this.buildApp()

        let response = await this.httpClient.get("http://127.0.0.1:8080/")

        Expect(response.message.statusCode).toBe(204)
    }

    private async buildApp(includeConfig: boolean = true) {
        if (this.app) {
            await this.teardown()
        }

        this.app = new AlbApp()

        if (includeConfig) {
            this.appArgs.push("--config", AlbAppAcceptanceTests.TEST_CFG_PATH)
        }

        this.appArgs.push("--debug")

        await this.app.runServer(this.appArgs)
    }
}
