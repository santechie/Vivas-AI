const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1400, height: 900 } });
  const page = await context.newPage();

  console.log('Navigating to login page...');
  await page.goto('https://my.tend.com/user/login', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'scratch/tend_login.png' });

  console.log('Logging in...');
  // Fill email & password
  await page.fill('input[type="email"], input[name="email"], input[name="username"]', 'gksvijay@gmail.com');
  await page.fill('input[type="password"], input[name="password"]', 'Krishkrish@01');
  
  // Click login
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click('button[type="submit"], input[type="submit"], button:has-text("Log In"), button:has-text("Sign In")')
  ]);

  console.log('Logged in successfully, current url:', page.url());
  await page.screenshot({ path: 'scratch/tend_dashboard.png' });

  // Navigate to Crop library / Card view
  console.log('Navigating to Crop Library...');
  await page.goto('https://my.tend.com/my-crops/card-view', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'scratch/tend_crop_library.png' });

  // Look for Add New button
  console.log('Looking for Add New button...');
  const addNewButton = await page.$('button:has-text("Add New"), a:has-text("Add New"), :text("Add New")');
  if (addNewButton) {
    console.log('Clicking Add New button...');
    await addNewButton.click();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: 'scratch/tend_add_new_menu.png' });

    const bodyHtml = await page.content();
    fs.writeFileSync('scratch/tend_crop_library.html', bodyHtml);
    console.log('Saved page html and screenshot of Add New menu');
  } else {
    console.log('Add New button not directly found, capturing page content');
    const bodyHtml = await page.content();
    fs.writeFileSync('scratch/tend_crop_library.html', bodyHtml);
  }

  await browser.close();
})();
