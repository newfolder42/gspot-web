# gspot-web

Web application for a Georgia-focused photo guessing and discovery game.

Users can browse posts, guess where a photo was taken, comment, earn XP and achievements, and participate in zones/leaderboards.

This repository is a Next.js App Router application. The actual app root is `src/`, so all Node.js commands in this README should be run from that directory.

## Quick Summary

This section is intentionally compact and explicit so both humans and LLMs can orient quickly.

- App type: Next.js 16 server-rendered web app
- Language: TypeScript
- Package manager: npm
- Runtime root: `src/`
- Database: PostgreSQL
- Auth: NextAuth credentials flow
- Maps: Mapbox GL JS loaded client-side
- Storage: AWS S3 signed uploads
- Optional integrations: Redis pub/sub, email provider, AWS CloudWatch logging
- Companion service: `gspot-services` consumes Redis events from this app
- Styling: Tailwind CSS 4

## Features

- Public and authenticated feed views
- Email/password sign-in with NextAuth
- Signup flow with OTP email verification
- Password reset via OTP
- Photo/location guessing gameplay
- Post comments and notifications
- XP, achievements, and leaderboard-like progression
- Zone exploration and zone membership features
- S3-backed media upload flow

## UI Conventions

- User aliases are rendered with a leading apostrophe for display consistency, e.g. `&apos;newfolder42`.

## Tech Stack

- Next.js 16
- React 19
- TypeScript 5
- PostgreSQL with `pg`
- `node-pg-migrate` for schema migrations
- NextAuth 4 for authentication
- Tailwind CSS 4
- Redis 5 for event publishing
- AWS SDK v3 for S3 and CloudWatch integrations
- Zod for validation in parts of the app

## Repository Layout

```text
repo/
  src/                  # Actual application root
    app/                # Next.js App Router routes and API handlers
    actions/            # Server actions for feed, comments, zones, etc.
    components/         # UI components and feature components
    lib/                # Database, auth, email, storage, search, utilities
    migrations/         # node-pg-migrate migration files
    config/             # Migration config files and helper scripts
    public/             # Static assets
    types/              # Shared TypeScript types
```

## Prerequisites

- Node.js 20 or newer
- npm
- Docker Desktop or another PostgreSQL instance
- A Mapbox token for map features

## Local Development

1. Change into the app directory.

```bash
cd src
```

1. Install dependencies.

```bash
npm install
```

1. Start PostgreSQL.

```bash
docker compose up -d postgres
```

1. Create `src/.env.local` manually with the variables from the next section.

1. Run database migrations.

```bash
npx node-pg-migrate up -f config/dev_db.json
```

1. Start the development server.

```bash
npm run dev
```

1. Open the app.

```text
http://localhost:3000
```

## Environment Variables

Create `src/.env.local` for local development.

Minimum useful local setup:

```env
POSTGRES_HOST=localhost
POSTGRES_DB=gspot_db
POSTGRES_USER=username
POSTGRES_PASSWORD=password
POSTGRES_SSL=false

NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=replace-with-a-long-random-secret

NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=replace-with-your-mapbox-token

EMAIL_PROVIDER=console
```

Additional variables used by the codebase:

```env
# Email
EMAIL_PROVIDER=resend
EMAIL_PROVIDER_KEY=replace-with-provider-api-key

# Redis
REDIS_URL=redis://localhost:6379

# S3 uploads
AWS_REGION=eu-central-1
S3_BUCKET=your-bucket-name
AWSS3_ACCESS_KEY_ID=your-access-key
AWSS3_SECRET_ACCESS_KEY=your-secret-key

# CloudWatch logging
AWSCW_ACCESS_KEY_ID=your-access-key
AWSCW_SECRET_ACCESS_KEY=your-secret-key
```

Environment variable notes:

- `EMAIL_PROVIDER` defaults to `console`, which is the easiest local-development mode.
- `POSTGRES_SSL=false` is important for local Postgres unless your database requires SSL.
- `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` is required for map-based UI.
- Redis is used by the event bus and can be treated as optional for basic local development.
- S3 and CloudWatch credentials are only needed if you want those integrations working locally.

## Database

