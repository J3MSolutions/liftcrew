import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { friendlyError, weekdayOf } from '@liftcrew/shared';
import { JobTicket } from '../../src/components/JobTicket';
import { useToast } from '../../src/components/Toast';
import { Button, Empty, ErrorBox, Loading, Notice, PageHead, Pill, Row, Screen, Stack, T, type PillKind } from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import { useBadge } from '../../src/lib/badge';
import { loadOpenJobs, type MyJobState, type OpenJob } from '../../src/lib/queries';
import { rpc } from '../../src/lib/supabase';
import { useLoad } from '../../src/lib/useLoad';

const MINE_PILL: Record<string, [PillKind, string]> = {
  pending: ['warn', 'Invited: answer in Bookings'],
  confirmed: ['ok', "You're booked"],
  completed: ['plain', 'Completed'],
  offered: ['warn', 'Standby offer: answer in Bookings'],
  accepted: ['ok', 'On standby'],
};

export default function JobsScreen() {
  const { mover } = useAuth();
  const moverId = mover?.id ?? null;
  const toast = useToast();
  const { refreshBadge } = useBadge();
  const loader = useCallback(() => loadOpenJobs(moverId!), [moverId]);
  const { data, loading, refreshing, error, refresh, reload } = useLoad(loader, moverId);
  const [busy, setBusy] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const days = mover?.available_days ?? [];

  async function act(item: OpenJob, kind: 'request' | 'withdraw') {
    setBusy(item.job.id);
    setActionError(null);
    try {
      if (kind === 'request') {
        await rpc('request_job', { p_job: item.job.id });
        toast(`Request sent to ${item.companyName}.`);
      } else {
        await rpc('withdraw_request', { p_job: item.job.id });
        toast(`Request for #${item.job.job_number} withdrawn.`);
      }
      await reload();
      refreshBadge();
    } catch (e) {
      setActionError(friendlyError(e));
      await reload();
    } finally {
      setBusy(null);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHead title="Open jobs" sub="Jobs from moving companies that still need crew. Days you're available are marked." />
      {mover && !mover.id_verified ? (
        <Notice kind="warn" lock={false}>
          You can request jobs now. Companies can book you once your ID is verified.
        </Notice>
      ) : null}
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {actionError ? <ErrorBox message={actionError} /> : null}
      {loading ? (
        <Loading label="Loading open jobs" />
      ) : data && data.length ? (
        <Stack gap={16}>
          {data.map((item) => {
            const outside = !days.includes(weekdayOf(item.job.work_date));
            return (
              <JobTicket
                key={item.job.id}
                job={item.job}
                companyName={item.companyName}
                status={
                  item.mine.kind === 'none' || item.mine.kind === 'requested' ? (
                    <Pill kind="info">{`${item.openSpots} of ${item.job.crew_size} spots open`}</Pill>
                  ) : null
                }
                note={
                  outside ? (
                    <Pill kind="kraft">Outside your set availability</Pill>
                  ) : null
                }
                footer={<JobAction mine={item.mine} busy={busy === item.job.id} disabled={busy !== null} onRequest={() => act(item, 'request')} onWithdraw={() => act(item, 'withdraw')} />}
              />
            );
          })}
        </Stack>
      ) : !error ? (
        <Empty>No open jobs right now. Keep your availability current and companies can invite you.</Empty>
      ) : null}
    </Screen>
  );
}

function JobAction({
  mine,
  busy,
  disabled,
  onRequest,
  onWithdraw,
}: {
  mine: MyJobState;
  busy: boolean;
  disabled: boolean;
  onRequest: () => void;
  onWithdraw: () => void;
}) {
  if (mine.kind === 'none') {
    return <Button title="Request this job" busy={busy} disabled={disabled} onPress={onRequest} />;
  }
  if (mine.kind === 'requested') {
    return (
      <View style={{ gap: 8 }}>
        <Row between>
          <Pill kind="info">Requested</Pill>
          <Button title="Withdraw request" kind="quiet" small busy={busy} disabled={disabled} onPress={onWithdraw} />
        </Row>
        <T kind="smallMuted">The company sees your request and can book you. You'll find it under Bookings if they do.</T>
      </View>
    );
  }
  const [kind, label]: [PillKind, string] = MINE_PILL[mine.status] ?? ['plain', mine.status];
  return (
    <Row>
      <Pill kind={kind}>{label}</Pill>
    </Row>
  );
}
