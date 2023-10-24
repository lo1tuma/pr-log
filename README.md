[![NPM Version](https://img.shields.io/npm/v/pr-log.svg?style=flat)](https://www.npmjs.org/package/pr-log)
[![GitHub Actions status](https://github.com/lo1tuma/pr-log/workflows/CI/badge.svg)](https://github.com/lo1tuma/pr-log/actions)
[![Coverage Status](https://img.shields.io/coveralls/lo1tuma/pr-log/main.svg?style=flat)](https://coveralls.io/r/lo1tuma/pr-log)

---

# pr-log

> Changelog generator based on GitHub Pull Requests

The main features:

-   Writes in a `CHANGELOG.md` from merged GitHub pull requests since the last tag. This works by
    -   first getting a list of all tags
    -   than removing all tags that are not compatible to [semver versioning](http://semver.org/)
    -   sort the tags
    -   getting the git log from the last tag until now
    -   If no `CHANGELOG.md` existed, it will create the file else it will write prepending to it
-   Friendly CLI
    -   Get usage by running `pr-log --help`
    -   Error messages that help correcting usage mistakes. E.g.
        -   Missing first command line argument: `Error: version-number not specified`
        -   Local branch is outdated compared to the remote branch: `Error: Local git main branch is 0 commits ahead and 2 commits behind of origin/main`
        -   The current working directory is not clean (e.g. contains files that are modified): `Error: Local copy is not clean`
-   Well tested

## Install

Simply run this to install `pr-log`:

```
npm install pr-log
```

## Setup and configuration

You have to follow these steps to use `pr-log` without problems.

### GitHub

The following categories are defined by default:

|    GitHub label | Human friendly name | Description                                                         |
| --------------: | :------------------ | ------------------------------------------------------------------- |
|      `breaking` | Breaking Changes    | Backwards-incompatible changes                                      |
|           `bug` | Bug Fixes           | Changes that only fix a bug                                         |
|       `feature` | Features            | New features                                                        |
|   `enhancement` | Enhancements        | Non-breaking improvements of existing features                      |
| `documentation` | Documentation       | Changes to documentation and/or README                              |
|       `upgrade` | Dependency Upgrades | Any kind of dependency updates                                      |
|      `refactor` | Code Refactoring    | Changes that don’t affect the behavior but improve the code quality |
|         `build` | Build-Related       | Changes related to the build process and/or CI/CD pipeline          |

However, you can also create a custom mapping by adding a `pr-log.validLabels` section to your `package.json`.
`validLabels` must be specified as an array of key, value pairs. The same order will be used to format the changelog sections.
For example:

```json
{
    "pr-log": {
        "validLabels": [
            ["core", "Core features"],
            ["addon", "Addons"]
        ]
    }
}
```

To use `pr-log` your GitHub project needs some small configuration:

-   Create the labels mentioned above (you can create GitHub labels from `Issues -> Labels -> New Label`)
-   Set the correct label on your pull requests - you need to set exactly one label, multiple labels or one that is not recognized will throw an error
-   Use correct semver versioning for your tags (e.g. `2.4.7`)

### Project

As `pr-log` reads repository information from your project you have to add the `repository` information in your `package.json`

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

If you want to use a custom date format you can configure `pr-log.dateFormat` in your `package.json`. For example:

```json
{
    "pr-log": { "dateFormat": "dd.MM.yyyy" }
}
```

Please refer to the [`dates-fn` documentation](https://date-fns.org/docs/format) for details about the format expressions.

## Usage

To create or update your changelog run

`pr-log [options] <version-number>` where `version-number` is the name of this release

Example:

Given the following setup:

-   In GitHub a tag named `2.0.0` exists that is behind `main`
-   A pull request (#13) was created since the last tag that has the label `breaking`
-   A pull request (#22) was created since the last tag that has the label `documentation`

`pr-log 2.0.0` creates a changelog with the following example content:

```markdown
## 2.0.0 (January 20, 2015)

### Breaking Changes

-   Use new (backwards incompatible) version of module XYZ (#13)

### Documentation

-   Fix some spelling mistakes in documentation. (#22)
```

### Options

#### --sloppy

The `--sloppy` option defaults to false. When set, it allows `pr-log` to generate a changelog even when you are not on the default branch. This should not be used in production!

#### --trace

When enabled this option outputs the stacktrace of an error additionally to the error message to `stderr`.

### Correct usage makes a clean and complete changelog

If you want your changelog to be complete and clean you have to follow these rules:

1. Don't commit directly to `main` - if you do, your changes will not be covered in the changelog (this might be ok but you should know this implication)
2. Use pull requests for your features that you want to be in your changelog
3. Use the correct categories for your pull request: If you introduce a new feature that will be a breaking change, give it the according label `breaking` (which will later result in this feature being listed under the `Breaking Changes` point in your changelog)

## Github Authentication

If you need to authenticate `pr-log`, e.g. to access a private repo, you can set the `GH_TOKEN` environment variable. Generate a token value in your [Github settings](https://github.com/settings/tokens).

`GH_TOKEN=xxxxxxxxx pr-log [options] <version-number>`

## Reason for this project

Many projects have problems with their changelogs. Most of them try one of the following ways

-   manually write change logs: This is error-prone and the log will not be consistent
-   generating it from commit messages: As there are often far more commits than useful messages for the changelog, this will hide important features because there are too many to read everything

Other challenges for good changelogs:

-   Different categories (e.g. breaking changes)
-   Only include changes starting from a certain tag

### More complete example `CHANGELOG.md`

After working for some time with the tool and having e.g. two releases, the file content could look like this:

```markdown
## 2.0.0 (January 20, 2015)

### Breaking Changes

-   Use new (backwards incompatible) version of module XYZ (#13)

### Features

-   Add fancy feature (#2)
-

### Documentation

-   Fix some spelling mistakes in documentation. (#22)

## 1.1.0 (November 3, 2014)
```
