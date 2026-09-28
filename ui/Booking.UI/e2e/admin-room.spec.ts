import { test, expect } from '@playwright/test';

test.describe('Admin Room Management', () => {
  test('Admin can deactivate a room', async ({ page }) => {
    // 1. Navigate and log in as an Admin
    await page.goto('/login');
    await page.getByLabel(/username|email/i).fill('boss');
    await page.locator('input[type="password"]').fill('password123');
    await page.getByRole('button', { name: /login|sign in/i }).click();
    await expect(page).not.toHaveURL(/.*login/);

    // 2. Navigate to Manage Rooms page
    await page.goto('/admin/rooms'); 

    // Wait for the room grid to load
    const firstRoomHeading = page.locator('h3').first();
    await expect(firstRoomHeading).toBeVisible();

    // Find the room's card by navigating up the DOM properly
    const firstRoomCard = page.locator('div.rounded-2xl').filter({ has: page.locator('h3') }).first();
    const roomName = await firstRoomCard.locator('h3').innerText();
    
    // Check if it's already in Maintenance. If so, activate it first so we can test deactivation
    const isMaintenance = await firstRoomCard.getByRole('button', { name: /online/i }).isVisible();
    if (isMaintenance) {
      await firstRoomCard.getByRole('button', { name: /online/i }).click();
      await expect(firstRoomCard.getByText(/Active/i)).toBeVisible();
    }

    // Click the deactivate button in that specific card
    await firstRoomCard.getByRole('button', { name: /maintenance/i }).click();

    // 4. Assert the UI updates
    await expect(firstRoomCard.getByText(/Maintenance/i)).toBeVisible();
    await expect(firstRoomCard.getByRole('button', { name: /online/i })).toBeVisible();

    // 5. Navigate to the main calendar and ensure the room is gone or unbookable
    await page.goto('/');
    await expect(page.getByText(/Under Maintenance/i).first()).toBeVisible();
  });
});


