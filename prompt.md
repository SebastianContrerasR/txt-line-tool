# Project: TXT Line Removal and Renumbering Tool

## 1. Objective

Build a small, personal-use web application that allows a user to upload a pipe-delimited `.txt` file, select one or more line numbers to remove, and download two generated files:

- `${original_filename}_corrected.txt`: Contains the records that were not removed, with the first column renumbered sequentially starting at `1`.
- `${original_filename}_removed.txt`: Contains the records selected for removal, preserving their original line numbers and record contents.

The application will be used approximately once or twice per month. Prioritize simplicity, reliability, maintainability, privacy, and zero hosting cost.

## 2. Technology and constraints

Use the following stack:

- Vanilla JavaScript (ES modules).
- HTML5 and CSS3.
- Vite for local development and production builds.
- Vitest for unit tests.
- GitHub Pages for free static hosting.
- GitHub Actions for automated testing and deployment.

Do NOT use React, Vue, Angular, a backend, a database, external APIs, authentication, or a cloud file-storage service.

Do NOT introduce unnecessary dependencies. Prefer native browser APIs for file reading and downloading.

The application must process files entirely in the browser. File contents must never be uploaded to a server or transmitted to an external service.

Use modern JavaScript, descriptive names, small functions, clear module boundaries, and explicit error handling.

## 3. Input format and behavior

The user uploads a UTF-8 `.txt` file containing pipe-delimited records.

Each record follows this structure:

`originalLineNumber|field2|field3|...`

Example input:

```text
1|Mary|Cusco
2|John|Lima
3|Peter|Arequipa
4|Ana|Piura
5|Luis|Trujillo
```

Assumptions:

- The first field contains the original line number.
- Original line numbers are positive integers starting at `1`.
- Input records are already ordered by their original line numbers.
- Each original line number is unique.
- The separator is always `|`.
- The number of fields may vary between records.
- Fields after the first column must be preserved exactly.
- Fields are not expected to contain embedded newline characters or escaped pipe delimiters.
- Blank lines should be ignored during processing and reported in the result summary if appropriate.
- The file may end with a newline.
- A UTF-8 byte-order mark (BOM) may be present and should be handled correctly.

Do not assume that records contain only three fields.

## 4. User workflow

1. The user opens the application.
2. The user selects a `.txt` file.
3. The application displays the selected filename.
4. The user enters one or more original line numbers to remove.
5. The application validates the input.
6. The user clicks a button such as "Process file".
7. The application processes the file and displays a summary.
8. The user downloads `corrected.txt` and `removed.txt` separately.

The line numbers should be entered as a comma-separated list, for example:

`2, 4, 7`

Allow reasonable whitespace around the numbers, so `2, 4, 7` and `2,4,7` are equivalent.

Do not allow empty tokens, zero, negative numbers, decimals, non-numeric values, or duplicate requested line numbers. Display a useful validation message for invalid input.

If a requested line number does not exist in the file, do not silently ignore it. Display which requested line numbers were not found. The application may still generate the outputs for valid matches, but it must clearly report the unmatched numbers before the user downloads the files.

## 5. Processing rules

Implement the core processing as pure, testable JavaScript functions, independent of the DOM and browser UI.

### Rule A: Identify records to remove

Parse the first field of each nonblank input record as its original line number.

A record is removed when its original line number appears in the user's requested set.

### Rule B: Generate removed.txt

Include every record selected for removal.

Preserve the original line number and the entire remainder of each record exactly as it appeared in the input, apart from the file's line-ending representation.

Preserve the records' original relative order.

Do not renumber the removed records.

### Rule C: Generate corrected.txt

Include every record that was not selected for removal.

Renumber the remaining records sequentially, starting at `1`, following their existing input order.

Change ONLY the first field. Preserve all other fields exactly, including empty fields and leading or trailing spaces within those fields.

For example, if the input is:

```text
1|Mary|Cusco
2|John|Lima
3|Peter|Arequipa
4|Ana|Piura
5|Luis|Trujillo
```

And the user requests `2,4`, then `corrected.txt` must contain:

```text
1|Mary|Cusco
2|Peter|Arequipa
3|Luis|Trujillo
```

And `removed.txt` must contain:

```text
2|John|Lima
4|Ana|Piura
```

The new line numbers in `corrected.txt` represent the positions of the surviving records, not their original identifiers.

### Rule D: Output formatting

- Use LF (`\n`) line endings for both output files.
- Do not include blank lines in either output.
- Do not add a trailing newline unless needed by an explicitly documented project convention; choose one consistent convention and test it.
- An empty output must be a valid empty text file.
- Use UTF-8 for generated files.
- Output filenames must be exactly `corrected.txt` and `removed.txt`.

