import { promisify } from "node:util";
import prepend from "prepend";

export class Filesystem {
  prepend = promisify(prepend);
}
