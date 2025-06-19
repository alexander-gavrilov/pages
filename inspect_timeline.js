const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 400, height: 600 } });
  const page = await context.newPage();

  const consoleErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  await page.goto('file:///app/wroclaw.html');
  await page.waitForLoadState('domcontentloaded');

  // Click the menu toggle button to open the menu
  await page.click('#menu-toggle');
  await page.waitForTimeout(500); // Wait for menu to open and content to render

  const timelineInspectionResults = await page.evaluate(() => {
    const asideMenu = document.querySelector('#aside-menu:not(.hidden)');
    if (!asideMenu) return { error: '#aside-menu not found or not open' };

    const timelineNav = asideMenu.querySelector('#timeline-nav');
    if (!timelineNav) return { error: '#timeline-nav not found within open menu' };

    const timelineItems = timelineNav.querySelectorAll('.timeline-item');
    const firstItem = timelineItems.length > 0 ? timelineItems[0] : null;

    let firstItemDetails = null;
    if (firstItem) {
      const styles = window.getComputedStyle(firstItem);
      const h4 = firstItem.querySelector('h4');
      const p = firstItem.querySelector('p');
      firstItemDetails = {
        html: firstItem.outerHTML.substring(0, 200) + '...', // Get a snippet of its HTML
        display: styles.display,
        visibility: styles.visibility,
        width: styles.width,
        height: styles.height,
        opacity: styles.opacity,
        position: styles.position, // Added
        padding: styles.padding, // Added
        margin: styles.margin, // Added
        border: styles.border, // Added
        textColorH4: h4 ? window.getComputedStyle(h4).color : 'h4 not found',
        textColorP: p ? window.getComputedStyle(p).color : 'p not found',
        offsetTopInMenu: firstItem.offsetTop - asideMenu.offsetTop,
        offsetTopGlobal: firstItem.getBoundingClientRect().top, // Relative to viewport
        clientHeight: firstItem.clientHeight,
        scrollHeight: firstItem.scrollHeight,
      };
    }

    return {
      timelineNavExists: !!timelineNav,
      timelineItemCount: timelineItems.length,
      firstItemDetails: firstItemDetails,
      timelineNavHTML: timelineNav.innerHTML.substring(0, 500) + '...'
    };
  });

  console.log(JSON.stringify({
    consoleErrors,
    timelineInspectionResults
  }, null, 2));

  await browser.close();
})();
