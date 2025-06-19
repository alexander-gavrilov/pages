const { chromium } = require('playwright');

const viewports = [
  { name: 'Small Phone', width: 360, height: 640 },
  { name: 'Large Phone', width: 414, height: 896 },
  { name: 'Tablet (Portrait)', width: 768, height: 1024 },
];

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const allResults = [];
  const consoleErrors = {};

  for (const vp of viewports) {
    consoleErrors[vp.name] = [];
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
    const page = await context.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors[vp.name].push(msg.text());
      }
    });

    await page.goto('file:///app/wroclaw.html');
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(200); //settle time

    const viewportResults = { viewport: vp.name, steps: [] };

    const toggleButtonSelector = '#menu-toggle';
    const asideMenuSelector = '#aside-menu';

    async function getPageStates(stepDescription) {
      return page.evaluate(({ toggleButtonSelector, asideMenuSelector, stepDescription }) => {
        const button = document.querySelector(toggleButtonSelector);
        const menu = document.querySelector(asideMenuSelector);

        let menuDetails = 'not-found';
        if (menu) {
            const menuStyles = window.getComputedStyle(menu);
            const statCard = menu.querySelector('.space-y-4 > div:first-child');
            const chartContainer = menu.querySelector('.chart-container');
            const timelineItem = menu.querySelector('#timeline-nav .timeline-item:first-child');

            menuDetails = {
                hidden: menu.classList.contains('hidden'),
                visible: menu.offsetParent !== null,
                styles: {
                    display: menuStyles.display,
                    position: menuStyles.position,
                    top: menuStyles.top,
                    left: menuStyles.left,
                    right: menuStyles.right,
                    bottom: menuStyles.bottom,
                    overflowY: menuStyles.overflowY,
                    height: menuStyles.height,
                    clientHeight: menu.clientHeight,
                    scrollHeight: menu.scrollHeight
                },
                scrollTopBefore: 0,
                scrollTopAfter: 0,
                attemptedScroll: false,
                isActuallyScrollable: menu.scrollHeight > menu.clientHeight,
                contentLayout: {
                    statCardVisible: statCard ? statCard.offsetParent !== null && window.getComputedStyle(statCard).display !== 'none' : false,
                    chartContainerVisible: chartContainer ? chartContainer.offsetParent !== null && window.getComputedStyle(chartContainer).display !== 'none' : false,
                    timelineItemVisible: timelineItem ? timelineItem.offsetParent !== null && window.getComputedStyle(timelineItem).display !== 'none' : false,
                    statCardWidth: statCard ? window.getComputedStyle(statCard).width : 'N/A',
                    chartContainerWidth: chartContainer ? window.getComputedStyle(chartContainer).width : 'N/A',
                    timelineItemWidth: timelineItem ? window.getComputedStyle(timelineItem).width : 'N/A',
                }
            };

            if (!menuDetails.hidden && menuDetails.isActuallyScrollable) {
                menuDetails.attemptedScroll = true;
                menuDetails.scrollTopBefore = menu.scrollTop;
                menu.scrollTop += 100;
                menuDetails.scrollTopAfter = menu.scrollTop;
            }
        }

        return {
          step: stepDescription,
          menuToggle: button ? {
            text: button.textContent.trim(),
            ariaExpanded: button.getAttribute('aria-expanded'),
            visible: button.offsetParent !== null,
            styles: window.getComputedStyle(button) ? { position: window.getComputedStyle(button).position, zIndex: window.getComputedStyle(button).zIndex, top: window.getComputedStyle(button).top, right: window.getComputedStyle(button).right } : {},
          } : 'not-found',
          asideMenu: menuDetails,
          body: {
            overflow: document.body.style.overflow,
            computedOverflow: window.getComputedStyle(document.body).overflow,
            computedOverflowY: window.getComputedStyle(document.body).overflowY,
            hasClassMobileMenuOpen: document.body.classList.contains('mobile-menu-open'),
          }
        };
      }, { toggleButtonSelector, asideMenuSelector, stepDescription });
    }

    // 1. Initial Check
    viewportResults.steps.push(await getPageStates('Initial Load'));

    // 2. Open Menu
    if (await page.isVisible(toggleButtonSelector)) { // Ensure button is there before clicking
        await page.click(toggleButtonSelector);
        await page.waitForTimeout(200);
        viewportResults.steps.push(await getPageStates('Menu Open'));
    } else {
        viewportResults.steps.push({ step: 'Menu Open', error: 'Toggle button not visible to click' });
    }

    // 3. Close Menu
    if (await page.isVisible(toggleButtonSelector)) {
        await page.click(toggleButtonSelector);
        await page.waitForTimeout(200);
        viewportResults.steps.push(await getPageStates('Menu Close'));
    } else {
         viewportResults.steps.push({ step: 'Menu Close', error: 'Toggle button not visible to click' });
    }

    allResults.push(viewportResults);
    await page.close();
    await context.close();
  }

  console.log(JSON.stringify({ consoleErrors, allResults }, null, 2));
  await browser.close();
})();
