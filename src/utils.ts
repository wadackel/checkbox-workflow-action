import { parseCheckboxes } from './checkbox-parser.js'
import { htmlCommentUtils } from './html-comments.js'

/**
 * Restore key-label pairs from existing markdown
 */
export const extractPairsFromExistingMarkdown = (
  markdown: string
): Array<{ key: string; label: string }> => {
  const parsedItems = parseCheckboxes(markdown)

  return parsedItems.map((item) => ({
    key: item.key,
    label: item.label,
  }))
}

/**
 * Check if string is valid JSON
 */
export const isValidJSON = (str: string): boolean => {
  try {
    JSON.parse(str)
    return true
  } catch {
    return false
  }
}

/**
 * Restore message template from existing markdown
 * Replace checkbox section wrapped in markers with {{body}} placeholder
 * Remove managed prefix for workflow execution control
 */
export const extractMessageFromExistingMarkdown = (markdown: string): string => {
  // Remove managed prefix (supports both new and legacy formats)
  const withoutManagedPrefix = htmlCommentUtils.removeManagedPrefix(markdown)

  // Remove metadata comments (supports both new and legacy formats)
  const withoutMetadata = htmlCommentUtils.removeMetadataComments(withoutManagedPrefix)

  // Replace section wrapped in markers with {{body}} (supports both new and legacy formats)
  const restored = htmlCommentUtils.replaceBodySectionWithPlaceholder(withoutMetadata)

  return restored.trim()
}
