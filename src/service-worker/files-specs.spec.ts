import {describe, test} from "node:test";
import assert from "node:assert/strict";
import {fileSpecsToPaths} from "./files-specs";

describe('fileSpecsToPaths', () => {

  test('finds raw file', () => {
    const actual = fileSpecsToPaths('example/a.txt')
    assert.deepEqual(actual, ['/example/a.txt'])
  })

  test('finds raw files', () => {
    const actual = fileSpecsToPaths(['example/a.txt', 'example/folder/b.txt'])
    assert.deepEqual(actual, ['/example/a.txt', '/example/folder/b.txt'])
  })

  test('finds raw wildcard file', () => {
    const actual = fileSpecsToPaths('example/*.txt')
    assert.deepEqual(actual, ['/example/a.txt'])
  })

  test('finds file', () => {
    const actual = fileSpecsToPaths({glob: 'example/a.txt'})
    assert.deepEqual(actual, ['/example/a.txt'])
  })

  test('finds file in folder', () => {
    const actual = fileSpecsToPaths({glob: 'a.txt', dir: 'example'})
    assert.deepEqual(actual, ['/a.txt'])
  })

  test('finds wildcard file as explicit glob', () => {
    const actual = fileSpecsToPaths({glob: 'example/*.txt'})
    assert.deepEqual(actual, ['/example/a.txt'])
  })

  test('finds wildcard files in folders', () => {
    const actual = fileSpecsToPaths({glob: '**/*.txt', dir: 'example'})
    assert.deepEqual(actual, ['/a.txt', '/folder/b.txt'])
  })

  test('prefixes files', () => {
    const actual = fileSpecsToPaths({glob: '**/*.txt', dir: 'example', prefix: '/assets'})
    assert.deepEqual(actual, ['/assets/a.txt', '/assets/folder/b.txt'])
  })

  test('treats "/" as the null prefix', () => {
    const actual = fileSpecsToPaths({glob: '**/*.txt', dir: 'example', prefix: '/'})
    assert.deepEqual(actual, ['/a.txt', '/folder/b.txt'])
  })

  test('raises if no files match', () => {
    assert.throws(() => {
      fileSpecsToPaths({glob: 'x.txt'})
    }, /No files match glob pattern/)
  })

})
