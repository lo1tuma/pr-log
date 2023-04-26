import { spawn } from "child_process";

class GitError extends Error {
  constructor(public stdout: string[], public stderr: string[], public args: string[]) {
    super(`Git command error:\n${stderr.length > 0 ? stderr.join("") : stdout.join("")}`);
    this.name = "GitError";
  }
}

export class Git {
  run(args: string[], options?: { cwd: string }) {
    return new Promise<string>((resolve, reject) => {
      const process = spawn("git", args, { windowsHide: true, ...options });

      const stdout: string[] = [];
      const stderr: string[] = [];

      process.stdout.on("data", (data) => {
        stdout.push(data.toString());
      });

      process.stderr.on("data", (data) => {
        stderr.push(data.toString());
      });

      process.on("close", (code) => {
        if (code === 0) {
          resolve(stdout.join("") ?? "");
        } else {
          reject(new GitError(stdout, stderr, args));
        }
      });
    });
  }
}
