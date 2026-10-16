# Rework-Aware

Rework-Aware is a Next.js application for tracking delivery work, corrective maintenance, defect responsibility, work-log approvals, and payroll deduction proposals.

The project contains four role-specific portals backed by one shared domain model:

1. Employee
2. Team Lead
3. Manager
4. Finance Admin

The application supports a browser-only demonstration mode and a Supabase-connected mode. Demonstration mode is useful for reviewing the UI and employee workflows. Supabase mode is the intended mode for authenticated, persistent, multi-user workflows.

## Project completion status

As of October 16, 2026, the repository contains a complete local implementation of the core Rework-Aware workflow. The application can be installed, type-checked, built, exercised through browser smoke tests, and validated against an in-memory PostgreSQL-compatible database.

Completed in the repository:

- A Next.js 16 and React 19 workspace with loading, error, not-found, authentication, onboarding, role portals, and shared workspace states.
- Employee, Team Lead, Manager, and Finance Admin portal experiences.
- Demo mode with seeded local data and browser-local persistence.
- Supabase mode with session handling, organisation bootstrap, membership-based role routing, and persistent workspace data.
- Seven ordered database migrations covering the schema, RLS, workflow functions, invitations, employee task submission, finance workflow, payroll finalisation, notifications, and audit events.
- Validated task assignment and lifecycle transitions from assignment through submission and completion.
- Defect reporting, verification, corrective work logging, Team Lead review, Manager responsibility decisions, and audit history.
- Payroll draft generation, proposal response workflow, unresolved-proposal blocking, and immutable finalised payroll snapshots.
- Server-side demo-account provisioning for four confirmed role accounts when explicitly enabled.
- API request validation, authenticated organisation context, role checks, protected mutations, and notification read state.
- Type validation, production build, database smoke coverage, protected-route browser smoke coverage, and unauthenticated live-auth guard coverage.

