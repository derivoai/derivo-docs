import { NextResponse } from "next/server";
import { analyzeRepositoryWithClaude } from "@/lib/analyzer";
import { inspectPublicGitHubRepository } from "@/lib/github";
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

  const verified = defaultStore.requireVerifiedUser(auth.user.id);
  if (!verified.ok) {
    return NextResponse.json({ error: verified.error }, { status: verified.error.httpStatus });
  }

  const { projectId } = await context.params;
  const existing = defaultStore.getProjectWorkspace({
    actingUserId: auth.user.id,
    projectId,
  });

  if (!existing.ok) {
    return NextResponse.json({ error: existing.error }, { status: existing.error.httpStatus });
  }

  const initRes = defaultStore.createOrResetProjectForAnalysis({
    actingUserId: auth.user.id,
    normalizedUrl: existing.workspace.project.repoUrl,
    owner: existing.workspace.project.owner,
    repoName: existing.workspace.project.repoName,
    existingProjectId: projectId,
  });

  if (!initRes.ok) {
    return NextResponse.json({ error: initRes.error }, { status: initRes.error.httpStatus });
  }

  const { project, run } = initRes;
  const advanceStage = (stageIndex: number) => {
    defaultStore.advanceAnalysisStage({
      actingUserId: auth.user.id,
      projectId: project.id,
      runId: run.id,
      stageIndex,
    });
  };

  const githubRes = await inspectPublicGitHubRepository(project.repoUrl, advanceStage);
  if (!githubRes.ok) {
    defaultStore.failAnalysisRun({
      actingUserId: auth.user.id,
      projectId: project.id,
      runId: run.id,
      error: githubRes.error,
    });
    return NextResponse.json({ error: githubRes.error }, { status: githubRes.error.httpStatus });
  }

  const analysisRes = await analyzeRepositoryWithClaude(githubRes.data, advanceStage);
  if (!analysisRes.ok) {
    defaultStore.failAnalysisRun({
      actingUserId: auth.user.id,
      projectId: project.id,
      runId: run.id,
      error: analysisRes.error,
    });
    return NextResponse.json({ error: analysisRes.error }, { status: analysisRes.error.httpStatus });
  }

  advanceStage(8);
  const finalized = defaultStore.finalizeAnalysisRun({
    actingUserId: auth.user.id,
    projectId: project.id,
    runId: run.id,
    repoBundle: githubRes.data,
    analysisOutput: analysisRes.data,
  });

  if (!finalized.ok) {
    return NextResponse.json({ error: finalized.error }, { status: finalized.error.httpStatus });
  }

  return NextResponse.json({ workspace: finalized.workspace });
}
