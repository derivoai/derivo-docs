import { describe, expect, it, vi, afterEach } from "vitest";
import {
  ClaudeAnalysisOutputSchema,
  LoginSchema,
  parsePublicGitHubUrl,
  SignupSchema,
} from "@/lib/validation";
import {
  checkRepositorySizeLimits,
  FetchedRepositoryBundle,
  filterAndSelectRepositoryFiles,
  inspectPublicGitHubRepository,
  REPO_LIMITS,
} from "@/lib/github";
import {
  buildEvidenceBasedAnalysisFromRepo,
  callProvidersWithSchemaValidation,
  getConfiguredProviders,
  regenerateSectionWithClarification,
} from "@/lib/analyzer";
import {
  createSignedSessionToken,
  DerivoDataStore,
  verifySignedSessionToken,
} from "@/lib/store";
import {
  buildFullProjectMarkdownExport,
  renderSanitizedMarkdownToHtml,
  sanitizeMarkdownText,
} from "@/lib/markdown";
import {
  buildClaudeStyleEditorialEmailHtml,
  getAppBaseUrl,
  getRequestOrigin,
} from "@/lib/email";
import { ANALYSIS_STAGES, SECTION_DEFINITIONS } from "@/lib/types";

function createSampleRepoBundle(): FetchedRepositoryBundle {
  return {
    normalizedUrl: "https://github.com/acme/payments-service",
    owner: "acme",
    repoName: "payments-service",
    description: "Payment processing service with dual DB config",
    defaultBranch: "main",
    commitSha: "a1b2c3d4e5f60718293a4b5c6d7e8f9012345678",
    starsCount: 42,
    forksCount: 5,
    openIssuesCount: 2,
    licenseName: "MIT",
    sizeKb: 640,
    totalFilesInTree: 6,
    selectedFilesCount: 5,
    ignoredFilesCount: 1,
    fileTree: [
      {
        path: "README.md",
        type: "blob",
        size: 400,
        sha: "s1",
        category: "readme",
        selected: true,
      },
      {
        path: "package.json",
        type: "blob",
        size: 500,
        sha: "s2",
        category: "manifest",
        selected: true,
      },
      {
        path: "src/index.ts",
        type: "blob",
        size: 600,
        sha: "s3",
        category: "main",
        selected: true,
      },
      {
        path: "src/routes/admin.ts",
        type: "blob",
        size: 700,
        sha: "s4",
        category: "route",
        selected: true,
      },
      {
        path: "src/db/schema.sql",
        type: "blob",
        size: 500,
        sha: "s5",
        category: "database",
        selected: true,
      },
    ],
    detectedLanguages: [{ name: "TypeScript", percentage: 90, filesCount: 4 }],
    detectedFrameworks: [
      {
        name: "PostgreSQL (node-postgres)",
        category: "database",
        evidenceFile: "package.json",
        version: "^8.11.0",
      },
      {
        name: "SQLite (better-sqlite3)",
        category: "database",
        evidenceFile: "package.json",
        version: "^9.0.0",
      },
    ],
    fetchedFiles: [
      {
        path: "README.md",
        category: "readme",
        content: "# Payments Service\nHandles ledger entries and webhook callbacks.",
      },
      {
        path: "package.json",
        category: "manifest",
        content: JSON.stringify({
          name: "payments-service",
          scripts: { dev: "tsx src/index.ts", test: "vitest run" },
          dependencies: { pg: "^8.11.0", "better-sqlite3": "^9.0.0" },
        }),
      },
      {
        path: "src/index.ts",
        category: "main",
        content:
          "export function startServer() { const dbUrl = process.env.DATABASE_URL; return dbUrl; }",
      },
      {
        path: "src/routes/admin.ts",
        category: "route",
        content:
          "export function checkAuthToken(req: unknown) { return Boolean(process.env.ADMIN_SECRET); }",
      },
      {
        path: "src/db/schema.sql",
        category: "database",
        content: "CREATE TABLE payments (id TEXT PRIMARY KEY, amount INT);",
      },
    ],
  };
}

