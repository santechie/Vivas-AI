import asyncio
import json
import os
from playwright.async_api import async_playwright

async def inspect_farm_tabs():
    os.makedirs("scratch/crawled_settings/farm_tabs", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()

        print("Logging in...")
        await page.goto("https://my.tend.com/login", wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        await page.fill('input[name="username"], input[type="text"], input[type="email"]', 'gksvijay@gmail.com')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(2500)

        await page.fill('input[type="password"], input[name="password"]', 'Krishkrish@01')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(5000)

        if "selectfarm" in page.url:
            await page.evaluate("() => { const el = document.querySelector('.farm-item'); if (el) el.click(); }")
            await page.wait_for_timeout(5000)

        print("Navigating to https://my.tend.com/settings/farm-settings...")
        await page.goto("https://my.tend.com/settings/farm-settings", wait_until="domcontentloaded")
        await page.wait_for_timeout(4000)

        # Dismiss cookie
        cookie_btn = await page.query_selector('button:has-text("Accept All"), button:has-text("Reject All")')
        if cookie_btn:
            await cookie_btn.click()
            await page.wait_for_timeout(1000)

        tabs = ["Farm Profile", "Farm Operations", "Regional Settings", "Public Profile", "Additional Information"]
        results = {}

        for t in tabs:
            print(f"Clicking tab: {t}")
            tab_el = await page.query_selector(f'a:has-text("{t}"), span:has-text("{t}"), button:has-text("{t}"), li:has-text("{t}")')
            if tab_el:
                await tab_el.click()
                await page.wait_for_timeout(3000)
                safe_name = t.lower().replace(' ', '_')
                screen_path = f"scratch/crawled_settings/farm_tabs/{safe_name}.png"
                await page.screenshot(path=screen_path, full_page=True)
                
                info = await page.evaluate("""
                () => {
                    const getText = (selector) => Array.from(document.querySelectorAll(selector)).map(e => e.innerText.trim()).filter(Boolean);
                    return {
                        headings: getText('h1, h2, h3, h4'),
                        labels: getText('label, .form-label, .field-label'),
                        inputs: Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
                            type: i.type,
                            name: i.name || i.id,
                            placeholder: i.placeholder,
                            value: i.value,
                            checked: i.checked,
                            options: i.tagName.toLowerCase() === 'select' ? Array.from(i.options).map(o => o.text.trim()) : []
                        })),
                        fullText: document.body.innerText.slice(0, 3000)
                    };
                }
                """)
                info["screenshot"] = screen_path
                results[t] = info

        with open("scratch/crawled_settings/farm_tabs/farm_tabs.json", "w") as f:
            json.dump(results, f, indent=2)

        print("Done capturing farm-settings subtabs!")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect_farm_tabs())
