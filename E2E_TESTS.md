# E2E Testing Guide

## Overview

End-to-end tests for the OpenClaw Dashboard using Playwright. Tests cover all major features across multiple browsers (Chromium, Firefox, WebKit).

## Setup

Install dependencies:
```bash
npm install
```

Install Playwright browsers (if not already installed):
```bash
npx playwright install
```

## Running Tests

### Run all tests (headless)
```bash
npm run test:e2e
```

### Run tests with UI mode (interactive)
```bash
npm run test:e2e:ui
```

### Run tests in headed mode (visible browser)
```bash
npm run test:e2e:headed
```

### View test report
```bash
npm run test:e2e:report
```

### Run specific test file
```bash
npx playwright test e2e/dashboard.spec.ts
```

### Run specific test by name
```bash
npx playwright test -g "should display all agent cards"
```

### Run tests in specific browser
```bash
npx playwright test --project=chromium
npx playwright test --project=firefox
npx playwright test --project=webkit
```

## Test Coverage

### Dashboard Home (`e2e/dashboard.spec.ts`)
- ✅ Display all agent cards (Luna, Bolt, Iris)
- ✅ Show token usage progress bars
- ✅ Display system health card
- ✅ Manual refresh functionality
- ✅ Navigation to agent detail on card click

### Agent Detail (`e2e/agent-detail.spec.ts`)
- ✅ Display agent header with emoji and name
- ✅ Show quick stats cards (tokens, sessions, usage, model)
- ✅ Tabs navigation (Config, Files, Logs)
- ✅ Switch between config editor modes (Visual/Raw JSON)
- ✅ Model selection dropdown
- ✅ Start/Stop controls

### Workspace Files (`e2e/workspace-files.spec.ts`)
- ✅ Display file browser with all workspace files
- ✅ Load file content on selection
- ✅ Switch between Edit and Preview modes
- ✅ Show save button when file is edited
- ✅ Display unsaved changes badge

### Logs Viewer (`e2e/logs.spec.ts`)
- ✅ Display logs viewer
- ✅ Severity filter dropdown
- ✅ Pause/Resume controls
- ✅ Auto-scroll toggle
- ✅ Sessions list
- ✅ Manual refresh functionality

### Kanban Board (`e2e/kanban.spec.ts`)
- ✅ Display all four columns (To Do, In Progress, HITL, Done)
- ✅ HITL column with distinct styling
- ✅ Filter controls (agent, priority)
- ✅ New task button
- ✅ Create task dialog
- ✅ Create new task flow
- ✅ Filter by agent
- ✅ Filter by priority
- ✅ Task count badges
- ✅ Task cards with details

## Test Structure

```
e2e/
├── dashboard.spec.ts      # Dashboard home tests
├── agent-detail.spec.ts   # Agent detail page tests
├── workspace-files.spec.ts # File editor tests
├── logs.spec.ts           # Logs viewer tests
└── kanban.spec.ts         # Kanban board tests
```

## Configuration

Tests are configured in `playwright.config.ts`:

- **Base URL:** `http://localhost:3000`
- **Browsers:** Chromium, Firefox, WebKit
- **Parallel execution:** Enabled (except in CI)
- **Retries:** 2 retries in CI, 0 locally
- **Traces:** Captured on first retry
- **Screenshots:** Captured on failure
- **Web server:** Automatically starts dev server if not running

## CI/CD Integration

In CI environments:
- Tests run in parallel with 1 worker
- 2 retries per test
- HTML report generated
- Screenshots captured on failure
- Traces captured on retry

## Debugging

### Debug specific test
```bash
npx playwright test e2e/dashboard.spec.ts --debug
```

### View trace
```bash
npx playwright show-trace trace.zip
```

### Generate code for test
```bash
npx playwright codegen http://localhost:3000
```

## Best Practices

1. **Use data-testid attributes** for stable selectors
2. **Wait for API calls** before assertions
3. **Use `waitForTimeout` sparingly** - prefer `waitForLoadState` or `waitForSelector`
4. **Clean up test data** after each test
5. **Keep tests independent** - each test should run in isolation

## Troubleshooting

### Tests timing out
- Increase timeout in test or config
- Check if dev server is running
- Verify API endpoints are responding

### Element not found
- Add explicit waits
- Check for loading states
- Verify element selectors

### Flaky tests
- Add proper waits for dynamic content
- Use `toBeVisible()` instead of checking presence
- Check for race conditions

## Future Improvements

- [ ] Add visual regression testing
- [ ] Add performance testing
- [ ] Add accessibility testing (axe-core)
- [ ] Add API mocking for deterministic tests
- [ ] Add test data fixtures
- [ ] Add screenshot comparison
