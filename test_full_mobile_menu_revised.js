const { chromium } = require('playwright');

(async () => {
  const viewport = { width: 375, height: 667 };
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport });
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

  const results = {};

  // --- Step 1: Initial Check ---
  results.initialState = await page.evaluate(() => {
    const menu = document.getElementById('aside-menu');
    const toggle = document.getElementById('menu-toggle');
    const menuStyles = menu ? window.getComputedStyle(menu) : null;
    return {
      asideMenuHiddenClass: menu ? menu.classList.contains('hidden') : 'not-found',
      asideMenuDisplay: menuStyles ? menuStyles.display : 'not-found',
      toggleVisible: toggle ? (toggle.offsetParent !== null) : 'not-found',
      toggleText: toggle ? toggle.textContent.trim() : 'not-found',
      toggleAriaExpanded: toggle ? toggle.getAttribute('aria-expanded') : 'not-found'
    };
  });

  // --- Step 2: Open Menu ---
  await page.click('#menu-toggle');
  await page.waitForTimeout(500);

  results.menuOpenState = await page.evaluate(() => {
    const menu = document.getElementById('aside-menu');
    const toggle = document.getElementById('menu-toggle');
    const body = document.body;
    const menuStyles = menu ? window.getComputedStyle(menu) : null;

    const menuOpenData = {
      toggleText: toggle ? toggle.textContent.trim() : 'not-found',
      toggleAriaExpanded: toggle ? toggle.getAttribute('aria-expanded') : 'not-found',
      togglePosition: toggle ? window.getComputedStyle(toggle).position : 'not-found',

      asideMenuIsEffectivelyVisible: menu ? !menu.classList.contains('hidden') && menuStyles && menuStyles.display !== 'none' && menuStyles.visibility !== 'hidden' : false,
      asideMenuHasHiddenClass: menu ? menu.classList.contains('hidden') : 'not-found',
      asideMenuDisplay: menuStyles ? menuStyles.display : 'not-found',
      asideMenuVisibility: menuStyles ? menuStyles.visibility : 'not-found',
      asideMenuPosition: menuStyles ? menuStyles.position : 'not-found',
      asideMenuOverflowY: menuStyles ? menuStyles.overflowY : 'not-found',
      asideMenuHeight: menuStyles ? menuStyles.height : 'not-found',

      bodyOverflow: window.getComputedStyle(body).overflow,
      bodyHasMobileMenuOpenClass: body.classList.contains('mobile-menu-open'),

      timeline: {
        navExists: false,
        itemCount: 0,
        firstThreeItemsVisible: [],
        firstItemText: 'N/A',
        firstItemColor: 'N/A'
      },
      scrollTest: {
        isScrollable: false,
        clientHeight: menu ? menu.clientHeight : 0,
        scrollHeight: menu ? menu.scrollHeight : 0,
        initialScrollTop: menu ? menu.scrollTop : 0,
        scrolledDelta: 0, // Will be calculated outside if scroll happens
      },
      otherContent: {
          statCardVisible: false,
          chartContainerVisible: false
      }
    };

    if (menu && menuOpenData.asideMenuIsEffectivelyVisible) {
      const timelineNav = menu.querySelector('#timeline-nav');
      if (timelineNav) {
        menuOpenData.timeline.navExists = true;
        const timelineItems = timelineNav.querySelectorAll('.timeline-item');
        menuOpenData.timeline.itemCount = timelineItems.length;

        for (let i = 0; i < Math.min(timelineItems.length, 3); i++) {
          const item = timelineItems[i];
          const styles = window.getComputedStyle(item);
          menuOpenData.timeline.firstThreeItemsVisible.push(item.offsetParent !== null && styles.display !== 'none' && styles.visibility === 'visible' && parseFloat(styles.opacity) > 0);
        }
        if (timelineItems.length > 0) {
          const firstItemH4 = timelineItems[0].querySelector('h4');
          menuOpenData.timeline.firstItemText = firstItemH4 ? firstItemH4.innerText.trim() : 'h4 not found';
          menuOpenData.timeline.firstItemColor = firstItemH4 ? window.getComputedStyle(firstItemH4).color : 'h4 not found';
        }
      }

      menuOpenData.scrollTest.isScrollable = menu.scrollHeight > menu.clientHeight;
      // Scroll test needs to be done via page.evaluate with a separate action or Playwright's own scroll commands

      const statCard = menu.querySelector('.space-y-4 > div:first-child');
      menuOpenData.otherContent.statCardVisible = statCard ? (statCard.offsetParent !== null && window.getComputedStyle(statCard).display !== 'none') : false;
      const chartContainer = menu.querySelector('.chart-container');
      menuOpenData.otherContent.chartContainerVisible = chartContainer ? (chartContainer.offsetParent !== null && window.getComputedStyle(chartContainer).display !== 'none') : false;
    }
    return menuOpenData;
  });

  // Perform scroll test outside the main evaluate block if menu is scrollable
  if (results.menuOpenState.scrollTest.isScrollable) {
    const scrollAmount = 200;
    await page.evaluate(scrollAmount => {
        document.getElementById('aside-menu').scrollTop += scrollAmount;
    }, scrollAmount);
    await page.waitForTimeout(100); // wait for scroll to register
    const scrolledScrollTop = await page.evaluate(() => document.getElementById('aside-menu').scrollTop);
    results.menuOpenState.scrollTest.scrolledDelta = scrolledScrollTop - results.menuOpenState.scrollTest.initialScrollTop;
  }


  // --- Step 3: Close Menu ---
  await page.click('#menu-toggle');
  await page.waitForTimeout(500);

  results.menuCloseState = await page.evaluate(() => {
    const menu = document.getElementById('aside-menu');
    const toggle = document.getElementById('menu-toggle');
    const body = document.body;
    return {
      asideMenuHiddenClass: menu ? menu.classList.contains('hidden') : 'not-found',
      asideMenuDisplay: menu ? window.getComputedStyle(menu).display : 'not-found',
      bodyOverflow: window.getComputedStyle(body).overflow,
      bodyHasMobileMenuOpenClass: body.classList.contains('mobile-menu-open'),
      toggleText: toggle ? toggle.textContent.trim() : 'not-found',
      toggleAriaExpanded: toggle ? toggle.getAttribute('aria-expanded') : 'not-found'
    };
  });

  console.log(JSON.stringify({ consoleErrors, results }, null, 2));
  await browser.close();
})();
