const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 400, height: 600 } }); // Mobile viewport
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('file:///app/wroclaw.html');

  // Ensure DOM is loaded, especially the script at the bottom
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(200); // Additional small wait for scripts if any defer/async issues

  const results = [];
  const toggleButtonSelector = '#menu-toggle';
  const asideMenuSelector = '#aside-menu';

  async function getStates(stepName) {
    return page.evaluate(({ toggleButtonSelector, asideMenuSelector, stepName }) => {
      const button = document.querySelector(toggleButtonSelector);
      const menu = document.querySelector(asideMenuSelector);
      return {
        step: stepName,
        bodyHasMobileMenuOpen: document.body.classList.contains('mobile-menu-open'),
        ariaExpanded: button ? button.getAttribute('aria-expanded') : 'button-not-found',
        menuHasHidden: menu ? menu.classList.contains('hidden') : 'menu-not-found',
        buttonText: button ? button.textContent.trim() : 'button-not-found'
      };
    }, { toggleButtonSelector, asideMenuSelector, stepName });
  }

  // Initial state (menu should be hidden by default on mobile)
  results.push(await getStates('Initial Load'));

  // --- Cycle 1: Open ---
  await page.click(toggleButtonSelector);
  await page.waitForTimeout(100); // Wait for JS and class changes
  results.push(await getStates('After 1st Click (Open)'));

  // --- Cycle 1: Close ---
  await page.click(toggleButtonSelector);
  await page.waitForTimeout(100);
  results.push(await getStates('After 2nd Click (Close)'));

  // --- Cycle 2: Open ---
  await page.click(toggleButtonSelector);
  await page.waitForTimeout(100);
  results.push(await getStates('After 3rd Click (Open)'));

  // --- Cycle 2: Close ---
  await page.click(toggleButtonSelector);
  await page.waitForTimeout(100);
  results.push(await getStates('After 4th Click (Close)'));

  // --- Cycle 3: Open ---
  await page.click(toggleButtonSelector);
  await page.waitForTimeout(100);
  results.push(await getStates('After 5th Click (Open)'));


  console.log(JSON.stringify({
    consoleErrors,
    toggleStates: results
  }, null, 2));

  await browser.close();
})();
