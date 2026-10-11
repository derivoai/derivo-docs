import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getAuthenticatedSession } from "@/lib/session";

export const metadata = {
  title: "Terms of Service | Derivo Docs",
  description: "Terms of Service governing the use of Derivo Docs (derivo.in) for repository documentation generation.",
};

export default async function TermsPage() {
  const session = await getAuthenticatedSession();

  return (
    <div className="min-h-screen flex flex-col bg-[#EFEFEF] text-gray-900">
      <Header user={session.user} />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-4xl mx-auto px-5 sm:px-8 space-y-10">
          {/* Header */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 text-white text-[11px] sm:text-[12px] font-semibold flex items-center justify-center">
                1
              </span>
              <span className="text-[12px] sm:text-[13px] font-medium border border-gray-300 bg-white rounded-full px-3.5 py-1 text-gray-900">
                Legal Agreements
              </span>
            </div>

            <h1 className="text-[clamp(1.75rem,6vw,3.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900">
              Terms of Service
            </h1>
            <p className="text-[13px] text-gray-600">
              Last updated: October 2026 &bull; Domain:{" "}
              <span className="font-mono-code font-semibold text-gray-900">derivo.in</span>
            </p>
          </div>

          {/* Legal Document Body */}
          <div className="bg-white p-8 sm:p-12 rounded-2xl border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-10 text-gray-700 leading-relaxed text-[14px]">
            <section className="space-y-3">
              <h2 className="text-[18px] font-semibold text-gray-900">
                1. Acceptance of Terms
              </h2>
              <p>
                By accessing, creating an account on, or utilizing Derivo Docs (the &ldquo;Service&rdquo;), hosted at <strong>derivo.in</strong>, you agree to be legally bound by these Terms of Service. If you are entering into this agreement on behalf of a company or other legal entity, you represent that you have the authority to bind such entity to these terms.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-[18px] font-semibold text-gray-900">
                2. Description of the Service
              </h2>
              <p>
                Derivo Docs is an automated developer utility that inspects publicly accessible GitHub repositories, detects software architecture and configuration, surfaces code ambiguities, and synthesizes structured developer documentation.
              </p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>
                  The Service strictly analyzes <strong>public GitHub repositories</strong> accessible via GitHub&apos;s public REST APIs.
                </li>
                <li>
                  Private repositories and non-GitHub repositories are not supported in this version.
                </li>
                <li>
                  We do not execute repository code or run untrusted binaries in sandbox environments.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-[18px] font-semibold text-gray-900">
                3. User Accounts and Verification
              </h2>
              <p>
                To generate documentation for non-sample repositories, you must register an account and complete email verification via the verification link transmitted to your email address from <code>no-reply@derivo.in</code>. You are responsible for safeguarding your account credentials.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-[18px] font-semibold text-gray-900">
                4. Intellectual Property & Ownership
              </h2>
              <p>
                <strong>You retain 100% ownership</strong> of all documentation generated, modified, and exported through your account. Derivo Docs claims no intellectual property rights over the source repositories you submit or the final Markdown documents you download or copy.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-[18px] font-semibold text-gray-900">
                5. Acceptable Use Policy
              </h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-1.5 text-gray-600">
                <li>Submit repositories containing malicious software, exploitative scripts, or illegal content.</li>
                <li>Attempt to bypass rate limits, quotas, or tenant isolation safeguards.</li>
                <li>Use automated scripts or headless bots to generate documentation at scales exceeding your active plan limits without prior written authorization.</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-[18px] font-semibold text-gray-900">
                6. AI Output and Clarification Disclaimers
              </h2>
              <p>
                Derivo Docs employs multi-model LLMs (including Gemini, Claude, and OpenRouter pipelines) to draft documentation. While our system is explicitly architected to ask clarification questions rather than speculate on ambiguous code, documentation is provided on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="text-[18px] font-semibold text-gray-900">
                7. Contact Information
              </h2>
              <p>
                For questions regarding these Terms of Service, please contact our team at{" "}
                <a
                  href="mailto:support@derivo.in"
                  className="text-[#F26522] hover:underline font-medium"
                >
                  support@derivo.in
                </a>{" "}
                or visit our{" "}
                <Link
                  href="/contact"
                  className="text-[#F26522] hover:underline font-medium"
                >
                  Contact page
                </Link>
                .
              </p>
            </section>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
