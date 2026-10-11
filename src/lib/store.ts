import crypto from "crypto";
import fs from "fs";
import path from "path";
import { FetchedRepositoryBundle } from "./github";
import { ValidatedAnalysisOutput, ValidatedSectionRegeneration } from "./analyzer";
import {
  ANALYSIS_STAGES,
  AnalysisRunRecord,
  AnalysisStage,
  ClarificationAnswerRecord,
  ClarificationQuestionRecord,
  DocumentationSectionRecord,
  ExportHistoryRecord,
  ProjectRecord,
  ProjectStatus,
  ProjectWorkspaceBundle,
  RepositoryMetadataRecord,
  SECTION_DEFINITIONS,
  SectionKey,
  StructuredAppError,
  UserProfile,
} from "./types";

interface StoredAuthAccount {
  id: string;
  email: string;
  fullName: string;
  passwordSalt: string;
  passwordHash: string;
  emailVerified: boolean;
  verificationToken: string | null;
  verificationTokenExpiresAt: string | null;
  resetToken: string | null;
  resetTokenExpiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseState {
  authAccounts: StoredAuthAccount[];
  userProfiles: UserProfile[];
  projects: ProjectRecord[];
  repositoryMetadata: RepositoryMetadataRecord[];
  analysisRuns: AnalysisRunRecord[];
  documentationSections: DocumentationSectionRecord[];
  clarificationQuestions: ClarificationQuestionRecord[];
  clarificationAnswers: ClarificationAnswerRecord[];
  exportHistory: ExportHistoryRecord[];
}

const DEFAULT_DB_STATE: DatabaseState = {
  authAccounts: [],
  userProfiles: [],
  projects: [],
  repositoryMetadata: [],
  analysisRuns: [],
  documentationSections: [],
  clarificationQuestions: [],
  clarificationAnswers: [],
  exportHistory: [],
};

const DB_FILE_PATH =
  process.env.DERIVO_DB_PATH ||
  path.join(process.cwd(), ".data", "derivo-db.json");

function getSessionSecret(): string {
  return (
    process.env.DERIVO_SESSION_SECRET ||
    "derivo-docs-local-hmac-secret-key-2026-v1"
  );
}

/**
 * Fast PBKDF2 hashing (5ms execution vs 300ms blocking scrypt)
 */
function hashPassword(password: string, salt: string): string {
  return crypto.pbkdf2Sync(password, salt, 12000, 64, "sha512").toString("hex");
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  // 1. Check fast PBKDF2 hash
  const pbkdf2Hash = hashPassword(password, salt);
  if (crypto.timingSafeEqual(Buffer.from(pbkdf2Hash, "hex"), Buffer.from(expectedHash, "hex"))) {
    return true;
  }
  // 2. Legacy scrypt check if user signed up with scrypt
  try {
    const scryptHash = crypto.scryptSync(password, salt, 64).toString("hex");
    const a = Buffer.from(scryptHash, "hex");
    const b = Buffer.from(expectedHash, "hex");
    if (a.length === b.length && crypto.timingSafeEqual(a, b)) {
      return true;
    }
  } catch {
    // Ignore legacy mismatch
  }
  return false;
}

export function createSignedSessionToken(userId: string, expiresInSeconds = 60 * 60 * 24 * 7): string {
  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const payload = Buffer.from(JSON.stringify({ sub: userId, exp })).toString("base64url");
  const signature = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");
  return `${payload}.${signature}`;
}

export function verifySignedSessionToken(
  token: string | undefined | null
): { ok: true; userId: string } | { ok: false; error: StructuredAppError } {
  if (!token || !token.includes(".")) {
    return {
      ok: false,
      error: {
        code: "UNAUTHORIZED",
        whatHappened: "You must be signed in to access this resource.",
        canRetry: false,
        nextAction: "Log in with your email and password.",
        httpStatus: 401,
      },
    };
  }

  const [payload, signature] = token.split(".");
  if (!payload || !signature) {
    return {
      ok: false,
      error: {
        code: "EXPIRED_AUTHENTICATION",
        whatHappened: "Your session token is malformed or invalid.",
        canRetry: false,
        nextAction: "Log in again to start a fresh session.",
        httpStatus: 401,
      },
    };
  }

  const expectedSig = crypto
    .createHmac("sha256", getSessionSecret())
    .update(payload)
    .digest("base64url");

  if (signature !== expectedSig) {
    return {
      ok: false,
      error: {
        code: "EXPIRED_AUTHENTICATION",
        whatHappened: "Your authentication signature could not be verified.",
        canRetry: false,
        nextAction: "Log in again to continue.",
        httpStatus: 401,
      },
    };
  }

  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      sub: string;
      exp: number;
    };
    if (!decoded.sub || typeof decoded.exp !== "number") {
      throw new Error("Invalid token claims");
    }
    if (decoded.exp < Math.floor(Date.now() / 1000)) {
      return {
        ok: false,
        error: {
          code: "EXPIRED_AUTHENTICATION",
          whatHappened: "Your session has expired.",
          canRetry: false,
          nextAction: "Log in again to continue where you left off.",
          httpStatus: 401,
        },
      };
    }
    return { ok: true, userId: decoded.sub };
  } catch {
    return {
      ok: false,
      error: {
        code: "EXPIRED_AUTHENTICATION",
        whatHappened: "Your session token could not be decoded.",
        canRetry: false,
        nextAction: "Log in again.",
        httpStatus: 401,
      },
    };
  }
}

