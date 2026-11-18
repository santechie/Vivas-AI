import asyncio
import json
import os
import re
from playwright.async_api import async_playwright

async def inspect_settings():
    os.makedirs("scratch/settings_screens", exist_ok=True)
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1440, 'height': 900})
        page = await context.new_page()

        print("Navigating to https://my.tend.com/login...")
        await page.goto("https://my.tend.com/login", wait_until="domcontentloaded")
        await page.wait_for_timeout(2000)

        # Step 1: Username
        await page.fill('input[name="username"], input[type="text"], input[type="email"]', 'gksvijay@gmail.com')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(3000)

        # Step 2: Password
        await page.fill('input[type="password"], input[name="password"]', 'Krishkrish@01')
        await page.keyboard.press('Enter')
        await page.wait_for_timeout(5000)

        print("URL after login:", page.url)

        if "selectfarm" in page.url:
            print("Selecting farm via DOM click...")
            await page.wait_for_timeout(2000)
            await page.evaluate("() => { const el = document.querySelector('.farm-item'); if (el) el.click(); }")
            await page.wait_for_timeout(6000)
            print("URL after selecting farm:", page.url)

        # Navigate directly to https://my.tend.com/settings
        print("Navigating to https://my.tend.com/settings...")
        await page.goto("https://my.tend.com/settings", wait_until="domcontentloaded")
        await page.wait_for_timeout(4000)
        print("Current Settings URL:", page.url)
        await page.screenshot(path="scratch/settings_screens/00_settings_main.png", full_page=True)

        # Inspect all links/nav items in settings
        # Often Settings has a sidebar or subnav
        nav_elements = await page.query_selector_all('nav a, aside a, .settings-nav a, .tab-item, ul.tabs li, a[href*="settings"]')
        settings_tabs = []
        for el in nav_elements:
            text = (await el.inner_text()).strip()
            href = await el.get_attribute('href')
            if text and href and href not in [x['href'] for x in settings_tabs]:
                settings_tabs.append({'text': text, 'href': href})

        print(f"Discovered {len(settings_tabs)} navigation tabs:", settings_tabs)

        results = {
            "initial_url": page.url,
            "tabs_discovered": settings_tabs,
            "pages": {}
        }

        # If settings_tabs is empty or only 1, let's also find all links inside the main settings container
        if not settings_tabs:
            all_links = await page.query_selector_all('a')
            for l in all_links:
                href = await l.get_attribute('href') or ''
                txt = (await l.inner_text()).strip()
                if ('settings' in href or 'account' in href or 'farm' in href) and txt and len(txt) < 50:
                    if not any(x['href'] == href for x in settings_tabs):
                        settings_tabs.append({'text': txt, 'href': href})
            print(f"Broad search found {len(settings_tabs)} tabs:", settings_tabs)

        # Let's extract details from current page
        def extract_page_data_script():
            return """
            () => {
                const data = {
                    title: document.title,
                    url: window.location.href,
                    headings: Array.from(document.querySelectorAll('h1, h2, h3, h4')).map(h => ({
                        tag: h.tagName,
                        text: h.innerText.trim()
                    })),
                    buttons: Array.from(document.querySelectorAll('button, a.btn, input[type="button"], input[type="submit"]')).map(b => ({
                        text: b.innerText.trim() || b.value || b.getAttribute('aria-label') || '',
                        classes: b.className,
                        type: b.getAttribute('type') || 'button'
                    })),
                    inputs: Array.from(document.querySelectorAll('input, select, textarea')).map(i => ({
                        tag: i.tagName.toLowerCase(),
                        type: i.type,
                        name: i.name,
                        id: i.id,
                        placeholder: i.placeholder || '',
                        value: i.value || '',
                        disabled: i.disabled,
                        options: i.tagName.toLowerCase() === 'select' ? Array.from(i.options).map(o => ({ text: o.text, value: o.value, selected: o.selected })) : undefined
                    })),
                    labels: Array.from(document.querySelectorAll('label')).map(l => l.innerText.trim()),
                    tables: Array.from(document.querySelectorAll('table')).map(t => ({
                        headers: Array.from(t.querySelectorAll('th')).map(th => th.innerText.trim()),
                        rowsCount: t.querySelectorAll('tr').length
                    }))
                };
                return data;
            }
            """

        current_data = await page.evaluate(extract_page_data_script())
        results["pages"]["initial"] = current_data

        # Let's write current page html
        with open("scratch/settings_screens/00_settings.html", "w") as f:
            f.write(await page.content())

        # Now iterate through each discovered tab
        idx = 1
        for tab in settings_tabs:
            tab_href = tab['href']
            tab_text = tab['text'].replace('/', '_').replace(' ', '_')
            full_url = tab_href if tab_href.startswith('http') else f"https://my.tend.com{tab_href}"
            
            # Skip external or non-settings links like logout, help
            if 'logout' in full_url.lower() or 'support' in full_url.lower():
                continue

            print(f"Visiting tab [{idx}]: {tab['text']} -> {full_url}")
            try:
                await page.goto(full_url, wait_until="domcontentloaded")
                await page.wait_for_timeout(3000)
                
                screen_path = f"scratch/settings_screens/{idx:02d}_{tab_text}.png"
                await page.screenshot(path=screen_path, full_page=True)
                
                page_data = await page.evaluate(extract_page_data_script())
                page_data['screenshot'] = screen_path
                results["pages"][tab['text']] = page_data
                
                with open(f"scratch/settings_screens/{idx:02d}_{tab_text}.html", "w") as f:
                    f.write(await page.content())
            except Exception as e:
                print(f"Error visiting {full_url}: {e}")
            idx += 1

        with open("scratch/tend_settings_extracted.json", "w") as f:
            json.dump(results, f, indent=2)

        print("Inspection completed successfully! Extracted data saved.")
        await browser.close()

if __name__ == "__main__":
    asyncio.run(inspect_settings())
