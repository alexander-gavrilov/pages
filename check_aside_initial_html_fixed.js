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
  await page.waitForTimeout(500);

  const result = await page.evaluate(() => {
    const asideMenuElement = document.getElementById('aside-menu');
    if (!asideMenuElement) {
      return { error: "#aside-menu not found" };
    }

    const asideMenuInnerHTML = asideMenuElement.innerHTML;
    const timelineScrollInAsideMenu = asideMenuElement.querySelector('.timeline-scroll');
    const timelineNavInAsideMenu = timelineScrollInAsideMenu ? timelineScrollInAsideMenu.querySelector('#timeline-nav') : null;

    const globalTimelineNav = document.getElementById('timeline-nav');
    let globalTimelineNavContentRendered = false;
    let firstTimelineItemStyles = null;

    if (globalTimelineNav && globalTimelineNav.querySelector('.timeline-item')) {
        globalTimelineNavContentRendered = true;
        const firstItem = globalTimelineNav.querySelector('.timeline-item');
        if (firstItem) {
            const styles = window.getComputedStyle(firstItem);
            const h4 = firstItem.querySelector('h4');
            firstTimelineItemStyles = {
                display: styles.display,
                visibility: styles.visibility,
                height: styles.height,
                opacity: styles.opacity,
                color: h4 ? window.getComputedStyle(h4).color : 'h4 not found',
            };
        }
    }

    return {
      asideMenuInnerHTMLSnapshot: asideMenuInnerHTML.substring(asideMenuInnerHTML.indexOf('Маршрут') - 100, asideMenuInnerHTML.indexOf('Маршрут') + 600),
      timelineScrollFoundByQueryInAsideMenu: !!timelineScrollInAsideMenu,
      timelineNavFoundByQueryInAsideMenu: !!timelineNavInAsideMenu,
      timelineNavInnerHTMLFromQuery: timelineNavInAsideMenu ? timelineNavInAsideMenu.innerHTML.substring(0,300)+'...' : "N/A",
      globalTimelineNavContentRendered,
      isGlobalTimelineNavChildOfAsideMenu: globalTimelineNav ? asideMenuElement.contains(globalTimelineNav) : false,
      firstTimelineItemStyles
    };
  });

  // For good measure, let's also check the state after menu toggle
  await page.click('#menu-toggle');
  await page.waitForTimeout(500);

  const afterToggleResult = await page.evaluate(() => {
    const openAsideMenu = document.querySelector('#aside-menu:not(.hidden)');
    if (!openAsideMenu) return { error: "Open #aside-menu not found" };

    const timelineScroll = openAsideMenu.querySelector('.timeline-scroll');
    const timelineNav = timelineScroll ? timelineScroll.querySelector('#timeline-nav') : null;
    const firstItem = timelineNav ? timelineNav.querySelector('.timeline-item') : null;

    return {
        timelineScrollFound: !!timelineScroll,
        timelineNavFound: !!timelineNav,
        timelineItemCount: firstItem ? timelineNav.children.length : 0,
        firstItemVisible: firstItem ? firstItem.offsetParent !== null : false
    };
  });


  console.log(JSON.stringify({
    consoleErrors,
    initialCheckResult: result, // Renamed for clarity
    afterToggleCheckResult: afterToggleResult
  }, null, 2));

  await browser.close();
})();
