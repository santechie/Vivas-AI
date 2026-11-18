import asyncio
from playwright.async_api import async_playwright

async def test():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()

        page.on("console", lambda msg: print(f"[Browser Console] {msg.type}: {msg.text}"))
        page.on("request", lambda req: print(f"[Req] {req.method} {req.url}") if 'settings' in req.url or 'chunk' in req.url else None)

        print("Navigating to login...")
        await page.goto("https://my.tend.com/login", wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        # Login
        await page.fill('input[name="username"], input[type="text"], input[type="email"]', 'gksvijay@gmail.com')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(2500)

        await page.fill('input[type="password"], input[name="password"]', 'Krishkrish@01')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(5000)

        if "selectfarm" in page.url:
            await page.evaluate("() => { const el = document.querySelector('.farm-item'); if (el) el.click(); }")
            await page.wait_for_timeout(5000)

        print("Going to settings...")
        await page.goto("https://my.tend.com/settings", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)

        # Dismiss cookie banner if present
        print("Checking cookie banner...")
        cookie_btn = await page.query_selector('button:has-text("Accept All"), button:has-text("Reject All")')
        if cookie_btn:
            print("Clicking cookie dismiss...")
            await cookie_btn.click()
            await page.wait_for_timeout(1000)

        # Let's inspect the first card
        first_card = await page.query_selector('.grid-item:has-text("Farm Profile")')
        print("First card found:", bool(first_card))
        if first_card:
            print("Clicking first card with page.click...")
            await first_card.click()
            await page.wait_for_timeout(4000)
            print("URL after click:", page.url)
            await page.screenshot(path="scratch/after_first_card_click.png", full_page=True)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(test())
