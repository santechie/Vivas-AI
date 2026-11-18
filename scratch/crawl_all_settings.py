import asyncio
import json
import os
from playwright.async_api import async_playwright

CARD_NAMES = [
    ("farm_settings", "Farm Profile & Settings"),
    ("task_type", "Task Type Management"),
    ("users_roles", "Users & Roles"),
    ("product_settings", "Product Settings"),
    ("online_store", "Online Store/Offer Sheet Settings"),
    ("notification_settings", "Notification Settings"),
    ("planting_id", "Planting ID Configuration"),
    ("label_management", "Label Management"),
    ("commerce_payment", "Commerce & Payment Processors"),
    ("time_attendance", "Time & Attendance"),
    ("custom_data_fields", "Custom Data Fields"),
    ("apps_integrations", "Apps (Integrations)")
]

async def crawl():
    os.makedirs("scratch/crawled_settings", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()

        print("Logging into Tend...")
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

        # Cookie banner
        await page.goto("https://my.tend.com/settings", wait_until="domcontentloaded")
        await page.wait_for_timeout(3000)
        cookie_btn = await page.query_selector('button:has-text("Accept All"), button:has-text("Reject All")')
        if cookie_btn:
            await cookie_btn.click()
            await page.wait_for_timeout(1000)

        results = {}

        for code, label in CARD_NAMES:
            print(f"\n==========================================")
            print(f"Inspecting card: {label} ({code})")
            print(f"==========================================")

            if page.url != "https://my.tend.com/settings":
                await page.goto("https://my.tend.com/settings", wait_until="domcontentloaded")
                await page.wait_for_timeout(3000)

            card = await page.query_selector(f'.grid-item:has-text("{label}")')
            if not card:
                # Try finding with partial text
                first_word = label.split()[0]
                card = await page.query_selector(f'.grid-item:has-text("{first_word}")')

            if card:
                print(f"Found card for '{label}'. Clicking...")
                await card.click()
                await page.wait_for_timeout(4000)
                print(f"New URL: {page.url}")

                # Save screenshot of main card screen
                base_screenshot = f"scratch/crawled_settings/{code}_main.png"
                await page.screenshot(path=base_screenshot, full_page=True)

                # Extract information
                card_data = await page.evaluate("""
                () => {
                    const getText = (selector) => Array.from(document.querySelectorAll(selector)).map(e => e.innerText.trim()).filter(Boolean);
                    return {
                        url: window.location.href,
                        title: document.title,
                        h1: getText('h1'),
                        h2: getText('h2'),
                        h3: getText('h3'),
                        tabs: getText('ul.nav-tabs li, .p-tabview-nav li, .nav-item-zone li, [role="tab"]'),
                        buttons: getText('button, a.btn, .p-button'),
                        labels: getText('label, .form-label, .field-label, .title'),
                        tables: Array.from(document.querySelectorAll('table')).map(t => ({
                            headers: Array.from(t.querySelectorAll('th')).map(th => th.innerText.trim()),
                            rowCount: t.querySelectorAll('tbody tr').length
                        })),
                        inputs: Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
                            tag: i.tagName.toLowerCase(),
                            type: i.type,
                            name: i.name || i.id,
                            placeholder: i.placeholder || '',
                            value: i.value || '',
                            checked: i.checked,
                            options: i.tagName.toLowerCase() === 'select' ? Array.from(i.options).map(o => o.text.trim()) : []
                        })),
                        fullText: document.body.innerText.slice(0, 3000)
                    };
                }
                """)
                card_data["screenshot"] = base_screenshot
                card_data["subtabs_data"] = {}

                # Inspect subtabs if available
                subtabs = await page.query_selector_all('ul.nav-tabs li, .p-tabview-nav li, [role="tab"]')
                if len(subtabs) > 1:
                    print(f"Found {len(subtabs)} subtabs on {label}")
                    for s_idx, st in enumerate(subtabs):
                        st_text = (await st.inner_text()).strip()
                        safe_name = st_text.replace('/', '_').replace(' ', '_').lower()
                        print(f"  -> Clicking subtab [{s_idx}]: {st_text}")
                        try:
                            await st.click()
                            await page.wait_for_timeout(2500)
                            st_screen = f"scratch/crawled_settings/{code}_subtab_{s_idx}_{safe_name}.png"
                            await page.screenshot(path=st_screen, full_page=True)
                            
                            subtab_data = await page.evaluate("""
                            () => {
                                const getText = (selector) => Array.from(document.querySelectorAll(selector)).map(e => e.innerText.trim()).filter(Boolean);
                                return {
                                    headings: getText('h1, h2, h3, h4'),
                                    buttons: getText('button, a.btn, .p-button'),
                                    labels: getText('label, .form-label, .field-label'),
                                    tables: Array.from(document.querySelectorAll('table')).map(t => ({
                                        headers: Array.from(t.querySelectorAll('th')).map(th => th.innerText.trim()),
                                        rowCount: t.querySelectorAll('tbody tr').length
                                    })),
                                    inputs: Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
                                        type: i.type,
                                        name: i.name || i.id,
                                        placeholder: i.placeholder,
                                        value: i.value,
                                        checked: i.checked
                                    })),
                                    textSnippet: document.body.innerText.slice(0, 2000)
                                };
                            }
                            """)
                            subtab_data["screenshot"] = st_screen
                            card_data["subtabs_data"][st_text] = subtab_data
                        except Exception as ste:
                            print(f"  Error on subtab {st_text}: {ste}")

                results[code] = card_data
            else:
                print(f"Could not find card for {label}")

        with open("scratch/crawled_settings/settings_full_crawl.json", "w") as f:
            json.dump(results, f, indent=2)

        print("\nCRAWL COMPLETE! Saved to scratch/crawled_settings/settings_full_crawl.json")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(crawl())
