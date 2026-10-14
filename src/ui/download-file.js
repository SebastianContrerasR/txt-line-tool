const OBJECT_URL_REVOKE_DELAY_MS = 1000;

/**
 * Download a string as a UTF-8 `.txt` file, entirely in the browser.
 *
 * Nothing is uploaded: the text becomes a `Blob`, the blob is exposed through a
 * temporary object URL and the browser saves it locally.
 *
 * @param {string} fileName Name proposed to the browser for the saved file.
 * @param {string} text File contents.
 * @param {Document} [documentRef] Injectable for testing.
 * @returns {void}
 */
export function downloadTextFile(fileName, text, documentRef = document) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const objectUrl = URL.createObjectURL(blob);

  try {
    const link = documentRef.createElement('a');
    link.href = objectUrl;
    link.download = fileName;
    link.rel = 'noopener';
    link.style.display = 'none';
    documentRef.body.appendChild(link);
    link.click();
    link.remove();
  } finally {
    // Revoking too early cancels the download in some browsers, so the URL is
    // released on the next tick instead of immediately.
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), OBJECT_URL_REVOKE_DELAY_MS);
  }
}