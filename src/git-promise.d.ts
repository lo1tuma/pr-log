declare module 'git-promise' {
    export type GitCallback<R = any> = (stdout: string, error: unknown) => R;

    export type GitOptions = {};

    function Git<C extends GitCallback = GitCallback<string>>(commandOrArgs: string | string[]): ReturnType<C>;
    function Git<C extends GitCallback = GitCallback<string>>(
        commandOrArgs: string | string[],
        callback: C
    ): ReturnType<C>;
    function Git<C extends GitCallback = GitCallback<string>>(
        commandOrArgs: string | string[],
        options: GitOptions
    ): ReturnType<C>;
    function Git<C extends GitCallback = GitCallback<string>>(
        commandOrArgs: string | string[],
        options: GitOptions,
        callback: C
    ): ReturnType<C>;

    export default Git;
}
