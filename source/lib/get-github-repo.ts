import parseGithubUrl from 'parse-github-repo-url';

export function getGithubRepo(githubUrl: string): string {
    const result = parseGithubUrl(githubUrl);

    if (result === false) {
        throw new Error(`Invalid GitHub URI ${githubUrl}`);
    }

    return `${result[0]}/${result[1]}`;
}
