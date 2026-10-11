"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  FolderTree,
  GitBranch,
  GitCommit,
  HelpCircle,
  MessageSquare,
  RefreshCw,
  Send,
} from "lucide-react";
import {
  buildFullProjectMarkdownExport,
  renderSanitizedMarkdownToHtml,
} from "@/lib/markdown";
import {
  ConfidenceLevel,
  ProjectWorkspaceBundle,
  SectionKey,
  StructuredAppError,
} from "@/lib/types";
import {
  ConfidenceIndicator,
  ErrorAlert,
  StatusIndicator,
} from "./ui/primitives";

interface DocumentationWorkspaceProps {
  initialBundle: ProjectWorkspaceBundle;
  isDemoMode?: boolean;
}

export function DocumentationWorkspace({
  initialBundle,
  isDemoMode = false,
}: DocumentationWorkspaceProps) {
  const [bundle, setBundle] = useState<ProjectWorkspaceBundle>(initialBundle);
  const [activeSectionKey, setActiveSectionKey] = useState<SectionKey>(
    initialBundle.sections[0]?.sectionKey ?? "project_overview"
  );
  const [viewMode, setViewMode] = useState<"single" | "all" | "tree">("single");

  // Copy states
  const [copiedSectionKey, setCopiedSectionKey] = useState<string | null>(null);
  const [copiedAll, setCopiedAll] = useState(false);

  // Action loading states
  const [regeneratingKey, setRegeneratingKey] = useState<string | null>(null);
  const [reanalyzing, setReanalyzing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [actionError, setActionError] = useState<StructuredAppError | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Clarification form state keyed by questionId
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [customAnswers, setCustomAnswers] = useState<Record<string, string>>({});
  const [submittingQuestionId, setSubmittingQuestionId] = useState<string | null>(null);

  // Repository Q&A state
  const [repoQuestion, setRepoQuestion] = useState("");
  const [askingRepo, setAskingRepo] = useState(false);
  const [qaHistory, setQaHistory] = useState<
    Array<{
      question: string;
      answerMarkdown: string;
      citedSections: SectionKey[];
      citedFiles: string[];
      confidence: ConfidenceLevel;
    }>
  >([]);

  const orderedSections = useMemo(
    () => [...bundle.sections].sort((a, b) => a.sectionOrder - b.sectionOrder),
    [bundle.sections]
  );

  const activeSection = useMemo(
    () =>
      orderedSections.find((s) => s.sectionKey === activeSectionKey) ??
      orderedSections[0],
    [orderedSections, activeSectionKey]
  );

  const openQuestions = useMemo(
    () => bundle.questions.filter((q) => q.status === "open"),
    [bundle.questions]
  );

  const answeredQuestions = useMemo(
    () => bundle.questions.filter((q) => q.status === "answered"),
    [bundle.questions]
  );

  async function handleCopySection(sectionKey: string, title: string, markdown: string) {
    const text = `## ${title}\n\n${markdown}`;
    await navigator.clipboard.writeText(text);
    setCopiedSectionKey(sectionKey);
    setTimeout(() => setCopiedSectionKey(null), 2000);
  }

  async function handleCopyAll() {
    const fullMd = buildFullProjectMarkdownExport(bundle);
    await navigator.clipboard.writeText(fullMd);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  }

  async function handleExportMarkdown() {
    setActionError(null);
    setExporting(true);
    try {
      let markdownText = buildFullProjectMarkdownExport(bundle);
      let fileName = `${bundle.project.owner}-${bundle.project.repoName}-docs.md`;

      if (!isDemoMode) {
        const res = await fetch(`/api/projects/${bundle.project.id}/export`, {
          method: "POST",
        });
        const data = await res.json();
        if (!res.ok) {
          setActionError(data.error);
          return;
        }
        markdownText = data.markdown;
        fileName = data.fileName;
        setBundle(data.workspace);
      } else {
        setBundle((prev) => ({
          ...prev,
          project: {
            ...prev.project,
            analysisStatus: "Exported",
          },
        }));
      }

      const blob = new Blob([markdownText], { type: "text/markdown;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setStatusMessage(`Exported ${fileName} (${orderedSections.length} sections).`);
    } catch {
      setActionError({
        code: "EXPORT_FAILURE",
        whatHappened: "Could not generate the Markdown download file.",
        canRetry: true,
        nextAction: "Click Export Markdown to try again.",
        httpStatus: 500,
      });
    } finally {
      setExporting(false);
    }
  }

  async function handleRegenerateSection(sectionKey: SectionKey) {
    setActionError(null);
    setStatusMessage(null);
    setRegeneratingKey(sectionKey);

    try {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 350));
        setBundle((prev) => ({
          ...prev,
          sections: prev.sections.map((s) =>
            s.sectionKey === sectionKey
              ? {
                  ...s,
                  confidenceNote: `Re-verified section against commit ${
                    prev.project.lastAnalyzedCommitSha?.slice(0, 8) ?? "latest"
                  }.`,
                  updatedAt: new Date().toISOString(),
                }
              : s
          ),
        }));
        setStatusMessage(`Regenerated section "${sectionKey}" while preserving all other sections.`);
        return;
      }

      const res = await fetch(
        `/api/projects/${bundle.project.id}/sections/${sectionKey}/regenerate`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        }
      );
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error);
        return;
      }
      setBundle(data.workspace);
      setStatusMessage(
        `Regenerated "${data.updatedSection.title}" without modifying the other 17 sections.`
      );
    } catch {
      setActionError({
        code: "NETWORK_TIMEOUT",
        whatHappened: "Could not regenerate the selected section due to a network error.",
        canRetry: true,
        nextAction: "Click Regenerate Section to retry.",
        httpStatus: 500,
      });
    } finally {
      setRegeneratingKey(null);
    }
  }

  async function handleReanalyzeProject() {
    if (isDemoMode) return;
    setActionError(null);
    setStatusMessage(null);
    setReanalyzing(true);

    try {
      const res = await fetch(`/api/projects/${bundle.project.id}/reanalyze`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error);
        return;
      }
      setBundle(data.workspace);
      setStatusMessage("Re-analyzed repository from GitHub and refreshed all sections.");
    } catch {
      setActionError({
        code: "NETWORK_TIMEOUT",
        whatHappened: "Re-analysis request failed due to a network timeout.",
        canRetry: true,
        nextAction: "Click Re-analyze to try again.",
        httpStatus: 504,
      });
    } finally {
      setReanalyzing(false);
    }
  }

  async function handleClarificationSubmit(questionId: string) {
    const question = bundle.questions.find((q) => q.id === questionId);
    if (!question) return;

    const chosenOption = selectedOptions[questionId] ?? "";
    const customText = (customAnswers[questionId] ?? "").trim();
    const isCustom = chosenOption === "__custom__" || (!chosenOption && Boolean(customText));
    const finalAnswerText = isCustom ? customText : chosenOption;

    if (!finalAnswerText || finalAnswerText.length < 2) {
      setActionError({
        code: "VALIDATION_ERROR",
        whatHappened: "Please select an option or write a custom answer before submitting.",
        canRetry: true,
        nextAction: "Choose one of the suggested answers or enter your own explanation.",
        httpStatus: 400,
      });
      return;
    }

    setActionError(null);
    setStatusMessage(null);
    setSubmittingQuestionId(questionId);

    try {
      if (isDemoMode) {
        await new Promise((r) => setTimeout(r, 300));
        const now = new Date().toISOString();
        const newAnswer = {
          id: `demo-ans-${Date.now()}`,
          questionId: question.id,
          projectId: bundle.project.id,
          userId: "demo-visitor",
          sectionKey: question.sectionKey,
          answerText: finalAnswerText,
          selectedOption: isCustom ? null : chosenOption,
          isCustom,
          createdAt: now,
          updatedAt: now,
        };

        setBundle((prev) => {
          const updatedQuestions = prev.questions.map((q) =>
            q.id === question.id ? { ...q, status: "answered" as const, updatedAt: now } : q
          );
          const remainingOpen = updatedQuestions.filter((q) => q.status === "open");
          const updatedSections = prev.sections.map((sec) => {
            if (sec.sectionKey === question.sectionKey) {
              const cleaned = sec.contentMarkdown.split("\n### Verified Maintainer Clarification")[0];
              return {
                ...sec,
                contentMarkdown: `${cleaned}\n\n### Verified Maintainer Clarification\n\n- **Clarified question:** ${question.question}\n  - **Maintainer response:** ${finalAnswerText}\n  - **Linked evidence:** ${question.evidencePaths.map((p) => `\`${p}\``).join(", ")}`,
                confidence: "high" as const,
                confidenceNote: "Updated with verified maintainer clarification and repository evidence.",
                hasUnresolvedQuestions: false,
                updatedAt: now,
              };
            }
            if (sec.sectionKey === "unresolved_questions") {
              return {
                ...sec,
                contentMarkdown:
                  remainingOpen.length === 0
                    ? "All clarification questions have been resolved and incorporated into their respective documentation sections."
                    : remainingOpen
                        .map((rq, idx) => `${idx + 1}. **[${rq.sectionKey}]** ${rq.question}`)
                        .join("\n"),
                confidence: remainingOpen.length === 0 ? ("high" as const) : ("low" as const),
                hasUnresolvedQuestions: remainingOpen.length > 0,
              };
            }
            return sec;
          });

          return {
            ...prev,
            project: {
              ...prev.project,
              analysisStatus:
                remainingOpen.length > 0 ? "Needs your answer" : "Ready for review",
            },
            sections: updatedSections,
            questions: updatedQuestions,
            answers: [newAnswer, ...prev.answers],
          };
        });

        setActiveSectionKey(question.sectionKey);
        setViewMode("single");
        setStatusMessage(
          `Saved answer and regenerated "${question.sectionKey}" while preserving all other sections.`
        );
        return;
      }

      const res = await fetch(`/api/projects/${bundle.project.id}/clarify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId,
          answerText: finalAnswerText,
          selectedOption: isCustom ? null : chosenOption,
          isCustom,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error);
        return;
      }

      setBundle(data.workspace);
      setActiveSectionKey(data.updatedSection.sectionKey);
      setViewMode("single");
      setStatusMessage(
        `Saved clarification and regenerated only "${data.updatedSection.title}".`
      );
    } catch {
      setActionError({
        code: "NETWORK_TIMEOUT",
        whatHappened: "Failed to save clarification answer due to a network error.",
        canRetry: true,
        nextAction: "Submit your clarification answer again.",
        httpStatus: 500,
      });
    } finally {
      setSubmittingQuestionId(null);
    }
  }

  async function handleAskRepositoryQuestion(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = repoQuestion.trim();
    if (trimmed.length < 5) return;

    setAskingRepo(true);
    setActionError(null);

    try {
      if (isDemoMode) {
        // Local grounded answer in demo mode
        const matchingSec =
          bundle.sections.find((s) =>
            `${s.title} ${s.contentMarkdown}`
              .toLowerCase()
              .includes(trimmed.toLowerCase().split(" ")[0])
          ) ?? bundle.sections[0];
        setQaHistory((prev) => [
          {
            question: trimmed,
            answerMarkdown: `Based on **${matchingSec.title}**:\n\n${matchingSec.contentMarkdown}`,
            citedSections: [matchingSec.sectionKey],
            citedFiles: matchingSec.sourceFiles,
            confidence: matchingSec.confidence,
          },
          ...prev,
        ]);
        setRepoQuestion("");
        return;
      }

      const res = await fetch(`/api/projects/${bundle.project.id}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setActionError(data.error);
        return;
      }

      setQaHistory((prev) => [
        {
          question: data.question,
          answerMarkdown: data.answerMarkdown,
          citedSections: data.citedSections,
          citedFiles: data.citedFiles,
          confidence: data.confidence,
        },
        ...prev,
      ]);
      setRepoQuestion("");
    } catch {
      setActionError({
        code: "NETWORK_TIMEOUT",
        whatHappened: "Could not answer repository question due to a network error.",
        canRetry: true,
        nextAction: "Submit your question again.",
        httpStatus: 500,
      });
    } finally {
      setAskingRepo(false);
    }
  }

  return (
    <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-8">
      {/* Top workspace header */}
      <div className="border-b border-gray-200/80 pb-6 mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3">
            <Link
              href={isDemoMode ? "/" : "/dashboard"}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-600 hover:text-gray-900 px-3.5 py-1.5 border border-gray-200/80 bg-white shadow-xs rounded-full transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{isDemoMode ? "Back to overview" : "All projects"}</span>
            </Link>
            {isDemoMode && (
              <span className="font-mono-code text-xs px-3 py-1 bg-white border border-gray-200/80 text-gray-600 rounded-full">
                Interactive sample repository
              </span>
            )}
            <StatusIndicator status={bundle.project.analysisStatus} />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {!isDemoMode && (
              <button
                type="button"
                onClick={handleReanalyzeProject}
                disabled={reanalyzing}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium border border-gray-200/80 bg-white shadow-xs text-gray-900 rounded-full hover:bg-gray-100 disabled:opacity-50 cursor-pointer transition-colors"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${reanalyzing ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                <span>{reanalyzing ? "Re-analyzing..." : "Re-analyze"}</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopyAll}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium border border-gray-200/80 bg-white shadow-xs text-gray-900 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
            >
              {copiedAll ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                  <span>Copied all Markdown</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
                  <span>Copy all</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleExportMarkdown}
              disabled={exporting}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-[#F26522] text-white rounded-full hover:bg-[#e05a1a] disabled:opacity-50 cursor-pointer transition-colors"
            >
              <Download className="w-3.5 h-3.5" aria-hidden="true" />
              <span>{exporting ? "Exporting..." : "Export Markdown"}</span>
            </button>
          </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold text-gray-900 tracking-tight">
              {bundle.project.owner}/{bundle.project.repoName}
            </h1>
            {bundle.project.summary && (
              <p className="text-sm text-gray-600 mt-1.5 max-w-3xl">
                {bundle.project.summary}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 text-xs font-mono-code text-gray-600">
            <a
              href={bundle.project.repoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-200/80 rounded-full hover:text-gray-900"
            >
              <span>GitHub</span>
              <ExternalLink className="w-3 h-3" aria-hidden="true" />
            </a>
            <span className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-200/80 rounded-full">
              <GitBranch className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
              <span>{bundle.project.defaultBranch}</span>
            </span>
            <span
              className="inline-flex items-center gap-1 px-3 py-1 bg-white border border-gray-200/80 rounded-full"
              title={bundle.project.lastAnalyzedCommitSha ?? "N/A"}
            >
              <GitCommit className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
              <span>
                Commit {(bundle.project.lastAnalyzedCommitSha ?? "unknown").slice(0, 10)}
              </span>
            </span>
          </div>
        </div>
      </div>

      {/* Status or Error banners */}
      {actionError && (
        <div className="mb-6">
          <ErrorAlert
            error={actionError}
            onRetry={() => setActionError(null)}
          />
        </div>
      )}

      {statusMessage && (
        <div
          role="status"
          aria-live="polite"
          className="mb-6 px-4 py-3 border border-emerald-200 bg-emerald-50 text-emerald-800 text-sm rounded-xl flex items-center justify-between gap-4"
        >
          <span>{statusMessage}</span>
          <button
            type="button"
            onClick={() => setStatusMessage(null)}
            className="text-xs underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Main 3-column responsive workspace grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left column: Section table of contents */}
        <aside
          aria-label="Documentation sections"
          className="lg:col-span-3 border border-gray-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl p-4 lg:sticky lg:top-6"
        >
          <div className="flex items-center justify-between gap-2 pb-3 mb-3 border-b border-gray-200/80">
            <h2 className="text-xs font-mono-code uppercase tracking-wider text-gray-500">
              Sections (18)
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode("single")}
                className={`px-2.5 py-0.5 text-xs rounded-full cursor-pointer transition-colors ${
                  viewMode === "single"
                    ? "bg-gray-900 text-white font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Section
              </button>
              <button
                type="button"
                onClick={() => setViewMode("all")}
                className={`px-2.5 py-0.5 text-xs rounded-full cursor-pointer transition-colors ${
                  viewMode === "all"
                    ? "bg-gray-900 text-white font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                Full Doc
              </button>
              {bundle.metadata && (
                <button
                  type="button"
                  onClick={() => setViewMode("tree")}
                  className={`px-2.5 py-0.5 text-xs rounded-full cursor-pointer transition-colors ${
                    viewMode === "tree"
                      ? "bg-gray-900 text-white font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Files
                </button>
              )}
            </div>
          </div>

          {/* Mobile dropdown selector */}
          <div className="lg:hidden mb-2">
            <label htmlFor="mobile-section-select" className="sr-only">
              Jump to documentation section
            </label>
            <select
              id="mobile-section-select"
              value={activeSectionKey}
              onChange={(e) => {
                setActiveSectionKey(e.target.value as SectionKey);
                setViewMode("single");
              }}
              className="w-full px-3 py-2 text-sm border border-gray-200/80 bg-white rounded-xl"
            >
              {orderedSections.map((sec) => (
                <option key={sec.sectionKey} value={sec.sectionKey}>
                  {sec.sectionOrder}. {sec.title}
                  {sec.hasUnresolvedQuestions ? " (Needs answer)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Desktop vertical section list */}
          <nav className="hidden lg:block max-h-[68vh] overflow-y-auto pr-1">
            <ol className="space-y-1">
              {orderedSections.map((sec) => {
                const isSelected =
                  viewMode === "single" && sec.sectionKey === activeSection.sectionKey;
                return (
                  <li key={sec.sectionKey}>
                    <button
                      type="button"
                      onClick={() => {
                        setActiveSectionKey(sec.sectionKey);
                        setViewMode("single");
                      }}
                      className={`w-full text-left px-2.5 py-1.5 text-xs rounded-xl flex items-center justify-between gap-2 transition-colors cursor-pointer ${
                        isSelected
                           ? "bg-gray-900 text-white font-medium"
                           : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                      }`}
                    >
                      <span className="truncate">
                        <span className="font-mono-code opacity-70 mr-1.5">
                          {String(sec.sectionOrder).padStart(2, "0")}.
                        </span>
                        {sec.title}
                      </span>
                      {sec.hasUnresolvedQuestions && (
                        <span
                          title="Has open clarification question"
                          className={`px-1.5 py-0.5 text-[10px] font-mono-code rounded-md shrink-0 ${
                            isSelected
                              ? "bg-[#F26522] text-white"
                              : "bg-amber-50/70 text-amber-800 border border-amber-200"
                          }`}
                        >
                          ?
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ol>
          </nav>
        </aside>

        {/* Center column: Main Documentation Preview or File Tree */}
        <main className="lg:col-span-6 space-y-6">
          {viewMode === "tree" && bundle.metadata ? (
            <section className="border border-gray-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl p-6">
              <div className="flex items-center justify-between gap-2 pb-4 mb-4 border-b border-gray-200/80">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                    <FolderTree className="w-5 h-5 text-[#F26522]" aria-hidden="true" />
                    <span>Inspected Repository File Tree</span>
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                    {bundle.metadata.selectedFilesCount} priority files selected for deep inspection out of{" "}
                    {bundle.metadata.totalFilesInTree} readable files ({bundle.metadata.ignoredFilesCount} binary/generated files ignored).
                  </p>
                </div>
              </div>

              <div className="overflow-x-auto border border-gray-200/80 rounded-xl bg-white">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200/80 text-gray-900">
                      <th className="py-2.5 px-3 font-semibold">File Path</th>
                      <th className="py-2.5 px-3 font-semibold">Category</th>
                      <th className="py-2.5 px-3 font-semibold">Size</th>
                      <th className="py-2.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bundle.metadata.fileTree.slice(0, 120).map((f) => (
                      <tr
                        key={f.path}
                        className="border-b border-gray-100 last:border-b-0"
                      >
                        <td className="py-2 px-3 font-mono-code text-gray-900">
                          {f.path}
                        </td>
                        <td className="py-2 px-3 font-mono-code text-gray-500">
                          {f.category ?? "-"}
                        </td>
                        <td className="py-2 px-3 font-mono-code text-gray-500">
                          {f.size ? `${(f.size / 1024).toFixed(1)} KB` : "-"}
                        </td>
                        <td className="py-2 px-3">
                          {f.selected ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md">
                              Analyzed
                            </span>
                          ) : f.ignoredReason ? (
                            <span className="text-gray-500">{f.ignoredReason}</span>
                          ) : (
                            <span className="text-gray-500">Tree indexed</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : viewMode === "all" ? (
            <div className="border border-gray-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl divide-y divide-gray-100">
              {orderedSections.map((sec) => (
                <article key={sec.sectionKey} className="p-6 sm:p-8">
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                    <div>
                      <span className="font-mono-code text-xs text-gray-500">
                        Section {String(sec.sectionOrder).padStart(2, "0")}
                      </span>
                      <h2 className="text-2xl font-semibold text-gray-900">
                        {sec.title}
                      </h2>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopySection(sec.sectionKey, sec.title, sec.contentMarkdown)
                      }
                      className="inline-flex items-center gap-1.5 px-3 py-1 text-xs border border-gray-200/80 bg-white rounded-full hover:bg-gray-100 cursor-pointer"
                    >
                      {copiedSectionKey === sec.sectionKey ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
                          <span>Copy section</span>
                        </>
                      )}
                    </button>
                  </div>

                  <div className="mb-4">
                    <ConfidenceIndicator
                      confidence={sec.confidence}
                      note={sec.confidenceNote}
                    />
                  </div>

                  {sec.sourceFiles.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 mb-4">
                      <span className="text-xs font-mono-code text-gray-500">
                        Sources:
                      </span>
                      {sec.sourceFiles.map((file) => (
                        <span
                          key={file}
                          className="inline-flex items-center gap-1 font-mono-code text-xs px-2.5 py-0.5 bg-gray-100 border border-gray-200/80 text-gray-900 rounded-full"
                        >
                          <FileCode2 className="w-3 h-3 text-gray-500" aria-hidden="true" />
                          {file}
                        </span>
                      ))}
                    </div>
                  )}

                  <div
                    className="doc-prose"
                    dangerouslySetInnerHTML={{
                      __html: renderSanitizedMarkdownToHtml(sec.contentMarkdown),
                    }}
                  />
                </article>
              ))}
            </div>
          ) : (
            activeSection && (
              <article className="border border-gray-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl p-6 sm:p-8">
                <div className="flex flex-wrap items-start justify-between gap-4 pb-4 mb-5 border-b border-gray-200/80">
                  <div>
                    <p className="font-mono-code text-xs uppercase tracking-wider text-gray-500">
                      Section {String(activeSection.sectionOrder).padStart(2, "0")} of{" "}
                      {orderedSections.length}
                    </p>
                    <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 mt-0.5">
                      {activeSection.title}
                    </h2>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleCopySection(
                          activeSection.sectionKey,
                          activeSection.title,
                          activeSection.contentMarkdown
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium border border-gray-200/80 bg-white text-gray-900 rounded-full hover:bg-gray-100 cursor-pointer transition-colors"
                    >
                      {copiedSectionKey === activeSection.sectionKey ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-700" aria-hidden="true" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
                          <span>Copy section</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRegenerateSection(activeSection.sectionKey)}
                      disabled={regeneratingKey === activeSection.sectionKey}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium border border-gray-200/80 bg-white text-gray-900 rounded-full hover:bg-gray-100 disabled:opacity-50 cursor-pointer transition-colors"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 text-gray-500 ${
                          regeneratingKey === activeSection.sectionKey ? "animate-spin" : ""
                        }`}
                        aria-hidden="true"
                      />
                      <span>
                        {regeneratingKey === activeSection.sectionKey
                          ? "Regenerating..."
                          : "Regenerate section"}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Evidence & Source File Header */}
                <div className="space-y-3 mb-6 p-3.5 bg-[#F9F9F9] border border-gray-200/80 rounded-xl">
                  <ConfidenceIndicator
                    confidence={activeSection.confidence}
                    note={activeSection.confidenceNote}
                  />

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-xs font-medium text-gray-600">
                      Evidence files:
                    </span>
                    {activeSection.sourceFiles.length > 0 ? (
                      activeSection.sourceFiles.map((file) => (
                        <span
                          key={file}
                          className="inline-flex items-center gap-1 font-mono-code text-xs px-2.5 py-0.5 bg-white shadow-xs border border-gray-200/80 text-gray-900 rounded-full"
                        >
                          <FileCode2 className="w-3 h-3 text-[#F26522]" aria-hidden="true" />
                          {file}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-gray-500 font-mono-code">
                        Repository tree inspection (no specific file matched)
                      </span>
                    )}
                  </div>
                </div>

                {/* Sanitized Markdown Document Body */}
                <div
                  className="doc-prose"
                  dangerouslySetInnerHTML={{
                    __html: renderSanitizedMarkdownToHtml(activeSection.contentMarkdown),
                  }}
                />

                {/* Section footer pagination */}
                <div className="mt-8 pt-5 border-t border-gray-200/80 flex items-center justify-between gap-4">
                  {activeSection.sectionOrder > 1 ? (
                    <button
                      type="button"
                      onClick={() => {
                        const prev = orderedSections.find(
                          (s) => s.sectionOrder === activeSection.sectionOrder - 1
                        );
                        if (prev) setActiveSectionKey(prev.sectionKey);
                      }}
                      className="text-xs font-medium text-gray-600 hover:text-gray-900 cursor-pointer"
                    >
                      ← Previous:{" "}
                      {
                        orderedSections.find(
                          (s) => s.sectionOrder === activeSection.sectionOrder - 1
                        )?.title
                      }
                    </button>
                  ) : (
                    <span />
                  )}

                  {activeSection.sectionOrder < orderedSections.length && (
                    <button
                      type="button"
                      onClick={() => {
                        const next = orderedSections.find(
                          (s) => s.sectionOrder === activeSection.sectionOrder + 1
                        );
                        if (next) setActiveSectionKey(next.sectionKey);
                      }}
                      className="text-xs font-medium text-[#F26522] hover:text-[#e05a1a] cursor-pointer"
                    >
                      Next:{" "}
                      {
                        orderedSections.find(
                          (s) => s.sectionOrder === activeSection.sectionOrder + 1
                        )?.title
                      }{" "}
                      →
                    </button>
                  )}
                </div>
              </article>
            )
          )}

          {/* Grounded Repository Q&A Panel (Requirement 10: Let the user ask questions about the analyzed repository) */}
          <section
            aria-labelledby="repo-qa-heading"
            className="border border-gray-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl p-6"
          >
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="w-4 h-4 text-[#F26522]" aria-hidden="true" />
              <h3
                id="repo-qa-heading"
                className="text-lg font-semibold text-gray-900"
              >
                Ask a question about this repository
              </h3>
            </div>
            <p className="text-xs text-gray-600 mb-4">
              Answers are grounded strictly in the analyzed source files and verified clarifications. If the codebase does not contain evidence, Derivo will state that directly.
            </p>

            <form onSubmit={handleAskRepositoryQuestion} className="flex flex-col sm:flex-row gap-2">
              <label htmlFor="repo-question-input" className="sr-only">
                Question about {bundle.project.owner}/{bundle.project.repoName}
              </label>
              <input
                id="repo-question-input"
                type="text"
                value={repoQuestion}
                onChange={(e) => setRepoQuestion(e.target.value)}
                placeholder="e.g., Which environment variables are required, or how are tests executed?"
                className="flex-1 px-4 py-2 text-sm border border-gray-200/80 bg-[#F9F9F9] rounded-full text-gray-900 focus:outline-none focus:bg-white focus:border-[#F26522]"
              />
              <button
                type="submit"
                disabled={askingRepo || repoQuestion.trim().length < 5}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2 text-xs font-medium bg-gray-900 text-white rounded-full hover:bg-gray-800 disabled:opacity-50 cursor-pointer shrink-0 transition-colors"
              >
                <Send className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{askingRepo ? "Checking evidence..." : "Ask repository"}</span>
              </button>
            </form>

            {qaHistory.length > 0 && (
              <div className="mt-5 space-y-4 border-t border-gray-200/80 pt-4">
                {qaHistory.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-4 bg-[#F9F9F9] border border-gray-200/80 rounded-xl space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-gray-900">
                        Q: {item.question}
                      </p>
                      <ConfidenceIndicator confidence={item.confidence} />
                    </div>
                    <div
                      className="doc-prose text-sm"
                      dangerouslySetInnerHTML={{
                        __html: renderSanitizedMarkdownToHtml(item.answerMarkdown),
                      }}
                    />
                    {item.citedFiles.length > 0 && (
                      <p className="text-xs font-mono-code text-gray-500">
                        Cited files: {item.citedFiles.join(", ")}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>

        {/* Right column: Uncertainty & Clarification Panel + Saved Answers */}
        <aside
          aria-label="Uncertainty and clarification questions"
          className="lg:col-span-3 space-y-6"
        >
          <section className="border border-gray-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl p-5">
            <div className="flex items-center justify-between gap-2 pb-3 mb-4 border-b border-gray-200/80">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#F26522]" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-gray-900">
                  Clarification Questions
                </h2>
              </div>
              <span className="font-mono-code text-xs px-2.5 py-0.5 bg-amber-50/70 text-amber-800 border border-amber-200 rounded-full">
                {openQuestions.length} open
              </span>
            </div>

            {openQuestions.length === 0 ? (
              <div className="text-xs text-gray-600 space-y-2 py-2">
                <p className="font-medium text-emerald-800">
                  All flagged ambiguities have been resolved.
                </p>
                <p>
                  Your answers are saved as project context and preserved in the affected documentation sections.
                </p>
              </div>
            ) : (
              <div className="space-y-5">
                {openQuestions.map((q) => {
                  const chosen = selectedOptions[q.id] ?? "";
                  const isSubmitting = submittingQuestionId === q.id;

                  return (
                    <div
                      key={q.id}
                      className="border border-amber-200 bg-amber-50/50 rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveSectionKey(q.sectionKey);
                            setViewMode("single");
                          }}
                          className="font-mono-code text-[11px] text-[#F26522] underline cursor-pointer"
                        >
                          Section: {q.sectionKey}
                        </button>
                      </div>

                      <p className="text-sm font-semibold text-gray-900 leading-snug">
                        {q.question}
                      </p>

                      <p className="text-xs text-gray-600">
                        <strong className="text-gray-900">Why we ask:</strong>{" "}
                        {q.rationale}
                      </p>

                      {q.evidencePaths.length > 0 && (
                        <div className="text-xs font-mono-code bg-white border border-gray-200/80 p-2 rounded-lg text-gray-900">
                          <p className="text-[11px] text-gray-500 mb-1">
                            Evidence paths:
                          </p>
                          <p>{q.evidencePaths.join(", ")}</p>
                          {q.evidenceSnippet && (
                            <p className="mt-1 text-[11px] text-gray-600 border-t border-gray-200/80 pt-1">
                              {q.evidenceSnippet}
                            </p>
                          )}
                        </div>
                      )}

                      <fieldset className="space-y-2 pt-1">
                        <legend className="text-xs font-medium text-gray-900 mb-1">
                          Select an answer or write your own:
                        </legend>
                        {q.options.map((opt) => (
                          <label
                            key={opt}
                            className="flex items-start gap-2 text-xs text-gray-900 cursor-pointer"
                          >
                            <input
                              type="radio"
                              name={`question-${q.id}`}
                              value={opt}
                              checked={chosen === opt}
                              onChange={() =>
                                setSelectedOptions((prev) => ({
                                  ...prev,
                                  [q.id]: opt,
                                }))
                              }
                              className="mt-0.5 accent-[#F26522]"
                            />
                            <span>{opt}</span>
                          </label>
                        ))}

                        <label className="flex items-start gap-2 text-xs text-gray-900 cursor-pointer">
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            value="__custom__"
                            checked={chosen === "__custom__"}
                            onChange={() =>
                              setSelectedOptions((prev) => ({
                                ...prev,
                                [q.id]: "__custom__",
                              }))
                            }
                            className="mt-0.5 accent-[#F26522]"
                          />
                          <span>Write custom clarification</span>
                        </label>
                      </fieldset>

                      {(chosen === "__custom__" || !chosen) && (
                        <div>
                          <label
                            htmlFor={`custom-answer-${q.id}`}
                            className="sr-only"
                          >
                            Custom answer for {q.sectionKey}
                          </label>
                          <textarea
                            id={`custom-answer-${q.id}`}
                            rows={2}
                            value={customAnswers[q.id] ?? ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              setCustomAnswers((prev) => ({
                                ...prev,
                                [q.id]: val,
                              }));
                              if (val.trim()) {
                                setSelectedOptions((prev) => ({
                                  ...prev,
                                  [q.id]: "__custom__",
                                }));
                              }
                            }}
                            placeholder="Provide context to update this section..."
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-200/80 bg-white rounded-lg text-gray-900"
                          />
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => handleClarificationSubmit(q.id)}
                        disabled={isSubmitting}
                        className="w-full py-2 px-3 text-xs font-medium bg-gray-900 text-white rounded-full hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                      >
                        {isSubmitting
                          ? "Updating section..."
                          : "Save answer & update section"}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Saved Maintainer Answers History */}
          <section className="border border-gray-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.03)] rounded-2xl p-5">
            <h3 className="text-xs font-mono-code uppercase tracking-wider text-gray-500 pb-2 mb-3 border-b border-gray-200/80">
              Saved Clarifications ({bundle.answers.length})
            </h3>
            {bundle.answers.length === 0 ? (
              <p className="text-xs text-gray-500">
                No clarifications submitted yet. Answered questions are stored here as permanent project context.
              </p>
            ) : (
              <ul className="space-y-3 text-xs">
                {bundle.answers.map((ans) => {
                  const q = answeredQuestions.find((item) => item.id === ans.questionId);
                  return (
                    <li
                      key={ans.id}
                      className="p-3 bg-[#F9F9F9] border border-gray-200/80 rounded-xl space-y-1"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSectionKey(ans.sectionKey);
                          setViewMode("single");
                        }}
                        className="font-mono-code text-[11px] text-[#F26522] underline cursor-pointer"
                      >
                        {ans.sectionKey}
                      </button>
                      {q && (
                        <p className="text-gray-500">{q.question}</p>
                      )}
                      <p className="font-medium text-gray-900">
                        Answer: {ans.answerText}
                      </p>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
