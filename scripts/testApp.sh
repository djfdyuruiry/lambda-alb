#!/usr/bin/env bash
function main() {
    ./scripts/startAwsMock.sh

    ./dist/bin/lambda-alb.js -c ./tests/test-config.json

    ./scripts/stopAwsMock.sh
}

main