### Rule E: Validation and safety

Validate that each nonblank record has a valid positive integer in its first field.

Reject malformed input records with an informative error identifying the physical input line number. Do not generate downloadable outputs when the file contains invalid records.

Validate duplicate original line numbers in the input and reject them, because line numbers are expected to be unique.

Never use `eval()` or dynamically execute file contents.

Avoid silently modifying any fields other than the first field in `corrected.txt`.

## 6. Suggested project structure

Use a structure similar to:

```text
/
├── index.html
├── package.json
├── vite.config.js
├── vitest.config.js
├── .gitignore
├── README.md
├── src/
│   ├── main.js
│   ├── styles.css
│   ├── core/
│   │   ├── parse-line-numbers.js
│   │   ├── parse-input-file.js
│   │   └── process-records.js
│   └── ui/
│       ├── render-status.js
│       └── download-file.js
├── tests/
│   ├── parse-line-numbers.test.js
│   ├── parse-input-file.test.js
│   └── process-records.test.js
└── .github/
    └── workflows/
        └── deploy.yml
```

You may adjust this structure if you can justify a simpler or more maintainable alternative. Avoid excessive abstraction for such a small application.

## 7. Responsibilities of each module

### `parse-line-numbers.js`

Implement a pure function that accepts the user's comma-separated input and returns a validated collection of unique positive integers.

It should:

- Trim whitespace around each token.
- Accept comma-separated integers.
- Reject empty tokens.
- Reject zero and negative numbers.
- Reject decimals and non-numeric tokens.
- Reject duplicate requested numbers.
- Handle unsafe integers appropriately.
- Return actionable validation errors.

### `parse-input-file.js`

Implement a pure function that accepts the file text and parses it into validated records.

It should:

- Handle an optional UTF-8 BOM.
- Split on LF and CRLF line endings.
- Ignore blank lines according to the documented policy.
- Preserve original record contents and all fields.
- Validate positive integer line numbers in the first field.
- Reject duplicate original line numbers.
- Include the physical input line number in parsing errors.

Do not trim the entire record or individual data fields unnecessarily.

### `process-records.js`

Implement the core processing function.

It should receive validated records and the selected original line numbers and return a structured result containing:

- `correctedText`
- `removedText`
- `removedCount`
- `correctedCount`
- `matchedLineNumbers`
- `unmatchedLineNumbers`

Keep this function pure and deterministic. It must not read files, access the DOM, trigger downloads, or modify global state.

### `download-file.js`

Implement a small browser utility that downloads a string as a UTF-8 `.txt` file using a `Blob` and an object URL.

Release the object URL after the download has been initiated, using a safe cleanup strategy.

### `render-status.js`

Keep UI status and result-summary rendering separate from the core processing logic where practical.

Do not insert user-provided filenames or file contents as raw HTML. Use safe DOM APIs such as `textContent`.

### `main.js`

Wire together file selection, validation, processing, status messages, and download buttons.

Keep DOM event handling here rather than inside the core modules.

## 8. User interface requirements

Create a clean, responsive, accessible single-page utility.

The page should contain:

- A clear title, such as "TXT Line Removal Tool".
- A short explanation of how the application works.
- A file input accepting `.txt` files.
- A text input or textarea for line numbers to remove.
- A "Process file" button.
- A result summary displaying the original record count, removed record count, remaining record count, and unmatched requested line numbers.
- A download button for `corrected.txt`.
- A download button for `removed.txt`.
- Clear validation and error messages.
- A reset option to start over.

Behavior:

- Disable processing until the necessary inputs are valid.
- Disable download buttons until processing succeeds.
- Keep the two downloads independent.
- Prevent stale outputs from being downloaded after the file or requested line numbers change.
- Show loading or processing feedback for large files if necessary.
- Do not render the entire contents of a large file into the DOM.
- Use appropriate labels, keyboard navigation, visible focus states, and accessible status announcements.
- Avoid unnecessary animations, libraries, icons, and design complexity.

The app should work on current desktop browsers and adapt to mobile screens.

## 9. Unit testing requirements

Use Vitest to test the pure JavaScript functions. Do not require a browser or network connection to run the core unit tests.

Write meaningful tests for successful cases, boundary conditions, malformed input, and regressions.

### Tests for `parse-line-numbers.js`

At minimum, test:

1. A single line number.
2. Multiple comma-separated line numbers.
3. Whitespace around values.
4. Empty input.
5. An empty token, such as `2,,4`.
6. Duplicate requested numbers, such as `2,2`.
7. Zero.
8. Negative values.
9. Decimal values.
10. Alphabetic values.
11. Very large unsafe integers.
12. Leading zeros, with an explicitly documented policy.

