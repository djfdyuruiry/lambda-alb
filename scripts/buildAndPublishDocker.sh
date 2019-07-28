#!/usr/bin/env bash
set -e

imageName="djfdyuruiry/lambda-alb"

function publishImage() {
    version="$1"

    echo "Publishing ${imageName} v${version} to Docker Hub..."

    docker push "${imageName}:latest"
    docker push "${imageName}:v${version}"
}

function buildAndTagImage() {
    version="$1"

    echo "Building ${imageName} v${version} docker image..."

    docker build --build-arg "PACKAGE_VERSION=@${version}" --tag "${imageName}" --tag "${imageName}:${version}" .
}

function buildAndPublish() {
    version=$(node -e "console.log(require('./package.json').version)")

    buildAndTagImage "${version}"
    publishImage "${version}"
}

buildAndPublish
