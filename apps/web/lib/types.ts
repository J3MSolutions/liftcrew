// Shapes of the rows this app reads, including PostgREST embeds.
import type {
  Booking, Company, Hire, Job, JobRequest, Mover, MoverStats, Num, Review, Standby,
} from '@liftcrew/shared';

export type MoverLite = Pick<
  Mover,
  'id' | 'full_name' | 'city' | 'roles' | 'available_days' | 'id_verified' | 'background'
>;

export type BookingRow = Booking & { movers: MoverLite | null };
export type StandbyRow = Standby & { movers: MoverLite | null };
export type RequestRow = JobRequest & { movers: MoverLite | null };

/** A job with everything the Jobs page shows on its ticket. */
export type JobBundle = Job & {
  bookings: BookingRow[];
  standby: StandbyRow[];
  job_requests: RequestRow[];
  reviews: Pick<Review, 'booking_id'>[];
};

export interface JobBoard {
  active: JobBundle[];
  completed: JobBundle[];
  hires: Record<string, Hire['status']>;
  phones: Record<string, string>;
}

export type MoverCardData = Mover & { stats: MoverStats | null };

export interface ReviewWithExtras extends Review {
  companies: { name: string } | null;
  jobs: { job_number: string; work_date: string } | null;
  response: { body: string; created_at: string } | null;
  dispute: { status: 'open' | 'upheld' | 'removed' } | null;
}

export interface PayBookingRow extends Booking {
  jobs: { id: string; job_number: string; work_date: string; route: string; company_id: string } | null;
  movers: { full_name: string } | null;
}
export interface PayStandbyRow extends Standby {
  jobs: { id: string; job_number: string; work_date: string; route: string; company_id: string } | null;
  movers: { full_name: string } | null;
}

/** One line on the Pay records table: a completed booking or held standby day. */
export interface PayLine {
  key: string;
  kind: 'booking' | 'standby';
  id: string;
  jobNumber: string;
  date: string;
  route: string;
  mover: string;
  hours: number | null;
  rate: number;
  wages: number;
  standby: number;
  tip: number;
  total: number;
  pay: Booking['pay_status'];
}

export type { Company, Num };
