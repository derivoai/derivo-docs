import { describe, expect, it } from "vitest";
import { POST as signupPost } from "@/app/api/auth/signup/route";
import { POST as verifyPost } from "@/app/api/auth/verify-email/route";
import { POST as loginPost } from "@/app/api/auth/login/route";
import { POST as logoutPost } from "@/app/api/auth/logout/route";
import { GET as projectsGet, POST as projectsPost } from "@/app/api/projects/route";
import { GET as projectDetailGet } from "@/app/api/projects/[projectId]/route";
import { POST as clarifyPost } from "@/app/api/projects/[projectId]/clarify/route";
import { POST as askPost } from "@/app/api/projects/[projectId]/ask/route";
import { POST as exportPost } from "@/app/api/projects/[projectId]/export/route";
import { vi } from "vitest";

// Mock next/headers cookies() so route handlers work deterministically in full flow test
const cookieJar = new Map<string, string>();

vi.mock("next/headers", () => ({
  cookies: async () => ({
    get: (name: string) => {
      const val = cookieJar.get(name);
      return val ? { name, value: val } : undefined;
    },
    getAll: () =>
      Array.from(cookieJar.entries()).map(([name, value]) => ({ name, value })),
    set: (name: string, value: string) => {
      cookieJar.set(name, value);
    },
    delete: (name: string) => {
      cookieJar.delete(name);
    },
  }),
}));

