import type { BackgroundStatus, Mover } from '@liftcrew/shared';
import { View } from 'react-native';
import { Notice, Pill, Row, T, type PillKind } from './ui';

export const ID_COPY =
  "LiftCrew verifies your ID before companies can book you. We'll text or email you a secure link from our ID partner. LiftCrew never keeps your ID photos or license number.";

export const BACKGROUND_COPY =
  "LiftCrew may also get a background check report about you from a screening company, which moving companies use when deciding to book you. If you drive, it includes your DMV driving record. You'll get the disclosure and an authorization form before anything is run, and you have the right to a copy of the report and to dispute anything inaccurate. The screening company keeps the report; LiftCrew keeps only the result.";

const BG: Record<BackgroundStatus, [PillKind, string]> = {
  not_started: ['plain', 'Background check not started'],
  pending: ['warn', 'Background check in progress'],
  clear: ['ok', 'Background check clear'],
  not_clear: ['bad', 'Background check not clear'],
};

export function VerificationPills({ mover }: { mover: Pick<Mover, 'id_verified' | 'background'> }) {
  const [kind, label] = BG[mover.background] ?? BG.not_started;
  return (
    <Row>
      {mover.id_verified ? <Pill kind="ok">ID verified</Pill> : <Pill kind="warn">ID not verified yet</Pill>}
      <Pill kind={kind}>{label}</Pill>
    </Row>
  );
}

/** Explains where verification stands, in plain words. */
export function VerificationStatus({ mover }: { mover: Pick<Mover, 'id_verified' | 'background'> }) {
  return (
    <View style={{ gap: 10 }}>
      <VerificationPills mover={mover} />
      {!mover.id_verified ? <T kind="small">{ID_COPY}</T> : null}
      {mover.background === 'pending' ? (
        <T kind="smallMuted">Results usually take 1 to 3 business days. You can set your availability and request jobs while you wait.</T>
      ) : null}
      {mover.background === 'not_clear' ? (
        <Notice kind="bad" lock={false}>
          Companies can't book you right now because of your background check result. You have the right to a copy
          of the report from the screening company and to dispute anything inaccurate.
        </Notice>
      ) : null}
    </View>
  );
}
