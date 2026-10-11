import {
  BIO_MAX,
  COPY,
  WEEKDAYS,
  containsSensitiveNumber,
  toNum,
  type LicenseClass,
  type Mover,
  type Weekday,
  type WorkRole,
} from '@liftcrew/shared';

/** Editable mover profile, as text so inputs can hold partial values. */
export interface ProfileDraft {
  fullName: string;
  phone: string;
  city: string;
  license: LicenseClass;
  roles: WorkRole[];
  years: string;
  rate: string;
  bio: string;
  days: Weekday[];
}

export type ProfileErrors = Partial<Record<keyof ProfileDraft, string>>;

export const emptyDraft: ProfileDraft = {
  fullName: '',
  phone: '',
  city: '',
  license: 'None',
  roles: [],
  years: '',
  rate: '',
  bio: '',
  days: [],
};

export function draftFromMover(m: Mover, phone: string | null): ProfileDraft {
  return {
    fullName: m.full_name,
    phone: phone ?? '',
    city: m.city,
    license: m.license,
    roles: m.roles,
    years: String(m.years_experience ?? 0),
    rate: String(toNum(m.asking_rate)),
    bio: m.bio ?? '',
    days: WEEKDAYS.filter((d) => m.available_days.includes(d)),
  };
}

const PHONE_RE = /^[0-9()+. -]{7,20}$/; // same rule as mover_private.phone

/** Checks a draft against the same limits the database enforces. Returns {} when valid. */
export function validateDraft(d: ProfileDraft, opts: { name: boolean }): ProfileErrors {
  const e: ProfileErrors = {};
  const name = d.fullName.trim();
  if (opts.name) {
    if (name.length < 2 || name.length > 80) e.fullName = 'Enter your full legal name (2 to 80 characters).';
    else if (containsSensitiveNumber(name)) e.fullName = COPY.sensitive;
  }
  const phone = d.phone.trim();
  const digits = phone.replace(/\D/g, '').length;
  if (!PHONE_RE.test(phone) || digits < 7) e.phone = 'Enter a mobile number, like (707) 555-0148.';
  const city = d.city.trim();
  if (city.length < 2 || city.length > 80) e.city = 'Enter your home base, like Petaluma.';
  else if (containsSensitiveNumber(city)) e.city = COPY.sensitive;
  if (!d.roles.length) e.roles = 'Pick at least one kind of work.';
  const years = d.years.trim() === '' ? 0 : Number(d.years);
  if (!Number.isInteger(years) || years < 0 || years > 60) e.years = 'Enter whole years, from 0 to 60.';
  const rate = Number(d.rate.replace(/[$,\s]/g, ''));
  if (!d.rate.trim() || !Number.isFinite(rate) || rate <= 0 || rate > 500) e.rate = 'Enter an hourly rate between $1 and $500.';
  if (d.bio.trim().length > BIO_MAX) e.bio = `Keep it under ${BIO_MAX} characters.`;
  else if (containsSensitiveNumber(d.bio)) e.bio = COPY.sensitive;
  return e;
}

export const firstError = (e: ProfileErrors): string | null => Object.values(e).find(Boolean) ?? null;

export function cleanDraft(d: ProfileDraft) {
  return {
    fullName: d.fullName.trim().replace(/\s+/g, ' '),
    phone: d.phone.trim(),
    city: d.city.trim(),
    license: d.license,
    roles: d.roles,
    years: d.years.trim() === '' ? 0 : Number(d.years),
    rate: Math.round(Number(d.rate.replace(/[$,\s]/g, '')) * 100) / 100,
    bio: d.bio.trim() || null,
    days: WEEKDAYS.filter((x) => d.days.includes(x)),
  };
}
