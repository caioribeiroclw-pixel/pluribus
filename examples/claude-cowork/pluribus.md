# Identity

We are the **Orbital** engineering team — 5 backend engineers building a multi-tenant SaaS platform for logistics operations.

We use Claude Code heavily for code review, pair programming, and greenfield feature work. Claude is treated as a senior team member, not a code autocomplete tool. It attends PR reviews, writes tests, and proposes architectural changes.

**Team:**
- **Ana (tech lead):** owns architecture decisions, API design, and final approval on schema changes
- **Bruno:** payment integrations, billing engine
- **Clara:** logistics domain, route optimization
- **Diego:** infrastructure, observability, CI/CD
- **Elena:** frontend (React + TypeScript), design system

All engineers use Claude Code. Shared conventions apply to all AI-assisted work.

# Stack

- **Language:** TypeScript 5.4 (strict mode)
- **Runtime:** Node.js 22 LTS
- **Framework:** NestJS 10 (REST API) + Fastify adapter
- **Database:** PostgreSQL 16 via `drizzle-orm`
- **Message queue:** BullMQ + Redis 7
- **Testing:** Jest 29 + Supertest; coverage threshold: 80% on all PRs
- **Linting:** ESLint flat config (team-shared config in `packages/eslint-config`)
- **Formatting:** Prettier (2-space indent, single quotes, trailing commas)
- **Package manager:** pnpm + workspaces monorepo
- **CI/CD:** GitHub Actions — lint, test, type-check on every PR; deploy to staging on merge to `main`
- **Auth:** JWT (access) + refresh tokens; role-based access control (RBAC)
- **Monitoring:** OpenTelemetry → Grafana Cloud
- **No raw SQL in application code** — all queries through drizzle-orm schema types

# Conventions

## Code

- `async/await` only — no `.then()/.catch()`
- No class decorators for business logic — NestJS decorators only for DI wiring
- No `any` — `unknown` with explicit narrowing
- Error handling: use the shared `AppError` class from `packages/core/errors`; never throw plain strings or generic `Error`
- Named exports — no default exports, no barrel files unless explicitly discussed
- File naming: `kebab-case.ts`; NestJS modules follow `<feature>.module.ts`, `<feature>.service.ts` etc.
- No circular dependencies — enforce with `eslint-plugin-import`

## Testing

- Unit tests for all service methods with side effects
- Integration tests for all controller endpoints using Supertest
- Test factories in `test/factories/` — never construct objects manually in tests
- No `jest.mock()` at module level — use dependency injection and pass mocks through constructor
- Test descriptions: `describe('<Unit>', () => { it('<should do X when Y>', ...) })`

## Pull Requests

- PRs must be < 400 lines changed (excluding generated files and migrations)
- Every PR needs at least one test covering the new behavior
- PR description: fill the template (What, Why, How, Risk, Test plan)
- Migrations must be reviewed by Ana before merge — tag `@ana/tech-lead` in the PR
- No self-merging — at least one approval required
- Draft PRs are welcome for early feedback; mark ready when CI passes

## AI-Assisted Code Review

When Claude is used for PR review:
- Focus on correctness, type safety, and convention violations — not style (Prettier handles that)
- Always check for missing error handling in async paths
- Flag any SQL written outside drizzle-orm types
- Check that new endpoints have corresponding integration tests
- Do not approve PRs with failing tests, regardless of context

## Branching

- `main` → production
- `staging` → staging environment (auto-deploy)
- Feature branches: `feat/<ticket-id>-<short-description>`
- Hotfix branches: `hotfix/<ticket-id>-<short-description>`
- Never commit directly to `main` or `staging`

# Goals

1. Ship reliable features — correctness over speed; a broken feature costs more than a slow one
2. Maintain a consistent codebase across 5 engineers — conventions enforce shared quality, not personal preference
3. PR cycle time < 24h — fast reviews unblock the team; slow reviews kill momentum
4. Zero production incidents from merged code — staging catches what tests miss
5. Knowledge sharing — Claude should help junior team members learn through its explanations, not just generate code

# Constraints

- Never approve or suggest merging a PR with failing CI
- Never write raw SQL — always use drizzle-orm schema types and query builder
- Never commit secrets or environment variables to the repository
- Do not add direct dependencies without an ADR (Architecture Decision Record) in `docs/adr/`
- Never bypass RBAC — new endpoints must declare their required role
- Never modify migration files after they've been applied to staging or production
- Do not suggest patterns that require `@ts-ignore` or `@ts-expect-error`
- No singleton state outside of NestJS module providers — no module-level mutable variables

# Workflow

## Feature Development

1. Pick ticket from the sprint board
2. Create feature branch: `feat/<ticket-id>-<description>`
3. Write tests first for complex domain logic (TDD preferred in logistics domain)
4. Open PR as Draft early — tag relevant reviewers
5. When CI passes → mark PR as Ready for Review
6. One approval + all checks green → merge to `main`
7. Monitor staging deploy; check observability dashboard

## Code Review Checklist

When reviewing (human or AI-assisted):

- [ ] Does it have tests covering the new behavior?
- [ ] Are errors handled correctly (using `AppError`)?
- [ ] Is the TypeScript type coverage complete (no `any`)?
- [ ] Are there any raw SQL queries?
- [ ] Does it respect RBAC for new endpoints?
- [ ] Is the PR < 400 lines?
- [ ] Is the PR description filled out?
- [ ] Are new dependencies justified?

## ADR Process

Any new library, architectural pattern, or significant deviation from convention requires an ADR:
- File: `docs/adr/YYYY-MM-DD-<slug>.md`
- Sections: Context, Decision, Alternatives considered, Consequences
- Reviewed asynchronously; Ana signs off on architectural ADRs

# Anti-patterns

- **Fat controllers:** Business logic belongs in services, not in NestJS controllers
- **Barrel files that re-export everything:** They make refactoring hard and break tree-shaking
- **Test isolation via `jest.clearAllMocks()` in `afterEach`:** Use proper DI and scoped mocks instead
- **Migrations with data transforms:** Schema changes and data migrations are separate PRs
- **Optimistic locking without retries:** If you use `version` columns for optimistic concurrency, you must handle the retry loop
- **`console.log` in production code:** Use the shared `logger` from `packages/core/logger`
- **Returning 200 for business errors:** Use proper HTTP status codes + `AppError` with `httpStatus` field