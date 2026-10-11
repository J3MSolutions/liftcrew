// Row types matching supabase/migrations/20261011000000_core.sql.
// Dates are ISO strings (YYYY-MM-DD), times "HH:MM:SS", numerics come back as numbers or strings
// depending on the client; use toNum() when doing math.

export type AccountType = 'company' | 'mover';
export type WorkRole = 'Helper' | 'Driver' | 'Packer' | 'Crew lead';
export type LicenseClass = 'None' | 'Class C' | 'Class B' | 'Class A';
export type JobStatus = 'open' | 'completed' | 'canceled';
export type BookingStatus = 'pending' | 'confirmed' | 'completed' | 'declined' | 'canceled' | 'withdrawn';
export type PayStatus = 'upcoming' | 'due' | 'paid' | 'none';
export type StandbyStatus = 'offered' | 'accepted' | 'declined' | 'promoted' | 'held' | 'withdrawn';
export type HireStatus = 'needed' | 'sent' | 'done';
export type BackgroundStatus = 'not_started' | 'pending' | 'clear' | 'not_clear';
export type CancelReason = 'Sick' | 'Family emergency' | 'Car or truck trouble' | 'Schedule conflict' | 'Other';
export type DisputeStatus = 'open' | 'upheld' | 'removed';
export type Weekday = 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri' | 'Sat' | 'Sun';
export type Num = number | string;

export interface Profile { id: string; account_type: AccountType; created_at: string }

export interface Company {
  id: string; owner_id: string; name: string; city: string; permit_number: string;
  insurance_expires: string; verified: boolean; job_prefix: string; next_job_seq: number;
  payroll_portal_name: string | null; payroll_portal_url: string | null; created_at: string;
}

export interface Mover {
  id: string; full_name: string; city: string; roles: WorkRole[]; license: LicenseClass;
  years_experience: number; asking_rate: Num; bio: string | null; available_days: Weekday[];
  id_verified: boolean; background: BackgroundStatus; created_at: string; updated_at: string;
}

export interface MoverPrivate { mover_id: string; phone: string }

export interface Job {
  id: string; company_id: string; job_number: string; work_date: string; start_time: string;
  est_hours: Num; route: string; description: string; crew_size: number; role: WorkRole;
  hourly_rate: Num; truck: string; status: JobStatus; created_at: string; completed_at: string | null;
}

export interface JobRequest { job_id: string; mover_id: string; created_at: string }

export interface Booking {
  id: string; job_id: string; mover_id: string; status: BookingStatus; hourly_rate: Num; est_hours: Num;
  created_at: string; responded_at: string | null; canceled_at: string | null;
  cancel_reason: CancelReason | null; late_cancel: boolean; replaced_by_booking: string | null;
  from_standby: boolean; hours_worked: Num | null; wages: Num | null; tip: Num;
  pay_status: PayStatus; paid_at: string | null;
}

export interface Standby {
  id: string; job_id: string; mover_id: string; status: StandbyStatus; standby_pay: Num | null;
  pay_status: PayStatus; created_at: string; responded_at: string | null; paid_at: string | null;
}

export interface Hire { company_id: string; mover_id: string; status: HireStatus; updated_at: string }

export interface Review {
  id: string; booking_id: string; job_id: string; company_id: string; mover_id: string;
  showed: boolean; on_time: boolean; rebook: boolean; strengths: string[]; note: string | null; created_at: string;
}

export interface ReviewResponse { review_id: string; body: string; created_at: string }
export interface ReviewDispute { id: string; review_id: string; reason: string; status: DisputeStatus; created_at: string }

export interface MoverStats {
  mover_id: string; jobs_completed: number; reviews: number; on_time_pct: number | null;
  rebook_pct: number | null; no_shows: number; late_cancels: number;
}

export interface BookingFees { month: string; bookings: number; fee_each: Num; total: Num }

/** Arguments for each database function (supabase.rpc(name, args)). */
export interface RpcArgs {
  create_company: { p_name: string; p_city: string; p_permit_number: string; p_insurance_expires: string; p_job_prefix: string };
  create_mover_profile: {
    p_full_name: string; p_city: string; p_roles: WorkRole[]; p_license: LicenseClass; p_years: number;
    p_asking_rate: number; p_bio: string | null; p_available_days: Weekday[]; p_phone: string;
  };
  post_job: {
    p_work_date: string; p_start_time: string; p_est_hours: number; p_route: string; p_description: string;
    p_crew_size: number; p_role: WorkRole; p_hourly_rate: number; p_truck: string;
  };
  invite_mover: { p_job: string; p_mover: string };
  book_requester: { p_job: string; p_mover: string };
  withdraw_booking: { p_booking: string };
  set_hire_status: { p_mover: string; p_status: HireStatus };
  offer_standby: { p_job: string; p_mover: string };
  withdraw_standby: { p_standby: string };
  complete_job: { p_job: string; p_entries: { booking_id: string; hours: number; tip: number }[]; p_already_paid: boolean };
  cancel_job: { p_job: string };
  mark_paid: { p_booking: string };
  mark_standby_paid: { p_standby: string };
  record_tip: { p_booking: string; p_tip: number };
  submit_review: { p_booking: string; p_showed: boolean; p_on_time: boolean; p_rebook: boolean; p_strengths: string[]; p_note: string | null };
  request_job: { p_job: string };
  withdraw_request: { p_job: string };
  respond_booking: { p_booking: string; p_accept: boolean };
  cancel_booking: { p_booking: string; p_reason: CancelReason };
  respond_standby: { p_standby: string; p_accept: boolean };
  respond_to_review: { p_review: string; p_body: string };
  dispute_review: { p_review: string; p_reason: string };
  mover_stats: { p_movers: string[] };
  my_booking_fees: { p_month?: string | null };
  open_spots: { p_job: string };
}
export type RpcName = keyof RpcArgs;
