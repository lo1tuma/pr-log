import { Argument } from "clify";

export const ArgIncludePrDescription = Argument.define({
  keyword: "--include-pr-description",
  flagChar: "-n",
  dataType: "boolean",
  description:
    "Include the description of each pull request in the changelog. Default: true.",
  default: true,
  require: true,
});

export const ArgPrTitleMatcher = Argument.define({
  keyword: "--pr-title-matcher",
  flagChar: "-p",
  dataType: "string",
  description:
    "A regex patter that will be used to determine if a Pull Request should be included in the changelog. Default: /^feat|fix[:\\/\\(].+/i",
});

export const ArgDateFormat = Argument.define({
  keyword: "--date-format",
  flagChar: "-d",
  dataType: "string",
  description: "The date format to use in the changelog. Default: MMMM d, yyyy",
});

export const ArgValidLabels = Argument.define({
  keyword: "--valid-labels",
  flagChar: "-l",
  dataType: "string",
  description:
    "A comma separated list of PR labels. If a PR has a matching label it will be included in the changelog.",
});

export const ArgOutputFile = Argument.define({
  keyword: "--output-file",
  flagChar: "-o",
  dataType: "string",
  description: "The file to write the changelog to. Default: <cwd>/CHANGELOG.md",
});

export const ArgOnlySince = Argument.define({
  keyword: "--only-since",
  flagChar: "-c",
  dataType: "string",
  description:
    "Only include PRs merged since the given date. This option overrides the default behavior of only including PRs merged since the last tag was created.",
});

export const ArgGroupByLabels = Argument.define({
  keyword: "--group-by-labels",
  flagChar: "-gl",
  dataType: "boolean",
  description: "Group PRs in the changelog by labels. Default: false.",
});

export const ArgGroupByMatchers = Argument.define({
  keyword: "--group-by-matchers",
  flagChar: "-gm",
  dataType: "boolean",
  description: "Group PRs in the changelog by PR matchers. Default: true.",
});

export const ArgSloppy = Argument.define({
  keyword: "--sloppy",
  flagChar: "-s",
  dataType: "boolean",
  description: "Skip ensuring clean local git state. Default: false.",
});

export const ArgTrace = Argument.define({
  keyword: "--trace",
  flagChar: "-t",
  dataType: "boolean",
  description: "Show stack traces for any error. Default: false.",
  default: false,
  require: true,
});

export const ArgVersion = Argument.define({
  keyword: "--target-version",
  flagChar: "-v",
  dataType: "string",
  description:
    "[Required] The version number of the release the changelog is being created for.",
  require: true,
});

export const ArgOutputToStdout = Argument.define({
  keyword: "--output-to-stdout",
  flagChar: "-u",
  dataType: "boolean",
  description:
    "Output the changelog to stdout instead of writing to a file. Default: false.",
});

export const ArgNoOutput = Argument.define({
  keyword: "--no-output",
  flagChar: "-q",
  dataType: "boolean",
  description:
    "When enabled generated changelog will not be written to any file or printed to stdout. Default: false.",
});

export const ArgExcludePrs = Argument.define({
  keyword: "--exclude-prs",
  flagChar: "-e",
  dataType: "string",
  description: "A comma separated list of PR numbers to exclude from the changelog.",
});

export const ArgExcludePattern = Argument.define({
  keyword: "--exclude-pattern",
  flagChar: "-x",
  dataType: "string",
  description:
    "A regex pattern that will be used to determine if a Pull Request should be excluded from the changelog.",
});
