import * as Linking from 'expo-linking';

/**
 * Where Supabase email links (confirm sign-up, reset password) send people back to.
 * liftcrew://auth-callback in a build, exp://<your-computer>:8081/--/auth-callback in Expo Go.
 * Add both patterns to Supabase > Authentication > URL Configuration > Redirect URLs.
 */
export const authCallbackUrl = () => Linking.createURL('/auth-callback');

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const MIN_PASSWORD = 8;
