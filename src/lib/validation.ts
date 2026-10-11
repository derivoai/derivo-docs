import { z } from "zod";
import { SECTION_DEFINITIONS, SectionKey, StructuredAppError } from "./types";

const VALID_SECTION_KEYS = SECTION_DEFINITIONS.map((s) => s.key) as [SectionKey, ...SectionKey[]];

const RESERVED_GITHUB_OWNERS = new Set([
  "settings",
  "explore",
  "marketplace",
  "trending",
  "topics",
  "collections",
  "events",
  "sponsors",
  "login",
  "join",
  "signup",
  "pricing",
  "features",
  "security",
  "enterprise",
  "orgs",
  "users",
  "notifications",
  "pulls",
  "issues",
  "codespaces",
  "search",
  "about",
  "contact",
]);

const DISALLOWED_SUBPATHS = new Set([
  "issues",
  "pull",
  "pulls",
  "discussions",
  "actions",
  "projects",
  "wiki",
  "security",
  "pulse",
  "graphs",
  "network",
  "releases",
  "tags",
  "branches",
  "commits",
  "commit",
  "compare",
  "blob",
  "tree",
  "raw",
  "blame",
  "edit",
  "settings",
  "stargazers",
  "watchers",
  "forks",
  "archive",
]);

export const SignupSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters long.")
    .max(128, "Password must not exceed 128 characters.")
    .regex(/[A-Za-z]/, "Password must include at least one letter.")
    .regex(/[0-9]/, "Password must include at least one number."),
  fullName: z
    .string()
    .trim()
    .min(2, "Full name must be at least 2 characters.")
    .max(80, "Full name must not exceed 80 characters."),
});

export const LoginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .email("Enter a valid email address."),
  password: z.string().min(1, "Password is required."),
  redirectTo: z.string().optional(),
});

export const ForgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Email address is required.")
    .email("Enter a valid email address."),
});

