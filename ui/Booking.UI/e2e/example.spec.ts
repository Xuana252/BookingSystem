import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
  await page.goto('/');
  // Update this to match your actual app title
  await expect(page).toHaveTitle(/BookSpace/);
});

test('can navigate to login or dashboard', async ({ page }) => {
  await page.goto('/');
  // Example: find a button or link and click it
  // await page.getByRole('link', { name: 'Login' }).click();
  // await expect(page).toHaveURL(/.*login/);
});
