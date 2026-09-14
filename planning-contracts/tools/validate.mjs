#!/usr/bin/env node
/**
 * Validate every planning contract against the schema, and against the use
 * case it belongs to.
 *
 *   node planning-contracts/tools/validate.mjs
 *
 * The schema check catches a malformed file. The cross-reference checks catch
 * the thing that actually goes wrong over months: a contract and its use case
 * drifting apart — an E-id that no longer exists, a $stepN.field the operation
 * never returns, a rule citing a BR that was renumbered, a reversal or a
 * route naming a capability that does not exist.
 */
import { discover, loadSchema, phrase } from './lib/discover.mjs';
import { checkSchema } from './lib/schema-check.mjs';
import { ROOT } from './lib/discover.mjs';
import path from 'node:path';


const REF = /^\$(request|session|step(\d+))\.([A-Za-z_][A-Za-z0-9_]*)$/;

const problems = [];
const warnings = [];
const seenIntents = new Map();
const seenCapabilities = new Map();   // operation name -> {contract, signature}

const err = (where, message) => problems.push({ where, message });
const warn = (where, message) => warnings.push({ where, message });

function collectRefs(value, found = []) {
  if (typeof value === 'string') {
    const m = REF.exec(value.trim());
    if (m) found.push({ raw: value.trim(), kind: m[1].startsWith('step') ? 'step' : m[1], step: m[2] ? Number(m[2]) : null, field: m[3] });
  } else if (Array.isArray(value)) {
    value.forEach((v) => collectRefs(v, found));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach((v) => collectRefs(v, found));
  }
  return found;
}

/** Steps must be 1..N with no gaps, and every operation must be defined here. */
function checkSteps(where, steps, opsByName, { label }) {
  steps.forEach((s, i) => {
    if (s.step !== i + 1) err(where, `${label}: step ${s.step} is in position ${i + 1} — steps must run 1..N in order`);
    const op = opsByName.get(s.operation);
    if (!op) {
      err(where, `${label} step ${s.step}: operation "${s.operation}" is not defined in this contract's operations`);
      return;
    }
    const declared = new Map(op.parameters.map((p) => [p.name, p]));
    for (const key of Object.keys(s.inputs ?? {})) {
      if (!declared.has(key)) err(where, `${label} step ${s.step}: input "${key}" is not a parameter of ${op.name}`);
    }
    for (const p of op.parameters) {
      if (p.required && !(p.name in (s.inputs ?? {}))) {
        err(where, `${label} step ${s.step}: required parameter "${p.name}" of ${op.name} is missing from inputs`);
      }
    }
    // $stepN.field must point backwards, at a step present here, at a field it returns.
    for (const ref of collectRefs(s.inputs ?? {})) {
      if (ref.kind !== 'step') continue;
      if (ref.step >= s.step) {
        err(where, `${label} step ${s.step}: ${ref.raw} refers to step ${ref.step}, which does not run earlier`);
        continue;
      }
      const source = steps.find((x) => x.step === ref.step);
      if (!source) {
        err(where, `${label} step ${s.step}: ${ref.raw} refers to step ${ref.step}, which is not in this plan`);
        continue;
      }
      const sourceOp = opsByName.get(source.operation);
      if (!sourceOp) continue;
      const fields = new Set(sourceOp.returns.fields.map((f) => f.name));
      if (!fields.has(ref.field)) {
        err(where, `${label} step ${s.step}: ${ref.raw} — ${sourceOp.name} does not return a field named "${ref.field}"`);
      }
    }
  });
}

