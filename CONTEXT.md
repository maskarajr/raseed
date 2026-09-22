# Raseed — locked context

## Source of truth

- GitHub `maskarajr/raseed` is source of truth.
- Origin `pixelmoose/raseed` is a mirror only. Push there lands on GitHub.
- Do not treat Origin as the native repo. Native Origin repo is gone.
- Do not use the old cloud agent whose Origin token is still scoped to that deleted repo.
- GitHub default branch: `main` (`b8c1c3d` — cash-advance drop, collect on invoice).
- Vercel demo branch: `demo` (`778afcf`). That tip is already inside `main`; SHAs are not identical.
- Keep `main` for local Windows/SQLite. Hosted Turso demo stays on `demo` (`docs/DEMO-VERCEL.md`).

## Payments (product lock)

- Cash advance is removed. No advance field on order submit.
- Orders are cash on delivery.
- Collect on the invoice only: part payment or full settlement.
- Never credit: no credit terms, credit sales, credit limits, due dates, or installments.
- Unpaid `Balance due` / `To collect` is outstanding collection, not a credit facility.

## Archive (do not redo)

- GitHub PRs **#1–#5** are closed archives of Origin PRs whose heads still differ from `main`. Leave them closed.
- GitHub issue **#6** is the closed index of Origin PRs already inside `main` / `demo`. Keep it. Do not delete or reopen.
- Review threads from Origin were not copied.

## Agent routing

- Open PRs against GitHub `maskarajr/raseed`.
- Do not create Origin-native PRs or talk to the deleted Origin repo token.
