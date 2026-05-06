import assert from 'node:assert';
import { splitByString, splitByPattern } from './split.ts';

test('splitByString() splits the given string by an empty string separator', () => {
    const result = splitByString('foo', '');
    assert.deepStrictEqual(result, ['f', 'o', 'o']);
});

test('splitByString() splits the given string by an non empty string separator', () => {
    const result = splitByString('foo bar', ' ');
    assert.deepStrictEqual(result, ['foo', 'bar']);
});

test('splitByString() splits an empty string by an empty string separator', () => {
    const result = splitByString('', '');
    assert.deepStrictEqual(result, []);
});

test('splitByString() splits an empty string by an non empty string separator', () => {
    const result = splitByString('', ' ');
    assert.deepStrictEqual(result, ['']);
});

test('splitByPattern() splits the given string by the given regex pattern', () => {
    const result = splitByPattern('foo bar', / /);
    assert.deepStrictEqual(result, ['foo', 'bar']);
});

test('splitByPattern() splits an empty string by the given regex pattern', () => {
    const result = splitByPattern('', / /);
    assert.deepStrictEqual(result, ['']);
});

test('splitByPattern() throws when an empty pattern as literal is given', () => {
    assert.throws(
        () => {
            splitByPattern('foo', /(?:)/);
        },
        { message: 'The given regex pattern was empty and can’t be used to split a string value' }
    );
});

test('splitByPattern() throws when an empty pattern is given', () => {
    assert.throws(
        () => {
            // eslint-disable-next-line prefer-regex-literals -- we want to test if the empty regex is detected correctly using the constructor
            splitByPattern('foo', new RegExp(''));
        },
        { message: 'The given regex pattern was empty and can’t be used to split a string value' }
    );
});
