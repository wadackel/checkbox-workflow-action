import { describe, test, expect } from 'vitest'
import { parseConfig, extractKeyAndLabel, extractConfigPairs } from './config-parser.js'

describe('parseConfig', () => {
  test('parses valid JSON5 array', () => {
    const config = `[
      {"key1": "label1"},
      {"key2": "label2", },
    ]`

    const result = parseConfig(config)
    expect(result).toEqual([{ key1: 'label1' }, { key2: 'label2' }])
  })

  test('throws error for non-array', () => {
    expect(() => parseConfig('{"key": "value"}')).toThrow('Invalid checkbox configuration')
  })

  test('throws error for invalid JSON5', () => {
    expect(() => parseConfig('invalid json')).toThrow('Invalid checkbox configuration syntax')
  })

  test('throws error for empty array', () => {
    expect(() => parseConfig('[]')).toThrow('Config must contain at least one item')
  })

  test('throws error for array with invalid items', () => {
    expect(() => parseConfig('[{"key1": ""}, {"key2": "valid"}]')).toThrow(
      'Label must not be empty'
    )
  })

  test('throws error for items with multiple keys', () => {
    expect(() => parseConfig('[{"key1": "label1", "key2": "label2"}]')).toThrow(
      'exactly one key-value pair'
    )
  })

  test('throws error for items with empty key', () => {
    expect(() => parseConfig('[{"": "label1"}]')).toThrow('Key must not be empty')
  })
})

describe('extractKeyAndLabel', () => {
  test('extracts key and label from string value', () => {
    const item = { key1: 'label1' }
    const result = extractKeyAndLabel(item)
    expect(result).toEqual({ key: 'key1', label: 'label1' })
  })

  test('extracts key and label from object value', () => {
    const item = { key1: { label: 'label1', other: 'value' } }
    const result = extractKeyAndLabel(item)
    expect(result).toEqual({ key: 'key1', label: 'label1' })
  })

  test('throws error for multiple keys', () => {
    const item = { key1: 'label1', key2: 'label2' }
    expect(() => extractKeyAndLabel(item)).toThrow('exactly one key-value pair')
  })

  test('throws error for invalid value format', () => {
    const item = { key1: 123 }
    expect(() => extractKeyAndLabel(item as any)).toThrow('Invalid input')
  })

  test('throws error for object without label property', () => {
    const item = { key1: { other: 'value' } }
    expect(() => extractKeyAndLabel(item as any)).toThrow('Required')
  })

  test('throws error for object with empty label', () => {
    const item = { key1: { label: '' } }
    expect(() => extractKeyAndLabel(item)).toThrow('Label must not be empty')
  })

  test('throws error for empty key', () => {
    const item = { '': 'label' }
    expect(() => extractKeyAndLabel(item)).toThrow('Key must not be empty')
  })
})

describe('extractConfigPairs', () => {
  test('extracts pairs from config array', () => {
    const config = [{ key1: 'label1' }, { key2: { label: 'label2' } }]

    const result = extractConfigPairs(config)
    expect(result).toEqual([
      { key: 'key1', label: 'label1' },
      { key: 'key2', label: 'label2' },
    ])
  })
})
