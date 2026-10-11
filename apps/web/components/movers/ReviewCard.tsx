import { firstName, fmtDate } from '@liftcrew/shared';
import type { ReviewWithExtras } from '@/lib/types';

export function ReviewCard({ review: r, moverName }: { review: ReviewWithExtras; moverName: string }) {
  return (
    <article className="review">
      <div className="row between">
        <b>{r.companies?.name ?? 'A moving company'}</b>
        <span className="muted small mono">
          {r.jobs ? `#${r.jobs.job_number} · ${fmtDate(r.jobs.work_date)}` : fmtDate(r.created_at.slice(0, 10))}
        </span>
      </div>
      <div className="row">
        {r.showed ? <span className="pill ok">Showed up</span> : <span className="pill bad">No-show</span>}
        {r.showed ? (r.on_time ? <span className="pill ok">On time</span> : <span className="pill warn">Late</span>) : null}
        {r.rebook ? <span className="pill ok">Would book again</span> : <span className="pill bad">Would not book again</span>}
        {r.dispute?.status === 'open' ? <span className="pill info">Under dispute</span> : null}
      </div>
      {r.strengths.length ? (
        <div className="row">{r.strengths.map((s) => <span key={s} className="chip">{s}</span>)}</div>
      ) : null}
      {r.note ? <p className="note">{r.note}</p> : null}
      {r.response ? (
        <div className="response"><b>{firstName(moverName)}&apos;s response:</b> {r.response.body}</div>
      ) : null}
    </article>
  );
}
