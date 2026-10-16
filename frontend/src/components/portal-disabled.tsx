import Link from "next/link";

export function PortalDisabled({ portal }: { portal: string }) {
  return <main className="role-content"><div className="role-introduction"><span>ACCESS CONTROL</span><h1>{portal} access is not enabled.</h1><p>Only Employee and Team Lead accounts are enabled in this release. Use a provisioned account or return to the login page.</p><Link className="primary-button" href="/login">Return to sign in</Link></div></main>;
}
