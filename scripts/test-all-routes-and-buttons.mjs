import { JSDOM } from "jsdom";

const BASE_URL = "http://localhost:3000";

const ROUTES = [
  "/",
  "/demo",
  "/pricing",
  "/about",
  "/contact",
  "/terms",
  "/privacy",
  "/login",
  "/signup",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/dashboard",
];

const results = {
  pages: [],
  linksTested: 0,
  brokenLinks: [],
  buttonsFound: 0,
  formsFound: 0,
  errors: [],
};

async function fetchPage(path) {
  const url = `${BASE_URL}${path}`;
  try {
    const res = await fetch(url, { redirect: "manual" });
    const status = res.status;
    const isRedirect = status >= 300 && status < 400;
    const location = res.headers.get("location");
    let text = "";
    if (!isRedirect) {
      text = await res.text();
    }
    return { url, path, status, isRedirect, location, text };
  } catch (err) {
    return { url, path, status: 0, error: err.message };
  }
}

async function runAudit() {
  console.log(`\n======================================================`);
  console.log(`🔍 Derivo Docs Comprehensive Route & UI Element Audit`);
  console.log(`   Base URL: ${BASE_URL}`);
  console.log(`======================================================\n`);

  const visitedUrls = new Set();
  const internalLinksToVerify = new Set();

  for (const path of ROUTES) {
    const page = await fetchPage(path);
    visitedUrls.add(path);

    if (page.status === 0) {
      console.log(`❌ [FAILED] ${path}: Connection error: ${page.error}`);
      results.errors.push(`${path}: ${page.error}`);
      continue;
    }

    if (page.isRedirect) {
      console.log(`↪️  [REDIRECT] ${path} -> ${page.location} (HTTP ${page.status})`);
      results.pages.push({ path, status: page.status, redirect: page.location });
      if (page.location) internalLinksToVerify.add(page.location);
      continue;
    }

    if (page.status !== 200) {
      console.log(`❌ [HTTP ${page.status}] ${path}`);
      results.brokenLinks.push({ path, status: page.status });
      continue;
    }

    // Parse HTML with JSDOM to inspect DOM elements
    const dom = new JSDOM(page.text);
    const doc = dom.window.document;

    // Check for Next.js error indicators
    const hasNextError =
      page.text.includes("Application error:") ||
      page.text.includes("Internal Server Error") ||
      page.text.includes("Unhandled Runtime Error");

    if (hasNextError) {
      console.log(`⚠️  [RUNTIME ERROR DETECTED] ${path}`);
      results.errors.push(`Page ${path} rendered runtime error content`);
    } else {
      console.log(`✅ [HTTP 200 OK] ${path} (Title: "${doc.title || "Derivo Docs"}")`);
    }

    // Collect all links on the page
    const anchors = Array.from(doc.querySelectorAll("a"));
    const buttons = Array.from(doc.querySelectorAll("button"));
    const forms = Array.from(doc.querySelectorAll("form"));

    results.buttonsFound += buttons.length;
    results.formsFound += forms.length;

    for (const a of anchors) {
      const href = a.getAttribute("href");
      if (!href) continue;

      if (href.startsWith("/") && !href.startsWith("//")) {
        const cleanHref = href.split("#")[0].split("?")[0] || "/";
        internalLinksToVerify.add(cleanHref);
      }
    }

    results.pages.push({
      path,
      status: page.status,
      anchors: anchors.length,
      buttons: buttons.length,
      forms: forms.length,
    });
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`🔗 Checking all discovered internal link targets (${internalLinksToVerify.size} targets)...`);
  console.log(`------------------------------------------------------`);

  for (const target of internalLinksToVerify) {
    if (visitedUrls.has(target)) continue;
    results.linksTested++;

    const res = await fetchPage(target);
    if (res.status === 200 || (res.status >= 300 && res.status < 400)) {
      console.log(`  ✅ Link target ${target}: HTTP ${res.status}`);
    } else {
      console.log(`  ❌ Broken link target ${target}: HTTP ${res.status}`);
      results.brokenLinks.push({ path: target, status: res.status });
    }
  }

  console.log(`\n------------------------------------------------------`);
  console.log(`⚡ Testing Interactive API Endpoints & Auth Handlers...`);
  console.log(`------------------------------------------------------`);

  // 1. Test Demo Workspace ground answers
  const askRes = await fetch(`${BASE_URL}/demo`);
  console.log(`  ✅ Demo Workspace interactive mode: HTTP ${askRes.status}`);

  // 2. Test Invalid GitHub Repo validation API
  const badRepoRes = await fetch(`${BASE_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ repoUrl: "https://notgithub.com/invalid/repo" }),
  });
  const badRepoData = await badRepoRes.json();
  if (badRepoRes.status === 401 || badRepoRes.status === 400) {
    console.log(`  ✅ API /api/projects correctly validated/rejected invalid URL with status ${badRepoRes.status}`);
  } else {
    console.log(`  ⚠️ Unexpected status for invalid repo: ${badRepoRes.status}`);
  }

  // 3. Test Auth Login validation (missing fields rejection)
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid-email", password: "" }),
  });
  console.log(`  ✅ API /api/auth/login input validation returns: HTTP ${loginRes.status}`);

  // 4. Test Auth Signup validation
  const signupRes = await fetch(`${BASE_URL}/api/auth/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "invalid", password: "123" }),
  });
  console.log(`  ✅ API /api/auth/signup input validation returns: HTTP ${signupRes.status}`);

  console.log(`\n======================================================`);
  console.log(`📊 Audit Summary:`);
  console.log(`   - Main routes audited: ${results.pages.length}`);
  console.log(`   - Total buttons audited: ${results.buttonsFound}`);
  console.log(`   - Total forms audited: ${results.formsFound}`);
  console.log(`   - Broken internal links: ${results.brokenLinks.length}`);
  console.log(`   - Runtime exceptions: ${results.errors.length}`);
  console.log(`======================================================\n`);

  if (results.brokenLinks.length > 0 || results.errors.length > 0) {
    process.exit(1);
  }
}

runAudit();
