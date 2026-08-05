---
name: Invoice settings architecture
description: Shared persisted invoice branding and custom-field settings used by generation and previews.
---

Invoice branding, layout, labels, and numbering settings are stored as a singleton PostgreSQL record and exposed through the typed invoice-settings API, rather than browser-only state. The settings include the new-invoice prefix and starting number, title, issuer details, footer, logo value (public URL or validated image data URL), and repeatable label/text custom fields.

**Why:** Invoice generation and document previews need the same values after reloads and across pages, while browser-local settings would diverge between users and sessions.

**How to apply:** Add future invoice presentation options to the shared settings contract and consume them in both rent generation and individual invoice document rendering. The starting invoice number is used only when a company has no invoices yet; changing it must not renumber existing invoices or interrupt an established sequence. Uploaded logos are selected in Settings, limited to PNG/JPG/WEBP/SVG and 2 MB, then saved with the settings. Keep the enlarged logo treatment consistent across the browser previews and PDF export.