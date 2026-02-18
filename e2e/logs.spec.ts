import { test, expect } from '@playwright/test';

test.describe('Logs Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/agents/builder');
    await page.getByRole('tab', { name: /logs/i }).click();
  });

  test('should display logs viewer', async ({ page }) => {
    await expect(page.getByText('Logs')).toBeVisible();
  });

  test('should show severity filter', async ({ page }) => {
    // Look for severity selector
    const severitySelector = page.locator('[role="combobox"]').filter({ hasText: /all levels/i });
    await expect(severitySelector.or(page.getByText(/all levels/i))).toBeVisible();
  });

  test('should show pause/resume controls', async ({ page }) => {
    const pauseButton = page.getByRole('button', { name: /(pause|resume)/i });
    await expect(pauseButton).toBeVisible();
  });

  test('should show auto-scroll toggle', async ({ page }) => {
    const autoScrollButton = page.getByRole('button', { name: /auto-scroll/i });
    await expect(autoScrollButton).toBeVisible();
  });

  test('should display sessions list', async ({ page }) => {
    await expect(page.getByText('Active Sessions')).toBeVisible();
  });

  test('should pause and resume log streaming', async ({ page }) => {
    // Find pause button
    const pauseButton = page.getByRole('button', { name: /pause/i });
    
    if (await pauseButton.isVisible()) {
      await pauseButton.click();

      // Should now show resume button
      await expect(page.getByRole('button', { name: /resume/i })).toBeVisible();
    }
  });

  test('should refresh logs manually', async ({ page }) => {
    const refreshButton = page.getByRole('button').filter({ has: page.locator('svg') }).nth(3);
    
    if (await refreshButton.isVisible()) {
      await refreshButton.click();
    }

    // Should show updated timestamp
    await expect(page.getByText(/updated/i)).toBeVisible();
  });
});
