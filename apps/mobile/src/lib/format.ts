import { fmtDate, fmtTime, money, toNum, type Num } from '@liftcrew/shared';

/** 6 -> "6", 6.5 -> "6.5", "6.25" -> "6.25" */
export const hrs = (v: Num | null | undefined) => String(Math.round(toNum(v) * 100) / 100);

export const perHour = (v: Num | null | undefined) => `${money(v)}/hr`;

/** "Sat, Oct 17 · 8:00 AM" */
export const when = (date: string, time: string) => `${fmtDate(date)} · ${fmtTime(time)}`;

export const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

export const COMPANY_FALLBACK = 'The moving company';
