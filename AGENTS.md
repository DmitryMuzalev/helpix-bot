# Repository Guidelines

## Project

- This project is a Telegram bot for collecting technical support requests.
- Supabase provides the database and Edge Functions.
- Write Edge Functions in TypeScript.
- Keep tokens, credentials, and other secrets out of the repository.

## Architecture

- Keep each Edge Function entry point thin: parse the request, call a use case, and return a response.
- Put shared business rules and types in `supabase/functions/_shared/domain`.
- Put application use cases in `supabase/functions/_shared/application`.
- Put Telegram and database integrations in `supabase/functions/_shared/adapters`.
- Keep environment configuration and dependency wiring in `supabase/functions/_shared/infrastructure`.
- Dependencies must point inward: domain code must not depend on other layers; application code may depend on the domain, but not on adapters or infrastructure.
- Pass external dependencies into use cases rather than importing integrations directly.
- Keep database changes in Supabase migrations. Do not define the same schema separately in application code.

## Verification

- After changing TypeScript, JavaScript, or JSON files, run `npm.cmd run lint` and `npm.cmd run format:check`.
- After changing an Edge Function, also run the project's TypeScript check once that command has been configured.
- Report any check that could not be run and why.

## Commits

- Do not create Git commits unless the user explicitly asks for one.
- Follow Conventional Commits: `type(scope): description`. Omit the scope when it adds no value.
- Use an appropriate type such as `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, or `test`.
- Write the description in English, lowercase, imperative mood, without a trailing period.
- Mark breaking changes with `!` and explain them in the commit body.
- Before creating a commit, show the proposed commit message unless the user has already provided it.
