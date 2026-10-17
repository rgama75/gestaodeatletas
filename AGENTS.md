<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Athlete data lives in Lovable Cloud and is cached client-side by src/lib/store.ts; sections are schema-driven from src/lib/schema.ts so new fields/sections are added by config, not new components.
- Confidential sections (schema `confidential: true`) are stored in athlete_finance and storage path prefix `financeiro/`, both restricted by RLS to admin/gestor — never put financial data in athletes.sections.
- The first account to sign up becomes admin (DB trigger); later sign-ups become scout until an admin changes them.
- Spreadsheet import uses a shared client-side parser and dialog, validates against PROFILE_FIELDS, and saves through actions.createAthlete so manual and imported athletes share authenticated RLS, ownership, audit, and cache updates.
