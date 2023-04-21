declare module 'prepend' {
    function prepend(file: string, data: string): void;
    function prepend(file: string, data: string, callback: (err: Error) => void): void;

    export default prepend;
}
