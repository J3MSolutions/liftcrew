export function SignOutButton({ className = 'btn quiet sm' }: { className?: string }) {
  return (
    <form action="/auth/signout" method="post">
      <button type="submit" className={className}>Sign out</button>
    </form>
  );
}
