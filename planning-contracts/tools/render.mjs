#!/usr/bin/env node
/**
 * Build a single self-contained HTML page from every planning contract, plus
 * the intent index a router would load.
 *
 *   node planning-contracts/tools/render.mjs
 *
 * Writes planning-contracts/dist/index.html and dist/intent-index.json.
 * The HTML has no external dependency and opens by double-clicking.
 */
import fs from 'node:fs';
import path from 'node:path';
import { discover, ROOT, PC_DIR, moduleLabel } from './lib/discover.mjs';

const entries = discover();
const bad = entries.filter((e) => e.parseError);
if (bad.length) {
  for (const e of bad) console.error(`Cannot parse ${e.relPath}: ${e.parseError}`);
  process.exit(1);
}

/* ---------- the data the page renders ---------- */

const modules = new Map();
const intentIndex = [];
const capabilityIndex = [];
const capabilities = new Map();

for (const entry of entries) {
  const { doc } = entry;
  if (!modules.has(entry.moduleDir)) {
    modules.set(entry.moduleDir, { dir: entry.moduleDir, ...moduleLabel(entry.moduleDir), useCases: [] });
  }
  modules.get(entry.moduleDir).useCases.push({
    ...doc,
    _relPath: entry.relPath,
    _useCaseRelPath: entry.useCasePath ? path.relative(ROOT, entry.useCasePath) : null,
    _priority: entry.useCase?.priority ?? null,
  });

  for (const c of doc.contracts) {
    // Routing: what the small decompose model needs to name an intent, and
    // nothing else. Kept small deliberately — it is read on every message.
    intentIndex.push({
      intent: c.intent.name,
      summary: c.intent.summary,
      useCaseId: doc.useCase.id,
      useCaseName: doc.useCase.name,
      module: doc.useCase.module,
      contractId: c.contractId,
      contractFile: entry.relPath,
      capabilities: c.operations.map((o) => o.name),
      routesHere: c.intent.routesHere,
      routesElsewhere: c.intent.routesElsewhere,
    });

    // Planning: what the large model and the validate step need once an intent
    // has been chosen. Retrieved per intent, not loaded wholesale.
    capabilityIndex.push({
      intent: c.intent.name,
      contractId: c.contractId,
      useCaseId: doc.useCase.id,
      contractFile: entry.relPath,
      plan: c.plan,
      operations: c.operations,
      planningRules: c.planningRules,
      reversal: c.reversal,
      resolvedPlans: c.resolvedPlans,
    });

    for (const o of c.operations) {
      if (capabilities.has(o.name)) continue;
      capabilities.set(o.name, {
        capability: o.name,
        method: o.method,
        path: o.path,
        kind: o.kind,
        idempotent: o.idempotent,
        idempotencyKey: o.idempotencyKey ?? null,
        // A repeatable read may be run before the user has confirmed anything;
        // anything else waits for the approved plan.
        preApprovalSafe: o.kind === 'read' && o.idempotent === true,
        writesOnRead: o.writesOnRead ?? null,
        definedBy: c.contractId,
      });
    }
  }
  if (doc.planned === false) {
    intentIndex.push({
      intent: null,
      notPlanned: true,
      reason: doc.notPlanned?.reason,
      useCaseId: doc.useCase.id,
      useCaseName: doc.useCase.name,
      module: doc.useCase.module,
      contractFile: entry.relPath,
      routeInsteadTo: doc.notPlanned?.routeInsteadTo ?? [],
    });
  }
}

const data = {
  generatedAt: new Date().toISOString(),
  modules: [...modules.values()].sort((a, b) => (a.number ?? 99) - (b.number ?? 99)),
  counts: {
    useCases: entries.length,
    contracts: entries.reduce((n, e) => n + e.doc.contracts.length, 0),
    notPlanned: entries.filter((e) => e.doc.planned === false).length,
    intents: intentIndex.filter((i) => i.intent).length,
  },
};

/* ---------- page ---------- */

const payload = JSON.stringify(data).replace(/</g, '\\u003c');

