import { useCallback, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { COPY, LATE_CANCEL_HOURS, NOTE_MAX, containsSensitiveNumber, fmtDate, friendlyError } from '@liftcrew/shared';
import { Sheet } from '../../src/components/Sheet';
import { useToast } from '../../src/components/Toast';
import {
  Button,
  Card,
  Chip,
  Empty,
  ErrorBox,
  Field,
  Loading,
  Notice,
  PageHead,
  Pill,
  Row,
  Screen,
  SectionLabel,
  Stack,
  T,
} from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import { plural } from '../../src/lib/format';
import { loadMyRecord, type ReviewRow } from '../../src/lib/queries';
import { rpc } from '../../src/lib/supabase';
import { useLoad } from '../../src/lib/useLoad';
import { fonts, useTheme } from '../../src/theme';

const DISPUTE_MAX = 500;

type Writing = { kind: 'response' | 'dispute'; review: ReviewRow } | null;

export default function RecordScreen() {
  const { mover } = useAuth();
  const moverId = mover?.id ?? null;
  const toast = useToast();
  const loader = useCallback(() => loadMyRecord(moverId!), [moverId]);
  const { data, loading, refreshing, error, refresh, reload } = useLoad(loader, moverId);
  const [writing, setWriting] = useState<Writing>(null);

  const stats = data?.stats ?? null;
  const pct = (v: number | null | undefined) => (v == null ? '–' : `${v}%`);

  return (
    <Screen refreshing={refreshing} onRefresh={refresh}>
      <PageHead title="My record" sub="What moving companies have reported about jobs you worked." />
      <Notice kind="kraft">{COPY.reviewsPrivacyMover}</Notice>
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading ? (
        <Loading label="Loading your record" />
      ) : data ? (
        <>
          <Stats
            items={[
              [String(stats?.jobs_completed ?? 0), 'Jobs'],
              [pct(stats?.on_time_pct), 'On time'],
              [pct(stats?.rebook_pct), 'Rebook'],
              [String(stats?.late_cancels ?? 0), 'Late cancels'],
            ]}
          />
          {stats && stats.late_cancels > 0 ? (
            <Row>
              <Pill kind="warn">{plural(stats.late_cancels, 'late cancellation')}</Pill>
              <T kind="smallMuted">{`Companies see cancellations made less than ${LATE_CANCEL_HOURS} hours before a job.`}</T>
            </Row>
          ) : null}
          <SectionLabel>Reviews from companies</SectionLabel>
          {data.reviews.length ? (
            <Stack gap={12}>
              {data.reviews.map((r) => (
                <ReviewCard
                  key={r.id}
                  review={r}
                  onRespond={() => setWriting({ kind: 'response', review: r })}
                  onDispute={() => setWriting({ kind: 'dispute', review: r })}
                />
              ))}
            </Stack>
          ) : (
            <Empty>No reviews yet. They appear after a company marks a job you worked as complete.</Empty>
          )}
        </>
      ) : null}

      <WriteSheet
        writing={writing}
        onClose={() => setWriting(null)}
        onDone={async (message) => {
          setWriting(null);
          toast(message);
          await reload();
        }}
      />
    </Screen>
  );
}

function Stats({ items }: { items: [string, string][] }) {
  const { c } = useTheme();
  return (
    <View style={styles.stats}>
      {items.map(([v, k]) => (
        <View
          key={k}
          style={[styles.stat, { backgroundColor: c.surface, borderColor: c.line }]}
          accessible
          accessibilityLabel={`${k}: ${v === '–' ? 'not enough reviews yet' : v}`}
        >
          <Text style={{ fontFamily: fonts.mono, fontSize: 20, fontWeight: '700', color: c.ink }}>{v}</Text>
          <Text style={{ fontSize: 12, color: c.muted }}>{k}</Text>
        </View>
      ))}
    </View>
  );
}

