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
