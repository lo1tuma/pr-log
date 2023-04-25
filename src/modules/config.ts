import type { GetDataType } from "dilswer";
import { OptionalField, Type, assertDataType } from "dilswer";

const StringRegexp = Type.OneOf(
  Type.String,
  Type.RecordOf({
    regexp: Type.String,
    flags: OptionalField(Type.String),
    label: OptionalField(Type.String),
  })
);

export const ConfigSchema = Type.RecordOf({
  sloppy: OptionalField(Type.Boolean),
  dateFormat: OptionalField(Type.String),
  validLabels: OptionalField(Type.ArrayOf(Type.String)),
  prTitleMatcher: OptionalField(Type.OneOf(StringRegexp, Type.ArrayOf(StringRegexp))),
  includePrBody: OptionalField(Type.Boolean),
  outputFile: OptionalField(Type.String),
  onlySince: OptionalField(Type.String),
  groupByLabels: OptionalField(Type.Boolean),
  groupByMatchers: OptionalField(Type.Boolean),
});

export type Config = GetDataType<typeof ConfigSchema>;

type Defined<T> = Exclude<T, undefined | null>;

export class ConfigFacade {
  private readonly config: Readonly<Config>;

  constructor(config: any = {}, overrides: Config = {}) {
    assertDataType(ConfigSchema, config);

    const conf = { ...config };

    for (const key of Object.keys(overrides) as (keyof Config)[]) {
      const value = overrides[key];

      if (value != null) {
        Object.assign(conf, { [key]: value });
      }
    }

    this.config = Object.freeze(conf);

    this.validateOnlySince();
  }

  private validateOnlySince() {
    const onlySince = this.config.onlySince;

    if (onlySince) {
      try {
        const date = new Date(onlySince);

        if (date.toString() === "Invalid Date") {
          throw new Error();
        }
      } catch (error) {
        throw new Error(`Invalid date: ${onlySince}`);
      }
    }
  }

  get<K extends keyof Config>(key: K): Config[K];
  get<K extends keyof Config>(
    key: K,
    defaultValue: Defined<Config[K]>
  ): Defined<Config[K]>;
  get(key: keyof Config, defaultValue?: any): any {
    return this.config[key] ?? defaultValue;
  }

  has(key: keyof Config): boolean {
    return this.config[key] != null;
  }
}
