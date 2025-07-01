import * as core from '@actions/core'
import * as github from '@actions/github'
import { createCommentManager, type CommentManager } from './comment-manager.js'
import { parseConfig, extractConfigPairs } from './config-parser.js'
import {
  extractStateFromMarkdown,
  hasStateChanged,
  applyForcedCheckedState,
} from './checkbox-parser.js'
import {
  renderMessage,
  generateCommentWithMetadata,
  extractMetadataFromComment,
  rerenderCheckboxes,
} from './checkbox-renderer.js'
import { extractPairsFromExistingMarkdown, extractMessageFromExistingMarkdown } from './utils.js'
import { z } from 'zod'
import {
  ActionInputsSchema,
  StringArraySchema,
  parseJSONSafely,
  formatZodError,
  type ActionInputs,
  type ActionOutputs,
  type CheckboxState,
} from './schemas.js'
import { getInputs as getRawInputs } from './inputs.js'

const getInputs = (): ActionInputs => {
  // Get raw inputs from auto-generated function
  const raw = getRawInputs()

  // Convert raw inputs to the expected format
  const converted = {
    id: raw.id,
    number: parseInt(raw.number, 10),
    message: raw.message || '',
    config: raw.config ?? undefined,
    forceChecked: raw['force-checked'] ?? undefined,
    body: raw.body === 'true',
    token: raw.token,
  }

  // Validate inputs using schema
  try {
    return ActionInputsSchema.parse(converted)
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(formatZodError(error, 'action inputs'))
    }
    throw new Error(
      `Invalid action inputs: ${error instanceof Error ? error.message : 'Unknown validation error'}`
    )
  }
}

const getChangedKeys = (previousState: CheckboxState, currentState: CheckboxState): string[] => {
  const allKeys = new Set([...Object.keys(previousState), ...Object.keys(currentState)])
  const changedKeys: string[] = []

  for (const key of allKeys) {
    const prevValue = previousState[key] ?? false
    const currValue = currentState[key] ?? false

    if (prevValue !== currValue) {
      changedKeys.push(key)
    }
  }

  return changedKeys
}

const getAllCheckedStatus = (state: CheckboxState): boolean => {
  const values = Object.values(state)
  return values.length > 0 && values.every((value) => value === true)
}

const setOutputs = (outputs: ActionOutputs): void => {
  core.setOutput('retrieved', outputs.retrieved.toString())
  core.setOutput('changed', outputs.changed.toString())
  core.setOutput('state', JSON.stringify(outputs.state))
  core.setOutput('changes', JSON.stringify(outputs.changes))
  core.setOutput('all-checked', outputs.allChecked.toString())
  if (outputs.commentId) {
    core.setOutput('comment-id', outputs.commentId.toString())
  }
}

const run = async (): Promise<void> => {
  try {
    const inputs = getInputs()
    const commentManager = createCommentManager(inputs.token)

    core.info(`Starting action for ID: ${inputs.id}, Issue: #${inputs.number}`)
    core.debug(
      `Mode: ${inputs.config ? 'config' : 'detection'}, Target: ${inputs.body ? 'issue body' : 'comment'}`
    )

    // When config exists, new creation or forced update mode
    if (inputs.config) {
      await handleConfigMode(inputs, commentManager)
    } else {
      // When config doesn't exist, state detection mode
      await handleDetectionMode(inputs, commentManager)
    }

    core.info('Action completed successfully')
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message)
    } else {
      core.setFailed('Unknown error occurred')
    }
  }
}

/**
 * Configuration mode: create new or update using config
 */
