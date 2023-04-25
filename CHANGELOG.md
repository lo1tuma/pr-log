## 1.0.0 (April 25, 2023)

### Features

- #### feat: added main export from the package to allow running pr-changelog-gen from a node script ([#9](https://github.com/ncpa0cpl/pr-changelog-gen/pull/9))

  `pr-changelog-gen` now has a main export that contains everything you need to easily use it from a node script.

  **Example**

  ```ts
  import { MainAction, argument } from "pr-changelog-gen";

  const action = MainAction.init(
    argument("-v", "1.0.0"),
    argument("-c", "2023-01-01"),
    argument("--sloppy", true)
  );

  await action.run();
  ```

- #### feat: introduced a new dependency injection mechanism and refactored the whole project to use it ([#8](https://github.com/ncpa0cpl/pr-changelog-gen/pull/8))

  **Dependency Injection Mechanism (internal changes)**

  A new dependency injection system that uses TypeScript decorators is being added.

  How it works:

  ```ts
  // define a module or a service that we will be injected into another service
  class Module {
    doSomething() {}
  }

  // define a Service class that will be consuming the `Module`
  class MyService extends Service {
    @Inject(() => Module)
    declare module: Module;

    useModule() {
      this.module.doSomething();
    }
  }

  // use the service
  const service = new MyService();
  service.useModule();

  // inject a different Module class into the service
  class ModuleMock {
    doSomething() {
      // something different that what Module does
    }
  }

  const service = MyService.init([Module, ModuleMock]);
  // or
  const service = MyService.init([Module, new ModuleMock()]);
  ```

  Services can be nested, and depend on each other. Injecting different dependency on a service will also inject it into all of it's descendant, for example if you have a `Service1` depending on `Service2` which depends on `Service3` which depends on `SomeModule`, initializing the `Service1` with a different `SomeModule` will also affect the `Service3` ( despite the fact that `Service3` is deeply nested within the `Service1`).

  For nested injections to work, each depending service must be initiated via the `Inject()` decorator or the `spawnService()` method.

  **Executing `pr-changelog-gen` from node**

  With this change it should also now be much easier to run the `pr-changelog-gen` from a node script:

  ```ts
  import {
    MainAction,
    ArgVersion,
    ArgTrace,
  } from "pr-changelog-gen/dist/esm/main-action.mjs";

  const action = MainAction.init(
    [ArgVersion, { value: "1.0.0", isSet: true }],
    [ArgTrace, { value: true, isSet: true }]
  );

  const result = actions.run(); // equivalent to `yarn pr-changelog-gen -v 1.0.0 --trace`

  result; // Promise<void> (can be awaited, might throw errors)
  ```

- #### feat: renamed the property under which the config in package.json file is located ([#5](https://github.com/ncpa0cpl/pr-changelog-gen/pull/5))

  In the original fork the config could be specified in the `package.json` file under a `pr-log` property. This has been renamed to `pr-changelog-gen` to match this forked project name.

- #### feat: added options to group entries in changelog by Label and/or by the matchers ([#4](https://github.com/ncpa0cpl/pr-changelog-gen/pull/4))

  Added new grouping options that can be enabled or disabled via the config or cli arguments:

  - `--group-by-labels`/`groupByLabels` - will group the entries by the labels attached to the PR, if a PR has multiple labels, labels of lower index in the `validLabels` array will take priority (this option is disabled by default)
  - `--group-by-matchers`/`groupByMatchers` - each PR matcher defined in the config's `prTitleMatcher` can now have a `label` attached to it, when this setting is enabled entries will be grouped by those labels (this option is enabled by default)

  **Example of a matcher with a label:**

  ```json
  {
    "pr-changelog-gen": {
      "groupByMatchers": true,
      "prTitleMatcher": [
        {
          "label": "Feature",
          "regexp": "^(feat|feature)[:\\/\\(].+",
          "flags": "i"
        }
      ]
    }
  }
  ```

- #### feat: reworked how config and options are handled and added new options ([#2](https://github.com/ncpa0cpl/pr-changelog-gen/pull/2))

  Reworked how the CLI arguments and config options are handled. Most of the config options can now be overridden via CLI arguments. New config options has also been added:

  - `--only-since`/`onlySince` - can be used to opt-out of the default method of determining which PRs should be included in the changelog, and instead use a specified date, all merged PRs past that date will be then included, the date value passed can be either a Unix Timestamp or a ISO Date or DateTime
  - `--output-file`/`outputFile` - can be used to define a file to which the generated changelog will be saved to
  - `--pr-title-matcher`/`prTitleMatcher` - an regular expression or an array of them, if defined will be used to match against the merged PR titles to determine if a given PR should be included in the changelog

- #### feat: changes ([#1](https://github.com/ncpa0cpl/pr-changelog-gen/pull/1))

  A number of changes introduced vs the original repo this is project was forked from:

  - added TypeScript and type annotations to all the source code files
  - replaced the `npm` package manager with `yarn`
  - replaced `babel` with an `esbuild` based build solution
  - changed the algorithm that determines which PRs should be included in the changelog, instead of relying on the `git log` to provide all the merges to the main branch, the GitHub API is now being leveraged instead
  - added new feature: PR descriptions can now be pulled from GitHub and included in the changelog along with the PR title, this option can be enabled or disabled via the `--include-pr-description` argument (default is enabled)
  - adding multiple labels to a PR now shouldn't cause errors

### Bug Fixes

- #### fix: order of matchers group to be the same as defined in config ([#11](https://github.com/ncpa0cpl/pr-changelog-gen/pull/11))

  Fixed an error in the ordering of PR groups in changelog. The order of elements should be exactly the same as the order of matchers defined in the `prTitleMatcher` config option, this however was not the case. Has been fixed now.

- #### fix: added an additional endline character in between the PR title and the body ([#3](https://github.com/ncpa0cpl/pr-changelog-gen/pull/3))

  Fixed a bug where markdown was displaying the PR body on the same line as the PR title, because there was only one end-of-line character in between them
