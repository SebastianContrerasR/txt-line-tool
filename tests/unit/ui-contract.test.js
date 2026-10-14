import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Static checks between `index.html` and `src/main.js`.
 *
 * The UI itself is not unit tested (that would need a DOM implementation), but a
 * renamed id would silently break the app, so the wiring is verified by reading
 * both files. No browser, no DOM library, no dependencies.
 */

const projectRoot = fileURLToPath(new URL('../..', import.meta.url));

const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const mainSource = await readFile(new URL('../../src/main.js', import.meta.url), 'utf8');

const idsInHtml = new Set([...html.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
const idsUsedByMain = [...mainSource.matchAll(/getElementById\('([^']+)'\)/g)].map(
  (match) => match[1],
);

describe('index.html and src/main.js', () => {
  it('are located from the repository root', () => {
    expect(projectRoot.endsWith('txt-line-tool/')).toBe(true);
  });

  it('ships both files', () => {
    expect(html.length).toBeGreaterThan(0);
    expect(mainSource.length).toBeGreaterThan(0);
  });

  it('uses a module script that loads src/main.js', () => {
    expect(html).toMatch(/<script type="module" src="\/src\/main\.js"><\/script>/);
  });

  it('declares every id used by main.js', () => {
    expect(idsUsedByMain.length).toBeGreaterThan(0);
    expect(idsUsedByMain.filter((id) => !idsInHtml.has(id))).toEqual([]);
  });

  it('gives the download buttons the kinds handled by main.js', () => {
    expect(html).toMatch(/data-download="corrected"/);
    expect(html).toMatch(/data-download="removed"/);
  });

  it('maps each download button to one of the generated files', () => {
    expect(mainSource).toMatch(/dataset\.download/);
    expect(mainSource).toMatch(/kind === 'corrected'/);
  });

  it('starts with the process button and both download buttons disabled', () => {
    const disabledElements = [...html.matchAll(/<(button|input|textarea)[^>]*\sid="[^"]+"[^>]*>/g)]
      .map((match) => match[0])
      .filter((tag) => /\sdisabled(\s|>|$)/.test(tag))
      .map((tag) => tag.match(/\sid="([^"]+)"/)[1]);

    expect(disabledElements).toContain('process-button');
    expect(disabledElements).toContain('download-corrected');
    expect(disabledElements).toContain('download-removed');
  });

  it('labels every form control', () => {
    const controlIds = [...html.matchAll(/<(input|textarea)\b[^>]*\sid="([^"]+)"/g)].map(
      (match) => match[2],
    );
    const labelsFor = [...html.matchAll(/\sfor="([^"]+)"/g)].map((match) => match[1]);

    expect(controlIds.length).toBeGreaterThan(0);
    expect(controlIds.filter((id) => !labelsFor.includes(id))).toEqual([]);
  });

  it('announces status changes in a live region', () => {
    expect(html).toMatch(/id="status"[^>]*role="status"/);
    expect(html).toMatch(/id="status"[^>]*aria-live="polite"/);
  });

  it('does not inject unescaped content through innerHTML', () => {
    expect(mainSource).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write|eval\(/);
  });
});