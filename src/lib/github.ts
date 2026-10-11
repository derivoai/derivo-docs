import {
  DetectedFramework,
  DetectedLanguage,
  StructuredAppError,
  TreeFileEntry,
} from "./types";
import { parsePublicGitHubUrl } from "./validation";

export const REPO_LIMITS = {
  MAX_REPO_SIZE_KB: 150_000, // 150 MB
  MAX_TREE_FILES: 6_000,
  MAX_SINGLE_FILE_BYTES: 180_000, // 180 KB per file
  MAX_SELECTED_FILES: 28,
  MAX_TOTAL_CONTENT_BYTES: 360_000, // 360 KB total content sent to analysis
  REQUEST_TIMEOUT_MS: 12_000,
} as const;

export const IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  "vendor",
  "out",
  ".turbo",
  ".cache",
  ".vercel",
  ".output",
  "target",
  "__pycache__",
  ".venv",
  "venv",
  "env",
  ".tox",
  ".mypy_cache",
  ".pytest_cache",
  "Pods",
  "DerivedData",
  "bower_components",
  "jspm_packages",
  ".gradle",
  ".idea",
  ".vscode",
  "tmp",
  "temp",
  "logs",
]);

export const BINARY_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".ico",
  ".bmp",
  ".tiff",
  ".avif",
  ".mp4",
  ".mov",
  ".avi",
  ".mkv",
  ".webm",
  ".mp3",
  ".wav",
  ".ogg",
  ".flac",
  ".pdf",
  ".zip",
  ".tar",
  ".gz",
  ".tgz",
  ".bz2",
  ".xz",
  ".7z",
  ".rar",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".dat",
  ".iso",
  ".dmg",
  ".pkg",
  ".deb",
  ".rpm",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".otf",
  ".pyc",
  ".pyo",
  ".class",
  ".jar",
  ".war",
  ".ear",
  ".o",
  ".a",
  ".lib",
  ".wasm",
  ".sqlite",
  ".sqlite3",
  ".db",
  ".ds_store",
  ". min.js",
  ".min.css",
  ".map",
]);

export function shouldIgnoreDirectoryPath(filePath: string): string | null {
  const normalized = filePath.replace(/\\/g, "/");
  const segments = normalized.split("/");
  for (let i = 0; i < segments.length - 1; i++) {
    const dir = segments[i];
    if (IGNORED_DIRECTORIES.has(dir) || IGNORED_DIRECTORIES.has(dir.toLowerCase())) {
      return `Ignored directory: ${dir}`;
    }
  }
  return null;
}

export function isBinaryOrGeneratedFile(filePath: string): string | null {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".min.js") || lower.endsWith(".min.css") || lower.endsWith(".bundle.js")) {
    return "Minified or bundled asset";
  }
  const dotIndex = lower.lastIndexOf(".");
  if (dotIndex !== -1) {
    const ext = lower.slice(dotIndex);
    if (BINARY_EXTENSIONS.has(ext)) {
      return `Binary file extension: ${ext}`;
    }
  }
  return null;
}