function ReviewCard({ review: r, onRespond, onDispute }: { review: ReviewRow; onRespond: () => void; onDispute: () => void }) {
  const { c } = useTheme();
  const meta = [r.jobNumber ? `#${r.jobNumber}` : null, fmtDate(r.workDate ?? r.created_at)].filter(Boolean).join(' · ');
  const dispute = r.dispute;
  return (
    <Card>
      <Row between style={{ alignItems: 'flex-start' }}>
        <T kind="bold" style={{ flex: 1, minWidth: 140 }}>
          {r.companyName}
        </T>
        <T kind="ticketNo">{meta}</T>
      </Row>
      <Row>
        {r.showed ? <Pill kind="ok">Showed up</Pill> : <Pill kind="bad">No-show</Pill>}
        {r.showed ? r.on_time ? <Pill kind="ok">On time</Pill> : <Pill kind="warn">Late</Pill> : null}
        {r.rebook ? <Pill kind="ok">Would book again</Pill> : <Pill kind="bad">Would not book again</Pill>}
        {dispute?.status === 'open' ? <Pill kind="info">Under dispute</Pill> : null}
        {dispute?.status === 'upheld' ? <Pill kind="plain">Dispute reviewed: review stands</Pill> : null}
      </Row>
      {r.strengths.length ? (
        <Row>
          {r.strengths.map((s) => (
            <Chip key={s}>{s}</Chip>
          ))}
        </Row>
      ) : null}
      {r.note ? (
        <View style={[styles.note, { borderLeftColor: c.kraftTape }]}>
          <T>{r.note}</T>
        </View>
      ) : null}
      {r.response ? (
        <View style={[styles.response, { backgroundColor: c.sunk, borderColor: c.line }]}>
          <T kind="small">
            <T kind="small" style={{ fontWeight: '700' }}>
              Your response:{' '}
            </T>
            {r.response.body}
          </T>
        </View>
      ) : null}
      {!r.response || !dispute ? (
        <Row>
          {!r.response ? <Button title="Add a response" kind="quiet" small onPress={onRespond} /> : null}
          {!dispute ? <Button title="Dispute this review" kind="danger" small onPress={onDispute} /> : null}
        </Row>
      ) : null}
    </Card>
  );
}

function WriteSheet({
  writing,
  onClose,
  onDone,
}: {
  writing: Writing;
  onClose: () => void;
  onDone: (message: string) => void;
}) {
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const isResponse = writing?.kind === 'response';
  const max = isResponse ? NOTE_MAX : DISPUTE_MAX;

  const close = () => {
    setText('');
    setError(null);
    onClose();
  };

  async function submit() {
    if (!writing) return;
    const body = text.trim();
    if (!body) return setError(isResponse ? 'Write a response first, or cancel.' : 'Say what is inaccurate, or cancel.');
    if (body.length > max) return setError(`Keep it under ${max} characters.`);
    if (containsSensitiveNumber(body)) return setError(COPY.sensitive);
    setError(null);
    setBusy(true);
    try {
      if (isResponse) {
        await rpc('respond_to_review', { p_review: writing.review.id, p_body: body });
      } else {
        await rpc('dispute_review', { p_review: writing.review.id, p_reason: body });
      }
      setText('');
      onDone(
        isResponse
          ? 'Response posted. Companies see it with the review.'
          : 'Dispute sent to LiftCrew support. We review disputes within 5 business days.',
      );
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  const r = writing?.review;
  return (
    <Sheet
      visible={!!writing}
      onClose={close}
      title={isResponse ? 'Respond to this review' : 'Dispute this review'}
      sub={r ? `${r.companyName}${r.jobNumber ? ` · #${r.jobNumber}` : ''}` : undefined}
    >
      <T kind="smallMuted">
        {isResponse
          ? 'Your response shows under the review for moving companies. You can post one response per review, and it can’t be edited later.'
          : 'Tell LiftCrew support what is inaccurate about this review. Companies see that the review is under dispute while we look into it.'}
      </T>
      {error ? <ErrorBox message={error} /> : null}
      <Field
        label={isResponse ? 'Your response' : 'What is inaccurate?'}
        hint="Stick to what happened on this job. No ID or account numbers."
        value={text}
        onChangeText={setText}
        multiline
        maxLength={max}
        counter={max}
        autoFocus
      />
      <Row style={{ justifyContent: 'flex-end' }}>
        <Button title="Cancel" kind="quiet" onPress={close} />
        <Button title={isResponse ? 'Post response' : 'Send dispute'} kind={isResponse ? 'primary' : 'danger'} busy={busy} onPress={submit} />
      </Row>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 8, alignItems: 'center', gap: 2 },
  note: { borderLeftWidth: 3, paddingLeft: 10 },
  response: { borderWidth: 1, borderRadius: 6, padding: 10 },
});
