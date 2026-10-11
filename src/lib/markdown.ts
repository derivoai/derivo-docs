import { ProjectWorkspaceBundle, SECTION_DEFINITIONS } from "./types";

/**
 * Escapes HTML special characters to prevent XSS injection.
 */
export function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Validates and sanitizes a URL for safe anchor rendering.
 * Blocks javascript:, vbscript:, data:, file:, and unknown schemes.
 */
export function sanitizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return "#";

  const normalized = trimmed.replace(/[\u0000-\u001F\u007F\s]+/g, "").toLowerCase();
  if (
    normalized.startsWith("javascript:") ||
    normalized.startsWith("vbscript:") ||
    normalized.startsWith("data:") ||
    normalized.startsWith("file:") ||
    normalized.startsWith("blob:")
  ) {
    return "#unsafe-url-blocked";
  }

  if (
    trimmed.startsWith("https://") ||
    trimmed.startsWith("http://") ||
    trimmed.startsWith("mailto:") ||
    trimmed.startsWith("#") ||
    trimmed.startsWith("/")
  ) {
    return escapeHtml(trimmed);
  }

  return "#";
}

/**
 * Sanitizes raw Markdown text by neutralizing embedded raw HTML/script payloads
 * outside of fenced code blocks and neutralizing dangerous link protocols.
 */
export function sanitizeMarkdownText(markdown: string): string {
  if (!markdown) return "";

  // Split by fenced code blocks so code examples remain literal text (escaped on render)
  const segments = markdown.split(/(```[\s\S]*?```)/g);
  return segments
    .map((segment, index) => {
      // Odd segments are fenced code blocks
      if (index % 2 === 1) {
        return segment;
      }
      return segment
        // Remove <script>, <iframe>, <object>, <embed>, <style>, <form>, <meta>, <link> blocks
        .replace(/<\s*(script|iframe|object|embed|style|form|meta|link|base|applet)\b[^>]*>[\s\S]*?<\s*\/\s*\1\s*>/gi, "")
        // Remove self-closing or unclosed dangerous tags
        .replace(/<\s*\/?\s*(script|iframe|object|embed|style|form|meta|link|base|applet|svg|math|input|button|textarea)\b[^>]*\/?>/gi, "")
        // Remove inline event handlers like onload=, onerror=, onclick=
        .replace(/\bon[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi, "")
        // Neutralize javascript:/data:/vbscript: inside markdown links
        .replace(/\]\(\s*(?:javascript|vbscript|data):[^)]*\)/gi, "](#unsafe-url-blocked)");
    })
    .join("");
}

