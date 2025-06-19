const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 400, height: 600 }, // Simulate mobile view
  });
  const page = await context.newPage();
  await page.goto('file:///app/wroclaw.html');

  // Click the menu toggle button
  await page.click('#menu-toggle');

  // Wait for animations if any (e.g. slide-in menu)
  await page.waitForTimeout(500); // Adjust timeout as needed

  // Get CSS properties of #aside-menu
  const asideMenuStyles = await page.evaluate(() => {
    const menu = document.querySelector('#aside-menu');
    if (!menu) return null;
    const styles = window.getComputedStyle(menu);
    return {
      display: styles.display,
      position: styles.position,
      height: styles.height,
      maxHeight: styles.maxHeight,
      overflow: styles.overflow,
      overflowY: styles.overflowY,
      top: styles.top,
      left: styles.left,
      bottom: styles.bottom,
      right: styles.right,
      transform: styles.transform,
      width: styles.width,
      zIndex: styles.zIndex,
    };
  });

  // Check if #aside-menu is scrollable
  const asideMenuScrollable = await page.evaluate(() => {
    const menu = document.querySelector('#aside-menu');
    if (!menu) return false;
    return menu.scrollHeight > menu.clientHeight || menu.scrollWidth > menu.clientWidth;
  });

  // Check body scroll
   const bodyScrollable = await page.evaluate(() => {
    const menu = document.querySelector('#aside-menu'); // Check scroll relative to menu state
    if (menu && window.getComputedStyle(menu).display !== 'none') { // if menu is open
        // Check if body is scrollable ONLY if menu itself is not scrollable AND content overflows viewport
        const isMenuScrollable = menu.scrollHeight > menu.clientHeight || menu.scrollWidth > menu.clientWidth;
        return document.body.scrollHeight > window.innerHeight && !isMenuScrollable;
    }
    // Default check if menu is not open or not present
    return document.body.scrollHeight > window.innerHeight || document.body.scrollWidth > window.innerWidth;
  });

  // Check visibility and text of the menu toggle button
  const menuToggleButtonState = await page.evaluate(() => {
    const button = document.querySelector('#menu-toggle');
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    return {
      text: button.textContent.trim(),
      visible: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
      html: button.innerHTML,
    };
  });

  // Behavior of #main-content
  const mainContentStyles = await page.evaluate(() => {
    const mainContent = document.querySelector('#main-content');
    if (!mainContent) return null;
    const styles = window.getComputedStyle(mainContent);
    return {
      display: styles.display,
      marginLeft: styles.marginLeft,
      marginRight: styles.marginRight,
      position: styles.position,
      filter: styles.filter,
      overflow: styles.overflow, // Check how main content handles overflow
    };
  });

  // Content overflow details
  const overflowDetails = await page.evaluate(() => {
    const menu = document.querySelector('#aside-menu');
    if (!menu) return null;
    const timelineNav = menu.querySelector('#timeline-nav');
    const timeAllocationChart = menu.querySelector('#timeAllocationChart');

    return {
        asideMenuScrollHeight: menu.scrollHeight,
        asideMenuClientHeight: menu.clientHeight,
        timelineNavScrollHeight: timelineNav ? timelineNav.scrollHeight : 0,
        timelineNavClientHeight: timelineNav ? timelineNav.clientHeight : 0,
        timeAllocationChartScrollHeight: timeAllocationChart ? timeAllocationChart.scrollHeight : 0,
        timeAllocationChartClientHeight: timeAllocationChart ? timeAllocationChart.clientHeight : 0,
    };
  });

  console.log(JSON.stringify({
    asideMenuStyles,
    asideMenuScrollable,
    bodyScrollable,
    menuToggleButtonState,
    mainContentStyles,
    overflowDetails
  }, null, 2));

  await browser.close();
})();
