import './styles.css';

import { InputError } from './core/errors.js';
import { buildOutputFileNames } from './core/output-file-names.js';
import { parseInputFile } from './core/parse-input-file.js';
import { validateLineNumbersInput } from './core/parse-line-numbers.js';
import { processRecords } from './core/process-records.js';
import { downloadTextFile } from './ui/download-file.js';
import {
  clearResults,
  createSummaryItems,
  renderStatus,
  renderSummary,
  setDownloadAvailability,
} from './ui/render-status.js';

const elements = {
  form: document.getElementById('process-form'),
  fileInput: document.getElementById('file-input'),
  fileSummary: document.getElementById('file-summary'),
  lineNumbersInput: document.getElementById('line-numbers-input'),
  lineNumbersError: document.getElementById('line-numbers-error'),
  processButton: document.getElementById('process-button'),
  resetButton: document.getElementById('reset-button'),
  status: document.getElementById('status'),
  results: document.getElementById('results'),
  resultsHeading: document.getElementById('results-heading'),
  summaryList: document.getElementById('summary-list'),
  downloadCorrected: document.getElementById('download-corrected'),
  downloadRemoved: document.getElementById('download-removed'),
};

const downloadButtons = [elements.downloadCorrected, elements.downloadRemoved];

/**
 * Everything the UI keeps in memory while the user works. Results are derived
 * data: any change to the file or to the line numbers clears them so a stale
 * file can never be downloaded.
 */
const state = {
  /** Name of the uploaded file, used to build the download names. */
  fileName: '',
  /** Result of parsing the uploaded file, or `null` while it is missing/invalid. */
  parsedFile: null,
  /** Output of `processRecords`, or `null` when there is nothing to download. */
  result: null,
  /** Download names, or `null` when there is nothing to download. */
  outputFileNames: null,
};

/* -------------------------------------------------------------------------- */
/* Event handlers                                                             */
/* -------------------------------------------------------------------------- */

elements.form.addEventListener('submit', handleSubmit);
elements.fileInput.addEventListener('change', handleFileChange);
elements.lineNumbersInput.addEventListener('input', handleLineNumbersInput);
elements.resetButton.addEventListener('click', handleReset);
downloadButtons.forEach((button) => button.addEventListener('click', handleDownload));

renderStatus(elements.status, {
  message: 'Selecciona un archivo .txt para comenzar.',
  variant: 'info',
});

/** Read and validate the selected file. */
async function handleFileChange() {
  const file = elements.fileInput.files?.[0];

  invalidateResults();
  state.fileName = file?.name ?? '';
  state.parsedFile = null;
  // Block processing while the file is being read.
  elements.processButton.disabled = true;

  if (!file) {
    hideFileSummary();
    renderStatus(elements.status, {
      message: 'No hay ningún archivo seleccionado. Selecciona un archivo .txt.',
      variant: 'info',
    });
    return;
  }

  renderStatus(elements.status, { message: `Leyendo ${file.name}…`, variant: 'busy' });
  await yieldToBrowser();

  try {
    state.parsedFile = parseInputFile(await file.text());

    const { records, blankLineNumbers } = state.parsedFile;
    const blankLineNote =
      blankLineNumbers.length > 0
        ? `, ${blankLineNumbers.length} línea(s) en blanco ignorada(s)`
        : '';

    elements.fileSummary.hidden = false;
    elements.fileSummary.textContent = `${file.name}: ${records.length} registro(s)${blankLineNote}.`;

    renderStatus(elements.status, {
      message:
        records.length === 0
          ? `${file.name} no contiene ningún registro.`
          : `${file.name} cargado. Ingresa los números de línea a eliminar.`,
      variant: records.length === 0 ? 'warning' : 'info',
    });
  } catch (error) {
    hideFileSummary();
    reportError(error, `${file.name} no se pudo usar.`);
  }

  updateProcessAvailability();
}

/** Validate the typed line numbers on every keystroke. */
function handleLineNumbersInput() {
  invalidateResults();
  updateProcessAvailability();
}

