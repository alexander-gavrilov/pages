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
  await page.waitForLoadState('domcontentloaded'); // Ensures DOM is ready
  await page.waitForTimeout(500); // Allow time for renderTimeline() to execute

  // 1. Initial Check (Post DOMContentLoaded)
  const initialState = await page.evaluate(() => {
    const asideMenuElement = document.getElementById('aside-menu');
    if (!asideMenuElement) return { error: "Initial: #aside-menu not found" };

    const timelineScrollElement = asideMenuElement.querySelector('.timeline-scroll');
    const timelineNavElement = timelineScrollElement ? timelineScrollElement.querySelector('#timeline-nav') : null;
    const timelineItems = timelineNavElement ? timelineNavElement.querySelectorAll('.timeline-item') : [];

    return {
      asideMenuExists: !!asideMenuElement,
      timelineScrollExists: !!timelineScrollElement,
      timelineScrollHTML: timelineScrollElement ? timelineScrollElement.innerHTML.substring(0, 500) + "..." : "N/A",
      timelineNavExists: !!timelineNavElement,
      timelineItemCount: timelineItems.length,
      firstTimelineItemHTML: timelineItems.length > 0 ? timelineItems[0].outerHTML.substring(0,100)+"..." : "N/A"
    };
  });

  // 2. Toggle Menu Open
  await page.click('#menu-toggle');
  await page.waitForTimeout(500); // Allow for any transitions/JS after click

  // 3. Re-Check Structure (After Toggle)
  const afterToggleState = await page.evaluate(() => {
    // It's crucial to re-select the #aside-menu here if we want to check what querySelector finds
    // But the spirit of the request is to see if the *original* element's content changed.
    // So, we'll use getElementById again, as it refers to the same single DOM element.
    const asideMenuElement = document.getElementById('aside-menu');
    if (!asideMenuElement) return { error: "AfterToggle: #aside-menu not found" };

    const isHidden = asideMenuElement.classList.contains('hidden');
    const timelineScrollElement = asideMenuElement.querySelector('.timeline-scroll');
    const timelineNavElement = timelineScrollElement ? timelineScrollElement.querySelector('#timeline-nav') : null;
    const timelineItems = timelineNavElement ? timelineNavElement.querySelectorAll('.timeline-item') : [];

    return {
      asideMenuIsHidden: isHidden,
      timelineScrollExists: !!timelineScrollElement,
      timelineScrollHTML: timelineScrollElement ? timelineScrollElement.innerHTML.substring(0, 500) + "..." : "N/A",
      timelineNavExists: !!timelineNavElement,
      timelineItemCount: timelineItems.length,
      firstTimelineItemHTML: timelineItems.length > 0 ? timelineItems[0].outerHTML.substring(0,100)+"..." : "N/A"
    };
  });

  console.log(JSON.stringify({
    consoleErrors,
    initialState,
    afterToggleState
  }, null, 2));

  await browser.close();
})();