function formatInlineMarkdown(escapedLine: string): string {
  // Handle inline code first by tokenizing
  const inlineCodeTokens: string[] = [];
  const withCodePlaceholders = escapedLine.replace(/`([^`]+)`/g, (_match, codeContent: string) => {
    const tokenIndex = inlineCodeTokens.length;
    inlineCodeTokens.push(
      `<code class="doc-inline-code">${codeContent}</code>`
    );
    return `@@INLINECODE_${tokenIndex}@@`;
  });

  // Links: [label](url)
  let formatted = withCodePlaceholders.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    (_match, label: string, rawHref: string) => {
      const unescapedHref = rawHref
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'");
      const safeHref = sanitizeUrl(unescapedHref);
      const isExternal = safeHref.startsWith("http://") || safeHref.startsWith("https://");
      const targetAttrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : "";
      return `<a href="${safeHref}" class="doc-link"${targetAttrs}>${label}</a>`;
    }
  );

  // Bold **text**
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // Italic *text*
  formatted = formatted.replace(/(^|[^*])\*([^*\n]+)\*(?!\*)/g, "$1<em>$2</em>");

  // Restore inline code tokens
  formatted = formatted.replace(/@@INLINECODE_(\d+)@@/g, (_m, idxStr: string) => {
    const idx = Number(idxStr);
    return inlineCodeTokens[idx] ?? "";
  });

  return formatted;
}

/**
 * Converts Markdown into strictly sanitized, semantic HTML.
 * Never passes raw HTML from input through to the DOM.
 */
export function renderSanitizedMarkdownToHtml(rawMarkdown: string): string {
  const cleaned = sanitizeMarkdownText(rawMarkdown);
  const lines = cleaned.replace(/\r\n/g, "\n").split("\n");

  const htmlParts: string[] = [];
  let inCodeBlock = false;
  let codeBlockLang = "";
  let codeBlockLines: string[] = [];
  let inUl = false;
  let inOl = false;
  let inTable = false;
  let tableHeaderRendered = false;

  const closeListsAndTables = () => {
    if (inUl) {
      htmlParts.push("</ul>");
      inUl = false;
    }
    if (inOl) {
      htmlParts.push("</ol>");
      inOl = false;
    }
    if (inTable) {
      htmlParts.push("</tbody></table></div>");
      inTable = false;
      tableHeaderRendered = false;
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check fenced code block toggle
    if (line.trim().startsWith("```")) {
      if (!inCodeBlock) {
        closeListsAndTables();
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim().replace(/[^a-zA-Z0-9_-]/g, "");
        codeBlockLines = [];
      } else {
        const escapedCode = escapeHtml(codeBlockLines.join("\n"));
        const langAttr = codeBlockLang ? ` data-lang="${escapeHtml(codeBlockLang)}"` : "";
        htmlParts.push(
          `<pre class="doc-code-block"${langAttr}><code>${escapedCode}</code></pre>`
        );
        inCodeBlock = false;
        codeBlockLang = "";
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      closeListsAndTables();
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      closeListsAndTables();
      htmlParts.push('<hr class="doc-hr" />');
      continue;
    }

    // Headings
    const headingMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
    if (headingMatch) {
      closeListsAndTables();
      const level = Math.min(headingMatch[1].length + 1, 5); // h2-h5 inside section
      const content = formatInlineMarkdown(escapeHtml(headingMatch[2]));
      htmlParts.push(`<h${level} class="doc-heading-${level}">${content}</h${level}>`);
      continue;
    }

    // Blockquote
    if (trimmed.startsWith(">")) {
      closeListsAndTables();
      const quoteText = trimmed.replace(/^>\s?/, "");
      const content = formatInlineMarkdown(escapeHtml(quoteText));
      const isNotFound = quoteText.includes("Not found in the analyzed repository.");
      htmlParts.push(
        `<blockquote class="${isNotFound ? "doc-blockquote doc-not-found" : "doc-blockquote"}">${content}</blockquote>`
      );
      continue;
    }

    // Markdown Table row
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      if (inUl || inOl) {
        if (inUl) {
          htmlParts.push("</ul>");
          inUl = false;
        }
        if (inOl) {
          htmlParts.push("</ol>");
          inOl = false;
        }
      }
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim());

      // Check if separator row like |---|---|
      if (cells.every((c) => /^:?-{2,}:?$/.test(c))) {
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaderRendered = false;
        htmlParts.push('<div class="doc-table-wrap"><table class="doc-table">');
      }

      if (!tableHeaderRendered) {
        const ths = cells
          .map((c) => `<th>${formatInlineMarkdown(escapeHtml(c))}</th>`)
          .join("");
        htmlParts.push(`<thead><tr>${ths}</tr></thead><tbody>`);
        tableHeaderRendered = true;
      } else {
        const tds = cells
          .map((c) => `<td>${formatInlineMarkdown(escapeHtml(c))}</td>`)
          .join("");
        htmlParts.push(`<tr>${tds}</tr>`);
      }
      continue;
    } else if (inTable) {
      closeListsAndTables();
    }

    // Unordered list
    const ulMatch = trimmed.match(/^[-*+]\s+(.+)$/);
    if (ulMatch) {
      if (inOl) {
        htmlParts.push("</ol>");
        inOl = false;
      }
      if (!inUl) {
        htmlParts.push('<ul class="doc-list-ul">');
        inUl = true;
      }
      htmlParts.push(`<li>${formatInlineMarkdown(escapeHtml(ulMatch[1]))}</li>`);
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^\d+\.\s+(.+)$/);
    if (olMatch) {
      if (inUl) {
        htmlParts.push("</ul>");
        inUl = false;
      }
      if (!inOl) {
        htmlParts.push('<ol class="doc-list-ol">');
        inOl = true;
      }
      htmlParts.push(`<li>${formatInlineMarkdown(escapeHtml(olMatch[1]))}</li>`);
      continue;
    }

    // Standard paragraph
    closeListsAndTables();
    htmlParts.push(`<p class="doc-p">${formatInlineMarkdown(escapeHtml(trimmed))}</p>`);
  }

  if (inCodeBlock) {
    const escapedCode = escapeHtml(codeBlockLines.join("\n"));
    htmlParts.push(`<pre class="doc-code-block"><code>${escapedCode}</code></pre>`);
  }

  closeListsAndTables();
  return htmlParts.join("\n");
}

