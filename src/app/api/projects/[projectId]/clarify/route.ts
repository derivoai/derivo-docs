import { NextResponse } from "next/server";
import { regenerateSectionWithClarification } from "@/lib/analyzer";
import { requireAuthenticatedUser } from "@/lib/session";
import { defaultStore } from "@/lib/store";
import { AnswerClarificationSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error.httpStatus });
  }

  const verified = defaultStore.requireVerifiedUser(auth.user.id);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.error.httpStatus });
  }

  const { projectId } = await context.params;
  const wsRes = defaultStore.getProjectWorkspace({
    actingUserId: auth.user.id,
    projectId,
  });
  if (!wsRes.ok) {
    return NextResponse.json({ error: wsRes.error }, { status: wsRes.error.httpStatus });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          whatHappened: "Request payload could not be parsed.",
          canRetry: true,
          nextAction: "Enter a clarification answer and submit again.",
        },
      },
      { status: 400 }
    );
  }

  const parsed = AnswerClarificationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          whatHappened: parsed.error.issues[0]?.message ?? "Invalid clarification answer.",
          canRetry: true,
          nextAction: "Provide a clear answer of at least 2 characters.",
        },
      },
      { status: 400 }
    );
  }

  const question = wsRes.workspace.questions.find(
    (q) => q.id === parsed.data.questionId
  );
  if (!question) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          whatHappened: "Clarification question was not found in this project.",
          canRetry: false,
          nextAction: "Refresh the project workspace.",
        },
      },
      { status: 404 }
    );
  }

  const targetSection = wsRes.workspace.sections.find(
    (s) => s.sectionKey === question.sectionKey
  );
  if (!targetSection) {
    return NextResponse.json(
      {
        error: {
          code: "NOT_FOUND",
          whatHappened: "Affected documentation section was not found.",
          canRetry: false,
          nextAction: "Re-analyze the repository.",
        },
      },
      { status: 404 }
    );
  }

  const priorSectionAnswers = wsRes.workspace.answers.filter(
    (a) => a.sectionKey === question.sectionKey
  );
  const combinedAnswers = [
    ...priorSectionAnswers,
    {
      id: "pending-answer",
      questionId: question.id,
      projectId,
      userId: auth.user.id,
      sectionKey: question.sectionKey,
      answerText: parsed.data.answerText,
      selectedOption: parsed.data.selectedOption ?? null,
      isCustom: parsed.data.isCustom,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const regenRes = await regenerateSectionWithClarification({
    existingSection: targetSection,
    question,
    allSectionAnswers: combinedAnswers,
    repoOwner: wsRes.workspace.project.owner,
    repoName: wsRes.workspace.project.repoName,
    commitSha: wsRes.workspace.project.lastAnalyzedCommitSha ?? "latest",
  });

  if (!regenRes.ok) {
    return NextResponse.json({ error: regenRes.error }, { status: regenRes.error.httpStatus });
  }

  const saved = defaultStore.recordClarificationAnswerAndUpdateSection({
    actingUserId: auth.user.id,
    projectId,
    questionId: question.id,
    answerText: parsed.data.answerText,
    selectedOption: parsed.data.selectedOption ?? null,
    isCustom: parsed.data.isCustom,
    regeneratedSection: regenRes.data,
  });

  if (!saved.ok) {
    return NextResponse.json({ error: saved.error }, { status: saved.error.httpStatus });
  }

  return NextResponse.json({
    answer: saved.answer,
    updatedSection: saved.updatedSection,
    workspace: saved.workspace,
  });
}