/** Every parameter sourced from a step must carry a matching $stepN.field ref. */
function checkParameterSources(where, contract) {
  for (const op of contract.operations) {
    for (const p of op.parameters) {
      const ref = REF.exec((p.sourceRef ?? '').trim());
      if (p.source === 'step') {
        if (!ref || ref[1].startsWith('step') === false) {
          err(where, `${op.name}.${p.name}: source is "step" but sourceRef "${p.sourceRef}" is not a $stepN.field reference`);
        }
      } else if (p.source === 'session') {
        if (!ref || ref[1] !== 'session') err(where, `${op.name}.${p.name}: source is "session" but sourceRef "${p.sourceRef}" is not $session.<field>`);
      } else if (p.source === 'request') {
        if (!ref || ref[1] !== 'request') err(where, `${op.name}.${p.name}: source is "request" but sourceRef "${p.sourceRef}" is not $request.<field>`);
      } else if (p.source === 'resolved') {
        if (!p.resolves) {
          err(where, `${op.name}.${p.name}: source is "resolved" but no resolves block says what to ask the resolve door for`);
        } else {
          const from = REF.exec((p.resolves.fromPhrase ?? '').trim());
          if (!from || from[1] !== 'request') {
            err(where, `${op.name}.${p.name}: resolves.fromPhrase "${p.resolves.fromPhrase}" must be a $request.<field> reference — resolution starts from the actor's words`);
          }
          if (p.sourceRef !== p.resolves.fromPhrase) {
            err(where, `${op.name}.${p.name}: sourceRef and resolves.fromPhrase must agree; the plan carries the phrase and the parameter resolver converts it`);
          }
        }
      } else if (p.source === 'literal') {
        if (ref) err(where, `${op.name}.${p.name}: source is "literal" but sourceRef "${p.sourceRef}" is a reference`);
      }
    }
    // Two parameters resolved from the same phrase are two lookups of one
    // thing, and two lookups can disagree. Usually one derives from the other.
    const byPhrase = new Map();
    for (const p of op.parameters) {
      if (p.source !== 'resolved' || !p.resolves) continue;
      const list = byPhrase.get(p.resolves.fromPhrase) ?? [];
      list.push(`${p.name} (${p.resolves.entityType})`);
      byPhrase.set(p.resolves.fromPhrase, list);
    }
    for (const [phrase, names] of byPhrase) {
      if (names.length > 1) {
        warn(where, `${op.name}: ${names.join(' and ')} both resolve from ${phrase}. That is two lookups of one phrase, and they can disagree. If one derives from the other — a section determines its class, a guardian determines their family — declare only the more specific one and let the backend derive the rest.`);
      }
    }

    if (op.kind !== 'read' && op.idempotent === false && !op.idempotencyKey) {
      err(where, `${op.name}: a non-idempotent write needs an idempotencyKey`);
    }
    if (!op.path.startsWith('/api/')) warn(where, `${op.name}: path "${op.path}" does not start with /api/`);
    for (const seg of op.path.match(/\{[^}]+\}/g) ?? []) {
      const name = seg.slice(1, -1);
      if (!op.parameters.some((p) => p.name === name)) {
        err(where, `${op.name}: path placeholder ${seg} has no matching parameter`);
      }
    }
  }
}

