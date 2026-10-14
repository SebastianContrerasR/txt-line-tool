# TXT Line Removal Tool

A small, private web app that removes selected records from a pipe-delimited
`.txt` file and downloads two new files. Everything runs in the browser: the file
is never uploaded anywhere.

> The user interface and every validation message are in **Spanish**. The code,
> the test names and this documentation stay in English.

---

## What it does

1. You select a UTF-8 `.txt` file whose records look like `originalLineNumber|field|field`.
2. You type the original line numbers to remove, comma separated (`2, 4, 7`).
3. The app validates everything, shows a summary and lets you download:
   - **`<name>_corrected.txt`** — every record that was *not* removed, with the
     first field renumbered sequentially from `1`.
   - **`<name>_removed.txt`** — every record that *was* removed, keeping its
     original line number, contents and order.

### Example

Input `data.txt`:

```text
1|Mary|Cusco
2|John|Lima
3|Peter|Arequipa
4|Ana|Piura
5|Luis|Trujillo
```

Removing `2, 4`:

`data_corrected.txt`

```text
1|Mary|Cusco
2|Peter|Arequipa
3|Luis|Trujillo
```

`data_removed.txt`

```text
2|John|Lima
4|Ana|Piura
```

The new numbers in `corrected.txt` are the **positions** of the surviving
records, not their original identifiers. This is exactly how the renumbered
column can be used to reference the next file in a sequential process.

---

## Input format and rules

- One record per line, UTF-8 encoded.
- The separator is always `|`.
- The first field is the original line number: a positive integer, unique in the
  file.
- The number of fields may vary between records; empty fields, spaces and
  non-ASCII characters are preserved exactly.
- Fields are not expected to contain embedded newlines or escaped separators.

### Output rules

| Rule | Behaviour |
| --- | --- |
| Line endings | LF (`\n`) in both files, even when the source used CRLF |
| Trailing newline | Mirrors the source: if the uploaded file ended with a newline the outputs do too; if it did not, they don't |
| Empty result | A 0-byte file, never a lone newline |
| Blank lines | Never present in the output (they are ignored while parsing) |
| Encoding | UTF-8, no BOM |
| `corrected.txt` | Only the first field changes; every other byte is copied verbatim |
| `removed.txt` | Records keep their original numbers, order and contents |

Because the trailing newline is mirrored, a file saved without one round-trips
unchanged: removing every record gives back exactly the original bytes in
`<name>_removed.txt`.

### Validation rules

| Input | Policy |
| --- | --- |
| Whitespace around numbers | Allowed (`2, 4, 7` = `2,4,7`) |
| Empty token (`2,,4`, `2,`) | Rejected |
| Zero, negative numbers, decimals, text | Rejected with a specific message |
| Leading zeros (`007`) | Rejected — line numbers are written without them |
| Numbers above `Number.MAX_SAFE_INTEGER` | Rejected as unsafe |
| Repeated number in the selection (`2,2`) | Rejected |
| Requested number not present in the file | Reported in the summary (highlighted as *No encontrados en el archivo*); the valid ones are still processed |
| Requested number above the file's highest line number | **Rejected before processing**: the field shows an error and the *Procesar archivo* button stays disabled. The maximum is the largest first column value, so a file numbered `5, 17, 900` accepts up to `900` |
| Number within range but unused (gap in a non-consecutive file) | Allowed; reported in the summary after processing |
| Blank or whitespace-only lines | Ignored, counted and reported in the summary |
| UTF-8 BOM | Ignored |
| LF, CRLF and lone CR | Accepted on input, always written as LF |
| File saved with a final newline | The outputs keep a final newline |
| File saved without a final newline | The outputs do not add one |
| Record without a `|` separator | Rejected (a record must have at least one field after the number) |
| Missing or invalid first field | Rejected, reporting the physical line number |
| Duplicate original line numbers in the file | Rejected, reporting both lines |
| Records not sorted / not consecutive | Allowed — order in the file is preserved |

When a file contains an invalid record, **no** downloads are offered: the whole
file must be valid.

---

## Requirements

- Node.js 22.12 or newer (the version used by CI)
- npm 10 or newer

## Getting started

```bash
npm install
npm run dev
```

