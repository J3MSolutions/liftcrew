import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../env';

/** Pages anyone can open without signing in. */
const PUBLIC_PATHS = ['/login', '/signup', '/forgot-password', '/reset-password', '/auth', '/movers-only'];
/** Pages a signed-in user doesn't need; send them into the app instead. */
const SIGNED_OUT_ONLY = ['/login', '/signup', '/forgot-password'];

const matches = (path: string, list: string[]) => list.some((p) => path === p || path.startsWith(p + '/'));

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return response;

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Do not put code between createServerClient and getUser(): getUser() refreshes the session.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  if (!user && !matches(path, PUBLIC_PATHS)) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (path !== '/') url.searchParams.set('next', path + request.nextUrl.search);
    return redirectWithCookies(url, response);
  }

  if (user && matches(path, SIGNED_OUT_ONLY)) {
    const url = request.nextUrl.clone();
    url.pathname = '/jobs';
    url.search = '';
    return redirectWithCookies(url, response);
  }

  return response;
}

/** Redirect while keeping any refreshed auth cookies. */
function redirectWithCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((c) => redirect.cookies.set(c));
  return redirect;
}