/** The half that catches drift: ids cited here must still exist over there. */
function checkAgainstUseCase(where, contract, uc) {
  const exceptionIds = new Set((uc.exceptions ?? []).map((e) => e.id));
  const brIds = new Set((uc.businessRules ?? []).map((b) => b.id));
  const acIds = new Set((uc.acceptanceCriteria ?? []).map((a) => a.id));
  const altIds = new Set((uc.alternateFlows ?? []).map((a) => a.id));
  const conventions = new Set((uc.conventionsApplied ?? []).map((c) => c.name));
  const oqCount = (uc.openQuestions ?? []).length;

  for (const op of contract.operations) {
    for (const e of op.errors) {
      if (e.mapsTo === null || e.mapsTo === undefined) {
        warn(where, `${op.name}/${e.code}: maps to no E-id in ${uc.id}. Intentional here, but it means the use case has no exception for a failure the assistant path can reach.`);
        continue;
      }
      if (!exceptionIds.has(e.mapsTo)) {
        err(where, `${op.name}/${e.code}: mapsTo "${e.mapsTo}" is not an exception in ${uc.id} (has ${[...exceptionIds].join(', ') || 'none'})`);
      }
    }
  }

  for (const rule of contract.planningRules) {
    for (const token of rule.derivedFrom ?? []) {
      if (/^BR-\d+$/.test(token)) {
        if (!brIds.has(token)) err(where, `${rule.id}: derivedFrom "${token}" is not a business rule in ${uc.id}`);
      } else if (/^AC-\d+$/.test(token)) {
        if (!acIds.has(token)) err(where, `${rule.id}: derivedFrom "${token}" is not an acceptance criterion in ${uc.id}`);
      } else if (/^E\d+$/.test(token)) {
        if (!exceptionIds.has(token)) err(where, `${rule.id}: derivedFrom "${token}" is not an exception in ${uc.id}`);
      } else if (/^A\d+$/.test(token)) {
        if (!altIds.has(token)) err(where, `${rule.id}: derivedFrom "${token}" is not an alternate flow in ${uc.id}`);
      } else if (/^OQ-\d+$/.test(token)) {
        const n = Number(token.slice(3));
        if (n < 1 || n > oqCount) err(where, `${rule.id}: derivedFrom "${token}" — ${uc.id} has ${oqCount} open question(s)`);
      } else if (/^[a-z]+(-[a-z]+)+$/.test(token)) {
        if (!conventions.has(token)) err(where, `${rule.id}: derivedFrom "${token}" is not a System Convention applied by ${uc.id}`);
      }
    }
  }

  const ruleIds = contract.planningRules.map((r) => r.id);
  ruleIds.forEach((id, i) => {
    if (id !== `PR-${i + 1}`) err(where, `planningRules: ${id} is in position ${i + 1} — rules must run PR-1..PR-N in order`);
  });

}

/**
 * An enum parameter must offer values the use case actually defines. Nothing
 * else catches a plausible-looking value that no field has ever held.
 */
function checkEnums(where, contract, uc) {
  const fieldEnums = (uc.dataFields ?? []).filter((f) => f.enumValues).map((f) => ({ name: f.name, values: f.enumValues }));
  // A use case with no enum fields at all cannot vouch for any enum parameter,
  // so warn rather than silently passing what the contract invented.
  if (fieldEnums.length === 0) {
    for (const op of contract.operations) {
      for (const p of op.parameters) {
        if (/^enum:/.test(p.type ?? '')) {
          warn(where, `${op.name}.${p.name} is an enum, but ${uc.id} defines no enum data field to check it against — the value set was invented here`);
        }
      }
    }
    return;
  }
  for (const op of contract.operations) {
    for (const p of op.parameters) {
      const m = /^enum:\s*(.+)$/.exec(p.type ?? '');
      if (!m) continue;
      const values = m[1].split('|').map((v) => v.trim()).filter(Boolean);
      if (values.length === 0) continue;
      const fits = fieldEnums.some((f) => values.every((v) => f.values.includes(v)));
      if (fits) continue;
      // Report against whichever field overlaps most, so the fix is obvious.
      const best = fieldEnums
        .map((f) => ({ f, hit: values.filter((v) => f.values.includes(v)).length }))
        .sort((a, b) => b.hit - a.hit)[0];
      const bad = values.filter((v) => !best.f.values.includes(v));
      err(where, `${op.name}.${p.name}: enum value(s) ${bad.map((b) => `"${b}"`).join(', ')} are in no data field of ${uc.id}. Closest field "${best.f.name}" holds: ${best.f.values.join(' | ')}`);
    }
  }
}

/**
 * Prose goes stale when a contract is restructured: a rule still naming an
 * operation that was merged away, a note still saying "step 2" of a one-step
 * plan. Nothing else here catches it, because the plan itself stays valid.
 */
