export class EnvvarReader {
  get(key: string): string | undefined {
    return process.env[key];
  }
}
