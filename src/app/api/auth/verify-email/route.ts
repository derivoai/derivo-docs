import { NextResponse } from "next/server";
import { defaultStore } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { token?: string };
    const token = body?.token?.trim() ?? "";

    if (!token) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            whatHappened: "No verification token was provided.",
            canRetry: false,
            nextAction: "Open the verification link from your email or request a new verification email.",
          },
        },
        { status: 400 }
      );
    }

    const result = defaultStore.verifyEmailToken(token);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.error.httpStatus });
    }

    return NextResponse.json({
      ok: true,
      user: result.user,
    });
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "DATABASE_FAILURE",
          whatHappened: "Could not verify email token due to a server error.",
          canRetry: true,
          nextAction: "Retry email verification.",
        },
      },
      { status: 500 }
    );
  }
}
