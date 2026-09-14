# Planning Contracts

The **Planning Contract** field of `Use_Case_Format_v4.docx`, split out into one machine-readable
file per use case — the part of the specification a planner and a controller read directly.

The document says what it is for:

> How a planner turns a request into an ordered plan, and how the controller executes it. A plan that
> reaches the controller is already approved, so nothing here asks, confirms or composes a reply.

Everything in these files serves that split. The **planner** builds a plan and is bound by the
planning rules. The **controller** substitutes references and calls, evaluates no conditions, and takes
no decisions of its own.

---

## What a contract holds

Exactly the sections the Use Case Format defines for the Planning Contract field, and nothing else:

**Intent** · **Plan** · **Operations**, each with its **Parameters** and its **Returns and errors** ·
**Planning rules** · **Reversal** · **Resolved plans**

Where no plan should ever be produced, the file says `planned: false` and gives the reason in one line.
Anything that is not one of those sections does not belong in a contract — questions raised while
writing them live in [OPEN-QUESTIONS.md](OPEN-QUESTIONS.md) instead.

---

## Layout

```
planning-contracts/
├── README.md
├── planning-contract.schema.json     the contract format, as JSON Schema
├── OPEN-QUESTIONS.md                 questions raised while writing them — not part of a contract
├── TEMPLATE.planning.json            copy this when a new use case is written
├── package.json                      npm run validate | render | build
├── tools/
│   ├── validate.mjs                  schema + cross-reference checks
│   ├── render.mjs                    builds the HTML page and the intent index
│   └── lib/
│       ├── discover.mjs
│       └── schema-check.mjs
└── dist/                             generated — do not edit
    ├── index.html                    the readable page
    ├── routing-index.json            for the decompose step
    └── capability-index.json         for capability search, planning and validate

modules/
└── 1_System-Wide_Interface&Navigation/
    ├── UseCases/
    │   └── UC-01-01.json …           the use cases (unchanged)
    └── PlanningContracts/
        └── UC-01-01.planning.json …  one file per use case
```

Contracts live beside the use cases they belong to, one file per use case, named
`<UC-id>.planning.json`. Adding a module means adding a `PlanningContracts/` folder next to its
`UseCases/` folder; the tools find it on their own.

---

## Reading them

```bash
node planning-contracts/tools/render.mjs
open planning-contracts/dist/index.html
```

One self-contained page, no server and no dependencies. Filter by intent, by use case, or by the
words of a request. Parameter sources are colour-coded, because source is the column that matters:

| badge | meaning |
| --- | --- |
| `request` | the instruction supplied the value |
| `resolved` | it is an entity id the parameter resolver obtains through the resolve door, from a phrase in the request |
| `session` | controller context supplies it, and it may **never** be read from the request — even where the request names a branch or a past year |
| `step` | an earlier response supplies it, and the plan says which field |
| `literal` | fixed in the plan |

### Requests arrive in more than one language

The office speaks English, Roman Urdu, and the two mixed inside one sentence, so the contracts carry
requests the same way. A plain string is English; anything else is written out with its language and
an English gloss, so a reviewer who does not read Urdu can still check the routing:

```json
{ "text": "jinhon ne fees nahi di, unki list do",
  "lang": "ur-Latn",
  "gloss": "give me the list of those who haven't paid the fees" }
```

`lang` is `en`, `ur-Latn` (Urdu in Latin script, English nouns inside an Urdu sentence included), `ur`
(Urdu script), or `mixed`. The page shows the gloss under each one, and the filter box searches both.

The plan itself never changes with the language — only recognising the intent does. What changes is
narrower than it first looks: across all five contracts there are exactly four values taken from the
request, and two contracts take none at all. The `request-language` convention governs those four.

Two generated JSON files feed the orchestrator, split to match its two model calls — see the next
section.

---

## Checking them

```bash
node planning-contracts/tools/validate.mjs
```

The schema check catches a malformed file. The cross-reference checks catch what actually goes
wrong over months — a contract and its use case drifting apart:

