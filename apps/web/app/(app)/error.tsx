'use client';

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="empty" role="alert">
      <h2>Something went wrong loading this page</h2>
      <p>{error.message?.startsWith('Missing NEXT_PUBLIC') ? error.message : 'Check your connection and try again.'}</p>
      <button type="button" className="btn" onClick={reset}>Try again</button>
    </div>
  );
}
