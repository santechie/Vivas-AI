import asyncio
import json
import os
from playwright.async_api import async_playwright

CARDS = [
    ("farm_profile", "Farm Profile & Settings"),
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

async def inspect_all_cards():
    os.makedirs("scratch/settings_screens/cards", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()

        print("Logging into Tend...")
        await page.goto("https://my.tend.com/login", wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        # Username
        await page.fill('input[name="username"], input[type="text"], input[type="email"]', 'gksvijay@gmail.com')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(2500)

        # Password
        await page.fill('input[type="password"], input[name="password"]', 'Krishkrish@01')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(5000)

        if "selectfarm" in page.url:
            print("Selecting farm via DOM click...")
            await page.wait_for_timeout(2000)
            await page.evaluate("() => { const el = document.querySelector('.farm-item'); if (el) el.click(); }")
            await page.wait_for_timeout(5000)

        print("Navigating to https://my.tend.com/settings...")
        await page.goto("https://my.tend.com/settings", wait_until="domcontentloaded")
        await page.wait_for_timeout(4000)

        results = {}

        for key, title in CARDS:
            print(f"\n--- Inspecting: {title} ---")
            try:
                # Always ensure we are at settings page
                if page.url != "https://my.tend.com/settings":
                    await page.goto("https://my.tend.com/settings", wait_until="domcontentloaded")
                    await page.wait_for_timeout(3000)

                # Find the card with title
                card_clicked = await page.evaluate(f"""
                (targetTitle) => {{
                    const items = document.querySelectorAll('.grid-item');
                    for (const item of items) {{
                        if (item.innerText && item.innerText.includes(targetTitle.replace('&amp;', '&'))) {{
                            item.click();
                            return true;
                        }}
                    }}
                    return false;
                }}
                """, title)

                print(f"Card click triggered for '{title}': {card_clicked}")
                await page.wait_for_timeout(4000)
                print(f"Current URL after clicking: {page.url}")

                # Take screenshot
                screen_path = f"scratch/settings_screens/cards/{key}.png"
                await page.screenshot(path=screen_path, full_page=True)

                # Extract page info
                data = await page.evaluate("""
                () => {
                    return {
                        url: window.location.href,
                        title: document.title,
                        headings: Array.from(document.querySelectorAll('h1, h2, h3, h4, .title-header, .page-title')).map(h => h.innerText.trim()),
                        tabs: Array.from(document.querySelectorAll('ul.nav-tabs li, .tab-item, [role="tab"], .p-tabview-title')).map(t => t.innerText.trim()),
                        buttons: Array.from(document.querySelectorAll('button, a.btn, .p-button')).map(b => b.innerText.trim()).filter(Boolean),
                        formLabels: Array.from(document.querySelectorAll('label, .form-label, .field-label')).map(l => l.innerText.trim()).filter(Boolean),
                        inputs: Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
                            type: i.type,
                            name: i.name,
                            placeholder: i.placeholder,
                            value: i.value,
                            disabled: i.disabled
                        })),
                        tableHeaders: Array.from(document.querySelectorAll('th, .table-header, .p-datatable-thead th')).map(th => th.innerText.trim()).filter(Boolean),
                        bodyTextSnippet: document.body.innerText.slice(0, 1500)
                    };
                }
                """)
                data["screenshot"] = screen_path
                results[key] = data

                # Check if there are sub-tabs inside this screen and take screenshots/extract each tab!
                subtabs = await page.query_selector_all('ul.nav-tabs li, .tab-item, [role="tab"], .p-tabview-nav li')
                if len(subtabs) > 1:
                    print(f"Found {len(subtabs)} sub-tabs in {title}")
                    for t_idx, tab_elem in enumerate(subtabs):
                        t_text = (await tab_elem.inner_text()).strip().replace('/', '_').replace(' ', '_')
                        try:
                            await tab_elem.click()
                            await page.wait_for_timeout(2000)
                            tab_screen = f"scratch/settings_screens/cards/{key}_tab_{t_idx}_{t_text}.png"
                            await page.screenshot(path=tab_screen, full_page=True)
                            print(f"  Captured subtab: {t_text}")
                        except Exception as te:
                            print(f"  Error clicking subtab {t_text}: {te}")

            except Exception as e:
                print(f"Error inspecting {title}: {e}")

        with open("scratch/settings_screens/cards_summary.json", "w") as f:
            json.dump(results, f, indent=2)

        print("\nAll cards inspected successfully! Saved to scratch/settings_screens/cards_summary.json")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect_all_cards())
