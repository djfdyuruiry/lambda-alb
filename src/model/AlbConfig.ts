import { AlbTarget } from "./AlbTarget"

export class AlbConfig {
    public region: string
    public lambdaEndpoint?: string
    public targets: { [name: string]: AlbTarget }
}
