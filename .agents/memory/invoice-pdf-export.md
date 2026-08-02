---
name: Invoice PDF export
description: Client-side invoice PDF downloads preserve the branded invoice document and filename convention.
---

Invoice downloads are generated client-side by rendering the standalone invoice document in an isolated iframe, capturing it with html2canvas, and saving an A4 PDF with jsPDF. The filename combines the invoice number and line-item description.

**Why:** A direct HTML download was not sufficient for the requested PDF output, while client-side rendering avoids adding a server-side document-generation service.

**How to apply:** Keep invoice detail and invoice-list download actions routed through the shared PDF generator so branding, custom fields, totals, and filenames remain consistent.