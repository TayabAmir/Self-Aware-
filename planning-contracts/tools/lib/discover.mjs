import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));   // planning-contracts/tools/lib
export const TOOLS_DIR = path.resolve(HERE, '..');
export const ROOT = path.resolve(HERE, '..', '..', '..');     // repository root
export const PC_DIR = path.join(ROOT, 'planning-contracts');
export const MODULES_DIR = path.join(ROOT, 'modules');

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));

/**
 * Walk modules/<module>/PlanningContracts/*.planning.json and pair each file
 * with the use case JSON it points at.
 */
export function discover() {
  const out = [];
  if (!fs.existsSync(MODULES_DIR)) return out;

  for (const moduleDir of fs.readdirSync(MODULES_DIR).sort()) {
    const pcDir = path.join(MODULES_DIR, moduleDir, 'PlanningContracts');
    if (!fs.existsSync(pcDir)) continue;

    for (const file of fs.readdirSync(pcDir).sort()) {
      if (!file.endsWith('.planning.json')) continue;
      const filePath = path.join(pcDir, file);
      const entry = {
        moduleDir,
        file,
        filePath,
        relPath: path.relative(ROOT, filePath),
        doc: null,
        useCase: null,
        useCasePath: null,
        parseError: null,
      };
      try {
        entry.doc = readJson(filePath);
      } catch (err) {
        entry.parseError = err.message;
        out.push(entry);
        continue;
      }
      const ucRel = entry.doc?.useCase?.file;
      if (ucRel) {
        const ucPath = path.resolve(pcDir, ucRel);
        entry.useCasePath = ucPath;
        if (fs.existsSync(ucPath)) {
          try {
            entry.useCase = readJson(ucPath);
          } catch (err) {
            entry.useCaseError = err.message;
          }
        }
      }
      out.push(entry);
    }
  }
  return out;
}

export function loadSchema() {
  return readJson(path.join(PC_DIR, 'planning-contract.schema.json'));
}

/** A request phrase is either a plain English string or {text, lang, gloss}. */
export function phrase(p) {
  return typeof p === 'string' ? { text: p, lang: 'en', gloss: null } : p;
}

export function moduleLabel(moduleDir) {
  const m = /^(\d+)_(.*)$/.exec(moduleDir);
  if (!m) return { number: null, name: moduleDir.replace(/_/g, ' ') };
  return { number: Number(m[1]), name: m[2].replace(/_/g, ' ').replace(/&/g, ' & ') };
}
