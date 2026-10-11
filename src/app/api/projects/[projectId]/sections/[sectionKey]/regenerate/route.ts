import { NextResponse } from "next/server";
import { regenerateSectionWithClarification } from "@/lib/analyzer";
import { requireAuthenticatedUser } from "@/lib/session";
import { defaultStore } from "@/lib/store";
import { RegenerateSectionInputSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string; sectionKey: string }> }
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error.httpStatus });
  }

  const verified = defaultStore.requireVerifiedUser(auth.user.id);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.error.httpStatus });
  }

  const { projectId, sectionKey } = await context.params;
  const wsRes = defaultStore.getProjectWorkspace({
    actingUserId: auth.user.id,
    projectId,
  });
  if (!wsRes.ok) {
    return NextResponse.json({ error: wsRes.error }, { status: wsRes.error.httpStatus });
  }

  let customNote: string | undefined;
  try {
    const body = (await request.json()) as { customNote?: string };
    customNote = body?.customNote;
  } catch {
    customNote = undefined;
  }

  const parsed = RegenerateSectionInputSchema.safeParse({
    sectionKey,
    customNote,
  });
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          whatHappened: "Invalid section key or regeneration note.",
          canRetry: true,
          nextAction: "Select a valid documentation section to regenerate.",
        },
      },
      { status: 400 }
    );
  }

  const targetSection = wsRes.workspace.sections.find(
    (s) => s.sectionKey === parsed.data.sectionKey
  );
  if (!targetSection) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          whatHappened: "Target documentation section was not found.",
          canRetry: false,
          nextAction: "Refresh the workspace.",
        },
      },
      { status: 404 }
    );
  }

  const sectionAnswers = wsRes.workspace.answers.filter(
    (a) => a.sectionKey === parsed.data.sectionKey
  );

  const regenRes = await regenerateSectionWithClarification({
    existingSection: targetSection,
    allSectionAnswers: sectionAnswers,
    customInstruction:
      parsed.data.customNote ||
      `Re-verified section at ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.`,
    repoOwner: wsRes.workspace.project.owner,
    repoName: wsRes.workspace.project.repoName,
    commitSha: wsRes.workspace.project.lastAnalyzedCommitSha ?? "latest",
  });

  if (!regenRes.ok) {
    return NextResponse.json({ error: regenRes.error }, { status: regenRes.error.httpStatus });
  }

  const updated = defaultStore.updateSingleSectionContent({
    actingUserId: auth.user.id,
    projectId,
    sectionKey: parsed.data.sectionKey,
    regenerated: regenRes.data,
  });

  if (!updated.ok) {
    return NextResponse.json({ error: updated.error }, { status: updated.error.httpStatus });
  }

  return NextResponse.json({
    updatedSection: updated.updatedSection,
    workspace: updated.workspace,
  });
}