const CSS = String.raw`
:root{
  --bg:#fbfaf8; --panel:#ffffff; --ink:#1b1a17; --muted:#6d6a63; --faint:#98948b;
  --line:#e6e2da; --line-soft:#f0ece5; --accent:#8a5a2b; --accent-soft:#f6efe6;
  --req:#1f5f8b; --req-bg:#e8f1f7; --ses:#8a5a2b; --ses-bg:#f7efe5;
  --stp:#3d6b41; --stp-bg:#eaf2ea; --lit:#5d5a54; --lit-bg:#efedea;
  --warn:#8a3d2b; --warn-bg:#f9ece8; --ok:#3d6b41;
  --mono:ui-monospace,SFMono-Regular,"SF Mono",Menlo,Consolas,monospace;
  --sans:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
  --serif:"Iowan Old Style","Palatino Linotype",Palatino,Georgia,serif;
}
@media (prefers-color-scheme:dark){
  :root{
    --bg:#16150f; --panel:#1d1c16; --ink:#e9e5db; --muted:#a09a8d; --faint:#7c766a;
    --line:#332f26; --line-soft:#26241d; --accent:#d7a45f; --accent-soft:#2a2318;
    --req:#7fb6dd; --req-bg:#182530; --ses:#d7a45f; --ses-bg:#2b2317;
    --stp:#8fc294; --stp-bg:#1a2620; --lit:#a8a296; --lit-bg:#26241d;
    --warn:#e09a86; --warn-bg:#2d1d18; --ok:#8fc294;
  }
}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{background:var(--bg);color:var(--ink);font:15px/1.6 var(--sans);-webkit-font-smoothing:antialiased}
a{color:var(--accent)}
code,kbd{font-family:var(--mono);font-size:.86em}
.layout{display:flex;min-height:100vh;align-items:flex-start}
/* sidebar */
aside{position:sticky;top:0;height:100vh;overflow:auto;width:310px;flex:0 0 310px;
  border-right:1px solid var(--line);background:var(--panel);padding:22px 0 60px}
aside h1{font:600 15px/1.3 var(--sans);margin:0 20px 2px;letter-spacing:-.01em}
aside .sub{margin:0 20px 16px;color:var(--muted);font-size:12.5px}
aside .counts{margin:0 20px 16px;display:flex;gap:14px;flex-wrap:wrap;font-size:12px;color:var(--muted)}
aside .counts b{display:block;font:600 17px/1.2 var(--sans);color:var(--ink)}
#filter{width:calc(100% - 40px);margin:0 20px 16px;padding:7px 10px;border:1px solid var(--line);
  border-radius:7px;background:var(--bg);color:var(--ink);font:13px var(--sans)}
#filter:focus{outline:2px solid var(--accent-soft);border-color:var(--accent)}
.mod{margin:0 0 6px}
.mod > .modname{font:600 11px/1 var(--sans);letter-spacing:.08em;text-transform:uppercase;
  color:var(--faint);padding:14px 20px 8px}
.uc{padding:0}
.uc .ucname{display:block;padding:7px 20px 3px;font-size:12px;color:var(--muted)}
.uc .ucname b{color:var(--ink);font-weight:600;font-family:var(--mono);font-size:11.5px}
nav a{display:block;padding:5px 20px 5px 34px;font-size:13px;text-decoration:none;color:var(--ink);
  border-left:2px solid transparent}
nav a:hover{background:var(--line-soft)}
nav a.on{border-left-color:var(--accent);background:var(--accent-soft);color:var(--accent);font-weight:600}
nav a.np{color:var(--faint);font-style:italic}
nav a code{color:inherit}
/* main */
main{flex:1;min-width:0;padding:44px 52px 140px;max-width:1080px}
.hidden{display:none!important}
h2.title{font:600 27px/1.2 var(--serif);margin:0 0 6px;letter-spacing:-.01em}
.crumb{font-size:12.5px;color:var(--muted);margin:0 0 26px}
.crumb code{color:var(--muted)}
section{margin:0 0 34px}
section > h3{font:600 11px/1 var(--sans);letter-spacing:.1em;text-transform:uppercase;color:var(--faint);
  margin:0 0 12px;padding-bottom:8px;border-bottom:1px solid var(--line)}
.card{background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:16px 18px;margin:0 0 12px}
.card.tight{padding:12px 14px}
.lead{font:17px/1.55 var(--serif);margin:0 0 18px;color:var(--ink)}
p{margin:0 0 10px}
p:last-child{margin-bottom:0}
ul{margin:0 0 10px;padding-left:20px}
li{margin:0 0 5px}
.pill{display:inline-block;padding:2px 8px;border-radius:20px;font:600 10.5px/1.7 var(--sans);
  letter-spacing:.05em;text-transform:uppercase;vertical-align:2px}
.pill.intent{background:var(--accent-soft);color:var(--accent);font-family:var(--mono);text-transform:none;
  letter-spacing:0;font-size:12px;padding:3px 9px}
.pill.get{background:var(--stp-bg);color:var(--stp)}
.pill.post,.pill.patch,.pill.put,.pill.delete{background:var(--ses-bg);color:var(--ses)}
.pill.read{background:var(--lit-bg);color:var(--lit)}
.pill.write{background:var(--warn-bg);color:var(--warn)}
.pill.yes{background:var(--stp-bg);color:var(--stp)}
.pill.no{background:var(--warn-bg);color:var(--warn)}
.src{display:inline-block;padding:1px 7px;border-radius:5px;font:600 10.5px/1.7 var(--mono)}
.src.request{background:var(--req-bg);color:var(--req)}
.src.session{background:var(--ses-bg);color:var(--ses)}
.src.step{background:var(--stp-bg);color:var(--stp)}
.src.literal{background:var(--lit-bg);color:var(--lit)}
table{width:100%;border-collapse:collapse;font-size:13.5px;margin:0 0 4px}
th{text-align:left;font:600 10.5px/1 var(--sans);letter-spacing:.07em;text-transform:uppercase;
  color:var(--faint);padding:0 10px 8px 0;border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:9px 10px 9px 0;border-bottom:1px solid var(--line-soft);vertical-align:top}
tr:last-child td{border-bottom:0}
td.k{font-family:var(--mono);font-size:12.5px;white-space:nowrap}
td.n{color:var(--muted);font-size:13px}
.scroll{overflow-x:auto}
.scroll table{min-width:620px}
.scroll td:first-child{min-width:150px}
pre{background:var(--bg);border:1px solid var(--line);border-radius:8px;padding:11px 13px;margin:8px 0 0;
  overflow-x:auto;font:12.5px/1.55 var(--mono)}
pre .r{color:var(--accent);font-weight:600}
.step{display:flex;gap:14px;margin:0 0 14px}
.step .num{flex:0 0 26px;height:26px;border-radius:50%;background:var(--accent-soft);color:var(--accent);
  font:600 13px/26px var(--mono);text-align:center}
.step .body{flex:1;min-width:0}
.step .op{font:600 14px var(--mono)}
.note{color:var(--muted);font-size:13px;margin:6px 0 0}
.kv{display:grid;grid-template-columns:120px 1fr;gap:6px 16px;font-size:13.5px}
.kv dt{font:600 10.5px/1.7 var(--sans);letter-spacing:.07em;text-transform:uppercase;color:var(--faint);padding-top:2px}
.kv dd{margin:0}
.rule{border-left:2px solid var(--line);padding:0 0 0 14px;margin:0 0 14px}
.rule .rid{font:600 12px var(--mono);color:var(--accent)}
.ph{display:block}
.ph .lang{display:inline-block;font:600 9.5px/1.6 var(--sans);letter-spacing:.06em;text-transform:uppercase;
  padding:0 5px;border-radius:4px;background:var(--req-bg);color:var(--req);vertical-align:2px;margin-right:6px}
.ph .lang.ur,.ph .lang.mixed{background:var(--ses-bg);color:var(--ses)}
.ph .gloss{display:block;color:var(--faint);font-size:12.5px;font-style:italic;margin-top:1px}
.enf{display:inline-block;padding:1px 6px;border-radius:5px;font:600 10px/1.7 var(--sans);
  letter-spacing:.05em;text-transform:uppercase;vertical-align:1px;margin-right:4px}
.enf.mechanical{background:var(--stp-bg);color:var(--stp)}
.enf.runtime{background:var(--req-bg);color:var(--req)}
.enf.model{background:var(--ses-bg);color:var(--ses)}
.check{margin:5px 0 0;font-size:12.5px;color:var(--muted);font-family:var(--mono)}
.check b{font:600 10.5px var(--sans);letter-spacing:.07em;text-transform:uppercase;color:var(--faint);font-family:var(--sans)}
.conv{border-left:2px solid var(--line);padding:0 0 0 14px;margin:0 0 14px}
.conv .cname{font:600 12px var(--mono);color:var(--accent)}
.conv .carea{font:600 10.5px var(--sans);letter-spacing:.06em;text-transform:uppercase;color:var(--faint);margin-left:8px}
.conv .ctext{color:var(--muted);font-size:13.5px;margin:4px 0 0}
.conv .cnote{margin:6px 0 0;font-size:13.5px}
.conv .cnote b{font:600 10.5px var(--sans);letter-spacing:.07em;text-transform:uppercase;color:var(--faint)}
.chips{margin-top:5px;display:flex;gap:5px;flex-wrap:wrap}
.chip{font:11.5px var(--mono);background:var(--line-soft);color:var(--muted);padding:1px 7px;border-radius:5px}
.bad{border-left:2px solid var(--warn);padding-left:14px;margin:0 0 16px}
.bad .req{font:600 14px/1.5 var(--serif);color:var(--warn)}
.warnbox{background:var(--warn-bg);border:1px solid transparent;border-radius:8px;padding:11px 13px;
  font-size:13px;color:var(--warn);margin:10px 0 0}
.npbox{background:var(--warn-bg);border-radius:10px;padding:18px 20px;margin:0 0 24px}
.npbox .why{font:17px/1.5 var(--serif);color:var(--warn);margin:0}
.q{margin:0 0 14px}
.q .qq{font-weight:600}
.q .qa{color:var(--muted);font-size:13.5px}
.empty{color:var(--muted);font-style:italic}
footer{margin-top:60px;padding-top:16px;border-top:1px solid var(--line);color:var(--faint);font-size:12px}
@media (max-width:900px){
  .layout{flex-direction:column}
  aside{position:static;height:auto;width:100%;flex:none;border-right:0;border-bottom:1px solid var(--line)}
  main{padding:26px 20px 80px}
}
`;

