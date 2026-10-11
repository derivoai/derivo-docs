import { NextResponse } from "next/server";
import { defaultStore } from "@/lib/store";
import { setSessionCookie } from "@/lib/session";
import { LoginSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = LoginSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            whatHappened: firstIssue?.message ?? "Invalid login details.",
            canRetry: true,
            nextAction: "Enter a valid email address and password.",
          },
        },
        { status: 400 }
      );
    }

    const result = defaultStore.loginUser(parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error.httpStatus });
    }

    await setSessionCookie(result.sessionToken);

    const safeRedirect =
      parsed.data.redirectTo &&
      parsed.data.redirectTo.startsWith("/") &&
      !parsed.data.redirectTo.startsWith("//")
        ? parsed.data.redirectTo
        : result.user.emailVerified
          ? "/dashboard"
          : "/verify-email";

    return NextResponse.json({
      user: result.user,
      redirectTo: safeRedirect,
      verificationToken: result.verificationToken,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "DATABASE_FAILURE",
          whatHappened: "Login failed due to an unexpected server error.",
          canRetry: true,
          nextAction: "Try signing in again.",
        },
      },
      { status: 500 }
    );
  }
}
