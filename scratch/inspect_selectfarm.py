import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1400, 'height': 900})
        page = await context.new_page()

        await page.goto("https://my.tend.com/login", wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        # Step 1: Username
        await page.fill('input[name="username"], input[type="text"]', 'gksvijay@gmail.com')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(3000)
        
        # Step 2: Password
        await page.fill('input[type="password"], input[name="password"]', 'Krishkrish@01')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(5000)
        
        print("Logged in URL:", page.url)

        if "selectfarm" in page.url:
            print("Inspecting selectfarm page HTML...")
            html = await page.content()
            with open("scratch/selectfarm.html", "w") as f:
                f.write(html)
            await page.screenshot(path="scratch/selectfarm.png")
            
            # Print interactive elements
            elements = await page.query_selector_all('a, button, div[class*="farm"], div[class*="card"]')
            for idx, el in enumerate(elements):
                txt = await el.inner_text()
                if txt.strip():
                    print(f"Elem {idx}: tag={await el.evaluate('e => e.tagName')}, class={await el.get_attribute('class')}, text={txt.strip()[:40]}")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
