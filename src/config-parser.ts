import JSON5 from 'json5'
import { z } from 'zod'
import {
  CheckboxConfigSchema,
  CheckboxConfigItemSchema,
  formatZodError,
  type CheckboxConfig,
  type CheckboxConfigItem,
} from './schemas.js'

/**
 * Parse JSON5 format config string with schema validation
 */
export const parseConfig = (configString: string): CheckboxConfig => {
  try {
    const parsed = JSON5.parse(configString)
    return CheckboxConfigSchema.parse(parsed)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(formatZodError(error, 'checkbox configuration'))
    }
    if (error instanceof SyntaxError) {
      throw new Error(`Invalid checkbox configuration syntax: ${error.message}`)
    }
    throw new Error(
      `Failed to parse checkbox configuration: ${error instanceof Error ? error.message : 'Unknown error'}`
    )
  }
}

/**
 * Extract key and label from configuration item with validation
 */
export const extractKeyAndLabel = (item: CheckboxConfigItem): { key: string; label: string } => {
  // Validate the item structure using schema
  const validatedItem = CheckboxConfigItemSchema.parse(item)

  const entries = Object.entries(validatedItem)
  const [key, value] = entries[0]!

  if (typeof value === 'string') {
    return { key, label: value }
  }

  // At this point, we know value is an object with label due to schema validation
  return { key, label: (value as { label: string }).label }
}

/**
 * Extract key-label pairs from configuration array
 */
export const extractConfigPairs = (
  config: CheckboxConfig
): Array<{ key: string; label: string }> => {
  return config.map(extractKeyAndLabel)
}
