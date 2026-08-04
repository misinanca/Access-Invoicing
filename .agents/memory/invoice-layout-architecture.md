---
name: Invoice layout architecture
description: Persistent company-scoped invoice section ordering, visibility, labels, and custom content.
---

Invoice presentation is modeled as an ordered list of built-in and custom sections in the shared company invoice-settings record. Built-in sections cover the header, customer/date details, custom fields, line items, totals, notes, and footer; custom sections provide an editable label and text content.

**Why:** Settings must survive reloads and company switching, and the browser preview and downloaded PDF must show the same document structure instead of maintaining separate layout logic.

**How to apply:** Add future invoice presentation controls to the shared settings/API contract, preserve the default section list for existing companies, and route both HTML preview and PDF generation through the saved ordered list. Keep layout settings company-scoped.