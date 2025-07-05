import * as github from '@actions/github'
import type { GitHubComment, GitHubIssue, GitHubIssueWithTimestamp } from './schemas.js'
import { htmlCommentUtils } from './html-comments.js'

export type CommentManager = {
  findCommentById: (issueNumber: number, actionId: string) => Promise<GitHubComment | null>
  createComment: (issueNumber: number, body: string) => Promise<GitHubComment>
  updateComment: (commentId: number, body: string) => Promise<GitHubComment>
  getIssue: (issueNumber: number) => Promise<GitHubIssue>
  getIssueWithTimestamp: (issueNumber: number) => Promise<GitHubIssueWithTimestamp>
  updateIssueBody: (issueNumber: number, body: string) => Promise<GitHubIssue>
  createOrUpdateComment: (
    issueNumber: number,
    actionId: string,
    body: string
  ) => Promise<{ comment: GitHubComment; isNew: boolean }>
  createOrUpdateIssueBody: (
    issueNumber: number,
    actionId: string,
    body: string
  ) => Promise<{ issue: GitHubIssue; isNew: boolean }>
}

export const createCommentManager = (token: string): CommentManager => {
  const octokit = github.getOctokit(token)
  const owner = github.context.repo.owner
  const repo = github.context.repo.repo

  /**
   * Search for comment with specified ID
   */
  const findCommentById: CommentManager['findCommentById'] = async (issueNumber, actionId) => {
    // Use iterator for early termination when comment is found
    for await (const response of octokit.paginate.iterator(octokit.rest.issues.listComments, {
      owner,
      repo,
      issue_number: issueNumber,
      per_page: 100,
    })) {
      const targetComment = response.data.find((comment) => {
        return (
          comment.body && htmlCommentUtils.extractStateMetadata(comment.body, actionId) !== null
        )
      })

      if (targetComment) {
        return targetComment as GitHubComment
      }
    }

    return null
  }

  /**
   * Create comment on Issue/PR
   */
  const createComment: CommentManager['createComment'] = async (issueNumber, body) => {
    const { data } = await octokit.rest.issues.createComment({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    })

    return data as GitHubComment
  }

  /**
   * Update existing comment
   */
  const updateComment: CommentManager['updateComment'] = async (commentId, body) => {
    const { data } = await octokit.rest.issues.updateComment({
      owner,
      repo,
      comment_id: commentId,
      body,
    })

    return data as GitHubComment
  }

  /**
   * Get Issue/PR information
   */
  const getIssue: CommentManager['getIssue'] = async (issueNumber) => {
    const { data } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    })

    return data as GitHubIssue
  }

  /**
   * Get Issue/PR information with timestamps
   */
  const getIssueWithTimestamp: CommentManager['getIssueWithTimestamp'] = async (issueNumber) => {
    const { data } = await octokit.rest.issues.get({
      owner,
      repo,
      issue_number: issueNumber,
    })

    return data as GitHubIssueWithTimestamp
  }

  /**
   * Update Issue/PR body
   */
  const updateIssueBody: CommentManager['updateIssueBody'] = async (issueNumber, body) => {
    const { data } = await octokit.rest.issues.update({
      owner,
      repo,
      issue_number: issueNumber,
      body,
    })

    return data as GitHubIssue
  }

  /**
   * Create or update comment
   */
  const createOrUpdateComment: CommentManager['createOrUpdateComment'] = async (
    issueNumber,
    actionId,
    body
  ) => {
    const existingComment = await findCommentById(issueNumber, actionId)

    if (existingComment) {
      const updatedComment = await updateComment(existingComment.id, body)
      return { comment: updatedComment, isNew: false }
    } else {
      const newComment = await createComment(issueNumber, body)
      return { comment: newComment, isNew: true }
    }
  }

  /**
   * Create or update Issue/PR body
   */
  const createOrUpdateIssueBody: CommentManager['createOrUpdateIssueBody'] = async (
    issueNumber,
    actionId,
    body
  ) => {
    const issue = await getIssue(issueNumber)

    // Check if existing body contains metadata
    const hasExistingMetadata =
      issue.body && htmlCommentUtils.extractStateMetadata(issue.body, actionId) !== null

    const updatedIssue = await updateIssueBody(issueNumber, body)
    return { issue: updatedIssue, isNew: !hasExistingMetadata }
  }

  return {
    findCommentById,
    createComment,
    updateComment,
    getIssue,
    getIssueWithTimestamp,
    updateIssueBody,
    createOrUpdateComment,
    createOrUpdateIssueBody,
  }
}
