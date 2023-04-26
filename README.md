[![MIT LICENSE](https://img.shields.io/github/license/ncpa0/pr-changelog-gen?style=for-the-badge)](./LICENSE)
[![Build Test](https://img.shields.io/github/actions/workflow/status/ncpa0/pr-changelog-gen/build-test.yml?branch=master&style=for-the-badge)](https://github.com/ncpa0/pr-changelog-gen/actions)
[![NPM](https://img.shields.io/npm/v/pr-changelog-gen?style=for-the-badge)](https://www.npmjs.com/package/pr-changelog-gen)
[![Node Support](https://img.shields.io/node/v/pr-changelog-gen?style=for-the-badge)](./package.json)
[![Dependencies](https://img.shields.io/librariesio/release/npm/pr-changelog-gen?style=for-the-badge)](https://libraries.io/npm/pr-changelog-gen)

---

# pr-changelog-gen

> Changelog generator based on GitHub Pull Requests

## Table of Contents

- [Main Features](#main-features)
- [Install](#install)
- [Setup and configuration](#setup-and-configuration)
  - [GitHub](#github)
  - [Project](#project)
  - [Changelog formatting](#changelog-formatting)
    - [Custom date format](#custom-date-format)
- [Usage](#usage)
  - [Options](#options)
    - [-v --target-version](#-v---target-version)
    - [-n --include-pr-description](#-n---include-pr-description)
    - [-p --pr-title-matcher](#-p---pr-title-matcher)
    - [-d --date-format](#-d---date-format)
    - [-l --valid-labels](#-l---valid-labels)
    - [-o --output-file](#-o---output-file)
    - [-c --only-since](#-c---only-since)
    - [-gl --group-by-labels](#-gl---group-by-labels)
    - [-gm --group-by-matchers](#-gm---group-by-matchers)
    - [-s --sloppy](#-s---sloppy)
    - [-t --trace](#-t---trace)
- [Correct usage makes a clean and complete changelog](#correct-usage-makes-a-clean-and-complete-changelog)
- [Github Authentication](#github-authentication)

## Main features

- Writes in a `CHANGELOG.md` from merged GitHub pull requests since the last tag. This works by
  - first getting a list of all tags
  - than removing all tags that are not compatible to [semver versioning](http://semver.org/)
  - sort the tags
  - getting the git log from the last tag until now
  - If no `CHANGELOG.md` existed, it will create the file else it will write prepending to it
- Friendly CLI
  - Get usage by running `pr-changelog-gen --help`
  - Error messages that help correcting usage mistakes. E.g.
    - Missing first command line argument: `Error: version-number not specified`
    - Local branch is outdated compared to the remote branch: `Error: Local git master branch is 0 commits ahead and 2 commits behind of origin/master`
    - The current working directory is not clean (e.g. contains files that are modified): `Error: Local copy is not clean`

## Install

Simply run this to install `pr-changelog-gen`:

```
npm install pr-changelog-gen
```

## Setup and configuration

You have to follow these steps to use `pr-changelog-gen` without problems.

### GitHub

By default only new Features and Bug Fixes will be included in the changelog. Whether a pull request is a feature or a bug fix is determined by the PR title, it is assumed that the PR titles follow the **Angular commit message convention** and, therefore is the title starts with a `feat:` or `feat(` it is considered a feature, and if it starts with `fix:` or `fix(` it is considered a bug fix.

If you don't want to follow the Angular commit message convention you can configure custom PR title matchers in the `pr-changelog-gen.prTitleMatcher` section of your `package.json`. For example:

```json
{
  "pr-changelog-gen": {
    "prTitleMatcher": [
      {
        "label": "Breaking Changes",
        "regexp": "^(BREAKING CHANGE:|BREAKING CHANGES:)",
        "flags": "iu"
      },
      {
        "label": "Documentation",
        "regexp": "^docs:",
        "flags": "iu"
      }
    ]
  }
}
```

Alternatively you can use PR labels to decide if a PR is to be included in the changelog. And how it is categorized.

The following categories are defined by default:

|  GitHub label | Human friendly name | Description                                    |
| ------------: | :------------------ | ---------------------------------------------- |
|    `breaking` | Breaking            | Backwards-incompatible changes                 |
|         `bug` | Bug                 | Changes that only fix a bug                    |
|     `feature` | Feature             | New features                                   |
| `enhancement` | Enhancement         | Non-breaking improvements of existing features |

However, you can also create a custom mapping by adding a `pr-changelog-gen.validLabels` section to your `package.json`.
`validLabels` must be specified as an array of strings. The same order will be used to format the changelog sections.
For example:

```json
{
  "pr-changelog-gen": {
    "prTitleMatcher": [],
    "validLabels": ["core", "addon"]
  }
}
```

To use `pr-changelog-gen` your GitHub project will have to follow the semantic versioning.

### Project

As `pr-changelog-gen` reads repository information from your project you have to add the `repository` information in your `package.json`

```json
{
  "repository": {
    "type": "git",
    "url": "https://github.com/<your username>/<your repository name>.git"
  }
}
```

### Changelog formatting

#### Custom date format

If you want to use a custom date format you can configure `pr-changelog-gen.dateFormat` in your `package.json`. For example:

```json
{
  "pr-changelog-gen": { "dateFormat": "dd.MM.yyyy" }
}
```

Please refer to the [`dates-fn` documentation](https://date-fns.org/docs/format) for details about the format expressions.

## Usage

To create or update your changelog run

`pr-changelog-gen -v <version-number> [options]` where `version-number` is the name of this release

### Options

#### -v --target-version

##### Required

The semver number of the next tag/release. This is used to determine the PRs that have been merged since the last tag. And put into the changelog as the title of the new section.

#### -n --include-pr-description

##### Default: `true`

When enabled this option includes the PR description in the changelog along the PR title.

#### -p --pr-title-matcher

This option can defined a Regular Expression that will be used to determine which PRs are to be included in the changelog. This argument can only define a single Regular Expression. If you need to define multiple Regular Expressions or add flags or labels to it you should use the `pr-changelog-gen.prTitleMatcher` section of your `package.json` instead.

#### -d --date-format

##### Default: `MMMM d, yyyy`

This option can be used to define a custom date format. Please refer to the [`dates-fn` documentation](https://date-fns.org/docs/format) for details about the format expressions.

#### -l --valid-labels

##### Default: `breaking,bug,feature,enhancement`

A comma separated list of valid PR labels. PRs with labels that match one of the labels in this list will be included in the changelog.

#### -o --output-file

##### Default: `./CHANGELOG.md`

The path to the changelog file to which the output should be written. If the file does not exist it will be created.

#### -c --only-since

##### Default: `false`

When enabled this option will include PRs that have been merged since the given date. The date can be specified as a Unix Timestamp or an ISO 8601 date/datetime string.

#### -gl --group-by-labels

##### Default: `false`

When enabled this option will group PRs in the changelog by their labels. If a PR has multiple labels the label specified first in the `valid-labels` option will be used.

#### -gm --group-by-matchers

##### Default: `true`

When enabled this option will group PRs in the changelog by their title matchers. If a PR has multiple title matchers the matcher specified first in the `pr-changelog-gen.prTitleMatcher` section of your `package.json` will be used. If a matcher has no label, it will be grouped under the `Other` section.

#### -s --sloppy

##### Default: `false`

The `--sloppy` option defaults to false. When set, it allows `pr-changelog-gen` to generate a changelog even when you are not on the `master` branch. This should not be used in production!

#### -t --trace

##### Default: `false`

When enabled this option outputs the stacktrace of an error additionally to the error message to `stderr`.

### Correct usage makes a clean and complete changelog

If you want your changelog to be complete and clean you have to follow these rules:

1. Don't commit directly to master - if you do, your changes will not be covered in the changelog (this might be ok but you should know this implication)
2. Use pull requests for your features that you want to be in your changelog
3. Use the Angular commit convention for naming your Pull Requests, or use the correct categories for your pull request: If you introduce a new feature that will be a breaking change, give it the according label `breaking`

## Github Authentication

If you need to authenticate `pr-changelog-gen`, e.g. to access a private repo, you can set the `GH_TOKEN` environment variable. Generate a token value in your [Github settings](https://github.com/settings/tokens).

`GH_TOKEN=xxxxxxxxx pr-changelog-gen -v <version-number> [options]`
