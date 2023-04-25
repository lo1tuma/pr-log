import fs from "fs/promises";
import path from "node:path";
import { PackageJson } from "../shared-types";

export class ConfigLoader {
  private packageJson: PackageJson | null = null;

  async loadPackageJson(cwd: string = process.cwd()) {
    if (this.packageJson) {
      return this.packageJson;
    }

    this.packageJson = JSON.parse(
      await fs.readFile(path.resolve(cwd, "package.json"), "utf8")
    ) as PackageJson;

    return this.packageJson;
  }

  async loadConfig(cwd?: string) {
    const packageJson = await this.loadPackageJson(cwd);

    return packageJson["pr-changelog-gen"];
  }
}
