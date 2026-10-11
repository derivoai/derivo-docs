import { NextResponse } from "next/server";
import { getRequestOrigin, sendVerificationEmail } from "@/lib/email";
import { requireAuthenticatedUser } from "@/lib/session";
import { defaultStore } from "@/lib/store";

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error.httpStatus });
  }

  const res = defaultStore.resendVerificationToken(auth.user.id);
  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.error.httpStatus });
  }

  const origin = getRequestOrigin(request);
  const emailResult = res.verificationToken
    ? await sendVerificationEmail({
        toEmail: res.email,
        fullName: auth.user.fullName,
        verificationToken: res.verificationToken,
        originUrl: origin,
      })
    : { sent: false, provider: "local-preview" as const };

  return NextResponse.json({
    ok: true,
    email: res.email,
    emailDispatched: emailResult.sent,
    emailProvider: emailResult.provider,
    verificationToken: res.verificationToken,
    verificationUrl: res.verificationToken
      ? `/verify-email?token=${encodeURIComponent(res.verificationToken)}`
      : null,
  });
}
