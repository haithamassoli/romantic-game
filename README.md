# معًا (Maʿan)

A free Arabic (RTL, mobile-first) website for consenting adult couples: an illustrated sex-position guide plus couple games (challenge cards, choice wheel, desire match, position discovery, night path, challenge library), played on one device or on two phones. Couples need no account. Each partner sets limits in secret, and only what both accept is shown. Product spec: [docs/PRD.md](docs/PRD.md). Milestones: [docs/tasks.md](docs/tasks.md). Launch status and open decisions: [docs/launch.md](docs/launch.md).

## Stack

- Next.js 16 (App Router), React 19, Tailwind CSS 4, with the design system in `app/globals.css`
- [Convex](https://convex.dev) for content, two-phone sessions (real-time), and the publisher admin (`convex/`)
- Biome (lint/format), `node:test` (tests), Lefthook (git hooks), pnpm

## Develop

```bash
pnpm install
npx convex dev   # first run: log in and pick/create a deployment; writes NEXT_PUBLIC_CONVEX_URL to .env.local; keeps pushing convex/ on save
pnpm dev         # http://localhost:3000
```

Seed the content: the 16 publisher-owned drawings, plus cards, challenges and desires. Seeding is insert-only, so re-running never overwrites edits made in `/admin`:

```bash
npx convex run seed:positions
npx convex run seed:activities
# rewrite chosen seeded items from the source (keeps their status):
npx convex run seed:positions '{"refresh":["spooning"]}'
```

## Publisher admin (`/admin`)

`/admin` has no accounts. It asks for `ADMIN_TOKEN`, an environment variable on the Convex deployment (at least 32 characters). Admin functions refuse every call while it is unset.

```bash
npx convex env set ADMIN_TOKEN "$(openssl rand -base64 32)"   # create, or rotate
npx convex env get ADMIN_TOKEN                                 # read it when signing in
```

Rotating the token signs out every open admin tab on its next call. Add `--prod` to target the production deployment. Never commit the token.

## Checks

```bash
pnpm format   # Biome, writes fixes
pnpm check    # lint + typecheck + tests (pnpm test runs node:test on lib/ and scripts/)
pnpm build
```

Lefthook lints staged files on commit and runs `pnpm check` before push. CI (`.github/workflows/ci.yml`) runs `pnpm check` and `pnpm build`.

## Deploy

1. `npx convex deploy`, then set `ADMIN_TOKEN` with `--prod` and run the seeds with `--prod`.
2. On the web host, set `NEXT_PUBLIC_CONVEX_URL` (the production deployment) and `SITE_URL` (the public address, used for absolute share-image links).
3. Before a public launch, see [docs/launch.md](docs/launch.md): launch countries and age-verification requirements, and third-party images that must be removed.
