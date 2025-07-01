import { describe, test, expect } from 'vitest'
import {
  CheckboxConfigSchema,
  CheckboxConfigItemSchema,
  CheckboxStateSchema,
  ActionInputsSchema,
  StringArraySchema,
  parseJSONSafely,
  validateBase64JSON,
} from './schemas.js'

describe('CheckboxConfigItemSchema', () => {
  test('validates string value', () => {
    const item = { task1: 'Run tests' }
    expect(() => CheckboxConfigItemSchema.parse(item)).not.toThrow()
  })

  test('validates object value with label', () => {
    const item = { task1: { label: 'Run tests', priority: 'high' } }
    expect(() => CheckboxConfigItemSchema.parse(item)).not.toThrow()
  })

  test('throws for empty label string', () => {
    const item = { task1: '' }
    expect(() => CheckboxConfigItemSchema.parse(item)).toThrow('Label must not be empty')
  })

  test('throws for object without label', () => {
    const item = { task1: { priority: 'high' } }
    expect(() => CheckboxConfigItemSchema.parse(item)).toThrow('Required')
  })

  test('throws for multiple keys', () => {
    const item = { task1: 'Test 1', task2: 'Test 2' }
    expect(() => CheckboxConfigItemSchema.parse(item)).toThrow('exactly one key-value pair')
  })

  test('throws for empty key', () => {
    const item = { '': 'Test' }
    expect(() => CheckboxConfigItemSchema.parse(item)).toThrow('Key must not be empty')
  })
})

describe('CheckboxConfigSchema', () => {
  test('validates array of config items', () => {
    const config = [{ task1: 'Test 1' }, { task2: { label: 'Test 2' } }]
    expect(() => CheckboxConfigSchema.parse(config)).not.toThrow()
  })

  test('throws for empty array', () => {
    expect(() => CheckboxConfigSchema.parse([])).toThrow('Config must contain at least one item')
  })

  test('throws for non-array', () => {
    expect(() => CheckboxConfigSchema.parse({ task1: 'Test' })).toThrow()
  })
})

describe('CheckboxStateSchema', () => {
  test('validates checkbox state object', () => {
    const state = { task1: true, task2: false, task3: true }
    expect(() => CheckboxStateSchema.parse(state)).not.toThrow()
  })

  test('throws for non-boolean values', () => {
    const state = { task1: 'true', task2: false }
    expect(() => CheckboxStateSchema.parse(state)).toThrow()
  })
})

describe('ActionInputsSchema', () => {
  test('validates valid action inputs', () => {
    const inputs = {
      id: 'test-id',
      number: 123,
      message: 'Test message',
      config: '[]',
      checked: '[]',
      body: false,
      token: 'github-token',
    }
    expect(() => ActionInputsSchema.parse(inputs)).not.toThrow()
  })

  test('throws for invalid number', () => {
    const inputs = {
      id: 'test-id',
      number: -1,
      message: 'Test message',
      body: false,
      token: 'github-token',
    }
    expect(() => ActionInputsSchema.parse(inputs)).toThrow('Number must be a positive integer')
  })

  test('throws for empty id', () => {
    const inputs = {
      id: '',
      number: 123,
      message: 'Test message',
      body: false,
      token: 'github-token',
    }
    expect(() => ActionInputsSchema.parse(inputs)).toThrow('ID must not be empty')
  })

  test('throws for empty token', () => {
    const inputs = {
      id: 'test-id',
      number: 123,
      message: 'Test message',
      body: false,
      token: '',
    }
    expect(() => ActionInputsSchema.parse(inputs)).toThrow('Token must not be empty')
  })
})

describe('StringArraySchema', () => {
  test('validates array of strings', () => {
    const array = ['task1', 'task2', 'task3']
    expect(() => StringArraySchema.parse(array)).not.toThrow()
  })

  test('validates empty array', () => {
    expect(() => StringArraySchema.parse([])).not.toThrow()
  })

  test('throws for non-string elements', () => {
    const array = ['task1', 123, 'task3']
    expect(() => StringArraySchema.parse(array)).toThrow()
  })
})

describe('parseJSONSafely', () => {
  test('parses valid JSON with schema validation', () => {
    const json = '["task1", "task2"]'
    const result = parseJSONSafely(json, StringArraySchema)
    expect(result).toEqual(['task1', 'task2'])
  })

  test('throws for invalid JSON syntax', () => {
    const json = 'invalid json'
    expect(() => parseJSONSafely(json, StringArraySchema)).toThrow('Invalid JSON syntax')
  })

  test('throws for valid JSON but invalid schema', () => {
    const json = '{"key": "value"}'
    expect(() => parseJSONSafely(json, StringArraySchema)).toThrow('Invalid JSON')
  })

  test('uses custom context in error messages', () => {
    const json = 'invalid'
    expect(() => parseJSONSafely(json, StringArraySchema, 'test data')).toThrow(
      'Invalid test data syntax'
    )
  })
})

describe('validateBase64JSON', () => {
  test('decodes base64 and validates JSON', () => {
    const data = ['task1', 'task2']
    const base64 = btoa(JSON.stringify(data))
    const result = validateBase64JSON(base64, StringArraySchema)
    expect(result).toEqual(data)
  })

  test('throws for invalid base64', () => {
    const invalidBase64 = 'invalid_base64!'
    expect(() => validateBase64JSON(invalidBase64, StringArraySchema)).toThrow('Invalid character')
  })

  test('throws for valid base64 but invalid JSON', () => {
    const base64 = btoa('invalid json')
    expect(() => validateBase64JSON(base64, StringArraySchema)).toThrow(
      'Invalid base64 JSON syntax'
    )
  })

  test('throws for valid base64 and JSON but invalid schema', () => {
    const base64 = btoa('{"key": "value"}')
    expect(() => validateBase64JSON(base64, StringArraySchema)).toThrow('Invalid base64 JSON')
  })
})

// parseJSON5Safely tests removed - functionality moved to config-parser.ts
