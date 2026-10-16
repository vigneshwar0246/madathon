"use client";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="route-state" role="alert"><span className="brand-symbol" aria-hidden="true">!</span><h1>We couldn&apos;t load this page</h1><p>Something interrupted the workspace view. Try again, or return to the dashboard.</p><div className="route-state-actions"><button className="button button-primary" onClick={() => reset()}>Try again</button><a className="button button-secondary" href="/dashboard">Back to dashboard</a></div></main>;
}
