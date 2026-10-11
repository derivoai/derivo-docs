"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Download,
  FolderGit2,
  GitBranch,
  GitCommit,
  MailWarning,
  Plus,
  RefreshCw,
  Trash2,
} from "lucide-react";
import {
  ANALYSIS_STAGES,
  AnalysisStage,
  ProjectRecord,
  ProjectStatus,
  StructuredAppError,
  UserProfile,
} from "@/lib/types";
import {
  ConfirmDialog,
  ErrorAlert,
  StageProgressTracker,
  StatusIndicator,
} from "./ui/primitives";

interface DashboardClientProps {
  user: UserProfile;
  initialProjects: ProjectRecord[];
  initialRepoParam?: string;
}

export function DashboardClient({
  user,
  initialProjects,
  initialRepoParam = "",
}: DashboardClientProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [projects, setProjects] = useState<ProjectRecord[]>(initialProjects);
  const [repoUrl, setRepoUrl] = useState(initialRepoParam);
  const [analyzing, setAnalyzing] = useState(false);
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [error, setError] = useState<StructuredAppError | null>(null);
  const [statusNotice, setStatusNotice] = useState<string | null>(null);

  // Per-project action states
  const [reanalyzingId, setReanalyzingId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ProjectRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Advance the visible stage indicator smoothly through real stages while the server analysis request runs
  useEffect(() => {
    if (!analyzing) return;
    const timer = setInterval(() => {
      setActiveStageIndex((prev) =>
        prev < ANALYSIS_STAGES.length - 2 ? prev + 1 : prev
      );
    }, 650);
    return () => clearInterval(timer);
  }, [analyzing]);

  async function handleStartAnalysis(e?: React.FormEvent) {
    if (e) e.preventDefault();
    setError(null);
    setStatusNotice(null);

    if (!user.emailVerified) {
      setError({
        code: "EMAIL_UNVERIFIED",
        whatHappened:
          "Your email address is not verified yet. Unverified accounts cannot analyze repositories.",
        canRetry: false,
        nextAction:
          "Click 'Complete email verification' above to verify your email address.",
        httpStatus: 403,
      });
      return;
    }

    setAnalyzing(true);
    setActiveStageIndex(0);

    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ repoUrl }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        // Refresh project list in case a failed run record was saved
        const listRes = await fetch("/api/projects");
        if (listRes.ok) {
          const listData = await listRes.json();
          setProjects(listData.projects);
        }
        return;
      }

      setActiveStageIndex(ANALYSIS_STAGES.length - 1);
      const createdProject: ProjectRecord = data.workspace.project;
      router.push(`/projects/${createdProject.id}`);
      router.refresh();
    } catch {
      setError({
        code: "NETWORK_TIMEOUT",
        whatHappened: "Network request failed while analyzing the repository.",
        canRetry: true,
        nextAction: "Check your internet connection and click Analyze Repository again.",
        httpStatus: 504,
      });
    } finally {
      setAnalyzing(false);
    }
  }

  async function handleReanalyze(projectId: string) {
    setError(null);
    setStatusNotice(null);
    setReanalyzingId(projectId);

    try {
      const res = await fetch(`/api/projects/${projectId}/reanalyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      const updatedProject: ProjectRecord = data.workspace.project;
      setProjects((prev) =>
        prev.map((p) => (p.id === updatedProject.id ? updatedProject : p))
      );
      setStatusNotice(
        `Re-analyzed ${updatedProject.owner}/${updatedProject.repoName} at commit ${(
          updatedProject.lastAnalyzedCommitSha ?? ""
        ).slice(0, 8)}.`
      );
    } catch {
      setError({
        code: "NETWORK_TIMEOUT",
        whatHappened: "Network error while re-analyzing project.",
        canRetry: true,
        nextAction: "Click Re-analyze again.",
        httpStatus: 500,
      });
    } finally {
      setReanalyzingId(null);
    }
  }

  async function handleQuickExport(project: ProjectRecord) {
    setError(null);
    setStatusNotice(null);
    setExportingId(project.id);

    try {
      const res = await fetch(`/api/projects/${project.id}/export`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      const blob = new Blob([data.markdown], {
        type: "text/markdown;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProjects((prev) =>
        prev.map((p) => (p.id === project.id ? data.workspace.project : p))
      );
      setStatusNotice(`Exported ${data.fileName}.`);
    } catch {
      setError({
        code: "EXPORT_FAILURE",
        whatHappened: "Could not export project Markdown.",
        canRetry: true,
        nextAction: "Try exporting again.",
        httpStatus: 500,
      });
    } finally {
      setExportingId(null);
    }
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch(`/api/projects/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setProjects((prev) => prev.filter((p) => p.id !== deleteTarget.id));
      setStatusNotice(
        `Deleted project ${deleteTarget.owner}/${deleteTarget.repoName}.`
      );
      setDeleteTarget(null);
    } catch {
      setError({
        code: "DATABASE_FAILURE",
        whatHappened: "Could not delete project due to a network error.",
        canRetry: true,
        nextAction: "Try deleting the project again.",
        httpStatus: 500,
      });
    } finally {
      setDeleting(false);
    }
  }

  const currentStageName: AnalysisStage =
    ANALYSIS_STAGES[activeStageIndex] ?? "Validating repository URL";
  const completedStagesList = ANALYSIS_STAGES.slice(0, activeStageIndex + 1);
  let liveStatus: ProjectStatus = "Validating repository";
  if (activeStageIndex >= 2 && activeStageIndex <= 4) {
    liveStatus = "Reading files";
  } else if (activeStageIndex >= 5) {
    liveStatus = "Analyzing code";
  }

  return (
    <main className="flex-1 max-w-[1440px] w-full mx-auto px-5 sm:px-8 lg:px-12 py-10 space-y-8">
      {/* Unverified User Restriction Banner */}
      {!user.emailVerified && (
        <div
          role="region"
          aria-label="Email verification required"
          className="border border-amber-200 bg-amber-50/70 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3">
            <MailWarning
              className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"
              aria-hidden="true"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-gray-900">
                  Email verification required before repository analysis
                </h2>
                <StatusIndicator status="Waiting for verification" />
              </div>
              <p className="text-xs text-gray-600 mt-1">
                Your account ({user.email}) is currently unverified. Verify your email address to unlock public GitHub repository analysis.
              </p>
            </div>
          </div>

          <Link
            href="/verify-email"
            className="inline-flex items-center justify-center px-5 py-2.5 text-xs font-semibold bg-[#F26522] text-white rounded-full hover:bg-[#e05a1a] shadow-xs shrink-0 transition-colors"
          >
            Complete email verification →
          </Link>
        </div>
      )}

      {/* Top Dashboard Heading & New Project CTA */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-gray-200/80 pb-6">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-[11px] font-semibold flex items-center justify-center">
              1
            </span>
            <span className="text-[12px] font-medium text-gray-900 border border-gray-300 bg-white rounded-full px-3.5 py-1">
              Protected Workspace ({projects.length} of {user.projectsLimit} projects used)
            </span>
          </div>
          <h1 className="text-3xl font-medium tracking-[-0.03em] text-gray-900 mt-1">
            Repository Documentation Projects
          </h1>
        </div>

        <button
          type="button"
          onClick={() => {
            inputRef.current?.focus();
          }}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-gray-900 text-white rounded-full hover:bg-gray-800 shadow-xs transition-colors cursor-pointer self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          <span>New project</span>
        </button>
      </div>

      {/* Repository URL Submission Form */}
      <section
        aria-labelledby="submit-repo-heading"
        className="border border-gray-200/80 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] p-6 sm:p-8 space-y-5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2
              id="submit-repo-heading"
              className="text-xl font-semibold tracking-tight text-gray-900"
            >
              Document a public GitHub repository
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Enter a public repository root URL (e.g.{" "}
              <code className="font-mono-code">https://github.com/owner/repository</code>
              ). Private repositories, issues/PRs, and ZIP archives are rejected.
            </p>
          </div>
        </div>

        <form onSubmit={handleStartAnalysis} className="space-y-3" noValidate>
          <div className="flex flex-col sm:flex-row gap-3">
            <label htmlFor="repo-url-input" className="sr-only">
              Public GitHub Repository URL
            </label>
            <input
              ref={inputRef}
              id="repo-url-input"
              name="repoUrl"
              type="url"
              required
              disabled={analyzing}
              value={repoUrl}
              onChange={(e) => setRepoUrl(e.target.value)}
              placeholder="https://github.com/owner/repository"
              className="flex-1 px-4 py-3 text-sm font-mono-code border border-gray-200 bg-[#F9F9F9] rounded-xl text-gray-900 focus:outline-none focus:bg-white focus:border-[#F26522] focus:ring-2 focus:ring-[#F26522]/15 disabled:opacity-60 transition-all"
            />
            <button
              type="submit"
              disabled={analyzing || !user.emailVerified}
              className="inline-flex items-center justify-center gap-2.5 pl-6 pr-2.5 py-2 text-sm font-medium bg-[#F26522] text-white rounded-full hover:bg-[#e05a1a] shadow-xs disabled:opacity-50 cursor-pointer shrink-0 transition-colors group"
            >
              <span>
                {analyzing ? "Analyzing repository..." : "Analyze repository"}
              </span>
              <span className="w-7 h-7 rounded-full bg-white text-[#F26522] flex items-center justify-center shrink-0">
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-300 group-hover:-rotate-45" aria-hidden="true" />
              </span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
            <span>Quick public examples:</span>
            {[
              "https://github.com/lukeed/clsx",
              "https://github.com/sindresorhus/is",
              "https://github.com/colinhacks/zod",
            ].map((sampleUrl) => (
              <button
                key={sampleUrl}
                type="button"
                onClick={() => setRepoUrl(sampleUrl)}
                className="font-mono-code text-xs px-3 py-1 bg-[#F5F5F5] hover:bg-gray-200 border border-gray-200 text-gray-700 rounded-full cursor-pointer transition-colors"
              >
                {sampleUrl.replace("https://github.com/", "")}
              </button>
            ))}
          </div>
        </form>

        {/* Live 10-Stage Progress Tracker while analyzing */}
        {analyzing && (
          <div className="pt-3">
            <StageProgressTracker
              currentStage={currentStageName}
              completedStages={[...completedStagesList]}
              status={liveStatus}
            />
          </div>
        )}
      </section>

      {/* Error & Notice Banners */}
      {error && (
        <ErrorAlert
          error={error}
          onRetry={error.canRetry ? () => handleStartAnalysis() : undefined}
          isRetrying={analyzing}
        />
      )}

      {statusNotice && (
        <div
          role="status"
          aria-live="polite"
          className="px-4 py-3 border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm rounded-xl flex items-center justify-between"
        >
          <span>{statusNotice}</span>
          <button
            type="button"
            onClick={() => setStatusNotice(null)}
            className="text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Projects List or Meaningful Empty State */}
      <section aria-labelledby="projects-list-heading" className="space-y-4">
        <h2
          id="projects-list-heading"
          className="text-xs font-mono-code uppercase tracking-wider text-gray-500 font-semibold"
        >
          Saved Projects ({projects.length})
        </h2>

        {projects.length === 0 ? (
          <div className="border border-gray-200/80 bg-white rounded-2xl p-10 text-center space-y-4 shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <FolderGit2
              className="w-8 h-8 text-[#F26522] mx-auto"
              aria-hidden="true"
            />
            <div className="max-w-md mx-auto space-y-1.5">
              <h3 className="text-xl font-bold text-gray-900">
                No repositories analyzed yet
              </h3>
              <p className="text-xs text-gray-600">
                Paste a public GitHub repository URL above to generate a 18-section technical documentation preview, inspect source file citations, and answer clarification questions.
              </p>
            </div>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setRepoUrl("https://github.com/lukeed/clsx");
                  inputRef.current?.focus();
                }}
                className="px-5 py-2.5 text-xs font-semibold bg-[#F26522] text-white rounded-full hover:bg-[#e05a1a] shadow-xs cursor-pointer transition-colors"
              >
                Pre-fill sample URL (lukeed/clsx)
              </button>
              <Link
                href="/demo"
                className="px-5 py-2.5 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-full hover:bg-gray-50 shadow-2xs transition-colors"
              >
                Browse interactive demo workspace
              </Link>
            </div>
          </div>
        ) : (
          <div className="border border-gray-200/80 bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] divide-y divide-gray-100 overflow-hidden">
            {projects.map((project) => (
              <div
                key={project.id}
                className="p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4"
              >
                <div className="space-y-2 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Link
                      href={`/projects/${project.id}`}
                      className="text-lg font-bold text-gray-900 hover:text-[#F26522] transition-colors"
                    >
                      {project.owner}/{project.repoName}
                    </Link>
                    <StatusIndicator status={project.analysisStatus} />
                  </div>

                  {project.summary && (
                    <p className="text-xs text-gray-600 line-clamp-2">
                      {project.summary}
                    </p>
                  )}

                  {project.errorMessage && (
                    <p className="text-xs text-rose-600">
                      {project.errorMessage}
                    </p>
                  )}

                  <div className="flex flex-wrap items-center gap-3 text-xs font-mono-code text-gray-500 pt-1">
                    <span className="inline-flex items-center gap-1">
                      <GitBranch className="w-3.5 h-3.5" aria-hidden="true" />
                      {project.defaultBranch}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <GitCommit className="w-3.5 h-3.5" aria-hidden="true" />
                      {project.lastAnalyzedCommitSha
                        ? project.lastAnalyzedCommitSha.slice(0, 10)
                        : "Not analyzed"}
                    </span>
                    {project.detectedLanguages.length > 0 && (
                      <span>
                        Languages:{" "}
                        {project.detectedLanguages
                          .slice(0, 3)
                          .map((l) => `${l.name} (${l.percentage}%)`)
                          .join(", ")}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    href={`/projects/${project.id}`}
                    className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#F26522] text-white rounded-full hover:bg-[#e05a1a] shadow-xs transition-colors"
                  >
                    <span>Open documentation</span>
                    <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>

                  <button
                    type="button"
                    onClick={() => handleReanalyze(project.id)}
                    disabled={reanalyzingId === project.id || !user.emailVerified}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-full hover:bg-gray-50 shadow-2xs disabled:opacity-50 cursor-pointer transition-colors"
                  >
                    <RefreshCw
                      className={`w-3.5 h-3.5 text-gray-400 ${
                        reanalyzingId === project.id ? "animate-spin" : ""
                      }`}
                      aria-hidden="true"
                    />
                    <span>
                      {reanalyzingId === project.id ? "Re-analyzing..." : "Re-analyze"}
                    </span>
                  </button>

                  {project.lastAnalyzedCommitSha && (
                    <button
                      type="button"
                      onClick={() => handleQuickExport(project)}
                      disabled={exportingId === project.id}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-gray-200 bg-white text-gray-700 rounded-full hover:bg-gray-50 shadow-2xs disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      <Download
                        className="w-3.5 h-3.5 text-gray-400"
                        aria-hidden="true"
                      />
                      <span>
                        {exportingId === project.id ? "Exporting..." : "Export .md"}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setDeleteTarget(project)}
                    aria-label={`Delete project ${project.owner}/${project.repoName}`}
                    className="inline-flex items-center gap-1 px-3.5 py-2 text-xs font-semibold border border-rose-200 bg-rose-50 text-rose-700 rounded-full hover:bg-rose-100 shadow-2xs cursor-pointer transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Delete Project Confirmation Modal */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete ${deleteTarget?.owner}/${deleteTarget?.repoName}?`}
        description="This permanently removes the saved documentation sections, clarification questions, maintainer answers, and export history for this project."
        confirmLabel="Delete project"
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
        isBusy={deleting}
      />
    </main>
  );
}
