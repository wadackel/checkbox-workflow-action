# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm install` - Install dependencies
- `pnpm build` - Build the action using ncc (creates dist/index.js)
- `pnpm test` - Run tests using Vitest
- `pnpm test:watch` - Run tests in watch mode
- `pnpm typecheck` - Type check with TypeScript
- `pnpm lint` - Lint code using oxlint
- `pnpm format` - Format code using Prettier
- `pnpm generate` - Generate documentation and input definitions
- `pnpm release` - Release using semantic-release (CI only)

## Architecture Overview

This is a GitHub Action that creates and manages checkbox-driven workflows. The action operates in two distinct modes:

### Core Modes

**Configuration Mode** (when `config` parameter is provided):

- Creates or updates checkboxes based on configuration
- Always returns `changed: "false"`
- Used for initial setup, forced updates, resetting states

**Detection Mode** (when `config` parameter is omitted):

- Monitors and reacts to checkbox state changes
- Returns `changed: "true"` when state changes occur
- Used for task execution and conditional workflows

### Key Components

- **main.ts** - Entry point with dual-mode logic (handleConfigMode/handleDetectionMode)
- **comment-manager.ts** - GitHub API abstraction for comments and issues
- **checkbox-parser.ts** - Parses markdown checkboxes and manages state transitions
- **checkbox-renderer.ts** - Renders checkboxes with metadata and HTML comments
- **config-parser.ts** - Parses JSON5 checkbox configurations
- **schemas.ts** - Zod schemas for validation and type safety
- **html-comments.ts** - Utilities for embedding metadata in HTML comments

### State Management

The action embeds metadata as HTML comments in generated content to track:

- Previous checkbox states (for change detection)
- Checkbox key-label mappings
- Action identification markers

Example embedded metadata:

```html
<!-- checkbox-workflow-action:managed -->
<!-- checkbox-workflow-action:state:{"deploy": false, "test": true} -->
```

### Race Condition Handling

The action includes sophisticated race condition detection by:

- Recording event timestamps
- Comparing with latest issue/comment update times
- Re-fetching latest state when conflicts are detected
- Updating metadata after state changes to maintain consistency

## Testing

- Tests use Vitest with globals enabled
- Test files are co-located with source files (\*.test.ts)
- Focus on unit testing individual components
- No integration tests - E2E testing is handled separately via GitHub Actions

## Build Process

- Uses `@vercel/ncc` to bundle everything into `dist/index.js`
- Pre-commit hook automatically builds and stages dist/ changes
- CI validates that dist/ is up to date with source changes
- Auto-generates input definitions from schemas using `scripts/generate-inputs.ts`

## Important Implementation Notes

- All checkbox keys are embedded as HTML comments: `<!-- key -->`
- State changes trigger metadata updates to prevent duplicate executions
- The action automatically adds managed prefix for workflow optimization
- Force-checked updates bypass change detection but update metadata
- Race conditions are handled by timestamp comparison and state re-fetching
