---
name: Invoice settings architecture
description: Shared persisted invoice branding and custom-field settings used by generation and previews.
---

Invoice branding and layout settings are stored as a singleton PostgreSQL record and exposed through the typed invoice-settings API, rather than browser-only state. The settings include the new-invoice prefix, title, issuer details, footer, logo URL, and repeatable label/text custom fields.

**Why:** Invoice generation and document previews need the same values after reloads and across pages, while browser-local settings would diverge between users and sessions.

**How to apply:** Add future invoice presentation options to the shared settings contract and consume them in both rent generation and individual invoice document rendering.