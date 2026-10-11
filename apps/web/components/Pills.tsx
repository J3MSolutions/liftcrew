import type { BackgroundStatus, BookingStatus, HireStatus, PayStatus, StandbyStatus, Weekday } from '@liftcrew/shared';
import { WEEKDAYS } from '@liftcrew/shared';

export function StatusPill({ status }: { status: BookingStatus }) {
  switch (status) {
    case 'pending': return <span className="pill warn">Waiting on mover</span>;
    case 'confirmed': return <span className="pill ok">Confirmed</span>;
    case 'completed': return <span className="pill plain">Completed</span>;
    case 'declined': return <span className="pill bad">Declined</span>;
    case 'canceled': return <span className="pill bad">Canceled by mover</span>;
    case 'withdrawn': return <span className="pill plain">Withdrawn</span>;
  }
}

export function PayPill({ pay }: { pay: PayStatus }) {
  switch (pay) {
    case 'due': return <span className="pill warn">Pay due</span>;
    case 'paid': return <span className="pill ok">Paid</span>;
    case 'none': return <span className="pill plain">No pay</span>;
    default: return null;
  }
}

export function HirePill({ hire }: { hire: HireStatus }) {
  if (hire === 'needed') return <span className="pill warn">Hiring paperwork needed</span>;
  if (hire === 'sent') return <span className="pill info">Paperwork sent</span>;
  return null;
}

export function StandbyPill({ status }: { status: StandbyStatus }) {
  switch (status) {
    case 'accepted': return <span className="pill ok">Standing by</span>;
    case 'offered': return <span className="pill warn">Offer sent</span>;
    case 'declined': return <span className="pill plain">Declined</span>;
    default: return null;
  }
}

export function BackgroundPill({ status }: { status: BackgroundStatus }) {
  switch (status) {
    case 'clear': return <span className="pill ok">Background checked</span>;
    case 'pending': return <span className="pill warn">Background check in progress</span>;
    case 'not_started': return <span className="pill plain">Background check not started</span>;
    case 'not_clear': return <span className="pill bad">Can&apos;t be booked right now</span>;
  }
}

export function Days({ days }: { days: Weekday[] }) {
  return (
    <div className="days" aria-label={days.length ? `Available ${days.join(', ')}` : 'No available days set'}>
      {WEEKDAYS.map((d) => (
        <span key={d} className={`day${days.includes(d) ? ' on' : ''}`} aria-hidden="true">{d}</span>
      ))}
    </div>
  );
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]!.toUpperCase()).slice(0, 2).join('');
  return <span className={`av${large ? ' lg' : ''}`} aria-hidden="true">{initials}</span>;
}
