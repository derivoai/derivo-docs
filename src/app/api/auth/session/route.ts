import { NextResponse } from "next/server";
import { getAuthenticatedSession } from "@/lib/session";

export async function GET() {
  const session = await getAuthenticatedSession();
  return NextResponse.json({
    user: session.user,
    pendingVerificationToken: session.pendingVerificationToken,
  });
}
