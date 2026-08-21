# Job Scam Shield — web version

Open `index.html` in any modern web browser. The site is entirely static and does not need an installation, an API key, or a server.

It adapts the supplied Android project into a browser experience with:

- rule-based job-offer checks for common scam patterns;
- recruiter email/domain mismatch prompts;
- saved scan history stored only in the current browser;
- a 20-rule safety guide, dark theme, and a print-friendly result view.
- a responsive sign-in and account-creation interface with live validation, password visibility controls, a reset-password dialog, and an OAuth-ready Google button.

The authentication screen is a front-end demonstration. It creates only a temporary browser-session profile and never stores the password. A deployed production version needs a secure authentication provider, server-side validation, hashed password storage, CSRF protection, rate limiting, and a transactional email service for password resets.

This is a risk-screening aid, not a service that can verify employers or prove whether an offer is legitimate. Always use official company contact details before sharing sensitive information or money.
