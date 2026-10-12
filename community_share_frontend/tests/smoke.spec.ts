import { test, expect } from '@playwright/test';

test.describe('smoke', () => {
  test('homepage loads with VicinityShare login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/VicinityShare/);
    await expect(page.getByText('Sign in to VicinityShare')).toBeVisible();
  });
});
