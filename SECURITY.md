# Security Rules

These rules apply to every task in this project. No exceptions.

## Secrets
- Never hardcode API keys, tokens, passwords, or service credentials in any file.
- All secrets go in `.env`. Never commit `.env`.
- `.env` must appear in `.gitignore` before the first commit — verify with `git status`.
- `.env.example` contains only placeholder values (e.g. `YOUR_API_KEY_HERE`), never real keys.
- Never log secrets to the console or terminal output.
- Do not read `.env` unless explicitly authorized by Ed.
- If a secret is pasted in plain text in a message, stop and flag it immediately.
- GHL PITs are secrets — treat them the same as API keys.
- GHL PITs do NOT work for Ad Publishing endpoints; OAuth is required there.

## Git
- Review the diff before accepting large changes.
- Never force-push to main or production branches without explicit approval.
- Never skip pre-commit hooks (`--no-verify`) unless Ed explicitly requests it.
- Never commit `.env`, lockfile diffs caused by secret leaks, or large binaries.
- All work on `dev` branch — never commit directly to `master`.

## Authentication
- Use environment variables for all service credentials.
- OAuth tokens and PITs are secrets — treat them the same as API keys.

## Data
- Never write to production BUC GHL contacts, pipelines, or live n8n workflows without testing first.
- Never write to production BUC Closer Form tabs without validating on a test tab first.
- Validate all changes against a test copy / test contact before applying to production.
- Row-level security (RLS) must be enabled on all Supabase tables.
- Every Supabase query must enforce org/user scoping — no unscoped reads or writes.

## Dependencies
- Do not install packages without explicit approval from Ed.
- Do not modify `package.json` or lockfiles without approval.

## Code
- No `eval()`, no `dangerouslySetInnerHTML` with unsanitized input.
- Validate all external input at system boundaries (user input, webhooks, GHL payloads).
- SQL queries must use parameterized statements — no string concatenation.
