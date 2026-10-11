import { NextResponse } from "next/server";
import { requireAuthenticatedUser } from "@/lib/session";
import { defaultStore } from "@/lib/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error.httpStatus });
  }

  const { projectId } = await context.params;
  const res = defaultStore.getProjectWorkspace({
    actingUserId: auth.user.id,
    projectId,
  });

  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.error.httpStatus });
  }

  return NextResponse.json({ workspace: res.workspace });
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error.httpStatus });
  }

  const { projectId } = await context.params;
  const res = defaultStore.deleteProject({
    actingUserId: auth.user.id,
    projectId,
  });

  if (!res.ok) {
    return NextResponse.json({ error: res.error }, { status: res.error.httpStatus });
  }

  return NextResponse.json({ ok: true });
}
