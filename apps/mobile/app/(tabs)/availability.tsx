import { useCallback, useEffect, useState } from 'react';
import { friendlyError, type Mover } from '@liftcrew/shared';
import { ProfileFields } from '../../src/components/ProfileFields';
import { useToast } from '../../src/components/Toast';
import { VerificationStatus } from '../../src/components/Verification';
import { Button, Card, ErrorBox, Loading, PageHead, Screen, SectionLabel, Stack, T } from '../../src/components/ui';
import { useAuth } from '../../src/lib/auth';
import {
  cleanDraft,
  draftFromMover,
  emptyDraft,
  firstError,
  validateDraft,
  type ProfileDraft,
  type ProfileErrors,
} from '../../src/lib/profileForm';
import { supabase } from '../../src/lib/supabase';
import { useLoad } from '../../src/lib/useLoad';

interface ProfileData {
  mover: Mover;
  phone: string | null;
}

async function loadProfile(moverId: string): Promise<ProfileData> {
  const [m, p] = await Promise.all([
    supabase.from('movers').select('*').eq('id', moverId).single(),
    supabase.from('mover_private').select('phone').eq('mover_id', moverId).maybeSingle(),
  ]);
  if (m.error) throw m.error;
  if (p.error) throw p.error;
  return { mover: m.data as Mover, phone: (p.data?.phone as string | undefined) ?? null };
}

export default function AvailabilityScreen() {
  const auth = useAuth();
  const moverId = auth.mover?.id ?? null;
  const toast = useToast();
  const loader = useCallback(() => loadProfile(moverId!), [moverId]);
  const { data, loading, refreshing, error, refresh, reload } = useLoad(loader, moverId);

  const [draft, setDraft] = useState<ProfileDraft>(emptyDraft);
  const [dirty, setDirty] = useState(false);
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Fill the form from the latest saved profile, but never over unsaved edits.
  useEffect(() => {
    if (data && !dirty) setDraft(draftFromMover(data.mover, data.phone));
  }, [data, dirty]);

  const patch = (p: Partial<ProfileDraft>) => {
    setDirty(true);
    setDraft((d) => ({ ...d, ...p }));
    const keys = Object.keys(p) as (keyof ProfileDraft)[];
    if (keys.some((k) => errors[k])) {
      setErrors((e) => {
        const n = { ...e };
        keys.forEach((k) => delete n[k]);
        return n;
      });
    }
  };

  async function save() {
    if (!moverId) return;
    const errs = validateDraft(draft, { name: true });
    setErrors(errs);
    const first = firstError(errs);
    if (first) {
      setSaveError(`Check the highlighted fields. ${first}`);
      return;
    }
    setSaveError(null);
    setBusy(true);
    const d = cleanDraft(draft);
    try {
      const m = await supabase
        .from('movers')
        .update({
          full_name: d.fullName,
          city: d.city,
          roles: d.roles,
          license: d.license,
          years_experience: d.years,
          asking_rate: d.rate,
          bio: d.bio,
          available_days: d.days,
        })
        .eq('id', moverId)
        .select('id');
      if (m.error) throw m.error;
      if (!m.data?.length) throw new Error("Your profile wasn't saved. Sign out, sign in again and retry.");
      if (d.phone !== (data?.phone ?? '')) {
        const p = await supabase.from('mover_private').update({ phone: d.phone }).eq('mover_id', moverId).select('mover_id');
        if (p.error) throw p.error;
        if (!p.data?.length) throw new Error("Your phone number wasn't saved. Try again.");
      }
      setDirty(false);
      await Promise.all([reload(), auth.refresh()]);
      toast('Availability saved. Companies see the update right away.');
    } catch (e) {
      setSaveError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  async function signOut() {
    setSigningOut(true);
    try {
      await auth.signOut();
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <Screen refreshing={refreshing} onRefresh={dirty ? undefined : refresh}>
      <PageHead title="Availability" sub="Companies looking for crew see these days and your asking rate." />
      {error ? <ErrorBox message={error} onRetry={reload} /> : null}
      {loading ? (
        <Loading label="Loading your profile" />
      ) : data ? (
        <Stack gap={16}>
          <Card>
            <T kind="h3" accessibilityRole="header">
              {data.mover.full_name}
            </T>
            <VerificationStatus mover={data.mover} />
          </Card>
          <ProfileFields draft={draft} errors={errors} onChange={patch} daysFirst showName />
          {saveError ? <ErrorBox message={saveError} /> : null}
          <Button title="Save availability" busy={busy} disabled={!dirty && !saveError} onPress={save} />
          {dirty ? <T kind="smallMuted">You have unsaved changes.</T> : null}
          <SectionLabel>Account</SectionLabel>
          <T kind="smallMuted">{`Signed in as ${auth.session?.user.email ?? 'a mover account'}.`}</T>
          <Button title="Sign out" kind="quiet" busy={signingOut} onPress={signOut} />
        </Stack>
      ) : null}
    </Screen>
  );
}