const JS = String.raw`
const DATA = window.__PLANNING_CONTRACTS__;
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const md = s => esc(s).replace(/“([^”]*)”/g,'“$1”');

/* highlight $request. / $session. / $stepN. references inside a JSON block */
function refJson(obj){
  const raw = JSON.stringify(obj, null, 2) ?? '{}';
  return esc(raw).replace(/&quot;\$(request|session|step\d+)\.([A-Za-z0-9_]+)&quot;/g,
    (m,a,b)=>'<span class="r">&quot;$'+a+'.'+b+'&quot;</span>');
}

/* A request is a plain English string, or {text, lang, gloss}. */
function ph(p, quote){
  const o = (typeof p === 'string') ? {text:p, lang:'en', gloss:null} : p;
  const q = quote === false ? '' : '“';
  const qe = quote === false ? '' : '”';
  if(o.lang === 'en' || !o.lang) return q+esc(o.text)+qe;
  const label = o.lang === 'ur-Latn' ? 'roman urdu' : (o.lang === 'ur' ? 'urdu' : 'mixed');
  return '<span class="ph"><span class="lang '+(o.lang==='ur-Latn'?'ur':esc(o.lang))+'">'+label+'</span>'+
         q+esc(o.text)+qe+'<span class="gloss">'+esc(o.gloss||'')+'</span></span>';
}

function list(items, fn){ return items && items.length ? '<ul>'+items.map(fn).join('')+'</ul>' : ''; }
function section(title, body){ return body ? '<section><h3>'+esc(title)+'</h3>'+body+'</section>' : ''; }

function renderIntent(c){
  const here = list(c.intent.routesHere, r => '<li>'+ph(r)+'</li>');
  const away = c.intent.routesElsewhere.length ? '<div class="card"><div class="scroll"><table>'+
    '<tr><th>Request</th><th>Goes to</th><th>Why</th></tr>'+
    c.intent.routesElsewhere.map(r =>
      '<tr><td>'+ph(r.request)+'</td><td class="k">'+esc(r.goesTo)+'</td><td class="n">'+esc(r.note||'')+'</td></tr>'
    ).join('')+'</table></div></div>' : '';
  return section('Intent',
    '<p class="lead">'+md(c.intent.summary)+'</p>'+
    '<div class="card"><h4 style="margin:0 0 8px;font:600 12px var(--sans)">Requests that route here</h4>'+here+'</div>'+
    (away ? '<h4 style="margin:18px 0 8px;font:600 12px var(--sans)">Routes elsewhere</h4>'+away : ''));
}

function renderSteps(steps){
  return steps.map(s =>
    '<div class="step"><div class="num">'+s.step+'</div><div class="body">'+
    '<div class="op">'+esc(s.operation)+'</div>'+
    '<pre>'+refJson(s.inputs)+'</pre>'+
    (s.note ? '<p class="note">'+md(s.note)+'</p>' : '')+
    '</div></div>').join('');
}

function renderPlan(c){
  return section('Plan',
    '<p class="note" style="margin:-4px 0 14px">Executed in order, unconditionally. The controller substitutes and calls; it evaluates no conditions.</p>'+
    '<div class="card">'+renderSteps(c.plan.steps)+'</div>'+
    '<div class="card tight"><dl class="kv">'+
      '<dt>On failure</dt><dd>'+md(c.plan.onFailure)+'</dd>'+
      '<dt>Atomicity</dt><dd>'+md(c.plan.atomicity)+'</dd>'+
    '</dl></div>');
}

function renderOperations(c){
  return section('Operations', c.operations.map(op => {
    const params = op.parameters.length ? '<div class="scroll"><table>'+
      '<tr><th>Parameter</th><th>Source</th><th>Reference</th><th>Req.</th><th>Type</th><th>Notes</th></tr>'+
      op.parameters.map(p =>
        '<tr><td class="k">'+esc(p.name)+'</td>'+
        '<td><span class="src '+esc(p.source)+'">'+esc(p.source)+'</span></td>'+
        '<td class="k">'+esc(p.sourceRef||'')+'</td>'+
        '<td class="n">'+(p.required?'yes':'no')+'</td>'+
        '<td class="n">'+esc(p.type)+'</td>'+
        '<td class="n">'+md(p.notes)+'</td></tr>').join('')+
      '</table></div>' : '<p class="empty">No parameters.</p>';

    const returns = '<p class="note" style="margin:14px 0 6px"><b style="color:var(--ink)">Returns</b> — '+md(op.returns.description)+'</p>'+
      '<div class="scroll"><table><tr><th>Field</th><th>Type</th><th>Description</th></tr>'+
      op.returns.fields.map(f =>
        '<tr><td class="k">'+esc(f.name)+'</td><td class="n">'+esc(f.type)+'</td><td class="n">'+md(f.description)+'</td></tr>'
      ).join('')+'</table></div>';

    const errors = op.errors.length ? '<p class="note" style="margin:14px 0 6px"><b style="color:var(--ink)">Errors</b></p>'+
      '<div class="scroll"><table><tr><th>Code</th><th>Maps to</th><th>Status</th><th>Meaning</th><th>Written / not written</th></tr>'+
      op.errors.map(e =>
        '<tr><td class="k">'+esc(e.code)+(e.treatedAsSuccess?' <span class="pill yes">success path</span>':'')+'</td>'+
        '<td class="k">'+(e.mapsTo ? esc(e.mapsTo) : '<span style="color:var(--warn)">— none</span>')+'</td>'+
        '<td class="n">'+esc(e.httpStatus)+'</td>'+
        '<td class="n">'+md(e.meaning)+'</td>'+
        '<td class="n"><b>Written:</b> '+md(e.written)+
          (e.notWritten?'<br><b>Not written:</b> '+md(e.notWritten):'')+
          (e.note?'<br><i>'+md(e.note)+'</i>':'')+'</td></tr>').join('')+
      '</table></div>' : '';

    const writeKind = op.kind === 'read' ? 'read' : 'write';
    return '<div class="card">'+
      '<div style="display:flex;gap:8px;align-items:baseline;flex-wrap:wrap;margin-bottom:4px">'+
        '<span class="pill '+op.method.toLowerCase()+'">'+esc(op.method)+'</span>'+
        '<code style="font-size:13.5px">'+esc(op.path)+'</code>'+
        '<span class="pill '+writeKind+'">'+esc(op.kind)+'</span>'+
        '<span class="pill '+(op.idempotent?'yes':'no')+'">'+(op.idempotent?'repeatable':'not idempotent')+'</span>'+
      '</div>'+
      '<div style="font:600 15px var(--mono);margin:0 0 6px">'+esc(op.name)+'</div>'+
      '<p class="note" style="margin:0 0 12px">'+md(op.purpose)+'</p>'+
      (op.idempotencyKey ? '<p class="note"><b style="color:var(--ink)">Idempotency key</b> — '+md(op.idempotencyKey)+'</p>' : '')+
      params + returns + errors +
      (op.writesOnRead ? '<div class="warnbox"><b>This read writes.</b> '+md(op.writesOnRead)+'</div>' : '')+
      '</div>';
  }).join(''));
}

function renderConventions(carried, heading){
  if(!carried || !carried.length) return '';
  return section(heading || 'Planning conventions applied', carried.map(v =>
    '<div class="conv"><span class="cname">'+esc(v.name)+'</span><span class="carea">'+esc(v.area)+'</span>'+
    '<p class="ctext">'+md(v.rule)+'</p>'+
    (v.note ? '<p class="cnote"><b>Here</b> — '+md(v.note)+'</p>' : '')+
    '</div>').join(''));
}

function renderRules(c){
  return section('Planning rules — a plan that breaks one of these is invalid',
    c.planningRules.map(r =>
      '<div class="rule"><span class="rid">'+esc(r.id)+'</span> '+md(r.rule)+
      (r.derivedFrom && r.derivedFrom.length ? '<div class="chips">'+r.derivedFrom.map(d=>'<span class="chip">'+esc(d)+'</span>').join('')+'</div>' : '')+
      '</div>').join(''));
}

function renderReversal(c){
  return section('Reversal', '<div class="card tight">'+
    '<span class="pill '+(c.reversal.exists?'yes':'no')+'">'+(c.reversal.exists?'reversible':'no reversal')+'</span>'+
    (c.reversal.operation?' <code>'+esc(c.reversal.operation)+'</code>':'')+
    '<p style="margin-top:8px">'+md(c.reversal.statement)+'</p></div>');
}

function renderResolved(c){
  return section('Resolved plans', c.resolvedPlans.map((rp,i) =>
    '<div class="card">'+
    '<div style="font:600 16px/1.5 var(--serif);margin-bottom:2px">'+ph(rp.request)+'</div>'+
    (rp.context ? '<p class="note" style="margin:0 0 14px">'+md(rp.context)+'</p>' : '')+
    renderSteps(rp.steps)+
    '<p style="margin-top:10px"><b style="font:600 10.5px var(--sans);letter-spacing:.07em;text-transform:uppercase;color:var(--faint)">Outcome</b><br>'+md(rp.outcome)+'</p>'+
    '</div>').join(''));
}

function renderContract(uc, c){
  return '<h2 class="title">'+esc(uc.useCase.name)+'</h2>'+
    '<p class="crumb"><code>'+esc(uc.useCase.id)+'</code> · '+esc(uc.useCase.module)+
      (uc.useCase.featureRef ? ' · '+esc(uc.useCase.featureRef) : '')+
      ' · <code>'+esc(c.contractId)+'</code>'+
      (uc._priority ? ' · '+esc(uc._priority) : '')+
      '<br><span class="pill intent">'+esc(c.intent.name)+'</span></p>'+
    renderIntent(c)+renderPlan(c)+renderOperations(c)+renderRules(c)+
    renderReversal(c)+renderResolved(c)+
    '<footer>Contract: <code>'+esc(uc._relPath)+'</code>'+
      (uc._useCaseRelPath?' · Use case: <code>'+esc(uc._useCaseRelPath)+'</code>':'')+'</footer>';
}

function renderNotPlanned(uc){
  const np = uc.notPlanned || {};
  const arrivals = list(np.requestsThatArriveHere, r => '<li>'+ph(r)+'</li>');
  const routes = (np.routeInsteadTo||[]).length ? '<div class="card"><div class="scroll"><table>'+
    '<tr><th>Request</th><th>Goes to</th><th>Why</th></tr>'+
    np.routeInsteadTo.map(r => '<tr><td>'+ph(r.request)+'</td><td class="k">'+esc(r.goesTo)+
      '</td><td class="n">'+esc(r.note||'')+'</td></tr>').join('')+'</table></div></div>' : '';
  return '<h2 class="title">'+esc(uc.useCase.name)+'</h2>'+
    '<p class="crumb"><code>'+esc(uc.useCase.id)+'</code> · '+esc(uc.useCase.module)+
      (uc.useCase.featureRef?' · '+esc(uc.useCase.featureRef):'')+
      '<br><span class="pill no">not planned</span></p>'+
    '<div class="npbox"><p class="why">'+md(np.reason)+'</p></div>'+
    (arrivals ? section('Requests that arrive here anyway', '<div class="card">'+arrivals+'</div>') : '')+
    (routes ? section('Route instead to', routes) : '')+
    '<footer>Contract: <code>'+esc(uc._relPath)+'</code>'+
      (uc._useCaseRelPath?' · Use case: <code>'+esc(uc._useCaseRelPath)+'</code>':'')+'</footer>';
}

/* ---------- shell ---------- */

/* Search must reach the Roman Urdu text and its gloss, not "[object Object]". */
const words = p => (typeof p === 'string') ? p : [p.text, p.gloss].filter(Boolean).join(' ');

const panes = [];
const navHtml = DATA.modules.map(m => {
  const ucs = m.useCases.map(uc => {
    const links = uc.planned === false
      ? [{ id: uc.useCase.id+'|np', label: 'Not planned', cls: 'np',
           search: [(uc.notPlanned?.reason||''), ...(uc.notPlanned?.requestsThatArriveHere||[]).map(words)].join(' ') }]
      : uc.contracts.map(c => ({ id: c.contractId, label: c.intent.name, cls: '',
          search: [c.intent.name, c.intent.summary, ...c.intent.routesHere.map(words)].join(' ') }));
    if (uc.planned === false) panes.push({ id: uc.useCase.id+'|np', html: renderNotPlanned(uc),
      search: [uc.useCase.id, uc.useCase.name, uc.notPlanned?.reason].join(' ') });
    else uc.contracts.forEach(c => panes.push({ id: c.contractId, html: renderContract(uc, c),
      search: [uc.useCase.id, uc.useCase.name, c.contractId, c.intent.name, c.intent.summary,
               ...c.intent.routesHere.map(words), ...c.operations.map(o=>o.name)].join(' ') }));
    return '<div class="uc"><span class="ucname"><b>'+esc(uc.useCase.id)+'</b> '+esc(uc.useCase.name)+'</span>'+
      links.map(l => '<a href="#'+encodeURIComponent(l.id)+'" data-id="'+esc(l.id)+'" class="'+l.cls+
        '" data-search="'+esc((l.search+' '+uc.useCase.id+' '+uc.useCase.name).toLowerCase())+'"><code>'+esc(l.label)+'</code></a>').join('')+
      '</div>';
  }).join('');
  return '<div class="mod"><div class="modname">'+(m.number!=null?m.number+'. ':'')+esc(m.name)+'</div>'+ucs+'</div>';
}).join('');

document.getElementById('nav').innerHTML = navHtml;
document.getElementById('main').innerHTML = panes.map(p =>
  '<div class="pane hidden" data-id="'+esc(p.id)+'">'+p.html+'</div>').join('');

const links = [...document.querySelectorAll('#nav a')];
function show(id){
  let found = false;
  document.querySelectorAll('.pane').forEach(p => {
    const on = p.dataset.id === id;
    p.classList.toggle('hidden', !on);
    if(on) found = true;
  });
  links.forEach(a => a.classList.toggle('on', a.dataset.id === id));
  if(found) window.scrollTo(0,0);
  return found;
}
function fromHash(){
  const id = decodeURIComponent((location.hash||'').slice(1));
  if(!id || !show(id)) show(panes[0]?.id);
}
window.addEventListener('hashchange', fromHash);
links.forEach(a => a.addEventListener('click', ev => {
  ev.preventDefault();
  show(a.dataset.id);
  try { history.replaceState(null, '', '#' + encodeURIComponent(a.dataset.id)); } catch (_) {}
}));
fromHash();

const filter = document.getElementById('filter');
filter.addEventListener('input', () => {
  const q = filter.value.trim().toLowerCase();
  document.querySelectorAll('#nav .uc').forEach(uc => {
    let any = false;
    uc.querySelectorAll('a').forEach(a => {
      const hit = !q || a.dataset.search.includes(q);
      a.classList.toggle('hidden', !hit);
      if(hit) any = true;
    });
    uc.classList.toggle('hidden', !any);
  });
  document.querySelectorAll('#nav .mod').forEach(m => {
    m.classList.toggle('hidden', !m.querySelector('.uc:not(.hidden)'));
  });
});
`;

