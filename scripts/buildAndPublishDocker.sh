#!/usr/bin/env bash
set -e

imageName="djfdyuruiry/lambda-alb"

function publishImage() {
    version="$1"

    echo "Publishing ${imageName} ${version} to Docker Hub..."

    docker push "${imageName}:latest"
    docker push "${imageName}:${version}"
}

function buildAndTagImage() {
    version="$1"

    echo "Building ${imageName} ${version} docker image..."

    docker build --tag "${imageName}" --tag "${imageName}:${version}" .
}

function buildAndPublish() {
    version="v$(node -e "console.log(require('./package.json').version)")"

    buildAndTagImage "${version}"
    publishImage "${version}"
}

buildAndPublish