/**
 * Generates the complete, structured Markdown export for a project.
 */
export function buildFullProjectMarkdownExport(bundle: ProjectWorkspaceBundle): string {
  const { project, metadata, sections, questions, answers } = bundle;
  const openQuestions = questions.filter((q) => q.status === "open");
  const commitLabel = project.lastAnalyzedCommitSha
    ? project.lastAnalyzedCommitSha.slice(0, 12)
    : "unknown";

  const lines: string[] = [
    `# ${project.owner}/${project.repoName} — Technical Documentation`,
    "",
    `> Generated with **Derivo Docs** from public repository evidence.`,
    `> - **Repository:** ${project.repoUrl}`,
    `> - **Default branch:** \`${project.defaultBranch}\``,
    `> - **Analyzed commit SHA:** \`${commitLabel}\``,
    `> - **Analysis status:** ${project.analysisStatus}`,
    `> - **Open clarification questions:** ${openQuestions.length}`,
    "",
  ];

  if (metadata && metadata.detectedLanguages.length > 0) {
    lines.push(
      `**Detected Languages:** ${metadata.detectedLanguages
        .map((l) => `${l.name} (${l.percentage}%)`)
        .join(", ")}`
    );
    lines.push("");
  }

  lines.push("## Table of Contents");
  lines.push("");

  const orderedSections = [...sections].sort((a, b) => a.sectionOrder - b.sectionOrder);
  for (const sec of orderedSections) {
    const anchor = sec.sectionKey.replace(/_/g, "-");
    lines.push(`${sec.sectionOrder}. [${sec.title}](#${anchor})`);
  }

  lines.push("");
  lines.push("---");
  lines.push("");

  for (const def of SECTION_DEFINITIONS) {
    const sec = orderedSections.find((s) => s.sectionKey === def.key);
    const anchor = def.key.replace(/_/g, "-");
    lines.push(`## ${def.order}. ${def.title} {#${anchor}}`);
    lines.push("");

    if (!sec) {
      lines.push("> Not found in the analyzed repository.");
      lines.push("");
      continue;
    }

    lines.push(
      `*Evidence confidence: \`${sec.confidence}\` — ${sec.confidenceNote}*`
    );
    if (sec.sourceFiles.length > 0) {
      lines.push(
        `*Source files: ${sec.sourceFiles.map((f) => `\`${f}\``).join(", ")}*`
      );
    }
    lines.push("");
    lines.push(sanitizeMarkdownText(sec.contentMarkdown));
    lines.push("");

    const sectionAnswers = answers.filter((a) => a.sectionKey === def.key);
    if (sectionAnswers.length > 0) {
      lines.push("### Verified Maintainer Clarifications");
      lines.push("");
      for (const ans of sectionAnswers) {
        const q = questions.find((item) => item.id === ans.questionId);
        if (q) {
          lines.push(`- **Question:** ${q.question}`);
        }
        lines.push(`  - **Confirmed answer:** ${ans.answerText}`);
      }
      lines.push("");
    }

    lines.push("---");
    lines.push("");
  }

  return lines.join("\n");
}
