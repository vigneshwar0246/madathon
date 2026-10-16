# How to Run Rework-Aware

This guide explains how to install, configure, run, demonstrate, test, and connect the Rework-Aware application.

Use [README.md](./README.md) for the architecture and feature inventory. Use this file when you want to operate the project.

## Project completion status

The local project implementation is complete for demonstration and automated validation. The repository currently includes:

- Four role-specific portals: Employee, Team Lead, Manager, and Finance Admin.
- Demo mode with seeded browser-local data and Supabase mode with authenticated persistent data.
- Organisation onboarding, memberships, invitations, compensation, projects, modules, tasks, defects, work logs, reviews, notifications, audit events, payroll proposals, and immutable payroll snapshots.
- Server routes with authenticated context, organisation membership checks, Zod validation, and role-aware database functions.
- Seven ordered Supabase migrations with RLS policies, indexes, lifecycle transitions, workflow RPCs, notification functions, and finance finalisation rules.
- Repeatable type, build, database, browser, and live-auth smoke checks.
- Repeatable provisioning of four confirmed demo accounts when the server-only demo flag is enabled.

This guide covers both supported run modes and the complete demonstration and validation workflows. A real Supabase project, real accounts, production policy review, and deployment configuration are still required before production use; see [Current production limitations](#11-current-production-limitations).

## 1. Requirements

Install:

- Node.js 20.9 or newer.
- npm.
- A Supabase project for authenticated persistent mode.
- PowerShell on Windows, or an equivalent shell on another operating system.

Check Node and npm:

```powershell
node --version
npm --version
```

The repository currently uses Next.js 16, React 19, TypeScript, Supabase, and PGlite.

## 2. Install dependencies

From the repository root:

```powershell
cd 'D:\projects D\MADATHON26'
npm install
```

Do not run `npm install` inside `frontend` or `backend`. The package manifest is at the repository root.

## 3. Choose a run mode

There are two supported modes.

### Demonstration mode

Use this to review the portals without configuring Supabase.

- The Employee store uses seed data and browser `localStorage`.
- The Team Lead, Manager, and Finance portal pages can be opened directly for UI demonstration.
- The login form cannot authenticate without Supabase.
- Data changes made through demo-capable components are local to the browser.
- Demo data is not shared between browsers or users.
- Demo data is not a substitute for database workflow testing.

### Supabase mode

Use this to run the intended authenticated application.

- Supabase Auth handles identity and sessions.
- PostgreSQL stores the shared records.
- Memberships determine roles.
- RLS protects reads.
- Server routes and database RPCs protect mutations.
- Data is shared between authorised portal users.

## 4. Configure Supabase mode

### 4.1 Create or select a Supabase project

Open the Supabase dashboard and select the project that should hold the Rework-Aware data.

From **Project Settings -> API**, copy:

- Project URL.
- Publishable key beginning with `sb_publishable_`.

Do not copy a service-role key into a browser environment variable.

### 4.2 Create the local environment file

Copy the template:

```powershell
Copy-Item 'frontend\.env.example' 'frontend\.env.local'
```

Edit `frontend/.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_YOUR_KEY
```

Keep the actual values private. The `.env.local` file must not be committed.

The optional `SUPABASE_SECRET_KEY` is server-only and should only be configured if the invitation implementation requires it:

```env
SUPABASE_SECRET_KEY=sb_secret_YOUR_KEY
```

Never prefix a secret key with `NEXT_PUBLIC_`.

### 4.3 Seed four confirmed demo accounts

The demo seed uses the Supabase Admin Auth API. It does not disable email confirmation for normal users and does not put the secret key in browser code. Run it from PowerShell with the Supabase project URL and server-only secret key:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL = "https://YOUR_PROJECT_REF.supabase.co"
$env:SUPABASE_SECRET_KEY = "sb_secret_YOUR_SERVER_ONLY_KEY"
$env:DEMO_ACCOUNTS_ENABLED = "true"
npm run demo:accounts
```

The command is safe to repeat: it updates the four demo passwords, ensures their email addresses are confirmed, and upserts their memberships in `Rework-Aware Demo Workspace`.

Demo credentials:

| Portal | Email | Password |
| --- | --- | --- |
| Employee | `employee.demo@demo.rework-aware.test` | `Demo.Employee.2026!` |
| Team Lead | `lead.demo@demo.rework-aware.test` | `Demo.TeamLead.2026!` |
| Manager | `manager.demo@demo.rework-aware.test` | `Demo.Manager.2026!` |
| Finance | `finance.demo@demo.rework-aware.test` | `Demo.Finance.2026!` |

Open `http://localhost:3100/login`, use one of the credentials, and select the matching portal role. The server validates the role from the Supabase membership; selecting a different role does not grant access. These are demonstration credentials only and must be replaced or deleted before a public deployment.

The signup page also has a **Create demo portal accounts** button when `DEMO_ACCOUNTS_ENABLED=true`. It uses the same server-only provisioning path. Do not enable this setting in production.

### 4.4 Apply database migrations

In the Supabase SQL Editor, run each file as a separate query in this order:

```text
backend/database/migrations/20261016080000_foundation.sql
backend/database/migrations/20261016081000_workflows.sql
backend/database/migrations/20261016082000_invitations.sql
backend/database/migrations/20261016083000_employee_task_submission.sql
backend/database/migrations/20261016084000_finance_finalisation.sql
backend/database/migrations/20261016085000_finance_workflow.sql
backend/database/migrations/20261016086000_workflow_notifications.sql
```

Confirm that each query succeeds before running the next one. Do not reset or drop the existing project database.

The migrations create the shared organisation, membership, project, task, defect, time, payroll, notification, audit, and snapshot structures. They also create the role-checked database functions used by the API.

### 4.5 Configure Auth redirects

In Supabase **Authentication -> URL Configuration**, add:

```text
http://localhost:3000/auth/callback
```

Add the production callback URL before deployment. Keep email confirmation enabled when testing the verified-email workflow.

## 5. Start the development server

```powershell
cd 'D:\projects D\MADATHON26'
npm run dev
```

Open:

```text
http://localhost:3000
```

The root route redirects to `/dashboard`. In Supabase mode, workspace routes require a valid session and membership. Use `/login` for the four-role portal entry point. The shared workspace sections are `/dashboard`, `/projects`, `/tasks`, `/bugs`, `/time-logs`, `/approvals`, `/payroll`, `/payslips`, `/analytics`, `/employees`, `/organisation`, `/audit-logs`, `/notifications`, and `/settings`.

To use a different development port:

```powershell
npm run dev -- -p 3001
```

## 6. Start the production build

Build first:

```powershell
npm run build
```

Start the production server on the port expected by the browser smoke tests:

```powershell
npm run start -- -p 3100
```

Open:

```text
http://localhost:3100
```

Stop the server with `Ctrl+C`.

## 7. Demonstration workflow without Supabase

Use this workflow to review the presentation and local Employee functionality.

### 7.1 Open the portals

Open these URLs directly:

```text
http://localhost:3000/employee
http://localhost:3000/lead
http://localhost:3000/manager
http://localhost:3000/finance
```

Without Supabase variables, these pages use the local demonstration behavior. The login form itself correctly explains that authentication is not configured.

### 7.2 Employee demonstration

1. Open `/employee`.
2. Review the overview cards and recent activity.
3. Open My Tasks.
4. Search and filter tasks.
5. Open a task detail.
6. Start or submit a permitted task transition.
7. Open Rework and Defects.
8. Inspect the linked original task, severity, corrective hours, and decision state.
9. Open Work Logs.
10. Submit a normal development log or corrective maintenance log.
11. Confirm invalid dates, empty descriptions, non-positive hours, and excessive hours are rejected.
12. Open Payroll and change the selected month.
13. Open Reports and apply report filters.
14. Open Notifications and mark one or all notifications as read.
15. Open Profile, edit allowed fields, save, cancel, and refresh the page.

Demo-only profile and clarification data is stored in browser localStorage. It is not shared with another browser.

### 7.3 Team Lead demonstration

1. Open `/lead`.
2. Review team tasks, defects, and pending hours.
3. Open the task assignment form.
4. Select a project, module, employee, deadline, priority, and description.
5. Save the assignment.
6. Review the updated task list.
7. Approve a pending work-log entry.
8. Open the linked defect form.
9. Select an eligible completed delivery and submit a defect.
10. Open Fix Verification and verify an under-fix defect.

In Supabase mode, these actions call authenticated APIs and refresh the shared database snapshot. In demo mode, the store behavior is browser-local.

### 7.4 Manager demonstration

1. Open `/manager`.
2. Review project oversight and reopened-task metrics.
3. Open the defect decision queue.
4. Select a pending defect.
5. Choose `Eligible for Finance review` or `Exempt`.
6. Enter a meaningful justification of at least 15 characters.
7. Save the decision.
8. Review the quality metrics and audit trail.

Manager decisions do not finalise payroll. They only determine whether a defect may proceed to Finance review.

### 7.5 Finance demonstration

1. Open `/finance`.
2. Review the Finance overview.
3. Select a work month.
4. Review the payroll period and proposal queue.
5. Approve a proposal, or return/reject it with a reason.
6. Open Payroll Batches and inspect the period status.
7. Open Employee Payroll and review authorised employee records.
8. Open Payslips and inspect finalised snapshots.
9. Review Exceptions and Audit Trail.
10. Finalise a payroll period only after all open proposals have been resolved.

In Supabase mode, finalisation is performed by the protected `finalise_payroll` database function. It creates immutable payroll snapshots and blocks unresolved, held, or disputed proposals.

## 8. Full live Supabase demonstration workflow

This workflow requires four verified Supabase users with trusted memberships:

- One Employee.
- One Team Lead.
- One Manager.
- One Finance Admin.

An Owner can create the organisation and invite users. Invitations create pending invitation records; the invitation recipient still needs to sign up using the invited email and complete verification.

### 8.1 Create the Owner workspace

1. Open `/signup`.
2. Register with a real test email.
3. Complete email verification.
4. Sign in through `/login`.
5. Create an organisation in `/onboarding`.
6. Confirm that the Owner membership exists in `memberships`.

### 8.2 Provision the other roles

Use the People/invitation workflow or the existing invitation endpoint to create memberships for:

- `employee`
- `team_lead`
- `manager`
- `payroll_admin`

Confirm that every user uses a distinct verified email and that each membership belongs to the intended organisation.

Do not manually trust a browser role selector. The role must exist in the database membership record.

### 8.3 Workflow A: Team Lead assignment

1. Sign in as Team Lead.
2. Select an authorised project and module.
3. Select an authorised active employee.
4. Enter task details and a future committed date.
5. Save the assignment.
6. Confirm the task exists in `tasks`.
7. Confirm the assignment history exists in `task_events`.
8. Confirm an audit record exists in `audit_events`.
9. Confirm the assigned employee receives a `task_assignment` notification.
10. Sign in as Employee and confirm the task appears in My Tasks.
11. Confirm an unrelated employee cannot see the task through their permitted data.

### 8.4 Workflow B: Employee work logging

1. Sign in as Employee.
2. Open an assigned task.
3. Start the task if its lifecycle allows it.
4. For normal development, submit a log without a defect.
5. For corrective maintenance, select a verified or under-fix linked defect.
6. Enter a valid date, description, and positive hours.
7. Submit the log.
8. Confirm the record is `pending`.
9. Confirm it appears in the Team Lead review queue.
10. Confirm it is not automatically included in approved payroll deductions.

The database rejects unauthorised task ownership, invalid defect links, future dates, invalid hours, and daily totals over the configured limit.

### 8.5 Workflow C: Team Lead review

1. Sign in as Team Lead.
2. Open Hours Approval.
3. Approve or reject the pending work log.
4. Confirm the authoritative `time_entries.review_status` changes.
5. Confirm `reviewed_by` and `reviewed_at` are recorded.
6. Confirm the Employee receives a review notification.
7. Confirm an audit event is recorded.
8. Confirm the Employee sees the updated status after refresh.

Self-approval is rejected by the database.

### 8.6 Workflow D: Manager defect decision

1. Sign in as Team Lead and report a defect against a completed delivery.
2. Verify the defect and move it into the permitted corrective lifecycle.
3. Sign in as Employee and log corrective work against the defect.
4. Have Team Lead approve the corrective work log.
5. Sign in as Manager.
6. Open the defect decision queue.
7. Record `Eligible` or `Exempt` with a meaningful reason.
8. Confirm the decision is stored in `rework_reviews`.
9. Confirm the audit event is present.
10. Confirm exempt defects are excluded from eligible Finance proposals.
11. Confirm the Manager has not directly finalised payroll.

### 8.7 Workflow E: Finance payroll finalisation

1. Sign in as Finance Admin.
2. Create a payroll draft for a first-of-month work period.
3. Confirm only approved corrective work linked to eligible Manager decisions enters the proposal set.
4. Review each proposal.
5. Approve, return, or reject proposals as appropriate.
6. Resolve every `notice_pending`, `notified`, `disputed`, or `held` proposal.
7. Confirm the period is ready for finalisation.
8. Use the finalise action.
9. Confirm the database creates one immutable `payroll_snapshots` row per active employee.
10. Confirm `payroll_periods.status` becomes `finalised`.
11. Confirm `finalised_at` and the `payroll.finalised` audit event exist.
12. Sign in as Employee and confirm the employee can read only their own finalised snapshot.
13. Change an underlying task or defect and confirm the historical snapshot does not silently change.

Finalised payroll is a historical snapshot. Corrections should use an explicit supplementary or adjustment workflow rather than editing the snapshot.

## 9. Run validation checks

The following commands are the repository's repeatable completion checks. Run them after installing dependencies and configuring any environment required by the selected test.

Run type validation:

```powershell
npm run lint
```

Run the database migration, RLS, lifecycle, payroll, and notification smoke tests:

```powershell
npm run test:database
```

Start the production server in a separate PowerShell window:

```powershell
npm run start -- -p 3100
```

Then run the protected-route browser smoke test:

```powershell
npm run test:frontend
```

Run the live authentication guard smoke test:

```powershell
npm run test:live-auth
```

Build the production application:

```powershell
npm run build
```

Recommended complete sequence:

```powershell
npm run lint
npm run test:database
npm run build
npm run start -- -p 3100
```

In another terminal:

```powershell
npm run test:frontend
npm run test:live-auth
```

Expected results:

- `npm run lint` completes without TypeScript errors.
- `npm run test:database` applies all seven migrations and prints the database smoke success message.
- `npm run build` completes a production Next.js build.
- `npm run test:frontend` confirms the workspace routes, project creation, defect linking, corrective time, and approval queue.
- `npm run test:live-auth` confirms unauthenticated users reach sign-in instead of demo data.

## 10. Troubleshooting

### Port 3000 or 3100 is already in use

Use another development port:

```powershell
npm run dev -- -p 3001
```

The browser smoke scripts expect port 3100 by default, so use port 3100 for those tests or update the test configuration intentionally.

### The app says authentication is not configured

Check that `frontend/.env.local` exists and contains both:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...
```

Restart the Next.js server after changing environment variables.

### A protected route redirects to login

Check:

1. The user is signed in.
2. The Supabase session has not expired.
3. The email is verified.
4. The user has a membership row for the target organisation.
5. The membership role matches the requested portal.
6. The local callback URL is configured in Supabase Auth.

### The workspace is empty

In Supabase mode, confirm that:

- All seven migrations ran successfully.
- The authenticated user belongs to an organisation.
- The user has a matching employee and membership record.
- The selected organisation ID is valid.
- RLS policies are enabled.

### Payroll finalisation is blocked

Review the proposal statuses. The database intentionally blocks finalisation if any proposal is:

- `notice_pending`
- `notified`
- `disputed`
- `held`

Resolve or explicitly cancel unsupported proposals before trying again.

### Demo changes disappeared

Demo data is stored in the browser's localStorage. Clearing site data, using a different browser, or using a private window creates a different demo state. Demo mode is not shared persistence.

## 11. Current production limitations

The local implementation and its documented checks are complete. Before production use, complete these external or extended tasks:

- Apply all seven migrations to the real Supabase project.
- Test all four roles with real verified accounts.
- Validate the end-to-end workflow against live data.
- Configure company payroll policy and statutory rules.
- Add production PDF payslip/report generation if required.
- Add full persisted exception and clarification workflows if required.
- Configure and test authorised realtime subscriptions if required.
- Use HTTPS and production callback URLs.

Do not treat sample/demo values, browser localStorage, proposed deductions, or development smoke tests as legal payroll processing.
