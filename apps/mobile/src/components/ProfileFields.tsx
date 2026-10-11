import { BIO_MAX, LICENSES, ROLES, WEEKDAYS } from '@liftcrew/shared';
import { Field, RadioGroup, ToggleGroup } from './ui';
import type { ProfileDraft, ProfileErrors } from '../lib/profileForm';
import { View } from 'react-native';

/** The mover profile inputs shared by onboarding and the Availability tab. */
export function ProfileFields({
  draft,
  errors,
  onChange,
  showName,
  daysFirst,
}: {
  draft: ProfileDraft;
  errors: ProfileErrors;
  onChange: (patch: Partial<ProfileDraft>) => void;
  showName?: boolean;
  daysFirst?: boolean;
}) {
  const days = (
    <ToggleGroup
      label="Days I can work"
      options={WEEKDAYS}
      value={draft.days}
      onChange={(v) => onChange({ days: v })}
      hint="Companies looking for crew see these days. Jobs on other days are marked in Jobs."
    />
  );
  return (
    <View style={{ gap: 16 }}>
      {daysFirst ? days : null}
      {showName ? (
        <Field
          label="Full legal name"
          hint="Use the name on your ID. Companies use it for your hiring paperwork."
          value={draft.fullName}
          onChangeText={(v) => onChange({ fullName: v })}
          error={errors.fullName}
          autoComplete="name"
          textContentType="name"
          autoCapitalize="words"
          maxLength={80}
        />
      ) : null}
      <Field
        label="Mobile number"
        hint="Private. Only companies with a current booking can see it."
        value={draft.phone}
        onChangeText={(v) => onChange({ phone: v })}
        error={errors.phone}
        keyboardType="phone-pad"
        autoComplete="tel"
        textContentType="telephoneNumber"
        maxLength={20}
      />
      <Field
        label="Home base"
        hint="City or town you usually start from."
        value={draft.city}
        onChangeText={(v) => onChange({ city: v })}
        error={errors.city}
        autoCapitalize="words"
        maxLength={80}
      />
      <RadioGroup
        label="Driver's license"
        options={LICENSES}
        value={draft.license}
        onChange={(v) => onChange({ license: v })}
        hint="Class B or A is needed for trucks over 26,000 lbs."
      />
      <ToggleGroup
        label="Work I can do"
        options={ROLES}
        value={draft.roles}
        onChange={(v) => onChange({ roles: v })}
        error={errors.roles}
      />
      <View style={{ flexDirection: 'row', gap: 12 }}>
        <View style={{ flex: 1 }}>
          <Field
            label="Years of experience"
            value={draft.years}
            onChangeText={(v) => onChange({ years: v.replace(/[^0-9]/g, '') })}
            error={errors.years}
            keyboardType="number-pad"
            maxLength={2}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Asking rate ($/hr)"
            value={draft.rate}
            onChangeText={(v) => onChange({ rate: v.replace(/[^0-9.]/g, '') })}
            error={errors.rate}
            keyboardType="decimal-pad"
            maxLength={6}
          />
        </View>
      </View>
      <Field
        label="About me"
        hint="A short note for companies: experience, equipment, what you're good at. No ID or account numbers."
        value={draft.bio}
        onChangeText={(v) => onChange({ bio: v })}
        error={errors.bio}
        multiline
        maxLength={BIO_MAX}
        counter={BIO_MAX}
      />
      {daysFirst ? null : days}
    </View>
  );
}
