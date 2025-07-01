import { StateMetadataSchema, validateBase64JSON, type CheckboxState } from './schemas.js'
import { HTML_COMMENTS, htmlCommentUtils } from './html-comments.js'

/**
 * Generate checkbox markdown from array of keys and labels
 */
export const renderCheckboxes = (
  pairs: Array<{ key: string; label: string }>,
  checkedKeys: Set<string> = new Set()
): string => {
  return pairs
    .map(({ key, label }) => {
      const checked = checkedKeys.has(key) ? 'x' : ' '
      return `- [${checked}] ${HTML_COMMENTS.ITEM(key)} ${label}`
    })
    .join('\n')
}

/**
 * Replace {{body}} in message template with checkboxes
 * Wrap checkbox section with markers for later extraction
 * Add managed prefix for workflow execution control
 */
export const renderMessage = (template: string, checkboxesMarkdown: string): string => {
  const managedPrefix = htmlCommentUtils.createManagedPrefix()
  const markedCheckboxes = htmlCommentUtils.createBodySection(checkboxesMarkdown)
  const content = template.replace(/\{\{body\}\}/g, markedCheckboxes)
  return `${managedPrefix}${content}`
}

/**
 * Regenerate markdown based on checkbox state
 */
export const rerenderCheckboxes = (
  pairs: Array<{ key: string; label: string }>,
  state: CheckboxState
): string => {
  const checkedKeys = new Set(
    Object.entries(state)
      .filter(([, checked]) => checked)
      .map(([key]) => key)
  )

  return renderCheckboxes(pairs, checkedKeys)
}

/**
 * Generate comment with state metadata
 */
export const generateCommentWithMetadata = (
  messageContent: string,
  actionId: string,
  state: CheckboxState
): string => {
  const stateMetadata = {
    id: actionId,
    previousState: state,
  }
  const metadata = htmlCommentUtils.createStateMetadata(actionId, stateMetadata)
  return `${messageContent}\n\n${metadata}`
}

/**
 * Extract state metadata from comment with validation
 */
export const extractMetadataFromComment = (
  commentBody: string,
  actionId: string
): CheckboxState | null => {
  const encodedData = htmlCommentUtils.extractStateMetadata(commentBody, actionId)
  if (!encodedData) {
    return null
  }

  try {
    const metadata = validateBase64JSON(encodedData, StateMetadataSchema, 'comment metadata')
    return metadata.previousState
  } catch {
    return null
  }
}
