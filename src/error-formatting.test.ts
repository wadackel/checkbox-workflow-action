import { describe, test, expect } from 'vitest'
import { parseConfig } from './config-parser.js'
import { parseJSONSafely, StringArraySchema } from './schemas.js'

describe('Error message formatting', () => {
  test('config validation errors are user-friendly', () => {
    // Empty array
    expect(() => parseConfig('[]')).toThrow(
      'Invalid checkbox configuration:\n  Config must contain at least one item'
    )

    // Invalid type
    expect(() => parseConfig('{"not": "array"}')).toThrow(
      'Invalid checkbox configuration:\n  Expected array, received object'
    )

    // Empty label
    expect(() => parseConfig('[{"task1": ""}]')).toThrow(
      'Invalid checkbox configuration:\n  [0 → task1] Label must not be empty'
    )

    // Multiple keys
    expect(() => parseConfig('[{"task1": "Label 1", "task2": "Label 2"}]')).toThrow(
      'Invalid checkbox configuration:\n  [0] Each config item must have exactly one key-value pair'
    )

    // Complex error with path
    expect(() => parseConfig('[{"task1": {"priority": "high"}}]')).toThrow(
      /Invalid checkbox configuration:\n.*\[0 → task1\].*/
    )
  })

  test('checked parameter validation errors are user-friendly', () => {
    // Not an array
    expect(() =>
      parseJSONSafely('{"task1": true}', StringArraySchema, 'checked parameter')
    ).toThrow('Invalid checked parameter:\n  Expected array, received object')

    // Contains non-string
    expect(() =>
      parseJSONSafely('["task1", 123, "task3"]', StringArraySchema, 'checked parameter')
    ).toThrow('Invalid checked parameter:\n  [1] Expected string, received number')
  })

  test('JSON syntax errors remain clear', () => {
    expect(() => parseConfig('invalid json')).toThrow(
      "Invalid checkbox configuration syntax: JSON5: invalid character 'i' at 1:1"
    )

    expect(() => parseJSONSafely('invalid json', StringArraySchema)).toThrow(
      'Invalid JSON syntax: Unexpected token'
    )
  })
})
