import semver from 'semver';
import { isUndefined } from '@sindresorhus/is';

export function determineLatestVersionTag(tags: readonly string[]): string {
    const versionTags = tags.filter((tag: string) => {
        return semver.valid(tag) !== null && semver.prerelease(tag) === null;
    });
    const orderedVersionTags = versionTags.sort(semver.compare);
    const latestTag = orderedVersionTags.at(-1);

    if (isUndefined(latestTag)) {
        throw new TypeError('Failed to determine latest version number git tag');
    }

    return latestTag;
}
