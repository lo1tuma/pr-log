export PATH := './node_modules/.bin:' + env_var('PATH')

default:
    @just --list

compile:
    tsc --build

eslint *OPTIONS:
    eslint . --max-warnings 0 {{OPTIONS}}

eslint-fix: (eslint '--fix')

lint: eslint

lint-fix: eslint-fix

alias prepare-packtory-source := compile

prepare-release: compile
    packtory release-pr maintain --no-dry-run

validate-release-pr:
    packtory release-pr validate

authorize-release-publish *OPTIONS:
    packtory release-pr authorize-publish {{OPTIONS}}

publish-release: compile
    packtory release --publish --tag --push --github-release --no-dry-run

publish: compile
    packtory publish --no-dry-run

publish-dry-run: compile
    packtory publish

test-unit:
    mocha --config mocha.config.json

test-unit-with-coverage:
    c8 just test-unit

test-integration:
    mocha --config integration-tests/github-api/mocha.config.json

test:
    just test-unit-with-coverage
    just test-integration

check-packages: compile
    packtory tree @pr-log/core
