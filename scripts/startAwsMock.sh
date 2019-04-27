#!/usr/bin/env bash

waitForLocalstackToBeReady() {
    printf "Waiting for localstack to come online => "

    until $(pipenv run awslocal lambda list-functions --cli-read-timeout 2 --cli-connect-timeout 1 > /dev/null 2>&1); do
        printf "."
        sleep 5
    done

    echo " ✓"
    echo "Localstack is now online"
}

startLocalstack() {
    pushd tests/mock-aws

    pipenv run docker-compose up -d
    waitForLocalstackToBeReady

    pipenv run awslocal lambda create-function \
        --function-name "lambda-api" \
        --runtime nodejs8.10 \
        --role "not-a-real-role" \
        --handler app.handler \
        --zip-file "fileb://lambda-api.zip"

    popd
}

main() {
    pipenv install

    startLocalstack
}

main
