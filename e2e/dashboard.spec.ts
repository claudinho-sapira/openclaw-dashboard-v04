import { test, expect } from '@playwright/test';

test.describe('Dashboard Home', () => {
  test('should display all agent cards', async ({ page }) => {
    await page.goto('/dashboard');

    // Check for agent cards
    await expect(page.getByText('Luna')).toBeVisible();
    await expect(page.getByText('Bolt')).toBeVisible();
    await expect(page.getByText('Iris')).toBeVisible();

    // Check for emojis
    await expect(page.getByText('🎯')).toBeVisible();
    await expect(page.getByText('🔨')).toBeVisible();
    await expect(page.getByText('🔍')).toBeVisible();
  });

  test('should show token usage progress bars', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for data to load
    await page.waitForTimeout(2000);

    // Check for progress bars (they should be visible after data loads)
    const progressBars = page.locator('[role="progressbar"]');
    await expect(progressBars.first()).toBeVisible();
  });

  test('should display system health card', async ({ page }) => {
    await page.goto('/dashboard');

    await expect(page.getByText('System Health')).toBeVisible();
    await expect(page.getByText('Gateway')).toBeVisible();
  });

  test('should refresh data manually', async ({ page }) => {
    await page.goto('/dashboard');

    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await refreshButton.click();

    // Check that last update time appears
    await expect(page.getByText(/updated/i)).toBeVisible();
  });

  test('should navigate to agent detail on card click', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for cards to load
    await page.waitForTimeout(1000);

    // Click on an agent card
    await page.getByText('Bolt').click();

    // Should navigate to agent detail page
    await expect(page).toHaveURL(/\/agents\//);
  });
});