The app uses PostgreSQL and stores migrations in `src/migrations/`.

Available migration config files:

- `config/dev_db.json` for local development
- `config/prod_db.json` for production migration targeting

Run local migrations:

```bash
npx node-pg-migrate up -f config/dev_db.json
```

Run production migrations:

```bash
npx node-pg-migrate up -f config/prod_db.json
```

Recommendation: move production credentials out of committed JSON config and into environment-based deployment secrets if this repository is still actively maintained.

## Auth Model

- Sign-in uses NextAuth credentials provider
- Sessions use JWT strategy
- Signup creates a pending registration first
- Email OTP verification completes registration
- Password reset also uses OTP email delivery

Relevant code locations:

- `app/api/auth/[...nextauth]/route.ts`
- `lib/auth.ts`
- `lib/otp.ts`
- `lib/session.ts`

## Storage, Maps, and Events

- Maps are rendered with Mapbox GL JS and rely on `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
- File uploads use presigned S3 URLs generated in `lib/s3.ts`
- Event publishing uses Redis channels in `lib/eventBus.ts`
- Logging is sent to CloudWatch in `lib/logger.ts`

## Companion Repository

This web app is part of a multi-repo setup.

- `gspot-web` is the user-facing Next.js application
- `gspot-services` is a separate background-service repository
- `gspot-web` publishes Redis events on `gspot:*` channels
- `gspot-services` subscribes to those events and performs asynchronous side effects

At a high level, `gspot-services` handles work triggered by events thrown by `gspot-web`, including:

- notifications
- XP changes
- achievement checks
- leaderboard updates
- scheduled cleanup and email jobs

In this repository, the main event publisher is `lib/eventBus.ts`. Current event producers include post, comment, connection, and profile-photo related flows.

## Available npm Scripts

```bash
npm run dev
npm run build
npm run start
npm run lint
```

What they do:

- `dev`: run the Next.js development server
- `build`: create a production build
- `start`: run the production server
- `lint`: run ESLint

## Docker

This repository includes:

- `docker-compose.yml` for local PostgreSQL
- `Dockerfile` for building the Next.js app image

Start the local database only:

```bash
docker compose up -d postgres
```

Build the app image:

```bash
docker build --build-arg NEXTAUTH_SECRET=replace-me --build-arg NEXTAUTH_URL=http://localhost:3000 --build-arg NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN=replace-me -t gspot-web .
```

Run the container:

```bash
docker run -p 3000:3000 gspot-web
```

Note: the production container still needs access to the runtime environment variables required for database access and any optional integrations you enable.

## Development Notes

- The repository root is not the Node.js app root; use `src/`.
- There is currently no dedicated npm migration script, so use `npx node-pg-migrate ...` directly.
- Email delivery is easiest to test locally with `EMAIL_PROVIDER=console`.
- Map features will not work correctly without a valid public Mapbox token.

## LLM-Oriented Context

If you are an LLM or using one to assist on this repository, use the following assumptions first:

```yaml
project_name: gspot-web
app_root: src
framework: nextjs-app-router
language: typescript
package_manager: npm
database: postgres
auth: next-auth-credentials-plus-otp-registration
maps: mapbox-gl-js
uploads: aws-s3-presigned-urls
companion_repo:
  name: gspot-services
  role: consumes Redis events emitted by gspot-web and runs background handlers
migrations: node-pg-migrate
styling: tailwindcss-v4
dev_start:
  - cd src
  - npm install
  - docker compose up -d postgres
  - npx node-pg-migrate up -f config/dev_db.json
  - npm run dev
key_paths:
  routes: src/app
  server_actions: src/actions
  shared_lib: src/lib
  ui_components: src/components
  migrations: src/migrations
```

When changing this codebase, prefer:

- reading `src/package.json` before assuming available scripts
- reading `src/lib/` for integration details
- treating PostgreSQL as required infrastructure
- treating `gspot-services` as the background event consumer for Redis-driven side effects
- treating Redis, S3, email provider, and CloudWatch as integration-specific dependencies

## Operational Reference

The repository includes `config/scripts.cmd` with example migration commands and a journal query used in deployment operations.

## License

See `../LICENSE`.
