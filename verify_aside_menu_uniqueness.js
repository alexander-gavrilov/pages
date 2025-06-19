const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 400, height: 600 } });
  const page = await context.newPage();

  await page.goto('file:///app/wroclaw.html');
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(200); // Settle

  const result = await page.evaluate(() => {
    const allAsideMenus = document.querySelectorAll('#aside-menu');
    const firstAsideMenuHTML = allAsideMenus.length > 0 ? allAsideMenus[0].outerHTML.substring(0, 600) + "..." : "not found";
    const secondAsideMenuHTML = allAsideMenus.length > 1 ? allAsideMenus[1].outerHTML.substring(0, 600) + "..." : "not found";

    let firstMenuTimelineNavContent = "N/A";
    if (allAsideMenus.length > 0) {
        const timelineNav = allAsideMenus[0].querySelector('#timeline-nav');
        if (timelineNav) {
            firstMenuTimelineNavContent = timelineNav.innerHTML.substring(0, 400) + "...";
        } else {
            firstMenuTimelineNavContent = "timeline-nav not found in first aside-menu";
        }
    }

    let secondMenuTimelineNavContent = "N/A";
    if (allAsideMenus.length > 1) {
        const timelineNav = allAsideMenus[1].querySelector('#timeline-nav');
        if (timelineNav) {
            secondMenuTimelineNavContent = timelineNav.innerHTML.substring(0, 400) + "...";
        } else {
            secondMenuTimelineNavContent = "timeline-nav not found in second aside-menu";
        }
    }

    return {
      count: allAsideMenus.length,
      firstAsideMenuHTML,
      firstMenuTimelineNavContent,
      secondAsideMenuHTML,
      secondMenuTimelineNavContent,
      areSameNode: allAsideMenus.length > 1 ? allAsideMenus[0] === allAsideMenus[1] : "N/A"
    };
  });

  // Now, let's click the toggle and see what querySelector finds
  await page.click('#menu-toggle');
  await page.waitForTimeout(200);

  const afterToggleResult = await page.evaluate(() => {
    const openAsideMenu = document.querySelector('#aside-menu:not(.hidden)');
    if (!openAsideMenu) return { error: 'Open #aside-menu not found after toggle.' };

    const timelineNavInOpenMenu = openAsideMenu.querySelector('#timeline-nav');
    const timelineNavById = document.getElementById('timeline-nav');

    return {
        openAsideMenuHTML: openAsideMenu.outerHTML.substring(0, 600) + "...",
        timelineNavFoundInOpenMenu: !!timelineNavInOpenMenu,
        timelineNavContentInOpenMenu: timelineNavInOpenMenu ? timelineNavInOpenMenu.innerHTML.substring(0, 400) + "..." : "N/A",
        isTheFirstAsideMenu: document.querySelectorAll('#aside-menu')[0] === openAsideMenu,
        isTimelineNavStillInDOM: !!timelineNavById,
        timelineNavByIdParentHTML: timelineNavById ? timelineNavById.parentElement.outerHTML.substring(0,200) : "N/A"
    };
  });

  console.log(JSON.stringify({ beforeToggle: result, afterToggle: afterToggleResult }, null, 2));

  await browser.close();
})();
