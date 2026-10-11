import { useCallback, useState } from 'react';
import { View } from 'react-native';
import {
  CANCEL_REASONS,
  LATE_CANCEL_HOURS,
  PAPERWORK,
  STANDBY_PAY,
  fmtDate,
  fmtTime,
  friendlyError,
  money,
  toNum,
  type CancelReason,
  type HireStatus,
} from '@liftcrew/shared';
import { Sheet } from '../../src/components/Sheet';
import { useToast } from '../../src/components/Toast';
import {
  Button,
  Empty,
  ErrorBox,
  Loading,
  Notice,
  PageHead,
  Panel,
  Pill,
  RadioGroup,
  Row,
  Screen,
  SectionLabel,
  Stack,
  T,
} from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import { useBadge } from '../../src/lib/badge';
import { hrs } from '../../src/lib/format';
import { loadMyBookings, type BookingRow, type StandbyRow } from '../../src/lib/queries';
import { rpc } from '../../src/lib/supabase';
import { hoursUntilJob } from '../../src/lib/time';
import { useLoad } from '../../src/lib/useLoad';

export default function BookingsScreen() {
  const { mover } = useAuth();
  const moverId = mover?.id ?? null;
  const toast = useToast();
  const { refreshBadge } = useBadge();
  const loader = useCallback(() => loadMyBookings(moverId!), [moverId]);
  const { data, loading, refreshing, error, refresh, reload } = useLoad(loader, moverId);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [canceling, setCanceling] = useState<BookingRow | null>(null);

  /** Runs a database function, then reloads the list and the tab badge. */
  async function run(key: string, fn: () => Promise<unknown>, done: string) {
    setBusy(key);
    setActionError(null);
    try {
      await fn();
      toast(done);
    } catch (e) {
      setActionError(friendlyError(e));
    } finally {
      await reload();
      refreshBadge();
      setBusy(null);
    }
  }

  const respondBooking = (b: BookingRow, accept: boolean) =>
    run(
      b.id,
      () => rpc('respond_booking', { p_booking: b.id, p_accept: accept }),
      accept
        ? `You're confirmed for #${b.job.job_number} on ${fmtDate(b.job.work_date)}.`
        : `Declined. ${b.companyName} can see your answer.`,
    );

  const respondStandby = (s: StandbyRow, accept: boolean) =>
    run(
      s.id,
      () => rpc('respond_standby', { p_standby: s.id, p_accept: accept }),
      accept
        ? `You're on standby for #${s.job.job_number}. Keep ${fmtDate(s.job.work_date)} open.`
        : s.status === 'accepted'
          ? `You stepped down from standby on #${s.job.job_number}.`
          : `Declined. ${s.companyName} can see your answer.`,
    );

  const anyBusy = busy !== null;
  const hireNote = (b: BookingRow) => <PaperworkNote company={b.companyName} status={data?.hires[b.job.company_id]} />;

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHead
        title="My bookings"
        sub="Each company that books you is your employer for that job and pays you through its own payroll. LiftCrew keeps a record of your hours, tips and whether you've been paid."
        right={data ? <Pill kind="ok">{`Marked paid ${money(data.markedPaid)}`}</Pill> : undefined}
      />
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {actionError ? <ErrorBox message={actionError} /> : null}
      {loading ? (
        <Loading label="Loading your bookings" />
      ) : data ? (
        <>
          <SectionLabel>Invitations</SectionLabel>
          {data.invitations.length ? (
            data.invitations.map((b) => (
              <Panel key={b.id}>
                <JobHead row={b} />
                <T kind="smallMuted">{`${fmtDate(b.job.work_date)} · ${fmtTime(b.job.start_time)} · ${hrs(b.est_hours)} hrs est. · ${money(estWages(b))} est. wages`}</T>
                {hireNote(b)}
                <Row>
                  <Button title="Decline" kind="quiet" small disabled={anyBusy} busy={busy === b.id} onPress={() => respondBooking(b, false)} />
                  <Button title="Accept" small disabled={anyBusy} busy={busy === b.id} onPress={() => respondBooking(b, true)} />
                </Row>
              </Panel>
            ))
          ) : (
            <Empty>No invitations waiting.</Empty>
          )}

          {data.standby.length ? (
            <>
              <SectionLabel>Standby</SectionLabel>
              {data.standby.map((s) => (
                <Panel key={s.id}>
                  <JobHead row={s} />
                  <T kind="smallMuted">
                    {`${fmtDate(s.job.work_date)} · ${fmtTime(s.job.start_time)} · ${money(toNum(s.job.hourly_rate) * toNum(s.job.est_hours))} est. wages if you're called in, ${money(STANDBY_PAY)} standby pay from the company if not. You're booked automatically if a crew member cancels.`}
                  </T>
                  {s.status === 'offered' ? (
                    <Row>
                      <Button title="Decline" kind="quiet" small disabled={anyBusy} busy={busy === s.id} onPress={() => respondStandby(s, false)} />
                      <Button title="Accept standby" small disabled={anyBusy} busy={busy === s.id} onPress={() => respondStandby(s, true)} />
                    </Row>
                  ) : (
                    <Row>
                      <Pill kind="ok">On standby</Pill>
                      <Button title="Step down" kind="quiet" small disabled={anyBusy} busy={busy === s.id} onPress={() => respondStandby(s, false)} />
                    </Row>
                  )}
                </Panel>
              ))}
            </>
          ) : null}

          <SectionLabel>Upcoming</SectionLabel>
          {data.upcoming.length ? (
            data.upcoming.map((b) => {
              const started = hoursUntilJob(b.job.work_date, b.job.start_time) <= 0;
              return (
                <Panel key={b.id}>
                  <JobHead row={b} />
                  <T kind="smallMuted">{`${fmtDate(b.job.work_date)} · ${fmtTime(b.job.start_time)} · ${hrs(b.est_hours)} hrs est. · ${money(estWages(b))} est. wages`}</T>
                  {b.from_standby ? <T kind="smallMuted">You moved in from standby.</T> : null}
                  {hireNote(b)}
                  <Row>
                    <Pill kind="ok">Confirmed</Pill>
                    {started ? (
                      <T kind="smallMuted">{`Waiting for ${b.companyName} to record your hours.`}</T>
                    ) : (
                      <Button title="Can't make it" kind="danger" small disabled={anyBusy} onPress={() => setCanceling(b)} />
                    )}
                  </Row>
                </Panel>
              );
            })
          ) : (
            <Empty>Nothing booked yet. Request jobs from the Jobs tab.</Empty>
          )}

          <SectionLabel>Completed and canceled</SectionLabel>
          {data.past.length || data.heldStandby.length ? (
            <>
              {data.past.map((b) => (
                <Panel key={b.id}>
                  <JobHead row={b} />
                  <PastLine row={b} />
                  <Row>
                    <PastPill row={b} />
                  </Row>
                </Panel>
              ))}
              {data.heldStandby.map((s) => (
                <Panel key={s.id}>
                  <JobHead row={s} />
                  <T kind="smallMuted">{`${fmtDate(s.job.work_date)} · Held the day on standby · ${money(s.standby_pay ?? STANDBY_PAY)} standby pay`}</T>
                  <Row>
                    {s.pay_status === 'paid' ? <Pill kind="ok">Paid by company</Pill> : <Pill kind="warn">Pay due from company</Pill>}
                  </Row>
                </Panel>
              ))}
            </>
          ) : (
            <Empty>Completed jobs show up here.</Empty>
          )}
        </>
      ) : null}

      <CancelSheet
        booking={canceling}
        onClose={() => setCanceling(null)}
        onConfirm={async (b, reason) => {
          setCanceling(null);
          await run(
            b.id,
            () => rpc('cancel_booking', { p_booking: b.id, p_reason: reason }),
            `Canceled. ${b.companyName} sees it on job #${b.job.job_number} right away.`,
          );
        }}
      />
    </Screen>
  );
}

