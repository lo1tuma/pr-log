import parseGithubUrl from 'parse-github-repo-url';
import { Repo } from './utils/repo';

export function getGithubRepo(githubUrl: string): Repo {
    const result = parseGithubUrl(githubUrl);

    if (!result) {
        throw new Error(`Invalid GitHub URI ${githubUrl}`);
    }

    return new Repo(result[0], result[1]);
}
