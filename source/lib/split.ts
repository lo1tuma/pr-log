type NonEmptyArray<T> = readonly [T, ...(readonly T[])];

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type NonEmptyString<T extends string> = T extends `${infer _Character}${string}` ? T : never;

type SplitReturnValue<T extends string> = T extends NonEmptyString<T> ? NonEmptyArray<string> : readonly string[];

export function splitByString<Separator extends string>(
    value: string,
    separator: Separator
): SplitReturnValue<Separator> {
    const builtinSplit = String.prototype.split.bind(value);
    return builtinSplit(separator) as unknown as SplitReturnValue<Separator>;
}

function isEmptyRegExp(value: Readonly<RegExp>): boolean {
    const matches = ''.split(value);
    return matches.length === 0;
}

export function splitByPattern(value: string, separator: Readonly<RegExp>): NonEmptyArray<string> {
    if (isEmptyRegExp(separator)) {
        throw new Error('The given regex pattern was empty and can’t be used to split a string value');
    }

    const builtinSplit = String.prototype.split.bind(value);
    return builtinSplit(separator) as unknown as NonEmptyArray<string>;
}