### Tests for `parse-input-file.js`

At minimum, test:

1. A normal three-field record.
2. Records with more than three fields.
3. Empty fields, such as `1|Mary||Cusco`.
4. Fields containing spaces.
5. LF line endings.
6. CRLF line endings.
7. An optional UTF-8 BOM.
8. A trailing newline.
9. Empty input.
10. Blank lines.
11. A missing first field.
12. A non-numeric first field.
13. A zero or negative line number.
14. Duplicate original line numbers.
15. A decimal line number.
16. A record with no pipe separator, according to the chosen validation policy.
17. Correct physical input line numbers in parsing errors.

### Tests for `process-records.js`

At minimum, test:

1. Removing one record.
2. Removing multiple records.
3. Removing the first record.
4. Removing the last record.
5. Removing every record.
6. Removing no records.
7. Renumbering corrected records sequentially from `1`.
8. Preserving original numbers in `removedText`.
9. Preserving original record order in both outputs.
10. Preserving every field after the first column.
11. Preserving empty fields and spaces in data fields.
12. Reporting requested numbers that were not found.
13. An empty input file.
14. Correct output formatting and line endings.
15. Handling records whose line numbers are not consecutive, if permitted by the input validation policy.

Include a regression test for the exact example in this specification.

### Test quality

- Use descriptive test names.
- Group related cases with `describe` blocks.
- Use assertions that verify complete output strings, not just counts.
- Do not test private implementation details unnecessarily.
- Do not mock functions that are pure and easy to test directly.
- Add browser-level tests only if they provide meaningful value; avoid adding Playwright or another large dependency just for this simple application.

## 10. Package scripts

Provide at least these scripts in `package.json`:

- `npm run dev` — start the local development server.
- `npm run build` — create the production build.
- `npm run preview` — preview the production build.
- `npm test` — run the unit tests once.
- `npm run test:watch` — run Vitest in watch mode.

Make sure all scripts work from a fresh clone after `npm install`.

## 11. GitHub Pages deployment

Configure Vite and GitHub Actions to deploy the built static application to GitHub Pages.

Requirements:

- Support a repository-based URL such as `https://USERNAME.github.io/REPOSITORY/`.
- Configure Vite's `base` path correctly for GitHub Pages.
- Use the official GitHub Pages deployment workflow pattern.
- Grant only the permissions needed by the deployment workflow.
- Run the unit tests and production build before deployment.
- Fail the workflow if tests or builds fail.
- Trigger deployment on pushes to the main branch.
- Support manual workflow execution if practical.
- Do not commit generated build artifacts or `node_modules`.

Document the exact GitHub Pages settings needed to enable deployment.

The application must work without any backend and should have no runtime server requirements.

## 12. Documentation

Create a concise `README.md` containing:

- What the application does.
- The input format and renumbering rules.
- Prerequisites and installation.
- How to run the application locally.
- How to run unit tests.
- How to build and preview the production version.
- How to deploy it to GitHub Pages.
- The privacy model: file processing happens locally in the browser.
- Known limitations and validation rules.

## 13. Acceptance criteria

The implementation is complete when:

1. A user can select a `.txt` file.
2. A user can enter one or more original line numbers.
3. The application generates both output files correctly.
4. `corrected.txt` contains surviving records with sequentially renumbered first fields.
5. `removed.txt` preserves the original line numbers and contents.
6. The remaining fields are not altered.
7. Invalid files and invalid line-number selections produce useful errors.
8. Unmatched requested numbers are reported.
9. The core logic has comprehensive passing unit tests.
10. `npm test` passes.
11. `npm run build` succeeds.
12. GitHub Actions tests and builds the application before deployment.
13. The deployed application works at the GitHub Pages URL.
14. No file contents are transmitted to external services.
15. The application has no paid hosting or backend dependency.

## 14. Agent execution instructions

Implement the complete project, not just a design or a code sketch.

Before finishing:

1. Inspect the project structure.
2. Run all unit tests.
3. Run the production build.
4. Fix any failures.
5. Review the core processing logic for data corruption risks.
6. Verify that only the first field is changed in corrected records.
7. Verify that removed records retain their original numbers.
8. Review the GitHub Pages base path and deployment workflow.
9. Summarize the architecture, important design decisions, commands executed, and any remaining manual deployment steps.

Do not claim that tests passed, a build succeeded, or deployment works unless you actually executed or verified those steps.

Prefer a simple, reliable implementation over unnecessary features or abstraction.