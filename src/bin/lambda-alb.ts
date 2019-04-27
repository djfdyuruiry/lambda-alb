#!/usr/bin/env node
import commandLineUsage, { OptionList } from "command-line-usage"

import { AlbApp } from "../AlbApp"

const APP_USAGE: OptionList = {
    header: "lamda-api",
    optionList: AlbApp.APP_OPTIONS
}

function validateArgs() {
    let args = process.argv.splice(2)

    if (
        args.length === 0 ||
        args.includes("--help") ||
        args.includes("-h")
    ) {
        console.error(commandLineUsage(APP_USAGE))
        process.exit(1)
    }
}

async function main() {
    let app = new AlbApp()

    validateArgs()

    process.on("SIGINT", app.stopServer)
    console.log("Press ctrl-c at any time to exit...");

    await app.runServer(process.argv)
}

(async () => {
    await main()
})()
