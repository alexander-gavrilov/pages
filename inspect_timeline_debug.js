const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 400, height: 600 } });
  const page = await context.newPage();

  const consoleMessages = []; // Capture all console messages for debugging
  page.on('console', msg => {
    consoleMessages.push({ type: msg.type(), text: msg.text() });
  });

  // Inject a log into renderTimeline
  await page.addInitScript(() => {
    const originalRenderTimeline = window.renderTimeline;
    window.renderTimeline = function() {
      console.log('renderTimeline_debug: Called');
      if (originalRenderTimeline) {
        originalRenderTimeline.apply(this, arguments);
        console.log('renderTimeline_debug: Finished original call');
      } else {
        console.log('renderTimeline_debug: Original function not found');
      }
    };
    // Also check if the DOMContentLoaded listener for renderTimeline is there
     document.addEventListener('DOMContentLoaded', () => {
        console.log('DOMContentLoaded_debug: renderTimeline and renderTimeChart are called here in the original script.');
        // The original script calls renderTimeline() and renderTimeChart() here.
        // We can't directly see if they are called without modifying the original script more invasively,
        // but this message confirms the event listener itself is set up by our addInitScript.
     });
  });

  await page.goto('file:///app/wroclaw.html');
  // Increased wait to ensure scripts have ample time, including our injected ones
  await page.waitForLoadState('networkidle'); // Wait for network to be idle
  await page.waitForTimeout(1000);


  // Click the menu toggle button to open the menu
  await page.click('#menu-toggle');
  await page.waitForTimeout(500); // Wait for menu to open

  const timelineInspectionResults = await page.evaluate(() => {
    const asideMenu = document.querySelector('#aside-menu:not(.hidden)');
    if (!asideMenu) return { error: '#aside-menu not found or not open', asideMenuHTML: document.body.innerHTML.includes('aside-menu') ? document.querySelector('#aside-menu')?.outerHTML.substring(0,500) : "aside-menu tag not in body" };

    const asideMenuHTMLContent = asideMenu.innerHTML.substring(0, 1000) + '...'; // Get more of aside-menu content

    const timelineNav = asideMenu.querySelector('#timeline-nav'); // Original check
    const timelineNavDirectById = document.getElementById('timeline-nav'); // More direct check

    let firstItemDetails = null;
    if (timelineNav) {
      const timelineItems = timelineNav.querySelectorAll('.timeline-item');
      const firstItem = timelineItems.length > 0 ? timelineItems[0] : null;
      if (firstItem) {
        const styles = window.getComputedStyle(firstItem);
        const h4 = firstItem.querySelector('h4');
        firstItemDetails = {
          display: styles.display,
          visibility: styles.visibility,
          width: styles.width,
          height: styles.height,
          opacity: styles.opacity,
          textColorH4: h4 ? window.getComputedStyle(h4).color : 'h4 not found',
        };
      }
    }

    return {
      asideMenuHTMLContent,
      timelineNavExistsInAsideMenu: !!timelineNav,
      timelineNavExistsInDocument: !!timelineNavDirectById,
      timelineNavParentHTML: timelineNavDirectById ? timelineNavDirectById.parentElement.outerHTML.substring(0,300) : 'N/A',
      timelineItemCount: timelineNav ? timelineNav.querySelectorAll('.timeline-item').length : 0,
      firstItemDetails: firstItemDetails,
      timelineNavInitialHTML: document.getElementById('timeline-nav')?.innerHTML.substring(0, 500) + '...' // Content of timeline-nav if found in doc
    };
  });

  console.log(JSON.stringify({
    consoleMessages, // Changed from consoleErrors to see all messages
    timelineInspectionResults
  }, null, 2));

  await browser.close();
})();
