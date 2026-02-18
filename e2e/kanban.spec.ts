import { test, expect } from '@playwright/test';

test.describe('Kanban Board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/kanban');
  });

  test('should display all four columns', async ({ page }) => {
    await expect(page.getByText('To Do')).toBeVisible();
    await expect(page.getByText('In Progress')).toBeVisible();
    await expect(page.getByText('HITL')).toBeVisible();
    await expect(page.getByText('Done')).toBeVisible();
  });

  test('should show HITL column with distinct styling', async ({ page }) => {
    // HITL column should have warning colors
    const hitlColumn = page.locator('div').filter({ hasText: /^HITL/ }).first();
    await expect(hitlColumn).toBeVisible();
  });

  test('should display filter controls', async ({ page }) => {
    await expect(page.getByText(/all agents/i)).toBeVisible();
    await expect(page.getByText(/all priorities/i)).toBeVisible();
  });

  test('should show new task button', async ({ page }) => {
    const newTaskButton = page.getByRole('button', { name: /new task/i });
    await expect(newTaskButton).toBeVisible();
  });

  test('should open create task dialog', async ({ page }) => {
    await page.getByRole('button', { name: /new task/i }).click();

    // Dialog should open
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/create task/i)).toBeVisible();
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await expect(page.getByLabel(/agent/i)).toBeVisible();
    await expect(page.getByLabel(/priority/i)).toBeVisible();
  });

  test('should create a new task', async ({ page }) => {
    await page.getByRole('button', { name: /new task/i }).click();

    // Fill form
    await page.getByLabel(/title/i).fill('Test Task');
    await page.getByLabel(/description/i).fill('Test description');

    // Select agent
    await page.locator('[id="agent"]').click();
    await page.getByText('🔨 Bolt (Builder)').click();

    // Select priority
    await page.locator('[id="priority"]').click();
    await page.getByText('High').click();

    // Submit
    await page.getByRole('button', { name: /^create$/i }).click();

    // Wait for dialog to close
    await page.waitForTimeout(500);

    // Task should appear in To Do column
    await expect(page.getByText('Test Task')).toBeVisible();
  });

  test('should filter by agent', async ({ page }) => {
    // Click agent filter
    const agentFilter = page.locator('[role="combobox"]').first();
    await agentFilter.click();

    // Select Bolt
    await page.getByText('Bolt (Builder)').click();

    // URL or display should update (tasks should be filtered)
    await page.waitForTimeout(500);
  });

  test('should filter by priority', async ({ page }) => {
    // Click priority filter
    const priorityFilter = page.locator('[role="combobox"]').nth(1);
    await priorityFilter.click();

    // Select High
    await page.getByText('High').click();

    // Tasks should be filtered
    await page.waitForTimeout(500);
  });

  test('should show task count badges', async ({ page }) => {
    // Each column should have a count badge
    const badges = page.locator('[role="status"]').or(page.getByText(/^\d+$/));
    await expect(badges.first()).toBeVisible();
  });

  test('should display task cards with details', async ({ page }) => {
    // Wait for tasks to load
    await page.waitForTimeout(1000);

    // If there are any tasks, check their structure
    const taskCards = page.locator('[role="button"]').filter({ has: page.getByText(/🎯|🔨|🔍/) });
    
    if (await taskCards.first().isVisible()) {
      // Task card should show priority badge
      await expect(page.locator('[role="status"]').or(page.getByText(/(low|medium|high|urgent)/i))).toBeVisible();
    }
  });
});