export function classifyFileCategory(filePath: string): TreeFileEntry["category"] {
  const normalized = filePath.replace(/\\/g, "/");
  const lower = normalized.toLowerCase();
  const baseName = lower.split("/").pop() ?? "";

  if (
    baseName.startsWith("readme") ||
    baseName === "contributing.md" ||
    baseName === "architecture.md"
  ) {
    return "readme";
  }

  if (
    baseName === "package.json" ||
    baseName === "pyproject.toml" ||
    baseName === "requirements.txt" ||
    baseName === "cargo.toml" ||
    baseName === "go.mod" ||
    baseName === "pom.xml" ||
    baseName === "build.gradle" ||
    baseName === "composer.json" ||
    baseName === "gemfile"
  ) {
    return "manifest";
  }

  if (
    baseName === "package-lock.json" ||
    baseName === "yarn.lock" ||
    baseName === "pnpm-lock.yaml" ||
    baseName === "bun.lockb" ||
    baseName === "cargo.lock" ||
    baseName === "poetry.lock" ||
    baseName === "go.sum"
  ) {
    return "lockfile";
  }

  if (
    baseName.startsWith(".env") ||
    baseName.includes("env.example") ||
    baseName.includes("env.sample") ||
    baseName.includes("env.template")
  ) {
    return "env";
  }

  if (
    baseName === "dockerfile" ||
    baseName.startsWith("docker-compose") ||
    baseName === "vercel.json" ||
    baseName === "netlify.toml" ||
    baseName === "fly.toml" ||
    baseName === "render.yaml" ||
    baseName === "procfile" ||
    lower.startsWith(".github/workflows/")
  ) {
    return "deployment";
  }

  if (
    lower.includes("schema.prisma") ||
    lower.includes("/migrations/") ||
    lower.includes("/models/") ||
    lower.includes("/schema") ||
    lower.includes("drizzle") ||
    lower.endsWith(".sql")
  ) {
    return "database";
  }

  if (
    lower.includes("/api/") ||
    lower.includes("/routes/") ||
    lower.includes("/controllers/") ||
    lower.endsWith("/route.ts") ||
    lower.endsWith("/route.js") ||
    lower.includes("router")
  ) {
    return "route";
  }

  if (
    lower.includes(".test.") ||
    lower.includes(".spec.") ||
    lower.startsWith("test/") ||
    lower.startsWith("tests/") ||
    lower.includes("/__tests__/") ||
    baseName.startsWith("vitest.config") ||
    baseName.startsWith("jest.config") ||
    baseName.startsWith("playwright.config")
  ) {
    return "test";
  }

  if (
    baseName.startsWith("tsconfig") ||
    baseName.startsWith("next.config") ||
    baseName.startsWith("vite.config") ||
    baseName.startsWith("webpack.config") ||
    baseName.startsWith("tailwind.config") ||
    baseName.startsWith("eslint") ||
    baseName === "makefile"
  ) {
    return "config";
  }

  if (
    lower.startsWith("docs/") ||
    lower.endsWith(".md") ||
    lower.endsWith(".mdx")
  ) {
    return "docs";
  }

  if (
    baseName === "index.ts" ||
    baseName === "index.tsx" ||
    baseName === "index.js" ||
    baseName === "main.ts" ||
    baseName === "main.py" ||
    baseName === "main.go" ||
    baseName === "main.rs" ||
    baseName === "app.ts" ||
    baseName === "app.tsx" ||
    baseName === "app.py" ||
    baseName === "server.ts" ||
    baseName === "server.js" ||
    lower === "src/app/layout.tsx" ||
    lower === "src/app/page.tsx"
  ) {
    return "main";
  }

  return "source";
}

function getCategoryPriority(category: TreeFileEntry["category"], path: string): number {
  const depth = path.split("/").length;
  const baseScores: Record<NonNullable<TreeFileEntry["category"]>, number> = {
    readme: 100,
    manifest: 95,
    env: 90,
    config: 84,
    database: 82,
    route: 80,
    main: 78,
    deployment: 74,
    test: 68,
    docs: 64,
    source: 55,
    lockfile: 30,
  };
  const base = baseScores[category ?? "source"] ?? 50;
  return base - Math.min(depth * 2, 16);
}

