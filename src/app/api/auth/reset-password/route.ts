import { NextResponse } from "next/server";
import { defaultStore } from "@/lib/store";
import { ResetPasswordSchema } from "@/lib/validation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ResetPasswordSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            whatHappened: parsed.error.issues[0]?.message ?? "Invalid password reset details.",
            canRetry: true,
            nextAction: "Ensure your new password is at least 8 characters with letters and numbers.",
          },
        },
        { status: 400 }
      );
    }

    const res = defaultStore.resetPasswordWithToken({
      token: parsed.data.token,
      newPassword: parsed.data.password,
    });
    if (!res.ok) {
      return NextResponse.json({ error: res.error }, { status: res.error.httpStatus });
    }

    return NextResponse.json({
      ok: true,
      user: res.user,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "DATABASE_FAILURE",
          whatHappened: "Could not reset password due to a server error.",
          canRetry: true,
          nextAction: "Try submitting your new password again.",
        },
      },
      { status: 500 }
    );
  }
}
