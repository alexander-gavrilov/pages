const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 400, height: 600 }, // Simulate mobile view
  });
  const page = await context.newPage();
  await page.goto('file:///app/wroclaw.html');

  // Click the menu toggle button to open the menu
  await page.click('#menu-toggle');

  await page.waitForTimeout(500);

  // --- Check #menu-toggle button ---
  const menuToggleButtonState = await page.evaluate(() => {
    const button = document.querySelector('#menu-toggle');
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    const styles = window.getComputedStyle(button);
    return {
      text: button.textContent.trim(),
      visible: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
      zIndex: styles.zIndex,
      position: styles.position,
    };
  });

  // --- Check #aside-menu properties ---
  const asideMenuState = await page.evaluate(() => {
    const menu = document.querySelector('#aside-menu');
    if (!menu || menu.classList.contains('hidden')) return { styles: null, scrollable: false, isHidden: true };

    const styles = window.getComputedStyle(menu);
    return {
      styles: {
        position: styles.position,
        height: styles.height,
        overflowY: styles.overflowY,
        zIndex: styles.zIndex,
        backdropFilter: styles.backdropFilter,
      },
      scrollable: menu.scrollHeight > menu.clientHeight,
      scrollHeight: menu.scrollHeight,
      clientHeight: menu.clientHeight,
      isHidden: false,
    };
  });

  // --- Check .chart-container ---
  const chartContainerState = await page.evaluate(() => {
    const menu = document.querySelector('#aside-menu:not(.hidden)');
    if (!menu) return null;
    const container = menu.querySelector('.chart-container');
    if (!container) return null;
    const styles = window.getComputedStyle(container);
    return {
      width: styles.width,
      minWidth: styles.minWidth,
      marginLeft: styles.marginLeft,
      marginRight: styles.marginRight,
    };
  });

  // --- Check .timeline-scroll ---
  const timelineScrollState = await page.evaluate(() => {
    // Using a more specific selector that ensures it's a direct child of the visible menu
    const scrollArea = document.querySelector('#aside-menu:not(.hidden) > .timeline-scroll');
    if (!scrollArea) return { found: false, message: "'.timeline-scroll' (direct child) not found" };

    const styles = window.getComputedStyle(scrollArea);
    return {
      found: true,
      marginLeft: styles.marginLeft,
      marginRight: styles.marginRight,
      overflowX: styles.overflowX,
      isScrollableX: scrollArea.scrollWidth > scrollArea.clientWidth,
    };
  });

  // --- Check if body is scrollable when menu is open ---
  const bodyState = await page.evaluate(() => {
    const bodyStyles = window.getComputedStyle(document.body);
    return {
        overflow: bodyStyles.overflow,
        overflowY: bodyStyles.overflowY,
        isScrollable: document.body.scrollHeight > window.innerHeight,
        hasClassMobileMenuOpen: document.body.classList.contains('mobile-menu-open')
    };
  });

  // --- Check main content state (simplified) ---
  const mainContentState = await page.evaluate(() => {
    const mainContent = document.querySelector('#main-content');
    if (!mainContent) return { display: 'not-found' };
    const styles = window.getComputedStyle(mainContent);
    return {
        display: styles.display, // Expect 'block' or similar, not 'none'
        // It will be overlaid, so direct visibility isn't the prime concern
    };
  });

  console.log(JSON.stringify({
    menuToggleButtonState,
    asideMenuState,
    chartContainerState,
    timelineScrollState,
    bodyState,
    mainContentState
  }, null, 2));

  await browser.close();
})();
