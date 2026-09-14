# Retrieval eval with real intents

Generated 2026-09-14 12:31 UTC by `make ai-eval`. Every sentence was decomposed by `claude-haiku-4-5-20251001`, and retrieval searched with its intents on the stress index (489 capabilities indexed). Model `BAAI/bge-m3@5617a9f61b028005a4858fdac845db406aefb181`, candidate cap 30.

Decompose answered 175 of 175 sentences within the rules (175 intents; split into more than one: 0). 0 broke a rule and retrieve nothing here.

| | n | recall@30 | @1 | @3 | @5 | MRR |
|---|---:|---:|---:|---:|---:|---:|
| all sentences, through intents | 175 | **96.6%** | 55.4% | 78.3% | 82.9% | 0.681 |
| English, through intents | 63 | **96.8%** | 60.3% | 82.5% | 85.7% | 0.719 |
| Roman Urdu, through intents | 112 | **96.4%** | 52.7% | 75.9% | 81.2% | 0.660 |

Confusable clusters arrived whole in 163 of the 163 queries that retrieved any member.

By expected capability:

| | n | recall@30 | @1 | @3 | @5 | MRR |
|---|---:|---:|---:|---:|---:|---:|
| dashboard.main.read | 20 | **75.0%** | 45.0% | 55.0% | 65.0% | 0.540 |
| fee.cancellation.raise | 25 | **100.0%** | 32.0% | 68.0% | 72.0% | 0.518 |
| fee.credit.raise | 26 | **100.0%** | 53.8% | 69.2% | 80.8% | 0.650 |
| fee.latefee.waive | 19 | **100.0%** | 94.7% | 100.0% | 100.0% | 0.974 |
| fee.overdue.list | 21 | **100.0%** | 66.7% | 100.0% | 100.0% | 0.817 |
| fee.payment.record | 22 | **100.0%** | 40.9% | 81.8% | 86.4% | 0.605 |
| fee.reminder.send | 20 | **100.0%** | 95.0% | 95.0% | 95.0% | 0.958 |
| fee.writeoff.propose | 22 | **95.5%** | 27.3% | 63.6% | 68.2% | 0.472 |

Hardest sentences (the intents searched; fused rank worse than 3, at most 25):

| sentence | lang | expected | fused rank | top 3 | in top 30 |
|---|---|---|---:|---|---|
| Find out how many students are enrolled | ur-Latn | `dashboard.main.read` | - | `report.student.run`, `student.place`, `readmission.reactivate` | **no** |
| Provide the morning attendance numbers | ur-Latn | `dashboard.main.read` | - | `report.attendance.run`, `admission.test.mark`, `exam.paper.attendance.correct` | **no** |
| Record that 18000 outstanding for a year will not be collected | ur-Latn | `fee.writeoff.propose` | - | `fee.plan.request`, `withdrawal.property.record`, `pickup.release.refuse` | **no** |
| Find the number of pending card requests | en | `dashboard.main.read` | 52 | `pickup.queue.read`, `staff.attendance.manualmark.start`, `pickup.scans.refused.read` | **no** |
| Asking how things are at the school today | ur-Latn | `dashboard.main.read` | 38 | `pickup.card.request`, `stock.request.approve`, `account.reactivate` | **no** |
| Inquire about how the school is doing today | en | `dashboard.main.read` | 36 | `asset.disposals.read`, `assets.read`, `asset.disposal.approve` | **no** |
| Report that money has not been received yet | ur-Latn | `fee.cancellation.raise` | - | `fee.payment.correction.raise`, `stock.cashreturned.record`, `fee.refund.raise` | yes |
| Waive the amount as the family is unknown and their house is empty | ur-Latn | `fee.writeoff.propose` | 55 | `fee.latefee.waive`, `admission.invite.resend`, `fee.plan.request` | yes |
| Take back the incorrect bill that was created | ur-Latn | `fee.cancellation.raise` | 53 | `stock.request.withdraw`, `asset.verification.correction.return`, `account.reactivate` | yes |
| Waive the old outstanding balance because the father has passed away and there is no income | en | `fee.writeoff.propose` | 34 | `fee.refund.raise`, `card.replace`, `payslip.mine.read` | yes |
| Confirm that two bills were made and both have been paid in | ur-Latn | `fee.credit.raise` | 16 | `fee.refund.pay`, `finance.voucher.pay`, `fee.writeoff.reverse` | yes |
| Hold the extra amount paid on the account instead of refunding | en | `fee.credit.raise` | 15 | `fee.refund.pay`, `certificate.hold.release`, `fee.refund.return` | yes |
| Refund the fine that has been paid | ur-Latn | `fee.credit.raise` | 14 | `expulsion.clearance.settle`, `fee.latefee.waive`, `fee.refund.pay` | yes |
| Waive the outstanding amount because the family's phone is off and their address is empty | en | `fee.writeoff.propose` | 14 | `fee.plan.request`, `fee.latefee.waive`, `fee.overdue.list` | yes |
| Cancel this | ur-Latn | `fee.cancellation.raise` | 11 | `exam.cancel`, `leave.request.cancel`, `staff.leave.cancel` | yes |
| Create a write-off | ur-Latn | `fee.writeoff.propose` | 11 | `fee.writeoff.approve`, `fee.writeoff.return`, `website.item.write` | yes |
| Payment has been received for Ayesha's invoice | ur-Latn | `fee.payment.record` | 11 | `fee.payment.correction.approve`, `payroll.run.release`, `fee.invoice.issue` | yes |
| Correct the charge that was wrong | ur-Latn | `fee.cancellation.raise` | 10 | `fee.payment.correction.raise`, `exam.paper.attendance.correct`, `asset.update` | yes |
| Credit the invoice | ur-Latn | `fee.credit.raise` | 10 | `fee.batch.reverse`, `fee.credit.approve`, `fee.challan.generate` | yes |
| Return the money the family paid | ur-Latn | `fee.credit.raise` | 8 | `fee.refund.raise`, `fee.writeoff.reverse`, `fee.payment.record` | yes |
| Show a brief collection report | ur-Latn | `dashboard.main.read` | 8 | `pickup.collection.verify`, `report.operational.run`, `pickup.collections.read` | yes |
| Check how much cash is on hand | ur-Latn | `dashboard.main.read` | 7 | `stock.advance.issue`, `stock.cashreturned.record`, `finance.voucher.pay` | yes |
| Received stamped copy from bank for challan CH-2026-0417 | ur-Latn | `fee.payment.record` | 7 | `fee.challan.generate`, `branch.update`, `paper.question.add` | yes |
| Send a request to the principal to clear Rehan's 2024 outstanding fees | ur-Latn | `fee.writeoff.propose` | 7 | `fee.latefee.policy.return`, `fee.reminder.send`, `fee.structure.return` | yes |
| Inform that a student has left without paying fees | ur-Latn | `fee.writeoff.propose` | 6 | `fee.reminder.send`, `fee.overdue.list`, `quiz.student.absent` | yes |
