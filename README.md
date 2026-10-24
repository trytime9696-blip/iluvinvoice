# iluvinvoice.net Books — GST invoicing workspace

A polished, responsive India-first invoicing frontend and deploy-oriented technical foundation. The brand in the brief was a placeholder (`[BRAND NAME]`), so this build uses **iluvinvoice.net** throughout.

## Run locally

Requires Node.js 20+; there are no third-party runtime dependencies.

```bash
npm test
npm start
```

Open `http://localhost:4173/` for the workspace or `/landing` for the public marketing page. The local HTTP server binds to `0.0.0.0` for preview environments and serves an allowlist of public files with basic security headers.

## What works in this preview

- Responsive business dashboard, invoice list, customer and product masters, revenue view, template chooser, business profile and theme toggle.
- Invoice editor with a live A4 view, document types, customer lookup, saved products, configurable tax/cess presets, place-of-supply based intra/inter-state split, reverse-charge field, discounts, payment balance, amount in words and duplicate actions.
- Payment activity view with full/partial receipt recording, balance and invoice-status updates. Email reminders open a pre-filled email draft; copying an invoice summary is also supported. These actions do not transfer funds or send mail automatically.
- Integer-paise `BigInt` monetary and payment-state calculations with automated tests in `domain/gst.test.js` and `domain/payment.test.js`.
- Drafts, sample records, preferences, and Pro preview state persist in this browser's local storage. Sample data is fictitious.
- Free-plan preview and print output visibly include a diagonal **Created with iluvinvoice.net** watermark. The simulated Pro toggle removes it and previews logo/signature placement.
- Print stylesheet formats A4. The browser print dialog can save to PDF. This is **client-side print-to-PDF**, not a server-generated PDF service.
- Marketing, pricing, FAQ and legal placeholder routes; sitemap and robots files are included.
- Relational PostgreSQL starting migration in `db/migrations/001_initial.sql`, including tenant-aware entities, numeric money columns, unique business/financial-year invoice numbers, audit log, subscriptions/payments, template entitlements, and sample RLS policies.

## Important — not yet a commercial production service

This is a **frontend product foundation**, not a production-ready hosted SaaS. The following features are not implemented in this build and are not represented as working: authentication, email/phone verification, password reset, server/API, persistent database integration, server-side authorization/entitlement checks, payment provider, subscription lifecycle, server-side PDF generation, email/share delivery, private object storage, administrator console, support workflow, government GSTIN verification, GST return filing, e-invoicing/IRN, e-way bill, or government QR generation.

The local demo plan switch and watermark are presentation behavior only. A user can modify local storage or frontend code. **Do not use real customer, personal, tax or bank data; do not deploy or sell this preview as a secure billing product.** The sample GST/rate presets are editable starter values, not legal advice or an authoritative current ruleset. Confirm current GST treatment, HSN/SAC, Rule 46 requirements, numbering and record retention with a qualified adviser before issuing statutory invoices.

The privacy, terms and refund pages intentionally identify themselves as placeholders. Replace and have them reviewed; do not collect data or accept payment until this is done.

## Production implementation path

1. **API and identity**: Add a typed API service (e.g. Node/TypeScript) with Argon2id password hashes, verified-email/phone flows, short-lived sessions in Secure/HttpOnly/SameSite cookies, CSRF protections, password reset tokens, rate limits, abuse controls and role checks. No credentials in browser storage.
2. **Tenant authorization**: Scope every read/write by the authenticated user's business membership. Set `app.user_id` only in a trusted server transaction. Add authorization tests for cross-tenant IDOR and admin-only operations; never trust IDs, plan status, watermark flags or role claims from the browser.
3. **Persistence and migrations**: Apply the PostgreSQL migration through a migration runner; add migration rollback/backup strategy, `updated_at` triggers, immutable issued-invoice rules, admin audit events and tested RLS policies. Review the migration with a DBA/security engineer before production.
4. **Tax domain**: Store versioned, effective-dated tax configurations and approved classification catalogs. Keep a reviewed source/change log, preserve the applied rate/rule snapshot on each issued invoice, and require confirmation for manual overrides. Current frontend rules only demonstrate a basic supplier-state/place-of-supply split.
5. **Entitlements and billing**: Query active subscription state on every protected server action. Integrate Razorpay (or another supported provider) with server-created orders/subscriptions, signature-verified webhooks, idempotency keys, reconciliation, failed-payment/grace-period handling, cancellation, receipts and entitlement tests. Never unlock Pro based on a client flag.
6. **PDF and files**: Render PDFs on the server from validated invoice snapshots. Add a server-enforced Free watermark that cannot be disabled by request parameters; Pro PDFs are clean only after an entitlement check. Validate, scan, resize and store uploaded logos/signatures in private object storage; use short-lived signed URLs.
7. **Operations**: Add admin APIs/UI with elevated role checks, audit logs, monitoring, alerting, backups, restore drills, dependency scanning, secret management, CSP/headers at the edge, retention/deletion workflows and incident response.
8. **Launch/compliance**: Complete reviewed privacy/terms/refund/support disclosures, domain/canonical metadata, provider configuration, accessibility checks, performance budgets, observability, load testing and security review. Replace the placeholder host in `sitemap.xml` and `robots.txt`.

## Structure

```text
app.js                 Interactive browser app
styles.css             Workspace design system, responsive + print styles
landing.html/css/js    Public marketing site
privacy/terms/...      Clearly marked launch-policy placeholders
domain/gst.js          Paise-based invoice arithmetic
domain/payment.js      Payment status and outstanding-balance logic
domain/gst.test.js     GST/money automated tests
db/migrations/         PostgreSQL relational schema + RLS foundation
server.mjs             Allowlisted static preview server
```

The website deliberately does not claim GST filing, government verification, IRNs, QR approvals, or verified tax classifications.
