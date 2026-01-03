import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Trade Flow
 * 
 * Tests the complete trading workflow including:
 * - Opening trade ticket
 * - Filling in trade details
 * - Submitting trade
 * - Viewing confirmation
 */

test.describe('Trade Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to trading page
    await page.goto('/');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should open trade ticket and display form', async ({ page }) => {
    // Click BUY button to open trade ticket
    const buyButton = page.getByRole('button', { name: /buy/i });
    await buyButton.click();
    
    // Verify trade ticket dialog is visible
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/trade ticket/i)).toBeVisible();
    
    // Verify form fields are present
    await expect(page.getByLabel(/asset/i)).toBeVisible();
    await expect(page.getByLabel(/size/i)).toBeVisible();
    await expect(page.getByLabel(/price/i)).toBeVisible();
  });

  test('should fill trade form and show validation', async ({ page }) => {
    // Open trade ticket
    await page.getByRole('button', { name: /buy/i }).click();
    
    // Fill in trade details
    await page.getByLabel(/asset/i).click();
    await page.getByRole('option', { name: /btc/i }).click();
    
    await page.getByLabel(/size/i).fill('0.5');
    await page.getByLabel(/price/i).fill('50000');
    
    // Verify calculated total
    await expect(page.getByText(/total.*25000/i)).toBeVisible();
  });

  test('should submit trade and show confirmation', async ({ page }) => {
    // Open trade ticket
    await page.getByRole('button', { name: /buy/i }).click();
    
    // Fill in trade details
    await page.getByLabel(/asset/i).click();
    await page.getByRole('option', { name: /btc/i }).click();
    await page.getByLabel(/size/i).fill('0.1');
    
    // Submit trade
    await page.getByRole('button', { name: /submit.*order/i }).click();
    
    // Verify confirmation message
    await expect(page.getByText(/order submitted/i)).toBeVisible({ timeout: 5000 });
  });

  test('should show risk warning for large trades', async ({ page }) => {
    // Open trade ticket
    await page.getByRole('button', { name: /buy/i }).click();
    
    // Fill in large trade size
    await page.getByLabel(/size/i).fill('100');
    
    // Verify risk warning appears
    await expect(page.getByText(/risk warning/i)).toBeVisible();
    await expect(page.getByText(/large position/i)).toBeVisible();
  });

  test('should close trade ticket on cancel', async ({ page }) => {
    // Open trade ticket
    await page.getByRole('button', { name: /buy/i }).click();
    
    // Verify dialog is open
    await expect(page.getByRole('dialog')).toBeVisible();
    
    // Click cancel
    await page.getByRole('button', { name: /cancel/i }).click();
    
    // Verify dialog is closed
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });
});

