#!/usr/bin/env bash
resultsDir=".test_results"

tapFile="${resultsDir}/results.tap"
junitFile="${resultsDir}/results.xml"
reportFile="${resultsDir}/results.html"
codeCoverageReportFile="${resultsDir}/coverage/index.html"

exitCode=0

export AWS_DEFAULT_REGION=ew-west-1

getRealPath() {
    if [ -x "$(command -v realpath)" ]; then
        realpath "$1"
    else
        readlink -f "$1"
    fi
}

printReportSummary() {
    echo
    echo "TAP File: $(getRealPath ${tapFile})"

    if [ -f "${reportFile}" ]; then
        echo "HTML Test Report: $(getRealPath ${reportFile})"
    fi

    echo "Code Coverage Report: $(getRealPath ${codeCoverageReportFile})"
    echo
}

generateTestReport() {
    pipenv run junit2html "${junitFile}" "${reportFile}"
}

determineExitCode() {
    exitCodes="$1"
    nonZeroExitCodes=${exitCodes//0/}

    if ! [ -z "${nonZeroExitCodes}" ]; then
        exitCode=1
    fi
}

runTestsWithCoverage() {
    export AWS_ACCESS_KEY_ID="key"
    export AWS_SECRET_ACCESS_KEY="access-key"

    nyc alsatian --tap "./tests/js/**/*Tests.js" 2>&1 | \
        tee "${tapFile}" |
        tap-fail-exit-one |
        tap-spec

    determineExitCode "$(printf "%s" "${PIPESTATUS[@]}")"
}

runTests() {
    mkdir -p "${resultsDir}"

    runTestsWithCoverage

    cat "${tapFile}" | junit-bark > "${junitFile}"
}

cleanupOldResults() {
    rm -rf ".nyc_output"
    rm -rf "coverage"

    rm -rf "${resultsDir}"
}

main() {
    cat "tests/banner.txt"

    cleanupOldResults

    ./scripts/startAwsMock.sh

    runTests

    ./scripts/stopAwsMock.sh

    generateTestReport

    printReportSummary

    exit ${exitCode}
}

main
