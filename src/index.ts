import { configure } from "clify";
import "reflect-metadata";
import { MainAction } from "./main-action";

configure((main) => {
  main.setDisplayName("pr-changelog-gen");
  main.setDescription("Generate a changelog from merged pull requests.");

  main.setMainAction(() => new MainAction());
});
