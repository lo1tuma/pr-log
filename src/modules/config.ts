import type { GetDataType } from "dilswer";
import { OptionalField, Type, ValidationError, assertDataType } from "dilswer";

const LabeledRegex = Type.RecordOf({
  regexp: Type.String,
  flags: OptionalField(Type.String),
  label: OptionalField(Type.String),
});

const StringRegexp = Type.OneOf(Type.String, LabeledRegex);

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

export type LabeledRegexp = GetDataType<typeof LabeledRegex>;

type Defined<T> = Exclude<T, undefined | null>;

export class ConfigFacade {
  private readonly config: Readonly<Config>;

  constructor(config: any = {}, overrides: Config = {}) {
    this.assertConfigType(config);

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

  private assertConfigType(config: any): asserts config is Config {
    try {
      assertDataType(ConfigSchema, config);
    } catch (err) {
      if (ValidationError.isValidationError(err)) {
        throw new Error(
          `Invalid config property: '${
            err.receivedValue
          }' at [config.${err.fieldPath.substring(2)}]`
        );
      } else {
        throw err;
      }
    }
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
