# Obsidian2Kindle Export (Modified by DuckTapeKiller)

## Overview
This is a modified version of the **Obsidian2Kindle** plugin. It converts your Obsidian notes (Markdown) into EPUB format and sends them to your Kindle or PocketBook via email.

**Author:** DuckTapeKiller  
**Version:** 1.0.0  
**Based on:** [obsidian-kindle-export](https://github.com/SimeonLukas/obsidian-kindle-export) by Simeon Lukas

---

## 🔥 Key Modifications & New Features

### 1. Enhanced Front Matter Handling
- **Problem:** The original plugin displayed raw, ugly YAML front matter in the exported EPUB.
- **Solution:** This version parses the front matter and renders it as a clean, styled HTML block at the top of your ebook.
- **Author Extraction:** Automatically extracts the `Author` or `Autor` field from your note's front matter and uses it as the book's author metadata.

### 2. Bulk Export Mode
- **New Feature:** You can now export an entire folder of notes at once!
- **How to use:**
    1. Go to **Settings**.
    2. Enter a folder path in **Bulk Export Folder** (e.g., `2 - ARTÍCULOS/MY FOLDER`).
    3. Toggle **Bulk Export Mode** to `ON`.
    4. Click the **Export** ribbon icon (Paper Plane).
    5. The plugin will export every `.md` file in that folder, one by one.
    - *Note:* A 1-second delay is added between files to prevent server overload.

### 3. Cover Image Title Fix
- **Problem:** Long titles would overflow off the edge of the generated cover image.
- **Solution:** implemented word-wrapping logic in the backend (`index.php`) so long titles now wrap neatly onto multiple lines on the cover.

---

## 🛠 Deployment & Installation

### Prerequisite: PHP Backend
This plugin requires a companion PHP backend to perform the conversion.
(Refer to the original repository or your local `docker-compose.yml` for setup).

**Important:** If you are running the backend, make sure to use the modified `index.php` provided with this fork to get the **Cover Title Fix**.

### Installing the Plugin
1. **Build the plugin:**
   ```bash
   npm install
   npm run build
   ```
2. **Copy files:**
   Copy `main.js`, `manifest.json`, and `styles.css` to your Obsidian vault:
   `YourVault/.obsidian/plugins/obsidian-kindle-export/`
3. **Reload Obsidian:**
   Restart Obsidian or reload plugins to see version 1.0.0.

---

## ⚙️ Usage

### Single File Export
1. distinct disable **Bulk Export Mode** in settings.
2. Open the Markdown note you want to export.
3. Click the **Paper Plane icon** in the ribbon sidebar.

### Bulk Export
1. Enable **Bulk Export Mode** in settings.
2. Verify the **Bulk Export Folder** path.
3. Click the **Paper Plane icon**.
4. Watch the notifications as it processes your files!

---

## 📝 Original Features
- Export images and embedded `.md` files
- Table of Contents support
- Page breaks using `---` (if enabled)
- Footnotes and highlighting support

---

*Modified with ❤️ by DuckTapeKiller*
