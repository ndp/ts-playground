// Copyright (c) 2023 Andrew J. Peterson, dba NDP Software
import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {fileSpecsToPaths} from "../files-specs.js";

describe('fileSpecsToPaths', () => {

  test('finds raw file', () => {
    const actual = fileSpecsToPaths('src/specs/data/a.txt')
    assert.deepEqual(actual, ['/src/specs/data/a.txt'])
  })

  test('finds raw files', () => {
    const actual = fileSpecsToPaths(['src/specs/data/a.txt', 'src/specs/data/folder/b.txt'])
    assert.deepEqual(actual, ['/src/specs/data/a.txt', '/src/specs/data/folder/b.txt'])
  })

  test('finds raw wildcard file', () => {
    const actual = fileSpecsToPaths('src/specs/data/*.txt')
    assert.deepEqual(actual, ['/src/specs/data/a.txt'])
  })

  test('finds file', () => {
    const actual = fileSpecsToPaths({glob: 'src/specs/data/a.txt'})
    assert.deepEqual(actual, ['/src/specs/data/a.txt'])
  })

  test('finds file in folder', () => {
    const actual = fileSpecsToPaths({glob: 'a.txt', dir: 'src/specs/data'})
    assert.deepEqual(actual, ['/a.txt'])
  })

  test('finds wildcard file as explicit glob', () => {
    const actual = fileSpecsToPaths({glob: 'src/specs/data/*.txt'})
    assert.deepEqual(actual, ['/src/specs/data/a.txt'])
  })

  test('finds wildcard files in folders', () => {
    const actual = fileSpecsToPaths({glob: '**/*.txt', dir: 'src/specs/data'})
    assert.deepEqual(actual, ['/a.txt', '/folder/b.txt'])
  })

  test('prefixes files', () => {
    const actual = fileSpecsToPaths({glob: '**/*.txt', dir: 'src/specs/data', prefix: '/assets'})
    assert.deepEqual(actual, ['/assets/a.txt', '/assets/folder/b.txt'])
  })

  test('treats "/" as the null prefix', () => {
    const actual = fileSpecsToPaths({glob: '**/*.txt', dir: 'src/specs/data', prefix: '/'})
    assert.deepEqual(actual, ['/a.txt', '/folder/b.txt'])
  })

  test('raises if no files match', () => {
    assert.throws(() => {
      fileSpecsToPaths({glob: 'x.txt'})
    }, /No files match glob pattern/)
  })

})
