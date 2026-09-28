import { test, expect } from '@playwright/test';

test.describe('Fetch Rooms', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and log in as an Admin
    await page.goto('/login');
    await page.getByLabel(/username|email/i).fill('boss');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).not.toHaveURL(/.*login/);
  });

  test('Admin can fetch and view the rooms list', async ({ page }) => {
    // Navigate to Manage Rooms page
    await page.goto('/admin/rooms'); 

    // Wait for the room grid to load
    // Check that at least one room card is rendered
    const roomCard = page.locator('div.rounded-2xl').filter({ has: page.locator('h3') }).first();
    await expect(roomCard).toBeVisible();

    // Ensure the room has a name displayed
    const roomName = await roomCard.locator('h3').innerText();
    expect(roomName.length).toBeGreaterThan(0);
  });
});
