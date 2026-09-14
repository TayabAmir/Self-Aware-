# Measure: the four numbers

Generated 2026-09-14 12:31 UTC by `make measure`. Decompose `claude-haiku-4-5-20251001`, planner `claude-sonnet-5`, answers from `eval/recordings/`, stress index of 489 capabilities, today fixed at 2026-09-14.

```
                      all             English         Roman Urdu      
recall@30              96.6%           96.8%           96.4%
plan accuracy          89.7%           93.7%           87.5%
refusal correctness    93.5%           96.9%           91.2%
validator catch rate  100.0%          100.0%          100.0%
out of: 175 labelled sentences, 70 to refuse, 607 injected faults
```

- **recall@30**: the expected capability is among the candidates retrieved with Haiku's intents.
- **plan accuracy**: the answer is exactly one step (or a request for input) for the expected capability.
- **refusal correctness**: across both sets, the system acted exactly when it should: planned or asked for a labelled sentence, refused (or failed safely) for a sentence to refuse.
- **validator catch rate**: of the faults injected into planner answers the validator had accepted, the share it refused. The change in brackets is against `eval/measure/baseline.json`.

## Outcomes

| set | n | plan | needs input | refusal | invalid answer | model call failed |
|---|---:|---:|---:|---:|---:|---:|
| labelled sentences | 175 | 58 | 102 | 13 | 2 | 0 |
| sentences to refuse | 70 | 1 | 0 | 68 | 1 | 0 |

Rules broken by the answers the validator refused: `NOT_A_MISSING_PARAMETER` 1, `VALUE_NOT_IN_SENTENCE` 1, `ENTITY_NOT_IN_SENTENCE` 1.

## Plan accuracy by capability

| expected | n | correct | planned instead |
|---|---:|---:|---|
| `dashboard.main.read` | 20 | 15 | refusal (x5) |
| `fee.cancellation.raise` | 25 | 23 | refusal (x2) |
| `fee.credit.raise` | 26 | 22 | refusal (x2), fee.payment.record (x1), fee.latefee.waive (x1) |
| `fee.latefee.waive` | 19 | 19 |  |
| `fee.overdue.list` | 21 | 18 | invalid (x2), dashboard.main.read (x1) |
| `fee.payment.record` | 22 | 22 |  |
| `fee.reminder.send` | 20 | 18 | refusal (x2) |
| `fee.writeoff.propose` | 22 | 20 | refusal (x2) |

## Validator faults

| fault | applied | caught | for the right reason |
|---|---:|---:|---:|
| hallucinated capability id | 59 | 59 | 59 |
| capability outside the allow-list | 59 | 59 | 59 |
| capability not among the candidates | 59 | 59 | 59 |
| invented parameter | 59 | 59 | 59 |
| more than three steps | 59 | 59 | 59 |
| field outside the schema | 59 | 59 | 59 |
| answer contradicting its outcome | 59 | 59 | 59 |
| required parameter left out | 42 | 42 | 42 |
| value of the wrong type | 38 | 38 | 38 |
| value outside the allowed list | 35 | 35 | 35 |
| record name the user never wrote | 32 | 32 | 32 |
| reference to a later step | 42 | 42 | 42 |
| amount the user never wrote | 5 | 5 | 5 |

## Labelled sentences not planned correctly (18)

| sentence | lang | expected | outcome | detail |
|---|---|---|---|---|
| how is the school doing today | en | `dashboard.main.read` | refusal | not_a_request |
| how many card requests are pending | en | `dashboard.main.read` | refusal | not retrieved |
| kitne students enrolled hain? | ur-Latn | `dashboard.main.read` | refusal | no_matching_capability |
| school ka aaj kya haal hai? | ur-Latn | `dashboard.main.read` | refusal | not_a_request |
| subah ke numbers do | ur-Latn | `dashboard.main.read` | refusal | no_matching_capability |
| paisa abhi tak nahi mila | ur-Latn | `fee.cancellation.raise` | refusal | not_a_request |
| do dafa bill bana tha aur dono jama ho gaye | ur-Latn | `fee.credit.raise` | needs_input | fee.payment.record |
| family ne paisa de diya hai, wo wapas karo | ur-Latn | `fee.credit.raise` | refusal | no_matching_capability |
| jurmana jama ho chuka hai, wapas karo | ur-Latn | `fee.credit.raise` | needs_input | fee.latefee.waive |
| ye bill kam kar do | ur-Latn | `fee.credit.raise` | refusal | no_matching_capability |
| what's the total outstanding across the school | en | `fee.overdue.list` | plan | dashboard.main.read |
| ye family kitna deti hai? | ur-Latn | `fee.overdue.list` | invalid | NOT_A_MISSING_PARAMETER |
| is family ko fees ka reminder karo | ur-Latn | `fee.reminder.send` | refusal | no_matching_capability |
| message the over-90-day defaulters | en | `fee.reminder.send` | refusal | no_matching_capability |
| bacha bina fees diye chala gaya, ab kuch nahi hoga | ur-Latn | `fee.writeoff.propose` | refusal | not_a_request |
| das hazaar se zyada wale nadehindagan kaun hain | ur-Latn | `fee.overdue.list` | invalid | VALUE_NOT_IN_SENTENCE |
| Hamza ka duplicate bill nikal do | ur-Latn | `fee.cancellation.raise` | refusal | no_matching_capability |
| saal bhar se 18000 mang rahe hain, ab nahi milenge | ur-Latn | `fee.writeoff.propose` | refusal | no_matching_capability |

## Sentences to refuse that were acted on (1)

| sentence | lang | contract intent | planned |
|---|---|---|---|
| fees ka dashboard kholo | ur-Latn | dashboard.module.view | dashboard.main.read |
