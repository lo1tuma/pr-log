import type { Argument } from "clify";
import "reflect-metadata";
import {
  ArgDateFormat,
  ArgGroupByLabels,
  ArgGroupByMatchers,
  ArgIncludePrDescription,
  ArgOnlySince,
  ArgOutputFile,
  ArgPrTitleMatcher,
  ArgSloppy,
  ArgTrace,
  ArgValidLabels,
  ArgVersion,
} from "./main-action";
import type { Constructor } from "./utils/dependency-injector/inject";
import type { DependencyOverride } from "./utils/dependency-injector/service";
import { Service } from "./utils/dependency-injector/service";

export { MainAction } from "./main-action";

const ARGS = [
  ["includePrBody", ArgIncludePrDescription],
  ["--include-pr-description", ArgIncludePrDescription],
  ["-n", ArgIncludePrDescription],
  ["prTitleMatcher", ArgPrTitleMatcher],
  ["--pr-title-matcher", ArgPrTitleMatcher],
  ["-p", ArgPrTitleMatcher],
  ["dateFormat", ArgDateFormat],
  ["--date-format", ArgDateFormat],
  ["-d", ArgDateFormat],
  ["validLabels", ArgValidLabels],
  ["--valid-labels", ArgValidLabels],
  ["-l", ArgValidLabels],
  ["outputFile", ArgOutputFile],
  ["--output-file", ArgOutputFile],
  ["-o", ArgOutputFile],
  ["onlySince", ArgOnlySince],
  ["--only-since", ArgOnlySince],
  ["-c", ArgOnlySince],
  ["groupByLabels", ArgGroupByLabels],
  ["--group-by-labels", ArgGroupByLabels],
  ["-gl", ArgGroupByLabels],
  ["groupByMatchers", ArgGroupByMatchers],
  ["--group-by-matchers", ArgGroupByMatchers],
  ["-gm", ArgGroupByMatchers],
  ["sloppy", ArgSloppy],
  ["--sloppy", ArgSloppy],
  ["-s", ArgSloppy],
  ["trace", ArgTrace],
  ["--trace", ArgTrace],
  ["-t", ArgTrace],
  ["targetVersion", ArgVersion],
  ["--target-version", ArgVersion],
  ["-v", ArgVersion],
] as const;

type TypeName = "string" | "boolean" | "number";

type ArgForKey<A extends ArgKey> = {
  [K in (typeof ARGS)[number] as K[0]]: K;
}[A][1];

type TypeNameToType<T extends TypeName> = {
  string: string;
  boolean: boolean;
  number: number;
}[T];

type ArgKey = (typeof ARGS)[number][0];
type ArgType<A extends ArgKey> = ArgForKey<A> extends new () => Argument<infer U, any>
  ? U extends TypeName
    ? TypeNameToType<U>
    : never
  : never;

// @ts-expect-error
const ARG_MAP = new Map(ARGS);

export const argument = <A extends ArgKey>(
  argName: A,
  value: ArgType<A>
): [Constructor, DependencyOverride] => {
  const ArgConstructor = ARG_MAP.get(argName);

  if (!ArgConstructor) {
    throw new Error(`Invalid argument: ${argName}`);
  }

  return [
    ArgConstructor,
    {
      value,
      isSet: true,
      setDefault() {},
    },
  ];
};

export const arg = argument;

const defaultBindArg = <A extends ArgKey>(
  argName: A
): [Constructor, DependencyOverride] => {
  const ArgConstructor = ARG_MAP.get(argName);

  if (!ArgConstructor) {
    throw new Error(`Invalid argument: ${argName}`);
  }

  const a = {
    value: undefined,
    isSet: false,
    setDefault(v: any) {
      if (!this.isSet) {
        this.value = v;
        this.isSet = true;
      }
    },
  };

  return [ArgConstructor, a];
};

Service.setDefaultDependency(...defaultBindArg("--date-format"));
Service.setDefaultDependency(...defaultBindArg("--group-by-matchers"));
Service.setDefaultDependency(...defaultBindArg("--group-by-labels"));
Service.setDefaultDependency(...defaultBindArg("--include-pr-description"));
Service.setDefaultDependency(...defaultBindArg("--only-since"));
Service.setDefaultDependency(...defaultBindArg("--output-file"));
Service.setDefaultDependency(...defaultBindArg("--pr-title-matcher"));
Service.setDefaultDependency(...defaultBindArg("--sloppy"));
Service.setDefaultDependency(...defaultBindArg("--target-version"));
Service.setDefaultDependency(...defaultBindArg("--trace"));
Service.setDefaultDependency(...defaultBindArg("--valid-labels"));
