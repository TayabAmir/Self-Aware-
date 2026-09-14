# Planning Contracts — open questions

Questions raised while writing the planning contracts. They are **not** part of a contract —
the Use Case Format has no such field inside Planning Contract — so they live here instead.
Each belongs in the Open Questions / Assumptions field of the use case named beside it.

Modules 1 and 2 were harvested from the contracts before those fields were removed. Module 3
onwards is written here directly.

41 in total: 20 marked as blocking the build, 21 not.

---

## Blocking the build


### UC-01-07 — Show the dashboard tiles and module summaries the role is permitted to see

**dashboard.module.view** — Which modules qualify for a dashboard under BR-11 — the use case's own open question. Until it is answered, has_dashboard is decided server-side and the plan cannot be tested against a known set.

- *Assuming:* Fee, Finance, Student, Staff, Attendance and Examination, per the use case's assumption.
- *Confirm with:* School Admin

**dashboard.module.view** — Does the module alias table behind the resolve door carry the Roman Urdu words the office actually uses — fees, hazri for attendance, mulazmeen for staff — or only the English keys? PR-7 forbids the planner from translating, so anything the table does not hold cannot be reached at all.

- *Assuming:* The table carries both, and is master data maintained alongside the module list. Untested; the Roman Urdu terms have not been collected.
- *Confirm with:* School Admin

**dashboard.figure.drillthrough** — Does the figure alias table carry Roman Urdu phrasings — jinhon ne fees nahi di, baqaya, aaj ki wasooli — or only the English labels? PR-8 forbids the planner from translating, so a figure the table cannot match is unreachable in the language most requests will arrive in.

- *Assuming:* It carries both, maintained as master data alongside the tile labels. The Roman Urdu phrasings have not been collected, and BR-2 means a miss is indistinguishable from a figure the role may not see — so this fails silently.
- *Confirm with:* School Admin


### UC-01-10 — Find a student or staff member from the header, from anywhere in the system

**search.global** — Redaction runs on the sentence before the decompose step, and the one value this plan must carry through is a person's name. If redaction strips names, search.global can never be planned at all; if it leaves them, names reach the model. Does redaction replace a name with a placeholder the orchestrator substitutes back after planning, or is a name simply not redacted while identity numbers and mobiles are?

- *Assuming:* Placeholder substitution: the name is replaced before the model sees it and restored into q by the orchestrator, so PR-10 and PR-11 hold — the string reaching the API is the one the actor typed, untouched by a model. This is an assumption about the orchestrator, not something this contract can enforce.
- *Confirm with:* Whoever owns the redaction step

**search.global** — The use case's OQ-2 — whether a guardian's contact number should be matchable — blocks build, and PR-5 depends on the answer. If it becomes matchable, PR-5 is withdrawn and q gains a fourth matchable form.

- *Assuming:* Not matchable. Only names and system-issued identifiers (BR-3).
- *Confirm with:* School Admin


### UC-02-02 — Review a submitted inquiry and forward it to the Principal

**inquiry.review** — BR-5 lets the reviewer correct obvious errors during review, keeping the previous value. No capability is specified for that, so it cannot be planned — a request to fix a phone number on an inquiry has nowhere to go. Should inquiry.correct exist?

- *Assuming:* It should, with the corrected fields and their previous values, but it is not written. Until it is, corrections are screen-only.
- *Confirm with:* School Admin


### UC-02-03 — Approve a reviewed inquiry and send the single-use admission-form invite

**inquiry.approve** — BR-5 says an expired invite can be reissued by the School Admin, and BR-8 surfaces an approved inquiry whose invite is unused. Neither reissue nor revoke is written as a capability, so a request to withdraw a live invite has nowhere to go.

- *Assuming:* Revoking and reissuing are screen actions until specified. admission.invite.resend covers only re-sending an invite that is still valid.
- *Confirm with:* School Admin

**admission.invite.resend** — BR-5 says an expired invite is reissued by the School Admin, and this contract has no capability for it — so an expired invite is a dead end through a plan. Should admission.invite.reissue exist?

- *Assuming:* It should. Until it does, an expired invite is reported and handled on the screen.
- *Confirm with:* School Admin


### UC-02-05 — Schedule the admission test and assign the teacher who will conduct it

**admission.test.schedule** — BR-9 lets the admin send the schedule to all approved applicants at once. That is not a bulk schedule — each applicant still needs a date, a time and a teacher — so it reads as a bulk send of already-saved schedules. Should admission.test.notify exist for it?

- *Assuming:* It should, as a separate send over applicants already scheduled. Not written, so a request to tell everyone their date has nowhere to go.
- *Confirm with:* School Admin

**admission.test.reschedule** — The Test schedule lifecycle includes Cancelled, but no capability cancels a test — only reschedule. A request to cancel has nowhere to go.

- *Assuming:* Cancelling is a screen action until specified. Not written.
- *Confirm with:* School Admin


### UC-02-06 — Record the admission test score against the applicant

**admission.test.correct** — decision_already_taken is modelled on the response because a correction after an admission decision is the consequential case, but UC-02-06 does not say the API reports it. Should it?

- *Assuming:* Yes — BR-7 gives the reason the previous value is kept, and a correction that silently invalidates a decision is exactly what that guards against. Not stated in the use case.
- *Confirm with:* School Admin


### UC-02-07 — Flag eligibility, approve the admission, and issue the student and guardian credentials

**applicant.eligibility.flag** — BR-2 separates flagging from approving, and the allow-list enforces it. But a School Admin who is also a Director in a small school holds both. Does the separation survive that?

- *Assuming:* It does not, and the use case does not say what happens. The allow-list would carry both capabilities and one person would do both acts.
- *Confirm with:* School Admin

**applicant.admit** — BR-10 says a bulk approval covers only applicants already flagged eligible, and resolution refuses a set containing any that are not. Should the mixed case be a refusal of the whole set, or should the eligible ones proceed with the rest listed as failed?

- *Assuming:* The whole set is refused at resolution, because the Principal asked to admit a group and admitting most of it silently is not what they asked. Not stated in the use case.
- *Confirm with:* Principal

**applicant.admit** — E7 says nothing is created when the write fails part way, and the atomicity depends on it entirely. Does that hold across the account creation in step 6 of the flow, which touches the authentication system?

- *Assuming:* It does, and the whole reversal statement rests on it. Worth confirming with whoever owns account provisioning, because a student record with no account is the one partial state that would need cleaning up.
- *Confirm with:* Super Admin


### UC-02-09 — Re-admit a former student onto their existing record

**readmission.match.confirm** — No capability unconfirms or re-links a re-admission match, and a confirmation against the wrong child would carry that child's history into the new enrolment. Should readmission.match.clear exist?

- *Assuming:* It should, before reactivation makes it consequential. Not written, and the reversal statement says so plainly.
- *Confirm with:* School Admin

**readmission.match.confirm** — E3 refuses a confirmation where the name or date of birth differ, but the data field 'Match confirmed' suggests the admin may confirm anyway after checking. Which is it — a refusal, or a warning the admin can override with confirmation_note?

- *Assuming:* Modelled as a refusal, with confirmation_note present for the case where it becomes an override. The use case is not clear.
- *Confirm with:* School Admin

**readmission.reactivate** — BR-5 says the student keeps their original roll number. Roll numbers are gapless per academic session in UC-03-01, so a returning student's old number may already be held by someone in the new session. Which rule wins?

- *Assuming:* The original is kept, as BR-5 says, and the collision is not addressed anywhere. This is the sharpest unresolved point in the use case.
- *Confirm with:* School Admin

**readmission.reactivate** — The use case's own open questions ask whether a re-admitted student must sit the admission test again and whether the carried balance should block the re-admission. Both change this plan: the first adds a precondition, the second turns outstanding_balance from a reported fact into a refusal.

- *Assuming:* Neither blocks today — the test happens as normal (BR-4) and the balance is shown, not enforced (BR-8).
- *Confirm with:* Principal


### UC-02-11 — Close an enquiry as not interested, and re-open one closed by mistake

**inquiry.reopen** — BR-7 restores the previous status. Where that status was Stale, does the enquiry come back stale — and so stay out of the daily list it was just re-opened to rejoin?

- *Assuming:* It comes back at the previous status but the new follow-up date puts it in the list regardless, since staleness is about attempts without reply rather than about the date. Untested.
- *Confirm with:* School Admin


### UC-02-12 — Message an enquiring family and log it against the enquiry

**inquiry.message** — BR-4 saves the first message to an enquiry as a template automatically. A planned free-composed send would therefore create a template from words the actor spoke to an assistant. Should a planned send be excluded from that, or is a template built from real sends the point?

- *Assuming:* Excluded for now — a template should be something someone chose to keep. Not settled, and the use case does not distinguish the two paths.
- *Confirm with:* School Admin

## Not blocking


### UC-01-02 — End the session and return to the login screen

**session.end** — UC-01-02 defines no exception for a sign-out submitted against a session other than the actor's own, because the header control offers no way to attempt it. The assistant path can. Should E4 be added to the use case for it?

- *Assuming:* The API returns 403 under the role-based-access convention and the message is "You do not have permission to view this record." The contract maps FORBIDDEN to null until an E-id exists.
- *Confirm with:* School Admin

**session.end** — Should a planned sign-out be distinguishable in the audit log from one made at the header control — assistant-initiated versus screen-initiated?

- *Assuming:* No. Both are an explicit end by the actor, and reason carries user in each case.
- *Confirm with:* Super Admin


### UC-01-07 — Show the dashboard tiles and module summaries the role is permitted to see

**dashboard.main.view** — BR-8 and A2 allow a closed academic session to be viewed on screen, but PR-1 keeps session_id in $session. Should a second intent, dashboard.main.viewHistorical, take a session_id from the request, or does viewing a past year stay a screen action?

- *Assuming:* It stays a screen action. Only the session held in controller context is planned against, so a planner cannot reach a year the actor has not deliberately selected.
- *Confirm with:* School Admin

**dashboard.main.view** — Is the main dashboard one capability that filters its own response, or is each tile a capability so the allow-list does the filtering? One capability keeps the tile decision server-side where BR-1 puts it; per-tile capabilities would make BR-2 fall straight out of the allow-list the retriever already filters on, at the cost of nine index entries for one screen.

- *Assuming:* One capability, filtering its own response. Chosen because BR-1 says the tile set is decided server-side, and per-tile capabilities would move that decision into the retrieval layer.
- *Confirm with:* Whoever owns the capability catalogue

**dashboard.figure.drillthrough** — Where total_count does not reconcile with figure_value — because the figure was calculated minutes earlier — should the response be re-read, or both numbers reported with their timestamps?

- *Assuming:* Report both with timestamps. They arrive in one response precisely so the drift is visible; re-reading hides what BR-5 exists to show.
- *Confirm with:* School Admin


### UC-01-10 — Find a student or staff member from the header, from anywhere in the system

**search.global** — Should there be a second contract, search.global.open, that resolves a single unambiguous match straight to its profile? PR-1 forbids it today on the strength of A2.

- *Assuming:* No. A2 exists so the actor confirms the person, and an assistant has less context than the actor standing at the counter, not more.
- *Confirm with:* School Admin

**search.global** — Should an assistant-initiated search be distinguishable in the audit log from one typed into the header box, given BR-9 exists so that patterns of looking up personal data can be reviewed?

- *Assuming:* Yes — the audit entry should carry the channel, since a planner can search far more often than a person can type.
- *Confirm with:* School Admin

**search.global** — BR-3 matches names as stored, and names are stored in Latin script. A parent quoting a name in Urdu script therefore cannot be searched for without someone transliterating, which PR-11 forbids. Should student and staff records carry an Urdu-script name field that q also matches against?

- *Assuming:* No such field at launch, so an Urdu-script name is answered by asking for the roll number instead. This is a real gap for a school whose parents write in Urdu, not a technicality.
- *Confirm with:* School Admin


### UC-02-02 — Review a submitted inquiry and forward it to the Principal

**inquiry.review** — The duplicate check runs inside review. Should its result also be available as a read before the reviewer commits to an outcome, so the assistant can report a match without recording a review?

- *Assuming:* No. BR-1 says the review is recorded even when nothing changed, and a check that leaves no trace is the thing that rule guards against.
- *Confirm with:* School Admin


### UC-02-03 — Approve a reviewed inquiry and send the single-use admission-form invite

**inquiry.approve** — For a re-admission, approval issues no invite (UC-02-04 BR-9) and the applicant goes straight to test scheduling. Should that be a separate intent rather than the same capability returning invite_issued false?

- *Assuming:* The same capability. The Principal's act is identical and the difference is a property of the inquiry, not of the decision.
- *Confirm with:* School Admin

**inquiry.reject** — UC-02-11 BR-9 carries the rejection reason onto the closure, and that reason was written for the family. Should the loss report show the family-facing reason, or should a rejection map onto the closure enum value 'Rejected at approval' with the text held separately?

- *Assuming:* The enum value carries the category and the text is held alongside, which is how the response models it. The use cases do not say explicitly.
- *Confirm with:* School Admin


### UC-02-05 — Schedule the admission test and assign the teacher who will conduct it

**admission.test.schedule** — Relative dates are resolved by the planner against today. Where the actor says "somwar" on a Monday, is that today or next Monday?

- *Assuming:* Next Monday, as in the first worked plan. Ambiguous enough that a planner should confirm the resolved date back before the family is told it.
- *Confirm with:* School Admin


### UC-02-06 — Record the admission test score against the applicant

**admission.test.mark** — BR-9 escalates a test taken but unmarked past the configured target. Nothing here plans for that — it is a scheduled job. Should the escalation be visible as a read so an assistant can answer "which papers are still unmarked"?

- *Assuming:* It should, on the applicant list rather than here. Not written.
- *Confirm with:* School Admin

**admission.test.mark** — The score is read from a sentence — "82 out of 100" carries the maximum too. Where the stated maximum differs from the configured one, should the plan be blocked before the call rather than after?

- *Assuming:* No. PR-3 keeps the planner from reasoning about the number at all, and the API's refusal is what surfaces the disagreement.
- *Confirm with:* School Admin


### UC-02-07 — Flag eligibility, approve the admission, and issue the student and guardian credentials

**applicant.reject** — A rejection closes the enquiry carrying the rejection reason, which was written for the family. UC-02-11's closure enum has a value 'Rejected at approval'. Does the free-text reason sit alongside that value, or replace it?

- *Assuming:* Alongside — the enum carries the category for the loss report and the text carries what the family was told.
- *Confirm with:* School Admin


### UC-02-10 — Record an enquiry and follow it up until it moves or closes

**inquiry.record** — BR-7 says a second enquiry for the same child and number opens the first, but UC-02-10 defines no exception for it, so OPEN_ENQUIRY_EXISTS maps to no E-id. On screen the existing enquiry simply opens; through a plan there is nothing to open, only something to report. Should E8 be added?

