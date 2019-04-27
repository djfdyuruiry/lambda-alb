#!/usr/bin/env bash
resultsDir=".test_results"

tapFile="${resultsDir}/results.tap"
junitFile="${resultsDir}/results.xml"
reportFile="${resultsDir}/results.html"
codeCoverageReportFile="coverage/index.html"

exitCode=0

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
    # let the framework know it is under test, see: src/util/Environment.ts
    export TLA_UNDER_TEST=1

    nyc --reporter=lcov --reporter=html alsatian --tap "./tests/js/**/*Tests.js" 2>&1 | \
        tee "${tapFile}" |
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

    pipenv install

    ./scripts/startAwsMock.sh

    runTests

    ./scripts/stopAwsMock.sh

    generateTestReport

    printReportSummary

    exit ${exitCode}
}

main
