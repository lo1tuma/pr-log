import path from "path";
import semver from "semver";
import { ConfigFacade } from "../modules/config";
import { Filesystem } from "../modules/filesystem";
import { GithubUrlResolver } from "../modules/github-url-resolver";
import type { PackageJson, SemverNumber } from "../shared-types";
import { Inject } from "../utils/dependency-injector/inject";
import { Service } from "../utils/dependency-injector/service";
import type { Repo } from "../utils/repo";
import { ChangelogGeneratorService } from "./changelog-generator";
import { GitService } from "./git";
import { PullRequestResolverService } from "./pull-request-resolver";

export class CliService extends Service {
  @Inject(() => ConfigFacade)
  private declare config: ConfigFacade;

  @Inject(() => ChangelogGeneratorService)
  private declare changelog: ChangelogGeneratorService;

  @Inject(() => PullRequestResolverService)
  private declare pr: PullRequestResolverService;

  @Inject(() => GithubUrlResolver)
  private declare githubUrlResolver: GithubUrlResolver;

  @Inject(() => Filesystem)
  private declare filesystem: Filesystem;

  @Inject(() => GitService)
  private declare gitService: GitService;

  _stripTrailingEmptyLine(text: string) {
    if (text.endsWith("\n\n")) {
      return text.slice(0, -1);
    }

    return text;
  }

  _validateVersionNumber(versionNumber?: SemverNumber) {
    if (!versionNumber) {
      throw new Error("version-number not specified");
    }
    if (semver.valid(versionNumber) === null) {
      throw new Error("version-number is invalid");
    }
  }

  _getOutputPath() {
    const o = this.config.get("outputFile");

    if (o) {
      return path.resolve(process.cwd(), o);
    }

    return path.resolve(process.cwd(), "CHANGELOG.md");
  }

  async _generateChangelog(githubRepo: Repo, newVersionNumber: SemverNumber) {
    if (!this.config.get("sloppy", false)) {
      await this.gitService.ensureCleanLocalGitState(githubRepo);
    }

    const pullRequests = await this.pr.getMerged(githubRepo);
    const changelog = await this.changelog.create(
      newVersionNumber,
      pullRequests,
      githubRepo
    );

    return this._stripTrailingEmptyLine(changelog);
  }

  async run(newVersionNumber: SemverNumber, packageInfo: PackageJson) {
    if (!packageInfo.repository?.url) {
      throw new Error("No repository url specified in package.json");
    }

    const githubRepo = this.githubUrlResolver.urlToRepo(packageInfo.repository?.url);

    this._validateVersionNumber(newVersionNumber);

    const changelog = await this._generateChangelog(githubRepo, newVersionNumber);

    const changelogPath = this._getOutputPath();

    await this.filesystem.prepend(changelogPath, changelog);
  }
}