export function checkRepositorySizeLimits(params: {
  sizeKb: number;
  treeCount: number;
  truncated?: boolean;
}): { ok: true } | { ok: false; error: StructuredAppError } {
  if (params.sizeKb > REPO_LIMITS.MAX_REPO_SIZE_KB) {
    return {
      ok: false,
      error: {
        code: "REPOSITORY_TOO_LARGE",
        whatHappened: `Repository size (${Math.round(params.sizeKb / 1024)} MB) exceeds the maximum allowed limit of ${Math.round(REPO_LIMITS.MAX_REPO_SIZE_KB / 1024)} MB.`,
        canRetry: false,
        nextAction: "Submit a smaller public repository or a focused package repository under 150 MB.",
        httpStatus: 413,
      },
    };
  }

  if (params.truncated || params.treeCount > REPO_LIMITS.MAX_TREE_FILES) {
    return {
      ok: false,
      error: {
        code: "REPOSITORY_TOO_LARGE",
        whatHappened: `Repository file tree (${params.treeCount.toLocaleString()} entries) exceeds the maximum limit of ${REPO_LIMITS.MAX_TREE_FILES.toLocaleString()} files.`,
        canRetry: false,
        nextAction: "Submit a repository with fewer than 6,000 tracked files.",
        httpStatus: 413,
      },
    };
  }

  return { ok: true };
}

export function filterAndSelectRepositoryFiles(rawEntries: Array<{
  path: string;
  type: "blob" | "tree";
  size?: number;
  sha: string;
}>): {
  processedTree: TreeFileEntry[];
  selectedFiles: TreeFileEntry[];
  ignoredCount: number;
} {
  const processedTree: TreeFileEntry[] = [];
  const candidates: Array<{ entry: TreeFileEntry; score: number }> = [];
  let ignoredCount = 0;

  for (const item of rawEntries) {
    if (item.type !== "blob") continue;
    const size = item.size ?? 0;

    const dirIgnore = shouldIgnoreDirectoryPath(item.path);
    if (dirIgnore) {
      ignoredCount++;
      processedTree.push({
        path: item.path,
        type: "blob",
        size,
        sha: item.sha,
        selected: false,
        ignoredReason: dirIgnore,
      });
      continue;
    }

    const binIgnore = isBinaryOrGeneratedFile(item.path);
    if (binIgnore) {
      ignoredCount++;
      processedTree.push({
        path: item.path,
        type: "blob",
        size,
        sha: item.sha,
        selected: false,
        ignoredReason: binIgnore,
      });
      continue;
    }

    if (size > REPO_LIMITS.MAX_SINGLE_FILE_BYTES) {
      ignoredCount++;
      processedTree.push({
        path: item.path,
        type: "blob",
        size,
        sha: item.sha,
        selected: false,
        ignoredReason: `Exceeds single file size limit (${Math.round(size / 1024)} KB > ${Math.round(REPO_LIMITS.MAX_SINGLE_FILE_BYTES / 1024)} KB)`,
      });
      continue;
    }

    const category = classifyFileCategory(item.path);
    if (category === "lockfile" && size > 25_000) {
      ignoredCount++;
      processedTree.push({
        path: item.path,
        type: "blob",
        size,
        sha: item.sha,
        category,
        selected: false,
        ignoredReason: "Large lockfile metadata only",
      });
      continue;
    }

    const entry: TreeFileEntry = {
      path: item.path,
      type: "blob",
      size,
      sha: item.sha,
      category,
      selected: false,
    };

    processedTree.push(entry);
    candidates.push({
      entry,
      score: getCategoryPriority(category, item.path),
    });
  }

  candidates.sort((a, b) => b.score - a.score);

  const selectedFiles: TreeFileEntry[] = [];
  let accumulatedBytes = 0;

  for (const candidate of candidates) {
    if (selectedFiles.length >= REPO_LIMITS.MAX_SELECTED_FILES) break;
    const estimatedBytes = Math.max(candidate.entry.size, 512);
    if (accumulatedBytes + estimatedBytes > REPO_LIMITS.MAX_TOTAL_CONTENT_BYTES) {
      continue;
    }
    candidate.entry.selected = true;
    selectedFiles.push(candidate.entry);
    accumulatedBytes += estimatedBytes;
  }

  return {
    processedTree,
    selectedFiles,
    ignoredCount,
  };
}

const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".py": "Python",
  ".go": "Go",
  ".rs": "Rust",
  ".java": "Java",
  ".kt": "Kotlin",
  ".rb": "Ruby",
  ".php": "PHP",
  ".cs": "C#",
  ".cpp": "C++",
  ".c": "C",
  ".h": "C/C++",
  ".swift": "Swift",
  ".sql": "SQL",
  ".sh": "Shell",
  ".css": "CSS",
  ".scss": "SCSS",
  ".html": "HTML",
};

