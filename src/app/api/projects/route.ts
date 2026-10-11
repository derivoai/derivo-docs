import { NextResponse } from "next/server";
import { analyzeRepositoryWithClaude } from "@/lib/analyzer";
import { inspectPublicGitHubRepository } from "@/lib/github";
import { requireAuthenticatedUser } from "@/lib/session";
import { defaultStore } from "@/lib/store";
import { parsePublicGitHubUrl, RepoSubmissionSchema } from "@/lib/validation";

export async function GET() {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error.httpStatus });
  }

  const projects = defaultStore.listProjectsForUser(auth.user.id);
  return NextResponse.json({
    user: auth.user,
    projects,
  });
}

export async function POST(request: Request) {
  const auth = await requireAuthenticatedUser();
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.error.httpStatus });
  }

  // Enforce email verification restriction before any repository analysis
  const verifiedCheck = defaultStore.requireVerifiedUser(auth.user.id);
  if (!verifiedCheck.ok) {
    return NextResponse.json(
      { error: verifiedCheck.error },
      { status: verifiedCheck.error.httpStatus }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          whatHappened: "Request body could not be parsed as JSON.",
          canRetry: true,
          nextAction: "Submit a valid public GitHub repository URL.",
        },
      },
      { status: 400 }
    );
  }

  const subParsed = RepoSubmissionSchema.safeParse(body);
  if (!subParsed.success) {
    return NextResponse.json(
      {
        error: {
          code: "INVALID_URL",
          whatHappened: "No repository URL was provided.",
          canRetry: true,
          nextAction: "Paste a public GitHub URL such as https://github.com/owner/repository.",
        },
      },
      { status: 400 }
    );
  }

  const urlParsed = parsePublicGitHubUrl(subParsed.data.repoUrl);
  if (!urlParsed.ok) {
    return NextResponse.json(
      { error: urlParsed.error },
      { status: urlParsed.error.httpStatus }
    );
  }

  const initRes = defaultStore.createOrResetProjectForAnalysis({
    actingUserId: auth.user.id,
    normalizedUrl: urlParsed.data.normalizedUrl,
    owner: urlParsed.data.owner,
    repoName: urlParsed.data.repo,
  });

  if (!initRes.ok) {
    return NextResponse.json(
      { error: initRes.error },
      { status: initRes.error.httpStatus }
    );
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

  // Stages 0..4: GitHub repository validation, metadata, tree, file filtering, language/framework detection
  const githubRes = await inspectPublicGitHubRepository(
    urlParsed.data.normalizedUrl,
    advanceStage
  );

  if (!githubRes.ok) {
    defaultStore.failAnalysisRun({
      actingUserId: auth.user.id,
      projectId: project.id,
      runId: run.id,
      error: githubRes.error,
    });
    return NextResponse.json(
      { error: githubRes.error, projectId: project.id },
      { status: githubRes.error.httpStatus }
    );
  }

  // Stages 5..7: Claude analysis + schema validation + uncertainty check
  const analysisRes = await analyzeRepositoryWithClaude(
    githubRes.data,
    advanceStage
  );

  if (!analysisRes.ok) {
    defaultStore.failAnalysisRun({
      actingUserId: auth.user.id,
      projectId: project.id,
      runId: run.id,
      error: analysisRes.error,
    });
    return NextResponse.json(
      { error: analysisRes.error, projectId: project.id },
      { status: analysisRes.error.httpStatus }
    );
  }

  // Stage 8: Preparing review preview
  advanceStage(8);

  // Stage 9: Ready for review
  const finalized = defaultStore.finalizeAnalysisRun({
    actingUserId: auth.user.id,
    projectId: project.id,
    runId: run.id,
    repoBundle: githubRes.data,
    analysisOutput: analysisRes.data,
  });

  if (!finalized.ok) {
    return NextResponse.json(
      { error: finalized.error },
      { status: finalized.error.httpStatus }
    );
  }

  return NextResponse.json(
    {
      workspace: finalized.workspace,
    },
    { status: 201 }
  );
}
