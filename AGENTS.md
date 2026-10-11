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

## Naming conventions

Use consistent naming across the project.

- React components: `PascalCase`, including component filenames.
  - `UserProfile.tsx`
  - `UserAvatar.tsx`
- Custom hooks: `camelCase` and must start with `use`, including hook filenames.
  - `useUser.ts`
  - `useAuth.ts`
  - `useOutsideClick.ts`
- Functions and variables: `camelCase`.
  - `getUserData`
  - `handleSubmit`
  - `userName`
- Boolean variables: use semantic prefixes such as `is`, `has`, `can`, or `should`.
  - `isLoading`
  - `isOpen`
  - `hasAccess`
  - `canEdit`
  - `shouldRender`
- Types, interfaces, enums: `PascalCase`.
  - `User`
  - `UserProfileProps`
  - `UserRole`
- Constants that are truly global/static: `UPPER_SNAKE_CASE`.
  - `MAX_RETRY_COUNT`
  - `DEFAULT_TIMEOUT`
- Folders: `kebab-case`.
  - `user-profile`
  - `account-management`
- CSS class names: `kebab-case`.
  - `user-profile`
  - `submit-button`
- Routes and URL segments: `kebab-case`.
  - `/user-profile`
  - `/account-management`
- Event props should usually use `on...`.
  - `onClick`
  - `onDelete`
  - `onSubmit`
- Internal event handlers should usually use `handle...`.
  - `handleClick`
  - `handleDelete`
  - `handleSubmit`

Always follow the existing conventions of the repository if they differ from these defaults.
Do not introduce a new naming style into an existing codebase without a clear reason.

Project-specific conventions:

- Project-authored React components and custom hooks use the filename styles above.
- Preserve shadcn/ui filenames and library-defined props such as `asChild`.
- Preserve Supabase's `_shared` folder, timestamped migration filenames, and tool entry points such as `index.ts` and `main.tsx`.
- Preserve database columns, API payload fields, and Telegram fields such as `client_id`, `sent_at`, and `chat_id`; local variables still use `camelCase`.
- Preserve Tailwind utility syntax and router parameter syntax such as `$clientId`.
- Preserve `_` for intentionally unused callback parameters.
- Runtime configuration objects, service instances, and variant functions use `camelCase`; `const` alone does not make a value a global/static constant.

## Verification

- After changing TypeScript, JavaScript, or JSON files, run `npm run lint` and `npm run format:check`.
- After changing an Edge Function, also run the project's TypeScript check once that command has been configured.
- Report any check that could not be run and why.

## Commits

- Do not create Git commits unless the user explicitly asks for one.
- Follow Conventional Commits: `type(scope): description`. Omit the scope when it adds no value.
- Use an appropriate type such as `feat`, `fix`, `refactor`, `chore`, `docs`, `style`, or `test`.
- Write the description in English, lowercase, imperative mood, without a trailing period.
- Mark breaking changes with `!` and explain them in the commit body.
- Before creating a commit, show the proposed commit message unless the user has already provided it.
