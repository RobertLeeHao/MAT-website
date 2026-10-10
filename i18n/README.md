# MAT website · translations (v3.9)

The site has 8 languages: en, zh-Hans, zh-Hant, ja, ko, es, fr, de. English is the page itself. The other seven are embedded in `index.html` as JSON blocks (`<script type="application/json" id="i18n-…">`). There is no build step and no server: one file, one URL.

## How the page picks a language
1. `?lang=zh-Hant` in the URL (also accepts `zh-TW`, `zh-HK`, `zh-CN`, `ja-JP` and similar).
2. The visitor's last choice (`localStorage` key `mat-lang`).
3. The browser's languages (`navigator.languages`). Anything else gets English.

The globe button (top right, and at the bottom of the footer) opens the menu. Picking a language stores it and reloads the page at the same scroll position.

## Files
- `en.json`: every English string, keyed. Inline tags are numbered tokens (`<3>…</3>`, `<5/>`).
- `<lang>.json`: the translations, with the same keys. `check.py` checks that every key and token is present.
- `extra.json`: short words the page writes at runtime (Done, Open, Ready…).
- `units.js`: how the page splits text into units. It is the same code as in the page.
- `embed.py`: rewrites the translation block in a page from these JSON files.
- `BRIEF.md`: the translation brief (tone, glossary, what stays in English).

## Fixing or changing a translation
Edit the value in `<lang>.json`, then, from the repo folder:
```
python3 i18n/check.py i18n/<lang>.json   # must print: missing 0, bad 0
python3 i18n/embed.py index.html
```

## Changing English copy
If a sentence's English changes, its key changes too. Until the new key is translated, that sentence shows in English in every language (nothing breaks). To translate it, add the new key to `en.json` and to each `<lang>.json` (with the same tokens), then run `embed.py`.

New elements need nothing extra. A text element marked `data-i18n-skip` is never translated.
