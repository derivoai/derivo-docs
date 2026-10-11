import { NextResponse } from "next/server";
import { getRequestOrigin, sendPasswordResetEmail } from "@/lib/email";
import { defaultStore } from "@/lib/store";
import { ForgotPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ForgotPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            whatHappened: parsed.error.issues[0]?.message ?? "Enter a valid email address.",
            canRetry: true,
            nextAction: "Check the email address format and submit again.",
          },
        },
        { status: 400 }
      );
    }

    const res = defaultStore.createPasswordResetToken(parsed.data.email);

    const origin = getRequestOrigin(request);
    let emailSent = false;
    if (res.resetToken) {
      const dispatch = await sendPasswordResetEmail({
        toEmail: parsed.data.email,
        resetToken: res.resetToken,
        originUrl: origin,
      });
      emailSent = dispatch.sent;
    }

    return NextResponse.json({
      ok: true,
      emailDispatched: emailSent,
      message:
        "If an account exists for that email address, a password reset link has been sent from No-reply Derivo <no-reply@derivo.in>.",
      resetToken: res.resetToken,
      resetUrl: res.resetToken
        ? `/reset-password?token=${encodeURIComponent(res.resetToken)}`
        : null,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "DATABASE_FAILURE",
          whatHappened: "Could not process password reset request.",
          canRetry: true,
          nextAction: "Try again in a moment.",
        },
      },
      { status: 500 }
    );
  }
}
