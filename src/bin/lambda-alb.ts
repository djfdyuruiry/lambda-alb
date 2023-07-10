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

    validateArgs(args)

    await app.runServer(args)

    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    process.on("SIGINT", async () => await app.stopServer())
    console.log("Press CTRL-C at any time to exit...")
}

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
(async () => await main())()
