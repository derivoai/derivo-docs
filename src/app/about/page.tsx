import React from "react";
import Link from "next/link";
import { ArrowRight, ShieldCheck, Zap, HelpCircle } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { getAuthenticatedSession } from "@/lib/session";

export const metadata = {
  title: "About Studio | Derivo Docs",
  description: "Learn why we built Derivo Docs: turning public GitHub repositories into reliable, evidence-backed developer documentation.",
};

export default async function AboutPage() {
  const session = await getAuthenticatedSession();

  return (
    <div className="min-h-screen flex flex-col bg-[#EFEFEF] text-gray-900">
      <Header user={session.user} />

      <main className="flex-1">
        {/* Section 1: Studio Mission Hero */}
        <section className="pt-12 sm:pt-16 lg:pt-24 pb-16 sm:pb-24">
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 text-white text-[11px] sm:text-[12px] font-semibold flex items-center justify-center">
                1
              </span>
              <span className="text-[12px] sm:text-[13px] font-medium border border-gray-300 bg-white rounded-full px-3.5 sm:px-4 py-1 sm:py-1.5 text-gray-900">
                About Derivo Studio
              </span>
            </div>

            <h1 className="text-[clamp(1.75rem,7vw,4.2rem)] sm:text-[clamp(2.5rem,5vw,4.2rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 max-w-4xl">
              Understand any public codebase in minutes—without hallucinated assumptions.
            </h1>

            <p className="text-[16px] sm:text-[18px] text-gray-600 max-w-2xl mt-6 leading-[1.6]">
              Every day, engineers spend hours deciphering outdated READMEs, undocumented environment flags, and implicit route guards. Derivo Docs replaces guesswork with source-linked clarity.
            </p>
          </div>
        </section>

        {/* Section 2: The Honest AI Contract */}
        <section className="bg-white py-16 sm:py-24">
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 space-y-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 text-white text-[11px] sm:text-[12px] font-semibold flex items-center justify-center">
                  2
                </span>
                <span className="text-[12px] sm:text-[13px] font-medium border border-gray-200 rounded-full px-3.5 sm:px-4 py-1 sm:py-1.5 text-gray-900">
                  Our Engineering Contract
                </span>
              </div>

              <h2 className="text-[clamp(1.5rem,4vw,3.2rem)] font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 max-w-3xl">
                When evidence is incomplete, we ask instead of inventing.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7">
              <div className="bg-[#F5F5F5] p-8 rounded-2xl space-y-4">
                <div className="w-11 h-11 rounded-full bg-gray-900 text-white flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#F26522]" />
                </div>
                <h3 className="text-[18px] font-semibold text-gray-900">
                  Source-Linked Citations
                </h3>
                <p className="text-[14px] text-gray-600 leading-relaxed">
                  Every generated section cites specific repository file paths, package manifests, scripts, and route handlers verified in the target commit SHA.
                </p>
              </div>

              <div className="bg-[#F5F5F5] p-8 rounded-2xl space-y-4">
                <div className="w-11 h-11 rounded-full bg-gray-900 text-white flex items-center justify-center">
                  <HelpCircle className="w-5 h-5 text-[#F26522]" />
                </div>
                <h3 className="text-[18px] font-semibold text-gray-900">
                  Targeted Clarifications
                </h3>
                <p className="text-[14px] text-gray-600 leading-relaxed">
                  When an authentication middleware or database adapter is ambiguous, Derivo flags the exact file and asks you a focused multiple-choice or custom question.
                </p>
              </div>

              <div className="bg-[#F5F5F5] p-8 rounded-2xl space-y-4">
                <div className="w-11 h-11 rounded-full bg-gray-900 text-white flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#F26522]" />
                </div>
                <h3 className="text-[18px] font-semibold text-gray-900">
                  Surgical Section Updates
                </h3>
                <p className="text-[14px] text-gray-600 leading-relaxed">
                  Answering a clarification question saves your context and regenerates only that single section—preserving your other 17 approved sections intact.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Section 3: Architecture & CTA */}
        <section className="bg-[#F5F5F5] py-16 sm:py-24">
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 space-y-12">
            <div>
              <div className="flex items-center gap-3 mb-6">
                <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 text-white text-[11px] sm:text-[12px] font-semibold flex items-center justify-center">
                  3
                </span>
                <span className="text-[12px] sm:text-[13px] font-medium border border-gray-300 bg-white rounded-full px-3.5 sm:px-4 py-1 sm:py-1.5 text-gray-900">
                  Security & Pipeline
                </span>
              </div>

              <h2 className="text-[clamp(1.5rem,4vw,3.2rem)] font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 max-w-3xl">
                Built for strict tenant isolation and zero code execution.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[
                {
                  num: "01",
                  title: "Public GitHub Tree Ingestion",
                  desc: "Fetches recursive directory trees and high-signal manifests via the GitHub REST API while filtering binary assets and vendor folders.",
                },
                {
                  num: "02",
                  title: "Multi-Engine AI Resilience",
                  desc: "Powered by primary high-throughput LLM pipelines with automatic fallbacks (Gemini, OpenRouter, Groq, Claude) for uninterrupted synthesis.",
                },
                {
                  num: "03",
                  title: "Zero Permanent Code Storage",
                  desc: "Repository contents are streamed transiently in memory during analysis. We never execute untrusted code or train models on your repositories.",
                },
                {
                  num: "04",
                  title: "Row-Level Security (RLS)",
                  desc: "Operated on derivo.in with Supabase Auth and strict per-user workspace isolation.",
                },
              ].map((step) => (
                <div
                  key={step.num}
                  className="bg-white p-8 rounded-2xl border border-gray-200/80 space-y-3"
                >
                  <span className="inline-block text-[12px] font-mono-code font-semibold text-[#F26522]">
                    {step.num}
                  </span>
                  <h3 className="text-[18px] font-semibold text-gray-900">
                    {step.title}
                  </h3>
                  <p className="text-[14px] text-gray-600 leading-relaxed">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>

            <div className="pt-4 flex flex-wrap items-center gap-4">
              <Link
                href="/contact"
                className="group bg-[#F26522] hover:bg-[#e05a1a] text-white text-[14px] font-medium rounded-full pl-6 pr-2 py-2 inline-flex items-center gap-3 transition-colors"
              >
                <span className="overflow-hidden h-[20px] flex flex-col">
                  <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                    <span className="h-[20px] leading-[20px] flex items-center">
                      Contact studio team
                    </span>
                    <span className="h-[20px] leading-[20px] flex items-center">
                      Contact studio team
                    </span>
                  </span>
                </span>
                <span className="w-8 h-8 rounded-full bg-white text-[#F26522] flex items-center justify-center">
                  <ArrowRight
                    size={15}
                    className="transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45"
                  />
                </span>
              </Link>

              <Link
                href="/demo"
                className="px-6 py-3 rounded-full bg-white border border-gray-300 text-[14px] font-medium text-gray-900 hover:bg-gray-100 transition-colors"
              >
                Inspect sample workspace
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
