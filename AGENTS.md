# Agent Guidelines

Every AI agent working on this project must follow these rules:

- **Stack**: React 18 + Vite + Tailwind + React Router + Supabase. Do not add new frameworks or UI libraries without asking.
- **File Scope**: Only edit files that the task names. Never refactor unrelated files.
- **Database Access**: All database access goes through `src/lib/api/*`. Pages never call supabase directly.
- **Naming Conventions**: DB columns are `snake_case`, JS objects are `camelCase`; convert only in `src/lib/api`.
- **Migrations**: Any DB change = a new numbered file in `supabase/migrations/`. Never edit old migrations.
- **Security**: Never put service_role key or payment secrets in frontend code. Secrets live only in Supabase Edge Functions.
- **Verification**: After every task run `npm run build` and `npm run lint` and fix all errors before finishing.
- **Demo Mode**: Keep demo mode working when Supabase env vars are empty.
