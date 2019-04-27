#!/usr/bin/env node
import commandLineUsage, { OptionList } from "command-line-usage"

import { AlbApp } from "../AlbApp"

const APP_USAGE: OptionList = {
    header: "lamda-api",
    optionList: AlbApp.APP_OPTIONS
}

function validateArgs(args: string[]) {
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
    let args = process.argv.splice(2)

    console.dir(args)

    validateArgs(args)

    process.on("SIGINT", async () => await app.stopServer())
    console.log("Press CTRL-C at any time to exit...")

    await app.runServer(args)
}

(async () => {
    await main()
})()
