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
  await page.waitForTimeout(500); // Settle time for initial renders

  const results = {};

  // --- Step 1: Initial Check ---
  results.initialState = await page.evaluate(() => {
    const menu = document.getElementById('aside-menu');
    const toggle = document.getElementById('menu-toggle');
    return {
      asideMenuHidden: menu ? menu.classList.contains('hidden') : 'not-found',
      toggleVisible: toggle ? toggle.offsetParent !== null : 'not-found',
      toggleText: toggle ? toggle.textContent.trim() : 'not-found',
      toggleAriaExpanded: toggle ? toggle.getAttribute('aria-expanded') : 'not-found'
    };
  });

  // --- Step 2: Open Menu ---
  await page.click('#menu-toggle');
  await page.waitForTimeout(500); // Settle time for menu animation and content

  results.menuOpenState = await page.evaluate(async (vpHeight) => {
    const menu = document.getElementById('aside-menu');
    const toggle = document.getElementById('menu-toggle');
    const body = document.body;

    const menuOpenData = {
      toggleText: toggle ? toggle.textContent.trim() : 'not-found',
      toggleAriaExpanded: toggle ? toggle.getAttribute('aria-expanded') : 'not-found',
      togglePosition: toggle ? window.getComputedStyle(toggle).position : 'not-found',
      toggleZIndex: toggle ? window.getComputedStyle(toggle).zIndex : 'not-found',
      toggleTop: toggle ? window.getComputedStyle(toggle).top : 'not-found',
      toggleRight: toggle ? window.getComputedStyle(toggle).right : 'not-found',

      asideMenuVisible: menu ? !menu.classList.contains('hidden') && menu.offsetParent !== null : 'not-found',
      asideMenuPosition: menu ? window.getComputedStyle(menu).position : 'not-found',
      asideMenuTop: menu ? window.getComputedStyle(menu).top : 'not-found',
      asideMenuBottom: menu ? window.getComputedStyle(menu).bottom : 'not-found',
      asideMenuLeft: menu ? window.getComputedStyle(menu).left : 'not-found',
      asideMenuRight: menu ? window.getComputedStyle(menu).right : 'not-found',
      asideMenuOverflowY: menu ? window.getComputedStyle(menu).overflowY : 'not-found',
      asideMenuHeight: menu ? window.getComputedStyle(menu).height : 'not-found',

      bodyOverflow: window.getComputedStyle(body).overflow,
      bodyHasMobileMenuOpenClass: body.classList.contains('mobile-menu-open'),

      timeline: {
        navExists: false,
        itemCount: 0,
        itemsVisible: [],
        firstItemText: 'N/A',
        firstItemColor: 'N/A'
      },
      scrollTest: {
        isScrollable: false,
        initialScrollTop: 0,
        scrolledScrollTop: 0,
        didScroll: false,
        lastItemTopBeforeScroll: null,
        lastItemTopAfterScroll: null
      },
      otherContent: {
          statCardVisible: false,
          chartContainerVisible: false
      }
    };

    if (menu && menuOpenData.asideMenuVisible) {
      const timelineNav = menu.querySelector('#timeline-nav');
      if (timelineNav) {
        menuOpenData.timeline.navExists = true;
        const timelineItems = timelineNav.querySelectorAll('.timeline-item');
        menuOpenData.timeline.itemCount = timelineItems.length;

        for (let i = 0; i < Math.min(timelineItems.length, 3); i++) {
          const item = timelineItems[i];
          const styles = window.getComputedStyle(item);
          menuOpenData.timeline.itemsVisible.push(item.offsetParent !== null && styles.display !== 'none' && styles.visibility === 'visible' && parseFloat(styles.opacity) > 0);
        }
        if (timelineItems.length > 0) {
          const firstItemH4 = timelineItems[0].querySelector('h4');
          menuOpenData.timeline.firstItemText = firstItemH4 ? firstItemH4.innerText.trim() : 'h4 not found';
          menuOpenData.timeline.firstItemColor = firstItemH4 ? window.getComputedStyle(firstItemH4).color : 'h4 not found';
        }
      }

      menuOpenData.scrollTest.isScrollable = menu.scrollHeight > menu.clientHeight;
      if (menuOpenData.scrollTest.isScrollable) {
        menuOpenData.scrollTest.initialScrollTop = menu.scrollTop;
        const lastItem = menu.querySelector('#timeline-nav .timeline-item:last-child');
        if(lastItem) menuOpenData.scrollTest.lastItemTopBeforeScroll = lastItem.getBoundingClientRect().top;

        menu.scrollTop += 200; // Attempt to scroll
        await new Promise(r => setTimeout(r, 50)); // wait for scroll to take effect
        menuOpenData.scrollTest.scrolledScrollTop = menu.scrollTop;
        menuOpenData.scrollTest.didScroll = menuOpenData.scrollTest.scrolledScrollTop > menuOpenData.scrollTest.initialScrollTop;
        if(lastItem) menuOpenData.scrollTest.lastItemTopAfterScroll = lastItem.getBoundingClientRect().top;
      }

      const statCard = menu.querySelector('.space-y-4 > div:first-child');
      menuOpenData.otherContent.statCardVisible = statCard ? statCard.offsetParent !== null : false;
      const chartContainer = menu.querySelector('.chart-container');
      menuOpenData.otherContent.chartContainerVisible = chartContainer ? chartContainer.offsetParent !== null : false;
    }
    return menuOpenData;
  }, viewport.height);

  // --- Step 3: Close Menu ---
  await page.click('#menu-toggle');
  await page.waitForTimeout(500);

  results.menuCloseState = await page.evaluate(() => {
    const menu = document.getElementById('aside-menu');
    const toggle = document.getElementById('menu-toggle');
    const body = document.body;
    return {
      asideMenuHidden: menu ? menu.classList.contains('hidden') : 'not-found',
      bodyOverflow: window.getComputedStyle(body).overflow,
      bodyHasMobileMenuOpenClass: body.classList.contains('mobile-menu-open'),
      toggleText: toggle ? toggle.textContent.trim() : 'not-found',
      toggleAriaExpanded: toggle ? toggle.getAttribute('aria-expanded') : 'not-found'
    };
  });

  console.log(JSON.stringify({ consoleErrors, results }, null, 2));
  await browser.close();
})();
