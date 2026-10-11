import { Redirect, useRouter } from 'expo-router';
import { useState } from 'react';
import { COPY, firstName, friendlyError } from '@liftcrew/shared';
import { ProfileFields } from '../src/components/ProfileFields';
import { useToast } from '../src/components/Toast';
import { BACKGROUND_COPY, ID_COPY, VerificationPills } from '../src/components/Verification';
import { Button, ErrorBox, LinkButton, Notice, PageHead, Screen, Stack, T } from '../src/components/ui';
import { useAuth } from '../src/lib/auth';
import {
  cleanDraft,
  emptyDraft,
  firstError,
  validateDraft,
  type ProfileDraft,
  type ProfileErrors,
} from '../src/lib/profileForm';
import { rpc } from '../src/lib/supabase';

/** New mover sign-up: "About you" creates the profile, then ID and background check are explained. */
export default function Onboarding() {
  const { status, mover, refresh, signOut } = useAuth();
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<'about' | 'verify'>('about');
  const [draft, setDraft] = useState<ProfileDraft>({ ...emptyDraft, days: ['Sat', 'Sun'] });
  const [errors, setErrors] = useState<ProfileErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (status === 'signedOut' || status === 'company' || status === 'error') return <Redirect href="/" />;
  // Already has a profile (for example reopening the app): go to jobs, unless we just created it here.
  if (status === 'mover' && step === 'about') return <Redirect href="/jobs" />;

  const patch = (p: Partial<ProfileDraft>) => {
    setDraft((d) => ({ ...d, ...p }));
    const keys = Object.keys(p) as (keyof ProfileDraft)[];
    if (keys.some((k) => errors[k])) setErrors((e) => { const n = { ...e }; keys.forEach((k) => delete n[k]); return n; });
  };

  async function createProfile() {
    const errs = validateDraft(draft, { name: true });
    setErrors(errs);
    const first = firstError(errs);
    if (first) {
      setError(`Check the highlighted fields. ${first}`);
      return;
    }
    setError(null);
    setBusy(true);
    const d = cleanDraft(draft);
    try {
      await rpc('create_mover_profile', {
        p_full_name: d.fullName,
        p_city: d.city,
        p_roles: d.roles,
        p_license: d.license,
        p_years: d.years,
        p_asking_rate: d.rate,
        p_bio: d.bio,
        p_available_days: d.days,
        p_phone: d.phone,
      });
      setStep('verify');
      await refresh();
    } catch (e) {
      setError(friendlyError(e));
    } finally {
      setBusy(false);
    }
  }

  if (step === 'verify') {
    const name = mover ? firstName(mover.full_name) : firstName(draft.fullName.trim());
    return (
      <Screen>
        <PageHead eyebrow="STEP 2 OF 2" title="ID and background check" sub={`You're signed up, ${name}.`} />
        <Notice kind="kraft" title="Verify your ID">
          {ID_COPY}
        </Notice>
        <Notice kind="kraft" title="Background check">
          {BACKGROUND_COPY}
        </Notice>
        {mover ? (
          <Stack gap={8}>
            <T kind="bold">Where things stand</T>
            <VerificationPills mover={mover} />
          </Stack>
        ) : null}
        <T kind="muted">
          While you wait, you can browse and request jobs and keep your availability current. Companies can book you once
          your ID is verified. When one books you for the first time, it sends you its own hiring paperwork.
        </T>
        <Button
          title="Go to jobs"
          busy={status === 'loading'}
          onPress={() => {
            toast('Set your days and rate any time on the Availability tab.');
            router.replace('/jobs');
          }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      <PageHead
        eyebrow="STEP 1 OF 2"
        title="About you"
        sub="Moving companies see your name, home base, roles, license class, experience and rate. Your phone number stays private until you're booked."
      />
      <ProfileFields draft={draft} errors={errors} onChange={patch} showName />
      <Notice kind="kraft" title="How hiring works">
        {COPY.moverEmployerModel}
      </Notice>
      {error ? <ErrorBox message={error} /> : null}
      <Button title="Continue" busy={busy} onPress={createProfile} />
      <LinkButton title="Sign out" onPress={signOut} />
    </Screen>
  );
}