The remaining items listed under [Important production limitations](#important-production-limitations) are deployment, policy, or optional product-hardening steps. They are not missing pieces of the local demonstration and test implementation.

## What the application does

Rework-Aware connects the following records:

```text
Organisation
  -> Employees and memberships
  -> Projects
      -> Modules
          -> Tasks
              -> Defects
                  -> Corrective work logs
                      -> Team Lead review
                          -> Manager responsibility decision
                              -> Finance payroll proposal
                                  -> Finalised payroll snapshot
```

The system keeps the following principles:

- The database membership role, not a browser-selected role, controls portal access.
- Employees can work only with their own assigned tasks, work logs, decisions, and payroll records.
- Team Leads and Managers use validated database functions for workflow changes.
- Finance Admin actions are restricted by server-side role checks and database functions.
- Pending or rejected work is not automatically treated as a payroll deduction.
- Manager eligibility decisions and Finance payroll decisions are separate.
- Finalised payroll snapshots are stored separately from live task and defect data.
- Audit events are append-only for normal application users.
- Supabase Row Level Security protects organisation and role-scoped data.

## Technology stack

- Next.js 16 App Router
- React 19
- TypeScript 5.9
- Supabase Auth
- Supabase PostgreSQL
- Supabase SSR and browser clients
- PostgreSQL Row Level Security
- Zod request validation
- Recharts dependency for data visualisation surfaces
- Lucide React and Phosphor icons
- DM Sans and Manrope typography
- PGlite database smoke tests
- Playwright-based browser smoke test dependencies

The repository is organised as a frontend/backend monorepo:

```text
.
├── frontend/
│   ├── src/app/             Next.js routes and API adapter
│   ├── src/components/      Portal and shared UI components
│   ├── src/features/        Workspace feature modules
│   ├── src/lib/             Stores, auth, Supabase clients, and types
│   ├── tests/               Browser smoke tests
│   └── .env.example         Supabase environment template
├── backend/
│   ├── api/                 Authenticated request context and errors
│   ├── routes/              Server API handlers
│   ├── database/migrations/ PostgreSQL schema, RLS, RPCs, and workflows
│   ├── supabase/            Server Supabase client
│   └── tests/               PGlite database smoke tests
├── shared/
│   └── types.ts             Shared domain types
├── package.json
└── HOW_TO_RUN.md
```

## Completed application surfaces

The shared workspace currently exposes these authenticated sections:

`/dashboard`, `/projects`, `/tasks`, `/bugs`, `/time-logs`, `/approvals`, `/payroll`, `/payslips`, `/analytics`, `/employees`, `/organisation`, `/audit-logs`, `/notifications`, and `/settings`.

The authentication and setup surfaces are `/login`, `/signup`, `/auth/callback`, and `/onboarding`. The root URL redirects to `/dashboard`. Role-specific portals are available at `/employee`, `/lead`, `/manager`, and `/finance`.

## Portals and routes

### Shared authentication

- `/login` - common email/password sign-in page
- `/signup` - Supabase account creation
- `/auth/callback` - authentication callback
- `/onboarding` - organisation creation for a new owner

The login page includes Employee, Team Lead, Manager, and Finance Admin role labels for identification. The selected label never grants access. After authentication, the trusted membership role returned by the database determines the destination.

### Employee Portal

- `/employee`
- `/employee/overview`
- `/employee/tasks`
- `/employee/rework`
- `/employee/logs`
- `/employee/payroll`
- `/employee/reports`
- `/employee/notifications`
- `/employee/profile`

Implemented employee capabilities include:

- Dashboard metrics and activity.
- Assigned task listing and task lifecycle actions.
- Search, status, priority, project, sorting, and pagination controls.
- Task detail and linked defect information.
- Reopened work and corrective maintenance visibility.
- Work-log creation with task, date, description, type, defect, and hours validation.
- Separation of normal development hours and corrective hours.
- Payroll estimates based on approved eligible records.
- Report filtering and browser export surfaces.
- Notification read state.
- Profile editing in the demonstration store.
- Local clarification-request history in the demonstration store.
- Supabase bootstrap and live task/work-log operations when connected.

### Team Lead Portal

- `/lead`

Implemented Team Lead capabilities include:

- Team task overview.
- Task assignment form for project, module, employee, title, deadline, priority, and description.
- Submitted task completion.
- Corrective work-log approval and rejection through the shared API.
- Linked defect creation.
- Fix verification.
- Supabase-backed task, defect, and time-review workflows.
- Assignment and work-review notifications generated by database functions.

### Manager Portal

- `/manager`

Implemented Manager capabilities include:

- Project and delivery oversight.
- Reopened task metrics.
- Corrective-hours review queue.
- Defect responsibility decision queue.
- Eligible-for-Finance and Exempt decisions.
- Mandatory decision justification.
- Severity filtering.
- Reopen-rate and corrective-hour metrics.
- Approved versus exempt decision counts.
- Audit trail display.

Manager decisions do not finalise payroll. They only create the authorised eligibility decision used by the Finance workflow.

### Finance Admin Portal

- `/finance`

Implemented Finance capabilities include:

- Monthly payroll period selection.
- Payroll draft preparation.
- Payroll review queue.
- Proposal approval.
- Proposal return for correction.
- Proposal rejection with a required reason.
- Payroll batch status display.
- Authorised employee payroll directory.
- Finalised payroll snapshot display.
- Payroll exception counts.
- Finance audit trail.
- Finance access/profile information.
- Payroll finalisation after database validation.

Finance finalisation is restricted to `owner` and `payroll_admin` membership roles. The finalisation function blocks unresolved, disputed, or held proposals and creates immutable employee payroll snapshots.

## Backend API surface

The Next.js API adapter preserves `/api/...` URLs while dispatching to backend handlers.

Important endpoints include:

- `POST /api/bootstrap`
- `POST/PATCH /api/tasks`
- `POST/PATCH /api/bugs`
- `POST/PATCH /api/time-entries`
- `POST /api/reviews`
- `GET/POST /api/payroll`
- `POST /api/payroll/proposals`
- `POST /api/payroll/finalise`
- `POST /api/payroll/respond`
- `POST /api/notifications/read`
- `POST /api/projects`
- `POST /api/organisations`
- `POST /api/employees/invite`
- `POST /api/employees/compensation`

Every protected mutation obtains the authenticated Supabase user, verifies organisation membership, validates request data with Zod, checks the role, and calls a database function where the operation is sensitive.

## Database migrations

Apply these migrations in this exact order:

1. `backend/database/migrations/20261016080000_foundation.sql`
2. `backend/database/migrations/20261016081000_workflows.sql`
3. `backend/database/migrations/20261016082000_invitations.sql`
4. `backend/database/migrations/20261016083000_employee_task_submission.sql`
5. `backend/database/migrations/20261016084000_finance_finalisation.sql`
6. `backend/database/migrations/20261016085000_finance_workflow.sql`
7. `backend/database/migrations/20261016086000_workflow_notifications.sql`

The migrations provide:

- Organisations, employees, memberships, and compensation.
- Projects, modules, tasks, task history, defects, and defect history.
- Work logs and review statuses.
- Rework responsibility decisions.
- Payroll periods and deduction proposals.
- Immutable payroll snapshots.
- Notifications and audit events.
- Invitation acceptance.
- Role-checked RPC functions.
- Task lifecycle transitions.
- Employee task submission from `under_fix`.
- Finance proposal decisions and payroll finalisation.
- Assignment and time-review notifications.
- RLS policies and indexes.

## Data and security model

The application uses public Supabase tables with RLS enabled. The main access rules are:

- Organisation and membership reads require membership.
- Compensation is visible to Finance Admin/Owner or the employee whose compensation it is.
- Work logs are visible to authorised reviewers or the owning employee.
- Payroll periods and proposals are visible to Finance Admin/Owner or the relevant employee.
- Notifications are visible only to their recipient.
- Audit events are visible to authorised management and finance roles.
- Database RPCs enforce role checks and workflow transitions.
- Service-role and secret keys are not used in browser code.

Use `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` only for the browser publishable key. Never put a Supabase secret key, service-role key, database password, or private token in a `NEXT_PUBLIC_` variable.

## Environment configuration

Copy `frontend/.env.example` to `frontend/.env.local`.

Required for Supabase mode:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Optional server-only invitation configuration:

```env
SUPABASE_SECRET_KEY=sb_secret_YOUR_KEY
```

Do not commit `frontend/.env.local`.

If the two public Supabase variables are absent, the portal components use the local demonstration store. The login page still reports that authentication is not configured because real sign-in requires Supabase.

## Available commands

```powershell
npm install
npm run dev
npm run build
npm run start -- -p 3100
npm run lint
npm run test:database
npm run test:frontend
npm run test:live-auth
```

`npm run test:frontend` and `npm run test:live-auth` expect a running server at `http://localhost:3100` unless the test scripts are changed.

## Current verification status

The repository includes and documents the following completed checks:

- TypeScript validation with `npm run lint`.
- All seven migrations applied in the PGlite smoke environment.
- Tenant-isolation and role-denial database checks.
- Task lifecycle checks.
- Defect and corrective-time checks.
- Duplicate-safe payroll draft checks.
- Assignment notification creation.
- Production build with `npm run build`.
- Protected-route browser smoke test.
- Unauthenticated live-auth smoke test.

Run the commands in [HOW_TO_RUN.md](./HOW_TO_RUN.md#9-run-validation-checks) to repeat the checks in a fresh environment. Browser checks require Microsoft Edge and a running server on port 3100.

## Important production limitations

The local implementation is connected and testable, but the following require a real Supabase project and real provisioned accounts before production use:

- Apply all seven migrations to the intended remote Supabase project.
- Test one verified account for each role.
- Verify live cross-portal workflows with real records.
- Configure production callback URLs and HTTPS.
- Configure company payroll policy and statutory rules with qualified review.
- Add production PDF payslip and Finance report generation if downloadable documents are required.
- Add full live exception and clarification persistence if those workflows need more than the current proposal status model.
- Add realtime subscriptions only after validating authorised channel policies.

This application does not claim statutory payroll compliance, automatic legal deductions, bank payment execution, or legal validity of salary calculations.

## Further instructions

For the complete installation, Supabase setup, demonstration workflow, live workflow, validation sequence, and troubleshooting steps, read [HOW_TO_RUN.md](./HOW_TO_RUN.md).
