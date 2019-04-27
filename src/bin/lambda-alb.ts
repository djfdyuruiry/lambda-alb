#!/usr/bin/env node
import { AlbApp } from "../AlbApp"

async function main() {
    let app = new AlbApp()

    process.on("SIGINT", app.stopServer)
    console.log("Press ctrl-c at any time to exit...");

    await app.runServer(process.argv)
}

(async () => {
    await main()
})()
