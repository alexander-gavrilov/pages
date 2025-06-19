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
  // Wait for DOM content to be loaded, scripts at the end of body to run, and a bit of settle time.
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500); // Increased settle time

  const result = await page.evaluate(() => {
    const asideMenuElement = document.getElementById('aside-menu');
    if (!asideMenuElement) {
      return { error: "#aside-menu not found" };
    }

    const asideMenuInnerHTML = asideMenuElement.innerHTML;
    const timelineScrollFoundByQuery = !!asideMenuElement.querySelector('.timeline-scroll');
    const timelineNavInScrollFoundByQuery = timelineScrollFoundByQuery ? !!asideMenuElement.querySelector('.timeline-scroll > #timeline-nav') : false;

    // Check if renderTimeline has populated the globally selected timelineNav
    const globalTimelineNav = document.getElementById('timeline-nav');
    let globalTimelineNavContentRendered = false;
    if (globalTimelineNav && globalTimelineNav.querySelector('.timeline-item')) {
        globalTimelineNavContentRendered = true;
    }

    return {
      asideMenuInnerHTMLSnapshot: asideMenuInnerHTML.substring(asideMenuInnerHTML.indexOf('Маршрут') - 100, asideMenuInnerHTML.indexOf('Маршрут') + 600), // Get snippet around "Маршрут"
      timelineScrollFoundByQueryInAsideMenu: timelineScrollFoundByQuery,
      timelineNavInScrollFoundByQueryInAsideMenu: timelineNavInScrollFoundByQuery,
      globalTimelineNavContentRendered,
      globalTimelineNavParentClass: globalTimelineNav ? globalTimelineNav.parentElement.className : "N/A (global #timeline-nav not found)",
      isGlobalTimelineNavChildOfAsideMenu: globalTimelineNav ? asideMenuElement.contains(globalTimelineNav) : false
    };
  });

  console.log(JSON.stringify({
    consoleErrors,
    result
  }, null, 2));

  await browser.close();
})();