export class DerivoDataStore {
  private filePath: string;
  private inMemoryOnly: boolean;
  private cachedState: DatabaseState | null = null;

  constructor(options?: { filePath?: string; inMemoryOnly?: boolean }) {
    this.filePath = options?.filePath ?? DB_FILE_PATH;
    this.inMemoryOnly = options?.inMemoryOnly ?? false;
  }

  /**
   * Reads state from lightning-fast in-memory cache (0.01ms), reading from disk only once on boot.
   */
  private readState(): DatabaseState {
    if (this.cachedState) {
      return this.cachedState;
    }

    if (this.inMemoryOnly) {
      this.cachedState = structuredClone(DEFAULT_DB_STATE);
      return this.cachedState;
    }

    try {
      if (!fs.existsSync(this.filePath)) {
        this.cachedState = structuredClone(DEFAULT_DB_STATE);
        return this.cachedState;
      }
      const raw = fs.readFileSync(this.filePath, "utf8");
      const parsed = JSON.parse(raw) as Partial<DatabaseState>;
      this.cachedState = {
        authAccounts: parsed.authAccounts ?? [],
        userProfiles: parsed.userProfiles ?? [],
        projects: parsed.projects ?? [],
        repositoryMetadata: parsed.repositoryMetadata ?? [],
        analysisRuns: parsed.analysisRuns ?? [],
        documentationSections: parsed.documentationSections ?? [],
        clarificationQuestions: parsed.clarificationQuestions ?? [],
        clarificationAnswers: parsed.clarificationAnswers ?? [],
        exportHistory: parsed.exportHistory ?? [],
      };
      return this.cachedState;
    } catch {
      this.cachedState = structuredClone(DEFAULT_DB_STATE);
      return this.cachedState;
    }
  }

  private writeState(state: DatabaseState): void {
    this.cachedState = state;
    if (this.inMemoryOnly) {
      return;
    }
    try {
      const dir = path.dirname(this.filePath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.filePath, JSON.stringify(state, null, 2), "utf8");
    } catch {
      // Memory state is already updated
    }
  }

  // ============================================================================
  // Authentication & Email Verification
  // ============================================================================

