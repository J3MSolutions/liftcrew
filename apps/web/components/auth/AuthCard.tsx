import { Logo } from '../Logo';

export function AuthCard({ title, intro, children, wide }: {
  title: string;
  intro?: React.ReactNode;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="auth-wrap">
      <main className={`auth-card${wide ? ' wide' : ''}`} id="main">
        <Logo href="/login" />
        <div style={{ display: 'grid', gap: 6 }}>
          <h1>{title}</h1>
          {intro ? <p className="muted">{intro}</p> : null}
        </div>
        {children}
      </main>
    </div>
  );
}
