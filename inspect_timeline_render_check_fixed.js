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

    const timelineScrollInMenu = openAsideMenu.querySelector('.timeline-scroll');
    const timelineNavInMenu = timelineScrollInMenu ? timelineScrollInMenu.querySelector('#timeline-nav') : null;

    const timelineNavGlobal = document.getElementById('timeline-nav');
    let globalNavStyles = 'N/A';
    let globalFirstItemStyles = 'First item not found in global #timeline-nav or #timeline-nav itself not found';

    if (timelineNavGlobal) {
        const gns = window.getComputedStyle(timelineNavGlobal);
        globalNavStyles = {
            display: gns.display,
            visibility: gns.visibility,
            height: gns.height,
            opacity: gns.opacity
        };
        const firstItem = timelineNavGlobal.querySelector('.timeline-item');
        if (firstItem) {
            const fis = window.getComputedStyle(firstItem);
            const h4 = firstItem.querySelector('h4');
            globalFirstItemStyles = {
                display: fis.display,
                visibility: fis.visibility,
                height: fis.height,
                opacity: fis.opacity,
                color: h4 ? window.getComputedStyle(h4).color : 'h4 not found in first item',
                backgroundColor: fis.backgroundColor, // Check background
            };
        }
    }

    return {
      openAsideMenuExists: !!openAsideMenu,
      timelineScrollFoundInMenu: !!timelineScrollInMenu,
      timelineScrollInMenuHTML: timelineScrollInMenu ? timelineScrollInMenu.innerHTML.substring(0, 500) + '...' : 'Not found in openAsideMenu',
      timelineNavFoundInMenuScroller: !!timelineNavInMenu,
      timelineNavInMenuScrollerHTML: timelineNavInMenu ? timelineNavInMenu.innerHTML.substring(0,500) + '...' : 'Not found in .timeline-scroll of openAsideMenu',

      timelineNavGlobalExists: !!timelineNavGlobal,
      timelineNavGlobalParentClass: timelineNavGlobal ? timelineNavGlobal.parentElement.className : 'N/A',
      timelineNavGlobalStyles: globalNavStyles,
      timelineNavGlobalFirstItemStyles: globalFirstItemStyles
    };
  });

  console.log(JSON.stringify({
    consoleErrors,
    inspectionResult
  }, null, 2));

  await browser.close();
})();
