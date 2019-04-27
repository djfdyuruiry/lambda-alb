/**
 * AWS Lambda HTTP request event.
 */
export class AlbRequest {
    /**
     * HTTP method ('GET', 'POST', 'PUT' etc.)
     */
    public httpMethod: string

    /**
     * Request URL path. Excludes protocol, host and port.
     */
    public path: string

    /**
     * HTTP request headers as a map.
     */
    public headers: object

    /**
     * HTTP request query string parameters as a map.
     */
    public queryStringParameters: object

    /**
     * HTTP request event body, potentially Base64 encoded.
     */
    public body: string

    /**
     * Is the `body` property Base64 encoded?
     */
    public isBase64Encoded: boolean

    public constructor() {
        this.headers = {}
        this.queryStringParameters = {}
    }
}
