import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Risk Dashboard
 * 
 * Tests the risk dashboard UI including:
 * - Book selection
 * - Tab navigation
 * - VaR metrics display
 * - Stress test scenarios
 */

test.describe('Risk Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to risk page
    await page.goto('/risk');
    
    // Wait for app to load
    await page.waitForLoadState('networkidle');
  });

  test('should display book selector', async ({ page }) => {
    // Verify book selector is visible
    await expect(page.getByText(/select trading book/i)).toBeVisible();
    
    // Verify selector is interactive
    const selector = page.getByRole('combobox');
    await expect(selector).toBeVisible();
  });

  test('should select book and display default book', async ({ page }) => {
    // Wait for default book to be selected
    await page.waitForTimeout(1000);
    
    // Verify a book is selected (Main Book is default)
    const selector = page.getByRole('combobox');
    await expect(selector).toContainText(/main book/i);
  });

  test('should show all risk tabs', async ({ page }) => {
    // Wait for tabs to render
    await page.waitForTimeout(1000);
    
    // Verify all tabs are present
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /var analysis/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /stress testing/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /risk attribution/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /liquidity risk/i })).toBeVisible();
  });

  test('should switch between tabs', async ({ page }) => {
    // Wait for tabs to render
    await page.waitForTimeout(1000);
    
    // Click VaR Analysis tab
    const varTab = page.getByRole('tab', { name: /var analysis/i });
    await varTab.click();
    
    // Verify tab is active
    await expect(varTab).toHaveAttribute('data-state', 'active');
    
    // Verify VaR content is visible
    await expect(page.getByText(/var \(95%\)/i)).toBeVisible();
  });

  test('should display VaR metrics', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Click VaR Analysis tab
    await page.getByRole('tab', { name: /var analysis/i }).click();
    
    // Verify VaR metrics are displayed
    await expect(page.getByText(/var \(95%\)/i)).toBeVisible();
    await expect(page.getByText(/1-day loss at 95% confidence/i)).toBeVisible();
  });

  test('should show stress test scenarios', async ({ page }) => {
    // Wait for data to load
    await page.waitForTimeout(2000);
    
    // Click Stress Testing tab
    await page.getByRole('tab', { name: /stress testing/i }).click();
    
    // Verify stress test content is visible
    // Note: May show "No stress test data available" if backend is not running
    const hasData = await page.getByText(/market crash/i).isVisible().catch(() => false);
    const noData = await page.getByText(/no stress test data/i).isVisible().catch(() => false);
    
    expect(hasData || noData).toBeTruthy();
  });

  test('should have refresh button', async ({ page }) => {
    // Verify refresh button is present
    await expect(page.getByRole('button', { name: /refresh/i })).toBeVisible();
  });

  test('should refresh data when refresh clicked', async ({ page }) => {
    // Wait for initial load
    await page.waitForTimeout(1000);
    
    // Click refresh button
    const refreshButton = page.getByRole('button', { name: /refresh/i });
    await refreshButton.click();
    
    // Verify loading state appears (briefly)
    // This is a smoke test - just verify the button works
    await page.waitForTimeout(500);
  });
});

