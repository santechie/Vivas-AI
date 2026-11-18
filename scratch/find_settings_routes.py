import urllib.request
import re

url = "https://my.tend.com/main-ZCXNGLYW.js"
print("Downloading main JS...")
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
try:
    with urllib.request.urlopen(req) as response:
        content = response.read().decode('utf-8', errors='ignore')
        print(f"Downloaded {len(content)} bytes")
        
        # Search for settings routes
        routes = re.findall(r"path:[\"']([^\"']+)[\"']", content)
        settings_routes = [r for r in routes if 'setting' in r.lower() or 'farm' in r.lower() or 'role' in r.lower() or 'task' in r.lower()]
        print("Relevant routes found:", set(settings_routes))

        # Search for grid items text and nearby router links
        pos = content.find("Farm Profile & Settings")
        if pos != -1:
            print("Found 'Farm Profile & Settings' in JS bundle:")
            print(content[pos-200:pos+500])
        else:
            print("'Farm Profile & Settings' not directly in main bundle, searching for other titles...")
            for title in ["Task Type Management", "Users & Roles", "Product Settings", "Planting ID"]:
                p = content.find(title)
                if p != -1:
                    print(f"Found {title}:")
                    print(content[p-200:p+500])
                    break
except Exception as e:
    print("Error:", e)
