## 4.0.0 (December 7, 2019)

### Breaking Changes

-   Drop support for nodejs 6 and 8 ([#208](https://github.com/lo1tuma/pr-log/pull/208))

### Dependency Upgrades

-   ⬆️ Update dependency babel-plugin-istanbul to v5.2.0 ([#193](https://github.com/lo1tuma/pr-log/pull/193))
-   ⬆️ Update dependency ava to v2 ([#201](https://github.com/lo1tuma/pr-log/pull/201))
-   ⬆️ Update dependency sinon to v7.5.0 ([#190](https://github.com/lo1tuma/pr-log/pull/190))
-   ⬆️ Update dependency moment to v2.24.0 ([#191](https://github.com/lo1tuma/pr-log/pull/191))
-   ⬆️ Update dependency coveralls to v3.0.9 ([#194](https://github.com/lo1tuma/pr-log/pull/194))
-   ⬆️ Update dependency @octokit/rest to v16.35.0 ([#187](https://github.com/lo1tuma/pr-log/pull/187))
-   ⬆️ Update dependency eslint to v6 ([#203](https://github.com/lo1tuma/pr-log/pull/203))
-   ⬆️ Update dependency eslint-plugin-ava to v9 ([#206](https://github.com/lo1tuma/pr-log/pull/206))
-   Update to babel 7 ([#209](https://github.com/lo1tuma/pr-log/pull/209))
-   ⬆️ Update dependency semver to v6 ([#197](https://github.com/lo1tuma/pr-log/pull/197))
-   ⬆️ Update dependency nyc to v14.1.1 ([#200](https://github.com/lo1tuma/pr-log/pull/200))
-   ⬆️ Update dependency commander to v4 ([#207](https://github.com/lo1tuma/pr-log/pull/207))
-   ⬆️ Update dependency nyc to v14 ([#199](https://github.com/lo1tuma/pr-log/pull/199))
-   ⬆️ Update dependency eslint-plugin-ava to v6 ([#195](https://github.com/lo1tuma/pr-log/pull/195))

### Code Refactoring

-   Fix deprecation warnings from octokit ([#213](https://github.com/lo1tuma/pr-log/pull/213))
-   Refactor ESLint config/setup ([#211](https://github.com/lo1tuma/pr-log/pull/211))
-   Use builtin promisify instead of separate package ([#212](https://github.com/lo1tuma/pr-log/pull/212))

### Build-Related

-   Add .editorconfig ([#210](https://github.com/lo1tuma/pr-log/pull/210))

## 3.1.0 (January 8, 2019)

### Bug Fixes

-   Fix octokit usage ([#186](https://github.com/lo1tuma/pr-log/pull/186))
-   Fix incorrect git URL in test case ([#161](https://github.com/lo1tuma/pr-log/pull/161))

### Features

-   Support github token-based authentication ([#179](https://github.com/lo1tuma/pr-log/pull/179))

### Documentation

-   Remove greenkeeper badge ([#160](https://github.com/lo1tuma/pr-log/pull/160))

### Dependency Upgrades

-   ⬆️ Update dependency git-url-parse to v11 ([#176](https://github.com/lo1tuma/pr-log/pull/176))
-   ⬆️ Update dependency eslint to v5.12.0 ([#181](https://github.com/lo1tuma/pr-log/pull/181))
-   ⬆️ Update dependency sinon to v7.2.2 ([#177](https://github.com/lo1tuma/pr-log/pull/177))
-   ⬆️ Update dependency ramda to v0.26.1 ([#182](https://github.com/lo1tuma/pr-log/pull/182))
-   ⬆️ Update dependency @octokit/rest to v16 ([#183](https://github.com/lo1tuma/pr-log/pull/183))
-   ⬆️ Update dependency ava to v1 ([#185](https://github.com/lo1tuma/pr-log/pull/185))
-   ⬆️ Update dependency moment to v2.23.0 ([#184](https://github.com/lo1tuma/pr-log/pull/184))
-   ⬆️ Update dependency eslint-plugin-ava to v5 ([#174](https://github.com/lo1tuma/pr-log/pull/174))
-   ⬆️ Update dependency sinon to v7 ([#171](https://github.com/lo1tuma/pr-log/pull/171))
-   ⬆️ Update dependency eslint to v5 ([#173](https://github.com/lo1tuma/pr-log/pull/173))
-   ⬆️ Update dependency git-url-parse to v10 ([#170](https://github.com/lo1tuma/pr-log/pull/170))
-   ⬆️ Update dependency nyc to v13 ([#175](https://github.com/lo1tuma/pr-log/pull/175))
-   ⬆️ Update dependency babel-plugin-istanbul to v5 ([#172](https://github.com/lo1tuma/pr-log/pull/172))
-   ⬆️ Update dependency sinon to v4.5.0 ([#169](https://github.com/lo1tuma/pr-log/pull/169))
-   ⬆️ Update dependency moment to v2.22.2 ([#168](https://github.com/lo1tuma/pr-log/pull/168))
-   ⬆️ Update dependency coveralls to v3.0.2 ([#165](https://github.com/lo1tuma/pr-log/pull/165))
-   ⬆️ Update dependency eslint-config-holidaycheck to v0.13.1 ([#166](https://github.com/lo1tuma/pr-log/pull/166))
-   ⬆️ Update dependency git-url-parse to v8.3.1 ([#167](https://github.com/lo1tuma/pr-log/pull/167))
-   ⬆️ Update dependency commander to v2.19.0 ([#164](https://github.com/lo1tuma/pr-log/pull/164))
-   Update sinon to the latest version 🚀 ([#147](https://github.com/lo1tuma/pr-log/pull/147))
-   Update sinon to the latest version 🚀 ([#146](https://github.com/lo1tuma/pr-log/pull/146))

### Code Refactoring

-   ⬆️ Pin dependencies ([#163](https://github.com/lo1tuma/pr-log/pull/163))
-   Remove bluebird dependency ([#145](https://github.com/lo1tuma/pr-log/pull/145))

### Build-Related

-   Configure Renovate ([#162](https://github.com/lo1tuma/pr-log/pull/162))
-   Update to node 10 in .travis.yml ([#158](https://github.com/lo1tuma/pr-log/pull/158))

## 3.0.0 (March 9, 2018)

### Breaking Changes

-   Make validLabels an array of pairs to define order of changelog sections ([#144](https://github.com/lo1tuma/pr-log/pull/144))
-   Don’t write stacktraces to stderr per default ([#141](https://github.com/lo1tuma/pr-log/pull/141))
-   Make references to pull requests a link ([#142](https://github.com/lo1tuma/pr-log/pull/142))
-   Remove support for nodejs 4 and 7 ([#125](https://github.com/lo1tuma/pr-log/pull/125))

### Enhancements

-   Add support for custom date format configuration ([#143](https://github.com/lo1tuma/pr-log/pull/143))
-   Validate CLI argument to be a valid semver version number ([#133](https://github.com/lo1tuma/pr-log/pull/133))
-   Add refactor label ([#132](https://github.com/lo1tuma/pr-log/pull/132))

### Documentation

-   Small README.md improvements ([#140](https://github.com/lo1tuma/pr-log/pull/140))

### Dependency Upgrades

-   Update commander to the latest version 🚀 ([#137](https://github.com/lo1tuma/pr-log/pull/137))
-   Update @octokit/rest to the latest version 🚀 ([#135](https://github.com/lo1tuma/pr-log/pull/135))
-   Update mocha to the latest version 🚀 ([#128](https://github.com/lo1tuma/pr-log/pull/128))

### Code Refactoring

-   Use ava instead of mocha/chai ([#138](https://github.com/lo1tuma/pr-log/pull/138))
-   Remove proxyquire dependency ([#134](https://github.com/lo1tuma/pr-log/pull/134))
-   Use octokit instead of restling ([#131](https://github.com/lo1tuma/pr-log/pull/131))
-   Use async/await instead of bluebird ([#130](https://github.com/lo1tuma/pr-log/pull/130))

## 2.1.0 (March 3, 2018)

### Dependency Upgrades

-   Update chai to version 4.1.2 (#124)
-   Update git-url-parse to version 8.1.0 (#123)
-   chore(package): update coveralls to version 3.0.0 (#122)
-   Update mocha to version 5.0.1 (#121)
-   Update sinon to version 4.4.2 (#120)
-   Update babel-register to the latest version 🚀 (#104)
-   Update babel-cli to the latest version 🚀 (#105)
-   Update parse-github-repo-url to the latest version 🚀 (#106)
-   Update bluebird to the latest version 🚀 (#111)
-   Update ramda to the latest version 🚀 (#112)
-   fix(package): update moment to version 2.20.1 (#119)
-   fix(package): update commander to version 2.14.1 (#118)
-   chore(package): update eslint to version 4.7.0 (#109)
-   Update sinon to the latest version 🚀 (#101)
-   Update sinon to the latest version 🚀 (#88)
-   Update eslint and eslint-config-holidaycheck to the latest version 🚀 (#95)
-   Update eslint-plugin-mocha to the latest version 🚀 (#92)
-   Update chai-as-promised to the latest version 🚀 (#97)
-   Update commander to the latest version 🚀 (#96)
-   Update chai-as-promised to the latest version 🚀 (#90)
-   Update commander to the latest version 🚀 (#93)
-   Update git-url-parse to the latest version 🚀 (#91)
-   Update sinon-chai to the latest version 🚀 (#89)
-   Update nyc to the latest version 🚀 (#85)
-   Update ramda to the latest version 🚀 (#86)
-   Update dependencies to enable Greenkeeper 🌴 (#82)
-   Update eslint (#81)

### Bug Fixes

-   Reduce cyclomatic complexity to fix build (#117)

### Build-Related

-   Use files whitelist instead of .npmignore (#100)
-   Switch to babel-preset-env (#99)
-   Add node 8 test environment (#98)
-   Move to nyc for code coverage (#80)

## 2.0.0 (May 23, 2017)

### Breaking Changes

-   Drop nodejs 0.x and 5.x support (#79)
-   Skip prerelease tags and upgrade semver (#76)

### Features

-   Allow the user to configure PR label to group mapping (#78)
-   Added --sloppy option (#75)

### Enhancements

-   Handle PRs that don't match expected merge format (#77)

## 1.6.0 (August 25, 2016)

### Bug Fixes

-   Support parentheses in PR titles (#74)

## 1.5.0 (June 4, 2016)

### Bug Fixes

-   Fix stripping trailing empty line (#70)

### Dependency Upgrades

-   Update eslint-config-holidaycheck to version 0.9.0 🚀 (#69)
-   Update git-url-parse to version 6.0.3 🚀 (#65)
-   Update eslint-plugin-mocha to version 3.0.0 🚀 (#68)
-   Update bluebird to version 3.4.0 🚀 (#59)
-   Update babel-preset-es2015 to version 6.9.0 🚀 (#58)
-   Update sinon to version 1.17.4 🚀 (#45)
-   Update babel-cli to version 6.9.0 🚀 (#57)
-   Update babel-register to version 6.9.0 🚀 (#60)
-   Update proxyquire to version 1.7.9 🚀 (#52)
-   Update mocha to version 2.5.3 🚀 (#64)
-   Update eslint to version 2.11.1 🚀 (#67)
-   Update git-url-parse to version 6.0.2 🚀 (#43)
-   Update babel-cli to version 6.7.7 🚀 (#42)
-   Update eslint to version 2.8.0 🚀 (#39)
-   Update parse-github-repo-url to version 1.3.0 🚀 (#40)
-   Update moment to version 2.13.0 🚀 (#41)
-   Update eslint-plugin-mocha to version 2.2.0 🚀 (#38)
-   Update eslint-config-holidaycheck to version 0.7.0 🚀 (#36)
-   Update parse-github-repo-url to version 1.2.0 🚀 (#37)
-   Update bluebird to version 3.3.5 🚀 (#35)
-   Update ramda to version 0.21.0 🚀 (#33)
-   Update eslint-plugin-mocha to version 2.1.0 🚀 (#34)
-   Update babel-cli to version 6.7.5 🚀 (#32)
-   Update eslint to version 2.7.0 🚀 (#31)
-   Update eslint to version 2.6.0 🚀 (#29)
-   Update eslint-config-holidaycheck to version 0.6.0 🚀 (#30)
-   Update ramda to version 0.20.1 🚀 (#28)
-   Update ramda to version 0.20.0 🚀 (#24)
-   Update eslint to version 2.5.3 🚀 (#26)
-   Update coveralls to version 2.11.9 🚀 (#21)
-   Update chai-as-promised to version 5.3.0 🚀 (#20)
-   Update eslint to version 2.4.0 🚀 (#15)
-   Update bluebird to version 3.3.4 🚀 (#14)
-   Update moment to version 2.12.0 🚀 (#13)

### Build-Related

-   Convert to es2015 (#18)

## 1.4.0 (March 5, 2016)

### Dependency Upgrades

-   Update all dependencies 🌴 (#11)
-   Update to ESLint 2 and use eslint-config-holidaycheck (#12)

### Enhancements

-   Replace lodash by ramda (#10)

### Bug Fixes

-   Fix long computation time (#9)

## 1.3.0 (July 1, 2015)

### Enhancements

-   Replace superagent-promise with restling (#8)

### Bug Fixes

-   Avoid extra empty line (#7)

## 1.2.0 (June 21, 2015)

### Dependency Upgrades

-   Update dependencies (#6)

## 1.1.0 (March 8, 2015)

### Bug Fixes

-   Fix crash with mulitline commit message body (#4)

### Dependency Upgrades

-   Update eslint (#5)
-   Update dependencies (#3)

## 1.0.0 (January 22, 2015)

Initial release
