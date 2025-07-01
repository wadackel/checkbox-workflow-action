import { z } from 'zod'

/**
 * Schema for checkbox configuration value - either string or object with label
 */
const CheckboxConfigValueSchema = z.union([
  z.string().min(1, 'Label must not be empty'),
  z
    .object({
      label: z.string().min(1, 'Label must not be empty'),
    })
    .passthrough(), // Allow additional properties
])

/**
 * Schema for individual checkbox configuration item
 * Must have exactly one key-value pair
 */
export const CheckboxConfigItemSchema = z
  .record(z.string().min(1, 'Key must not be empty'), CheckboxConfigValueSchema)
  .refine((obj) => Object.keys(obj).length === 1, {
    message: 'Each config item must have exactly one key-value pair',
  })

/**
 * Schema for checkbox configuration array
 */
export const CheckboxConfigSchema = z
  .array(CheckboxConfigItemSchema)
  .min(1, 'Config must contain at least one item')

/**
 * Schema for checkbox state (key-boolean map)
 */
export const CheckboxStateSchema = z.record(z.string(), z.boolean())

/**
 * Schema for action input parameters
 */
export const ActionInputsSchema = z.object({
  id: z.string().min(1, 'ID must not be empty'),
  number: z.number().int().positive('Number must be a positive integer'),
  message: z.string(),
  config: z.string().optional(),
  forceChecked: z.string().optional(),
  body: z.boolean(),
  token: z.string().min(1, 'Token must not be empty'),
})

/**
 * Schema for action output parameters
 */
export const ActionOutputsSchema = z.object({
  retrieved: z.boolean(),
  changed: z.boolean(),
  state: CheckboxStateSchema,
  changes: z.array(z.string()),
  allChecked: z.boolean(),
  commentId: z.number().optional(),
})

/**
 * Schema for state metadata embedded in comments
 */
export const StateMetadataSchema = z.object({
  id: z.string().min(1),
  previousState: CheckboxStateSchema,
})

/**
 * Schema for parsed checkbox item from markdown
 */
export const ParsedCheckboxItemSchema = z.object({
  key: z.string().min(1),
  label: z.string(),
  checked: z.boolean(),
  indentation: z.string(),
  fullMatch: z.string(),
  index: z.number().int().nonnegative(),
})

/**
 * Schema for GitHub user object
 */
export const GitHubUserSchema = z.object({
  login: z.string(),
  id: z.number(),
  type: z.string(),
})

/**
 * Schema for GitHub comment response
 */
export const GitHubCommentSchema = z.object({
  id: z.number(),
  body: z.string(),
  html_url: z.string().url(),
  created_at: z.string(),
  updated_at: z.string(),
  user: GitHubUserSchema,
})

/**
 * Schema for GitHub issue/PR response
 */
export const GitHubIssueSchema = z.object({
  id: z.number(),
  number: z.number(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(['open', 'closed']),
  html_url: z.string().url(),
})

/**
 * Schema for GitHub issue/PR response with timestamps
 */
export const GitHubIssueWithTimestampSchema = GitHubIssueSchema.extend({
  updated_at: z.string(),
  created_at: z.string(),
})

/**
 * Schema for string array (used for checked parameter)
 */
export const StringArraySchema = z.array(z.string())

/**
 * Format Zod error messages in a user-friendly way
 */
export const formatZodError = (error: z.ZodError, context = 'input'): string => {
  const issues = error.issues.map((issue) => {
    const path = issue.path.length > 0 ? `[${issue.path.join(' → ')}] ` : ''
    return `  ${path}${issue.message}`
  })
  return `Invalid ${context}:\n${issues.join('\n')}`
}

/**
 * Utility function to safely parse JSON with schema validation
 */
export const parseJSONSafely = <T>(input: string, schema: z.ZodSchema<T>, context = 'JSON'): T => {
  try {
    const parsed = JSON.parse(input)
    return schema.parse(parsed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(formatZodError(error, context))
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid ${context} syntax: ${error.message}`)
    }
    throw new Error(
      `Failed to parse ${context}: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Utility function to safely decode base64 and parse JSON with schema validation
 */
export const validateBase64JSON = <T>(
  input: string,
  schema: z.ZodSchema<T>,
  context = 'base64 JSON'
): T => {
  try {
    const decoded = atob(input)
    return parseJSONSafely(decoded, schema, context)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Invalid')) {
      throw error // Re-throw validation errors as-is
    }
    throw new Error(
      `Invalid ${context}: Failed to decode base64 - ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

// parseJSON5Safely function is removed - use JSON5 directly in config-parser.ts

// Type exports derived from schemas
export type CheckboxConfigItem = z.infer<typeof CheckboxConfigItemSchema>
export type CheckboxConfig = z.infer<typeof CheckboxConfigSchema>
export type CheckboxState = z.infer<typeof CheckboxStateSchema>
export type ActionInputs = z.infer<typeof ActionInputsSchema>
export type ActionOutputs = z.infer<typeof ActionOutputsSchema>
export type StateMetadata = z.infer<typeof StateMetadataSchema>
export type ParsedCheckboxItem = z.infer<typeof ParsedCheckboxItemSchema>
export type GitHubComment = z.infer<typeof GitHubCommentSchema>
export type GitHubIssue = z.infer<typeof GitHubIssueSchema>
export type GitHubIssueWithTimestamp = z.infer<typeof GitHubIssueWithTimestampSchema>
