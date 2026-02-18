import { test, expect } from '@playwright/test';

test.describe('Agent Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to builder agent detail
    await page.goto('/agents/builder');
  });

  test('should display agent header with emoji and name', async ({ page }) => {
    await expect(page.getByText('🔨')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Bolt' })).toBeVisible();
  });

  test('should show quick stats cards', async ({ page }) => {
    await expect(page.getByText('Tokens Used')).toBeVisible();
    await expect(page.getByText('Active Sessions')).toBeVisible();
    await expect(page.getByText('Usage')).toBeVisible();
    await expect(page.getByText('Model')).toBeVisible();
  });

  test('should display tabs navigation', async ({ page }) => {
    await expect(page.getByRole('tab', { name: /configuration/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /workspace files/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /logs/i })).toBeVisible();
  });

  test('should switch between config editor modes', async ({ page }) => {
    // Switch to config tab (should be default)
    await page.getByRole('tab', { name: /configuration/i }).click();

    // Check for visual/raw tabs
    await expect(page.getByRole('tab', { name: /visual editor/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /raw json/i })).toBeVisible();

    // Switch to raw JSON
    await page.getByRole('tab', { name: /raw json/i }).click();

    // Should show JSON editor
    await expect(page.locator('textarea').or(page.locator('pre'))).toBeVisible();
  });

  test('should allow model selection', async ({ page }) => {
    // Wait for page to load
    await page.waitForTimeout(1000);

    // Find model selector (combobox)
    const modelSelector = page.locator('[role="combobox"]').first();
    await modelSelector.click();

    // Should show model options
    await expect(page.getByText(/sonnet/i)).toBeVisible();
  });

  test('should display start/stop controls', async ({ page }) => {
    // Check for start or stop button
    const controlButton = page.getByRole('button', { name: /(start|stop)/i });
    await expect(controlButton).toBeVisible();
  });
});
