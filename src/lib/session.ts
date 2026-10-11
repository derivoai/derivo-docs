import { cookies } from "next/headers";
import { createSupabaseServerClient } from "./supabase/server";
import { defaultStore, verifySignedSessionToken } from "./store";
import { StructuredAppError, UserProfile } from "./types";

export const SESSION_COOKIE_NAME = "derivo_session";

export async function getAuthenticatedSession(): Promise<{
  user: UserProfile | null;
  pendingVerificationToken: string | null;
}> {
  // 1. Check signed HTTP-only session cookie first (fast, supports Resend email verification flow)
  const cookieStore = await cookies();
  const rawToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (rawToken) {
    const verified = verifySignedSessionToken(rawToken);
    if (verified.ok) {
      const profileBundle = defaultStore.getUserProfile(verified.userId);
      if (profileBundle) {
        return {
          user: profileBundle.user,
          pendingVerificationToken: profileBundle.pendingVerificationToken,
        };
      }
    }
  }

  // 2. Check Supabase Auth session if configured
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    try {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        const u = data.user;
        return {
          user: {
            id: u.id,
            email: u.email ?? "",
            fullName:
              (u.user_metadata?.full_name as string | undefined) ||
              u.email?.split("@")[0] ||
              "Developer",
            emailVerified: Boolean(u.email_confirmed_at),
            projectsLimit: Number(process.env.MAX_PROJECTS_PER_USER || 15),
            createdAt: u.created_at,
            updatedAt: u.updated_at ?? u.created_at,
          },
          pendingVerificationToken: null,
        };
      }
    } catch {
      // Ignore network/session lookup failure
    }
  }

  return { user: null, pendingVerificationToken: null };
}

export async function requireAuthenticatedUser(): Promise<
  | { ok: true; user: UserProfile; pendingVerificationToken: string | null }
  | { ok: false; error: StructuredAppError }
> {
  const session = await getAuthenticatedSession();
  if (!session.user) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        whatHappened: "Your session is missing or has expired.",
        canRetry: false,
        nextAction: "Log in with your email and password to continue.",
        httpStatus: 401,
      },
    };
  }
  return {
    ok: true,
    user: session.user,
    pendingVerificationToken: session.pendingVerificationToken,
  };
}

export async function setSessionCookie(sessionToken: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearSessionCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
