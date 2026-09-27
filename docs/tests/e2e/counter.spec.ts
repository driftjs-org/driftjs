import { test, expect } from '@playwright/test';

test.describe('CounterDemo Component E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Collect unhandled browser errors
    const errors: string[] = [];
    page.on('pageerror', (err) => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Locate the CounterDemo island
    const island = page.locator('[data-drift-island="CounterDemo"]');
    await expect(island).toBeAttached();

    // Scroll island into view to trigger client:visible selective hydration
    await island.scrollIntoViewIfNeeded();
    await page.mouse.wheel(0, 100);

    // Verify widget container is visible
    const widget = island.locator('.interactive-demo-widget');
    await expect(widget).toBeVisible();

    // Wait for selective hydration to finish attaching event listeners
    await page.waitForTimeout(400);

    (page as any).__consoleErrors = errors;
  });

  test.afterEach(async ({ page }) => {
    const errors: string[] = (page as any).__consoleErrors || [];
    expect(errors, 'Browser page errors should be empty').toEqual([]);
  });

  test('renders initial state correctly with count=0, double=0, and step=1', async ({ page }) => {
    const island = page.locator('[data-drift-island="CounterDemo"]');

    // Display Card
    await expect(island.locator('.counter-label')).toHaveText('Current State');
    await expect(island.locator('.counter-value')).toHaveText('0');
    await expect(island.locator('.derived-highlight')).toHaveText('0');

    // Zero notice should be rendered initially
    await expect(island.locator('.counter-notice.zero')).toHaveText('Notice: Value is currently zero');
    await expect(island.locator('.counter-notice.negative')).toHaveCount(0);
    await expect(island.locator('.counter-notice.positive')).toHaveCount(0);

    // Initial buttons with step 1
    const buttons = island.locator('.btn-group button');
    await expect(buttons.nth(0)).toHaveText('- 1');
    await expect(buttons.nth(1)).toHaveText('Reset');
    await expect(buttons.nth(2)).toHaveText('+ 1');

    // Step selector buttons
    const stepBtns = island.locator('.step-selector .step-btn');
    await expect(stepBtns).toHaveCount(3);
    await expect(stepBtns.nth(0)).toHaveText('1');
    await expect(stepBtns.nth(1)).toHaveText('5');
    await expect(stepBtns.nth(2)).toHaveText('10');
  });

  test('increments counter and updates derived state reactively', async ({ page }) => {
    const island = page.locator('[data-drift-island="CounterDemo"]');
    const incrementBtn = island.locator('.btn-group button').nth(2);
    const counterValue = island.locator('.counter-value');
    const derivedValue = island.locator('.derived-highlight');

    // First increment (+ 1)
    await incrementBtn.click();
    await expect(counterValue).toHaveText('1');
    await expect(derivedValue).toHaveText('2');
    await expect(island.locator('.counter-notice.positive')).toHaveText('Notice: Value is currently positive!');
    await expect(island.locator('.counter-notice.negative')).toHaveCount(0);
    await expect(island.locator('.counter-notice.zero')).toHaveCount(0);

    // Second increment (+ 1)
    await incrementBtn.click();
    await expect(counterValue).toHaveText('2');
    await expect(derivedValue).toHaveText('4');
    await expect(island.locator('.counter-notice.positive')).toHaveText('Notice: Value is currently positive!');

    // Third increment (+ 1)
    await incrementBtn.click();
    await expect(counterValue).toHaveText('3');
    await expect(derivedValue).toHaveText('6');
    await expect(island.locator('.counter-notice.positive')).toHaveText('Notice: Value is currently positive!');
    await expect(island.locator('.counter-notice.negative')).toHaveCount(0);
  });

  test('switches step sizes dynamically and increments by selected step', async ({ page }) => {
    const island = page.locator('[data-drift-island="CounterDemo"]');
    const counterValue = island.locator('.counter-value');
    const derivedValue = island.locator('.derived-highlight');
    const stepBtns = island.locator('.step-selector .step-btn');
    const decBtn = island.locator('.btn-group button').nth(0);
    const incBtn = island.locator('.btn-group button').nth(2);

    // Switch step to 5
    await stepBtns.nth(1).click();
    await expect(decBtn).toHaveText('- 5');
    await expect(incBtn).toHaveText('+ 5');

    // Click increment (+ 5)
    await incBtn.click();
    await expect(counterValue).toHaveText('5');
    await expect(derivedValue).toHaveText('10');

    // Click increment (+ 5) again
    await incBtn.click();
    await expect(counterValue).toHaveText('10');
    await expect(derivedValue).toHaveText('20');

    // Switch step to 10
    await stepBtns.nth(2).click();
    await expect(decBtn).toHaveText('- 10');
    await expect(incBtn).toHaveText('+ 10');

    // Click increment (+ 10)
    await incBtn.click();
    await expect(counterValue).toHaveText('20');
    await expect(derivedValue).toHaveText('40');
  });

  test('decrements counter, triggers reactive @if branch when negative, and recovers', async ({ page }) => {
    const island = page.locator('[data-drift-island="CounterDemo"]');
    const counterValue = island.locator('.counter-value');
    const derivedValue = island.locator('.derived-highlight');
    const decBtn = island.locator('.btn-group button').nth(0);
    const incBtn = island.locator('.btn-group button').nth(2);
    const negativeNotice = island.locator('.counter-notice.negative');
    const positiveNotice = island.locator('.counter-notice.positive');
    const zeroNotice = island.locator('.counter-notice.zero');

    // Initial state: 0, zero notice visible
    await expect(zeroNotice).toHaveText('Notice: Value is currently zero');
    await expect(negativeNotice).toHaveCount(0);
    await expect(positiveNotice).toHaveCount(0);

    // Decrement by 1 -> count = -1
    await decBtn.click();
    await expect(counterValue).toHaveText('-1');
    await expect(derivedValue).toHaveText('-2');

    // @if count < 0 should evaluate to true and render the negative notice
    await expect(negativeNotice).toBeVisible();
    await expect(negativeNotice).toHaveText('Notice: Value is currently negative!');
    await expect(zeroNotice).toHaveCount(0);
    await expect(positiveNotice).toHaveCount(0);

    // Decrement again -> count = -2
    await decBtn.click();
    await expect(counterValue).toHaveText('-2');
    await expect(derivedValue).toHaveText('-4');
    await expect(negativeNotice).toBeVisible();

    // Increment back -> count = -1
    await incBtn.click();
    await expect(counterValue).toHaveText('-1');
    await expect(derivedValue).toHaveText('-2');
    await expect(negativeNotice).toBeVisible();

    // Increment to 0 -> zero notice should return
    await incBtn.click();
    await expect(counterValue).toHaveText('0');
    await expect(derivedValue).toHaveText('0');
    await expect(negativeNotice).toHaveCount(0);
    await expect(zeroNotice).toHaveText('Notice: Value is currently zero');

    // Increment to 1 -> positive notice should render
    await incBtn.click();
    await expect(counterValue).toHaveText('1');
    await expect(derivedValue).toHaveText('2');
    await expect(negativeNotice).toHaveCount(0);
    await expect(zeroNotice).toHaveCount(0);
    await expect(positiveNotice).toHaveText('Notice: Value is currently positive!');
  });

  test('resets state accurately from positive or negative values', async ({ page }) => {
    const island = page.locator('[data-drift-island="CounterDemo"]');
    const counterValue = island.locator('.counter-value');
    const derivedValue = island.locator('.derived-highlight');
    const resetBtn = island.locator('.btn-group button.reset');
    const stepBtns = island.locator('.step-selector .step-btn');
    const decBtn = island.locator('.btn-group button').nth(0);
    const incBtn = island.locator('.btn-group button').nth(2);
    const negativeNotice = island.locator('.counter-notice.negative');
    const positiveNotice = island.locator('.counter-notice.positive');
    const zeroNotice = island.locator('.counter-notice.zero');

    // Step size 10, increment twice to 20
    await stepBtns.nth(2).click();
    await incBtn.click();
    await incBtn.click();
    await expect(counterValue).toHaveText('20');
    await expect(derivedValue).toHaveText('40');
    await expect(positiveNotice).toHaveText('Notice: Value is currently positive!');

    // Click Reset
    await resetBtn.click();
    await expect(counterValue).toHaveText('0');
    await expect(derivedValue).toHaveText('0');
    await expect(zeroNotice).toHaveText('Notice: Value is currently zero');
    await expect(positiveNotice).toHaveCount(0);
    await expect(negativeNotice).toHaveCount(0);

    // Now decrement to negative
    await decBtn.click();
    await expect(counterValue).toHaveText('-10');
    await expect(derivedValue).toHaveText('-20');
    await expect(negativeNotice).toBeVisible();
    await expect(zeroNotice).toHaveCount(0);

    // Click Reset from negative state
    await resetBtn.click();
    await expect(counterValue).toHaveText('0');
    await expect(derivedValue).toHaveText('0');
    await expect(zeroNotice).toHaveText('Notice: Value is currently zero');
    await expect(negativeNotice).toHaveCount(0);
    await expect(positiveNotice).toHaveCount(0);
  });

  test('handles rapid sequential clicks maintaining consistent reactive state', async ({ page }) => {
    const island = page.locator('[data-drift-island="CounterDemo"]');
    const counterValue = island.locator('.counter-value');
    const derivedValue = island.locator('.derived-highlight');
    const incBtn = island.locator('.btn-group button').nth(2);

    // Rapidly click increment 10 times
    for (let i = 0; i < 10; i++) {
      await incBtn.click();
    }

    // Final state should precisely reflect 10 increments
    await expect(counterValue).toHaveText('10');
    await expect(derivedValue).toHaveText('20');
  });
});
