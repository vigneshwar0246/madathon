import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import * as bootstrap from "@backend/routes/bootstrap/route";
import * as bugs from "@backend/routes/bugs/route";
import * as compensation from "@backend/routes/employees/compensation/route";
import * as invite from "@backend/routes/employees/invite/route";
import * as notifications from "@backend/routes/notifications/read/route";
import * as organisations from "@backend/routes/organisations/route";
import * as payroll from "@backend/routes/payroll/route";
import * as payrollFinalise from "@backend/routes/payroll/finalise/route";
import * as payrollRespond from "@backend/routes/payroll/respond/route";
import * as projects from "@backend/routes/projects/route";
import * as reviews from "@backend/routes/reviews/route";
import * as tasks from "@backend/routes/tasks/route";
import * as timeEntries from "@backend/routes/time-entries/route";
import * as demoAccounts from "@backend/routes/demo-accounts/route";

type RouteModule = Record<string, ((request: NextRequest) => Promise<Response>) | undefined>;

const routes: Record<string, RouteModule> = {
  bootstrap,
  bugs,
  "employees/compensation": compensation,
  "employees/invite": invite,
  "notifications/read": notifications,
  organisations,
  payroll,
  "payroll/finalise": payrollFinalise,
  "payroll/respond": payrollRespond,
  projects,
  reviews,
  tasks,
  "time-entries": timeEntries
  , "demo-accounts": demoAccounts
};

async function dispatch(request: NextRequest, path: string[], method: string) {
  const route = routes[path.join("/")];
  const handler = route?.[method];
  if (!handler) return NextResponse.json({ error: "API route or method not found" }, { status: 404 });
  return handler(request);
}

export async function GET(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return dispatch(request, (await context.params).path, "GET");
}

export async function POST(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return dispatch(request, (await context.params).path, "POST");
}

export async function PATCH(request: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  return dispatch(request, (await context.params).path, "PATCH");
}
