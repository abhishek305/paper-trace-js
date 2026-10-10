import { expect, test } from '@playwright/test';

test('runs the default example and steps through it', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Run' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByRole('region', { name: 'Variables' })).toContainText('rows');
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByText('Step 1 of')).toBeVisible();
});

test('stops an infinite loop and shows a banner', async ({ page }) => {
  await page.goto('/');
  await page.locator('.cm-content').fill('while (true) {}');
  await page.getByRole('button', { name: 'Run' }).click();
  await expect(page.getByRole('alert')).toContainText('Stopped');
});
