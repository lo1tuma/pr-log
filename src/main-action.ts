import { Octokit } from "@octokit/rest";
import { Argument } from "clify";
import { ConfigFacade } from "./modules/config";
import { ConfigLoader } from "./modules/config-loader";
import { EnvvarReader } from "./modules/envvar-reader";
import { CliService } from "./services/cli";
import { Inject } from "./utils/dependency-injector/inject";
import { Service } from "./utils/dependency-injector/service";

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

export class MainAction extends Service {
  @Inject(() => ArgSloppy)
  private declare sloppy: InstanceType<typeof ArgSloppy>;

  @Inject(() => ArgTrace)
  private declare trace: InstanceType<typeof ArgTrace>;

  @Inject(() => ArgVersion)
  private declare version: InstanceType<typeof ArgVersion>;

  @Inject(() => ArgIncludePrDescription)
  private declare includePrDescription: InstanceType<typeof ArgIncludePrDescription>;

  @Inject(() => ArgPrTitleMatcher)
  private declare prTitleMatcher: InstanceType<typeof ArgPrTitleMatcher>;

  @Inject(() => ArgDateFormat)
  private declare dateFormat: InstanceType<typeof ArgDateFormat>;

  @Inject(() => ArgValidLabels)
  private declare validLabels: InstanceType<typeof ArgValidLabels>;

  @Inject(() => ArgOutputFile)
  private declare outputFile: InstanceType<typeof ArgOutputFile>;

  @Inject(() => ArgOnlySince)
  private declare onlySince: InstanceType<typeof ArgOnlySince>;

  @Inject(() => ArgGroupByLabels)
  private declare groupByLabels: InstanceType<typeof ArgGroupByLabels>;

  @Inject(() => ArgGroupByMatchers)
  private declare groupByMatchers: InstanceType<typeof ArgGroupByMatchers>;

  @Inject(() => Octokit)
  private declare githubClient: InstanceType<typeof Octokit>;

  @Inject(() => ConfigLoader)
  private declare configLoader: ConfigLoader;

  @Inject(() => EnvvarReader)
  private declare envvarReader: EnvvarReader;

  public async run() {
    try {
      const GH_TOKEN = this.envvarReader.get("GH_TOKEN");

      const packageConfig = await this.configLoader.loadConfig();

      const config = new ConfigFacade(packageConfig, {
        prTitleMatcher: this.prTitleMatcher.value,
        dateFormat: this.dateFormat.value,
        validLabels: this.validLabels.value?.split(","),
        sloppy: this.sloppy.value,
        outputFile: this.outputFile.value,
        onlySince: this.onlySince.value,
        groupByLabels: this.groupByLabels.value,
        groupByMatchers: this.groupByMatchers.value,
        includePrBody: this.includePrDescription.value,
      });

      if (GH_TOKEN) {
        this.githubClient.auth({ type: "token", token: GH_TOKEN });
      }

      Service.setDefaultDependency(ConfigFacade, config);
      Service.setDefaultDependency(Octokit, this.githubClient);

      // Must be initialized after the the above defaults are set
      const cli = this.spawnService(CliService);

      return await cli.run(this.version.value, await this.configLoader.loadPackageJson());
    } catch (error) {
      if (error instanceof Error) {
        let message = `Error: ${error.message}`;

        if (this.trace.value) {
          message += "\n" + error.stack;
        }

        console.error(message);
        process.exit(1);
      } else {
        console.error(error);
        process.exit(1);
      }
    }
  }
}