const handleConfigMode = async (
  inputs: ActionInputs,
  commentManager: CommentManager
): Promise<void> => {
  const config = parseConfig(inputs.config!)
  const pairs = extractConfigPairs(config)

  // Create initial state (all unchecked)
  const initialState: CheckboxState = {}
  for (const { key } of pairs) {
    initialState[key] = false
  }

  // Apply forcefully when checked specification exists
  let finalState = initialState
  if (inputs.forceChecked) {
    try {
      const checkedKeys = parseJSONSafely(
        inputs.forceChecked,
        StringArraySchema,
        'checked parameter'
      )
      finalState = applyForcedCheckedState(initialState, checkedKeys)
    } catch (error) {
      throw new Error(
        `Invalid checked parameter: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  }

  // Generate checkboxes
  const checkboxesMarkdown = rerenderCheckboxes(pairs, finalState)
  const messageContent = renderMessage(inputs.message, checkboxesMarkdown)
  const fullContent = generateCommentWithMetadata(messageContent, inputs.id, finalState)

  // Create/update comment or Issue body
  let commentId: number | undefined
  if (inputs.body) {
    const { issue } = await commentManager.createOrUpdateIssueBody(
      inputs.number,
      inputs.id,
      fullContent
    )
    core.info(`Issue body updated: ${issue.html_url}`)
  } else {
    const { comment } = await commentManager.createOrUpdateComment(
      inputs.number,
      inputs.id,
      fullContent
    )
    commentId = comment.id
    core.info(`Comment created/updated: ${comment.html_url}`)
  }

  setOutputs({
    retrieved: true, // In configuration mode, always successfully created/updated
    changed: false, // In configuration mode, no changes detected
    state: finalState,
    changes: [], // In configuration mode, no changes detected
    allChecked: getAllCheckedStatus(finalState),
    commentId,
  })
}

/**
 * Detection mode: detect state changes from existing comments
 */
const handleDetectionMode = async (
  inputs: ActionInputs,
  commentManager: CommentManager
): Promise<void> => {
  // Record the event timestamp for race condition detection
  const eventUpdatedAt = github.context.payload.issue?.['updated_at']
    ? new Date(github.context.payload.issue['updated_at'] as string)
    : new Date()

  core.debug(`Event timestamp: ${eventUpdatedAt.toISOString()}`)

  let existingContent: string | null = null
  let commentId: number | undefined

  // Get existing comment or Issue body
  if (inputs.body) {
    const issue = await commentManager.getIssue(inputs.number)
    existingContent = issue.body
  } else {
    const existingComment = await commentManager.findCommentById(inputs.number, inputs.id)
    if (existingComment) {
      existingContent = existingComment.body
      commentId = existingComment.id
    }
  }

  if (!existingContent) {
    core.info('No existing content found, nothing to detect')
    setOutputs({
      retrieved: false, // State not found
      changed: false,
      state: {},
      changes: [],
      allChecked: false, // Empty state means no checkboxes are checked
      commentId,
    })
    return
  }

  // Analyze current state
  const currentState = extractStateFromMarkdown(existingContent)

  // Get previous state
  const previousState = extractMetadataFromComment(existingContent, inputs.id)

  // Apply forcefully when checked specification exists
  let finalState = currentState
  let updatedPreviousState = previousState ?? {}

  if (inputs.forceChecked) {
    try {
      const checkedKeys = parseJSONSafely(
        inputs.forceChecked,
        StringArraySchema,
        'checked parameter'
      )
      finalState = applyForcedCheckedState(currentState, checkedKeys)

      // For forced updates, actually update comment/body
      // Restore key-label pairs from existing markdown
      const pairs = extractPairsFromExistingMarkdown(existingContent)
      const checkboxesMarkdown = rerenderCheckboxes(pairs, finalState)

      // If message is not specified, preserve existing message
      const trimmedMessage = inputs.message.trim()
      const extractedMessage = extractMessageFromExistingMarkdown(existingContent)
      const messageToUse = trimmedMessage || extractedMessage

      core.debug(`Message processing: input="${inputs.message}" → final="${messageToUse}"`)
      core.debug(
        `Generated checkboxes: ${checkboxesMarkdown.split('\n').filter((line) => line.trim()).length} items`
      )

      const messageContent = renderMessage(messageToUse, checkboxesMarkdown)
      const fullContent = generateCommentWithMetadata(messageContent, inputs.id, finalState)
      core.debug('Content generated with metadata')

      if (inputs.body) {
        await commentManager.updateIssueBody(inputs.number, fullContent)
      } else if (commentId) {
        await commentManager.updateComment(commentId, fullContent)
      }

      // Important: For forced updates, use previous state from before the update
      // to calculate changed keys properly
      updatedPreviousState = previousState ?? {}
    } catch (error) {
      throw new Error(
        `Invalid checked parameter: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
    }
  } else {
    // For natural state changes (user clicked checkboxes),
    // use previous state to detect what actually changed
    updatedPreviousState = previousState ?? {}
  }

  // Check if state has changed and get changed keys
  const stateChanged = hasStateChanged(updatedPreviousState, finalState)
  const changedKeys = getChangedKeys(updatedPreviousState, finalState)

  core.debug(
    `State transition: ${Object.keys(updatedPreviousState).length} → ${Object.keys(finalState).length} items`
  )
  if (stateChanged && changedKeys.length > 0) {
    core.info(`Changed: ${changedKeys.join(', ')}`)
  }

  // Race condition check: Verify if issue was updated after workflow started
  let finalChangedKeys = changedKeys
  let finalFinalState = finalState

  if (stateChanged && !inputs.forceChecked) {
    // Only check for natural state changes (not forced updates)
    const latestIssue = await commentManager.getIssueWithTimestamp(inputs.number)
    const latestUpdatedAt = new Date(latestIssue.updated_at)
    const timeDiff = latestUpdatedAt.getTime() - eventUpdatedAt.getTime()

    core.debug(`Latest update: ${latestUpdatedAt.toISOString()}`)
    core.debug(`Time diff: ${timeDiff}ms`)

    if (timeDiff > 0) {
      core.warning(`Race condition detected (${timeDiff}ms delay)`)

      // Recalculate with latest state from appropriate source
      let latestState: CheckboxState
      if (inputs.body) {
        // Issue Body mode: get state from Issue Body
        latestState = extractStateFromMarkdown(latestIssue.body || '')
        core.debug('Getting latest state from Issue Body')
      } else {
        // Comment mode: get state from latest comment
        const latestComment = await commentManager.findCommentById(inputs.number, inputs.id)
        if (latestComment) {
          latestState = extractStateFromMarkdown(latestComment.body)
          core.debug(`Getting latest state from comment ID ${latestComment.id}`)
        } else {
          // Fallback: use current state if comment not found
          latestState = finalState
          core.debug('Comment not found, using current state as fallback')
        }
      }
      const latestChangedKeys = getChangedKeys(updatedPreviousState, latestState)

      core.debug('Recalculating with latest state')
      core.debug(`Recalculated changes: ${latestChangedKeys.join(', ')}`)

      // Use latest state and changed keys
      finalChangedKeys = latestChangedKeys
      finalFinalState = latestState

      core.debug('Using latest state to prevent conflicts')
    } else {
      core.debug('No conflicts detected, proceeding')
    }
  }

  // IMPORTANT: Update metadata with current state for next run
  // This ensures that next execution will have correct previousState
  if (stateChanged && !inputs.forceChecked) {
    // Only update metadata for natural state changes (not forced updates)
    // For forced updates, metadata is already updated above

    // Get existing content structure
    const pairs = extractPairsFromExistingMarkdown(existingContent)
    const checkboxesMarkdown = rerenderCheckboxes(pairs, finalFinalState)
    const extractedMessage = extractMessageFromExistingMarkdown(existingContent)
    const messageContent = renderMessage(extractedMessage, checkboxesMarkdown)
    const fullContent = generateCommentWithMetadata(messageContent, inputs.id, finalFinalState)

    core.debug('Updating metadata with current state for next run')

    if (inputs.body) {
      await commentManager.updateIssueBody(inputs.number, fullContent)
    } else if (commentId) {
      await commentManager.updateComment(commentId, fullContent)
    }
  }

  setOutputs({
    retrieved: true, // State successfully retrieved
    changed: stateChanged,
    state: finalFinalState,
    changes: finalChangedKeys,
    allChecked: getAllCheckedStatus(finalFinalState),
    commentId,
  })
}

run()
