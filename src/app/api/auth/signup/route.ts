import { NextResponse } from "next/server";
import { getRequestOrigin, sendVerificationEmail } from "@/lib/email";
import { defaultStore } from "@/lib/store";
import { setSessionCookie } from "@/lib/session";
import { SignupSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SignupSchema.safeParse(body);

    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            whatHappened: firstIssue?.message ?? "Invalid signup details.",
            canRetry: true,
            nextAction: "Correct the highlighted form fields and try again.",
          },
        },
        { status: 400 }
      );
    }

    const result = defaultStore.signUpUser(parsed.data);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error.httpStatus });
    }

    await setSessionCookie(result.sessionToken);

    const origin = getRequestOrigin(request);
    // Dispatch verification email in the background without blocking the HTTP response
    void sendVerificationEmail({
      toEmail: result.user.email,
      fullName: result.user.fullName,
      verificationToken: result.verificationToken,
      originUrl: origin,
    }).catch(() => {
      // Background email failure caught cleanly
    });

    return NextResponse.json(
      {
        user: result.user,
        verificationRequired: true,
        emailDispatched: true,
        verificationToken: result.verificationToken,
        verificationUrl: `/verify-email?token=${encodeURIComponent(result.verificationToken)}`,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "DATABASE_FAILURE",
          whatHappened: "Could not complete account registration due to a server error.",
          canRetry: true,
          nextAction: "Submit the signup form again.",
        },
      },
      { status: 500 }
    );
  }
}
