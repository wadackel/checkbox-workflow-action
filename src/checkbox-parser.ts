import type { ParsedCheckboxItem, CheckboxState } from './schemas.js'

/**
 * Parse checkboxes from markdown
 * Format: - [x] <!-- key --> label
 */
export const parseCheckboxes = (markdown: string): ParsedCheckboxItem[] => {
  // Regular expression to detect checkboxes with HTML comments
  const checkboxPattern = /^(\s*)- \[([ xX])\]\s*<!--\s*(.+?)\s*-->\s*(.*)$/gm
  const results: ParsedCheckboxItem[] = []
  let match: RegExpExecArray | null

  while ((match = checkboxPattern.exec(markdown)) !== null) {
    results.push({
      fullMatch: match[0] || '',
      indentation: match[1] || '',
      checked: match[2]?.toLowerCase() === 'x',
      key: match[3]?.trim() || '',
      label: match[4]?.trim() || '',
      index: match.index || 0,
    })
  }

  return results
}

/**
 * Generate state object from parsed checkboxes
 */
export const createStateFromParsed = (parsedItems: ParsedCheckboxItem[]): CheckboxState => {
  const state: CheckboxState = {}

  for (const item of parsedItems) {
    state[item.key] = item.checked
  }

  return state
}

/**
 * Extract state object directly from markdown
 */
export const extractStateFromMarkdown = (markdown: string): CheckboxState => {
  const parsedItems = parseCheckboxes(markdown)
  return createStateFromParsed(parsedItems)
}

/**
 * Compare two states to determine if there are changes
 */
export const hasStateChanged = (
  previousState: CheckboxState | null,
  currentState: CheckboxState
): boolean => {
  if (!previousState) {
    return true
  }

  const previousKeys = Object.keys(previousState)
  const currentKeys = Object.keys(currentState)

  // Changes exist if the number of keys differs
  if (previousKeys.length !== currentKeys.length) {
    return true
  }

  // Compare values for each key
  for (const key of currentKeys) {
    if (previousState[key] !== currentState[key]) {
      return true
    }
  }

  return false
}

/**
 * Forcefully check/uncheck checkboxes for specified keys
 */
export const applyForcedCheckedState = (
  originalState: CheckboxState,
  forcedCheckedKeys: string[]
): CheckboxState => {
  const newState = { ...originalState }

  // Reset all keys to false once
  for (const key of Object.keys(newState)) {
    newState[key] = false
  }

  // Set only specified keys to true
  for (const key of forcedCheckedKeys) {
    if (key in newState) {
      newState[key] = true
    }
  }

  return newState
}
