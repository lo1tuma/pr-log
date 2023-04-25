import { Octokit } from "@octokit/rest";
import semver from "semver";
import { ConfigFacade } from "../modules/config";
import { Git } from "../modules/git-client";
import { PullRequest } from "../shared-types";
import { Inject } from "../utils/dependency-injector/inject";
import { Service } from "../utils/dependency-injector/service";
import { Repo } from "../utils/repo";

export type PullResponse = {
  data: {
    number: number;
    state: "closed" | "open";
    title: string;
    body: string;
    created_at: string;
    updated_at: string;
    closed_at?: string;
    merged_at?: string;
    labels: Array<string | { name: string }>;
  }[];
};

export class PullRequestResolverService extends Service {
  @Inject(() => Git)
  private declare git: Git;

  @Inject(() => Octokit)
  private declare githubClient: Octokit;

  @Inject(() => ConfigFacade)
  private declare config: ConfigFacade;

  _parseTagDateTime(gitTagInfo: string, tagName: string) {
    const tagLineRegexp = new RegExp(`\\(tag:.+?${tagName}.+?\\)`);

    const lines = gitTagInfo.split("\n");

    const tagLine = lines.find((line) => line.match(tagLineRegexp));

    if (!tagLine) {
      throw new Error(`Could not determine the creation date of a tag '${tagName}'`);
    }

    const date = /^(?<datetime>\d+-\d+-\d+ \d+:\d+:\d+)/;

    const match = tagLine.match(date);

    if (match == null) {
      throw new Error(`Could not determine the creation date of a tag '${tagName}'`);
    }

    const datetime = match.groups?.datetime;

    if (!datetime) {
      throw new Error(`Could not determine the creation date of a tag '${tagName}'`);
    }

    const ts = Date.parse(datetime.trim().replace(" ", "T"));

    return new Date(ts);
  }

  async _getLatestVersionTag() {
    const result = await this.git.run("tag --list");
    const tags = result.split("\n");
    const versionTags = tags.filter((tag) => semver.valid(tag) && !semver.prerelease(tag));
    const orderedVersionTags = versionTags.sort(semver.compare);

    return orderedVersionTags[orderedVersionTags.length - 1];
  }

  async _getPullRequests(githubRepo: Repo, tagName?: string): Promise<PullRequest[]> {
    const issues: PullResponse = await this.githubClient.request(
      `GET /repos/${githubRepo.path}/pulls`,
      {
        state: "closed",
        base: "master",
        sort: "updated",
        per_page: 100,
      }
    );

    const sinceDateTime = this.config.get("onlySince");

    if (tagName || sinceDateTime) {
      let dateTime: Date;

      if (sinceDateTime) {
        dateTime = new Date(sinceDateTime);
      } else {
        const tagDate = await this.git.run([
          "log",
          "--no-color",
          "--pretty=format:%ai (%d)",
          tagName!,
        ]);
        dateTime = this._parseTagDateTime(tagDate, tagName!);
      }

      return issues.data
        .filter((issue) => {
          return (
            issue.state === "closed" && issue.merged_at && new Date(issue.merged_at) > dateTime
          );
        })
        .map((issue) => {
          return {
            id: issue.number,
            title: issue.title,
            labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name)),
            body: issue.body,
            mergedAt: new Date(issue.merged_at!),
          };
        });
    }

    return issues.data
      .filter((issue) => {
        return issue.state === "closed" && issue.merged_at;
      })
      .map((issue) => {
        return {
          id: issue.number,
          title: issue.title,
          labels: issue.labels.map((l) => (typeof l === "string" ? l : l.name)),
          body: issue.body,
          mergedAt: new Date(issue.merged_at!),
        };
      });
  }

  async getMerged(githubRepo: Repo) {
    const latestVersionTag = await this._getLatestVersionTag();
    const pullRequests = await this._getPullRequests(githubRepo, latestVersionTag);

    return pullRequests;
  }
}