Vite prints the local URL (by default <http://localhost:5173>).

## Scripts

| Script | What it does |
| --- | --- |
| `npm run dev` | Start the development server with hot reload |
| `npm run build` | Build the production site into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm test` | Run the unit tests once |
| `npm run test:watch` | Run the tests in watch mode |

## Testing

```bash
npm test
```

The suite (119 tests) lives in `tests/unit/`. It covers the pure core modules —
number parsing, file parsing and record processing — the sample files in
`tests/mocks/`, plus static checks that `index.html` and `src/main.js` still agree
on element ids, labels and live regions. No browser and no network access are
needed. There are no browser automation tests: for an app of this size they would
add a heavy dependency for little extra value.

## Build and preview locally

```bash
npm run build
npm run preview
```

---

## Deploying to GitHub Pages

The repository already contains everything needed except one manual setting.

### One-time repository setting

1. Open **Settings → Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
   (Do **not** choose "Deploy from a branch": the app is published by the workflow.)

After the first successful run the site is available at:

```text
https://SebastianContrerasR.github.io/txt-line-tool/
```

### Automatic deploys

- `.github/workflows/deploy.yml` runs on every push to `main` (and can be started
  manually with *Run workflow*): unit tests → production build → deploy.
- `.github/workflows/ci.yml` runs tests and a build on every pull request.

Nothing is committed: `dist/` and `node_modules/` are ignored, and the workflow
uploads `dist/` as a build artifact.

### How the base path is handled

`vite.config.js` reads the `GITHUB_REPOSITORY` variable that GitHub Actions sets
automatically and derives the base path from it:

- in CI → `base: "/txt-line-tool/"` (correct for `https://<user>.github.io/<repo>/`)
- locally → `base: "./"` (relative paths, so the build also works from any
  subfolder or local static server)

Forks need no change: the repository name is read from the environment.

---

## Privacy

- The file is read with the browser's `File` API and processed in memory with
  plain JavaScript.
- The outputs are created as in-memory `Blob`s and saved by the browser through a
  temporary object URL.
- There is no backend, no database, no analytics, no third-party request. Open
  the page with the network tab visible and you will see only the page's own
  assets.

---

## Project structure

```text
├── index.html                  Markup (no template engine, no framework)
├── vite.config.js              Base path + build options
├── vitest.config.js            Unit test configuration (Node environment)
├── src/
│   ├── main.js                 DOM wiring: events, state, status messages
│   ├── styles.css              Plain CSS, light and dark themes
│   ├── core/                   Pure functions, no DOM and no I/O
│   │   ├── errors.js               InputError (message shown to the user)
│   │   ├── line-number.js          Single source of truth for valid line numbers
│   │   ├── parse-line-numbers.js   "2, 4, 7" -> [2, 4, 7]
│   │   ├── parse-input-file.js      File text -> validated records
│   │   ├── process-records.js       Records + selection -> both output files
│   │   ├── output-file-names.js     "data.txt" -> "data_corrected.txt"
│   │   └── validate-line-range.js   Reject numbers above the file's maximum
│   └── ui/
│       ├── render-status.js     Status/summary rendering (textContent only)
│       └── download-file.js     Blob + object URL download
├── tests/
│   ├── README.md                How to use the sample files
│   ├── unit/                    Vitest suites
│   └── mocks/                   Sample .txt files to upload locally
└── .github/workflows/          ci.yml (PRs) and deploy.yml (main -> Pages)
```

`core/` modules never touch the DOM, the network or global state, so they are
directly unit tested. `main.js` only orchestrates them and talks to the DOM.
`errors.js` and `line-number.js` exist so the user input and the file input share
exactly one definition of "valid line number" instead of two that can drift.

## Trying it with sample files

`tests/mocks/` holds files ready to upload: `sample.txt` (the example above),
`edge-cases.txt` (empty fields, extra fields, spaces, accents),
`blank-lines.txt`, and three that must be rejected (`invalid-line-number.txt`,
`duplicate-line-numbers.txt`, `missing-separator.txt`).
[tests/README.md](tests/README.md) lists what to type in each case.

## Known limitations

- The whole file is held in memory, which is fine for the file sizes this tool is
  meant for but is not meant for very large files.
- Fields cannot contain newlines or `|` characters: the format is line based and
  the separator is not escaped.
- Renumbering is a pure position count. It does not try to preserve gaps or the
  original numbers of surviving records, by design.
- A record must contain at least one `|` separator; a line with only a number is
  treated as malformed.
- The browser decides where downloaded files are stored; the app cannot override
  that.