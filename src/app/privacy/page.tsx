import React from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getAuthenticatedSession } from "@/lib/session";
import { Lock, EyeOff } from "lucide-react";

export const metadata = {
  title: "Privacy Policy | Derivo Docs",
  description: "Privacy Policy for Derivo Docs (derivo.in): how we handle public repository data, transient memory parsing, and authentication.",
};

export default async function PrivacyPage() {
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
                2
              </span>
              <span className="text-[12px] sm:text-[13px] font-medium border border-gray-300 bg-white rounded-full px-3.5 py-1 text-gray-900">
                Privacy & Trust
              </span>
            </div>

            <h1 className="text-[clamp(1.75rem,6vw,3.5rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900">
              Privacy Policy
            </h1>
            <p className="text-[13px] text-gray-600">
              Effective Date: October 2026 &bull; Domain:{" "}
              <span className="font-mono-code font-semibold text-gray-900">derivo.in</span>
            </p>
          </div>

          {/* Privacy Content Body */}
          <div className="bg-white p-8 sm:p-12 rounded-2xl border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-10 text-gray-700 leading-relaxed text-[14px]">
            <section className="space-y-3">
              <h2 className="text-[18px] font-semibold text-gray-900">
                1. Overview & Commitment
              </h2>
              <p>
                At Derivo Docs (<strong>derivo.in</strong>), developer privacy and code confidentiality are foundational. This policy describes our exact practices regarding data collection, transient repository ingestion, and storage.
              </p>
            </section>

            <section className="space-y-4">
              <h2 className="text-[18px] font-semibold text-gray-900">
                2. How Repository Code is Handled
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                <div className="p-5 rounded-2xl bg-[#F5F5F5] space-y-2">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold text-xs">
                    <EyeOff className="w-4 h-4 text-[#F26522]" />
                    <span>No Permanent Code Storage</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    Repository trees and source files fetched via GitHub REST APIs are processed strictly in transient server memory during documentation generation and are never saved to persistent disk.
                  </p>
                </div>

                <div className="p-5 rounded-2xl bg-[#F5F5F5] space-y-2">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold text-xs">
                    <Lock className="w-4 h-4 text-[#F26522]" />
                    <span>No AI Model Training</span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    We do not use your submitted code, documentation drafts, or clarification answers to train or fine-tune foundation models.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-[18px] font-semibold text-gray-900">
                3. Information We Collect
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  <strong>Account Data:</strong> When you register, we collect your full name, email address, and hashed password credentials.
                </li>
                <li>
                  <strong>Project Workspaces:</strong> We store the public repository URL, generated documentation Markdown, clarification Q&amp;A history, and project creation timestamps tied to your user ID.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-[18px] font-semibold text-gray-900">
                4. Third-Party Infrastructure
              </h2>
              <ul className="list-disc pl-5 space-y-2 text-gray-600">
                <li>
                  <strong>Supabase:</strong> Managed PostgreSQL with Row-Level Security (RLS) ensuring complete tenant isolation.
                </li>
                <li>
                  <strong>Resend:</strong> Transactional email dispatch from <code>no-reply@derivo.in</code> for email verification and password recovery.
                </li>
                <li>
                  <strong>GitHub REST API:</strong> Used exclusively to retrieve public file metadata and directory trees for repositories specified by you.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="text-[18px] font-semibold text-gray-900">
                5. User Rights & Account Deletion
              </h2>
              <p>
                You have the right to inspect, export, or permanently delete your account and all associated project workspaces at any time. For privacy inquiries or deletion requests, contact{" "}
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