const estWages = (b: BookingRow) => toNum(b.hourly_rate) * toNum(b.est_hours);

function JobHead({ row }: { row: BookingRow | StandbyRow }) {
  return (
    <View style={{ gap: 2 }}>
      <T kind="ticketNo">{`JOB #${row.job.job_number} · ${row.companyName}`}</T>
      <T kind="bold">{row.job.route}</T>
    </View>
  );
}

function PaperworkNote({ company, status }: { company: string; status: HireStatus | undefined }) {
  if (status === 'done') return null;
  return (
    <T kind="small">
      {`${company} is your employer for this job and will send your hiring paperwork (${PAPERWORK}) directly. `}
      {status === 'sent' ? (
        <T kind="small" style={{ fontWeight: '700' }}>
          They've sent it. Check your email or texts.
        </T>
      ) : (
        'Watch for it before the job.'
      )}
    </T>
  );
}

function PastLine({ row }: { row: BookingRow }) {
  const date = fmtDate(row.job.work_date);
  if (row.status === 'completed') {
    const hours = toNum(row.hours_worked);
    const tip = toNum(row.tip);
    const text =
      row.pay_status === 'none' && hours === 0 && tip === 0
        ? `${date} · No hours recorded`
        : `${date} · ${hrs(row.hours_worked)} hrs · ${money(row.wages)} wages${tip ? ` + ${money(tip)} tip` : ''}`;
    return <T kind="smallMuted">{text}</T>;
  }
  if (row.status === 'canceled') {
    return (
      <T kind="smallMuted">
        {`${date} · You canceled: ${row.cancel_reason ?? 'Other'}${row.late_cancel ? ' · late cancellation' : ''}${row.replaced_by_booking ? ' · a standby mover took the spot' : ''}`}
      </T>
    );
  }
  return <T kind="smallMuted">{`${date} · ${row.companyName} withdrew this booking`}</T>;
}

