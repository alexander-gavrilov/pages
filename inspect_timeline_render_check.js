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
  await page.waitForTimeout(500); // Allow scripts like renderTimeline to run

  // Click the menu toggle button to open the menu
  await page.click('#menu-toggle');
  await page.waitForTimeout(500); // Wait for menu to open

  const inspectionResult = await page.evaluate(() => {
    const openAsideMenu = document.querySelector('#aside-menu:not(.hidden)');
    if (!openAsideMenu) {
      return { error: 'Open #aside-menu not found.' };
    }

    // Attempt to find .timeline-scroll and #timeline-nav within the openAsideMenu
    const timelineScrollInMenu = openAsideMenu.querySelector('.timeline-scroll');
    const timelineNavInMenu = timelineScrollInMenu ? timelineScrollInMenu.querySelector('#timeline-nav') : null;

    // For comparison, get #timeline-nav by its ID globally
    const timelineNavGlobal = document.getElementById('timeline-nav');
    let globalTimelineNavStyles = null;
    let globalTimelineNavFirstItemStyles = null;

    if (timelineNavGlobal) {
        globalTimelineNavStyles = window.getComputedStyle(timelineNavGlobal);
        const firstItem = timelineNavGlobal.querySelector('.timeline-item');
        if (firstItem) {
            globalTimelineNavFirstItemStyles = window.getComputedStyle(firstItem);
        }
    }

    return {
      openAsideMenuExists: !!openAsideMenu,
      timelineScrollFoundInMenu: !!timelineScrollInMenu,
      timelineScrollInMenuHTML: timelineScrollInMenu ? timelineScrollInMenu.innerHTML.substring(0, 500) + '...' : 'Not found in openAsideMenu',
      timelineNavFoundInMenuScroller: !!timelineNavInMenu, // Check if #timeline-nav is inside the .timeline-scroll found in menu
      timelineNavInMenuScrollerHTML: timelineNavInMenu ? timelineNavInMenu.innerHTML.substring(0,500) + '...' : 'Not found in .timeline-scroll of openAsideMenu',

      // Details of #timeline-nav found globally (which we know is populated)
      timelineNavGlobalExists: !!timelineNavGlobal,
      timelineNavGlobalParentClass: timelineNavGlobal ? timelineNavGlobal.parentElement.className : 'N/A',
      timelineNavGlobalStyles: timelineNavGlobalStyles ? {
          display: globalTimelineNavStyles.display,
          visibility: globalTimelineNavStyles.visibility,
          height: globalTimelineNavStyles.height,
          opacity: globalTimelineNavStyles.opacity
      } : 'N/A',
      timelineNavGlobalFirstItemStyles: globalTimelineNavFirstItemStyles ? {
          display: globalTimelineNavFirstItemStyles.display,
          visibility: globalTimelineNavFirstItemStyles.visibility,
          height: globalTimelineNavFirstItemStyles.height,
          opacity: globalTimelineNavFirstItemStyles.opacity,
          color: globalTimelineNavFirstItemStyles.color, // Example: color of text
      } : 'First item not found in global #timeline-nav or #timeline-nav itself not found'
    };
  });

  console.log(JSON.stringify({
    consoleErrors,
    inspectionResult
  }, null, 2));

  await browser.close();
})();
