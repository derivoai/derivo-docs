export const ANALYSIS_STAGES = [
  "Validating repository URL",
  "Checking repository access",
  "Reading repository structure",
  "Selecting relevant files",
  "Detecting languages and frameworks",
  "Analyzing project configuration",
  "Drafting documentation",
  "Checking evidence and uncertainty",
  "Preparing review preview",
  "Ready for review",
] as const;

export type AnalysisStage = (typeof ANALYSIS_STAGES)[number];

export const PROJECT_STATUSES = [
  "Waiting for verification",
  "Validating repository",
  "Reading files",
  "Analyzing code",
  "Needs your answer",
  "Ready for review",
  "Exported",
  "Analysis failed",
] as const;

export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const SECTION_DEFINITIONS = [
  { key: "project_overview", order: 1, title: "Project overview" },
  { key: "what_the_application_does", order: 2, title: "What the application does" },
  { key: "languages_and_frameworks", order: 3, title: "Detected languages and frameworks" },
  { key: "installation_and_setup", order: 4, title: "Installation and setup" },
  { key: "environment_variables", order: 5, title: "Environment variables" },
  { key: "important_commands", order: 6, title: "Important commands and scripts" },
  { key: "architecture_overview", order: 7, title: "Architecture overview" },
  { key: "folder_and_file_guide", order: 8, title: "Folder and file guide" },
  { key: "core_modules", order: 9, title: "Core modules" },
  { key: "api_and_routes", order: 10, title: "API and routes" },
  { key: "database_and_data_model", order: 11, title: "Database and data model" },
  { key: "authentication_and_authorization", order: 12, title: "Authentication and authorization" },
  { key: "external_services", order: 13, title: "External services and integrations" },
  { key: "testing_guide", order: 14, title: "Testing guide" },
  { key: "deployment_guide", order: 15, title: "Deployment guide" },
  { key: "developer_onboarding", order: 16, title: "Developer onboarding guide" },
  { key: "known_limitations", order: 17, title: "Known limitations" },
  { key: "unresolved_questions", order: 18, title: "Unresolved questions" },
] as const;

export type SectionKey = (typeof SECTION_DEFINITIONS)[number]["key"];

export type ConfidenceLevel = "high" | "medium" | "low" | "insufficient_evidence";

export const NOT_FOUND_STATEMENT = "> Not found in the analyzed repository.";

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
  projectsLimit: number;
  createdAt: string;
  updatedAt: string;
}

export interface DetectedLanguage {
  name: string;
  percentage: number;
  bytes?: number;
  filesCount?: number;
}

export interface DetectedFramework {
  name: string;
  category: "framework" | "runtime" | "database" | "testing" | "build" | "deployment" | "library";
  evidenceFile: string;
  version?: string;
}

export interface TreeFileEntry {
  path: string;
  type: "blob" | "tree";
  size: number;
  sha: string;
  category?:
    | "readme"
    | "manifest"
    | "lockfile"
    | "config"
    | "route"
    | "database"
    | "main"
    | "test"
    | "deployment"
    | "env"
    | "docs"
    | "source";
  selected?: boolean;
  ignoredReason?: string;
}

export interface RepositoryMetadataRecord {
  id: string;
  projectId: string;
  userId: string;
  repoUrl: string;
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
  fetchedSamples?: Array<{ path: string; content: string; category: string }>;
  createdAt: string;
  updatedAt: string;
}

export interface AnalysisRunRecord {
  id: string;
  projectId: string;
  userId: string;
  commitSha: string | null;
  status: ProjectStatus;
  currentStage: AnalysisStage;
  completedStages: AnalysisStage[];
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean;
  recommendedAction: string | null;
  startedAt: string;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentationSectionRecord {
  id: string;
  projectId: string;
  analysisRunId: string | null;
  userId: string;
  sectionKey: SectionKey;
  sectionOrder: number;
  title: string;
  contentMarkdown: string;
  confidence: ConfidenceLevel;
  confidenceNote: string;
  sourceFiles: string[];
  hasUnresolvedQuestions: boolean;
  lastRegeneratedFromAnswerId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ClarificationQuestionRecord {
  id: string;
  projectId: string;
  analysisRunId: string | null;
  userId: string;
  sectionKey: SectionKey;
  question: string;
  rationale: string;
  evidencePaths: string[];
  evidenceSnippet: string | null;
  options: string[];
  status: "open" | "answered";
  createdAt: string;
  updatedAt: string;
}

export interface ClarificationAnswerRecord {
  id: string;
  questionId: string;
  projectId: string;
  userId: string;
  sectionKey: SectionKey;
  answerText: string;
  selectedOption: string | null;
  isCustom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ExportHistoryRecord {
  id: string;
  projectId: string;
  userId: string;
  commitSha: string;
  exportFormat: "markdown";
  sectionsCount: number;
  unresolvedCount: number;
  fileName: string;
  createdAt: string;
}

export interface ProjectRecord {
  id: string;
  userId: string;
  repoUrl: string;
  owner: string;
  repoName: string;
  defaultBranch: string;
  lastAnalyzedCommitSha: string | null;
  detectedLanguages: DetectedLanguage[];
  detectedFrameworks: DetectedFramework[];
  analysisStatus: ProjectStatus;
  currentStage: AnalysisStage;
  overallConfidence: ConfidenceLevel;
  summary: string | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectWorkspaceBundle {
  project: ProjectRecord;
  metadata: RepositoryMetadataRecord | null;
  latestRun: AnalysisRunRecord | null;
  sections: DocumentationSectionRecord[];
  questions: ClarificationQuestionRecord[];
  answers: ClarificationAnswerRecord[];
  exports: ExportHistoryRecord[];
}

export interface StructuredAppError {
  code:
    | "INVALID_URL"
    | "PRIVATE_REPOSITORY"
    | "MISSING_REPOSITORY"
    | "GITHUB_API_FAILURE"
    | "GITHUB_RATE_LIMIT"
    | "REPOSITORY_TOO_LARGE"
    | "UNSUPPORTED_FILES"
    | "CLAUDE_API_FAILURE"
    | "MALFORMED_AI_OUTPUT"
    | "EXPIRED_AUTHENTICATION"
    | "EMAIL_UNVERIFIED"
    | "PROJECT_LIMIT_REACHED"
    | "NETWORK_TIMEOUT"
    | "DATABASE_FAILURE"
    | "EXPORT_FAILURE"
    | "VALIDATION_ERROR"
    | "UNAUTHORIZED"
    | "NOT_FOUND";
  whatHappened: string;
  canRetry: boolean;
  nextAction: string;
  httpStatus: number;
}
