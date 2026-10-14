/**
 * Error type used by every input-validation path in the core modules.
 *
 * The UI layer renders `error.message` directly, so messages must be written
 * for the end user: say what is wrong and what a valid value looks like.
 */
export class InputError extends Error {
  /**
   * @param {string} message Human readable, actionable description.
   * @param {{ physicalLineNumber?: number }} [context] Where the problem was found.
   */
  constructor(message, context = {}) {
    super(message);
    this.name = 'InputError';
    /** Physical line of the uploaded file, when the error refers to one. */
    this.physicalLineNumber = context.physicalLineNumber;
  }
}