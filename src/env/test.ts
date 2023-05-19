import {test, describe} from 'node:test'
import assert from 'node:assert/strict'

import {checkEnvironmentalVariables, configure, helpText, readEnv} from './env'


describe('configure', () => {

  test('makes environment variables enumerable', () => {
    const envs = configure({
      user: {
        required: true,
        description: 'a user string'
      },
      baby: {
        required: true,
        description: 'a baby string'
      },
      taco: {
        required: true,
        description: 'a taco string'
      }
    })

    const result = [] as Array<string>
    for (const s in envs) result.push(s)

    assert.deepEqual(result, ['user', 'baby', 'taco'])
  })

})

describe('readEnv', () => {

  test('reads lowercase', () => {
    assert(process.env.USER)
    assert.equal(readEnv('user', {
      type: 'string',
      required: true,
      description: 'Unix acct name'
    }), process.env.USER)
  })

  test('reads uppercase', () => {
    assert.equal(readEnv('USER', {
      type: 'string',
      required: true,
      description: 'Unix acct name'
    }), process.env.USER)
  })

  test('reads integer', () => {
    process.env.AN_INT = '42'
    assert.equal(readEnv('AN_INT', {
      type: 'integer',
      required: true,
      description: ''
    }), 42)
  })

  test('throws if not an integer', () => {
    assert.throws(() => readEnv('USER', {
      required: true,
      type: 'integer',
      description: 'i am not a number'
    }))
  })

  test('throws if missing required', () => {
    assert.throws(() => readEnv('_NO_SUCH_ENV_VARIABLE_', {
      required: true,
      description: ''
    }))
  })

  test('defaults if missing optional', () => {
    const defaultValue = 'match-me';

    assert.equal(readEnv('_NO_SUCH_ENV_VARIABLE_', {
      required: false,
      description: '',
      default: defaultValue
    }), defaultValue)
  })
})


describe('checkEnvironmentalVariables', () => {

  test('returns no errors for provided variables', () => {
    assert(process.env.USER) // precondition
    process.env.SOME_NUMBER = '42'
    const result = checkEnvironmentalVariables({
      user: {
        type: 'string',
        required: true,
        description: 'Unix acct name'
      },
      SOME_NUMBER: {
        type: 'integer',
        required: true,
        description: ''
      }
    })

    assert.deepEqual(result, [])
  })

  test('returns no errors if optional variable not provided', () => {
    const result = checkEnvironmentalVariables({
      _NO_SUCH_ENV_VARIABLE_: {
        required: false,
        description: '',
        default: 'yeah'
      }
    })

    assert.deepEqual(result, [])
  })


  test('returns error if missing required', () => {
    const result = checkEnvironmentalVariables({
      _NO_SUCH_ENV_VARIABLE_: {
        required: true,
        description: ''
      }
    })

    assert.deepEqual(result, ['Missing environmental variable: "_NO_SUCH_ENV_VARIABLE_"\n' +
    '  _NO_SUCH_ENV_VARIABLE_: '])
  })


  test('returns error if integer config is not an integer', () => {
    process.env.AN_INT = 'FOO'
    const result = checkEnvironmentalVariables({
      AN_INT: {
        required: true,
        type: 'integer',
        description: 'i am not a number'
      }
    })

    assert.deepEqual(result, ['Bad environmental variable: "AN_INT" should be an integer, but it cannot be parsed using `parseInt()`.\n' +
    '  AN_INT: i am not a number'])

  })

})


describe('helpText', () => {

  test('returns required variables', () => {
    const result = helpText({
      my_var: {
        description: 'a variable called "my var"',
        required: true
      }
    })
    assert.equal(result, 'Required environmental variables:' +
      '\nMY_VAR   a variable called "my var"\n')
  })

  test('returns optional variables', () => {
    const result = helpText({
      my_var: {
        description: 'a variable called "my var"',
        required: false,
        default: 'horse'
      }
    })
    assert.equal(result, 'Optional environmental variables:' +
      '\nMY_VAR   a variable called "my var" ["horse"]\n')
  })
  test('returns both required and optional variables', () => {
    const result = helpText({
      my_req: {
        description: 'a variable called "MY_REQ"',
        required: true
      },
      my_opt: {
        description: 'a variable called "MY_OPT"',
        required: false,
        default: 'oh'
      }
    })
    assert.equal(result, 'Required environmental variables:' +
      '\nMY_REQ   a variable called "MY_REQ"' +
      '\nOptional environmental variables:' +
      '\nMY_OPT   a variable called "MY_OPT" ["oh"]\n')
  })

  test('keeps variables in the same order', () => {
    const result = helpText({
      j: {
        description: 'a variable called "j"',
        required: true
      },
      z: {
        description: 'a variable called "z"',
        required: true
      },
      a: {
        description: 'a variable called "a"',
        required: true
      },
    })
    const expected = 'Required environmental variables:\n' +
      'J   a variable called "j"\n' +
      'Z   a variable called "z"\n' +
      'A   a variable called "a"\n';
    assert.equal(result, expected)
  })

  test('aligns descriptions of variables', () => {
    const result = helpText({
      aaaaaaaaaaaa: {
        description: 'a variable called "a"',
        required: true
      },
      z: {
        description: 'a variable called "z"',
        required: true
      }
    })
    assert.equal(result, 'Required environmental variables:\n' +
      'AAAAAAAAAAAA   a variable called "a"\n' +
      'Z              a variable called "z"\n')
  })
})
