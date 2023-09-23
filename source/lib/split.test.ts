import test from 'ava';
import { splitByString, splitByPattern } from './split.js';

test('splitByString() splits the given string by an empty string separator', (t) => {
    const result = splitByString('foo', '');
    t.deepEqual(result, ['f', 'o', 'o']);
});

test('splitByString() splits the given string by an non empty string separator', (t) => {
    const result = splitByString('foo bar', ' ');
    t.deepEqual(result, ['foo', 'bar']);
});

test('splitByString() splits an empty string by an empty string separator', (t) => {
    const result = splitByString('', '');
    t.deepEqual(result, []);
});

test('splitByString() splits an empty string by an non empty string separator', (t) => {
    const result = splitByString('', ' ');
    t.deepEqual(result, ['']);
});

test('splitByPattern() splits the given string by the given regex pattern', (t) => {
    const result = splitByPattern('foo bar', / /);
    t.deepEqual(result, ['foo', 'bar']);
});

test('splitByPattern() splits an empty string by the given regex pattern', (t) => {
    const result = splitByPattern('', / /);
    t.deepEqual(result, ['']);
});

test('splitByPattern() throws when an empty pattern as literal is given', (t) => {
    t.throws(
        () => {
            splitByPattern('foo', /(?:)/);
        },
        { message: 'The given regex pattern was empty and can’t be used to split a string value' }
    );
});

test('splitByPattern() throws when an empty pattern is given', (t) => {
    t.throws(
        () => {
            // eslint-disable-next-line prefer-regex-literals
            splitByPattern('foo', new RegExp(''));
        },
        { message: 'The given regex pattern was empty and can’t be used to split a string value' }
    );
});
