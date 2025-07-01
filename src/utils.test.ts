import { describe, test, expect } from 'vitest'
import {
  extractPairsFromExistingMarkdown,
  extractMessageFromExistingMarkdown,
  isValidJSON,
} from './utils.js'

describe('extractPairsFromExistingMarkdown', () => {
  test('Can extract key-label pairs from checkboxes', () => {
    const markdown = `
# Test Message

- [ ] <!-- task1 --> First task
- [x] <!-- task2 --> Second task

Some other content
`

    const result = extractPairsFromExistingMarkdown(markdown)
    expect(result).toEqual([
      { key: 'task1', label: 'First task' },
      { key: 'task2', label: 'Second task' },
    ])
  })

  test('Returns empty array when there are no checkboxes', () => {
    const markdown = 'No checkboxes here'
    const result = extractPairsFromExistingMarkdown(markdown)
    expect(result).toEqual([])
  })
})

describe('extractMessageFromExistingMarkdown', () => {
  test('Can replace checkbox section wrapped in markers with {{body}} placeholder and remove managed prefix', () => {
    const markdown = `<!-- checkbox-workflow-action:managed -->
# 🚀 Automated Tasks

Please check off the tasks below as they are completed:

<!-- checkbox-workflow-action:body-start -->
- [ ] <!-- format --> Run code formatting
- [x] <!-- lint --> Run linting checks
- [ ] <!-- test --> Run unit tests
<!-- checkbox-workflow-action:body-end -->

---
_This checklist was generated automatically by [checkbox-comment-action](https://github.com/wadackel/checkbox-comment-action)_

<!-- checkbox-workflow-action:state:tasks:eyJmb3JtYXQiOmZhbHNlLCJsaW50Ijp0cnVlLCJ0ZXN0IjpmYWxzZX0= -->`

    const result = extractMessageFromExistingMarkdown(markdown)
    expect(result).toBe(`# 🚀 Automated Tasks

Please check off the tasks below as they are completed:

{{body}}

---
_This checklist was generated automatically by [checkbox-comment-action](https://github.com/wadackel/checkbox-comment-action)_`)
  })

  test('Returns {{body}} placeholder when only checkboxes exist', () => {
    const markdown = `<!-- checkbox-workflow-action:body-start -->
- [ ] <!-- task1 --> Task 1
- [x] <!-- task2 --> Task 2
<!-- checkbox-workflow-action:body-end -->
<!-- checkbox-workflow-action:state:test:eyJ0YXNrMSI6ZmFsc2UsInRhc2syIjp0cnVlfQ== -->`

    const result = extractMessageFromExistingMarkdown(markdown)
    expect(result).toBe('{{body}}')
  })

  test('Returns message as-is when no markers exist', () => {
    const markdown = `# Simple Message

This is just a message without checkboxes.

<!-- checkbox-workflow-action:state:test:eyJ9 -->`

    const result = extractMessageFromExistingMarkdown(markdown)
    expect(result).toBe(`# Simple Message

This is just a message without checkboxes.`)
  })

  test('Can correctly process when markers are at the end of document', () => {
    const markdown = `# Header

Some content above checkboxes:

<!-- checkbox-workflow-action:body-start -->
- [ ] <!-- task1 --> Task 1
- [x] <!-- task2 --> Task 2
<!-- checkbox-workflow-action:body-end -->

<!-- checkbox-workflow-action:state:test:eyJ0YXNrMSI6ZmFsc2UsInRhc2syIjp0cnVlfQ== -->`

    const result = extractMessageFromExistingMarkdown(markdown)
    expect(result).toBe(`# Header

Some content above checkboxes:

{{body}}`)
  })

  test('Actual issue case: original template is correctly restored', () => {
    const realCaseMarkdown = `# 🚀 Automated Tasks

Please check off the tasks below as they are completed:

<!-- checkbox-workflow-action:body-start -->
- [ ] <!-- format --> Run code formatting
- [ ] <!-- lint --> Run linting checks
- [ ] <!-- test --> Run unit tests
- [ ] <!-- e2e --> Run E2E tests
- [ ] <!-- review --> Code review completed
<!-- checkbox-workflow-action:body-end -->

---
_This checklist was generated automatically by [checkbox-comment-action](https://github.com/wadackel/checkbox-comment-action)_

<!-- checkbox-workflow-action:state:tasks:eyJmb3JtYXQiOmZhbHNlLCJsaW50IjpmYWxzZSwidGVzdCI6ZmFsc2UsImUyZSI6ZmFsc2UsInJldmlldyI6ZmFsc2V9 -->`

    const result = extractMessageFromExistingMarkdown(realCaseMarkdown)
    // Also test extractPairsFromExistingMarkdown for completeness
    extractPairsFromExistingMarkdown(realCaseMarkdown)

    expect(result).toBe(`# 🚀 Automated Tasks

Please check off the tasks below as they are completed:

{{body}}

---
_This checklist was generated automatically by [checkbox-comment-action](https://github.com/wadackel/checkbox-comment-action)_`)
  })

  test('Debug: simulate actual processing flow', async () => {
    // Import required functions
    const { rerenderCheckboxes, renderMessage } = await import('./checkbox-renderer.js')

    const realCaseMarkdown = `# 🚀 Automated Tasks

Please check off the tasks below as they are completed:

<!-- checkbox-workflow-action:body-start -->
- [ ] <!-- format --> Run code formatting
- [ ] <!-- lint --> Run linting checks
- [ ] <!-- test --> Run unit tests
- [ ] <!-- e2e --> Run E2E tests
- [ ] <!-- review --> Code review completed
<!-- checkbox-workflow-action:body-end -->

---
_This checklist was generated automatically by [checkbox-comment-action](https://github.com/wadackel/checkbox-comment-action)_

<!-- checkbox-workflow-action:state:tasks:eyJpZCI6InRhc2tzIiwicHJldmlvdXNTdGF0ZSI6eyJmb3JtYXQiOmZhbHNlLCJsaW50IjpmYWxzZSwidGVzdCI6ZmFsc2UsImUyZSI6ZmFsc2UsInJldmlldyI6ZmFsc2V9fQ== -->`

    // Simulate the actual process
    const pairs = extractPairsFromExistingMarkdown(realCaseMarkdown)
    const finalState = { format: false, lint: false, test: false, e2e: false, review: false }
    const checkboxesMarkdown = rerenderCheckboxes(pairs, finalState)
    const extractedMessage = extractMessageFromExistingMarkdown(realCaseMarkdown)
    const messageContent = renderMessage(extractedMessage, checkboxesMarkdown)

    // Test if the final message content contains the original template and managed prefix
    expect(messageContent).toContain('<!-- checkbox-workflow-action:managed -->')
    expect(messageContent).toContain('🚀 Automated Tasks')
    expect(messageContent).toContain('Please check off the tasks below')
    expect(messageContent).toContain('_This checklist was generated automatically')
  })
})

describe('isValidJSON', () => {
  test('Returns true for valid JSON', () => {
    expect(isValidJSON('{"key": "value"}')).toBe(true)
    expect(isValidJSON('[]')).toBe(true)
    expect(isValidJSON('null')).toBe(true)
    expect(isValidJSON('123')).toBe(true)
    expect(isValidJSON('"string"')).toBe(true)
  })

  test('Returns false for invalid JSON', () => {
    expect(isValidJSON('invalid json')).toBe(false)
    expect(isValidJSON('{"key": value}')).toBe(false)
    expect(isValidJSON('{key: "value"}')).toBe(false)
    expect(isValidJSON('')).toBe(false)
  })
})
