const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    const logs = [];
    page.on('console', msg => {
        if (msg.type() === 'error') {
            logs.push(`[Error] ${msg.text()}`);
        }
    });

    page.on('pageerror', error => {
        logs.push(`[PageError] ${error.message}\n${error.stack}`);
    });

    try {
        console.log('Navigating to admin login...');
        await page.goto('http://localhost:5174/login?admin=1');

        // The user said there is no password. Let's just click Sign In.
        console.log('Clicking Sign In...');
        await page.click('button:has-text("Sign In")');

        // Wait for navigation
        await page.waitForTimeout(2000);

        console.log('Clicking Player Data tab...');
        await page.click('button:has-text("Player Data")');

        await page.waitForTimeout(2000);

    } catch (err) {
        console.log('Script execution error:', err.message);
    }

    console.log('--- CAPTURED ERRORS ---');
    logs.forEach(l => console.log(l));
    console.log('-----------------------');

    await browser.close();
})();
