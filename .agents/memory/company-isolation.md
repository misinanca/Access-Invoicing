---
name: Company isolation
description: Multi-company data ownership and selection behavior for the invoicing application.
---

Every company-owned record must be scoped by the selected company ID on the server; the frontend persists that selection and sends it with API requests.

**Why:** Company switching must prevent records, invoice branding, numbering, and nested line-item operations from crossing company boundaries.

**How to apply:** Add the company predicate to reads, updates, deletes, and nested ownership checks. Keep invoice numbering unique within each company, and initialize settings per company rather than treating them as one global singleton.