import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1400, 'height': 900})
        page = await context.new_page()

        await page.goto("https://my.tend.com/login", wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        # Step 1 & 2 Login
        await page.fill('input[name="username"], input[type="text"]', 'gksvijay@gmail.com')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(3000)
        await page.fill('input[type="password"], input[name="password"]', 'Krishkrish@01')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(4000)

        if "selectfarm" in page.url:
            farm = await page.query_selector('.farm-item')
            if farm:
                await farm.click()
                await page.wait_for_timeout(4000)

        await page.goto("https://my.tend.com/my-crops/card-view", wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)

        # Function to click Add New menu item
        async def open_add_new_option(option_text, filename_prefix):
            print(f"Testing Add New -> '{option_text}'...")
            add_btn = await page.query_selector('button:has-text("Add New"), a:has-text("Add New"), span:has-text("Add New")')
            if add_btn:
                await add_btn.click()
                await page.wait_for_timeout(1000)
                
                option = await page.query_selector(f':text-is("{option_text}"), :text("{option_text}")')
                if option:
                    await option.click()
                    await page.wait_for_timeout(2500)
                    await page.screenshot(path=f"scratch/{filename_prefix}.png")
                    
                    html = await page.content()
                    with open(f"scratch/{filename_prefix}.html", "w") as f:
                        f.write(html)
                    
                    # Close modal if open (Cancel or close icon)
                    close_btn = await page.query_selector('button:has-text("Cancel"), button.close, [aria-label="Close"], .modal-header .close')
                    if close_btn:
                        await close_btn.click()
                        await page.wait_for_timeout(1000)
                else:
                    print(f"Option '{option_text}' not found in dropdown")

        await open_add_new_option("Crop & Variety", "add_crop_and_variety")
        await open_add_new_option("Crop", "add_crop_only")
        await open_add_new_option("Variety", "add_variety_only")

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
