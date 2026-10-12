import { test, expect } from '@playwright/test';

test.describe('login', () => {
  test('shows an error with invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.fill('#email', 'fake-user@example.com');
    await page.fill('#password', 'wrongpassword123');
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Invalid email or password')).toBeVisible();
  });

  test('logs in and shows the home page', async ({ page }) => {
    test.skip(
      !process.env.PLAYWRIGHT_USER_EMAIL || !process.env.PLAYWRIGHT_USER_PASSWORD,
      'Set PLAYWRIGHT_USER_EMAIL and PLAYWRIGHT_USER_PASSWORD to run this test'
    );
    await page.goto('/');
    await page.fill('#email', process.env.PLAYWRIGHT_USER_EMAIL!);
    await page.fill('#password', process.env.PLAYWRIGHT_USER_PASSWORD!);
    await page.getByRole('button', { name: 'Sign In' }).click();
    await expect(page.getByText('Hi,').first()).toBeVisible();
  });
});