function PastPill({ row }: { row: BookingRow }) {
  if (row.status === 'completed') {
    if (row.pay_status === 'paid') return <Pill kind="ok">Paid by company</Pill>;
    if (row.pay_status === 'due') return <Pill kind="warn">Pay due from company</Pill>;
    return <Pill kind="plain">Completed</Pill>;
  }
  if (row.status === 'canceled') return <Pill kind={row.late_cancel ? 'warn' : 'bad'}>{row.late_cancel ? 'Late cancellation' : 'Canceled'}</Pill>;
  return <Pill kind="plain">Withdrawn by company</Pill>;
}

function CancelSheet({
  booking,
  onClose,
  onConfirm,
}: {
  booking: BookingRow | null;
  onClose: () => void;
  onConfirm: (b: BookingRow, reason: CancelReason) => void;
}) {
  const [reason, setReason] = useState<CancelReason | null>(null);
  const b = booking;
  const late = b ? hoursUntilJob(b.job.work_date, b.job.start_time) < LATE_CANCEL_HOURS : false;
  const close = () => {
    setReason(null);
    onClose();
  };
  return (
    <Sheet
      visible={!!b}
      onClose={close}
      title="Can't make this job?"
      sub={b ? `#${b.job.job_number} · ${fmtDate(b.job.work_date)} · ${fmtTime(b.job.start_time)} · ${b.companyName}` : undefined}
    >
      {b ? (
        <Stack gap={14}>
          <RadioGroup
            label="Reason"
            options={CANCEL_REASONS}
            value={reason}
            onChange={setReason}
            hint={`${b.companyName} sees this reason.`}
          />
          {late ? (
            <Notice kind="warn" title={`This job is less than ${LATE_CANCEL_HOURS} hours away.`}>
              It will show as a late cancellation on your record, which moving companies can see.
            </Notice>
          ) : (
            <Notice kind="kraft">
              {`This job is more than ${LATE_CANCEL_HOURS} hours away, so canceling won't show on your record.`}
            </Notice>
          )}
          <T kind="smallMuted">If a standby mover is holding the day, they move into your spot automatically.</T>
          <Row style={{ justifyContent: 'flex-end' }}>
            <Button title="Keep the job" kind="quiet" onPress={close} />
            <Button
              title="Cancel my spot"
              kind="danger"
              disabled={!reason}
              hint={reason ? undefined : 'Pick a reason first'}
              onPress={() => {
                if (!reason) return;
                const r = reason;
                setReason(null);
                onConfirm(b, r);
              }}
            />
          </Row>
        </Stack>
      ) : null}
    </Sheet>
  );
}
