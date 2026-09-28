import { test, expect } from '@playwright/test';

test.describe('Fetch Users', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and log in as an Admin
    await page.goto('/login');
    await page.getByLabel(/username|email/i).fill('boss');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).not.toHaveURL(/.*login/);
  });

  test('Admin can fetch and view the users list', async ({ page }) => {
    // Navigate to Manage Users page
    await page.goto('/admin/users'); 

    // Wait for the users table to load
    // Check that at least one user row is rendered in the tbody
    const userRow = page.locator('tbody tr').first();
    await expect(userRow).toBeVisible();

    // Ensure the row has user data (first column contains the username and avatar)
    const usernameCell = await userRow.locator('td').first().innerText();
    expect(usernameCell.length).toBeGreaterThan(0);
  });
});
