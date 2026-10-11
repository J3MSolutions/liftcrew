import type { CancelReason, LicenseClass, Weekday, WorkRole } from './types';

export const APP_NAME = 'LiftCrew';
export const TIMEZONE = 'America/Los_Angeles';

export const WEEKDAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const ROLES: WorkRole[] = ['Helper', 'Driver', 'Packer', 'Crew lead'];
export const LICENSES: LicenseClass[] = ['None', 'Class C', 'Class B', 'Class A'];
export const TRUCKS = ['16 ft box truck', '26 ft box truck', 'Cargo van', 'No truck (labor only)'];
export const CANCEL_REASONS: CancelReason[] = ['Sick', 'Family emergency', 'Car or truck trouble', 'Schedule conflict', 'Other'];
export const STRENGTHS = [
  'Careful with furniture', 'Strong on stairs', 'Safe driver', 'Fast packer', 'Good with customers', 'Takes direction well',
] as const;

// Must match the SQL settings functions in the migration.
export const STANDBY_PAY = 25;
export const BOOKING_FEE = 20;
export const LATE_CANCEL_HOURS = 48;
export const MAX_STANDBY_PER_JOB = 2;

export const PAPERWORK = 'W-4, California DE 4 and Form I-9';
export const NOTE_MAX = 280;
export const BIO_MAX = 600;

export const COPY = {
  employerModel:
    "You're the employer for movers you book. Send new hires your W-4, California DE 4 and Form I-9 from your own payroll system, then mark them set up. LiftCrew doesn't collect or store these forms.",
  moverEmployerModel:
    "Each moving company that books you is your employer for that job. The first time a company books you, it sends its own hiring paperwork (W-4, California DE 4 and Form I-9) and pays you through its payroll. You don't fill out tax forms in LiftCrew.",
  payRecords:
    "LiftCrew doesn't process wages or tips. Pay your crew through your own payroll, then mark them paid here so you and the mover have the same record.",
  reviewsPrivacyCompany:
    'Visible to verified moving companies and to the mover, who can respond or dispute it. Other movers never see it. Stick to what happened on this job.',
  reviewsPrivacyMover:
    "Only verified moving companies and you can see this. Other movers can't see your record, and you can't see theirs. You can respond to any review, or dispute one that's inaccurate.",
  sensitive: "Remove the ID or account number. LiftCrew doesn't store Social Security, card or bank numbers.",
  doubleCount:
    'If your payroll provider already syncs wages to your books, ask your bookkeeper before importing journal entries, or wages will be counted twice.',
} as const;