- *Assuming:* Returned as success with existing true, and reported as the existing reference. Mapped to null until an E-id exists.
- *Confirm with:* School Admin

**inquiry.record** — Where the request names no owner, the API assigns the acting user. Is that right when the assistant is used by a School Admin recording an enquiry that Staff will follow up?

- *Assuming:* Yes — the acting user owns it until someone reassigns it. Reassignment is not in this use case.
- *Confirm with:* School Admin

**inquiry.contact.log** — The outcome enum is inferred by the planner from an Urdu sentence, and PR-2 says to ask when it is unclear. Should the enum values themselves carry Roman Urdu aliases, so the resolver settles it rather than the model?

- *Assuming:* The model reads it, because an outcome is a judgement about what the family meant rather than a name to look up. Untested.
- *Confirm with:* School Admin


### UC-02-11 — Close an enquiry as not interested, and re-open one closed by mistake

**inquiry.close** — E8 says an enquiry closed by a rejection at approval cannot be re-opened here. Should inquiry.close return reopenable false in that case, as modelled, or should the closure record carry the rejection reference instead?

- *Assuming:* reopenable false on the response, so the reply can say plainly that re-opening is not available and why.
- *Confirm with:* School Admin

**inquiry.reopen** — Re-opening an enquiry that is already open has no E-id in UC-02-11, because the control is only shown on a closed one. Through a plan it can be attempted. Should E9 be added?

- *Assuming:* Returns 409 and is reported as already open, naming the status. Mapped to null until an E-id exists.
- *Confirm with:* School Admin


### UC-02-12 — Message an enquiring family and log it against the enquiry

**inquiry.message** — BR-10 attaches an inbound reply to the enquiry and moves the follow-up to today. Nothing here plans for a reply, since it arrives rather than being asked for. Should there be a read capability for what a family replied?

- *Assuming:* Yes, but it belongs with the enquiry read path rather than this send. Not written.
- *Confirm with:* School Admin



---

# Module 3 — Student Records & Information Management

## The format document's worked example no longer matches UC-03-01

`Use_Case_Format_v4.docx` carries a worked example headed:

> **Use Case ID** UC-03-01 (feature 3.1) · **Name** Register a student and hold one complete record
> This section is generated from UC-03-01.json, so the document and the file the builder reads cannot drift apart.

The actual `UC-03-01.json` is **View and maintain the student record**, and its BR-1 says:

> A student record is never created by typing. It comes into existence when an admission is approved,
> or through migration when a school first goes live.

So the two have drifted, and in a way that matters: the worked example teaches a planner to write a
three-step `student.register` plan with `guardian.lookup` and `class.resolve` steps, and **none of
those three capabilities exists**. A student is created by `applicant.admit` (UC-02-07) or by
`student.import.run` (UC-03-03), and resolution is a parameter phase rather than plan steps.

Anyone writing a contract from that example will reproduce a shape the system does not have. Worth
correcting at source, since it is the one example every author reads first.

**Confirm with:** whoever owns the format document.

## Nothing that needs a file can be planned

Two acts in this module take a file, and the request channel carries only a sentence, a token and a
session id:

- **UC-03-01** — uploading a student document. There is nothing to reference afterwards, so it cannot
  be planned at all. It stays a screen act.
- **UC-03-03** — uploading and validating the import file. Here the screen does the upload and the
  plan picks up from the validated batch, which is why `student.import.run`, `.authorise`, `.cancel`
  and `.status` exist and no upload capability does.

That boundary is consistent and probably correct, but it is not written down anywhere. Worth stating
in the architecture: **a capability that requires a file is reachable from the screen only.**

**Confirm with:** whoever owns the AI layer architecture.

## Capabilities the use cases imply but do not specify

Each of these is a request with nowhere to go. They are gaps in the use cases rather than in the
contracts.

| Request | Where it should live | What is missing |
| --- | --- | --- |
| "strike this student off" / "mark them as left" | UC-03-01 | Permissions grant School Admin `deactivate` and the lifecycle holds Left, Struck off and Transferred — but there is no flow step, no data field for which or why, and no exception. The use case's own OQ-4 asks who may do it and what happens where a fee transaction references the record. |
| "apply the change the parent submitted on the portal" | UC-03-01 A3 | A submitted change is presented for Staff to apply or refuse, but nothing specifies applying or refusing one. Today it is `student.update` typed in by hand, which loses the link to what the guardian actually submitted. |
| "fix the guardian's phone number on this inquiry" | UC-02-02 BR-5 | The reviewer may correct obvious errors during review, keeping the previous value. No capability. |
| "reissue the expired invite" | UC-02-03 BR-5 | An expired invite is reissued by the School Admin. No capability — `admission.invite.resend` only re-sends one still valid. |
| "cancel this admission test" | UC-02-05 | The Test schedule lifecycle holds Cancelled. Nothing cancels. |
| "send the test date to all approved applicants" | UC-02-05 BR-9 | A bulk send of already-saved schedules. No capability. |

**Confirm with:** School Admin.

## UC-03-03 — exceptions the screen never needed

Four failures a plan can reach that the screen cannot, because its controls are only shown on a batch
in the right state. Each currently maps to no `E-id`:

- running a batch that has not finished validating, or has already run;
- authorising a batch that is not awaiting authorisation;
- cancelling a batch that has already run — which is the consequential one, because it reads like an
  undo and is not;
- cancelling a batch already cancelled.

**Assuming:** each returns 409 and is reported as a statement about the batch's state.
**Confirm with:** School Admin.

## UC-03-01 — a correction that is not a correction

`student.update` refuses the **whole call** when an identity field is included (E1), not just that
field. So a request that changes an address and a date of birth together gets neither. The contract
handles this by sending only the address and reporting the rest, but it is worth checking the API
really does refuse wholesale rather than applying what it can.

**Assuming:** wholesale refusal, so a partial application is never silently reported as a success.
**Confirm with:** School Admin. **Blocks build.**


---

# Module 27 — Class & Session Structure

Module 27 closed two gaps listed above: **placing a student** and **moving one between sections** are
now `student.place` and `student.move` (UC-27-03). The imported students who arrive with no class are
placed through the same capability (UC-27-03 A6).

Its three use cases have complete exception coverage — every error in all ten contracts maps to a real
`E-id`, the first module where that is true.

## Nothing opens an academic session

Every use case written so far is scoped to an open academic session, and eleven of them refuse outright
without one (`UC-01-07 E3`, `UC-27-01 E6`, and others). **No use case creates, opens or closes one.**

The references also disagree about who should:

- five use cases say an open session is established by **UC-03-07**, which does not exist;
- `UC-03-03` says **UC-27-01**, which is class creation and only *reads* the session;
- `UC-27-01` itself names nobody.

So "open the 2026-27 session" has nowhere to go, and neither does closing one — which matters because
`UC-27-03 OQ-5` asks what happens to placements when a session closes, and nothing answers it.

**Confirm with:** School Admin. **Blocks build** — it is a precondition of almost everything.

## UC-03-07 is a stale identifier

Eight use cases cite **UC-03-07** for class, section and academic-session structure. That structure is
now module 27, and the ID appears nowhere as a file. It looks like a renumber that did not propagate.
The contracts cite the real UC-27-xx capabilities, so nothing is broken in them — but a reader
following the use cases will chase a dead reference eight times.

**Confirm with:** whoever renumbered the modules.

## Placement does not assign a roll number

Three rules do not add up:

- `UC-02-07 BR-6` — the student ID and roll number are generated **on approval**;
- `UC-03-03 BR-8` — a row with **no class** produces a student at Registered with **no roll number**;
- `UC-27-03` — placement never mentions a roll number at all.

So a student registered without a class has no roll number, and being placed does not give them one.
Either placement should assign it, or BR-6 is wrong about when it happens.

This compounds the re-admission collision already logged: `UC-02-09 BR-5` says a returning student
keeps their original roll number, while `UC-02-07 BR-6` says roll numbers are gapless per session and
never reused.

**Confirm with:** School Admin. **Blocks build.**

## Nothing reactivates a class or a section

Both lifecycles are Active ↔ Inactive, and `class.deactivate` and `section.deactivate` are written —
but no capability reactivates either. A class deactivated in error cannot be brought back, and the
reversal statements on both contracts say so plainly.

**Assuming:** deactivation is rare and deliberate enough that this is acceptable. Not stated.
**Confirm with:** School Admin.

## The WhatsApp groups drift out of date, by design

The system stores an invite link and never administers the group (`UC-27-02 BR-4`, `UC-27-03 BR-10`).
Three consequences, none of which anything currently handles:

1. **A moved student's guardian is not removed from the old section's group.** `UC-27-03 AC-10` states
   this explicitly and the contract reports it, but somebody has to act on it by hand every time.
   `UC-27-03 OQ-1` asks who.
2. **Replacing a link strands the guardians already placed** (`UC-27-02 BR-9`). They stay in the old
   group and nothing re-invites them in bulk. `UC-27-02 OQ-1` asks whether it should.
3. **A section with no stored link takes students anyway** (`UC-27-02 BR-10`). That is deliberate and
   the gap is recorded — but over a term, sections quietly accumulate parents who are in no group.

After a session of moves and link changes, the groups and the registers will not match. Worth deciding
who owns that reconciliation before it is discovered in March.

**Confirm with:** School Admin. **Blocks build** for (1), which happens on every move.

## Bulk moves are not offered, deliberately

`UC-27-03 BR-7` requires a reason per move, so `student.move` takes one student. A request like
"4-C is over-crowded, move four children to 4-D" becomes four plans with four reasons — which is
correct, but is the kind of thing someone will ask for as a batch. Worth confirming that is intended
rather than an oversight, since bulk *placement* is explicitly supported (`BR-9`).

**Assuming:** intended. One reason cannot describe four different children's moves.
**Confirm with:** School Admin.


---

# Module 4 — Fee & Finance

## UC-04-04 — family-group challans removed, and why

The use case originally allowed a challan covering a family group, with siblings listed on one slip
(scope `Family group`, BR-4, A1, E5, AC-6). It contradicted the matching design:

| | said |
| --- | --- |
| UC-04-04 **BR-3** | the reference ties the payment back to **the exact invoice** |
| UC-04-04 **AC-6** | one slip lists **three children** with their amounts and a total |
| UC-04-05 **BR-3** | a bank payment is matched by its challan reference — "a guess would credit the wrong family" |
| UC-04-05 **BR-6** | a payment may not exceed **the invoice's** outstanding balance |

A three-child slip returns one stamped copy, one reference and one total, and recording it means
splitting that total across three invoices. Nothing specified how, `fee.payment.record` takes one
invoice and one amount, and UC-04-05 BR-3 exists precisely to forbid that kind of allocation guess.

**Changed:** the scope is now `Student | Class | Section | Batch`. BR-4 now says one challan covers one
invoice and states the reason; A1, E5, AC-6, the screens and the reports follow. `fee.challan.generate`
was rewritten to match.

**Still open:** if siblings really should settle in one payment, that has to happen at **issue** time —
one consolidated invoice per household — not at challan time. Recorded as UC-04-04's open question.
**Confirm with:** Accounts.

## UC-04-04 — a class scope has no billing period

`Batch` was added because a class scope is ambiguous. UC-04-04 carries no billing period field, so
"print Grade 4's challans" in November covers every unpaid invoice — September, October and November —
and hands some families three slips. A batch is one issue run and therefore one period.

The contract reports `periods_covered` and PR-4 tells the planner to prefer a batch scope, but the
underlying gap is in the use case: a class scope should either take a period, or be defined as "the
current period only".

**Confirm with:** Accounts. **Blocks build.**

## UC-04-02 — no exceptions for reversing a batch

`fee.batch.reverse` implements A7 ("a whole run was raised in error"), but UC-04-02 defines no `E-id`
for a batch that contains paid invoices, or for one already reversed. Both are states a plan reaches.
A7 describes the behaviour; the exception list does not carry it.

**Assuming:** paid invoices are refused and listed as a success-path outcome, and a second reversal
returns 409. **Confirm with:** Accounts.

## Four instruments that are easy to confuse

Not a defect — worth recording because the contracts spend a lot of their routing keeping them apart,
and using the wrong one misstates the books:

| situation | instrument | approver |
| --- | --- | --- |
| unpaid, charge was wrong | **cancel** (UC-04-08) | School Admin |
| paid, charge was wrong | **credit** (UC-04-10) — held against the household | School Admin |
| correct charge, uncollectable | **write-off** (UC-04-09) | **Principal only** |
| credit held, family leaving | **refund** (UC-04-11) | Principal |

The rules that keep them apart are explicit: UC-04-09 E1 refuses a write-off that looks like a billing
error; UC-04-10 E1 refuses a credit where no money was received; UC-04-08 E1 refuses a cancellation
where money was received; UC-04-10 E9 refuses a cash refund raised as a credit.


## Module 4, batches 3 and 4 — further gaps

### Capabilities the use cases imply but do not specify

| Request | Where it should live | What is missing |
| --- | --- | --- |
| "extend this concession another year" | UC-04-13 A6 | The flow has `renewConcession` as step 7, but no capability. A concession reaching its end date is surfaced for review and then has nowhere to go except a fresh record. |
| "cancel this installment plan" | UC-04-14 | The plan lifecycle holds `Cancelled`. Nothing cancels one — only reschedule. |
| "deposit the tax we collected" | UC-04-17 BR-10, flow step 8 | Preparing the statutory return, recording the deposit and clearing the holding account are described but not specified as acts. `E7` and `E8` exist for the deposit, so the use case expects them. |
| "set the voucher approval thresholds" | UC-04-19 BR-4, E7 | Both thresholds are set by the Principal, and `E7` refuses a School Admin doing it — but no capability sets them at all. |
| "open the journals" | UC-04-18 flow step 7 | `openJournals` is a flow step with no data fields or exceptions behind it. Left out of the contracts. |

**Confirm with:** Accounts, and the Principal for the thresholds.

### Exceptions the screen never needed

Failures a plan can reach that the screen cannot, each currently mapping to no `E-id`:

- **UC-04-02** — reversing a batch that contains paid invoices, or one already reversed.
- **UC-04-15** — returning a late fee policy with no reason (`E7` covers the same shape for a waiver).
- **UC-04-16** — unmatching a line that is not matched.
- **UC-04-17** — returning a tax configuration with no reason.

**Assuming:** each returns 409 or 400 and is reported as a statement about the record's state.

### Two structures nothing creates

`UC-04-18`, `UC-04-19` and `UC-04-20` all state this outright in their own business rules, but it is
worth collecting:

1. **A chart of accounts.** Three use cases refuse outright without one (`E1` in each), and BR-1 of
   UC-04-18 says plainly that no feature in the document creates it.