describe("Derivo Docs — Comprehensive Verification Suite", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  // 1. Signup validation
  it("1. validates signup inputs and rejects weak passwords or duplicate emails", () => {
    expect(
      SignupSchema.safeParse({
        email: "not-an-email",
        password: "short",
        fullName: "A",
      }).success
    ).toBe(false);

    expect(
      SignupSchema.safeParse({
        email: "engineer@example.com",
        password: "Password123",
        fullName: "Grace Hopper",
      }).success
    ).toBe(true);

    const store = new DerivoDataStore({ inMemoryOnly: true });
    const first = store.signUpUser({
      email: "engineer@example.com",
      password: "Password123",
      fullName: "Grace Hopper",
    });
    expect(first.ok).toBe(true);

    const duplicate = store.signUpUser({
      email: "ENGINEER@example.com",
      password: "Password123",
      fullName: "Grace Hopper",
    });
    expect(duplicate.ok).toBe(false);
    if (!duplicate.ok) {
      expect(duplicate.error.httpStatus).toBe(409);
    }
  });

  // 2. Login validation
  it("2. validates login credentials and rejects wrong passwords", () => {
    expect(LoginSchema.safeParse({ email: "bad", password: "" }).success).toBe(
      false
    );

    const store = new DerivoDataStore({ inMemoryOnly: true });
    store.signUpUser({
      email: "user@example.com",
      password: "CorrectPassword9",
      fullName: "Test User",
    });

    const badLogin = store.loginUser({
      email: "user@example.com",
      password: "WrongPassword1",
    });
    expect(badLogin.ok).toBe(false);

    const goodLogin = store.loginUser({
      email: "user@example.com",
      password: "CorrectPassword9",
    });
    expect(goodLogin.ok).toBe(true);
  });

  // 3. Email-verification restrictions
  it("3. blocks unverified users from analyzing repositories until email is verified", () => {
    const store = new DerivoDataStore({ inMemoryOnly: true });
    const signup = store.signUpUser({
      email: "unverified@example.com",
      password: "SecurePassword8",
      fullName: "Unverified Dev",
    });
    expect(signup.ok).toBe(true);
    if (!signup.ok) return;

    expect(signup.user.emailVerified).toBe(false);

    // Attempt to create/analyze project while unverified
    const blocked = store.createOrResetProjectForAnalysis({
      actingUserId: signup.user.id,
      normalizedUrl: "https://github.com/lukeed/clsx",
      owner: "lukeed",
      repoName: "clsx",
    });
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.error.code).toBe("EMAIL_UNVERIFIED");
      expect(blocked.error.httpStatus).toBe(403);
    }

    // Now verify email token
    const verified = store.verifyEmailToken(signup.verificationToken);
    expect(verified.ok).toBe(true);

    // Now creating a project succeeds
    const allowed = store.createOrResetProjectForAnalysis({
      actingUserId: signup.user.id,
      normalizedUrl: "https://github.com/lukeed/clsx",
      owner: "lukeed",
      repoName: "clsx",
    });
    expect(allowed.ok).toBe(true);
  });

  // 4. Protected routes & session token verification
  it("4. enforces signed session tokens and rejects expired or tampered tokens", () => {
    const validToken = createSignedSessionToken("user-123", 3600);
    const verified = verifySignedSessionToken(validToken);
    expect(verified.ok).toBe(true);
    if (verified.ok) {
      expect(verified.userId).toBe("user-123");
    }

    const expiredToken = createSignedSessionToken("user-123", -60);
    const expiredRes = verifySignedSessionToken(expiredToken);
    expect(expiredRes.ok).toBe(false);
    if (!expiredRes.ok) {
      expect(expiredRes.error.code).toBe("EXPIRED_AUTHENTICATION");
    }

    const tamperedRes = verifySignedSessionToken(`${validToken}tampered`);
    expect(tamperedRes.ok).toBe(false);
  });

  // 5. GitHub URL parsing
  it("5. accepts valid public GitHub repository URLs and rejects invalid/issue/PR/profile/ZIP URLs", () => {
    const valid1 = parsePublicGitHubUrl("https://github.com/owner/repository");
    expect(valid1.ok).toBe(true);
    if (valid1.ok) {
      expect(valid1.data.normalizedUrl).toBe("https://github.com/owner/repository");
      expect(valid1.data.owner).toBe("owner");
      expect(valid1.data.repo).toBe("repository");
    }

    const validTrailing = parsePublicGitHubUrl("https://github.com/owner/repository/");
    expect(validTrailing.ok).toBe(true);

    const rejectedUrls = [
      "https://gitlab.com/owner/repository",
      "https://github.com/owner",
      "https://github.com/owner/repository/issues/12",
      "https://github.com/owner/repository/pull/5",
      "https://github.com/owner/repository/tree/main/src",
      "https://github.com/owner/repository/archive/refs/heads/main.zip",
      "not-a-url",
      "ftp://github.com/owner/repository",
    ];

    for (const bad of rejectedUrls) {
      const res = parsePublicGitHubUrl(bad);
      expect(res.ok).toBe(false);
    }
  });

  // 6. Private and nonexistent repository rejection
  it("6. rejects private and nonexistent repositories with clear structured errors", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // Simulate private repository response
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          name: "secret-repo",
          full_name: "acme/secret-repo",
          private: true,
          visibility: "private",
          default_branch: "main",
          size: 100,
        }),
        { status: 200 }
      )
    );

    const privateRes = await inspectPublicGitHubRepository(
      "https://github.com/acme/secret-repo"
    );
    expect(privateRes.ok).toBe(false);
    if (!privateRes.ok) {
      expect(privateRes.error.code).toBe("PRIVATE_REPOSITORY");
    }

    // Simulate 404 missing repository
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ message: "Not Found" }), { status: 404 })
    );

    const missingRes = await inspectPublicGitHubRepository(
      "https://github.com/acme/does-not-exist"
    );
    expect(missingRes.ok).toBe(false);
    if (!missingRes.ok) {
      expect(missingRes.error.code).toBe("MISSING_REPOSITORY");
    }
  });

  // 7. File filtering
  it("7. filters out ignored directories (node_modules, .git, dist, build, .next, vendor) and binary files", () => {
    const rawTree = [
      { path: "README.md", type: "blob" as const, size: 1200, sha: "1" },
      { path: "package.json", type: "blob" as const, size: 800, sha: "2" },
      { path: "src/index.ts", type: "blob" as const, size: 1500, sha: "3" },
      { path: "node_modules/react/index.js", type: "blob" as const, size: 4000, sha: "4" },
      { path: "dist/bundle.js", type: "blob" as const, size: 20000, sha: "5" },
      { path: ".next/server/app.js", type: "blob" as const, size: 9000, sha: "6" },
      { path: "vendor/autoload.php", type: "blob" as const, size: 3000, sha: "7" },
      { path: "assets/logo.png", type: "blob" as const, size: 15000, sha: "8" },
      { path: "docs/manual.pdf", type: "blob" as const, size: 55000, sha: "9" },
    ];

    const filtered = filterAndSelectRepositoryFiles(rawTree);
    const selectedPaths = filtered.selectedFiles.map((f) => f.path);

    expect(selectedPaths).toContain("README.md");
    expect(selectedPaths).toContain("package.json");
    expect(selectedPaths).toContain("src/index.ts");
    expect(selectedPaths).not.toContain("node_modules/react/index.js");
    expect(selectedPaths).not.toContain("dist/bundle.js");
    expect(selectedPaths).not.toContain(".next/server/app.js");
    expect(selectedPaths).not.toContain("vendor/autoload.php");
    expect(selectedPaths).not.toContain("assets/logo.png");
    expect(selectedPaths).not.toContain("docs/manual.pdf");
    expect(filtered.ignoredCount).toBe(6);
  });

  // 8. Repository-size limits
  it("8. enforces repository size and file tree count limits", () => {
    const okCheck = checkRepositorySizeLimits({
      sizeKb: 2048,
      treeCount: 150,
      truncated: false,
    });
    expect(okCheck.ok).toBe(true);

    const tooLargeKb = checkRepositorySizeLimits({
      sizeKb: REPO_LIMITS.MAX_REPO_SIZE_KB + 500,
      treeCount: 150,
    });
    expect(tooLargeKb.ok).toBe(false);
    if (!tooLargeKb.ok) {
      expect(tooLargeKb.error.code).toBe("REPOSITORY_TOO_LARGE");
    }

    const tooManyFiles = checkRepositorySizeLimits({
      sizeKb: 1000,
      treeCount: REPO_LIMITS.MAX_TREE_FILES + 1,
    });
    expect(tooManyFiles.ok).toBe(false);
  });

  // 9. Analysis status transitions
  it("9. transitions honestly through all 10 analysis stages", () => {
    const store = new DerivoDataStore({ inMemoryOnly: true });
    const signup = store.signUpUser({
      email: "stages@example.com",
      password: "Password123",
      fullName: "Stage Tester",
    });
    if (!signup.ok) throw new Error("Signup failed");
    store.verifyEmailToken(signup.verificationToken);

    const init = store.createOrResetProjectForAnalysis({
      actingUserId: signup.user.id,
      normalizedUrl: "https://github.com/acme/demo",
      owner: "acme",
      repoName: "demo",
    });
    if (!init.ok) throw new Error("Init failed");

    for (let i = 0; i < ANALYSIS_STAGES.length; i++) {
      store.advanceAnalysisStage({
        actingUserId: signup.user.id,
        projectId: init.project.id,
        runId: init.run.id,
        stageIndex: i,
      });
      const ws = store.getProjectWorkspace({
        actingUserId: signup.user.id,
        projectId: init.project.id,
      });
      expect(ws.ok).toBe(true);
      if (ws.ok) {
        expect(ws.workspace.project.currentStage).toBe(ANALYSIS_STAGES[i]);
        expect(ws.workspace.latestRun?.completedStages.length).toBe(i + 1);
      }
    }
  });

  // 10. Claude response schema validation
  it("10. validates 18-section structured output schema and rejects incomplete outputs", () => {
    const repo = createSampleRepoBundle();
    const validOutput = buildEvidenceBasedAnalysisFromRepo(repo);

    const parsed = ClaudeAnalysisOutputSchema.safeParse(validOutput);
    expect(parsed.success).toBe(true);
    expect(validOutput.sections.length).toBe(SECTION_DEFINITIONS.length);

    // Removing a required section must fail schema validation
    const incomplete = {
      ...validOutput,
      sections: validOutput.sections.slice(0, 10),
    };
    expect(ClaudeAnalysisOutputSchema.safeParse(incomplete).success).toBe(false);
  });

  // 11. Uncertainty-question creation
  it("11. creates specific clarification questions with file paths when evidence conflicts or is missing", () => {
    const repo = createSampleRepoBundle();
    const output = buildEvidenceBasedAnalysisFromRepo(repo);

    expect(output.clarificationQuestions.length).toBeGreaterThan(0);
    const dbQuestion = output.clarificationQuestions.find(
      (q) => q.sectionKey === "database_and_data_model"
    );
    expect(dbQuestion).toBeDefined();
    expect(dbQuestion?.evidencePaths).toContain("package.json");
    expect(dbQuestion?.options.length).toBeGreaterThanOrEqual(2);
  });

  // 12. Clarification-answer updates
  it("12. saves user clarification answers and regenerates ONLY the affected section while preserving all other sections", async () => {
    const store = new DerivoDataStore({ inMemoryOnly: true });
    const signup = store.signUpUser({
      email: "clarify@example.com",
      password: "Password123",
      fullName: "Clarify User",
    });
    if (!signup.ok) throw new Error("Signup failed");
    store.verifyEmailToken(signup.verificationToken);

    const init = store.createOrResetProjectForAnalysis({
      actingUserId: signup.user.id,
      normalizedUrl: "https://github.com/acme/payments-service",
      owner: "acme",
      repoName: "payments-service",
    });
    if (!init.ok) throw new Error("Init failed");

    const repo = createSampleRepoBundle();
    const analysis = buildEvidenceBasedAnalysisFromRepo(repo);

    const finalized = store.finalizeAnalysisRun({
      actingUserId: signup.user.id,
      projectId: init.project.id,
      runId: init.run.id,
      repoBundle: repo,
      analysisOutput: analysis,
    });
    if (!finalized.ok) throw new Error("Finalize failed");

    const openQuestion = finalized.workspace.questions[0];
    expect(openQuestion).toBeDefined();

    const beforeSectionsMap = new Map(
      finalized.workspace.sections.map((s) => [s.sectionKey, s.contentMarkdown])
    );

    const targetSec = finalized.workspace.sections.find(
      (s) => s.sectionKey === openQuestion.sectionKey
    )!;

    const regen = await regenerateSectionWithClarification({
      existingSection: targetSec,
      question: openQuestion,
      allSectionAnswers: [
        {
          id: "ans-1",
          questionId: openQuestion.id,
          projectId: init.project.id,
          userId: signup.user.id,
          sectionKey: openQuestion.sectionKey,
          answerText: "Use PostgreSQL in production; SQLite is only for local unit tests.",
          selectedOption: null,
          isCustom: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      repoOwner: "acme",
      repoName: "payments-service",
      commitSha: repo.commitSha,
    });
    expect(regen.ok).toBe(true);
    if (!regen.ok) return;

    const updated = store.recordClarificationAnswerAndUpdateSection({
      actingUserId: signup.user.id,
      projectId: init.project.id,
      questionId: openQuestion.id,
      answerText: "Use PostgreSQL in production; SQLite is only for local unit tests.",
      selectedOption: null,
      isCustom: true,
      regeneratedSection: regen.data,
    });
    expect(updated.ok).toBe(true);
    if (!updated.ok) return;

    expect(updated.updatedSection.contentMarkdown).toContain(
      "Use PostgreSQL in production; SQLite is only for local unit tests."
    );
    expect(updated.updatedSection.confidence).toBe("high");

    // Verify all other non-summary sections were preserved untouched
    for (const sec of updated.workspace.sections) {
      if (
        sec.sectionKey !== openQuestion.sectionKey &&
        sec.sectionKey !== "unresolved_questions"
      ) {
        expect(sec.contentMarkdown).toBe(beforeSectionsMap.get(sec.sectionKey));
      }
    }
  });

  // 13. Row-level security (RLS) isolation
  it("13. enforces Row Level Security so User B can never read, modify, or delete User A's project", () => {
    const store = new DerivoDataStore({ inMemoryOnly: true });
    const userA = store.signUpUser({
      email: "alice@example.com",
      password: "Password123",
      fullName: "Alice",
    });
    const userB = store.signUpUser({
      email: "bob@example.com",
      password: "Password123",
      fullName: "Bob",
    });
    if (!userA.ok || !userB.ok) throw new Error("Signup failed");

    store.verifyEmailToken(userA.verificationToken);
    store.verifyEmailToken(userB.verificationToken);

    const aliceProject = store.createOrResetProjectForAnalysis({
      actingUserId: userA.user.id,
      normalizedUrl: "https://github.com/acme/alice-repo",
      owner: "acme",
      repoName: "alice-repo",
    });
    if (!aliceProject.ok) throw new Error("Create project failed");

    // Bob's project list must be empty
    expect(store.listProjectsForUser(userB.user.id).length).toBe(0);

    // Bob attempting to read Alice's workspace must fail with 404 NOT_FOUND
    const bobRead = store.getProjectWorkspace({
      actingUserId: userB.user.id,
      projectId: aliceProject.project.id,
    });
    expect(bobRead.ok).toBe(false);

    // Bob attempting to delete Alice's project must fail
    const bobDelete = store.deleteProject({
      actingUserId: userB.user.id,
      projectId: aliceProject.project.id,
    });
    expect(bobDelete.ok).toBe(false);

    // Alice can still read her own project
    const aliceRead = store.getProjectWorkspace({
      actingUserId: userA.user.id,
      projectId: aliceProject.project.id,
    });
    expect(aliceRead.ok).toBe(true);
  });

  // 14. Markdown sanitization
  it("14. sanitizes dangerous HTML tags, event handlers, and javascript: links in Markdown", () => {
    const maliciousMd = [
      "# Heading",
      '<script>alert("xss")</script>',
      '<img src="x" onerror="alert(1)" />',
      "[Click me](javascript:alert('xss'))",
      "```ts",
      "const safeCode = '<script>not executed inside pre</script>';",
      "```",
    ].join("\n");

    const sanitizedText = sanitizeMarkdownText(maliciousMd);
    expect(sanitizedText).not.toContain('<script>alert("xss")</script>');
    expect(sanitizedText).not.toContain("javascript:alert");

    const html = renderSanitizedMarkdownToHtml(maliciousMd);
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("onerror=");
    expect(html).toContain("#unsafe-url-blocked");
    expect(html).toContain("&lt;script&gt;not executed inside pre&lt;/script&gt;");
  });

  // 15. Export generation
  it("15. generates complete 18-section Markdown export and updates project status to Exported", () => {
    const store = new DerivoDataStore({ inMemoryOnly: true });
    const user = store.signUpUser({
      email: "exporter@example.com",
      password: "Password123",
      fullName: "Exporter",
    });
    if (!user.ok) throw new Error("Signup failed");
    store.verifyEmailToken(user.verificationToken);

    const init = store.createOrResetProjectForAnalysis({
      actingUserId: user.user.id,
      normalizedUrl: "https://github.com/acme/payments-service",
      owner: "acme",
      repoName: "payments-service",
    });
    if (!init.ok) throw new Error("Init failed");

    const repo = createSampleRepoBundle();
    const analysis = buildEvidenceBasedAnalysisFromRepo(repo);
    store.finalizeAnalysisRun({
      actingUserId: user.user.id,
      projectId: init.project.id,
      runId: init.run.id,
      repoBundle: repo,
      analysisOutput: analysis,
    });

    const exported = store.recordMarkdownExport({
      actingUserId: user.user.id,
      projectId: init.project.id,
    });
    expect(exported.ok).toBe(true);
    if (!exported.ok) return;

    expect(exported.workspace.project.analysisStatus).toBe("Exported");
    expect(exported.exportRecord.sectionsCount).toBe(18);

    const markdown = buildFullProjectMarkdownExport(exported.workspace);
    expect(markdown).toContain("# acme/payments-service — Technical Documentation");
    expect(markdown).toContain(repo.commitSha.slice(0, 12));
    for (const def of SECTION_DEFINITIONS) {
      expect(markdown).toContain(`## ${def.order}. ${def.title}`);
    }
  });

  // 16. Multi-provider AI fallback (Gemini -> OpenRouter -> Groq -> Cerebras -> Mistral -> Claude)
  it("16. orders configured AI providers and automatically falls back when a primary provider fails", async () => {
    const providers = getConfiguredProviders({
      NODE_ENV: "test",
      GEMINI_API_KEY: "AIzaSyTestGeminiKey123456",
      OPENROUTER_API_KEY: "sk-or-v1-test-openrouter-key-123456",
      GROQ_API_KEY: "gsk_test_groq_key_123456",
      CEREBRAS_API_KEY: "csk-test-cerebras-key-123456",
      MISTRAL_API_KEY: "mistral-test-key-123456",
    });

    expect(providers.map((p) => p.id)).toEqual([
      "gemini",
      "openrouter",
      "groq",
      "cerebras",
      "mistral",
    ]);

    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // Simulate Gemini returning 429 rate limit
    fetchSpy.mockResolvedValueOnce(
      new Response(JSON.stringify({ error: "Rate limit" }), { status: 429 })
    );

    // Simulate OpenRouter succeeding with valid JSON
    const repo = createSampleRepoBundle();
    const validPayload = buildEvidenceBasedAnalysisFromRepo(repo);
    fetchSpy.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          choices: [{ message: { content: JSON.stringify(validPayload) } }],
        }),
        { status: 200 }
      )
    );

    const fallbackRes = await callProvidersWithSchemaValidation({
      providers: providers.slice(0, 2),
      systemPrompt: "Test system",
      userPrompt: "Test user",
      schema: ClaudeAnalysisOutputSchema,
    });

    expect(fallbackRes.ok).toBe(true);
    if (fallbackRes.ok) {
      expect(fallbackRes.providerUsed.id).toBe("openrouter");
      expect(fallbackRes.data.sections.length).toBe(18);
    }
  });

  // 17. Resend editorial HTML email formatting
  it("17. generates Claude-style editorial HTML emails with escaped user fields and verification links", () => {
    const html = buildClaudeStyleEditorialEmailHtml({
      preheader: "Confirm your email address",
      eyebrow: "Email Verification",
      heading: "Confirm your email address",
      greetingName: "Ada <script>alert(1)</script>",
      bodyParagraphs: ["Welcome to Derivo Docs."],
      ctaLabel: "Verify email address",
      ctaUrl: "https://derivo.in/verify-email?token=abc123",
      expirationNote: "Valid for 24 hours.",
      securityNote: "Safely ignore if not requested.",
    });

    expect(html).toContain("Derivo Docs");
    expect(html).toContain("https://derivo.in/verify-email?token=abc123");
    expect(html).toContain("#EFEFEF");
    expect(html).toContain("#F26522");
    expect(html).not.toContain("<script>alert(1)</script>");
    expect(html).toContain("Hi Ada &lt;script&gt;alert(1)&lt;/script&gt;,");
  });

  // 18. Domain resolution for Railway and custom domain derivo.in
  it("18. resolves https://derivo.in correctly for verification links on Railway / reverse proxy", () => {
    const originalEnv = { ...process.env };

    try {
      // Case A: When NEXT_PUBLIC_APP_URL is set to https://derivo.in
      process.env.NEXT_PUBLIC_APP_URL = "https://derivo.in";
      expect(getAppBaseUrl("http://localhost:3000")).toBe("https://derivo.in");

      // Case B: When RAILWAY_PUBLIC_DOMAIN is set by Railway
      delete process.env.NEXT_PUBLIC_APP_URL;
      delete process.env.APP_URL;
      process.env.RAILWAY_PUBLIC_DOMAIN = "derivo.in";
      expect(getAppBaseUrl("http://localhost:3000")).toBe("https://derivo.in");

      // Case C: When in production mode with no env set, defaults to https://derivo.in
      delete process.env.RAILWAY_PUBLIC_DOMAIN;
      process.env.NODE_ENV = "production";
      expect(getAppBaseUrl("http://localhost:3000")).toBe("https://derivo.in");

      // Case D: getRequestOrigin detects forwarded headers from Railway reverse proxy
      const reqWithForwardedHost = new Request("http://localhost:3000/api/auth/signup", {
        headers: {
          "x-forwarded-host": "derivo.in",
          "x-forwarded-proto": "https",
        },
      });
      expect(getRequestOrigin(reqWithForwardedHost)).toBe("https://derivo.in");
    } finally {
      process.env = originalEnv;
    }
  });
});
