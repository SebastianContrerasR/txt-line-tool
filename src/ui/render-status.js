/**
 * Status and result rendering.
 *
 * Every value written here comes from a filename, a count or a message, so all
 * updates go through `textContent`: no user provided string is ever parsed as HTML.
 */

/** @typedef {'idle'|'info'|'busy'|'success'|'warning'|'error'} StatusVariant */

/**
 * Show a single status message. `role="status"` + `aria-live` makes screen
 * readers announce it.
 *
 * Writing the same message twice is skipped: the status is updated on every
 * keystroke, and screen readers would repeat an unchanged announcement.
 *
 * @param {HTMLElement} element Region used for announcements.
 * @param {{ message?: string, variant?: StatusVariant }} status
 * @returns {void}
 */
export function renderStatus(element, { message = '', variant = 'info' } = {}) {
  if (element.textContent === message && element.dataset.variant === variant) {
    return;
  }

  element.textContent = message;
  element.dataset.variant = variant;
  element.hidden = message === '';
}

/**
 * Turn a processing result into the rows shown in the summary list.
 *
 * @param {object} params
 * @param {string} params.fileName Name of the uploaded file.
 * @param {number} params.recordCount Records found in the uploaded file.
 * @param {number} params.blankLineCount Blank lines ignored while parsing.
 * @param {import('../core/process-records.js').ProcessResult} params.result
 * @returns {Array<{ label: string, value: string, variant?: StatusVariant }>}
 */
export function createSummaryItems({ fileName, recordCount, blankLineCount, result }) {
  const items = [
    { label: 'Archivo', value: fileName },
    { label: 'Registros en el archivo', value: String(recordCount) },
    { label: 'Registros eliminados', value: String(result.removedCount) },
    { label: 'Registros restantes', value: String(result.correctedCount) },
  ];

  if (result.removedCount > 0) {
    items.push({
      label: 'Números de línea eliminados',
      value: result.matchedLineNumbers.join(', '),
    });
  }

  if (result.unmatchedLineNumbers.length > 0) {
    items.push({
      label: 'No encontrados en el archivo',
      value: result.unmatchedLineNumbers.join(', '),
      variant: 'warning',
    });
  }

  if (blankLineCount > 0) {
    items.push({
      label: 'Líneas en blanco ignoradas',
      value: String(blankLineCount),
    });
  }

  return items;
}

/**
 * Render the summary rows. Existing content is replaced, not appended.
 *
 * @param {HTMLElement} listElement `<ul>` that receives one `<li>` per row.
 * @param {Array<{ label: string, value: string, variant?: StatusVariant }>} items
 * @returns {void}
 */
export function renderSummary(listElement, items) {
  const rows = items.map(({ label, value, variant }) => {
    const item = document.createElement('li');
    item.dataset.variant = variant ?? 'info';

    const labelElement = document.createElement('span');
    labelElement.className = 'summary__label';
    labelElement.textContent = `${label}:`;

    const valueElement = document.createElement('span');
    valueElement.className = 'summary__value';
    valueElement.textContent = value;

    item.append(labelElement, valueElement);
    return item;
  });

  listElement.replaceChildren(...rows);
}

/**
 * Clear the summary area and disable every download button.
 *
 * @param {HTMLElement} listElement
 * @param {Iterable<HTMLButtonElement>} downloadButtons
 * @returns {void}
 */
export function clearResults(listElement, downloadButtons) {
  listElement.replaceChildren();
  downloadButtons.forEach((button) => {
    button.disabled = true;
  });
}

/**
 * Enable or disable the download buttons and label them with the file they
 * actually save.
 *
 * @param {HTMLButtonElement[]} downloadButtons
 * @param {boolean} enabled
 * @param {Record<string, string>} [fileNamesByKind] `corrected` / `removed` -> file name.
 * @returns {void}
 */
export function setDownloadAvailability(downloadButtons, enabled, fileNamesByKind = {}) {
  downloadButtons.forEach((button) => {
    button.disabled = !enabled;

    const fileName = fileNamesByKind[button.dataset.download];
    if (!fileName) {
      return;
    }

    // textContent, never innerHTML: the file name comes from the uploaded file.
    button.textContent = `Descargar ${fileName}`;
    button.title = fileName;
  });
}