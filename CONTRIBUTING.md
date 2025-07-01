# Contributing to Checkbox Workflow Action

Thank you for your interest in contributing to Checkbox Workflow Action! This document provides guidelines and information for contributors.

## E2E Testing

This project includes comprehensive End-to-End tests to verify the Checkbox Workflow Action functionality in a real GitHub environment.

### E2E Test Execution

1. **Create E2E Test Issue**
   - Use the "E2E Test" issue template from `.github/ISSUE_TEMPLATE/e2e_test.md`
   - Title should start with `[E2E]` prefix (e.g., `[E2E] Testing new feature`)
   - This automatically creates a test checklist in the issue body with 4 test categories

2. **Execute Test Phases**

   The E2E checklist includes 4 main test categories:

   **Phase 1: Issue Body Management Test**
   - Interact with checkboxes in the issue body
   - Verify state persistence and workflow triggering
   - Check the "Issue Body Management" checkbox to trigger all subsequent E2E tests

   **Phase 2: Basic Workflow Test**
   - Tests basic checklist creation and task execution
   - Verifies "Greet" and "Silent" tasks functionality
   - Confirms auto-reset functionality after completion
   - Check the "Basic Workflow" checkbox when verified

   **Phase 3: Dynamic Workflow Test**
   - Tests dynamic file selection checkbox generation
   - Verifies artifact creation with selected files
   - Confirms cleanup functionality
   - Check the "Dynamic Workflow" checkbox when verified

   **Phase 4: State Retrieval and Cross-Workflow Integration Test**
   - Tests cross-workflow state sharing and communication
   - Verifies checkbox state retrieval between workflows
   - Confirms workflow coordination capabilities
   - Check the "State Retrieval" checkbox when verified

   **Completion**
   - When all 4 checkboxes are completed, the issue will automatically close
   - A completion summary comment will be posted

### E2E Test Workflows

The E2E testing system is implemented in a single comprehensive workflow:

- **`e2e.yaml`** - Complete E2E test suite that manages all test phases:
  - Sets up the main E2E checklist in issue body when `[E2E]` issues are created
  - Executes individual test workflows based on checkbox interactions
  - Coordinates basic workflow testing (greet/silent tasks)
  - Manages dynamic workflow testing (file selection and artifacts)
  - Handles state retrieval and cross-workflow integration testing
  - Automatically closes issues when all tests complete

### Test Scenarios

**Issue Body Management Test**

- Checkbox creation and interaction in issue body
- State persistence and workflow triggering
- Triggers all subsequent E2E tests when checked

**Basic Workflow Test**

- Creates interactive demo tasks (greet/silent)
- Tests comment posting functionality
- Verifies automatic checklist reset after completion

**Dynamic Workflow Test**

- Generates dynamic checkboxes from repository workflow files
- Tests file selection and artifact creation workflow
- Verifies cleanup and state management

**State Retrieval and Cross-Workflow Integration Test**

- Tests cross-workflow state sharing and communication
- Verifies checkbox state retrieval between different workflow runs
- Confirms workflow coordination and integration capabilities

### Expected Behavior

- All checkboxes should respond to user interactions
- State changes should trigger appropriate workflows
- Workflows should execute without errors
- Issue should automatically close upon completion
- All test phases should complete successfully

The E2E testing provides confidence that the Checkbox Workflow Action functions correctly in production-like conditions with real GitHub API interactions.

## Code Style

This project uses:

- **Prettier** for code formatting
- **ESLint** for linting
- **TypeScript** for type safety

Please ensure your code follows these standards by running `pnpm lint` and `pnpm format` before submitting.
