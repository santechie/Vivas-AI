import asyncio
from playwright.async_api import async_playwright

async def main():
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1400, 'height': 900})
        page = await context.new_page()

        print("Navigating to https://my.tend.com/login...")
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
            print("Clicking farm item...")
            farm_item = await page.query_selector('.farm-item')
            if farm_item:
                await farm_item.click()
                await page.wait_for_timeout(5000)
                print("URL after farm select:", page.url)

        # Navigate to Crop Library
        print("Going to crop library card view...")
        await page.goto("https://my.tend.com/my-crops/card-view", wait_until="domcontentloaded")
        await page.wait_for_timeout(5000)
        print("Crop Library URL:", page.url)
        await page.screenshot(path="scratch/tend_crop_library.png")

        # Find Add New button
        add_btn = await page.query_selector('.btn-add-new, button:has-text("Add New"), a:has-text("Add New"), span:has-text("Add New"), [class*="add-new" i], [class*="add" i]')
        if not add_btn:
            # Let's search all buttons/links
            all_elements = await page.query_selector_all('button, a, div')
            for el in all_elements:
                txt = await el.inner_text()
                if 'add new' in txt.lower():
                    add_btn = el
                    break

        if add_btn:
            print("Clicking Add New button...")
            await add_btn.click()
            await page.wait_for_timeout(2000)
            await page.screenshot(path="scratch/tend_add_new_open.png")

            # Find sub-items
            sub_items = await page.query_selector_all('.dropdown-item, .menu-item, li a, li span, div[class*="item"]')
            for idx, si in enumerate(sub_items):
                stxt = await si.inner_text()
                if stxt.strip() and len(stxt.strip()) < 40:
                    print(f"Sub-item {idx}: {stxt.strip()}")

        html = await page.content()
        with open("scratch/tend_crop_library.html", "w") as f:
            f.write(html)

        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
