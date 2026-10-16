import { Workspace } from "@/components/workspace";
import { notFound } from "next/navigation";

const sections = new Set([
  "dashboard",
  "projects",
  "tasks",
  "bugs",
  "time-logs",
  "approvals",
  "payroll",
  "payslips",
  "analytics",
  "employees",
  "organisation",
  "audit-logs",
  "notifications",
  "settings"
]);

export default async function SectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = await params;
  if (!sections.has(section)) notFound();
  return <Workspace section={section} />;
}
