import Link from "next/link";

export default function NotFound() {
  return <main className="route-state"><span className="brand-symbol" aria-hidden="true">?</span><h1>Page not found</h1><p>This ReworkIQ workspace page is unavailable or no longer exists.</p><Link className="button button-primary" href="/dashboard">Back to dashboard</Link></main>;
}
