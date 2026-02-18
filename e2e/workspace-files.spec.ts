import { test, expect } from '@playwright/test';

test.describe('Workspace Files Editor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents/builder');
    await page.getByRole('tab', { name: /workspace files/i }).click();
  });

  test('should display file browser', async ({ page }) => {
    await expect(page.getByText('Workspace Files')).toBeVisible();

    // Check for common workspace files
    await expect(page.getByText('SOUL.md')).toBeVisible();
    await expect(page.getByText('TOOLS.md')).toBeVisible();
    await expect(page.getByText('AGENTS.md')).toBeVisible();
    await expect(page.getByText('IDENTITY.md')).toBeVisible();
  });

  test('should load file content on selection', async ({ page }) => {
    // Click on a file
    await page.getByText('SOUL.md').click();

    // Wait for content to load
    await page.waitForTimeout(500);

    // Should show editor with Edit/Preview tabs
    await expect(page.getByRole('tab', { name: /edit/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /preview/i })).toBeVisible();
  });

  test('should switch between edit and preview modes', async ({ page }) => {
    // Select a file
    await page.getByText('SOUL.md').click();
    await page.waitForTimeout(500);

    // Switch to preview
    await page.getByRole('tab', { name: /preview/i }).click();

    // Should show markdown preview
    await expect(page.locator('.prose')).toBeVisible();

    // Switch back to edit
    await page.getByRole('tab', { name: /edit/i }).click();

    // Should show textarea
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('should show save button when file is edited', async ({ page }) => {
    // Select a file
    await page.getByText('SOUL.md').click();
    await page.waitForTimeout(500);

    // Make sure we're in edit mode
    const editTab = page.getByRole('tab', { name: /edit/i });
    if (await editTab.isVisible()) {
      await editTab.click();
    }

    // Type in the textarea
    const textarea = page.locator('textarea');
    await textarea.fill('# Test content');

    // Save button should be enabled
    const saveButton = page.getByRole('button', { name: /save/i });
    await expect(saveButton).toBeEnabled();
  });

  test('should show unsaved changes badge', async ({ page }) => {
    // Select a file
    await page.getByText('SOUL.md').click();
    await page.waitForTimeout(500);

    // Edit content
    const textarea = page.locator('textarea');
    await textarea.fill('# Modified content');

    // Should show unsaved changes badge
    await expect(page.getByText(/unsaved changes/i)).toBeVisible();
  });
});
