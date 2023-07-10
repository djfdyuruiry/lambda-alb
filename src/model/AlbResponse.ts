/**
 * Response to a AWS Lambda HTTP request event.
 */
export class AlbResponse {
    /**
     * HTTP response headers as a map.
     */
    public headers?: { [key: string]: string | string[] }

    /**
     * HTTP response code (201, 400, 500 etc.)
     */
    public statusCode?: number

    /**
     * HTTP response body, potentially Base64 encoded.
     */
    public body?: string

    /**
     * Is the `body` property Base64 encoded?
     */
    public isBase64Encoded?: boolean
}
