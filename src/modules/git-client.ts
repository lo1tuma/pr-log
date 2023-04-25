import git, { GitCallback, GitOptions } from "git-promise";

export class Git {
  run<C extends GitCallback = GitCallback<string>>(commandOrArgs: string | string[]): ReturnType<C>;
  run<C extends GitCallback = GitCallback<string>>(
    commandOrArgs: string | string[],
    callback: C
  ): ReturnType<C>;
  run<C extends GitCallback = GitCallback<string>>(
    commandOrArgs: string | string[],
    options: GitOptions
  ): ReturnType<C>;
  run<C extends GitCallback = GitCallback<string>>(
    commandOrArgs: string | string[],
    options: GitOptions,
    callback: C
  ): ReturnType<C>;
  run(...rest: any) {
    return git.apply(null, rest);
  }
}