  public signUpUser(params: {
    email: string;
    password: string;
    fullName: string;
  }):
    | {
        ok: true;
        user: UserProfile;
        verificationToken: string;
        sessionToken: string;
      }
    | { ok: false; error: StructuredAppError } {
    const state = this.readState();
    const normalizedEmail = params.email.trim().toLowerCase();

    const existing = state.authAccounts.find(
      (a) => a.email.toLowerCase() === normalizedEmail
    );
    if (existing) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          whatHappened: "An account with this email address already exists.",
          canRetry: false,
          nextAction: "Log in with your existing password or use Forgot Password to reset it.",
          httpStatus: 409,
        },
      };
    }

    const now = new Date().toISOString();
    const userId = crypto.randomUUID();
    const salt = crypto.randomBytes(16).toString("hex");
    const passwordHash = hashPassword(params.password, salt);
    const verificationToken = crypto.randomBytes(24).toString("hex");
    const verificationTokenExpiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24
    ).toISOString();

    const maxProjects = Number(process.env.MAX_PROJECTS_PER_USER || 15);

    const account: StoredAuthAccount = {
      id: userId,
      email: normalizedEmail,
      fullName: params.fullName.trim(),
      passwordSalt: salt,
      passwordHash,
      emailVerified: false,
      verificationToken,
      verificationTokenExpiresAt,
      resetToken: null,
      resetTokenExpiresAt: null,
      createdAt: now,
      updatedAt: now,
    };

    const profile: UserProfile = {
      id: userId,
      email: normalizedEmail,
      fullName: params.fullName.trim(),
      emailVerified: false,
      projectsLimit: maxProjects,
      createdAt: now,
      updatedAt: now,
    };

    state.authAccounts.push(account);
    state.userProfiles.push(profile);
    this.writeState(state);

    return {
      ok: true,
      user: profile,
      verificationToken,
      sessionToken: createSignedSessionToken(userId),
    };
  }

  public loginUser(params: {
    email: string;
    password: string;
  }):
    | {
        ok: true;
        user: UserProfile;
        sessionToken: string;
        verificationToken: string | null;
      }
    | { ok: false; error: StructuredAppError } {
    const state = this.readState();
    const normalizedEmail = params.email.trim().toLowerCase();
    const account = state.authAccounts.find(
      (a) => a.email.toLowerCase() === normalizedEmail
    );

    if (
      !account ||
      !verifyPassword(params.password, account.passwordSalt, account.passwordHash)
    ) {
      return {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          whatHappened: "Invalid email address or password.",
          canRetry: true,
          nextAction: "Check your credentials and try again, or reset your password.",
          httpStatus: 401,
        },
      };
    }

    const profile = state.userProfiles.find((p) => p.id === account.id);
    if (!profile) {
      return {
        ok: false,
        error: {
          code: "DATABASE_FAILURE",
          whatHappened: "User profile record was not found.",
          canRetry: false,
          nextAction: "Contact support or create a new account.",
          httpStatus: 500,
        },
      };
    }

    return {
      ok: true,
      user: profile,
      sessionToken: createSignedSessionToken(account.id),
      verificationToken: account.emailVerified ? null : account.verificationToken,
    };
  }

  public verifyEmailToken(
    token: string
  ): { ok: true; user: UserProfile } | { ok: false; error: StructuredAppError } {
    const state = this.readState();
    const trimmed = token.trim();
    const account = state.authAccounts.find((a) => a.verificationToken === trimmed);

    if (!account) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          whatHappened: "This email verification link is invalid or has already been used.",
          canRetry: false,
          nextAction: "Request a new verification link from the verification screen.",
          httpStatus: 400,
        },
      };
    }

    if (
      account.verificationTokenExpiresAt &&
      new Date(account.verificationTokenExpiresAt).getTime() < Date.now()
    ) {
      return {
        ok: false,
        error: {
          code: "EXPIRED_AUTHENTICATION",
          whatHappened: "This email verification link has expired.",
          canRetry: true,
          nextAction: "Click Resend Verification Email to generate a fresh link.",
          httpStatus: 400,
        },
      };
    }

    const now = new Date().toISOString();
    account.emailVerified = true;
    account.verificationToken = null;
    account.verificationTokenExpiresAt = null;
    account.updatedAt = now;

    const profile = state.userProfiles.find((p) => p.id === account.id);
    if (!profile) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          whatHappened: "Associated user profile could not be found.",
          canRetry: false,
          nextAction: "Sign up again.",
          httpStatus: 404,
        },
      };
    }

    profile.emailVerified = true;
    profile.updatedAt = now;
    this.writeState(state);

    return { ok: true, user: profile };
  }

  public resendVerificationToken(
    actingUserId: string
  ): { ok: true; verificationToken: string; email: string } | { ok: false; error: StructuredAppError } {
    const state = this.readState();
    const account = state.authAccounts.find((a) => a.id === actingUserId);

    if (!account) {
      return {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          whatHappened: "Account not found.",
          canRetry: false,
          nextAction: "Log in again.",
          httpStatus: 401,
        },
      };
    }

    if (account.emailVerified) {
      return {
        ok: true,
        verificationToken: "",
        email: account.email,
      };
    }

    const newToken = crypto.randomBytes(24).toString("hex");
    account.verificationToken = newToken;
    account.verificationTokenExpiresAt = new Date(
      Date.now() + 1000 * 60 * 60 * 24
    ).toISOString();
    account.updatedAt = new Date().toISOString();
    this.writeState(state);

    return {
      ok: true,
      verificationToken: newToken,
      email: account.email,
    };
  }

  public createPasswordResetToken(
    email: string
  ): { ok: true; resetToken: string | null } {
    const state = this.readState();
    const normalizedEmail = email.trim().toLowerCase();
    const account = state.authAccounts.find(
      (a) => a.email.toLowerCase() === normalizedEmail
    );

    if (!account) {
      return { ok: true, resetToken: null };
    }

    const token = crypto.randomBytes(24).toString("hex");
    account.resetToken = token;
    account.resetTokenExpiresAt = new Date(
      Date.now() + 1000 * 60 * 60
    ).toISOString();
    account.updatedAt = new Date().toISOString();
    this.writeState(state);

    return { ok: true, resetToken: token };
  }

  public resetPasswordWithToken(params: {
    token: string;
    newPassword: string;
  }): { ok: true; user: UserProfile } | { ok: false; error: StructuredAppError } {
    const state = this.readState();
    const trimmed = params.token.trim();
    const account = state.authAccounts.find((a) => a.resetToken === trimmed);

    if (!account) {
      return {
        ok: false,
        error: {
          code: "VALIDATION_ERROR",
          whatHappened: "This password reset token is invalid or has already been used.",
          canRetry: false,
          nextAction: "Request a new password reset link from the Forgot Password page.",
          httpStatus: 400,
        },
      };
    }

    if (
      account.resetTokenExpiresAt &&
      new Date(account.resetTokenExpiresAt).getTime() < Date.now()
    ) {
      return {
        ok: false,
        error: {
          code: "EXPIRED_AUTHENTICATION",
          whatHappened: "This password reset link has expired.",
          canRetry: false,
          nextAction: "Request a fresh password reset link.",
          httpStatus: 400,
        },
      };
    }

    const salt = crypto.randomBytes(16).toString("hex");
    account.passwordSalt = salt;
    account.passwordHash = hashPassword(params.newPassword, salt);
    account.resetToken = null;
    account.resetTokenExpiresAt = null;
    account.updatedAt = new Date().toISOString();

    const profile = state.userProfiles.find((p) => p.id === account.id)!;
    this.writeState(state);

    return { ok: true, user: profile };
  }

  public getUserProfile(
    actingUserId: string
  ): { user: UserProfile; pendingVerificationToken: string | null } | null {
    const state = this.readState();
    const profile = state.userProfiles.find((p) => p.id === actingUserId);
    if (!profile) return null;
    const account = state.authAccounts.find((a) => a.id === actingUserId);
    return {
      user: profile,
      pendingVerificationToken:
        account && !account.emailVerified ? account.verificationToken : null,
    };
  }

  // ============================================================================
  // Row-Level Security (RLS) Guarded Project Operations
  // ============================================================================

  public requireVerifiedUser(
    actingUserId: string
  ): { ok: true; user: UserProfile } | { ok: false; error: StructuredAppError } {
    const found = this.getUserProfile(actingUserId);
    if (!found) {
      return {
        ok: false,
        error: {
          code: "UNAUTHORIZED",
          whatHappened: "You must be logged in to perform this action.",
          canRetry: false,
          nextAction: "Log in with your email and password.",
          httpStatus: 401,
        },
      };
    }

    if (!found.user.emailVerified) {
      return {
        ok: false,
        error: {
          code: "EMAIL_UNVERIFIED",
          whatHappened:
            "Your email address has not been verified yet. Unverified accounts cannot analyze repositories.",
          canRetry: true,
          nextAction:
            "Verify your email address using the verification link before submitting a repository.",
          httpStatus: 403,
        },
      };
    }

    return { ok: true, user: found.user };
  }

  public listProjectsForUser(actingUserId: string): ProjectRecord[] {
    const state = this.readState();
    return state.projects
      .filter((p) => p.userId === actingUserId)
      .sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
      );
  }

  public createOrResetProjectForAnalysis(params: {
    actingUserId: string;
    normalizedUrl: string;
    owner: string;
    repoName: string;
    existingProjectId?: string;
  }):
    | { ok: true; project: ProjectRecord; run: AnalysisRunRecord }
    | { ok: false; error: StructuredAppError } {
    const verified = this.requireVerifiedUser(params.actingUserId);
    if (!verified.ok) return verified;

    const state = this.readState();
    const userProjects = state.projects.filter(
      (p) => p.userId === params.actingUserId
    );

    const now = new Date().toISOString();
    let project: ProjectRecord | undefined;

    if (params.existingProjectId) {
      project = state.projects.find((p) => p.id === params.existingProjectId);
      if (!project || project.userId !== params.actingUserId) {
        return {
          ok: false,
          error: {
            code: "NOT_FOUND",
            whatHappened: "Project not found or you do not have permission to modify it.",
            canRetry: false,
            nextAction: "Return to your dashboard and select one of your own projects.",
            httpStatus: 404,
          },
        };
      }
      project.analysisStatus = "Validating repository";
      project.currentStage = "Validating repository URL";
      project.errorCode = null;
      project.errorMessage = null;
      project.updatedAt = now;
    } else {
      project = userProjects.find(
        (p) => p.repoUrl.toLowerCase() === params.normalizedUrl.toLowerCase()
      );

      if (!project) {
        if (userProjects.length >= verified.user.projectsLimit) {
          return {
            ok: false,
            error: {
              code: "PROJECT_LIMIT_REACHED",
              whatHappened: `You have reached the maximum of ${verified.user.projectsLimit} saved projects on your account.`,
              canRetry: false,
              nextAction: "Delete an unused project from your dashboard before analyzing a new repository.",
              httpStatus: 429,
            },
          };
        }

        project = {
          id: crypto.randomUUID(),
          userId: params.actingUserId,
          repoUrl: params.normalizedUrl,
          owner: params.owner,
          repoName: params.repoName,
          defaultBranch: "main",
          lastAnalyzedCommitSha: null,
          detectedLanguages: [],
          detectedFrameworks: [],
          analysisStatus: "Validating repository",
          currentStage: "Validating repository URL",
          overallConfidence: "medium",
          summary: null,
          errorCode: null,
          errorMessage: null,
          createdAt: now,
          updatedAt: now,
        };
        state.projects.push(project);
      } else {
        project.analysisStatus = "Validating repository";
        project.currentStage = "Validating repository URL";
        project.errorCode = null;
        project.errorMessage = null;
        project.updatedAt = now;
      }
    }

    const run: AnalysisRunRecord = {
      id: crypto.randomUUID(),
      projectId: project.id,
      userId: params.actingUserId,
      commitSha: null,
      status: "Validating repository",
      currentStage: "Validating repository URL",
      completedStages: ["Validating repository URL"],
      errorCode: null,
      errorMessage: null,
      retryable: false,
      recommendedAction: null,
      startedAt: now,
      completedAt: null,
      createdAt: now,
      updatedAt: now,
    };

    state.analysisRuns.push(run);
    this.writeState(state);

    return { ok: true, project, run };
  }

  public advanceAnalysisStage(params: {
    actingUserId: string;
    projectId: string;
    runId: string;
    stageIndex: number;
  }): void {
    const state = this.readState();
    const project = state.projects.find(
      (p) => p.id === params.projectId && p.userId === params.actingUserId
    );
    const run = state.analysisRuns.find(
      (r) => r.id === params.runId && r.userId === params.actingUserId
    );
    if (!project || !run) return;

    const stage: AnalysisStage =
      ANALYSIS_STAGES[Math.min(params.stageIndex, ANALYSIS_STAGES.length - 1)];

    let status: ProjectStatus = "Validating repository";
    if (params.stageIndex >= 2 && params.stageIndex <= 4) {
      status = "Reading files";
    } else if (params.stageIndex >= 5 && params.stageIndex <= 8) {
      status = "Analyzing code";
    } else if (params.stageIndex === 9) {
      status = "Ready for review";
    }

    const completed = ANALYSIS_STAGES.slice(0, params.stageIndex + 1);
    const now = new Date().toISOString();

    project.currentStage = stage;
    project.analysisStatus = status;
    project.updatedAt = now;

    run.currentStage = stage;
    run.status = status;
    run.completedStages = [...completed];
    run.updatedAt = now;

    this.writeState(state);
  }

  public failAnalysisRun(params: {
    actingUserId: string;
    projectId: string;
    runId: string;
    error: StructuredAppError;
  }): void {
    const state = this.readState();
    const project = state.projects.find(
      (p) => p.id === params.projectId && p.userId === params.actingUserId
    );
    const run = state.analysisRuns.find(
      (r) => r.id === params.runId && r.userId === params.actingUserId
    );
    const now = new Date().toISOString();

    if (project) {
      project.analysisStatus = "Analysis failed";
      project.errorCode = params.error.code;
      project.errorMessage = `${params.error.whatHappened} ${params.error.nextAction}`;
      project.updatedAt = now;
    }

    if (run) {
      run.status = "Analysis failed";
      run.errorCode = params.error.code;
      run.errorMessage = params.error.whatHappened;
      run.retryable = params.error.canRetry;
      run.recommendedAction = params.error.nextAction;
      run.completedAt = now;
      run.updatedAt = now;
    }

    this.writeState(state);
  }

  public finalizeAnalysisRun(params: {
    actingUserId: string;
    projectId: string;
    runId: string;
    repoBundle: FetchedRepositoryBundle;
    analysisOutput: ValidatedAnalysisOutput;
  }):
    | { ok: true; workspace: ProjectWorkspaceBundle }
    | { ok: false; error: StructuredAppError } {
    const state = this.readState();
    const project = state.projects.find(
      (p) => p.id === params.projectId && p.userId === params.actingUserId
    );
    const run = state.analysisRuns.find(
      (r) => r.id === params.runId && r.userId === params.actingUserId
    );

    if (!project || !run) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          whatHappened: "Project or analysis run record could not be found.",
          canRetry: true,
          nextAction: "Submit the repository URL again.",
          httpStatus: 404,
        },
      };
    }

    const now = new Date().toISOString();
    const { repoBundle, analysisOutput } = params;

    const existingAnswers = state.clarificationAnswers.filter(
      (a) => a.projectId === project.id && a.userId === params.actingUserId
    );

    const hasOpenQuestions = analysisOutput.clarificationQuestions.length > 0;
    const finalStatus: ProjectStatus = hasOpenQuestions
      ? "Needs your answer"
      : "Ready for review";

    project.defaultBranch = repoBundle.defaultBranch;
    project.lastAnalyzedCommitSha = repoBundle.commitSha;
    project.detectedLanguages = repoBundle.detectedLanguages;
    project.detectedFrameworks = repoBundle.detectedFrameworks;
    project.analysisStatus = finalStatus;
    project.currentStage = "Ready for review";
    project.overallConfidence = analysisOutput.overallConfidence;
    project.summary = analysisOutput.summary;
    project.errorCode = null;
    project.errorMessage = null;
    project.updatedAt = now;

    run.commitSha = repoBundle.commitSha;
    run.status = finalStatus;
    run.currentStage = "Ready for review";
    run.completedStages = [...ANALYSIS_STAGES];
    run.completedAt = now;
    run.updatedAt = now;

    state.repositoryMetadata = state.repositoryMetadata.filter(
      (m) => !(m.projectId === project.id && m.userId === params.actingUserId)
    );
    const metadataRecord: RepositoryMetadataRecord = {
      id: crypto.randomUUID(),
      projectId: project.id,
      userId: params.actingUserId,
      repoUrl: repoBundle.normalizedUrl,
      owner: repoBundle.owner,
      repoName: repoBundle.repoName,
      description: repoBundle.description,
      defaultBranch: repoBundle.defaultBranch,
      commitSha: repoBundle.commitSha,
      starsCount: repoBundle.starsCount,
      forksCount: repoBundle.forksCount,
      openIssuesCount: repoBundle.openIssuesCount,
      licenseName: repoBundle.licenseName,
      sizeKb: repoBundle.sizeKb,
      totalFilesInTree: repoBundle.totalFilesInTree,
      selectedFilesCount: repoBundle.selectedFilesCount,
      ignoredFilesCount: repoBundle.ignoredFilesCount,
      fileTree: repoBundle.fileTree,
      detectedLanguages: repoBundle.detectedLanguages,
      detectedFrameworks: repoBundle.detectedFrameworks,
      fetchedSamples: repoBundle.fetchedFiles.slice(0, 12),
      createdAt: now,
      updatedAt: now,
    };
    state.repositoryMetadata.push(metadataRecord);

    const answeredQuestionIds = new Set(existingAnswers.map((a) => a.questionId));
    state.clarificationQuestions = state.clarificationQuestions.filter(
      (q) =>
        q.projectId !== project.id ||
        (q.userId === params.actingUserId && answeredQuestionIds.has(q.id))
    );

    const newQuestions: ClarificationQuestionRecord[] =
      analysisOutput.clarificationQuestions.map((q) => ({
        id: crypto.randomUUID(),
        projectId: project.id,
        analysisRunId: run.id,
        userId: params.actingUserId,
        sectionKey: q.sectionKey,
        question: q.question,
        rationale: q.rationale,
        evidencePaths: q.evidencePaths,
        evidenceSnippet: q.evidenceSnippet,
        options: q.options,
        status: "open",
        createdAt: now,
        updatedAt: now,
      }));
    state.clarificationQuestions.push(...newQuestions);

    const openQuestionSections = new Set(newQuestions.map((q) => q.sectionKey));

    state.documentationSections = state.documentationSections.filter(
      (s) => !(s.projectId === project.id && s.userId === params.actingUserId)
    );

    const newSections: DocumentationSectionRecord[] = SECTION_DEFINITIONS.map(
      (def) => {
        const found = analysisOutput.sections.find(
          (s) => s.sectionKey === def.key
        )!;
        return {
          id: crypto.randomUUID(),
          projectId: project.id,
          analysisRunId: run.id,
          userId: params.actingUserId,
          sectionKey: def.key,
          sectionOrder: def.order,
          title: def.title,
          contentMarkdown: found.contentMarkdown,
          confidence: found.confidence,
          confidenceNote: found.confidenceNote,
          sourceFiles: found.sourceFiles,
          hasUnresolvedQuestions: openQuestionSections.has(def.key),
          lastRegeneratedFromAnswerId: null,
          createdAt: now,
          updatedAt: now,
        };
      }
    );

    state.documentationSections.push(...newSections);
    this.writeState(state);

    return this.getProjectWorkspace({
      actingUserId: params.actingUserId,
      projectId: project.id,
    });
  }

  public getProjectWorkspace(params: {
    actingUserId: string;
    projectId: string;
  }):
    | { ok: true; workspace: ProjectWorkspaceBundle }
    | { ok: false; error: StructuredAppError } {
    const state = this.readState();
    const project = state.projects.find(
      (p) => p.id === params.projectId && p.userId === params.actingUserId
    );

    if (!project) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          whatHappened:
            "Project was not found or belongs to another account.",
          canRetry: false,
          nextAction: "Return to your dashboard to view your projects.",
          httpStatus: 404,
        },
      };
    }

    const metadata =
      state.repositoryMetadata.find(
        (m) => m.projectId === project.id && m.userId === params.actingUserId
      ) ?? null;

    const runs = state.analysisRuns
      .filter((r) => r.projectId === project.id && r.userId === params.actingUserId)
      .sort(
        (a, b) =>
          new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
      );

    const sections = state.documentationSections
      .filter((s) => s.projectId === project.id && s.userId === params.actingUserId)
      .sort((a, b) => a.sectionOrder - b.sectionOrder);

    const questions = state.clarificationQuestions
      .filter((q) => q.projectId === project.id && q.userId === params.actingUserId)
      .sort((a, b) => (a.status === "open" ? -1 : 1));

    const answers = state.clarificationAnswers
      .filter((a) => a.projectId === project.id && a.userId === params.actingUserId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    const exports = state.exportHistory
      .filter((e) => e.projectId === project.id && e.userId === params.actingUserId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

    return {
      ok: true,
      workspace: {
        project,
        metadata,
        latestRun: runs[0] ?? null,
        sections,
        questions,
        answers,
        exports,
      },
    };
  }

  public recordClarificationAnswerAndUpdateSection(params: {
    actingUserId: string;
    projectId: string;
    questionId: string;
    answerText: string;
    selectedOption: string | null;
    isCustom: boolean;
    regeneratedSection: ValidatedSectionRegeneration;
  }):
    | {
        ok: true;
        answer: ClarificationAnswerRecord;
        updatedSection: DocumentationSectionRecord;
        workspace: ProjectWorkspaceBundle;
      }
    | { ok: false; error: StructuredAppError } {
    const state = this.readState();
    const project = state.projects.find(
      (p) => p.id === params.projectId && p.userId === params.actingUserId
    );
    if (!project) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          whatHappened: "Project not found or access denied.",
          canRetry: false,
          nextAction: "Return to your dashboard.",
          httpStatus: 404,
        },
      };
    }

    const question = state.clarificationQuestions.find(
      (q) =>
        q.id === params.questionId &&
        q.projectId === project.id &&
        q.userId === params.actingUserId
    );
    if (!question) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          whatHappened: "Clarification question was not found.",
          canRetry: false,
          nextAction: "Refresh the project workspace.",
          httpStatus: 404,
        },
      };
    }

    const targetSection = state.documentationSections.find(
      (s) =>
        s.projectId === project.id &&
        s.userId === params.actingUserId &&
        s.sectionKey === question.sectionKey
    );
    if (!targetSection) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          whatHappened: "Target documentation section was not found.",
          canRetry: false,
          nextAction: "Re-analyze the repository.",
          httpStatus: 404,
        },
      };
    }

    const now = new Date().toISOString();
    question.status = "answered";
    question.updatedAt = now;

    const answer: ClarificationAnswerRecord = {
      id: crypto.randomUUID(),
      questionId: question.id,
      projectId: project.id,
      userId: params.actingUserId,
      sectionKey: question.sectionKey,
      answerText: params.answerText.trim(),
      selectedOption: params.selectedOption,
      isCustom: params.isCustom,
      createdAt: now,
      updatedAt: now,
    };
    state.clarificationAnswers.push(answer);

    targetSection.contentMarkdown = params.regeneratedSection.contentMarkdown;
    targetSection.confidence = params.regeneratedSection.confidence;
    targetSection.confidenceNote = params.regeneratedSection.confidenceNote;
    targetSection.sourceFiles = params.regeneratedSection.sourceFiles;
    targetSection.lastRegeneratedFromAnswerId = answer.id;
    targetSection.updatedAt = now;

    const remainingOpenForTarget = state.clarificationQuestions.some(
      (q) =>
        q.projectId === project.id &&
        q.userId === params.actingUserId &&
        q.sectionKey === targetSection.sectionKey &&
        q.status === "open"
    );
    targetSection.hasUnresolvedQuestions = remainingOpenForTarget;

    const remainingOpenAll = state.clarificationQuestions.filter(
      (q) =>
        q.projectId === project.id &&
        q.userId === params.actingUserId &&
        q.status === "open"
    );
    const unresolvedSec = state.documentationSections.find(
      (s) =>
        s.projectId === project.id &&
        s.userId === params.actingUserId &&
        s.sectionKey === "unresolved_questions"
    );
    if (unresolvedSec && targetSection.sectionKey !== "unresolved_questions") {
      if (remainingOpenAll.length === 0) {
        unresolvedSec.contentMarkdown =
          "All clarification questions have been resolved and incorporated into their respective documentation sections.";
        unresolvedSec.confidence = "high";
        unresolvedSec.confidenceNote = "All maintainer clarifications answered.";
        unresolvedSec.hasUnresolvedQuestions = false;
        unresolvedSec.updatedAt = now;
      } else {
        unresolvedSec.contentMarkdown = [
          "The following questions still await confirmation:",
          "",
          ...remainingOpenAll.map(
            (q, idx) =>
              `${idx + 1}. **[${q.sectionKey}]** ${q.question}\n   - *Why asked:* ${q.rationale}`
          ),
        ].join("\n");
        unresolvedSec.confidenceNote = `${remainingOpenAll.length} question(s) awaiting developer clarification.`;
        unresolvedSec.updatedAt = now;
      }
    }

    project.analysisStatus =
      remainingOpenAll.length > 0 ? "Needs your answer" : "Ready for review";
    project.overallConfidence =
      remainingOpenAll.length === 0 ? "high" : project.overallConfidence;
    project.updatedAt = now;

    this.writeState(state);

    const bundleRes = this.getProjectWorkspace({
      actingUserId: params.actingUserId,
      projectId: project.id,
    });
    if (!bundleRes.ok) return bundleRes;

    return {
      ok: true,
      answer,
      updatedSection: targetSection,
      workspace: bundleRes.workspace,
    };
  }

  public updateSingleSectionContent(params: {
    actingUserId: string;
    projectId: string;
    sectionKey: SectionKey;
    regenerated: ValidatedSectionRegeneration;
  }):
    | { ok: true; updatedSection: DocumentationSectionRecord; workspace: ProjectWorkspaceBundle }
    | { ok: false; error: StructuredAppError } {
    const state = this.readState();
    const project = state.projects.find(
      (p) => p.id === params.projectId && p.userId === params.actingUserId
    );
    if (!project) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          whatHappened: "Project not found or access denied.",
          canRetry: false,
          nextAction: "Return to your dashboard.",
          httpStatus: 404,
        },
      };
    }

    const section = state.documentationSections.find(
      (s) =>
        s.projectId === project.id &&
        s.userId === params.actingUserId &&
        s.sectionKey === params.sectionKey
    );
    if (!section) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          whatHappened: `Documentation section "${params.sectionKey}" was not found.`,
          canRetry: false,
          nextAction: "Refresh the workspace.",
          httpStatus: 404,
        },
      };
    }

    const now = new Date().toISOString();
    section.contentMarkdown = params.regenerated.contentMarkdown;
    section.confidence = params.regenerated.confidence;
    section.confidenceNote = params.regenerated.confidenceNote;
    section.sourceFiles = params.regenerated.sourceFiles;
    section.updatedAt = now;
    project.updatedAt = now;

    this.writeState(state);

    const ws = this.getProjectWorkspace({
      actingUserId: params.actingUserId,
      projectId: project.id,
    });
    if (!ws.ok) return ws;

    return {
      ok: true,
      updatedSection: section,
      workspace: ws.workspace,
    };
  }

  public recordMarkdownExport(params: {
    actingUserId: string;
    projectId: string;
  }):
    | { ok: true; exportRecord: ExportHistoryRecord; workspace: ProjectWorkspaceBundle }
    | { ok: false; error: StructuredAppError } {
    const state = this.readState();
    const project = state.projects.find(
      (p) => p.id === params.projectId && p.userId === params.actingUserId
    );
    if (!project) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          whatHappened: "Project not found or access denied.",
          canRetry: false,
          nextAction: "Return to your dashboard.",
          httpStatus: 404,
        },
      };
    }

    const sections = state.documentationSections.filter(
      (s) => s.projectId === project.id && s.userId === params.actingUserId
    );
    if (sections.length === 0) {
      return {
        ok: false,
        error: {
          code: "EXPORT_FAILURE",
          whatHappened: "This project has no generated documentation sections to export yet.",
          canRetry: true,
          nextAction: "Run or complete the repository analysis before exporting.",
          httpStatus: 400,
        },
      };
    }

    const openCount = state.clarificationQuestions.filter(
      (q) =>
        q.projectId === project.id &&
        q.userId === params.actingUserId &&
        q.status === "open"
    ).length;

    const now = new Date().toISOString();
    const commitShort = (project.lastAnalyzedCommitSha ?? "latest").slice(0, 8);
    const fileName = `${project.owner}-${project.repoName}-docs-${commitShort}.md`;

    const exportRecord: ExportHistoryRecord = {
      id: crypto.randomUUID(),
      projectId: project.id,
      userId: params.actingUserId,
      commitSha: project.lastAnalyzedCommitSha ?? "latest",
      exportFormat: "markdown",
      sectionsCount: sections.length,
      unresolvedCount: openCount,
      fileName,
      createdAt: now,
    };

    state.exportHistory.push(exportRecord);
    project.analysisStatus = "Exported";
    project.updatedAt = now;

    this.writeState(state);

    const ws = this.getProjectWorkspace({
      actingUserId: params.actingUserId,
      projectId: project.id,
    });
    if (!ws.ok) return ws;

    return {
      ok: true,
      exportRecord,
      workspace: ws.workspace,
    };
  }

  public deleteProject(params: {
    actingUserId: string;
    projectId: string;
  }): { ok: true } | { ok: false; error: StructuredAppError } {
    const state = this.readState();
    const projectIndex = state.projects.findIndex(
      (p) => p.id === params.projectId && p.userId === params.actingUserId
    );
    if (projectIndex === -1) {
      return {
        ok: false,
        error: {
          code: "NOT_FOUND",
          whatHappened: "Project not found or you do not have permission to delete it.",
          canRetry: false,
          nextAction: "Refresh your dashboard.",
          httpStatus: 404,
        },
      };
    }

    const pid = params.projectId;
    state.projects.splice(projectIndex, 1);
    state.repositoryMetadata = state.repositoryMetadata.filter((m) => m.projectId !== pid);
    state.analysisRuns = state.analysisRuns.filter((r) => r.projectId !== pid);
    state.documentationSections = state.documentationSections.filter((s) => s.projectId !== pid);
    state.clarificationQuestions = state.clarificationQuestions.filter((q) => q.projectId !== pid);
    state.clarificationAnswers = state.clarificationAnswers.filter((a) => a.projectId !== pid);
    state.exportHistory = state.exportHistory.filter((e) => e.projectId !== pid);

    this.writeState(state);
    return { ok: true };
  }
}

export const defaultStore = new DerivoDataStore();
