import { NextResponse } from "next/server";
import { answerQuestionAboutRepository } from "@/lib/analyzer";
import { requireAuthenticatedUser } from "@/lib/session";
import { defaultStore } from "@/lib/store";
import { RepositoryQuestionInputSchema } from "@/lib/validation";

export async function POST(
  request: Request,
  context: { params: Promise<{ projectId: string }> }
) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error.httpStatus });
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
          whatHappened: "Invalid request payload.",
          canRetry: true,
          nextAction: "Enter a question about the repository.",
        },
      },
      { status: 400 }
    );
  }

  const parsed = RepositoryQuestionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          whatHappened: parsed.error.issues[0]?.message ?? "Question is too short.",
          canRetry: true,
          nextAction: "Enter a specific question of at least 5 characters.",
        },
      },
      { status: 400 }
    );
  }

  const { project, metadata, sections, answers } = wsRes.workspace;
  const result = answerQuestionAboutRepository({
    question: parsed.data.question,
    repoOwner: project.owner,
    repoName: project.repoName,
    commitSha: project.lastAnalyzedCommitSha ?? "latest",
    sections,
    answers,
    fileTreePaths: metadata ? metadata.fileTree.map((f) => f.path) : [],
  });

  return NextResponse.json({
    question: parsed.data.question,
    ...result,
  });
}