function checkStaleProse(where, contract, allIntents) {
  const live = new Set(contract.operations.map((o) => o.name));
  const codes = new Set(contract.operations.flatMap((o) => o.errors.map((e) => e.code)));
  const steps = contract.plan.steps.length;
  const opLike = /\b[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*){1,3}\b/g;
  const stepLike = /\$step(\d+)|\bstep (\d+)\b/gi;
  const codeLike = /\b[A-Z][A-Z0-9]*(?:_[A-Z0-9]+){1,4}\b/g;

  const walk = (node, path) => {
    if (typeof node === 'string') {
      // Skip fields that legitimately name things outside this contract:
      // its own intent, where a request routes to, and open questions, which
      // exist precisely to discuss what does not yet exist.
      if (/\.(inputs|sourceRef|path|check|name|goesTo)$/.test(path)) return;
      if (path.includes('.inputs.') || path.includes('.openQuestions')) return;
      for (const m of node.match(opLike) ?? []) {
        // Only flag things that look like this system's own operation names.
        if (!/^(dashboard|module|list|search|session|student|guardian|class)\./.test(m)) continue;
        if (live.has(m) || allIntents.has(m)) continue;   // an intent name is not an operation name
        err(where, `stale prose at ${path}: names "${m}", which is neither an operation this contract defines nor an intent anywhere in the system`);
      }
      for (const m of node.matchAll(stepLike)) {
        const n = Number(m[1] ?? m[2]);
        if (n > steps) err(where, `stale prose at ${path}: refers to step ${n} of a ${steps}-step plan`);
      }
      for (const m of node.match(codeLike) ?? []) {
        if (m === 'PKR' || m === 'STF' || m === 'STD' || m === 'FAM') continue;
        if (!codes.has(m) && /_/.test(m) && m === m.toUpperCase() && m.length > 6) {
          err(where, `stale prose at ${path}: names error code "${m}", which no operation here returns`);
        }
      }
    } else if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`));
    } else if (node && typeof node === 'object') {
      for (const [k, v] of Object.entries(node)) walk(v, `${path}.${k}`);
    }
  };
  walk(contract, contract.contractId);
}

/**
 * Requests reach this system in English and in Roman Urdu, so a contract whose
 * examples are all English has only been half thought through.
 */
function checkPhrases(where, phrases, { label, requireUrdu = false }) {
  let urdu = 0;
  for (const raw of phrases) {
    const p = phrase(raw);
    if (p.lang && p.lang !== 'en') {
      urdu += 1;
      if (!p.gloss || !p.gloss.trim()) err(where, `${label}: "${p.text}" is ${p.lang} but carries no English gloss`);
      const hasUrduScript = /[\u0600-\u06FF]/.test(p.text);
      if (p.lang === 'ur-Latn' && hasUrduScript) err(where, `${label}: "${p.text}" is in Urdu script — lang ur-Latn means Urdu written in Latin script; use lang "ur"`);
      if (p.lang === 'ur' && !hasUrduScript) err(where, `${label}: "${p.text}" is marked lang "ur" but contains no Urdu script — use "ur-Latn"`);
    } else if (p.gloss) {
      err(where, `${label}: "${p.text}" is English but carries a gloss`);
    }
  }
  if (requireUrdu && phrases.length && urdu === 0) {
    warn(where, `${label}: every example is English. Requests also arrive in Roman Urdu — add at least one, per the request-language convention.`);
  }
  return urdu;
}

/**
 * A reversal names the operation that undoes a contract, and a route names the
 * capability a request goes to instead. Both are capability ids written as
 * free strings, so nothing else notices when the name is wrong, stale, or has
 * swapped places with the explanation beside it.
 */
const CAPABILITY = /^[a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+$/;
const LEADING_CAPABILITY = /^([a-z][a-z0-9]*(?:\.[a-z][a-z0-9]*)+)(\.\*)?/;

function checkReversal(where, contract) {
  const r = contract.reversal ?? {};
  if (r.operation !== null && r.operation !== undefined) {
    if (!CAPABILITY.test(r.operation)) {
      err(where, `reversal.operation "${String(r.operation).slice(0, 60)}" is not a capability id — it names the compensating operation, and the explanation belongs in reversal.statement`);
    } else if (!allCapabilityNames.has(r.operation)) {
      err(where, `reversal.operation names "${r.operation}", which is neither an operation nor an intent anywhere in the system`);
    }
  }
  if (typeof r.statement === 'string' && CAPABILITY.test(r.statement.trim())) {
    err(where, `reversal.statement is a bare capability id ("${r.statement.trim()}") — reversal.operation and reversal.statement look swapped`);
  }
}

/** A route that begins with a capability id must name a real one; prose routes are not checked. */
function checkRouteTarget(where, label, goesTo) {
  const m = LEADING_CAPABILITY.exec(String(goesTo ?? '').trim());
  if (!m) return;
  const [, name, family] = m;
  if (family) {
    if (![...allCapabilityNames].some((n) => n.startsWith(`${name}.`))) {
      err(where, `${label}: goesTo names the family "${name}.*", but no operation or intent starts with "${name}."`);
    }
  } else if (!allCapabilityNames.has(name)) {
    err(where, `${label}: goesTo names "${name}", which is neither an operation nor an intent anywhere in the system`);
  }
}

const schema = loadSchema();
const entries = discover();

if (entries.length === 0) {
  console.log('No planning contracts found under modules/*/PlanningContracts/.');
  process.exit(0);
}

// Intent names read exactly like operation names, and routing prose names
// intents in other contracts, so gather them all before checking any.
const allIntentNames = new Set(
  entries.flatMap((e) => (e.doc?.contracts ?? []).map((c) => c?.intent?.name).filter(Boolean)),
);

// A capability id is an operation name, and an intent is routable too — the
// set a reversal or a route may name.
const allCapabilityNames = new Set([
  ...allIntentNames,
  ...entries.flatMap((e) => (e.doc?.contracts ?? []).flatMap((c) => (c?.operations ?? []).map((o) => o?.name))).filter(Boolean),
]);

let contractCount = 0;
let notPlannedCount = 0;

for (const entry of entries) {
  const where = entry.relPath;
  if (entry.parseError) {
    err(where, `not valid JSON: ${entry.parseError}`);
    continue;
  }

  for (const e of checkSchema(schema, entry.doc)) {
    err(where, `schema: ${e.path} — ${e.message}`);
  }

  const doc = entry.doc;
  const uc = entry.useCase;

  if (!uc) {
    err(where, `use case file not found or unreadable: ${doc.useCase?.file} (looked at ${entry.useCasePath ? path.relative(ROOT, entry.useCasePath) : '—'})`);
  } else {
    if (uc.id !== doc.useCase.id) err(where, `useCase.id "${doc.useCase.id}" does not match the linked file's id "${uc.id}"`);
    if (uc.name !== doc.useCase.name) warn(where, `useCase.name has drifted from the use case file:\n      contract: ${doc.useCase.name}\n      use case: ${uc.name}`);
    if (doc.useCase.featureRef && uc.featureRef !== doc.useCase.featureRef) warn(where, `useCase.featureRef has drifted from the use case file`);
  }

  const expectedName = `${doc.useCase.id}.planning.json`;
  if (entry.file !== expectedName) err(where, `file should be named ${expectedName}`);

  if (doc.planned === false) {
    notPlannedCount += 1;
    if (!doc.notPlanned) err(where, 'planned is false but notPlanned is missing — the reason must be stated');
    if (doc.contracts.length > 0) err(where, 'planned is false but contracts is not empty');
    if (doc.notPlanned) {
      checkPhrases(where, doc.notPlanned.requestsThatArriveHere ?? [], { label: 'notPlanned.requestsThatArriveHere', requireUrdu: true });
      checkPhrases(where, (doc.notPlanned.routeInsteadTo ?? []).map((r) => r.request), { label: 'notPlanned.routeInsteadTo' });
      (doc.notPlanned.routeInsteadTo ?? []).forEach((r, j) => checkRouteTarget(where, `notPlanned.routeInsteadTo[${j}]`, r.goesTo));
    }
  } else {
    if (doc.contracts.length === 0) err(where, 'planned is true but there are no contracts — set planned to false and give the reason');
    if (doc.notPlanned) err(where, 'planned is true but notPlanned is present');
  }

  doc.contracts.forEach((contract, i) => {
    contractCount += 1;
    const label = contract.contractId;
    const cWhere = `${where} › ${label}`;

    if (contract.contractId !== `${doc.useCase.id}-PC-${i + 1}`) {
      err(cWhere, `contractId should be ${doc.useCase.id}-PC-${i + 1}`);
    }

    const prev = seenIntents.get(contract.intent.name);
    if (prev) err(cWhere, `intent "${contract.intent.name}" is already claimed by ${prev}`);
    else seenIntents.set(contract.intent.name, label);

    const opsByName = new Map(contract.operations.map((o) => [o.name, o]));
    if (opsByName.size !== contract.operations.length) err(cWhere, 'two operations share a name');

    // An operation name is the capability id an allow-list names, so it must
    // mean exactly one thing across the whole system.
    for (const op of contract.operations) {
      const signature = `${op.method} ${op.path} ${op.kind} ${op.idempotent}`;
      const prior = seenCapabilities.get(op.name);
      if (prior && prior.signature !== signature) {
        err(cWhere, `capability "${op.name}" is defined differently in ${prior.contract}:\n      here:  ${signature}\n      there: ${prior.signature}\n      An allow-list names capabilities, so one name cannot mean two things.`);
      } else if (!prior) {
        seenCapabilities.set(op.name, { contract: label, signature });
      }
    }

    checkSteps(cWhere, contract.plan.steps, opsByName, { label: 'plan' });
    checkParameterSources(cWhere, contract);

    for (const op of contract.operations) {
      if (/\.(resolve|lookup)$/.test(op.name)) {
        err(cWhere, `operation "${op.name}" is a lookup dressed as a capability. Name-to-id conversion goes through the gateway's resolve door, driven by the parameter resolver — declare it as a parameter with source "resolved" instead of a plan step.`);
      }
    }

    checkStaleProse(cWhere, contract, allIntentNames);
    checkReversal(cWhere, contract);
    (contract.intent.routesElsewhere ?? []).forEach((r, j) => checkRouteTarget(cWhere, `intent.routesElsewhere[${j}]`, r.goesTo));

    checkPhrases(cWhere, contract.intent.routesHere, { label: 'intent.routesHere', requireUrdu: true });
    checkPhrases(cWhere, contract.intent.routesElsewhere.map((r) => r.request), { label: 'intent.routesElsewhere' });
    checkPhrases(cWhere, contract.resolvedPlans.map((r) => r.request), { label: 'resolvedPlans', requireUrdu: true });

    const used = new Set(contract.plan.steps.map((s) => s.operation));
    for (const op of contract.operations) {
      if (!used.has(op.name)) warn(cWhere, `operation "${op.name}" is defined but no plan step calls it`);
    }

    contract.resolvedPlans.forEach((rp, j) => {
      checkSteps(cWhere, rp.steps, opsByName, { label: `resolvedPlan ${j + 1}` });
    });

    if (uc) {
      checkAgainstUseCase(cWhere, contract, uc);
      checkEnums(cWhere, contract, uc);
    }
  });
}

const line = (x) => `  ${x.where}\n    ${x.message}`;

console.log(`\nPlanning contracts — validation`);
console.log(`  files      ${entries.length}`);
console.log(`  contracts  ${contractCount}`);
console.log(`  not planned ${notPlannedCount}`);
console.log(`  intents    ${seenIntents.size}`);
console.log(`  capabilities ${seenCapabilities.size}`);
const ruleTotal = entries.reduce((n, e) => n + (e.doc?.contracts ?? []).reduce((m, c) => m + c.planningRules.length, 0), 0);
console.log(`  rules      ${ruleTotal}`);

if (warnings.length) {
  console.log(`\n${warnings.length} warning(s):`);
  warnings.forEach((w) => console.log(line(w)));
}

if (problems.length) {
  console.log(`\n${problems.length} problem(s):`);
  problems.forEach((p) => console.log(line(p)));
  console.log('');
  process.exit(1);
}

console.log('\nAll planning contracts are consistent with their use cases.\n');
