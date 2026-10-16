import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";

const db = new PGlite({ extensions: { pgcrypto } });
const migrations = [
  "20261016080000_foundation.sql",
  "20261016081000_workflows.sql",
  "20261016082000_invitations.sql"
];
try {
  await db.exec(`
    create role anon;
    create role authenticated;
    create schema auth;
    create table auth.users (
      id uuid primary key,
      email text not null,
      raw_user_meta_data jsonb not null default '{}'::jsonb,
      email_confirmed_at timestamptz
    );
    create function auth.uid() returns uuid language sql stable as $$
      select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
    $$;
  `);
  for (const filename of migrations) {
    await db.exec(await readFile(new URL(`../supabase/migrations/${filename}`, import.meta.url), "utf8"));
    console.log(`${filename} applied`);
  }
  const owner = "11111111-1111-4111-8111-111111111111";
  const other = "22222222-2222-4222-8222-222222222222";
  const stranger = "33333333-3333-4333-8333-333333333333";
  await db.query("insert into auth.users(id,email,email_confirmed_at) values ($1,'owner@example.test',now()),($2,'other@example.test',now()),($3,'stranger@example.test',now())", [owner, other, stranger]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  const created = await db.query("select public.create_organisation('Test Company') as id");
  const organisationId = created.rows[0].id;
  assert.ok(organisationId);
  const invited = await db.query("select public.create_employee_invitation($1,'other@example.test','Other Employee','employee','Developer','Engineering') as id", [organisationId]);
  assert.ok(invited.rows[0].id);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
  const accepted = await db.query("select public.accept_pending_invitations() as count");
  assert.equal(accepted.rows[0].count, 1);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [stranger]);
  const strangerOrganisation = (await db.query("select public.create_organisation('Separate Company') as id")).rows[0].id;

  await db.query("set role authenticated");
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
  const visibleOrgs = (await db.query("select id from public.organisations")).rows;
  assert.deepEqual(visibleOrgs.map(row => row.id), [organisationId]);
  await assert.rejects(db.query("update public.organisations set name='Tampered' where id=$1", [organisationId]));
  await assert.rejects(db.query("select public.create_project($1,'Cross company','Client','Description',null,current_date+10,array['Core'])", [strangerOrganisation]));
  await db.query("reset role");

  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  const ownerEmployee = (await db.query("select employee_id from public.memberships where organisation_id=$1 and user_id=$2", [organisationId, owner])).rows[0].employee_id;
  const workerEmployee = (await db.query("select employee_id from public.memberships where organisation_id=$1 and user_id=$2", [organisationId, other])).rows[0].employee_id;
  const project = (await db.query("select public.create_project($1,'Delivery','Client','Description',$2,current_date+10,array['Core']) as id", [organisationId, ownerEmployee])).rows[0].id;
  const moduleId = (await db.query("select id from public.modules where project_id=$1", [project])).rows[0].id;
  const task = (await db.query("select public.assign_task($1,$2,$3,'Deliver core module','Initial delivery',$4,current_date+10,'medium') as id", [organisationId, project, moduleId, workerEmployee])).rows[0].id;
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
  await db.query("select public.change_task_status($1,$2,'in_progress')", [organisationId, task]);
  await db.query("select public.change_task_status($1,$2,'submitted')", [organisationId, task]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  await db.query("select public.change_task_status($1,$2,'completed')", [organisationId, task]);
  assert.equal((await db.query("select status from public.modules where id=$1", [moduleId])).rows[0].status, "completed");
  const bug = (await db.query("select public.report_bug($1,$2,'Broken delivery','Reproduced after initial delivery','high',current_date) as id", [organisationId, task])).rows[0].id;
  assert.equal((await db.query("select status from public.modules where id=$1", [moduleId])).rows[0].status, "reopened");
  await db.query("select public.change_bug_status($1,$2,'verified')", [organisationId, bug]);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
  await db.query("select public.change_bug_status($1,$2,'under_fix')", [organisationId, bug]);
  await assert.rejects(db.query("select public.log_work_time($1,$2,null,current_date,1,'Incorrect category')", [organisationId, task]));
  const time = (await db.query("select public.log_work_time($1,$2,$3,current_date,2,'Corrected reported defect') as id", [organisationId, task, bug])).rows[0].id;
  await db.query("select public.change_bug_status($1,$2,'resolved')", [organisationId, bug]);
  await assert.rejects(db.query("select public.review_time_entry($1,$2,'approved')", [organisationId, time]));
  await assert.rejects(db.query("select public.set_compensation($1,$2,100,20000)", [organisationId, workerEmployee]));
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [owner]);
  await db.query("select public.review_time_entry($1,$2,'approved')", [organisationId, time]);
  await db.query("select public.review_rework($1,$2,'eligible','Confirmed original delivery issue')", [organisationId, bug]);
  await db.query("select public.set_compensation($1,$2,100,20000)", [organisationId, workerEmployee]);
  const period = (await db.query("select public.create_payroll_draft($1,date_trunc('month',current_date)::date) as id", [organisationId])).rows[0].id;
  const proposals = (await db.query("select id,proposed_amount from public.deduction_proposals where period_id=$1", [period])).rows;
  assert.equal(proposals.length, 1);
  assert.equal(Number(proposals[0].proposed_amount), 200);
  assert.equal((await db.query("select public.create_payroll_draft($1,date_trunc('month',current_date)::date) as id", [organisationId])).rows[0].id, period);
  assert.equal((await db.query("select count(*)::int as count from public.deduction_proposals where period_id=$1", [period])).rows[0].count, 1);
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [other]);
  await db.query("set role authenticated");
  assert.equal((await db.query("select count(*)::int as count from public.employee_compensation where organisation_id=$1", [organisationId])).rows[0].count, 1);
  assert.equal((await db.query("select count(*)::int as count from public.deduction_proposals where organisation_id=$1", [organisationId])).rows[0].count, 1);
  await db.query("reset role");
  await db.query("select public.respond_to_proposal($1,$2,'acknowledged',null)", [organisationId, proposals[0].id]);
  console.log("Database smoke passed: tenant isolation, roles, module lifecycle, defect, time review, and payroll proposal.");
} finally {
  await db.close();
}
