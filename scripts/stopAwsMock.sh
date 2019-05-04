#!/usr/bin/env bash

stopLocalstack() {
    pushd tests/mock-aws

    # clear down lambda containers still hanging around
    printf "Removing lambda containers: "

    containers=$(docker ps -a -q --filter ancestor="lambci/lambda:nodejs8.10" --format="{{.ID}}")

    if [ -n "${containers}" ]; then
        docker kill ${containers}
    fi

    docker-compose down

    popd
}

stopLocalstack
