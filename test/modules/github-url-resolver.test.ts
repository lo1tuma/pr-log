import { describe, expect, it } from "@jest/globals";
import { GithubUrlResolver } from "../../src/modules/github-url-resolver";
import { Repo } from "../../src/utils/repo";

describe("GithubUrlResolver", () => {
  const resolverModule = new GithubUrlResolver();

  it("extracts the repo path of a github URL", () => {
    expect(resolverModule.urlToRepo("git://github.com/foo/bar.git#master")).toEqual(
      new Repo("foo", "bar")
    );
  });

  it("throws if the given URL is not a github URL", () => {
    expect(() => resolverModule.urlToRepo("git://foo.com/bar.git")).toThrow(
      expect.objectContaining({ message: "Invalid GitHub URI git://foo.com/bar.git" })
    );
  });
});