describe("Complete End-to-End User Flow Verification", () => {
  it("executes: signup -> email verification -> login -> dashboard -> public GitHub URL -> validation -> analysis -> preview -> clarification question -> user answer -> updated section -> Markdown export -> logout -> login again", async () => {
    const uniqueEmail = `e2e-${Date.now()}@example.com`;
    const password = "EndToEndPassword99";

    // 1. Signup
    const signupReq = new Request("http://localhost:3000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: uniqueEmail,
        password,
        fullName: "E2E Verifier",
      }),
    });
    const signupRes = await signupPost(signupReq);
    expect(signupRes.status).toBe(201);
    const signupData = await signupRes.json();
    expect(signupData.user.email).toBe(uniqueEmail);
    expect(signupData.user.emailVerified).toBe(false);
    expect(signupData.verificationToken).toBeTruthy();

    // 2. Verify unverified user cannot analyze a repository
    const blockedAnalyzeReq = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ repoUrl: "https://github.com/lukeed/clsx" }),
    });
    const blockedAnalyzeRes = await projectsPost(blockedAnalyzeReq);
    expect(blockedAnalyzeRes.status).toBe(403);
    const blockedData = await blockedAnalyzeRes.json();
    expect(blockedData.error.code).toBe("EMAIL_UNVERIFIED");

    // 3. Email verification
    const verifyReq = new Request("http://localhost:3000/api/auth/verify-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: signupData.verificationToken }),
    });
    const verifyRes = await verifyPost(verifyReq);
    expect(verifyRes.status).toBe(200);
    const verifyData = await verifyRes.json();
    expect(verifyData.user.emailVerified).toBe(true);

    // 4. Login
    const loginReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: uniqueEmail, password }),
    });
    const loginRes = await loginPost(loginReq);
    expect(loginRes.status).toBe(200);

    // 5. Dashboard project list (initially empty)
    const initialDashRes = await projectsGet();
    expect(initialDashRes.status).toBe(200);
    const initialDashData = await initialDashRes.json();
    expect(initialDashData.projects.length).toBe(0);

    // 6. Reject invalid GitHub URL on submission
    const invalidUrlReq = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoUrl: "https://github.com/lukeed/clsx/issues/1",
      }),
    });
    const invalidUrlRes = await projectsPost(invalidUrlReq);
    expect(invalidUrlRes.status).toBe(400);
    const invalidUrlData = await invalidUrlRes.json();
    expect(invalidUrlData.error.code).toBe("INVALID_URL");

    // 7. Submit real public GitHub URL (https://github.com/lukeed/clsx) -> repository validation -> analysis -> documentation preview
    const analyzeReq = new Request("http://localhost:3000/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        repoUrl: "https://github.com/lukeed/clsx",
      }),
    });
    const analyzeRes = await projectsPost(analyzeReq);
    expect(analyzeRes.status).toBe(201);
    const analyzeData = await analyzeRes.json();

    const workspace = analyzeData.workspace;
    expect(workspace.project.owner).toBe("lukeed");
    expect(workspace.project.repoName).toBe("clsx");
    expect(workspace.project.lastAnalyzedCommitSha).toBeTruthy();
    expect(workspace.sections.length).toBe(18);
    expect(workspace.questions.length).toBeGreaterThan(0);

    const projectId = workspace.project.id as string;

    // 8. Fetch Documentation Preview via GET /api/projects/[projectId]
    const previewRes = await projectDetailGet(
      new Request(`http://localhost:3000/api/projects/${projectId}`),
      { params: Promise.resolve({ projectId }) }
    );
    expect(previewRes.status).toBe(200);

    // 9. Answer clarification question -> updates ONLY the affected section
    const targetQuestion = workspace.questions[0];
    const unaffectedSectionBefore = workspace.sections.find(
      (s: { sectionKey: string }) =>
        s.sectionKey !== targetQuestion.sectionKey &&
        s.sectionKey !== "unresolved_questions"
    );

    const clarifyReq = new Request(
      `http://localhost:3000/api/projects/${projectId}/clarify`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questionId: targetQuestion.id,
          answerText:
            "Published to npm as a standalone utility package via GitHub releases.",
          selectedOption: null,
          isCustom: true,
        }),
      }
    );
    const clarifyRes = await clarifyPost(clarifyReq, {
      params: Promise.resolve({ projectId }),
    });
    expect(clarifyRes.status).toBe(200);
    const clarifyData = await clarifyRes.json();
    expect(clarifyData.updatedSection.sectionKey).toBe(targetQuestion.sectionKey);
    expect(clarifyData.updatedSection.contentMarkdown).toContain(
      "Published to npm as a standalone utility package via GitHub releases."
    );

    const unaffectedSectionAfter = clarifyData.workspace.sections.find(
      (s: { sectionKey: string }) =>
        s.sectionKey === unaffectedSectionBefore.sectionKey
    );
    expect(unaffectedSectionAfter.contentMarkdown).toBe(
      unaffectedSectionBefore.contentMarkdown
    );

    // 10. Ask a question about the analyzed repository
    const askReq = new Request(
      `http://localhost:3000/api/projects/${projectId}/ask`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: "How do I install and test this package?",
        }),
      }
    );
    const askRes = await askPost(askReq, {
      params: Promise.resolve({ projectId }),
    });
    expect(askRes.status).toBe(200);
    const askData = await askRes.json();
    expect(askData.answerMarkdown).toBeTruthy();

    // 11. Export Markdown
    const exportReq = new Request(
      `http://localhost:3000/api/projects/${projectId}/export`,
      { method: "POST" }
    );
    const exportRes = await exportPost(exportReq, {
      params: Promise.resolve({ projectId }),
    });
    expect(exportRes.status).toBe(200);
    const exportData = await exportRes.json();
    expect(exportData.fileName).toContain("lukeed-clsx-docs");
    expect(exportData.markdown).toContain("# lukeed/clsx — Technical Documentation");
    expect(exportData.workspace.project.analysisStatus).toBe("Exported");

    // 12. Logout
    const logoutRes = await logoutPost();
    expect(logoutRes.status).toBe(200);

    // Verify protected endpoint rejects unauthenticated call after logout
    const afterLogoutRes = await projectsGet();
    expect(afterLogoutRes.status).toBe(401);

    // 13. Login again and verify project + answers + export history are preserved
    const reloginReq = new Request("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: uniqueEmail, password }),
    });
    const reloginRes = await loginPost(reloginReq);
    expect(reloginRes.status).toBe(200);

    const finalDashRes = await projectsGet();
    expect(finalDashRes.status).toBe(200);
    const finalDashData = await finalDashRes.json();
    expect(finalDashData.projects.length).toBe(1);
    expect(finalDashData.projects[0].id).toBe(projectId);
    expect(finalDashData.projects[0].analysisStatus).toBe("Exported");
  }, 25000);
});
