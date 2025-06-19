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

    const timelineNavElement = document.getElementById('timeline-nav');
    if (!timelineNavElement) {
      return { error: '#timeline-nav element not found in document.' };
    }

    // Check if timelineNavElement is a descendant of openAsideMenu
    let isDescendant = false;
    let currentElement = timelineNavElement.parentElement;
    while (currentElement) {
      if (currentElement === openAsideMenu) {
        isDescendant = true;
        break;
      }
      currentElement = currentElement.parentElement;
    }

    if (!isDescendant) {
      return {
        error: '#timeline-nav is not a descendant of the open #aside-menu.',
        timelineNavParentOuterHTML: timelineNavElement.parentElement ? timelineNavElement.parentElement.outerHTML.substring(0, 200) : 'No parent',
        openAsideMenuOuterHTML: openAsideMenu.outerHTML.substring(0, 200)
      };
    }

    // Now that we confirmed it's a descendant, let's get details of the first item
    const timelineItems = timelineNavElement.querySelectorAll('.timeline-item');
    const firstItem = timelineItems.length > 0 ? timelineItems[0] : null;

    let firstItemDetails = null;
    if (firstItem) {
      const styles = window.getComputedStyle(firstItem);
      const h4 = firstItem.querySelector('h4');
      firstItemDetails = {
        htmlSnippet: firstItem.outerHTML.substring(0, 100) + '...',
        display: styles.display,
        visibility: styles.visibility,
        width: styles.width,
        height: styles.height,
        opacity: styles.opacity,
        colorH4: h4 ? window.getComputedStyle(h4).color : 'h4 not found',
        boundingClientRect: firstItem.getBoundingClientRect(), // position relative to viewport
        offsetTopInMenu: firstItem.offsetTop - openAsideMenu.offsetTop, // experimental
      };
    }

    const timelineScrollDiv = timelineNavElement.parentElement; // Should be .timeline-scroll
    const timelineScrollStyles = window.getComputedStyle(timelineScrollDiv);


    return {
      timelineNavIsDescendantOfOpenMenu: isDescendant,
      timelineItemCount: timelineItems.length,
      timelineNavDisplay: window.getComputedStyle(timelineNavElement).display,
      timelineNavVisibility: window.getComputedStyle(timelineNavElement).visibility,
      timelineNavClientHeight: timelineNavElement.clientHeight,
      timelineNavScrollHeight: timelineNavElement.scrollHeight,
      timelineScrollDivStyles: {
          display: timelineScrollStyles.display,
          width: timelineScrollStyles.width,
          height: timelineScrollStyles.height,
          overflowX: timelineScrollStyles.overflowX,
          padding: timelineScrollStyles.padding,
          margin: timelineScrollStyles.margin,
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
