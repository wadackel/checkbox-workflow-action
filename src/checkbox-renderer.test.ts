import { describe, test, expect } from 'vitest'
import {
  renderCheckboxes,
  renderMessage,
  rerenderCheckboxes,
  generateCommentWithMetadata,
  extractMetadataFromComment,
} from './checkbox-renderer.js'

describe('renderCheckboxes', () => {
  test('renders checkboxes with HTML comments', () => {
    const pairs = [
      { key: 'key1', label: 'Task 1' },
      { key: 'key2', label: 'Task 2' },
    ]
    const checkedKeys = new Set(['key1'])

    const result = renderCheckboxes(pairs, checkedKeys)
    expect(result).toBe(`- [x] <!-- key1 --> Task 1
- [ ] <!-- key2 --> Task 2`)
  })

  test('renders all unchecked when no checked keys', () => {
    const pairs = [
      { key: 'key1', label: 'Task 1' },
      { key: 'key2', label: 'Task 2' },
    ]

    const result = renderCheckboxes(pairs)
    expect(result).toBe(`- [ ] <!-- key1 --> Task 1
- [ ] <!-- key2 --> Task 2`)
  })
})

describe('renderMessage', () => {
  test('replaces {{body}} with checkboxes wrapped in markers and adds managed prefix', () => {
    const template = `# Header

{{body}}

Footer`
    const checkboxes = `- [x] <!-- key1 --> Task 1
- [ ] <!-- key2 --> Task 2`

    const result = renderMessage(template, checkboxes)
    expect(result).toBe(`<!-- checkbox-workflow-action:managed -->
# Header

<!-- checkbox-workflow-action:body-start -->
- [x] <!-- key1 --> Task 1
- [ ] <!-- key2 --> Task 2
<!-- checkbox-workflow-action:body-end -->

Footer`)
  })

  test('handles multiple {{body}} replacements with markers and adds managed prefix', () => {
    const template = `{{body}} and {{body}}`
    const checkboxes = `- [ ] Task`

    const result = renderMessage(template, checkboxes)
    expect(result).toBe(`<!-- checkbox-workflow-action:managed -->
<!-- checkbox-workflow-action:body-start -->
- [ ] Task
<!-- checkbox-workflow-action:body-end --> and <!-- checkbox-workflow-action:body-start -->
- [ ] Task
<!-- checkbox-workflow-action:body-end -->`)
  })
})

describe('rerenderCheckboxes', () => {
  test('rerenders checkboxes based on state', () => {
    const pairs = [
      { key: 'key1', label: 'Task 1' },
      { key: 'key2', label: 'Task 2' },
    ]
    const state = { key1: false, key2: true }

    const result = rerenderCheckboxes(pairs, state)
    expect(result).toBe(`- [ ] <!-- key1 --> Task 1
- [x] <!-- key2 --> Task 2`)
  })
})

describe('generateCommentWithMetadata', () => {
  test('adds metadata to comment', () => {
    const content = 'Comment content'
    const actionId = 'test-id'
    const state = { key1: true, key2: false }

    const result = generateCommentWithMetadata(content, actionId, state)

    expect(result).toContain('Comment content')
    expect(result).toContain(`<!-- checkbox-workflow-action:state:${actionId}:`)
    expect(result).toMatch(/<!-- checkbox-workflow-action:state:test-id:[A-Za-z0-9+/]+=* -->/)
  })
})

describe('extractMetadataFromComment', () => {
  test('extracts metadata from comment', () => {
    const state = { key1: true, key2: false }
    const actionId = 'test-id'
    const encodedMetadata = btoa(JSON.stringify({ id: actionId, previousState: state }))
    const comment = `Content\n\n<!-- checkbox-workflow-action:state:${actionId}:${encodedMetadata} -->`

    const result = extractMetadataFromComment(comment, actionId)
    expect(result).toEqual(state)
  })

  test('returns null for non-matching ID', () => {
    const comment = `Content\n\n<!-- checkbox-workflow-action:state:other-id:dGVzdA== -->`

    const result = extractMetadataFromComment(comment, 'test-id')
    expect(result).toBeNull()
  })

  test('returns null for invalid base64', () => {
    const comment = `Content\n\n<!-- checkbox-workflow-action:state:test-id:invalid-base64 -->`

    const result = extractMetadataFromComment(comment, 'test-id')
    expect(result).toBeNull()
  })

  test('returns null when no metadata found', () => {
    const comment = 'Just regular content'

    const result = extractMetadataFromComment(comment, 'test-id')
    expect(result).toBeNull()
  })
})
