export class Repo {
    constructor(public readonly owner: string, public readonly name: string) {}

    get path() {
        return `${this.owner}/${this.name}`;
    }
}