- every plan step calls an operation this contract defines, and steps run `1..N` with no gaps;
- every `$stepN.field` points at an earlier step, in this plan, at a field that operation returns;
- every input is a declared parameter, and every required parameter is supplied;
- every parameter's `sourceRef` matches its declared `source`;
- every `mapsTo` names an exception that still exists in the use case;
- every `derivedFrom` names a business rule, acceptance criterion, exception, alternate flow, open
  question or System Convention that still exists in the use case;
- every enum parameter offers only values a data field of the use case actually defines;
- no prose names an operation, a step or an error code the contract no longer has;
- every reversal `operation` names an operation or intent that exists, and `statement` is never a bare
  capability id — both are plain strings, so the two swapping places is otherwise invisible;
- every route whose `goesTo` begins with a capability id names one that exists, or a `family.*` that at
  least one capability belongs to. Routes written as prose ("Not offered.") are not checked;
- a non-idempotent write has an idempotency key;
- intent names are unique across every module;
- `planned: false` has a reason and no contracts; `planned: true` has at least one;
- every non-English phrase carries a gloss, and its `lang` matches the script it is actually written in;
- `routesHere` and `resolvedPlans` include at least one Roman Urdu example — a contract whose examples
  are all English has only been half thought through, so that one is a warning.

An error that maps to no `E-id` is a **warning**, not a failure. It is usually a real finding: a
failure the assistant path can reach that the screen never could, and therefore an exception the use
case has not been written to cover yet. Each one is recorded in that contract's `openQuestions`.

Run both together:

```bash
cd planning-contracts && npm run build
```

### One deliberate departure

`source: resolved` is not one of the four sources the format lists. It exists because the architecture
resolves names to ids through a single gateway door driven by the parameter resolver, rather than
through lookup steps inside the plan — so a parameter that is an entity id has to say what it asks
that door for. Everything else follows the format exactly.

---

## How many contracts a use case gets

A use case carries however many intents it genuinely serves — sometimes none.

- **None.** `planned: false`, with the reason in one line and a `routeInsteadTo` table so a router
  still knows what to do with the requests that arrive anyway. `UC-01-01` (Login) is the example: a
  plan runs inside a session, and that use case is what creates one.
- **One.** The common case. `UC-01-02` (Sign out) and `UC-01-10` (Global search).
- **Several.** Where one screen serves distinct requests. `UC-01-07` carries three —
  `dashboard.main.view`, `dashboard.module.view` and `dashboard.figure.drillthrough` — because
  "what did we collect today", "open the fee dashboard" and "who are the 43 defaulters" are three
  different plans against the same use case.

Do not split a contract merely because a plan has a branch in it. The controller has no branches; a
different shape of plan is a different intent, and the same shape with a different value is not.

---

## Writing a new one

1. Copy `TEMPLATE.planning.json` to `modules/<module>/PlanningContracts/<UC-id>.planning.json` and
   delete every `_guidance` key.
2. Work through the use case and ask what a person would say out loud to get this done. Each distinct
   answer is a candidate intent; each candidate needs a plan whose shape does not change with the
   request.
3. Write the operations before the plan. The plan is then just references between them.
4. Write the planning rules by naming mistakes, not principles. A rule that says "be careful" binds
   nobody.
5. Write the resolved plans last, from real requests. A missing parameter becomes obvious the moment
   one is written out — which is exactly why the format asks for them.
6. Run `npm run build` and read the page.

### Conventions these contracts hold to

- `branch_id` and `session_id` come from `$session` in every step, even where the request names a
  campus or a past year.
- Validation, permission, duplicate and capacity checks belong to the API and arrive as errors. The
  plan does not test for them beforehand, because the controller has no branch to take if it did.
- A plan never re-emits a step with the failing field removed. An error is the API stating something,
  not an obstacle to route around.
- Where a read nevertheless writes — an audit entry, typically — `writesOnRead` says so, so a stopped
  run is readable afterwards.
- Reversal is stated even when there is none, so the controller does not invent a compensating call.
