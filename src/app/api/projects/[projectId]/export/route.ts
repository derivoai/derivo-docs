import { NextResponse } from "next/server";
import { buildFullProjectMarkdownExport } from "@/lib/markdown";
import { requireAuthenticatedUser } from "@/lib/session";
import { defaultStore } from "@/lib/store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error.httpStatus });
  }

  const { projectId } = await context.params;
  const recorded = defaultStore.recordMarkdownExport({
    actingUserId: auth.user.id,
    projectId,
  });

  if (!recorded.ok) {
    return NextResponse.json({ error: recorded.error }, { status: recorded.error.httpStatus });
  }

  const markdown = buildFullProjectMarkdownExport(recorded.workspace);

  return NextResponse.json({
    exportRecord: recorded.exportRecord,
    fileName: recorded.exportRecord.fileName,
    markdown,
    workspace: recorded.workspace,
  });
}
