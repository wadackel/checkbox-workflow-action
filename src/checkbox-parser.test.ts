import { describe, test, expect } from 'vitest'
import {
  parseCheckboxes,
  createStateFromParsed,
  extractStateFromMarkdown,
  hasStateChanged,
  applyForcedCheckedState,
} from './checkbox-parser.js'

describe('parseCheckboxes', () => {
  test('parses checkboxes with HTML comments', () => {
    const markdown = `
- [x] <!-- key1 --> Task 1
- [ ] <!-- key2 --> Task 2
  - [X] <!-- key3 --> Nested task
`

    const result = parseCheckboxes(markdown)
    expect(result).toHaveLength(3)

    // Note: The first match includes a newline in indentation
    expect(result[0]).toEqual(
      expect.objectContaining({
        key: 'key1',
        label: 'Task 1',
        checked: true,
        indentation: '\n',
      })
    )

    expect(result[1]).toEqual(
      expect.objectContaining({
        key: 'key2',
        label: 'Task 2',
        checked: false,
        indentation: '',
      })
    )

    expect(result[2]).toEqual(
      expect.objectContaining({
        key: 'key3',
        label: 'Nested task',
        checked: true,
        indentation: '  ',
      })
    )
  })

  test('returns empty array for no matches', () => {
    const markdown = `
# Header
Some text without checkboxes
- Regular list item
`

    const result = parseCheckboxes(markdown)
    expect(result).toEqual([])
  })
})

describe('createStateFromParsed', () => {
  test('creates state object from parsed items', () => {
    const parsedItems = [
      { key: 'key1', checked: true } as any,
      { key: 'key2', checked: false } as any,
      { key: 'key3', checked: true } as any,
    ]

    const result = createStateFromParsed(parsedItems)
    expect(result).toEqual({
      key1: true,
      key2: false,
      key3: true,
    })
  })
})

describe('extractStateFromMarkdown', () => {
  test('extracts state directly from markdown', () => {
    const markdown = `
- [x] <!-- key1 --> Task 1
- [ ] <!-- key2 --> Task 2
`

    const result = extractStateFromMarkdown(markdown)
    expect(result).toEqual({
      key1: true,
      key2: false,
    })
  })
})

describe('hasStateChanged', () => {
  test('returns true when state changes', () => {
    const previous = { key1: false, key2: true }
    const current = { key1: true, key2: true }

    expect(hasStateChanged(previous, current)).toBe(true)
  })

  test('returns false when state is unchanged', () => {
    const previous = { key1: true, key2: false }
    const current = { key1: true, key2: false }

    expect(hasStateChanged(previous, current)).toBe(false)
  })

  test('returns true when previous state is null', () => {
    const current = { key1: true }

    expect(hasStateChanged(null, current)).toBe(true)
  })

  test('returns true when key count differs', () => {
    const previous = { key1: true }
    const current = { key1: true, key2: false }

    expect(hasStateChanged(previous, current)).toBe(true)
  })
})

describe('applyForcedCheckedState', () => {
  test('applies forced checked state', () => {
    const original = { key1: true, key2: true, key3: false }
    const forced = ['key2', 'key3']

    const result = applyForcedCheckedState(original, forced)
    expect(result).toEqual({
      key1: false,
      key2: true,
      key3: true,
    })
  })

  test('ignores non-existent keys', () => {
    const original = { key1: true, key2: false }
    const forced = ['key1', 'nonexistent']

    const result = applyForcedCheckedState(original, forced)
    expect(result).toEqual({
      key1: true,
      key2: false,
    })
  })
})