2. **A financial year**, which is explicitly *not* the academic session (UC-04-18 BR-10, UC-04-20 BR-12).
   The ledger and the budget both run against it. Nothing defines it.

Departments are a third, for budgets prepared by department (UC-04-20 E3), though that one has a
documented fallback: prepare by account instead.

This is the same shape as the missing academic-session use case in module 27 — a structure everything
depends on and nothing creates. **Blocks build.**

### A distinction the contracts lean on heavily

`money` amounts fall into exactly three classes across this module, and the planning rules differ
sharply between them:

| class | who supplies it | examples |
| --- | --- | --- |
| **calculated** — never in a plan | the API | every invoice line, late fees, tax deducted, actuals, variance |
| **observed** — the actor states what happened | the request | payment received, deposit amount, statement closing balance |
| **decided** — the actor chooses a figure | the request | structure prices, write-off amount, credit amount, installments, budget lines, voucher amounts |

The strongest rule in the module — UC-04-02 BR-1, *"Nothing on an invoice is typed by the person
raising it"* — applies only to the first class. Confusing the three is how a planner ends up supplying
a figure that becomes real money.

---

## Module 5 — Attendance and student leaves

Seven use cases, 25 contracts. The module is unusually clean to plan: attendance is a small number of
verbs applied to a large number of people, and almost every capability is one step.

### Numbering gaps

The folder holds `UC-05-01`, `-02`, `-03`, `-04`, `-06`, `-09`, `-11`. **`5.5`, `5.7`, `5.8` and `5.10`
are not written.** The contracts assume nothing about them, but three of the gaps are visible from
inside the ones that exist:

- Nothing marks attendance for an **exam or an event** held outside the timetable, which UC-05-02
  handles per lecture and UC-05-01 per day.
- Nothing produces an **attendance report or a monthly summary** — several use cases mention one in
  their reports section, so the reading side of this module lives somewhere unwritten.
- Nothing handles **staff leave**. UC-05-11 covers students only, and UC-05-03's correction workflow
  is not a leave workflow.

**Assuming** these are still to be written, not deliberately out of scope.

### A card lifecycle described but not owned

`UC-05-06` BR-13 says a lost or replaced card is deactivated so the old identifier stops working, and
its screen list carries `issueStaffCard(staffId)`. But the entity list grants **`Staff card: read` only**,
with the note "Issued elsewhere, not here (BR-2)."

So the use case describes issuing and deactivating a card, and then forbids itself from doing either.
No planning contract was written for issue or deactivate, because a contract needs a capability and
the entity access says there is none here.

**Assuming** card issue and deactivation belong to a staff-records use case in another module. If they
do not, a lost card cannot be stopped anywhere in the system — which BR-13 itself says is the failure
to avoid. **Blocks build** if nothing else owns it.

### A rejection with no state and no exception

`UC-05-03` A4 describes the Principal rejecting a correction request. But the state list for a
correction is `Raised · Approved · Applied`, with no `Rejected`, and no exception covers it.

The contract defines `staff.attendance.correction.reject` anyway — the alternate flow is explicit that
it happens, and leaving it out would mean a planner facing "reject this correction" has nothing to
plan and would reach for `approve`. **Assuming** the state list is the omission rather than the flow.

The same shape does *not* occur in UC-05-11, whose lifecycle carries `Rejected` properly.

### Approve and reject are always two capabilities

Across this module — `staff.attendance.correction.*`, `leave.request.*` — approval and rejection are
separate capabilities rather than one operation carrying an outcome parameter. There is no
`decision: Approved | Rejected` enum in any of these use cases, and inventing one would put a value
set in the metadata that no use case defines. The split also makes the allow-list finer: a role can
be given approval without rejection, or the reverse.

### What a plan cannot reach here

- **The scan itself.** `UC-05-06`'s scan arrives from a card reader, not a sentence. The contracts
  cover the manual-mark route — start and verify — which is the part a person asks for.
- **The one-time code.** Sent to the number held on the staff record; the admin does not choose the
  number, and nothing in a plan supplies or reads it.
- **Bulk marking a whole class from a sentence.** `attendance.daily.mark` takes the marks it is given.
  A planner does not decide who was present.

---

## Module 6 — Examination and result

Twelve use cases, 58 contracts — the largest module so far, and the one with the longest chain of
deliberate acts. Marks are entered, submitted, corrected, locked and reopened; results are calculated,
approved, released, locked and reopened; merit lists are generated, approved, published and withdrawn.
Almost every planning rule in the module exists to stop a plan collapsing two of those into one.

### Numbering gaps

The folder holds `6.1`, `6.2`, `6.3`, `6.5`, `6.6`, `6.7`, `6.8`, `6.12`, `6.13`, `6.15`, `6.16`, `6.17`.
**`6.4`, `6.9`, `6.10`, `6.11` and `6.14` are not written.** Three things the written use cases
explicitly hand to a use case that does not exist:

1. **The report card or transcript.** UC-06-05 BR-11 says the cumulative record "is carried onto the
   final report card or transcript, which is produced elsewhere." Nothing produces one. This is the
   document families actually receive, and no contract in the module can build it.
2. **Classroom conduct.** UC-06-13 BR-7 excludes participation, effort, attentiveness and punctuality
   from subject-skill rating, saying they are "assessed by the class teacher across all subjects."
   Nowhere does that.
3. **Co-curricular activity.** UC-06-13 BR-8 excludes sports, societies, competitions and positions of
   responsibility as "a record of what happened rather than a rating." Nothing holds that record.

**Blocks build** for the report card in particular — every other result path in the module ends there.

### Does approval publish the exam schedule, or is publishing a separate act?

`UC-06-01` says both. BR-7: *"On approval the schedule is published to the Principal, the teachers, the
students and their guardians in one act"*, and basic-flow step 7 is `publishExamSchedule` with **System**
as the actor. But the lifecycle carries an `Approved → Published` transition *"triggeredBy Coordinator or
School Admin"*, and `E9` exists to refuse publication attempted before approval — both of which imply a
publish control somebody presses.

The contracts model **approval as publishing**, with a planning rule forbidding a chained publish call,
because a second call would message every family in the exam twice. If publication is in fact a separate
button, `exam.approve` needs splitting and the rule reverses. **Blocks build.**

### Two figures nothing decides

- **Whether a makeup mark is capped.** UC-06-16 BR-12 says outright that capping — at the pass mark, or
  at a set percentage — "is a school policy decision and is not fixed here." No use case fixes it
  anywhere else. The contract records the teacher's figure uncapped and says so.
- **Who approves a makeup.** UC-06-16's `Approval required` is a *generated* field derived from "the
  classification and school policy" (BR-2). The policy is not defined, so nothing can derive it. `E3`
  refuses a Coordinator approving where the Principal is required, which means the system has to know
  which — and nothing tells it.

Both **block build**, and both are the same shape: a rule that names a policy the documents never write down.

### What a plan cannot reach here

