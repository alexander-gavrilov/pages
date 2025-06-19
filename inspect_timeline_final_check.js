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

    // Use querySelector from the openAsideMenu context
    const timelineNavElement = openAsideMenu.querySelector('#timeline-nav');
    if (!timelineNavElement) {
      // Fallback: try to find it by ID in document to see if it's elsewhere or provide debug info
      const timelineNavGlobal = document.getElementById('timeline-nav');
      return {
          error: '#timeline-nav element not found within open #aside-menu.',
          timelineNavGlobalFound: !!timelineNavGlobal,
          timelineNavGlobalParent: timelineNavGlobal ? timelineNavGlobal.parentElement.className : 'N/A',
          openAsideMenuInnerHTML: openAsideMenu.innerHTML.substring(openAsideMenu.innerHTML.indexOf('Маршрут')-50, openAsideMenu.innerHTML.indexOf('Маршрут')+500) // HTML around "Маршрут"
      };
    }

    const timelineScrollDiv = timelineNavElement.parentElement; // Should be .timeline-scroll
    const timelineScrollStyles = window.getComputedStyle(timelineScrollDiv);

    const timelineItems = timelineNavElement.querySelectorAll('.timeline-item');
    const firstItem = timelineItems.length > 0 ? timelineItems[0] : null;

    let firstItemDetails = null;
    if (firstItem) {
      const styles = window.getComputedStyle(firstItem);
      const h4 = firstItem.querySelector('h4');
      firstItemDetails = {
        htmlSnippet: firstItem.outerHTML.substring(0, 250) + '...',
        display: styles.display,
        visibility: styles.visibility,
        width: styles.width,
        height: styles.height,
        minHeight: styles.minHeight,
        opacity: styles.opacity,
        colorH4: h4 ? window.getComputedStyle(h4).color : 'h4 not found',
        boundingClientRectTop: firstItem.getBoundingClientRect().top,
        offsetTopInScrollDiv: firstItem.offsetTop,
        clientHeight: firstItem.clientHeight,
        padding: styles.padding,
        margin: styles.margin,
      };
    }

    return {
      timelineNavFound: !!timelineNavElement,
      timelineItemCount: timelineItems.length,
      timelineNavStyles: {
          display: window.getComputedStyle(timelineNavElement).display,
          visibility: window.getComputedStyle(timelineNavElement).visibility,
          height: window.getComputedStyle(timelineNavElement).height,
          clientHeight: timelineNavElement.clientHeight,
      },
      timelineScrollDivStyles: {
          display: timelineScrollStyles.display,
          width: timelineScrollStyles.width,
          height: timelineScrollStyles.height,
          overflowX: timelineScrollStyles.overflowX,
          overflowY: timelineScrollStyles.overflowY, // Check this too
          padding: timelineScrollStyles.padding,
          margin: timelineScrollStyles.margin,
          clientHeight: timelineScrollDiv.clientHeight,
          scrollHeight: timelineScrollDiv.scrollHeight,
      },
      firstItemDetails: firstItemDetails,
    };
  });

  console.log(JSON.stringify({
    consoleErrors,
    inspectionResult
  }, null, 2));

  await browser.close();
})();
