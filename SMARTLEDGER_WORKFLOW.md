# SmartLedger Workflow

SmartLedger is a browser-based expense and deposit review workspace. The demo uses fictional data and stores review decisions in the browser's local storage.

## Workflow

1. **Load the working queue**
   - The system loads the fictional ledger dataset.
   - Only expenses without a review decision appear in the open action queue.
   - The queue is ordered with the newest unresolved expenses first.

2. **Prioritize exceptions**
   - Each open expense includes an AI-confidence percentage.
   - Records below 95% confidence are marked **ALERT**.
   - The dashboard summarizes open reviews, alert records, amount in review, and linked receipts.

3. **Inspect a transaction**
   - Select an expense from the queue, the full ledger, or the review-velocity chart.
   - The detail view shows vendor, amount, tax, category, client, date, confidence, and receipt availability.
   - Linked receipts can be opened from the detail view.

4. **Make an operator decision**
   - An operator can **Approve & enter** or **Reject & return to sender**.
   - The decision is written to the browser-local demo state.
   - The item leaves the working queue after a decision is recorded.

5. **Preserve the audit trail**
   - Approved and rejected records remain in the complete expense ledger.
   - The full ledger supports search, category filtering, status filtering, and sorting.
   - The audit-trail view is the system-of-record destination for complete history.

6. **Review cash history**
   - Client deposits are shown separately in reverse chronological order.
   - Deposit totals provide a simple view of received cash across fictional client accounts.

## Operating rules

- The action queue is for unresolved work only.
- Low-confidence submissions should be inspected before approval.
- Every decision should be made from the transaction detail view after reviewing the available receipt and record facts.
- The demo is intentionally browser-local and fictional; it does not persist to a production accounting system.


## Planned live AI automation layer

The production SmartLedger workflow can extend beyond manual review with live AI-assisted automations:

1. **Scan the intake channels**
   - Monitor configured email inboxes and other approved submission channels.
   - Identify expense submissions, receipts, invoices, and related correspondence.
   - Prevent duplicate processing by matching messages, attachments, vendors, amounts, and prior records.

2. **Extract and classify**
   - Read attachments and email context to extract vendor, amount, tax, date, client or matter, category, payment details, and supporting notes.
   - Classify the submission and calculate a confidence score.
   - Link the submission to the correct client, matter, project, or accounting record when the match is reliable.

3. **Respond automatically to the submitter**
   - Send an acknowledgement when a submission is received.
   - Request missing information or a clearer receipt when required.
   - Confirm the current status after approval, rejection, or payment submission.
   - Keep the outbound message and delivery result in the audit history.

4. **Route by confidence and policy**
   - Auto-process routine, high-confidence submissions that satisfy configured policy rules.
   - Route low-confidence, unusual, duplicate, incomplete, or policy-sensitive items to an operator.
   - Require human approval for actions that exceed thresholds or create financial, compliance, or client risk.

5. **Submit approved items for payment**
   - Prepare and transmit approved expenses to the configured payment or accounting system.
   - Record the submission timestamp, destination, payment reference, amount, and resulting status.
   - Notify the submitter and relevant internal owners when payment submission succeeds or fails.

6. **Monitor exceptions and follow up**
   - Detect failed delivery, missing documentation, duplicate claims, changed payment details, overdue approvals, and payment errors.
   - Create follow-up tasks and send reminders according to policy.
   - Escalate unresolved exceptions to the appropriate owner.

7. **Maintain an end-to-end audit trail**
   - Record the original email or submission, extracted fields, AI confidence, automation actions, human decisions, messages sent, payment events, and errors.
   - Preserve clear handoffs between AI automation and human operators.
   - Make every automated action reviewable from the ledger and audit-trail views.

### Production guardrails

- Automations operate only on approved inboxes, systems, and data scopes.
- Payment submission remains policy-controlled, with human approval where required.
- AI-generated classifications and messages are logged and can be corrected.
- Sensitive actions use role-aware access, validation, idempotency checks, and failure-safe retries.
- The current demo remains fictional and browser-local; these live automations describe the intended production workflow.
