import { test, expect } from '@playwright/test';

test.describe('MediBook auth', () => {
  test('login page loads', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in|login|medibook/i })).toBeVisible({
      timeout: 15_000,
    });
  });

  test('patient can sign in', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('patient1@medibook.local');
    await page.getByLabel(/password/i).fill('Patient@123');
    await page.getByRole('button', { name: /sign in|login|log in/i }).click();
    await expect(page).toHaveURL(/patient|dashboard/i, { timeout: 20_000 });
  });
});
