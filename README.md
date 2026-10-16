# Vetra workspace

Vetra is a Next.js application for project and module delivery, defects, corrective time, responsibility reviews, and payroll proposals. Its backend uses authenticated API routes and Supabase PostgreSQL functions with row level security. The source is split by product feature in `src/features`, API route in `src/app/api`, and database migration in `supabase/migrations`.

## Local setup

Requires Node.js 20.9 or newer and a [Supabase project](https://supabase.com/dashboard/projects).

1. Open Supabase **Project Settings → API Keys**. Copy the Project URL and the publishable key (`sb_publishable_...`).
2. Copy `.env.example` to `.env.local` and replace `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Keep `.env.local` private. No secret key is required for the current invitation workflow: users sign up with the invited email address.
3. Open **SQL Editor** in the same Supabase project. Run these files in this order, each as a separate query: `supabase/migrations/20261016080000_foundation.sql`, `20261016081000_workflows.sql`, `20261016082000_invitations.sql`. Check that all three succeed. Alternatively, use the [Supabase CLI migration workflow](https://supabase.com/docs/guides/local-development/cli-workflows) after logging in and linking the project.
4. In **Authentication → URL Configuration**, add your local URL (`http://localhost:3000/auth/callback`) to the redirect allow list. For deployed hosting, add the production callback URL as well. Keep email confirmation enabled.
5. Run:

```powershell
cd 'D:\projects D\MADATHON26'
npm install
npm run dev
```

Open `http://localhost:3000`, create an account, verify the email, and create an organisation. Invite coworkers from **People**; they sign up with the same verified email address. The app accepts pending invitations at first sign in. The invitation UI creates a record but does not email invitations yet, so the workspace owner needs to share the signup URL through their normal channel.

With no Supabase values, the app uses a browser saved demo workspace. Production deployments must set both environment variables; otherwise the demo view remains available.

## Roles and data

Owners manage invitations, compensation, and payroll drafts. Managers and team leads assign work and review defects and time. Employees can update their assigned tasks, log their own time, and respond to their own payroll proposals. Payroll administrators can see compensation and draft proposals. Database row level security filters organisations, compensation, time, notices, and audit events. Authenticated clients have read access through those policies; all writes use validated database functions with role checks and audit records.

The payroll module creates traceable *proposals* from approved corrective time on a verified defect with an approved responsibility review. It does not deduct wages or finalise payroll. India specific legal policy, notice procedure, disputes, statutory payroll calculations, and employer approval need specialist review before any live payroll execution. This product does not issue a statutory payslip or export bank payments.

## Checks and deployment

`npm run lint` checks TypeScript. `npm run build` checks the production build. `npm run test:database` applies every migration to an ephemeral PostgreSQL compatible engine and checks tenant isolation, role denial, module status history, defect review, corrective time, and a duplicate safe payroll draft. `npm run test:frontend` runs the demo browser smoke test against a running app at `http://localhost:3100` by default. The real Supabase project still needs migration and end to end verification before handling customer data.

Deploy with a Next.js 16 compatible Node host or Vercel, set the same public environment variables, configure Supabase production redirect URLs, use HTTPS, and apply migrations to the intended Supabase project. Do not place the Supabase secret key, service role key, or database password in any `NEXT_PUBLIC_` variable.
