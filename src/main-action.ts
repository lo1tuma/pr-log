import { Octokit } from "@octokit/rest";
import { Type, createValidator } from "dilswer";
import {
  ArgDateFormat,
  ArgExcludePattern,
  ArgExcludePrs,
  ArgGroupByLabels,
  ArgGroupByMatchers,
  ArgIncludePrDescription,
  ArgNoOutput,
  ArgOnlySince,
  ArgOutputFile,
  ArgOutputToStdout,
  ArgPrTitleMatcher,
  ArgSloppy,
  ArgTrace,
  ArgValidLabels,
  ArgVersion,
} from "./arguments";
import { ConfigFacade } from "./modules/config";
import { ConfigLoader } from "./modules/config-loader";
import { EnvvarReader } from "./modules/envvar-reader";
import { CliService } from "./services/cli";
import { Inject } from "./utils/dependency-injector/inject";
import { Service } from "./utils/dependency-injector/service";

export * from "./arguments";

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

  @Inject(() => ArgOutputToStdout)
  private declare outputToStdout: InstanceType<typeof ArgOutputToStdout>;

  @Inject(() => ArgNoOutput)
  private declare noOutput: InstanceType<typeof ArgNoOutput>;

  @Inject(() => ArgExcludePrs)
  private declare excludePrs: InstanceType<typeof ArgExcludePrs>;

  @Inject(() => ArgExcludePattern)
  private declare excludePatterns: InstanceType<typeof ArgExcludePattern>;

  @Inject(() => Octokit)
  private declare githubClient: InstanceType<typeof Octokit>;

  @Inject(() => ConfigLoader)
  private declare configLoader: ConfigLoader;

  @Inject(() => EnvvarReader)
  private declare envvarReader: EnvvarReader;

  private isSpawnedFromCli = false;

  /**
   * Set whether the action is spawned from the CLI or not. When this
   * is set to true, program will be terminated if an error occurs.
   *
   * If you are using this action from a node script, avoid this function.
   *
   * @default false
   * @internal
   */
  public setIsSpawnedFromCli(v: boolean) {
    this.isSpawnedFromCli = v;
    return this;
  }

  public async run() {
    try {
      const GH_TOKEN = this.envvarReader.get("GH_TOKEN");

      const packageConfig = await this.configLoader.loadConfig();

      const isNumeric = createValidator(Type.StringInt);

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
        outputToStdout: this.outputToStdout.value,
        noOutput: this.noOutput.value,
        excludePrs: this.excludePrs.value?.split(",").filter(isNumeric),
        excludePatterns: this.excludePatterns.value,
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
        const message = `Error: ${error.message}`;

        if (this.trace.value) {
          console.error(error.stack ?? message);
        } else {
          console.error(message);
        }
      } else {
        console.error(error);
      }

      if (this.isSpawnedFromCli) {
        process.exit(1);
      }
    }
  }
}
