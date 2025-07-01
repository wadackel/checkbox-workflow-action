/**
 * Unified HTML comment format constants and utilities
 */

// Base prefix for all HTML comments
const BASE_PREFIX = 'checkbox-workflow-action'

/**
 * HTML comment types
 */
export const HTML_COMMENTS = {
  // Management flag to identify managed content
  MANAGED: `<!-- ${BASE_PREFIX}:managed -->`,

  // Section markers for {{body}} content
  BODY_START: `<!-- ${BASE_PREFIX}:body-start -->`,
  BODY_END: `<!-- ${BASE_PREFIX}:body-end -->`,

  // State metadata generators
  STATE: (actionId: string, data: string) => `<!-- ${BASE_PREFIX}:state:${actionId}:${data} -->`,

  // Checkbox item marker (simple format for {{body}} content)
  ITEM: (key: string) => `<!-- ${key} -->`,
} as const

/**
 * Regular expression patterns for parsing HTML comments
 */
export const HTML_COMMENT_PATTERNS = {
  // Management flag pattern
  MANAGED: new RegExp(`<!-- ${BASE_PREFIX}:managed -->`),

  // Body section patterns
  BODY_SECTION: new RegExp(
    `<!-- ${BASE_PREFIX}:body-start -->.*?<!-- ${BASE_PREFIX}:body-end -->`,
    's'
  ),

  // State metadata pattern
  STATE: (actionId: string) =>
    new RegExp(
      `<!-- ${BASE_PREFIX}:state:${actionId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}:([^\\s]+) -->`
    ),

  // Checkbox item pattern
  ITEM: /^(\s*)- \[([ xX])\]\s*<!--\s*(.+?)\s*-->\s*(.*)$/gm,
} as const

/**
 * Utility functions for HTML comment operations
 */
export const htmlCommentUtils = {
  /**
   * Create managed content prefix
   */
  createManagedPrefix: (): string => `${HTML_COMMENTS.MANAGED}\n`,

  /**
   * Create body section with content
   */
  createBodySection: (content: string): string =>
    `${HTML_COMMENTS.BODY_START}\n${content}\n${HTML_COMMENTS.BODY_END}`,

  /**
   * Create state metadata comment
   */
  createStateMetadata: (actionId: string, data: object): string => {
    const encodedData = btoa(JSON.stringify(data))
    return HTML_COMMENTS.STATE(actionId, encodedData)
  },

  /**
   * Extract state metadata
   */
  extractStateMetadata: (content: string, actionId: string): string | null => {
    const match = content.match(HTML_COMMENT_PATTERNS.STATE(actionId))
    return match && match[1] ? match[1] : null
  },

  /**
   * Replace body section with placeholder
   */
  replaceBodySectionWithPlaceholder: (content: string): string => {
    return content.replace(HTML_COMMENT_PATTERNS.BODY_SECTION, '{{body}}')
  },

  /**
   * Remove managed prefix
   */
  removeManagedPrefix: (content: string): string => {
    return content.replace(HTML_COMMENT_PATTERNS.MANAGED, '').trim()
  },

  /**
   * Remove all metadata comments
   */
  removeMetadataComments: (content: string): string => {
    return content.replace(new RegExp(`<!-- ${BASE_PREFIX}:state:[^>]*-->`, 'g'), '').trim()
  },
} as const