export const ResetPasswordSchema = z
  .object({
    token: z.string().min(1, "Reset token is required."),
    password: z
      .string()
      .min(8, "New password must be at least 8 characters long.")
      .max(128, "New password must not exceed 128 characters.")
      .regex(/[A-Za-z]/, "Password must include at least one letter.")
      .regex(/[0-9]/, "Password must include at least one number."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

export interface ParsedGitHubRepo {
  normalizedUrl: string;
  owner: string;
  repo: string;
}

export function parsePublicGitHubUrl(
  rawInput: string
): { ok: true; data: ParsedGitHubRepo } | { ok: false; error: StructuredAppError } {
  const trimmed = (rawInput ?? "").trim();

  if (!trimmed) {
    return {
      ok: false,
      error: {
        code: "INVALID_URL",
        whatHappened: "No repository URL was provided.",
        canRetry: true,
        nextAction: "Enter a public GitHub repository URL such as https://github.com/owner/repository.",
        httpStatus: 400,
      },
    };
  }

  if (/\.zip(\?.*)?$/i.test(trimmed) || trimmed.startsWith("file:") || trimmed.startsWith("data:")) {
    return {
      ok: false,
      error: {
        code: "INVALID_URL",
        whatHappened: "ZIP archive URLs and local file uploads are not supported in this version.",
        canRetry: false,
        nextAction: "Provide the root URL of a public GitHub repository instead of a ZIP archive.",
        httpStatus: 400,
      },
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return {
      ok: false,
      error: {
        code: "INVALID_URL",
        whatHappened: "The entered string is not a valid URL.",
        canRetry: true,
        nextAction: "Include https://github.com/ followed by the repository owner and name.",
        httpStatus: 400,
      },
    };
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return {
      ok: false,
      error: {
        code: "INVALID_URL",
        whatHappened: `Unsupported URL protocol "${parsed.protocol}". Only HTTPS GitHub repository URLs are accepted.`,
        canRetry: true,
        nextAction: "Use an https://github.com/owner/repository URL.",
        httpStatus: 400,
      },
    };
  }

  const host = parsed.hostname.toLowerCase();
  if (host !== "github.com" && host !== "www.github.com") {
    return {
      ok: false,
      error: {
        code: "INVALID_URL",
        whatHappened: `Non-GitHub host "${parsed.hostname}" was rejected. Derivo Docs only analyzes public GitHub repositories.`,
        canRetry: false,
        nextAction: "Provide a repository hosted on github.com.",
        httpStatus: 400,
      },
    };
  }

  if (parsed.search || parsed.hash) {
    return {
      ok: false,
      error: {
        code: "INVALID_URL",
        whatHappened: "Repository URL must point cleanly to the repository root without query parameters or URL fragments.",
        canRetry: true,
        nextAction: "Remove any ?query or #hash parameters and submit https://github.com/owner/repository.",
        httpStatus: 400,
      },
    };
  }

  const segments = parsed.pathname
    .split("/")
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    return {
      ok: false,
      error: {
        code: "INVALID_URL",
        whatHappened: "The URL points to the GitHub homepage rather than a specific repository.",
        canRetry: true,
        nextAction: "Specify both the owner and repository name: https://github.com/owner/repository.",
        httpStatus: 400,
      },
    };
  }

  if (segments.length === 1) {
    return {
      ok: false,
      error: {
        code: "INVALID_URL",
        whatHappened: `"https://github.com/${segments[0]}" is a GitHub user or organization profile URL, not a repository.`,
        canRetry: true,
        nextAction: "Append the repository name, for example https://github.com/owner/repository.",
        httpStatus: 400,
      },
    };
  }

  if (segments.length > 2) {
    const subType = segments[2].toLowerCase();
    if (subType === "issues") {
      return {
        ok: false,
        error: {
          code: "INVALID_URL",
          whatHappened: "GitHub Issue URLs cannot be analyzed as a repository.",
          canRetry: true,
          nextAction: `Submit the root repository URL instead: https://github.com/${segments[0]}/${segments[1]}`,
          httpStatus: 400,
        },
      };
    }
    if (subType === "pull" || subType === "pulls") {
      return {
        ok: false,
        error: {
          code: "INVALID_URL",
          whatHappened: "GitHub Pull Request URLs cannot be analyzed directly.",
          canRetry: true,
          nextAction: `Submit the root repository URL instead: https://github.com/${segments[0]}/${segments[1]}`,
          httpStatus: 400,
        },
      };
    }
    if (DISALLOWED_SUBPATHS.has(subType) || segments.length > 2) {
      return {
        ok: false,
        error: {
          code: "INVALID_URL",
          whatHappened: "Sub-path URLs (such as branches, files, releases, or actions) are not accepted as repository roots.",
          canRetry: true,
          nextAction: `Use the root repository URL: https://github.com/${segments[0]}/${segments[1]}`,
          httpStatus: 400,
        },
      };
    }
  }

  const owner = segments[0];
  const rawRepo = segments[1].replace(/\.git$/i, "");

  if (RESERVED_GITHUB_OWNERS.has(owner.toLowerCase())) {
    return {
      ok: false,
      error: {
        code: "INVALID_URL",
        whatHappened: `"${owner}" is a reserved GitHub system route, not a repository owner.`,
        canRetry: true,
        nextAction: "Provide a valid public GitHub repository URL: https://github.com/owner/repository.",
        httpStatus: 400,
      },
    };
  }

  const ownerPattern = /^[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,37}[a-zA-Z0-9])?$/;
  const repoPattern = /^[a-zA-Z0-9._-]{1,100}$/;

  if (!ownerPattern.test(owner) || !repoPattern.test(rawRepo) || rawRepo === "." || rawRepo === "..") {
    return {
      ok: false,
      error: {
        code: "INVALID_URL",
        whatHappened: "The owner or repository name contains invalid characters.",
        canRetry: true,
        nextAction: "Check the spelling of the repository owner and repository name.",
        httpStatus: 400,
      },
    };
  }

  return {
    ok: true,
    data: {
      normalizedUrl: `https://github.com/${owner}/${rawRepo}`,
      owner,
      repo: rawRepo,
    },
  };
}

export const RepoSubmissionSchema = z.object({
  repoUrl: z.string().min(1, "Repository URL is required."),
});

export const ConfidenceLevelSchema = z.enum([
  "high",
  "medium",
  "low",
  "insufficient_evidence",
]);

export const SectionKeySchema = z.enum(VALID_SECTION_KEYS);

export const GeneratedSectionSchema = z.object({
  sectionKey: SectionKeySchema,
  title: z.string().min(2),
  contentMarkdown: z.string().min(10),
  confidence: ConfidenceLevelSchema,
  confidenceNote: z.string().min(3),
  sourceFiles: z.array(z.string()).default([]),
});

export const GeneratedClarificationQuestionSchema = z.object({
  sectionKey: SectionKeySchema,
  question: z.string().min(10),
  rationale: z.string().min(10),
  evidencePaths: z.array(z.string()).default([]),
  evidenceSnippet: z.string().nullable().default(null),
  options: z.array(z.string().min(1)).min(2).max(5),
});

export const ClaudeAnalysisOutputSchema = z
  .object({
    summary: z.string().min(15),
    overallConfidence: ConfidenceLevelSchema,
    sections: z.array(GeneratedSectionSchema).length(SECTION_DEFINITIONS.length),
    clarificationQuestions: z.array(GeneratedClarificationQuestionSchema).max(8),
  })
  .superRefine((val, ctx) => {
    const presentKeys = new Set(val.sections.map((s) => s.sectionKey));
    for (const def of SECTION_DEFINITIONS) {
      if (!presentKeys.has(def.key)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Missing required documentation section: ${def.key}`,
          path: ["sections"],
        });
      }
    }
  });

export const ClaudeSectionRegenerationSchema = z.object({
  sectionKey: SectionKeySchema,
  contentMarkdown: z.string().min(10),
  confidence: ConfidenceLevelSchema,
  confidenceNote: z.string().min(3),
  sourceFiles: z.array(z.string()).default([]),
});

export const AnswerClarificationSchema = z.object({
  questionId: z.string().min(1, "Question ID is required."),
  answerText: z
    .string()
    .trim()
    .min(2, "Please provide a clear answer of at least 2 characters.")
    .max(2000, "Answer must be under 2,000 characters."),
  selectedOption: z.string().nullable().optional(),
  isCustom: z.boolean().default(false),
});

export const RegenerateSectionInputSchema = z.object({
  sectionKey: SectionKeySchema,
  customNote: z.string().trim().max(1000).optional(),
});

export const RepositoryQuestionInputSchema = z.object({
  question: z
    .string()
    .trim()
    .min(5, "Enter a specific question about the repository (at least 5 characters).")
    .max(600, "Question must not exceed 600 characters."),
});
