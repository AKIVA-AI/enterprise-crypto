import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Kill Switch
 * 
 * Tests the kill switch functionality including:
 * - Activation dialog
 * - Confirmation flow
 * - Status display
 */

test.describe('Kill Switch', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to kill switch page
    await page.goto('/kill-switch');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should display kill switch panel', async ({ page }) => {
    // Verify kill switch panel is visible
    await expect(page.getByText(/emergency kill switch/i)).toBeVisible();
    await expect(page.getByText(/immediately halt all trading/i)).toBeVisible();
  });

  test('should show activate button', async ({ page }) => {
    // Verify activate button is present
    const activateButton = page.getByRole('button', { name: /activate kill switch/i });
    await expect(activateButton).toBeVisible();
  });

  test('should open confirmation dialog on activate', async ({ page }) => {
    // Click activate button
    await page.getByRole('button', { name: /activate kill switch/i }).click();
    
    // Verify confirmation dialog appears
    await expect(page.getByRole('alertdialog')).toBeVisible();
    await expect(page.getByText(/are you sure/i)).toBeVisible();
    await expect(page.getByText(/this will immediately stop/i)).toBeVisible();
  });

  test('should show confirmation input in dialog', async ({ page }) => {
    // Click activate button
    await page.getByRole('button', { name: /activate kill switch/i }).click();
    
    // Verify confirmation input is present
    await expect(page.getByPlaceholder(/type.*confirm/i)).toBeVisible();
  });

  test('should enable confirm button when typing CONFIRM', async ({ page }) => {
    // Click activate button
    await page.getByRole('button', { name: /activate kill switch/i }).click();
    
    // Type CONFIRM in input
    await page.getByPlaceholder(/type.*confirm/i).fill('CONFIRM');
    
    // Verify confirm button is enabled
    const confirmButton = page.getByRole('button', { name: /^confirm$/i });
    await expect(confirmButton).toBeEnabled();
  });

  test('should close dialog on cancel', async ({ page }) => {
    // Click activate button
    await page.getByRole('button', { name: /activate kill switch/i }).click();
    
    // Verify dialog is open
    await expect(page.getByRole('alertdialog')).toBeVisible();
    
    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Verify dialog is closed
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
  });

  test('should activate kill switch with confirmation', async ({ page }) => {
    // Click activate button
    await page.getByRole('button', { name: /activate kill switch/i }).click();
    
    // Type CONFIRM
    await page.getByPlaceholder(/type.*confirm/i).fill('CONFIRM');
    
    // Click confirm button
    await page.getByRole('button', { name: /^confirm$/i }).click();
    
    // Verify success message or status change
    // Note: Actual behavior depends on backend implementation
    await page.waitForTimeout(1000);
    
    // Dialog should close
    await expect(page.getByRole('alertdialog')).not.toBeVisible();
  });

  test('should display kill switch status', async ({ page }) => {
    // Verify status indicator is present
    // This will show either "Active" or "Inactive" depending on state
    const statusText = await page.textContent('body');
    expect(statusText).toMatch(/(active|inactive|status)/i);
  });
});