const html = `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Planning Contracts — School Management Software</title>
<style>${CSS}</style>
</head><body>
<div class="layout">
  <aside>
    <h1>Planning Contracts</h1>
    <p class="sub">How a planner turns a request into an ordered plan, and how the controller executes it.</p>
    <div class="counts">
      <div><b>${data.counts.intents}</b>intents</div>
      <div><b>${data.counts.contracts}</b>contracts</div>
      <div><b>${data.counts.useCases}</b>use cases</div>
      <div><b>${data.counts.notPlanned}</b>not planned</div>
    </div>
    <input id="filter" type="search" placeholder="Filter by intent, request or use case…" autocomplete="off">
    <nav id="nav"></nav>
  </aside>
  <main id="main"></main>
</div>
<script>window.__PLANNING_CONTRACTS__=${payload};</script>
<script>${JS}</script>
</body></html>
`;

const distDir = path.join(PC_DIR, 'dist');
fs.mkdirSync(distDir, { recursive: true });
fs.writeFileSync(path.join(distDir, 'index.html'), html);
const write = (name, obj) => {
  fs.writeFileSync(path.join(distDir, name), JSON.stringify(obj, null, 2) + '\n');
  return path.relative(ROOT, path.join(distDir, name));
};

const head = { generatedAt: data.generatedAt, counts: data.counts };
const written = [
  path.relative(ROOT, path.join(distDir, 'index.html')),
  write('routing-index.json', {
    ...head,
    purpose: 'Intent routing. What the decompose step needs to name an intent from a sentence, and nothing more.',
    intents: intentIndex,
  }),
  write('capability-index.json', {
    ...head,
    purpose: 'Planning. Retrieved per intent once decompose has named one; carries the operations, rules and worked plans the planning step needs, and the mechanical checks the validate step runs.',
    capabilities: [...capabilities.values()].sort((a, b) => a.capability.localeCompare(b.capability)),
    intents: capabilityIndex,
  }),
];

console.log(`Rendered ${data.counts.contracts} contract(s), ${capabilities.size} capabilities, across ${data.counts.useCases} use case(s).`);
written.forEach((w) => console.log(`  ${w}`));
