"use client";

import React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileQuestion,
  HelpCircle,
  Info,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import {
  ANALYSIS_STAGES,
  AnalysisStage,
  ConfidenceLevel,
  ProjectStatus,
  StructuredAppError,
} from "@/lib/types";

export function StatusIndicator({ status }: { status: ProjectStatus | string }) {
  let dotColor = "bg-slate-400";
  let containerStyle = "bg-slate-100 text-slate-700 border-slate-200";

  if (status === "Ready for review" || status === "Exported") {
    dotColor = "bg-emerald-500";
    containerStyle = "bg-emerald-50 text-emerald-700 border-emerald-200/80";
  } else if (status === "Needs your answer" || status === "Waiting for verification") {
    dotColor = "bg-amber-500";
    containerStyle = "bg-amber-50 text-amber-700 border-amber-200/80";
  } else if (status === "Analysis failed") {
    dotColor = "bg-rose-500";
    containerStyle = "bg-rose-50 text-rose-700 border-rose-200/80";
  } else if (
    status === "Validating repository" ||
    status === "Reading files" ||
    status === "Analyzing code"
  ) {
    dotColor = "bg-[#F26522]";
    containerStyle = "bg-[#FFF7ED] text-[#9A3412] border-[#F26522]/30";
  }

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1 text-xs font-semibold border rounded-full shadow-2xs ${containerStyle}`}
      role="status"
      aria-live="polite"
    >
      <span className={`w-2 h-2 rounded-full shrink-0 ${dotColor}`} aria-hidden="true" />
      <span>{status}</span>
    </span>
  );
}

export function ConfidenceIndicator({
  confidence,
  note,
}: {
  confidence: ConfidenceLevel;
  note?: string;
}) {
  const config: Record<
    ConfidenceLevel,
    { label: string; classes: string; Icon: React.ComponentType<{ className?: string }> }
  > = {
    high: {
      label: "High evidence",
      classes: "bg-emerald-50 text-emerald-700 border-emerald-200",
      Icon: CheckCircle2,
    },
    medium: {
      label: "Moderate evidence",
      classes: "bg-gray-100 text-gray-700 border-gray-200",
      Icon: Info,
    },
    low: {
      label: "Needs clarification",
      classes: "bg-amber-50 text-amber-700 border-amber-200",
      Icon: HelpCircle,
    },
    insufficient_evidence: {
      label: "Not found in repo",
      classes: "bg-rose-50 text-rose-700 border-rose-200",
      Icon: FileQuestion,
    },
  };

  const { label, classes, Icon } = config[confidence] ?? config.medium;

  return (
    <div className="inline-flex flex-wrap items-center gap-2">
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 text-xs font-semibold border rounded-full ${classes}`}
      >
        <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
        <span>{label}</span>
      </span>
      {note && <span className="text-xs text-gray-500 font-medium">{note}</span>}
    </div>
  );
}

export function ErrorAlert({
  error,
  onRetry,
  isRetrying,
}: {
  error: Pick<StructuredAppError, "whatHappened" | "canRetry" | "nextAction"> & {
    code?: string;
  };
  onRetry?: () => void;
  isRetrying?: boolean;
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="border border-rose-200 bg-rose-50/80 text-gray-900 rounded-2xl p-4 sm:p-5 shadow-xs"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 text-rose-600 mt-0.5">
          <ShieldAlert className="w-5 h-5" aria-hidden="true" />
        </div>
        <div className="flex-1 space-y-1.5 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="font-bold text-rose-900">
              {error.whatHappened}
            </p>
            <span className="font-mono-code text-[11px] px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full font-medium">
              {error.canRetry ? "Retry available" : "Action required"}
            </span>
          </div>
          <p className="text-gray-600">
            <strong className="font-semibold text-gray-800">Next step:</strong>{" "}
            {error.nextAction}
          </p>
          {error.canRetry && onRetry && (
            <div className="pt-2">
              <button
                type="button"
                onClick={onRetry}
                disabled={isRetrying}
                className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold bg-gray-900 text-white rounded-full hover:bg-gray-800 disabled:opacity-50 cursor-pointer shadow-xs transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                {isRetrying ? "Retrying..." : "Retry now"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function StageProgressTracker({
  currentStage,
  completedStages,
  status,
}: {
  currentStage: AnalysisStage;
  completedStages: AnalysisStage[];
  status: ProjectStatus;
}) {
  const completedCount = completedStages.length;
  const totalCount = ANALYSIS_STAGES.length;
  const percent = Math.round((completedCount / totalCount) * 100);

  return (
    <div
      className="border border-gray-200/80 bg-white rounded-2xl p-6 shadow-sm space-y-4"
      aria-label="Repository analysis progress"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-mono-code uppercase tracking-wider text-[#F26522] font-semibold">
            Analysis Pipeline &middot; Step {completedCount} of {totalCount}
          </p>
          <p className="text-lg font-bold text-gray-900 mt-0.5">
            {currentStage}
          </p>
        </div>
        <StatusIndicator status={status} />
      </div>

      <div
        role="progressbar"
        aria-valuenow={completedCount}
        aria-valuemin={0}
        aria-valuemax={totalCount}
        aria-label={`${completedCount} of ${totalCount} analysis stages completed`}
        className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden"
      >
        <div
          className="h-full bg-[#F26522] rounded-full transition-all duration-300"
          style={{ width: `${percent}%` }}
        />
      </div>

      <ol className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 text-xs pt-1">
        {ANALYSIS_STAGES.map((stage, idx) => {
          const isDone = completedStages.includes(stage);
          const isCurrent = currentStage === stage && status !== "Ready for review" && status !== "Needs your answer" && status !== "Exported";
          return (
            <li
              key={stage}
              className={`px-3 py-2 border rounded-xl flex items-center gap-2 transition-all ${
                isCurrent
                  ? "border-[#F26522] bg-[#FFF7ED] text-gray-900 font-bold shadow-2xs"
                  : isDone
                    ? "border-gray-200 bg-white text-gray-900 font-medium"
                    : "border-gray-100 bg-gray-50 text-gray-400"
              }`}
            >
              <span className="font-mono-code text-[11px] text-gray-400 font-semibold">
                {String(idx + 1).padStart(2, "0")}.
              </span>
              <span className="truncate">{stage}</span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  onConfirm,
  onCancel,
  isBusy,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  isBusy?: boolean;
}) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-desc"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 sm:p-7 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center shrink-0 text-rose-600 mt-0.5">
            <AlertTriangle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h2
              id="confirm-dialog-title"
              className="text-lg font-bold text-slate-900"
            >
              {title}
            </h2>
            <p
              id="confirm-dialog-desc"
              className="text-sm text-slate-600 mt-1.5 leading-relaxed"
            >
              {description}
            </p>
          </div>
        </div>
        <div className="mt-7 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isBusy}
            className="px-4 py-2.5 text-sm font-semibold border border-slate-200 bg-white text-slate-700 rounded-xl hover:bg-slate-50 transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isBusy}
            className="px-4 py-2.5 text-sm font-semibold bg-rose-600 text-white rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-all cursor-pointer shadow-xs"
          >
            {isBusy ? "Deleting..." : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
