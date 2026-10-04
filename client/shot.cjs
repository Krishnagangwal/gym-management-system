const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } });
  await page.setViewportSize({ width: 1600, height: 1000 });

  await page.goto('http://localhost:5174/login');
  await page.waitForSelector('input[type="email"]');
  await page.fill('input[type="email"]', 'admin@gym.com');
  await page.fill('input[type="password"]', 'Admin@123');
  await page.screenshot({ path: 'shots/login.png' });
  await page.click('button[type="submit"]');
  await page.waitForURL('**/dashboard');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'shots/dashboard.png', fullPage: true });

  const pages = ['members', 'membership-plans', 'trainers', 'workout-plans', 'exercises', 'attendance', 'payments', 'memberships', 'reports'];
  for (const p of pages) {
    await page.goto(`http://localhost:5174/${p}`);
    await page.waitForTimeout(700);
    await page.screenshot({ path: `shots/${p}.png`, fullPage: true });
  }

  const errors = [];
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push(msg.text()); });
  console.log('DONE');
  await browser.close();
})();
