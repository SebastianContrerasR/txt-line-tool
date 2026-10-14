# Tests

```text
tests/
├── unit/     Vitest suites (npm test)
└── mocks/    Sample .txt files to try the app by hand
```

## `mocks/` — try the app locally

Start the app with `npm run dev`, then pick one of these files in the file input
and type the line numbers to remove.

| File | What it is for | Expected result |
| --- | --- | --- |
| `sample.txt` | The 5-record example from the README | Removing `2, 4` gives `sample_corrected.txt` with 3 records and `sample_removed.txt` with `2` and `4` |
| `edge-cases.txt` | 7 records with >3 fields, empty fields, leading/trailing spaces, non-ASCII (`José`), a record ending right after the separator | Everything after the first field is preserved byte for byte |
| `blank-lines.txt` | Blank lines between records | Records load; the summary reports "Líneas en blanco ignoradas: 3" |
| `no-trailing-newline.txt` | 3 records, saved **without** a final newline | The downloaded files also end without a final newline |
| `non-consecutive.txt` | Records numbered `5`, `17`, `900` (maximum is 900, not 3) | `901` is rejected; `500` is allowed but reported as not found |
| `invalid-line-number.txt` | A record whose first field is `abc` | Error: `Línea 3: primer campo no válido: "abc" no es un número.` |
| `duplicate-line-numbers.txt` | Line number `1` used twice | Error pointing at line 3 and line 1 |
| `missing-separator.txt` | A record with no `\|` separator | Error: `Línea 3: falta el separador "\|"...` |

Useful manual checks (the interface is in Spanish):

- remove a number that is not in the file (e.g. `2, 99` with `sample.txt`):
  the summary lists `99` under **No encontrados en el archivo**;
- type a number above the file's maximum (e.g. `99` with `sample.txt`, whose
  highest number is 5): the field shows *El número de línea más alto del archivo
  es 5. Revisa: 99.* and **Procesar archivo** stays disabled until it is fixed;
- fix a validation error: type `2,,4` and the field shows an error, then type
  `2,4` and the message disappears while the **Procesar archivo** button becomes
  usable;
- remove every record: both downloads still work, `sample_corrected.txt` is empty
  (0 bytes);
- upload `no-trailing-newline.txt` and open the downloaded file: no extra blank
  line at the end, because the source had none;
- edit the line numbers after processing: the download buttons are disabled
  again, so a stale file cannot be saved.

Every mock is also asserted in `unit/mocks.test.js`, so the fixtures cannot drift
away from the documented behaviour.

## `unit/` — automated tests

```bash
npm test          # once
npm run test:watch
```

| Suite | Covers |
| --- | --- |
| `parse-line-numbers.test.js` | `"2, 4, 7"` parsing, every rejected format, and the validator that clears a fixed error |
| `validate-line-range.test.js` | Numbers above the file's maximum, the `== max` boundary, and gaps inside the range |
| `parse-input-file.test.js` | BOM, CRLF, blank lines, invalid records, physical line numbers |
| `process-records.test.js` | Removal, renumbering, preservation and output formatting |
| `output-file-names.test.js` | Download file naming |
| `mocks.test.js` | The files in `tests/mocks/` |
| `ui-contract.test.js` | `index.html` and `src/main.js` still agree on ids, labels and live regions |

No browser, no network and no DOM implementation are required.

Test names and comments are in English on purpose: they describe the code, while
everything the end user reads (the page and every validation message) is in
Spanish.