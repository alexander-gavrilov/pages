const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 400, height: 600 }, // Simulate mobile view
  });
  const page = await context.newPage();
  await page.goto('file:///app/wroclaw.html');

  // Click the menu toggle button to open the menu
  await page.click('#menu-toggle');

  await page.waitForTimeout(500);

  // --- Check #menu-toggle button ---
  const menuToggleButtonState = await page.evaluate(() => {
    const button = document.querySelector('#menu-toggle');
    if (!button) return null;
    const rect = button.getBoundingClientRect();
    const styles = window.getComputedStyle(button);
    return {
      text: button.textContent.trim(),
      html: button.innerHTML,
      visible: rect.top >= 0 && rect.left >= 0 && rect.bottom <= window.innerHeight && rect.right <= window.innerWidth,
      zIndex: styles.zIndex,
      position: styles.position,
      width: styles.width,
      top: styles.top,
      left: styles.left,
      right: styles.right, // Added to check fixed positioning
      bottom: styles.bottom // Added to check fixed positioning
    };
  });

  // --- Check #aside-menu properties ---
  const asideMenuState = await page.evaluate(() => {
    const menu = document.querySelector('#aside-menu');
    // Ensure menu is considered open for this check
    if (!menu || menu.classList.contains('hidden')) return { styles: null, scrollable: false, classList: menu ? menu.className : '', isHidden: true };

    const styles = window.getComputedStyle(menu);
    return {
      styles: {
        display: styles.display,
        position: styles.position,
        top: styles.top,
        left: styles.left,
        right: styles.right,
        bottom: styles.bottom,
        overflowY: styles.overflowY,
        zIndex: styles.zIndex,
        height: styles.height, // This should now be 100vh (e.g. 600px)
        width: styles.width,
        backgroundColor: styles.backgroundColor,
        backdropFilter: styles.backdropFilter,
        webkitBackdropFilter: styles.webkitBackdropFilter,
        borderRadius: styles.borderRadius,
      },
      scrollable: menu.scrollHeight > menu.clientHeight,
      classList: menu.className,
      scrollHeight: menu.scrollHeight, // Expected to be > clientHeight if content overflows
      clientHeight: menu.clientHeight, // Expected to be ~600px (viewport height)
      isHidden: false,
    };
  });

  // --- Check .chart-container ---
  const chartContainerState = await page.evaluate(() => {
    const menu = document.querySelector('#aside-menu:not(.hidden)');
    if (!menu) return null;
    const container = menu.querySelector('.chart-container');
    if (!container) return null;
    const styles = window.getComputedStyle(container);
    return {
      width: styles.width,
      minWidth: styles.minWidth,
      marginLeft: styles.marginLeft,
      marginRight: styles.marginRight,
      height: styles.height,
    };
  });

  // --- Check .timeline-scroll ---
  const timelineScrollState = await page.evaluate(() => {
    const menu = document.querySelector('#aside-menu:not(.hidden)');
    if (!menu) return null;
    const scrollArea = menu.querySelector('.timeline-scroll'); // Direct child of aside-menu
    if (!scrollArea) return { found: false, message: "'.timeline-scroll' not found directly under '#aside-menu:not(.hidden)'" };

    const styles = window.getComputedStyle(scrollArea);
    return {
      found: true,
      marginLeft: styles.marginLeft,
      marginRight: styles.marginRight,
      overflowX: styles.overflowX, // Should be auto from existing rules
      // Check its content's width vs its own width
      scrollWidth: scrollArea.scrollWidth,
      clientWidth: scrollArea.clientWidth,
      isScrollableX: scrollArea.scrollWidth > scrollArea.clientWidth,
    };
  });

  // --- Check if body is scrollable when menu is open ---
  const bodyScrollable = await page.evaluate(() => {
    const menu = document.querySelector('#aside-menu:not(.hidden)');
    if (menu && window.getComputedStyle(menu).position === 'fixed') {
        // Check if body has overflow: hidden or similar, or simply if its scrollHeight > clientHeight
        // For now, we expect body NOT to be scrollable.
        const bodyStyles = window.getComputedStyle(document.body);
        if (bodyStyles.overflow === 'hidden' || bodyStyles.overflowY === 'hidden') return false;
        return document.body.scrollHeight > window.innerHeight; // A direct check
    }
    return document.body.scrollHeight > window.innerHeight || document.body.scrollWidth > window.innerWidth;
  });

  // --- Check if main content is visible ---
  const mainContentState = await page.evaluate(() => {
    const mainContent = document.querySelector('#main-content');
    if (!mainContent) return { visible: false, display: '', visibility: '', opacity: '' };
    const styles = window.getComputedStyle(mainContent);
    return {
        visible: styles.display !== 'none' && styles.visibility !== 'hidden' && parseFloat(styles.opacity) > 0 && styles.position !== 'fixed' && styles.zIndex < (window.getComputedStyle(document.querySelector('#aside-menu')).zIndex || 40),
        display: styles.display,
        visibility: styles.visibility,
        opacity: styles.opacity,
        position: styles.position,
        zIndex: styles.zIndex,
        filter: styles.filter // Check if any filter is applied (e.g. blur)
    };
  });

  console.log(JSON.stringify({
    menuToggleButtonState,
    asideMenuState,
    chartContainerState,
    timelineScrollState,
    bodyScrollable,
    mainContentState
  }, null, 2));

  await browser.close();
})();
