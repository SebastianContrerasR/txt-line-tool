/**
 * @typedef {object} OutputFileNames
 * @property {string} corrected File name for the renumbered file.
 * @property {string} removed File name for the removed records.
 */

/**
 * Build the download names from the name of the uploaded file:
 * `data.txt` -> `{ corrected: 'data_corrected.txt', removed: 'data_removed.txt' }`.
 *
 * @param {string} originalFileName Name reported by the browser for the uploaded file.
 * @returns {OutputFileNames}
 */
export function buildOutputFileNames(originalFileName) {
  const baseName = extractBaseName(originalFileName);

  return {
    corrected: `${baseName}_corrected.txt`,
    removed: `${baseName}_removed.txt`,
  };
}

/**
 * Drop any directory part and the last extension of the uploaded file name.
 * Falls back to `file` for names such as `.txt`.
 *
 * @param {string} fileName
 * @returns {string}
 */
function extractBaseName(fileName) {
  const fileNameWithoutPath = String(fileName ?? '').split(/[\\/]/).pop() ?? '';
  const baseName = fileNameWithoutPath.replace(/\.[^.]*$/, '');

  return baseName === '' ? 'file' : baseName;
}