- **Authored papers.** UC-06-01 A1 (a teacher's own exam paper) and UC-06-16's `Paper: file` (a makeup
  paper) both arrive as uploads. A file does not travel in a plan, so `exam.paper.assign` and
  `exam.makeup.paper.assign` cover the question-bank route only.
- **Sitting an online exam.** `startAttempt`, `saveAnswer`, `submitAttempt` are the student in the paper,
  not a sentence. UC-06-06's contracts cover scheduling, releasing and marking the written answers.
- **Grade calculation.** Calculated on upload (UC-06-03 BR-3) and recalculated automatically when a mark
  changes (BR-10). There is no capability, and a planning rule says so — a planner asked to "calculate
  the results" has nothing to call and should say why.
- **Marks on a moved paper.** UC-06-01's own open question. The contract reports
  `marks_already_entered` when a published paper with marks against it is rescheduled, so the Coordinator
  is told at the moment it matters rather than afterwards.

### Skills the use case accepts but says do not belong

`UC-06-13` E5 and E6 both read *accepted* — a skill describing classroom conduct or a co-curricular
activity is saved rather than refused, with the note that it belongs elsewhere. Since nothing else in the
system holds either (see the numbering gaps above), the practical outcome is that schools will put
conduct into subject skills, and every subject teacher will rate the same child's punctuality separately.

The contracts model both as **success paths that must be reported**, not silently accepted. That is the
most the planning layer can do about it.

### Capabilities defined once and shared

Two capabilities appear in the flows of two use cases each. Each is defined once and routed to from the
other, so the allow-list names one thing:

| capability | defined in | also used by |
| --- | --- | --- |
| `quiz.student.absent` | UC-06-08 | UC-06-17 (its step 1) |
| `quiz.student.reopen` | UC-06-08 | UC-06-17 (its makeup route) |

`UC-06-17` therefore carries only two contracts of its own — the makeup decision and the makeup score.
Defining the absence twice would have put two capability IDs on the same act.

---

## Module 7 — Timetable

One use case so far, `7.1`, and 10 contracts against it. The module is small but unusually dense: a
timetable commits every teacher in it to a working week, so almost every act in the lifecycle is
somebody's deliberate decision, and the planning rules mostly exist to keep them apart.

### The period structure — the module's own largest gap

`UC-07-01` BR-14 states it outright: the timetable is built against a period structure — how many
periods a day, on which days, at what times — and **no feature in the document creates one**. E1 refuses
the builder outright without it, and A8 says no grid can be loaded.

So the first capability in the module (`timetable.slot.assign`) cannot run at all in a system built from
these documents. The use case's own open question calls this "the largest gap in the module."
**Blocks build**, and it is the same shape as the missing academic session (module 27) and the missing
chart of accounts (module 4): a structure everything depends on and nothing creates.

Two smaller instances of the same shape, both from this use case's open questions:

- **Rooms.** BR-5 checks a room double-booking, the slot carries an optional room, and **no feature
  creates rooms**. The contract makes `room_id` optional and says so.
- **Teacher unavailability other than approved leave.** BR-6 refuses an assignment where a teacher is
  "otherwise marked unavailable." Approved leave comes from UC-05-11. Nothing records the rest, and the
  clash check reads a field nothing writes.

### Approve and publish are separate here — unlike module 6

Worth recording beside the module 6 finding, because the two documents resolve the same question
differently and the contracts follow each one:

| | module 6 (UC-06-01) | module 7 (UC-07-01) |
| --- | --- | --- |
| business rule | BR-7: *"On approval the schedule is published … in one act"* | BR-10 says only that it cannot be published unapproved |
| basic flow | step 7 `publishExamSchedule`, actor **System** | step 7 `publishTimetable`, actor **System** |
| lifecycle | `Approved → Published`, triggered by a person | `Approved → Published`, triggered by a person |
| modelled as | approval publishes; no separate capability | **separate `timetable.publish`** |

Module 6 has a rule saying approval publishes and module 7 does not, so the contracts diverge. If the
two are meant to behave the same way, one of the two use cases needs correcting — and the exam one is
the likelier candidate, since its lifecycle contradicts its own BR-7.

### Two limits nothing enforces

- **Teaching load.** No maximum periods per teacher per day or week (BR-14's neighbours say nothing, and
  the open question confirms it). The contracts report `teacher_periods_this_week` on every assignment
  and `teacher_loads` at submission and approval, because those figures are the only signal that exists
  before a teacher discovers their own Monday.
- **Required periods per subject.** Nothing checks that maths got its five periods. A section can be
  published short of a subject's periods, which the use case's open question states plainly. The
  contracts report `subject_period_counts` at submission without judging them.

Neither is a refusal anywhere, so neither can be a planning rule — reporting is the most the planning
layer can do.

### `timetable.slot.clear` is not in the basic flow

No flow function clears a slot. The capability is drawn from two other places in the same use case: the
`Timetable slot` entity carries `deactivate`, and the Timetable builder screen lists **"Clear a slot"**
and **"Move a slot"** among its actions. BR-9 ("the coordinator builds and edits it freely") makes it
necessary — E5 refuses an assignment into an occupied slot, so without a clear, a draft slot could never
be changed.

**Assuming** that is right. A "move" is modelled as a clear followed by an assign, which re-runs the
clash check on the destination — a move that silently skipped it would be the one way a clash could
enter a timetable.

### No notice period on a change

BR-11 and BR-12 govern changing a published timetable, and `timetable.change.approve` applies the change
and messages everybody the moment it is approved. **Nothing sets how much notice a change must give**,
which the use case's open question raises. A slot can therefore move for tomorrow morning, or for the
period currently being taught.

The contract's planning rule requires the reply to say when it takes effect, and one worked example has
the assistant report — before approving — that nothing can defer a change to next week. That is a
statement about a missing capability, not a workaround.

---

## Module 12 — HR and payroll

Ten use cases, 55 contracts. The module runs the whole employment lifecycle — recruitment, joining,
salary, leave, advances, payroll, appraisal comparison, resignation and dismissal — and almost every
capability in it touches either somebody's pay or their job.

### A contradiction the document declares about itself

`UC-12-16` BR-11 is the sharpest finding in anything read so far, because the use case states it outright:

> *The visibility rule says the School Admin cannot see any salary, while this feature makes the School
> Admin the one who sets it. The two cannot both hold, and this use case cannot be built correctly until
> the school decides.*

`UC-12-15` BR-3 does say exactly that — the School Admin maintains the general record and the salary
section is hidden from them, on the record and on every list, report and export. `UC-12-16` BR-4 does
make the School Admin the default setter. `E10` exists purely to surface the clash at runtime.

Every contract in `UC-12-16` therefore carries a planning rule requiring the assistant to report `E10`
as **the documented conflict it is, not as a permissions error** — because the natural repair, granting
the School Admin the salary right, silently resolves a question the school was supposed to answer.
**Blocks build**, and it is the one finding in this module that cannot be worked around by any
sequencing of capabilities.

### The two figures a plan must never produce

Across the module the same shape recurs — a number that looks derivable and is not:

| figure | why a planner must not supply it |
| --- | --- |
| the **leave allowance** (UC-12-01 BR-4) | payroll deducts every day beyond it at the daily rate; a guessed figure comes out of somebody's salary the first month they are ill |
| the **daily rate** (UC-12-16 BR-3) | derived from the monthly amount so the two can never disagree |
| the **monthly recovery** on an advance (UC-12-05 BR-2) | derived from the amount and the instalments; arithmetic in a plan is a deduction nobody agreed |
| the **grace on a payroll figure** (UC-12-03 BR-1) | pay is calculated from attendance — a typed figure is one nobody can trace to a day worked |
| a **percentage rise** (UC-12-16 BR-6) | a salary the school never agreed, paid every month until somebody notices |

The strongest of these is UC-12-03 BR-1. Where a Principal wants a deduction waived, the contracts
prefer **correcting the attendance and regenerating** over an override, because an override leaves a
right number sitting on a calculation that still says the teacher was absent.

### Things that cannot be planned

- **A termination cannot be opened from a sentence.** `UC-12-18` E1 refuses the case without a
  supporting record, and that record is a *file*. The contract resolves `supporting_record_id` from an
  already-uploaded file and refuses otherwise — the evidence is attached on the screen.
- **A job application** arrives on a public form with a CV (`UC-12-11` E3). Not plannable.
- **The photograph** taken at joining (`UC-12-01`). The record is created without it and it is attached
  separately.
- **Migration at go-live** (`UC-12-01` A1) — a bulk load, not a sentence.

### Capabilities defined once and shared across the two exit paths

`UC-12-18` BR-10 says the exit path is the same as a resignation from the handover onward, and the two
use cases carry the same four flow functions. Each is defined once in `UC-12-17` and routed to from
`UC-12-18`, so the allow-list names one thing:

| capability | defined in | also used by |
| --- | --- | --- |
| `handover.item.reassign` | UC-12-17 | UC-12-18 (its step 6) |
| `handover.marks.transfer` | UC-12-17 | UC-12-18 (its A5) |
| `staff.settlement.calculate` | UC-12-17 | UC-12-18 (its step 8) |
| `staff.settlement.release` | UC-12-17 | UC-12-18 (its step 8) |

`UC-12-18` therefore carries only the four contracts that are genuinely its own — the decision, its
effect, its approval and its return.

### Smaller gaps, each named by its own use case

- **No service letter for staff.** UC-12-17 BR-12: the certificate module issues for students only and
  has to be extended. `E10` fires when one is requested, and `staff.settlement.release` reports it —
  a leaver expecting an experience letter will not get one. **Blocks build.**
- **Whether an employee may withdraw their own resignation** after approval "is not decided" (UC-12-17
  E7). The School Admin cancels the notice period instead, which is a decision the school takes rather
  than one the employee makes — so an employee asking to un-resign is told the difference.
- **Reassigned handover items do not come back** when a resignation is cancelled. Nothing in UC-12-17
  says they should, so `resignation.cancel` reports what was already handed to somebody else and leaves
  the decision open. A teacher who agreed to stay may find their sections have gone.
- **Retention of rejected candidates' data** (UC-12-11 BR-13): how long an application, CV and personal
  details are kept after the vacancy closes, and who may see them, "is not decided."
- **Appraisals are not in MVP** (UC-12-14 BR-8), so the appraisal column in the performance comparison
  is usually empty. The contract requires it be reported as *not recorded* rather than read as a low
  score — otherwise the comparison invents a judgement of somebody.

### The module's one read capability that writes

`staff.performance.compare` is `kind: read` and produces no rating, no ranking and no score (BR-7) — but
BR-11 requires that **running it is recorded**, since it concerns named individuals and is used in
decisions about them. It is the first capability in the system to carry `writesOnRead` for that reason:
asking for it is not a neutral act.

---

## Module 3 — the three leaving-and-discipline use cases (3.6, 3.7, 3.8)

Added after the first module 3 pass. Seventeen contracts across withdrawal, suspension and expulsion —
three ways a child stops attending, which the documents are careful to keep apart.

### `UC-03-07` is not the use case eight others cite

Eight use cases in modules 1 and 2 — `UC-01-07`, `UC-02-01`, `-03`, `-04`, `-05`, `-07`, `-09`, `-10` —
cite `UC-03-07` by the name **"Class, section and academic session structure"**. The real `UC-03-07`
is **student suspension**.

This resolves half of the earlier finding (*"UC-03-07 doesn't exist, cited 8 times"*): it exists now, and
it is a different thing entirely. The eight citations are stale — the structure they mean is module 27's.
**Blocks build** for anything that follows those preconditions, and it is a one-line fix in eight files.

`UC-03-06` carries the same shape as its own first open question: *"numbered 3.6 in its heading but
referenced as 3.7 throughout module 13. One of the two is wrong."* Two independent numbering collisions
on the same identifier.

### Three ways to stop attending, deliberately kept apart

The contracts route between these constantly, because the natural request — "remove this child" — is
ambiguous and the three have very different consequences:

| | who decides | enrolment | place on roster | invoiced | reversible |
| --- | --- | --- | --- | --- | --- |
| **suspension** (3.7) | Principal, not configurable down | continues | held | **yes** | ends by itself on the return date |
| **withdrawal** (3.6) | School Admin, or Principal if disciplinary | closes | removed | stops | re-admission reads the record |
| **expulsion** (3.8) | Principal, not configurable down | closes permanently | removed | stops | record flagged against future admission |

The one most easily got wrong is suspension: BR-5 holds the place *and keeps invoicing*, because "the
school is holding a place it is not letting the child occupy." A planner that treated it as a temporary
withdrawal would stop the invoice and free the seat.

### The rule both closing paths repeat

`UC-03-06` BR-6 and `UC-03-08` BR-9 say the same thing in almost the same words: a balance written off
rather than collected goes through the write-off use case, by the approver named there, and **is not
approved within this one**. Both add the reason — a withdrawal, or an expulsion, "must not become a route
around that control."

Both contracts carry it as a planning rule and both refuse it (`E5`, `E9`). It is the clearest instance
yet of a control that only holds if every path into it refuses the shortcut.

### What the contracts protect in the disciplinary paths

- **The hearing is not a formality.** `UC-03-08` E4 refuses a decision recorded before the family has
  been heard, and E5 refuses a hearing recorded with no account of the family's response. The contract
  forbids summarising that response — a paraphrase is the school deciding what a family's answer amounted
  to, in the record that justifies expelling their child.
- **The appeal window has to run.** E8 refuses closing the enrolment before it. A worked example has the
  assistant refuse "close it today" on exactly that ground.
- **Attendance coded suspended, never absent.** `UC-03-07` BR-6 and E7: without that state the guardian
  is alerted daily that their child did not arrive, by the school that sent them home.
- **The support record is reviewed before either sanction.** `student.supportrecord.review` is defined
  once in UC-03-07 and routed to from UC-03-08 (BR-3 / BR-2). It records *that* somebody looked, never
  what the record contains.
- **Withholding a leaving certificate is named as leverage.** Both UC-03-06 BR-7 and UC-03-08 BR-10 say
  the document is effectively required for the child to enrol anywhere else. The contracts require the
  assistant to say so plainly before it is withheld, rather than reporting it as a status.

### Undecided, and named by the use cases themselves

Every one of these is a `blocksBuild` open question in its own document:

- **How long the appeal window is**, and **who hears an appeal** — the Principal who made the decision,
  or somebody else (UC-03-08).
- **Whether a flagged record bars re-admission outright** or only surfaces at the attempt (UC-03-08 BR-12).
- **Whether an unsettled balance blocks the withdrawal, blocks only the certificate, or neither** —
  three different outcomes for a family, and the configuration that decides is not set (UC-03-06 BR-7).
- **Which withdrawal reasons permit a later re-admission** (UC-03-06 BR-3). The field is derived from the
  reason and nothing says how.
- **At what point in a new session a student who has not returned is marked as left** (UC-03-06).
- **Whether the Super Admin can configure the suspension approver.** UC-03-07 BR-2 says the approval is
  the Principal's and "not configurable to a lower role", while also saying the Super Admin configures the
  permission. The use case flags the contradiction itself.
- **How many suspensions constitute the pattern that leads to an expulsion** (UC-03-07 BR-11).

### One flow step modelled differently from the document

`UC-03-07` lists `notifySuspension` as a separate School Admin step after the Principal's approval. The
contracts fold the notification **into** `suspension.approve` as one atomic write, because BR-4 ties the
telling to the approval and `E9` reads as a notification failure inside it ("the suspension stands and
the failure is reported"). Modelled as a separate capability, a suspension could be approved and applied
with the family never told — which BR-4 exists to prevent.

**Assuming** that is right. If the notification is genuinely a separate act, it needs its own capability
and its own refusal for the unnotified case.

---

## Module 13 — ID cards and certificates

Three use cases, 22 contracts. Small in count and unusually consequential: this is where the school
produces the documents other institutions rely on, and where it decides who may walk out of the gate
with a child.

### Two gaps from earlier modules close here

- **Staff certificates now exist.** The module 12 finding — *"no service letter for staff; the
  certificate module issues for students only"* (UC-12-17 BR-12, E10) — is answered by `UC-13-02`, whose
  types include **Experience or service letter**, and whose BR-10 says outright that student and staff
  certificates are not split into separate features. `A2` has a staff exit raising the request itself.
  **The module 12 use case has not been updated to say so** — its BR-12 and E10 still state the
  extension is needed. One of the two is now stale.
- **The appointment letter exists.** `UC-12-01` BR-1 requires an accepted appointment letter before a
  staff record can be created, and `UC-13-03` is that letter. The two agree closely: BR-10 here and BR-2
  there both say the terms carry across rather than being retyped, and BR-8 here and E2 there both say
  the record is created on the joining date rather than on acceptance.

### The person picker is a resolve, and the confirmation is the point

`UC-13-01` BR-1 and BR-2 describe the shape every `resolved` parameter in this system has been modelling:
a person is found by identifier or by search, and **a typed identifier is never silently accepted** — the
matched person is shown with photograph, name, father's name, class and section or role, and identifier,
and the user confirms before any field is populated. BR-2 gives the reason: *a single wrong digit resolves
to a real record and produces a valid card for the wrong child.*

`UC-13-02` BR-2 reuses it explicitly for certificates. The contracts' `onAmbiguous` text for people in
this module therefore names the photograph and the father's name rather than just listing candidates —
it is the one disambiguation in the system where a picture is the deciding field.

### What a pickup card is: a bearer card

`UC-13-01` was rewritten around a **bearer card**, and it is the sharpest design decision in the system
so far. BR-8 states it plainly: *whoever presents it may collect the child it names. The school holds no
record of who the guardian has given it to.* Everything else follows:

- The card carries the **child's** photograph and details, not the holder's (BR-9), so the guard is
  confirming the card against the child being released rather than against the person.
- The guardian **requests**; the school issues (BR-10). There is no nomination and nobody is approved as
  a person — the School Admin instead sets **how many cards a child may have**, because every card in
  circulation is another key to that child.
- **Voiding is the only control** (BR-11). A guardian voids one from their own phone and it fails at the
  gate within seconds, not at the end of the day.
- A voided card is **never reactivated** (BR-15, E10). A family who finds a card they reported lost gets
  a replacement, because the school cannot know whose hands it passed through.
- Collections record **which key, not which person** (BR-14). The school cannot record who collected,
  since it does not know.

The contracts carry three refusals that exist only because of this design:

| a plan must never | because |
| --- | --- |
| capture or ask who holds a pickup card | there is no such field anywhere (BR-8, E11) |
| record who collected a child | the school does not know, and a name here would be an unverified guess in the one record an incident is investigated from (BR-14) |
| restore a found card | it was out of the family's hands and the school cannot know whose (BR-15) |

`pickup.collection.record` refuses a supplied holder outright. A worked example — *"her uncle collected
her, record his name too"* — has the assistant explain why the name is left out rather than quietly
dropping it.

### Gate security has no feature

`UC-13-01`'s own open question says it: *"Gate and entry security has not been written as a feature.
Until it is, the card is produced and nothing specifies what happens when it is presented."*

The rewrite now names the missing use case — **UC-25-08, Gate and entry security** — in its dependencies,
its side effects and its out-of-scope list, so the gap is identified even though nothing fills it.

This matters more under the bearer design than it did before. E9 says a voided card "fails at the gate",
and the void notification *repeats until acknowledged at the gate* — but nothing describes the gate that
acknowledges it. `pickup.collection.record` therefore records an outcome whose check does not exist, and
the one control a bearer card has depends on a component that is not written. **Blocks build**, and it is
the largest gap in this module.

**Since then** the feature has been written — as module 29, Gate & Entry Protection, not as UC-25-08, which UC-13-01
still cites. It does not close the gap cleanly: it records a release against a pickup request rather than against a
card number or code, and two of its routes raise a collection with no card at all. See *Module 29 → Module 13 and
module 29 describe the same release two different ways*.

### Charges and signatures nobody has decided

Four `blocksBuild` questions across the two document use cases, all of the same shape — a rule that
implies a decision the documents never make:

- **Is a card replaced because it expired charged?** A lost one is (BR-5). An expired one is not stated.
- **Is a replacement pickup card charged?** The use case names the tension itself: a lost student card is
  an administrative cost, but a lost pickup card is a safety matter, and *charging may discourage the
  report the school most needs*. `card.replace` reports the charge as undecided rather than assuming one.
- **How many pickup cards may a child have?** BR-10 requires a limit and nothing sets one.
  `pickup.card.limit.set` reports that whatever is configured is the school's own answer.
- **Which certificate types need the Principal's signature and which the School Admin's?** BR-5 says
  "according to the type" and no mapping exists. `certificate.sign` refuses a wrong signer against a rule
  nobody wrote down.
- **Is a certificate charged for?** A bonafide certificate is requested more often than every other type
  combined (BR-12), and whether the family pays for one is not decided.

### Custody: the use case now answers its own question, and the answer is a limitation

The earlier version of this use case left open whether the school could bar a nominated person. The
rewrite removes the possibility and says so: **a bearer card cannot bar a named person.** The only
control is `pickup.cards.void.all` — void every card for that child and reissue to the parent the school
recognises.

That capability's planning rules require the assistant to say what it actually does: it stops
*everybody*, including the guardian's own card, and the school still cannot prevent a particular person
collecting if they hold a card that has not been voided. A worked example — *"stop the father collecting,
the mother is allowed"* — reports that limitation before acting rather than after.

The use case marks this **blocksBuild**: whether voiding-and-reissuing is sufficient for the school's
circumstances is not decided. It is the clearest case in the system of a design consequence being
surfaced as an open question rather than hidden behind a feature. The same shape appears twice more in
the same document — whether recording *which card* rather than *who collected* is sufficient, and how
many cards a child may hold.

### The letter is issued early, on purpose

`UC-13-03` BR-4 is unusual in being a rule about *timing as protection*: the letter is issued as soon as
the decision is made rather than held until the joining date, **so that a candidate resigning from another
post does so against written terms rather than a figure agreed by telephone**.

The contracts carry this into two places. `appointment.letter.issue` refuses to treat "hand it over on
the joining day" as an option, and `appointment.letter.withdraw` has a planning rule that says plainly
what a withdrawal does **not** undo — the letter existed so somebody could resign against it, and taking
the offer back does not take back their resignation.

---

## Module 14 — Communication

Four planned use cases, 34 contracts: the emergency notice, two on-demand meeting flows, and the day the
school cancels its own teaching to meet every family at once.

**UC-14-02, the contact directory, is no longer planned.** Its five capabilities (`contact.add`,
`contact.import`, `contact.deactivate`, `contact.reactivate`, `contact.directory.read`) have been
withdrawn. The use case document is still in place and three contracts still cite its rules — the
unreachable number (BR-7) and the person with no contact at all (E8) are referenced by
`emergency.notice.send` and by `teacher.meeting.request.raise`. Those citations are to the document, not
to a capability, so nothing breaks; but if the use case itself is being dropped, **the rule that every
messaging function selects recipients from one directory and from nowhere else goes with it**, and each of
those references needs a new home. Nothing else in the system states where "the guardian's registered
number" comes from.

### An emergency notice has no approval, no template, no queue and no recall

`UC-14-09` is the only capability in the system where the design deliberately removes every check except
one. BR-9: *an emergency message that waits for a second person is a message that arrives late, and the
control is the permission rather than the approval.* BR-3 removes the template, BR-11 the queue, BR-10
the recall, BR-5 the recipient selection.

That leaves `emergency.notice.send` as the most consequential single call in the system: one step, to
every parent, student and member of staff, on every channel, irreversible. Its planning rules are
correspondingly narrow — never write the message, never narrow the recipients, and **say before sending
that it cannot be recalled**. A worked example has the assistant refuse to draft the wording: *it reaches
every family in the school in one act, it cannot be recalled, and it is the message the school is asked
about afterwards.*

Three reporting rules exist because the send can look successful when it was not:

| the send says | the truth |
| --- | --- |
| delivered | a provider that cannot report reads **unknown**, not delivered (E9) |
| sent on every channel | a channel without balance is skipped, and it may be the one a family reads (E4) |
| everyone was reached | people with **no contact at all** were never recipients and appear in no failure list |

### Three routes to the same room, and only two of them carry a time

`UC-14-11` was rewritten and no longer books anything. There is no grid, no slot, no booking and no
attendance record: BR-10 says families attend during the announced window and see the teachers who are
present, and E12 turns a guardian looking for a slot away. That leaves the module with one flow that
cancels a day of teaching and two that arrange a single conversation:

| | who initiates | who chooses the time | approval |
| --- | --- | --- | --- |
| `UC-14-08` parent-requested | guardian | **teacher**, from their genuinely free periods | none — a coordinator would make an everyday conversation into an event (BR-8) |
| `UC-14-12` teacher-requested | teacher, with the slot already proposed | **teacher**, guardian confirms or declines | none (BR-11) |
| `UC-14-11` school-wide meeting day | School Admin | **nobody** — a window, and whoever is present | Principal, before anything is marked or sent (BR-2) |

**"Free" means genuinely free.** `teacher.freeslots.list` is defined once in UC-14-08 and shared with
UC-14-12: the published timetable, less teaching, less substitute cover, less approved leave (BR-2). The
planning rule names the trap — a period a teacher is covering *looks free on their own timetable*, and a
meeting booked into it leaves a class unstaffed and a family in an empty room.

Three capabilities are defined once and routed to from the other use case: `teacher.freeslots.list`,
`meeting.cancel` and `meeting.outcome.record`.

### A record that is kept so a pattern is visible, and nothing acts on it

Both on-demand use cases keep declined, cancelled and unanswered requests deliberately. UC-14-08 BR-11:
*a family who asked three times and was declined three times is visible.* UC-14-12 BR-8: *a family not
engaging with a concern the school has raised is itself something the school needs to see.*

But UC-14-12's own open question answers what happens next: **"Nothing acts on the visibility."**
`teacher.meeting.request.close` carries that as a planning rule — closing a request puts an unresolved
concern about a child into a list nobody is required to do anything with, and the reply says so. Two
related questions are also undecided: after how many days an unanswered request surfaces, and how many
times a teacher may re-offer before closing.

### UC-14-11 — one approval with five consequences

The rewritten meeting day is the widest-reaching single approval in the system. `meetingday.approve` is
one act, and it holds together or not at all:

1. the day is marked in the calendar **for the classes taking part alone** — it is not a closure (BR-3);
2. their lectures do not run (BR-4);
3. **no substitution cover is raised** for any of them — a teacher meeting parents is not absent from a
   lecture that is not happening (E7);
4. no attendance is expected: nobody is marked absent, no absence alert goes out, and the day counts in no
   attendance percentage and in no chronic absence figure (BR-5, E8, E9);
5. every teacher and every guardian in those classes is messaged (BR-7).

Nothing happens before it — the calendar is untouched, the lectures stand and no family has been told
while the declaration sits with the Principal (BR-2, E6). That makes this a second module where **approval
executes rather than authorises**, alongside UC-28-01, and against modules 6 and 7 where the two are
separate steps. Four different answers now, none of the documents acknowledging the others.

### The half of the day nobody thinks about

BR-6 keeps a class not taking part completely unaffected: its lectures run and its attendance is taken as
on any other day. UC-14-11's own OQ-2 then asks the question that follows and does not answer it —
**a teacher holding a Grade 9 lecture that stops and a Grade 7 lecture that does not is expected in a
classroom and at the meeting at the same time.** `meetingday.declare` and `meetingday.lectures.read` both
report those teachers by name (`teachers_double_booked`, `teachers_in_two_places`) because nothing else in
the system will notice, and the clash only becomes visible on the afternoon itself.

Two more of the same shape:

- **Is a meeting day a working day for staff?** (OQ-1, `blocksBuild`) Teachers attend, no student
  attendance is taken, and nothing states what happens to theirs. `meetingday.approve` reports staff
  attendance as untouched and undecided rather than implying either.
- **Could the meeting be held outside teaching hours?** (OQ-3, `blocksBuild`) Not modelled — the
  declaration always suspends the day's lectures for the classes taking part, so a school meeting families
  at two in the afternoon still loses the whole day for them.

### A move announces a date the Principal has not approved

`meetingday.move` restores the original day in every respect and raises a **fresh declaration** on the new
date, which goes through the same approval (A5, BR-2). But the notification about the change carries the
new date to everybody at the moment of the move (PTM_DAY_CHANGED contents). So between the move and the
approval, every family in those classes holds a date the school has not yet agreed to — and if the
Principal returns it, nobody is told.

The contract returns `new_date_approved: false` and makes it the first planning rule, because it is the
one state in the module where what families believe and what the school has decided come apart.

### Nobody knows who came

The day books no slot and records no attendance of any kind, so **the school cannot tell which families
attended** — OQ-6 asks whether any record should be kept and answers *no*, `blocksBuild`. A school that
cancels 48 lectures for 312 families has no way to find out whether 300 came or 30, and therefore no basis
for deciding whether to do it again. `meetingdays.read` refuses to imply otherwise and reports instead the
classes that have taken part in **no** meeting day this session — the families nobody has been called in
to meet, which is the nearest thing the record can answer.

### Small things the use cases leave open

- **Whether a guardian sees the meeting note** the teacher recorded, or whether it is internal. The same
  question is open in UC-14-08 and UC-14-12, and both contracts report the note as visible to the
  coordinator and the guardian question as unsettled.
- **Whether after-school meetings are allowed**, and within what times (UC-14-08 BR-4).
- **How far before the day the reminder is sent** (UC-14-11 OQ-4, `blocksBuild`). BR-8 requires one and
  nothing says when, so the scheduled trigger cannot be built.
- **Whether the meeting is also published on the school website** (UC-14-11 OQ-5). Not modelled;
  `meetingday.declare` routes the request to `website.item.write` in UC-28-01 as a separate act.
- **Whether an emergency notice can be limited** to one class, section or campus. It cannot as written,
  and `emergency.notice.send` reports that rather than narrowing the send.
- **Two exceptions the document does not write.** UC-14-11 forbids the School Admin from approving their
  own declaration (BR-2, and the permissions table) but writes no exception for the attempt, and makes the
  return reason required in its data fields with no exception for its absence — unlike a cancellation,
  which has E10. Both are declared in the contracts with no `mapsTo`, which is what the two module-14
  validator warnings are.


## Module 28 — School Website

Three use cases, seventeen capabilities, and the only module in the system whose output is read by people
the school has no record of. Everything published here reaches parents, students, alumni and prospective
families alike, *none of whom need a login* (UC-28-01 BR-5), which is why almost every rule in the module
is about the moment before something goes out rather than the moment after.

### The website itself does not exist yet

All three use cases name **UC-26-01 Website integration** as the thing that carries the item, the form and
the posting, and **UC-25-01 Role-based access control** as the thing that holds the publish permission.
Neither module is written. Every capability here therefore ends in an outbound call to a component with no
specification and begins with a permission check against a configuration with no owner — the same shape as
the gate-security dependency in module 13, and with the same consequence: the parts of the module that can
be built are exactly the parts that never touch the website.

The one thing the use cases *do* pin down about that integration is the failure: 30-second timeout, three
attempts, and then **nothing published and reported as unpublished**. Every write capability in the module
returns `WEBSITE_UNREACHABLE` and every one of them says the same thing in its planning rules — this is the
failure most easily mistaken for success, and a school that believes a notice is up stops telling families
any other way.

### Approval publishes, and there is no state in between

UC-28-01's lifecycle moves an item from **Awaiting approval straight to Published**, on the Principal's
trigger. There is no *Approved* state. So `website.item.approve` is not a sign-off somebody else acts on
later — the item is on the public site the moment it returns, and the contract says so before acting rather
than after. It also means an approval that cannot reach the website has nowhere to sit: the contract makes
the whole act atomic and records neither the approval nor the publication, because a half-done act would
leave the item in a state the lifecycle does not have. The retry is a second approval.

This is not the only answer the system gives to *does approval publish?* — module 6 separates them, module 7
separates them, and UC-14-11's `meetingday.approve` fuses them the same way this one does. Nothing in the
documents acknowledges the difference.

### A draft written in error stays a draft forever

The lifecycle takes an item out of Draft only to *Awaiting approval* or to *Published*. There is no
Draft → Removed transition, and BR-9/E7 remove the delete control from the whole use case: "An item is
removed from the site, never deleted." Removal, in turn, is only reachable from **Published**.

So an item written by mistake — wrong school, wrong term, a duplicate of one already up — can be edited but
never discarded. `website.item.write` states this in its reversal rather than promising a tidy-up that does
not exist. The fix is one transition the document does not have; nobody appears to have noticed because the
rule that produced it (never delete anything public) is right about published items and was applied to
drafts by inheritance.

### The screen offers an Archive button the lifecycle has no actor for

The Website items screen lists `Archive` among its actions. The lifecycle says Published → Archived is
triggered by **System**, on age (BR-8), and the age itself is `blocksBuild` unanswered (OQ-2). There is
therefore a control on the screen that no rule, flow or transition gives a person the right to press.

No capability is planned for it. `website.item.write` and `website.item.remove` both route the request away
and say why, and `website.items.read` reports archived items as *left the front of the site and still
readable* — never as removed, because nobody chose it and it carries no reason.

### Removal is terminal, and the readers are already gone

`website.item.remove` is the only reversal a published item has, and *Removed* is a terminal state — the
same item cannot go back up, so a notice pulled for a postponed event needs a fresh item when the event is
rescheduled. Both `website.item.edit` and `website.item.remove` carry the rule the screens cannot: **the
people who already read it will not see the correction.** A wrong date corrected on the page reaches
nobody who acted on the old one, and BR-11 forbids the publish from sending anything — telling families is
a separate act through the messaging module, and it is theirs to start.

The edit contract reports `was_public_before` and the removal contract reports `was_public_for` for exactly
this reason: eleven days on the site is a different event from eleven minutes, and neither screen says so.

### UC-28-02 — the form is a state, and its history is an alibi

The inquiry form has two states and nothing else: **no partial state, no scheduling, no per-class control**
(BR-8, E6), because a family either can apply or cannot. Both write capabilities are idempotent on a single
school-wide state, and `website.inquiryform.publish` takes *no parameters at all* beyond the branch — the
only capability in the system with nothing to configure.

Two things the use case gets right and one it leaves open:

- **Never a dead page.** Removing the form requires the closed message in the same act (BR-4, E2). A family
  who arrives at an empty page or a form that fails on submission is a family the school has lost without
  knowing. The contract refuses to write that message — whether it invites them back in January is the
  school's decision (OQ-1, `blocksBuild`).
- **The history is the answer to a quiet month.** BR-5 exists for one scenario: a school asking why it
  received no inquiries in March. `website.inquiryform.history.read` answers with days up against days
  down, and refuses to read a period with the form down as a period with no demand — nobody could apply,
  and **how many families read the closed page and went elsewhere is recorded nowhere** (OQ-4).
- **Nothing closes the form when a class fills** (OQ-3, `blocksBuild`), and nothing opens it on a date
  (OQ-2 asks the branch question, E6 refuses the scheduling). A school with places for thirty collects
  inquiries until somebody remembers to take the form down.

### UC-28-03 — the posting is the vacancy, made public

Nothing on a posting is typed: role, requirements and closing date are carried from the vacancy in
recruitment, and E4 removes the fields from the screen — "a posting that says something different from the
vacancy is a posting the school cannot stand behind" (BR-3). `website.posting.publish` therefore takes one
resolved parameter and the branch, and refuses outright where no vacancy exists (BR-2, E2): *there is no
route that lists a post the school has not opened.*

Three findings the contracts carry that the screens do not:

1. **Removing the posting does not close the vacancy.** Only the advert comes down. BR-11 runs the other
   way — closing the vacancy in recruitment takes the posting down automatically — but there is no
   symmetry, and a school that pulls the advert and believes the post is closed goes on being shortlisted
   for.
2. **"Closing date passed" is not a reason a person may give.** The data field holds four removal reasons
   and one of them belongs to the scheduled removal alone. `website.posting.remove` offers the other three,
   because recording the date as having done what a person decided is how a hand-pulled advert becomes
   invisible in the history.
3. **Nothing prompts a listing.** Listing is by hand as modelled (OQ-1, `blocksBuild`), so a vacancy open
   in recruitment can sit unadvertised indefinitely — and recruitment cannot receive an application until
   the vacancy is on the site. `website.postings.read` reports `vacancies_open_not_listed` for this reason;
   no screen in either module shows it.

`website.posting.history.read` also reports how many times the same post was relisted. A post advertised
three times is a post the school has not been able to fill, and that fact is visible nowhere else — never
in what is on the careers page today.

### Two public acts that are deliberately not planned

A prospective family submitting the inquiry form and a candidate applying through a posting both happen on
the public site, with **no session to plan against and no allow-list to plan within** — the same reason
UC-02-01 is marked not planned and login is not planned. Both are routed away with the reason stated: the
submission is stamped as coming from the website, and nothing in this layer may make that stamp false.

### Small things the use cases leave open

- **The Return reason has no exception.** UC-28-01's data fields make it required to return an item, but
  the use case writes no E for its absence — unlike a removal, which has E6. `website.item.return` declares
  the failure with `mapsTo: null`, which is the one warning this module raises against the validator.
- **Whether approval is required at all, and whether the Principal gives it** (OQ-1, `blocksBuild`). Every
  contract in UC-28-01 reads it rather than assuming it; `website.item.submit` will not infer it from the
  fact that a Principal exists.
- **At what age an item is archived** (OQ-2, `blocksBuild`) — the module's one scheduled behaviour cannot
  run until the school answers.
- **Whether publishing should optionally message families in the same act** (OQ-3). Modelled as always
  separate, and four capabilities say so explicitly, because a planner that quietly did both would message
  the school's parents on its own authority.
- **Whether the categories are the school's or fixed as the five modelled** (OQ-5, not blocking).
- **Whether the inquiry form and the careers page should be per branch** (UC-28-02 OQ-2, UC-28-03 OQ-2,
  both `blocksBuild`). Both are one school-wide state as written, and a request naming one campus is
  answered plainly rather than quietly applied to all.
- **Whether a posting shows the salary range** (UC-28-03 OQ-4) — deferred to the visibility rule in
  UC-12-16, which is the rule that declares its own contradiction.

## Module 18 — Inventory, Assets & Point-of-Sale

Eleven use cases, sixty contracts, sixty capabilities. Two halves that barely touch: **stock**, which is
counted (18.1–18.6), and **assets**, which are registered individually (18.7–18.11). Almost every finding
below is about the same thing from a different angle — the module knows *quantities* and has almost no
idea about *money*.

### Nothing in the module holds a price for a stock item

Four use cases raise this independently and all four mark it `blocksBuild`:

| where | what depends on a price | what exists |
| --- | --- | --- |
| UC-18-01 OQ-2 | Accounts are named as valuing the stock held | no field holds a value |
| UC-18-02 OQ-3 | the approver is shown an **estimated value** | nothing produces it |
| UC-18-03 OQ-3 | that value **decides which role must approve** | nothing produces it |
| UC-18-05 OQ-5 | the issue approval threshold is stated in money | nothing produces it |

So the routing rule that decides whether the School Admin or the Principal may agree to a spend is driven
by a number no feature in the system computes. `stock.request.submit` and `stock.request.approve` both
report `estimated_value_source` as unknown rather than presenting the figure as a price.

### Two rules that carry the whole module, and one that is easiest to get wrong

**The advance is not an expense.** UC-18-03 BR-6 names this outright as *the most likely error in this
module*: cash handed to somebody before a purchase is an amount owed back in goods or cash, and it becomes
an expense only at settlement. `stock.advance.issue` reports `posted_to` as the advances account and makes
"never call it an expense" its first planning rule; `stock.advance.settle` says the expense happens **at
that moment and not before**.

**Both halves or neither.** UC-18-04 BR-11: the ledger posting and the stock increase are recorded
together or not at all, *because a voucher records an amount while stock needs to know that ten reams
arrived* — and without the second half the books are clean and the inventory never moves. `stock.receipt.record`
therefore reports `stock_balance_moved: false` and says the goods are on the shelf and invisible to the
system until Accounts post the settlement.

The separations are the module's real design: **who asks ≠ who approves ≠ who pays ≠ who receives ≠ who
counts.** A purchaser cannot receive their own goods (UC-18-04 BR-5), a storekeeper cannot count their own
store (UC-18-06 BR-2), a counter cannot approve their own adjustment (BR-5), a custodian cannot verify their
own assets (UC-18-10 BR-2), and a verifier cannot approve their own correction (BR-4). Every one of those is
a refusal the contracts explain rather than route around.

### The one-storekeeper problem the module creates for itself

Those separations assume more than one pair of hands. UC-18-04 OQ-1 asks it directly — *who receives the
goods where the storekeeper is the person who bought them, in a small school with one storekeeper?* — and
UC-18-10 OQ-2 asks the same about the School Admin verifying assets assigned to the School Admin. Both are
`blocksBuild`. A small school cannot satisfy the controls and nothing offers it an alternative.

### Where Accounts approve alone, one list is the only control left

UC-18-03 BR-4 states the shape plainly and then BR-8 states the consequence: a configuration placing both
the approval and the release with Accounts *would leave the request, the approval, the cash, the settlement
and the ledger entry in one pair of hands with nothing outside it to check against*. Where the school
configures it that way anyway, **the outstanding advance list is the only remaining control**, and it must
be visible to the School Admin and the Principal rather than to Accounts alone (E7).

`stock.advances.read` treats that list as a control rather than a report. It marks the advances Accounts
both approved and paid, names the ones nobody has chased, names people holding more than one unsettled
advance at once — nothing refuses a second — and names holders who have already left, whose advances are
recovered from the final settlement and do not lapse, *but only if somebody notices before it is paid*.

### The disposal use case declares that it cannot run

UC-18-11 is the module's UC-12-16: a use case whose own exception and open question say it is unbuildable.
E7 and OQ-1 both state it — **nothing in the system calculates depreciation**, every asset records an
expected life that nothing uses, so no asset carries a remaining book value, and the gain or loss the whole
use case exists to post has nothing to be measured against.

`asset.disposal.complete` reports it as its first planning rule and refuses to invent a figure: *a value
nobody computed, posted to the ledger as a gain or a loss, is worse than a disposal that did not complete.*
`asset.disposals.read` reports `approved_not_completed` and says what it means in practice — **all of
them**: every approved disposal is stuck, and those assets are still on the register, still counted in its
total, several still assigned to people.

### Four outcomes, one of which nothing follows

UC-18-11 BR-3 refuses to collapse a disposal into one word: sold brings money in, scrapped brings nothing,
donated brings nothing but is recorded, and **lost is a write-off and probably an investigation** (BR-11).
The flag exists and OQ-2 confirms nothing follows it. A worked example turns "record it as scrapped" into
lost, because *scrapped is a decision the school made; lost is property that has gone* — the two produce the
same loss in the books and mean entirely different things. Related and also unanswered: nothing records who
bought a sold asset (OQ-4), and no missing asset is escalated on value (UC-18-10 OQ-4).

### Rooms do not exist

UC-18-10 OQ-5 names it as the module's most-referenced missing structure: **rooms are the scope most asset
verifications will use and no feature anywhere creates a room register.** Assets are assigned to rooms
(UC-18-08 BR-1), located in rooms (UC-18-07), and verified by room (UC-18-10 BR-10) — all against a typed
string. `asset.verification.schedule` says so when a room scope is named.

### An asset assigned to a department is on nobody's checklist

UC-18-08 BR-1 allows a room, a person or a department, and only a person assignment names a custodian.
BR-5 then puts anything assigned to a **person** on their exit handover checklist, alongside anything
returnable issued to them from stock, and blocks the exit until it is returned. OQ-2 asks whether a
departmental asset has a custodian at all and answers *no*.

So the exit control that stops equipment walking out with a leaver has a hole exactly the size of every
asset assigned to a room or a department. `asset.assign` and `asset.reassign` both report
`on_exit_checklist` and say what moving an asset from a person to a room actually does: *the school has not
lost track of it, but nothing will now catch it when anybody leaves.*

### Things the module measures and does not act on

- **An asset costing more to keep than to replace.** UC-18-09 BR-6 shows the maintenance total precisely so
  it is visible, and OQ-3 confirms nothing flags it. `asset.maintenance.read` gives the total against the
  purchase value together, because neither figure means anything alone.
- **An unserviceable asset.** BR-9: it becomes a *candidate* for disposal and nothing retires it. An
  unserviceable machine nobody raises a disposal for stays on the register, assigned, counted, indefinitely
  — and now, with disposals unable to complete, so does one somebody did raise.
- **A shelf that is short at every count.** UC-18-06 BR-11 makes repeated differences visible together
  because *a shelf that is short every count is not an accident*; nothing acts on the pattern, and each
  adjustment on its own reads as an accident.
- **An asset held by one person for years.** UC-18-08 shows days held and OQ-4 confirms nothing reviews it.
- **An asset missing at every verification** (UC-18-10 BR-8), and beyond a disposal recorded as lost there
  is *no process at all* for one that is never found (OQ-3).

### Small things worth fixing

- **UC-18-02 writes nine exceptions and not one of them is about the round.** Every exception concerns the
  request form; nothing covers opening, closing or reminding, which is why three capabilities there declare
  errors with no `mapsTo`. The same shape produces the module's other null-mapped errors — a return reason
  required by a data field with no exception behind it (UC-18-11), and reads with no permission exception
  to map to (UC-18-06, 18-07, 18-09, 18-10).
- **Nothing holds a supplier.** Typed each time on a receipt (UC-18-04 OQ-4) and on every maintenance record
  (UC-18-09 OQ-4), which the document itself names as a missing structure.
- **What separates an asset from stock is undefined** (UC-18-07 OQ-1) — *a projector is clearly an asset and
  a marker clearly is not, but the boundary is undefined*. `stock.item.create` and `asset.register` route
  between each other and refuse to draw the line.
- **A stock adjustment may post nothing to the books** (UC-18-06 OQ-4). Accounts see adjustments and nothing
  is stated to post, so `stock.adjustment.approve` says approving corrects a quantity, not the books — and
  `stock.counts.read` reports the total written off as a figure that exists there and nowhere else.
- **No period is set for anything scheduled**: how often a request round opens (UC-18-02 OQ-1), a stock
  count (UC-18-06 OQ-1) or a verification (UC-18-10 OQ-1); after how many days an advance is chased or
  recovered (UC-18-03 OQ-1); after how many an outstanding returnable item is chased (UC-18-05 OQ-2); and
  how far ahead a warranty or insurance reminder is sent (UC-18-07 OQ-4). Every scheduled behaviour in the
  module is waiting on a number.

## Module 23 — Multi-branch

Four use cases, eighteen contracts. This is the module the whole system has been quietly depending on: **1,552
parameter declarations across every other module read `$session.branch_id`**, and this is where that value is
created, granted, changed and taken away.

### The seal, and its two exceptions — neither of which is written

UC-23-01 BR-5 is the rule the rest of the system rests on: a Principal or School Admin *operates within their
own branch and sees nothing of any other — not its students, staff, fees, ledger, timetable or reports.* BR-9
then names **exactly two** exceptions, both scoped and temporary:

1. a transfer of a student or of a member of staff, where each branch sees of the other only what the transfer
   requires and the access ends when the transfer completes or is rejected;
2. an employee assigned to more than one branch, where each branch sees the other's commitment on that
   employee's timetable as blocked time carrying no detail.

The student half of (1) is **UC-23-04** and is written. The staff half is **UC-23-05**, and (2) is
**UC-23-06** — both are named in UC-23-01, UC-23-02 and UC-23-04, and **neither exists as a document**. So one
of the two declared exceptions to the sealed-branch rule has no specification at all, and the other has only
half of one.

`branch.user.assign` therefore routes a permanent staff move and a two-campus post away and says plainly that
there is nothing to route to. Withdrawing an assignment at one branch and creating one at another is what the
system can actually do, and it is not the same act — nothing records that it was one move.

### UC-23-02 is a stale identifier in three other modules

**UC-02-09, UC-18-08 and UC-03-06 all cite `UC-23-02` as "Inter-branch student transfer."** The real UC-23-02
is *Assigning a user to a branch*; the student transfer is **UC-23-04**. This is the same shape as the
UC-03-07 stale reference found in module 3 — a one-line fix in three use case files.

The wrong identifier had already propagated into the planning contracts: UC-02-09's contracts named UC-23-02
in five places as the route for a student moving campus. Those are corrected and now name
`student.transfer.raise` — UC-23-04. UC-18-08's own trigger list still cites UC-23-02 as the source of an
asset campus transfer, which is neither use case.

### `branch.switch` is the only capability in the system that takes a branch from the request

Every other contract carries the same rule — *branch_id comes from `$session`, never from the request, even
where the request names a campus.* `branch.switch` is the inversion: the request **is** the point, because
this is the act that changes what the session says. Its planning rules say so explicitly, because a misread
here is silently wrong everywhere afterwards.

Two consequences the contracts carry:

- **The role changes with the branch.** BR-1: the role is not carried across. Somebody who was a School Admin a
  moment ago may be a teacher at the campus they just switched to, and `branch.switch` reports `role_before`
  alongside `role_in_context` for exactly that reason.
- **The branch must be visible at all times** (BR-2), and the reason is given in the rule itself: *a user who
  switches mid-task and does not notice is how a challan is issued at the wrong campus.* How prominently is
  `blocksBuild` unanswered (OQ-3) — *"it is the whole control"*.

Also unanswered and blocking: **which branch a multi-assignment user lands in on signing in** (OQ-1) — *a user
who always lands in the wrong one will switch every morning* — and whether a switch should require
re-authentication (OQ-2).

### One person, one account, and the role belongs to the assignment

UC-23-02 BR-6 and BR-2 together are the module's second design idea: one account however many campuses, and
the role attached to the assignment rather than to the person. BR-6 gives the reason — *two accounts for one
person produce two attendance records, two payroll entries and two leave balances.*

`branch.user.assign` therefore refuses to create a second account and refuses to carry a role across. And
`branch.assignments.read` reports only **the count** of a person's other assignments, never what they are:
somebody can be a School Admin at another campus and nothing on this branch's screen will show it.

### A branch can be stranded and nothing rescues it

BR-4: the Super Admin seeds a branch's **first** Principal or School Admin and every user after that is
assigned by the branch's own School Admin. UC-23-02 OQ-1 then asks the question that follows and does not
answer it: **who assigns a user when that branch's only School Admin has left?** The Super Admin seeds only a
*new* branch, not a stranded one.

`branch.user.role.change`, `branch.user.assignment.withdraw` and `branch.assignments.read` all report whether
the branch is one departure away from this, because it is invisible until it happens and there is no route out
of it in the specification. Related and also `blocksBuild`: whether a School Admin may create a peer School
Admin at their own branch (OQ-2), and whether withdrawing somebody's last assignment disables their account or
leaves it with no branch at all (OQ-3).

### Four things a branch owns that nothing else can override

Creation refuses without any of them: its **logo and letterhead** (*a certificate from one campus should not go
out on another's letterhead*), its **bank account** (*fee money must arrive at the campus that charged it*),
its **code** — which goes into every reference number the branch will ever issue — and its **first
administrator**.

`branch.update` carries the consequence nobody asks about: a change of bank account **reissues nothing**.
Every challan already out names the old account and a family paying against one of those pays into it. The
contract reports `outstanding_challans` for this reason; nothing in the module settles them.

### The transfer is the only place two branches touch

UC-23-04 is a withdrawal and an admission performed as one act, deliberately bypassing both — *a family moving
between campuses of the same school should not reapply* (BR-10) — and both processes record it as an exception
rather than being silently sidestepped.

Five things the contracts carry from it:

- **Cards and items are checked at the start because there is no later.** After completion the leaving branch
  *retains no visibility of the student* (BR-8), so the release is the last moment anybody there can ask for a
  pickup card back. `student.transfer.release` refuses while any are outstanding.
- **Both branches must agree**, and the receiving one may refuse — it is taking on a student and possibly a
  debt (BR-4, BR-5). Neither raising nor releasing moves anything.
- **The student ID never changes**; only the roll number, *a position within a class*, is reissued (BR-7).
  `student.transfer.place` refuses any attempt otherwise.
- **A released transfer nobody answers sits open forever.** E4 states it and OQ-2 confirms **no timeout is
  modelled**: the student stays enrolled at the leaving branch and nothing chases the receiving one.
  `student.transfers.read` separates *awaiting our answer* from *awaiting theirs* for this reason.
- **Accepted and not placed looks finished and is not.** The record has not moved, the leaving branch still
  holds the student and the family has not been told.

### The ledger question that blocks three use cases at once

UC-23-01 OQ-1 asks whether branches keep separate ledgers or one consolidated ledger with a branch on each
entry, and says it *decides how salary cost is apportioned for a shared or transferred employee*. UC-23-04
OQ-1 then depends on it directly: where a balance is carried forward with a transferring student, **whose
books the debt sits in is unresolved.** `student.transfer.accept` reports `whose_ledger` as unanswered rather
than implying either.

Two more of the same kind, both `blocksBuild`: whether a branch has its own **fee structure** (UC-23-01 OQ-2)
— which UC-23-04 OQ-3 turns into *the family's first question*, unanswerable — and whether a branch has its
own **academic session and calendar** (OQ-3).

### Small things worth deciding

- **A consolidated view can be granted and the use case never describes revoking one.** No flow, screen action
  or lifecycle covers it, so `branch.consolidatedview.grant` says in its reversal that a grant made in error has
  no documented way back.
- **Nobody audits the Super Admin** (UC-23-01 OQ-4). The audit log records their cross-branch access and they
  can read that too.
- **A closed branch's records in a consolidated view** — unspecified (OQ-5). `branch.deactivate` reports it as
  unknown, along with the unpaid challans the closed campus issued against a bank account that may no longer
  exist.
- **Closing a branch has no bulk route.** BR-10 refuses deactivation while students or staff remain, and each
  student leaves by a transfer raised, released and accepted one at a time — for a campus of 412, that is the
  real work and it has to start long before the closing date.
- **A part-term result across two campuses is not addressed** (UC-23-04 OQ-4): the history moves, and what
  happens to a term result half-recorded at each is unwritten.

## Module 25 — Security

Four use cases, nineteen contracts. **UC-25-01 is cited by 90 use case files** — the most-referenced document
in the whole specification — and it is the one that defines what the planning layer's allow-list *is*.

### The allow-list is this use case

UC-25-01 BR-4 and BR-5 are the rule every capability in this repository is built against: *the check runs on
the server, on every request, without exception*, and *hiding a menu item is not access control; it is
decoration over an address anybody can type.* A capability id in this system is the thing a permission names,
which is why one name can never mean two things.

Two consequences the contracts carry:

- **A permission cannot be invented.** BR-1: permissions are defined by the system and created by nobody, the
  Super Admin included. `role.create` and `role.permissions.update` refuse to pick the nearest-sounding
  permission from another module to fit a request.
- **A role change is a change for everybody who holds it.** `role.permissions.update` reports `users_affected`
  and says the removal *bites on the next request, silently* — the check runs server-side every time, so there
  is no cached permission to wait out and nobody is signed out or warned.

### Two use cases disagree about what a role is

UC-23-02 declares *Role at this branch* as an **enum of six fixed values** — Principal / Director, School
Admin, Coordinator, Teacher, Accounts, Staff. UC-25-01 BR-1 says the Super Admin **creates** roles with any
name of 2 to 100 characters. Those cannot both be true.

The split runs deeper than the field. The act of putting a role on a person is one act described twice:
`assignRole(userId, branchId, roleId)` in UC-25-01 step 3, and the assignment in UC-23-02 — both anchored on
the same idea, that *the role is held on the branch assignment, not on the user* (UC-25-01 BR-8, UC-23-02
BR-2). Only one capability may exist for it, so `branch.user.assign` is defined in UC-23-02 and UC-25-01
routes to it.

But **the delegation limits live in UC-25-01 and the capability lives in UC-23-02**: only within their own
branch, only to roles *at or below their own*, and only to permissions released to that branch (BR-3, E2, E3,
E4). UC-23-02 carries none of those rules. The rules of the allow-list are split across two documents that
disagree about their subject.

Worse, the limit that matters most is undefined: **OQ-1 confirms nothing anywhere defines which roles count
as "at or below" another.** `permission.branch.release` reports it as unanswered, because it is the whole
constraint on what a School Admin may hand out unsupervised.

### Three grants, no revokes

A pattern across this module and module 23. Each of these is described as a grant, and **none of the three
use cases describes taking it back** — no flow, no screen action, no lifecycle transition:

| grant | who | described revoke |
| --- | --- | --- |
| consolidated view across branches (UC-23-01 BR-6) | Super Admin | none |
| permission released to a branch (UC-25-01 BR-3) | Super Admin | none |
| audit trail access (UC-25-06 BR-4) | Super Admin | none |

All three contracts say so in their reversal statements. And `role.deactivate` reports the third-order effect:
a role's branch releases **outlive the role** — retiring it withdraws nothing.

### Enforcement is not protection

UC-25-04 is easy to read as done once a role is enforced. `mfa.status.read` makes the distinction its first
rule: **count the enrolled, not the enforced.** Enforcement covers people; only enrolment stops a stolen
password, and BR-3 says the user enrols their own factor and *nobody enrols one on their behalf*.

Three populations the contracts report separately, because on a screen they look alike:

- **enforced and not enrolled** — held at enrolment on their next sign-in and reaching nothing else (BR-8).
  For somebody who signs in once a term, that is a lockout discovered at the worst moment.
- **enabled themselves and never enrolled** — their profile says protected and a password alone still signs
  them in.
- **covered with no contact number** — the SMS method cannot be enrolled at all (E9), and enrolment is the
  only way past the sign-in they are now held at.

And the case the use case raises against itself: **only the Super Admin recovers a lost factor** (BR-6), so
OQ-3 asks who recovers the Super Admin's own and does not answer. No recovery codes are modelled (OQ-4).
`mfa.enforce` stops and says this before enforcing on that account — it is the one that locks the school out
of everything.

### Nothing may carry a password, including a plan

UC-25-05 BR-7 is absolute: *nobody else ever knows a user's password, the Super Admin included. There is no
screen that displays one, no route that retrieves one, and no person who can set one on somebody's behalf.*

That makes most of this use case unplannable by design, and the contracts say why rather than failing
quietly. What **is** planned is the three Super Admin acts that never touch a password — setting the policy,
having the system resend a temporary password, and disabling or reactivating an account. Everything else
routes away: setting a password, changing one, recovering one by a one-time code, and creating an account at
all — BR-1 and E1 say *there is no screen anywhere in the system for creating a credential*.

`account.temporary.password.resend` returns `password_returned: false` as a field, because the person who
asked for it to be sent is one of the people who must not learn it.

Two things nobody notices until they matter:

- **A temporary password never expires** (OQ-4). `accounts.read` reports the accounts still on one with how
  long — *a live credential sitting in an inbox*, sometimes months old.
- **An account whose record carries no contact was never sent anything**, so nobody has ever signed in to it
  (E2). How a temporary password reaches a young student with no email of their own is raised in the
  specification and left open (OQ-1).

### The trail that records being read

`audit.trail.read` is the second capability in the system to declare `writesOnRead`, and the clearest case for
it: BR-11 says *reading the trail is itself written to the trail, so somebody looking through it is as
traceable as somebody acting.* `audit.access.grant` tells the person being granted access that, before they
use it.

Three things the contracts insist on in an answer:

1. **The role the user held at the time**, not the one they hold now (BR-8) — somebody who approved a result
   as a coordinator and is now a teacher is explained by the first and confused by the second.
2. **Before and after** (BR-10) — a change entry exists to explain the change, and "marks lock changed"
   answers nothing.
3. **The reason**, where the action carried one (BR-9) — *an approval or an override with no reason recorded
   is an action nobody can question.*

And two limits worth stating before an investigation starts:

- **The retention policy is defined nowhere** (OQ-1), and it is the practical limit on how far back anything
  can be traced. `audit.trail.read` refuses to claim how far the trail reaches.
- **Reading an ordinary record is not recorded.** Reading the *trail* is; reading a salary or a safeguarding
  note is not, and whether it should be is unanswered (OQ-5). So "who looked at this salary?" returns nobody
  — meaning nobody *changed* it, not that nobody saw it. A worked example makes exactly that correction.

### The invariant every other contract depends on

UC-25-06 E6: where the trail cannot be written to, **the action does not complete** — *an action nobody can
trace is worse than one that did not happen.* Every one of the 421 contracts in this repository writes to that
trail, so this single exception sits behind all of them. It is also OQ-4 here: whether the trail itself is
backed up is not addressed, and *a trail that can be lost is not much of a trail.*

### Small things worth deciding

- **A School Admin granted audit access sees entries about themselves** (OQ-3) — somebody can watch their own
  trail. Modelled as yes, within their branch, and raised unanswered.
- **Nothing takes a permission back on its own.** A role only ever grows unless somebody names what should come
  off, and `roles.read` reports each role's permission count and the roles nobody holds — which stay grantable
  and keep whatever they accumulated.
- **A refused request from a typed address is recorded and distinguished from one through the menu, and
  nothing acts on it** (UC-25-01 OQ-4) — the closest thing the system has to a probing signal.
- **Whether a user may hold more than one role at one branch** is unanswered (OQ-3); UC-23-02 BR-8 says no,
  from the other side.
- **UC-25-02 and UC-25-03 do not exist** and nothing cites them. **UC-25-08 Gate and entry security** is cited
  once — by module 13, where the bearer-card design depends on it — and does not exist either. Gate and entry
  security was written as module 29 instead, and UC-13-01 has not been repointed to it.

## Module 30 — Help Desk & Complaints

Four use cases, twenty-three contracts: two routes in (a parent complaint, a staff complaint) and two routes
through. Parent and staff complaints are kept as **separate capabilities** even where the recorded functions
share a name, because their rules differ in exactly the places that matter — one carries harm routing, the other
carries confidentiality — and a contract may only carry rules its own use case states.

### The only route for "a child has been harmed" ends with one person and no process

UC-30-01 BR-4 routes a harm allegation straight to the Principal, bypassing the desk and the School Admin,
readable only by those the Principal permits, and never closed by the ordinary route. The rule then says why that
matters: *safeguarding is out of MVP, which makes stating this here more important rather than less, because there
is presently nowhere else for such a report to go.* OQ-2 finishes the thought: **nothing describes what the
Principal does with one.**

The contracts carry four consequences:

- **Words that describe harm are never filed as anything else.** `complaint.parent.raise` puts "A child has been
  harmed" to the parent first — filing it as *staff conduct* would send it into the ordinary queue, where the people
  it may concern can see it (BR-9).
- **It is not an emergency route, and the contract says so.** Where a child is in danger now, the family is told
  to speak to the school directly and, where needed, the appropriate authorities.
- **It cannot be withdrawn.** It leaves the open state the moment it is raised, and withdrawal is only from open.
- **"Readable only by those the Principal permits" has no act behind it on the parent side.** UC-30-04 gives the
  Principal a flow for permitting readers of a *confidential staff* complaint (A7); UC-30-02 gives none for a harm
  allegation. Retention is also unstated, against safeguarding obligations that usually run far longer than seven
  years (UC-30-01 OQ-3).

### The confidential route delivers a complaint about the Principal to the Principal

Every confidential staff complaint goes to the Principal (UC-30-03 BR-3, UC-30-04 BR-4). BR-3 says a complaint
naming the Principal goes to the Super Admin — but confidential complaints never take that route. So **the one
complaint the confidential route most exists for is handed to its subject.** Both use cases name it: UC-30-03 OQ-1
(*"the case the confidential route exists for"*) and UC-30-04 OQ-1 (*"the largest gap in the module"*), and E11
confirms *there is no further route.*

`complaint.staff.raise` stops before raising such a complaint and lays the choice out honestly: confidential sends
it to the Principal; ordinary routes it to the Super Admin but passes through the ordinary queue first. Neither is
what the raiser is asking for. `complaint.staff.outcome.record` flags it again when the Principal is recording the
outcome of a complaint about themselves.

### Every protection rests on knowing who a complaint names — which nothing does

The strongest rules in the module all depend on identifying the person or role a complaint is about: a complaint
is never handled by its subject, routes *above* a named role, is invisible to a named teacher, and is not routed
through a colleague of theirs. But the complaint is **free text**, and both working use cases ask the same thing
unanswered — *how does the system know a complaint names a particular person or role?* (UC-30-02 OQ-2,
UC-30-04 OQ-3). **"Colleague" is defined nowhere** either (UC-30-02 OQ-3).

`complaint.parent.takeup` and `complaint.staff.takeup` say so, so that nobody mistakes an unenforced protection for
an enforced one.

### A reopened complaint goes to the School Admin even when it is about the School Admin

A complaint reopened once is *then held by the School Admin* (UC-30-02 BR-6; UC-30-04 BR-11 for an ordinary
one). Neither rule excepts a complaint that names the School Admin — which BR-3 says must never go to them. Both
reopen contracts report the collision in `held_by`.

### Confidential protects the complaint, not the person

Four things a member of staff should know before choosing confidential, all stated in the contracts:

1. **It is permanent** — nobody can make it ordinary afterwards, the raiser included (UC-30-03 BR-8).
2. **It is not anonymous** — the raiser is always named to the Principal (OQ-2).
3. **It cannot be withdrawn** — it leaves the open state at once.
4. **Nothing protects the raiser** from being disadvantaged for having complained (OQ-4).

And once raised, the Principal may permit anybody to read it (UC-30-04 A7). **Nothing limits who** — including the
School Admin and the desk, the very people the choice exists to avoid — **nothing tells the raiser**, and **no
revoke is described**. `complaint.staff.confidential.access.grant` stops before granting to anybody in those
positions. That makes four grants in the specification with no documented way back, joining the three in
module 25.

### Complaints never close on silence, and nothing sets a clock

An outcome waits on the family or the raiser to confirm; if they never answer, the complaint stays open for good
(UC-30-02 E9, UC-30-04 E10, OQ-5 in both). No time limit exists for taking one up or resolving one (OQ-4 in both).
Both queue reads separate *not taken up* from *awaiting confirmation* — a queue can look empty while a dozen
complaints sit on somebody's silence.

### Who can complain, about what, and to whom

- **Students cannot complain anywhere** (UC-30-01 E9); the use case asks whether that is intended (OQ-1).
- **Staff cannot complain about a parent or a student** — the categories cover the school (UC-30-03 OQ-5).
- **A parent cannot complain about the school in general** — a child is required (UC-30-01 OQ-4).
- **Every complaint lands on the IT desk**, the desk that fixes system faults — for a complaint about a teacher, a
  fee, pay or management. Both working use cases flag this as needing a decision (UC-30-02 OQ-1, UC-30-04 OQ-2).
- **A system fault "raised on the same desk" has no use case** (UC-30-01 BR-1).
- **Nothing cites any UC-30 use case** from elsewhere in the specification.

## Module 29 — Gate & Entry Protection

Seven use cases, twenty-nine contracts, in two halves: visitors (UC-29-01 to 03 — log in, log out, read the log)
and pickups (UC-29-04 to 07 — three ways to raise a collection request, and the queue that works it). The use case
files arrived loose in the module folder; they were moved into `UseCases/` so that the contracts' `useCase.file`
paths match every other module.

### Two scans are not planned, on purpose

The pickup card scan (UC-29-05) and the gate-barcode scan (UC-29-06) raise requests but have no capability. In both,
the thing scanned *is* the key: "the card is the only thing checked" (UC-29-05 BR-5), and the barcode rotates so
that one photographed once "does not work indefinitely" (UC-29-06 BR-6). A plan that accepted a typed card number or
barcode value would turn a physical key into a string that anybody who has seen it can use. Both route to *scanned
at the gate / in the portal* — the treatment passwords and codes already get. UC-29-05 therefore carries only two
reads (refused scans, cards in circulation), and UC-29-06 only the School Admin's display and rotate.

The geofence confirmation (UC-29-04) *is* planned, because there the guardian's words are the confirmation BR-4
asks for. The location is `$session.device_location`, supplied by the portal — "I'm at the gate" is never a location.

### Module 13 and module 29 describe the same release two different ways

- **UC-13-01** (BR-13, BR-14; `pickup.collection.verify`, `pickup.collection.record`): a person who arrives without
  a card is verified by a one-time code sent to the guardian, and every release is recorded against a card number
  or a code.
- **UC-29-07** (BR-4, BR-6): every release is recorded against a pickup request, and nothing is checked. A request
  raised by geofence or gate barcode involves no card and no code.

Both are live capabilities. `pickup.request.complete` routes a card-or-code release to `pickup.collection.record`
and says the two are unreconciled. Which model is kept — and whether the geofence and barcode routes bypass the
code check that UC-13-01 treats as the whole protection for a card-less collection — needs a decision. **Blocks
build.**

Two smaller mismatches between the modules:

- UC-13-01 still names **UC-25-08, Gate and entry security**, which does not exist. Module 29 is that feature.
- UC-13-01 calls ending a card *voiding*; UC-29-05 calls it *cancelling*, with the same effect and its own reason
  field (E5). The contracts route UC-29-05's cancel to `pickup.card.void` rather than defining the act twice.

### The log contradicts the queue about children leaving

UC-29-03 says a child leaving during the day with an adult "is recorded nowhere" (out of scope, and OQ-3), and that
the pickup card "has no gate process to be presented to". UC-29-04 to UC-29-07 are that process, and UC-29-07 BR-10
calls the collection record the only record of a child leaving. UC-29-03's OQ-3 reads as though it was written
before the pickup use cases existed. What remains true is narrower: **a child taken by an adult who raised no
request is recorded nowhere** (UC-29-07 OQ-4), and `pickup.collections.read` says so.

Otherwise students never pass through the gate record (UC-29-03 BR-7, BR-11), so nothing can answer *which students
are on campus* during a fire or a lockdown (UC-29-03 OQ-2). `gate.log.read` and `visits.open.read` both say what they
do not cover.

### Nothing creates what the module reads

- **The blocklist** — who may bar a person, for how long, and who lifts it (UC-29-01 OQ-1, OQ-3). Until one
  exists, `visit.log.in` reports every visitor as *not checked*, never as *cleared* (E5).
- **Pre-registrations** (UC-29-01 OQ-2) — there is a screen, and nothing creates one.
- **Gates** (UC-29-03 OQ-5, UC-29-06 OQ-2) — `gate_id` resolves against a list nothing fills.
- **Numbered visitor passes** — UC-29-01's precondition says UC-29-02 establishes them; UC-29-02 only takes them
  back and retires them.
- **The escalation period, the end of the window and the normal end of the day** (UC-29-07 OQ-1, OQ-2). The last
  decides whether a collection is early, and so whether an attendance mark changes; `pickup.request.complete` leaves
  that decision to the API rather than guessing a time.

### A possible blocklist match cannot pause a plan

On the screen a possible match is shown and the desk carries on (UC-29-01 BR-11, A3). A plan cannot wait while the
desk asks the visitor, so `visit.log.in` stops with an error that maps to no exception. The desk then either logs
the visitor in again with `possible_match_cleared` — set only from the desk's own statement, never on a first
attempt — or refuses them with `visit.refuse`. UC-29-01 needs an exception for it.

### Actions that exist only in a lifecycle or a message

- **Cancelling a pickup request.** UC-29-04's lifecycle has *In the queue → Cancelled*, by the guardian, with no
  step, function or exception. `pickup.request.cancel` exists because it is the only way back from a confirmation.
  UC-29-07's lifecycle for the **same entity** has no Cancelled state and adds Sent, Escalated and Refused — two
  lifecycles for one pickup request, which disagree about whether a sent request can still be cancelled.
- **Revoking gate-log access.** Only the entity's `deactivate` and the "granted or revoked" message describe it.
  `gate.log.access.revoke` is included as the reversal of the grant.
- **Refusing a visit.** UC-29-01's lifecycle lists *Refused* as a terminal state with no transition into it.

The eight new warnings are these gaps, one per error with no E-id: a possible match; recovering or retiring a pass
that is not outstanding; revoking from somebody who does not hold access; confirming from outside the boundary or
window; cancelling outside the queue; sending a request that is not waiting; completing one that was never sent.

### Doubt at the gate has no follow-through

The staff member refuses the release and "the School Admin is called" (UC-29-07 BR-5) — by telephone, since no
message in the use case does it, so `pickup.release.refuse` tells them to call. What the School Admin then decides
is recorded nowhere (OQ-3), and the request moves from *Refused* to *Completed* on nobody's recorded authority.

### Smaller points

- The desk reads today's open visits and outstanding passes without the Super Admin's grant (UC-29-03 permissions),
  although BR-5 says nobody holds the log permission by default. Modelled as the desk's own list. Every reading is
  still recorded (BR-10), so `gate.log.read`, `visits.open.read` and `visit.read` all declare `writesOnRead`.
- A gate barcode can be scanned from a photograph anywhere; rotation is the only limit (UC-29-06 OQ-3).
  `gate.barcode.display` never returns the barcode, and says what a rotation of *Never* means.
- Two guardians of one child can each hold an open request (UC-29-04 OQ-4).
- Visitor records hold personal data about people otherwise unconnected to the school, with no retention period
  (UC-29-01 OQ-4, UC-29-03 OQ-1).
- UC-29-07 takes the coordinator's WhatsApp numbers from UC-14-02, whose planning contract was removed.

## Module 24 — Reporting

Ten use cases, seventeen contracts. There is one run capability per report group — `report.fee.run`,
`report.accounting.run`, `report.student.run`, `report.attendance.run`, `report.exam.run`, `report.timetable.run`,
`report.hr.run`, `report.inventory.run`, `report.operational.run` — each taking the report itself as a resolved
`report_id` from the catalogue. A different report in the same group is the same plan with a different value, and
the same shape with a different value is not a different intent. Beside them sit the portal views of a person's own
records (`fee.ledger.mine.read`, `attendance.child.summary.read`, `exam.results.mine.read`, `timetable.mine.read`,
`payslip.mine.read`), the shared `reports.catalogue.read`, and UC-24-19's `report.export` and `report.combined.run`.
As in module 29, the use case files arrived loose in the module folder and were moved into `UseCases/`.

Every run declares `writesOnRead`. Each use case says that running a report is recorded, and its *any report run*
acceptance criterion covers the portal views too — so nothing in this module is pre-approval safe.

### The catalogue claims reports that other modules still own

Each report use case says the reporting that used to sit inside its module "lives here", so that everyone reads the
same figures from one place (BR-1). But the owning modules' own reads are still live contracts, reading the same
records:

| catalogue report | still live in its own module |
| --- | --- |
| Defaulter list with ageing (UC-24-10) | `fee.overdue.list` — UC-04-06 |
| General ledger, trial balance (UC-24-11) | `finance.ledger.read`, `finance.trialbalance.read` — UC-04-18 |
| Budget against actual (UC-24-11) | `finance.budget.variance.read` — UC-04-20 |
| Free periods by slot (UC-24-15) | `timetable.freeteachers.list` — UC-07-01 |
| Balances, reorder list, advances, counts, assets, disposals (UC-24-17) | `stock.items.read`, `stock.advances.read`, `stock.counts.read`, `assets.read`, `asset.assignments.read`, `asset.disposals.read` — module 18 |
| Visitor log, collection record (UC-24-18) | `gate.log.read` — UC-29-03; `pickup.collections.read` — UC-29-07 |
| Open complaints (UC-24-18) | `complaints.parent.read` — UC-30-02; `complaints.staff.read` — UC-30-04 |
| Audit log search (UC-24-18) | `audit.trail.read` — UC-25-06 |

A router given "who hasn't paid" or "which items are below the reorder level" has two targets reading one ledger.
The contracts route a working request — chase, trace, act — to the module's own read, and a named or printable report
to the catalogue. That line is drawn here; the documents do not draw it. The audit log search is the one case not
duplicated: `report.operational.run` sends it to `audit.trail.read`, which already carries the permission and records
its own searches. The two sides also differ in detail — UC-04-06 ages a debt from 1 to 30 days, UC-24-10 from 0 to 30.

### Three documents disagree about who reads across branches

- **UC-24-19 BR-9** — a combined report is the Super Admin's alone: nobody else can run it, open it or be given it.
- **UC-23-01** — the Super Admin may grant a named Principal or Director a consolidated view, and
  `branch.consolidatedview.grant` is a live capability.
- **UC-24-10 BR-4** — "only a reader with a consolidated view reads across them", and its OQ-2 asks whether such a
  reader may run these reports across branches.

UC-24-19 says it settles the question for reports (BR-10, OQ-1), and the contracts follow it: `report.combined.run`
refuses anybody but the Super Admin, and every other run takes the branch from `$session`. **Blocks build** until
the three are reconciled. Related: every report use case from UC-24-10 to UC-24-18 gives the Principal **all
branches**, while UC-24-19 BR-6 limits the Principal to **their own branch** for reading and downloading.

### Families see a result on approval; the reports wait for the lock

UC-06-03 releases results to families when the Coordinator approves them — `exam.results.approve`, "the moment
families see a grade" — and locks them later, once the correction period is over. UC-24-14 BR-3 refuses every report
that shows a result, the report card included, until the marks are "approved and locked". Between approval and lock a
family is shown a grade in one place and refused it in the portal. "Locked" is itself two things in module 6:
`exam.marks.lock` (UC-06-02) and `exam.results.lock` (UC-06-03). `report.exam.run` and `exam.results.mine.read` follow
their own use case and wait for the lock. **Blocks build.**

### The operational report promises a field that does not exist

UC-24-18 BR-6 and AC-5 say the pickup and collection record shows "who collected which child". Nothing records a
collector: UC-29-07 records a release against a request and UC-13-01 against a card number or a code, and both make
it a rule not to record a person. `report.operational.run` returns `collector_recorded: false` and carries a planning
rule against naming anybody. Also in UC-24-18:

- It cites **UC-29-04** as the visitor log and **UC-29-08** as the pickup queue. The visitor log is UC-29-03, the queue
  is UC-29-07, and UC-29-08 does not exist.
- It offers the **visitor log** to the School Admin by role, where UC-29-03 BR-5 makes reading the log a permission the
  Super Admin grants and nobody holds by default.
- It reports **complaints by category** without saying whether harm allegations (readable only by those the Principal
  permits, UC-30-01 BR-4) or confidential staff complaints (UC-30-03) are in it.
- **Tickets** have no source (OQ-2), and nothing defines when a complaint is **overdue** (OQ-3).

### Figures the reports cannot produce

- **Stock valuation** — no feature holds a price for a stock item (UC-24-17 BR-4, OQ-1). It reads *unavailable*,
  never zero.
- **Depreciation and book value** — nothing calculates them (UC-24-17 BR-6, OQ-2), which also leaves the gain or loss
  on a disposal without a figure.
- **Rooms** for assets by location (UC-24-17 OQ-3), the **chart of accounts** behind every accounting report
  (UC-24-11 OQ-2), **minimum staffing levels** (UC-24-16 OQ-2) and **appraisal records** (UC-24-16 OQ-1).
- **Whether branches keep separate ledgers** — which decides what a branch's trial balance means (UC-24-11 BR-5,
  OQ-1) — and **no period close**, so a past period's figures can still move (OQ-4).

### Export

`report.export` follows the one precedent, `staff.performance.export`: a read that writes an audit entry and returns a
file. It takes the report as a resolved *result*, because the file must be built from what was shown on screen and
never from the underlying query (UC-24-19 BR-2). So "run the receipt register and give me an excel" is two intents —
the run, then the export. Printing is left to the screen, since a plan cannot reach the reader's printer. Nothing
refuses a large export: a spreadsheet of every guardian's number is only recorded (UC-24-19 OQ-2; UC-24-12 OQ-1 for
the directory).

### Smaller points

- UC-24-12 BR-2 has the reader set the academic session. `report.student.run` takes it from the request only where one
  is named, and otherwise uses the open session — the precedent `fee.overdue.list` set.
- UC-24-13 says chronic absence is "not for now", while its own OQ-3 says it exists as a feature elsewhere.
- The report card is modelled as one report among nine. UC-24-14 OQ-1 suggests carving it out, since whether a fee
  balance withholds it (OQ-2) and what it shows for an incomplete subject (OQ-3) are both undecided.
- **UC-24-01 and UC-24-02 do not exist.** Module 1's contracts sent a custom report builder and dashboard
  configuration to them. Those routes now say what exists: dashboards are fixed per role (UC-01-07), a custom report
  is deferred, and fee and student requests go to `report.fee.run` and `report.student.run`. UC-29-07's route to
  "UC-24-18, no contract yet" now names `report.operational.run`.