export function detectLanguagesFromTree(entries: TreeFileEntry[]): DetectedLanguage[] {
  const byteTotals = new Map<string, { bytes: number; count: number }>();
  let totalBytes = 0;

  for (const item of entries) {
    if (item.ignoredReason) continue;
    const lower = item.path.toLowerCase();
    const dot = lower.lastIndexOf(".");
    if (dot === -1) continue;
    const ext = lower.slice(dot);
    const lang = EXTENSION_LANGUAGE_MAP[ext];
    if (!lang) continue;

    const bytes = Math.max(item.size, 200);
    totalBytes += bytes;
    const prev = byteTotals.get(lang) ?? { bytes: 0, count: 0 };
    byteTotals.set(lang, { bytes: prev.bytes + bytes, count: prev.count + 1 });
  }

  if (totalBytes === 0) return [];

  return Array.from(byteTotals.entries())
    .map(([name, stats]) => ({
      name,
      percentage: Math.max(1, Math.round((stats.bytes / totalBytes) * 1000) / 10),
      bytes: stats.bytes,
      filesCount: stats.count,
    }))
    .sort((a, b) => b.percentage - a.percentage);
}

export function detectFrameworksFromFiles(
  files: Array<{ path: string; content: string }>,
  treeEntries: TreeFileEntry[]
): DetectedFramework[] {
  const found = new Map<string, DetectedFramework>();

  const addFramework = (fw: DetectedFramework) => {
    if (!found.has(fw.name)) {
      found.set(fw.name, fw);
    }
  };

  for (const file of files) {
    const base = file.path.split("/").pop()?.toLowerCase() ?? "";
    if (base === "package.json") {
      try {
        const pkg = JSON.parse(file.content);
        const deps: Record<string, string> = {
          ...(pkg.dependencies ?? {}),
          ...(pkg.devDependencies ?? {}),
        };

        const rules: Array<{
          dep: string;
          name: string;
          category: DetectedFramework["category"];
        }> = [
          { dep: "next", name: "Next.js", category: "framework" },
          { dep: "react", name: "React", category: "framework" },
          { dep: "vue", name: "Vue.js", category: "framework" },
          { dep: "svelte", name: "Svelte", category: "framework" },
          { dep: "@angular/core", name: "Angular", category: "framework" },
          { dep: "express", name: "Express", category: "framework" },
          { dep: "fastify", name: "Fastify", category: "framework" },
          { dep: "hono", name: "Hono", category: "framework" },
          { dep: "@nestjs/core", name: "NestJS", category: "framework" },
          { dep: "tailwindcss", name: "Tailwind CSS", category: "library" },
          { dep: "prisma", name: "Prisma", category: "database" },
          { dep: "@prisma/client", name: "Prisma", category: "database" },
          { dep: "drizzle-orm", name: "Drizzle ORM", category: "database" },
          { dep: "mongoose", name: "Mongoose", category: "database" },
          { dep: "pg", name: "PostgreSQL (node-postgres)", category: "database" },
          { dep: "better-sqlite3", name: "SQLite (better-sqlite3)", category: "database" },
          { dep: "sqlite3", name: "SQLite", category: "database" },
          { dep: "@supabase/supabase-js", name: "Supabase", category: "database" },
          { dep: "zod", name: "Zod", category: "library" },
          { dep: "vitest", name: "Vitest", category: "testing" },
          { dep: "jest", name: "Jest", category: "testing" },
          { dep: "@playwright/test", name: "Playwright", category: "testing" },
          { dep: "cypress", name: "Cypress", category: "testing" },
          { dep: "vite", name: "Vite", category: "build" },
          { dep: "webpack", name: "Webpack", category: "build" },
          { dep: "turbo", name: "Turborepo", category: "build" },
          { dep: "stripe", name: "Stripe SDK", category: "library" },
          { dep: "next-auth", name: "Auth.js / NextAuth", category: "library" },
        ];

        for (const r of rules) {
          if (deps[r.dep]) {
            addFramework({
              name: r.name,
              category: r.category,
              evidenceFile: file.path,
              version: String(deps[r.dep]),
            });
          }
        }
      } catch {
        // Ignore malformed package.json
      }
    }

    if (base === "requirements.txt" || base === "pyproject.toml") {
      const lowerContent = file.content.toLowerCase();
      if (lowerContent.includes("fastapi")) {
        addFramework({ name: "FastAPI", category: "framework", evidenceFile: file.path });
      }
      if (lowerContent.includes("django")) {
        addFramework({ name: "Django", category: "framework", evidenceFile: file.path });
      }
      if (lowerContent.includes("flask")) {
        addFramework({ name: "Flask", category: "framework", evidenceFile: file.path });
      }
      if (lowerContent.includes("pytest")) {
        addFramework({ name: "Pytest", category: "testing", evidenceFile: file.path });
      }
      if (lowerContent.includes("sqlalchemy")) {
        addFramework({ name: "SQLAlchemy", category: "database", evidenceFile: file.path });
      }
    }

    if (base === "cargo.toml") {
      const lowerContent = file.content.toLowerCase();
      if (lowerContent.includes("axum")) {
        addFramework({ name: "Axum", category: "framework", evidenceFile: file.path });
      }
      if (lowerContent.includes("actix-web")) {
        addFramework({ name: "Actix Web", category: "framework", evidenceFile: file.path });
      }
      if (lowerContent.includes("tokio")) {
        addFramework({ name: "Tokio", category: "runtime", evidenceFile: file.path });
      }
    }

    if (base === "go.mod") {
      const lowerContent = file.content.toLowerCase();
      if (lowerContent.includes("gin-gonic/gin")) {
        addFramework({ name: "Gin", category: "framework", evidenceFile: file.path });
      }
      if (lowerContent.includes("gofiber/fiber")) {
        addFramework({ name: "Fiber", category: "framework", evidenceFile: file.path });
      }
    }
  }

  for (const entry of treeEntries) {
    const lower = entry.path.toLowerCase();
    if (lower === "dockerfile" || lower.endsWith("/dockerfile")) {
      addFramework({ name: "Docker", category: "deployment", evidenceFile: entry.path });
    }
    if (lower.startsWith(".github/workflows/")) {
      addFramework({
        name: "GitHub Actions",
        category: "deployment",
        evidenceFile: entry.path,
      });
    }
    if (lower.endsWith("schema.prisma")) {
      addFramework({ name: "Prisma", category: "database", evidenceFile: entry.path });
    }
  }

  return Array.from(found.values());
}

function getGitHubHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "Derivo-Docs-Analyzer/1.0",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const token = process.env.GITHUB_TOKEN?.trim();
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

async function fetchGitHubJson<T>(
  url: string
): Promise<{ ok: true; data: T } | { ok: false; error: StructuredAppError }> {
  let response: Response;
  try {
    response = await fetch(url, {
      headers: getGitHubHeaders(),
      signal: AbortSignal.timeout(REPO_LIMITS.REQUEST_TIMEOUT_MS),
      cache: "no-store",
    });
  } catch (err) {
    const isTimeout = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return {
      ok: false,
      error: {
        code: isTimeout ? "NETWORK_TIMEOUT" : "GITHUB_API_FAILURE",
        whatHappened: isTimeout
          ? "The request to the GitHub API timed out after 12 seconds."
          : "Could not reach the GitHub REST API due to a network error.",
        canRetry: true,
        nextAction: "Check your network connection and click Retry Analysis.",
        httpStatus: 504,
      },
    };
  }

  const remaining = response.headers.get("x-ratelimit-remaining");
  const resetEpoch = response.headers.get("x-ratelimit-reset");

  if (response.status === 429 || (response.status === 403 && remaining === "0")) {
    const resetTime = resetEpoch
      ? new Date(Number(resetEpoch) * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : "shortly";
    return {
      ok: false,
      error: {
        code: "GITHUB_RATE_LIMIT",
        whatHappened: `GitHub API rate limit reached. Rate limit resets at ${resetTime}.`,
        canRetry: true,
        nextAction:
          "Wait until the rate limit window resets or configure a server-side GITHUB_TOKEN environment variable for higher rate limits (5,000 req/hr).",
        httpStatus: 429,
      },
    };
  }

  if (response.status === 404) {
    return {
      ok: false,
      error: {
        code: "MISSING_REPOSITORY",
        whatHappened:
          "The repository could not be found on GitHub, or it is a private repository requiring authentication.",
        canRetry: false,
        nextAction:
          "Verify that the repository exists and its visibility is set to Public on GitHub. Derivo Docs does not access private repositories.",
        httpStatus: 404,
      },
    };
  }

  if (response.status === 401 || response.status === 403) {
    return {
      ok: false,
      error: {
        code: "PRIVATE_REPOSITORY",
        whatHappened: "Access to this repository was denied by GitHub.",
        canRetry: false,
        nextAction: "Ensure the repository is public and accessible without authentication.",
        httpStatus: 403,
      },
    };
  }

  if (!response.ok) {
    return {
      ok: false,
      error: {
        code: "GITHUB_API_FAILURE",
        whatHappened: `GitHub API returned unexpected HTTP status ${response.status}.`,
        canRetry: true,
        nextAction: "Retry the analysis in a moment.",
        httpStatus: 502,
      },
    };
  }

  try {
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch {
    return {
      ok: false,
      error: {
        code: "GITHUB_API_FAILURE",
        whatHappened: "GitHub API returned an unreadable response payload.",
        canRetry: true,
        nextAction: "Retry the analysis.",
        httpStatus: 502,
      },
    };
  }
}

export interface FetchedRepositoryBundle {
  normalizedUrl: string;
  owner: string;
  repoName: string;
  description: string | null;
  defaultBranch: string;
  commitSha: string;
  starsCount: number;
  forksCount: number;
  openIssuesCount: number;
  licenseName: string | null;
  sizeKb: number;
  totalFilesInTree: number;
  selectedFilesCount: number;
  ignoredFilesCount: number;
  fileTree: TreeFileEntry[];
  detectedLanguages: DetectedLanguage[];
  detectedFrameworks: DetectedFramework[];
  fetchedFiles: Array<{ path: string; content: string; category: string }>;
}

export async function inspectPublicGitHubRepository(
  rawUrl: string,
  onStageProgress?: (stageIndex: number) => Promise<void> | void
): Promise<{ ok: true; data: FetchedRepositoryBundle } | { ok: false; error: StructuredAppError }> {
  // Stage 0: Validating repository URL
  await onStageProgress?.(0);
  const parsed = parsePublicGitHubUrl(rawUrl);
  if (!parsed.ok) {
    return parsed;
  }

  const { owner, repo, normalizedUrl } = parsed.data;

  // Stage 1: Checking repository access
  await onStageProgress?.(1);
  interface GitHubRepoApiPayload {
    name: string;
    full_name: string;
    private: boolean;
    visibility?: string;
    description: string | null;
    default_branch: string;
    size: number;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    license: { name: string } | null;
  }

  const repoRes = await fetchGitHubJson<GitHubRepoApiPayload>(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`
  );

  if (!repoRes.ok) {
    return repoRes;
  }

  const repoMeta = repoRes.data;
  if (repoMeta.private || (repoMeta.visibility && repoMeta.visibility !== "public")) {
    return {
      ok: false,
      error: {
        code: "PRIVATE_REPOSITORY",
        whatHappened: `"${owner}/${repo}" is a private repository. Derivo Docs only supports public repositories.`,
        canRetry: false,
        nextAction: "Submit a public GitHub repository URL.",
        httpStatus: 403,
      },
    };
  }

  // Stage 2: Reading repository structure
  await onStageProgress?.(2);
  const defaultBranch = repoMeta.default_branch || "main";

  interface GitHubCommitPayload {
    sha: string;
  }
  const commitRes = await fetchGitHubJson<GitHubCommitPayload>(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${encodeURIComponent(defaultBranch)}`
  );
  if (!commitRes.ok) {
    return commitRes;
  }

  const commitSha = commitRes.data.sha;

  interface GitHubTreePayload {
    sha: string;
    truncated?: boolean;
    tree: Array<{
      path: string;
      mode: string;
      type: "blob" | "tree";
      size?: number;
      sha: string;
    }>;
  }

  const treeRes = await fetchGitHubJson<GitHubTreePayload>(
    `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(commitSha)}?recursive=1`
  );
  if (!treeRes.ok) {
    return treeRes;
  }

  const sizeCheck = checkRepositorySizeLimits({
    sizeKb: repoMeta.size ?? 0,
    treeCount: treeRes.data.tree.length,
    truncated: treeRes.data.truncated,
  });
  if (!sizeCheck.ok) {
    return sizeCheck;
  }

  // Stage 3: Selecting relevant files
  await onStageProgress?.(3);
  const { processedTree, selectedFiles, ignoredCount } = filterAndSelectRepositoryFiles(
    treeRes.data.tree
  );

  if (selectedFiles.length === 0) {
    return {
      ok: false,
      error: {
        code: "UNSUPPORTED_FILES",
        whatHappened:
          "The repository contains no supported readable text or source files after filtering binary and generated directories.",
        canRetry: false,
        nextAction: "Submit a repository that contains source code, configuration files, or Markdown documentation.",
        httpStatus: 422,
      },
    };
  }

  // Fetch file contents in parallel batches of 6
  const fetchedFiles: Array<{ path: string; content: string; category: string }> = [];
  const batchSize = 6;
  for (let i = 0; i < selectedFiles.length; i += batchSize) {
    const slice = selectedFiles.slice(i, i + batchSize);
    const batchResults = await Promise.all(
      slice.map(async (entry) => {
        const rawFileUrl = `https://raw.githubusercontent.com/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/${encodeURIComponent(commitSha)}/${entry.path
          .split("/")
          .map(encodeURIComponent)
          .join("/")}`;
        try {
          const res = await fetch(rawFileUrl, {
            signal: AbortSignal.timeout(REPO_LIMITS.REQUEST_TIMEOUT_MS),
          });
          if (!res.ok) return null;
          const text = await res.text();
          // Skip files containing null bytes (binary masquerading as text)
          if (text.includes("\u0000")) return null;
          return {
            path: entry.path,
            content: text.slice(0, 18_000),
            category: entry.category ?? "source",
          };
        } catch {
          return null;
        }
      })
    );
    for (const item of batchResults) {
      if (item) fetchedFiles.push(item);
    }
  }

  // Stage 4: Detecting languages and frameworks
  await onStageProgress?.(4);
  const detectedLanguages = detectLanguagesFromTree(processedTree);
  const detectedFrameworks = detectFrameworksFromFiles(fetchedFiles, processedTree);

  return {
    ok: true,
    data: {
      normalizedUrl,
      owner,
      repoName: repoMeta.name || repo,
      description: repoMeta.description,
      defaultBranch,
      commitSha,
      starsCount: repoMeta.stargazers_count ?? 0,
      forksCount: repoMeta.forks_count ?? 0,
      openIssuesCount: repoMeta.open_issues_count ?? 0,
      licenseName: repoMeta.license?.name ?? null,
      sizeKb: repoMeta.size ?? 0,
      totalFilesInTree: processedTree.length,
      selectedFilesCount: selectedFiles.length,
      ignoredFilesCount: ignoredCount,
      fileTree: processedTree.slice(0, 450),
      detectedLanguages,
      detectedFrameworks,
      fetchedFiles,
    },
  };
}
