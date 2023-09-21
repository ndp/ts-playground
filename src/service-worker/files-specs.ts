import {globSync} from "glob";
import {describe, test} from "node:test";
import assert from "node:assert/strict";


/*
 * An enumeration of files found on disk
 */
export type FilesSpec =
  string
  | Array<string>
  | {
  glob: string | Array<string>
  dir?: string, // default '.'
  prefix?: string // prefix of URL path, default /
}

export function fileSpecsToPaths(files: FilesSpec): Array<string> {
  let prefix = ''
  let dir = ''
  let globs: Array<string>
  if (typeof files === 'string') {
    globs = [files]
  } else if (Array.isArray(files)) {
    globs = files
  } else {
    globs = Array.isArray(files.glob) ? files.glob : [files.glob]
    prefix = files.prefix || ''
    dir = (files.dir) || dir
  }
  if (prefix[0] !== '/') prefix = '/' + prefix
  if (prefix.substring(-1) !== '/') prefix += '/'

  const options = {
    cwd: dir,
    dotRelative: true,
    nodir: true,
  };

  return globs.map(g => {
    const names = globSync(g, options);
    if (names.length === 0) throw `No files match glob pattern "${g}" in "${dir}"`
    return names.map(n => n.replace(/^\.[/\\]/, '')) // "./file.jpg"
      .map(n => `${prefix}${n}`)
  }).flat()
}


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
