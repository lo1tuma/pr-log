import parseGithubUrl from 'parse-github-repo-url';

function getGithubRepo(githubUrl) {
    const result = parseGithubUrl(githubUrl);

    if (!result) {
        throw new Error(`Invalid GitHub URI ${githubUrl}`);
    }

    return `${result[0]}/${result[1]}`;
}

export default getGithubRepo;
