# Fixed Table • 1 Change Search

Browser tool for the requested fixed-table and 1-change search logic.

- Uploaded fixed table is stored as `fixed-table.csv` and loads automatically.
- First row is the fixed-table title/header row.
- Values are normalized to 3 digits: `7 → 007`, `58 → 058`.
- Paste one number per line or a large list.
- Search accepts `0p` through `7p`.
- A 1-change match changes exactly one digit by +1 or -1; the other two digits stay unchanged.
- Search order is column-major: rows 1–24, then the next column.
- `0p` starts the next search on the next row; `1p` leaves one row gap; through `7p`.
- Colors loop: yellow, green, red, blue, brown, then yellow again.
- Results show input, matched value, column, row and color.
- CSV/XLSX/XLS upload is supported and replaces the current fixed table.

## Run

Open `index.html` in a browser or publish the repository with GitHub Pages.

XLS/XLSX reading uses SheetJS from jsDelivr; calculation runs locally in the browser.