/** Process the file with the currently requested line numbers. */
async function handleSubmit(event) {
  event.preventDefault();

  const lineNumbers = readLineNumbers();
  const parsedFile = state.parsedFile;
  const typedInput = elements.lineNumbersInput.value;

  if (lineNumbers.length === 0 || !parsedFile) {
    updateProcessAvailability();
    return;
  }

  renderStatus(elements.status, { message: 'Procesando…', variant: 'busy' });
  await yieldToBrowser();

  // The step above yields to the browser: if the inputs changed in the meantime,
  // the newer input wins and this run is discarded.
  if (state.parsedFile !== parsedFile || elements.lineNumbersInput.value !== typedInput) {
    return;
  }

  try {
    // Mirror the source file: a file saved without a final newline produces
    // outputs without a final newline.
    const result = processRecords(parsedFile.records, lineNumbers, {
      trailingNewline: parsedFile.endsWithNewline,
    });
    state.result = result;
    state.outputFileNames = buildOutputFileNames(state.fileName);

    renderSummary(
      elements.summaryList,
      createSummaryItems({
        fileName: state.fileName,
        recordCount: parsedFile.records.length,
        blankLineCount: parsedFile.blankLineNumbers.length,
        result,
      }),
    );
    setDownloadAvailability(downloadButtons, true, state.outputFileNames);
    elements.results.hidden = false;
    elements.resultsHeading.focus();

    renderStatus(elements.status, {
      message:
        result.unmatchedLineNumbers.length > 0
          ? `Listo con advertencias: ${result.unmatchedLineNumbers.length} número(s) de línea solicitado(s) no se encontraron en el archivo. Revisa el resumen antes de descargar.`
          : `Listo: ${result.removedCount} registro(s) eliminado(s), ${result.correctedCount} restante(s).`,
      variant: result.unmatchedLineNumbers.length > 0 ? 'warning' : 'success',
    });
  } catch (error) {
    reportError(error, 'No se pudo procesar el archivo.');
  }
}

/** Download one of the two generated files. */
function handleDownload(event) {
  const button = event.currentTarget;
  const kind = button.dataset.download;
  const fileName = state.outputFileNames?.[kind];
  const text = kind === 'corrected' ? state.result?.correctedText : state.result?.removedText;

  if (!state.result || !fileName || text === undefined) {
    renderStatus(elements.status, {
      message: 'Vuelve a procesar el archivo antes de descargar.',
      variant: 'error',
    });
    return;
  }

  downloadTextFile(fileName, text);
}

/** Start over. */
function handleReset() {
  elements.form.reset();
  setLineNumbersError('', false);

  state.fileName = '';
  state.parsedFile = null;
  invalidateResults();

  hideFileSummary();
  elements.results.hidden = true;
  renderStatus(elements.status, {
    message: 'Se borró todo. Selecciona un archivo .txt para comenzar de nuevo.',
    variant: 'info',
  });

  elements.fileInput.focus();
}

/* -------------------------------------------------------------------------- */
/* Helpers                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Validate the line numbers field and keep the inline error in sync with it.
 *
 * @returns {number[]} The parsed numbers, or an empty array when the field is
 * empty or invalid.
 */
function readLineNumbers() {
  const { lineNumbers, error } = validateLineNumbersInput(elements.lineNumbersInput.value);

  setLineNumbersError(error, error !== '');

  return lineNumbers;
}

/**
 * Validate the input and enable the "Procesar archivo" button only when
 * everything required is present.
 */
function updateProcessAvailability() {
  const canProcess = Boolean(state.parsedFile && readLineNumbers().length > 0);

  elements.processButton.disabled = !canProcess;

  if (canProcess) {
    renderStatus(elements.status, { message: 'Listo para procesar.', variant: 'info' });
  }
}

/**
 * Show or clear the inline validation error of the line numbers field.
 *
 * @param {string} message Empty message hides the error.
 * @param {boolean} isError
 */
function setLineNumbersError(message, isError) {
  elements.lineNumbersError.textContent = message;
  elements.lineNumbersError.hidden = message === '';
  elements.lineNumbersInput.setAttribute('aria-invalid', String(isError));
}

/**
 * Drop the generated files, so outdated results cannot be downloaded after the
 * input changes.
 */
function invalidateResults() {
  state.result = null;
  state.outputFileNames = null;
  clearResults(elements.summaryList, downloadButtons);
  elements.results.hidden = true;
  renderStatus(elements.status, {});
}

/**
 * @param {unknown} error
 * @param {string} context Message shown before the specific error.
 */
function reportError(error, context) {
  const message = error instanceof InputError ? error.message : 'Ocurrió un error inesperado.';
  invalidateResults();
  renderStatus(elements.status, { message: `${context} ${message}`, variant: 'error' });
}

/** Hide the "file loaded" line. */
function hideFileSummary() {
  elements.fileSummary.hidden = true;
  elements.fileSummary.textContent = '';
}

/** Let the browser paint a pending status message before the work starts. */
function yieldToBrowser() {
  return new Promise((resolve) => {
    window.setTimeout(resolve, 0);
  });
}