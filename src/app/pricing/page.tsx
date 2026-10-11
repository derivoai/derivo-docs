"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Check, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      number: "1",
      name: "Community Starter",
      badge: "Free Forever",
      description: "Ideal for open-source contributors and individual developers exploring public codebases.",
      monthlyPrice: 0,
      annualPrice: 0,
      ctaLabel: "Start documenting free",
      ctaHref: "/signup",
      featured: false,
      features: [
        "Up to 10 public GitHub repository projects",
        "All 18 structured documentation sections",
        "Interactive clarification Q&A workflow",
        "Source file path & commit SHA citations",
        "Clean Markdown (.md) copy & export",
      ],
    },
    {
      number: "2",
      name: "Studio Pro",
      badge: "Most Popular",
      description: "For senior engineers and technical leads documenting large production repositories.",
      monthlyPrice: 19,
      annualPrice: 15,
      ctaLabel: "Upgrade to Studio Pro",
      ctaHref: "/signup?plan=pro",
      featured: true,
      features: [
        "Up to 100 public repository workspaces",
        "Priority multi-provider AI synthesis (Gemini + Claude)",
        "Deep recursive tree & monorepo package analysis",
        "Surgical single-section regeneration",
        "Unlimited repository architecture Q&A",
        "Priority email support (support@derivo.in)",
      ],
    },
    {
      number: "3",
      name: "Engineering Team",
      badge: "Scale & Custom",
      description: "Shared onboarding workspaces and high-throughput API limits for engineering organizations.",
      monthlyPrice: 49,
      annualPrice: 39,
      ctaLabel: "Contact studio sales",
      ctaHref: "/contact",
      featured: false,
      features: [
        "Unlimited public repository workspaces",
        "Custom GitHub API rate-limit token pooling",
        "Team-wide shared clarification context",
        "Custom Markdown templates & handbook export",
        "Dedicated onboarding & 24h SLA support",
      ],
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#EFEFEF] text-gray-900">
      <Header user={null} />

      <main className="flex-1">
        {/* Hero Header */}
        <section className="pt-12 sm:pt-16 lg:pt-24 pb-12 sm:pb-16">
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
            <div className="flex items-center gap-3 mb-6 sm:mb-8">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 text-white text-[11px] sm:text-[12px] font-semibold flex items-center justify-center">
                1
              </span>
              <span className="text-[12px] sm:text-[13px] font-medium border border-gray-300 bg-white rounded-full px-3.5 sm:px-4 py-1 sm:py-1.5 text-gray-900">
                Transparent Studio Pricing
              </span>
            </div>

            <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
              <h1 className="text-[clamp(1.75rem,7vw,4.2rem)] sm:text-[clamp(2.5rem,5vw,4.2rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 max-w-3xl">
                Predictable plans for every engineering stage.
              </h1>

              {/* Billing Toggle Pill */}
              <div className="inline-flex items-center bg-white p-1.5 rounded-full border border-gray-200/80 shadow-xs self-start lg:self-auto">
                <button
                  type="button"
                  onClick={() => setAnnual(false)}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors cursor-pointer ${
                    !annual
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  Monthly
                </button>
                <button
                  type="button"
                  onClick={() => setAnnual(true)}
                  className={`px-4 py-2 rounded-full text-[13px] font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                    annual
                      ? "bg-gray-900 text-white"
                      : "text-gray-600 hover:text-gray-900"
                  }`}
                >
                  <span>Annual</span>
                  <span className="text-[10px] bg-[#F26522] text-white px-2 py-0.5 rounded-full font-semibold">
                    -20%
                  </span>
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Cards Grid */}
        <section className="pb-16 sm:pb-24">
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-7">
              {plans.map((plan) => {
                const price = annual ? plan.annualPrice : plan.monthlyPrice;
                return (
                  <div
                    key={plan.name}
                    className={`rounded-2xl p-8 sm:p-10 flex flex-col justify-between transition-all ${
                      plan.featured
                        ? "bg-gray-900 text-white shadow-[0_12px_40px_rgba(0,0,0,0.12)]"
                        : "bg-white text-gray-900 border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]"
                    }`}
                  >
                    <div className="space-y-6">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-full text-[11px] font-semibold flex items-center justify-center ${
                              plan.featured
                                ? "bg-[#F26522] text-white"
                                : "bg-gray-900 text-white"
                            }`}
                          >
                            {plan.number}
                          </span>
                          <span
                            className={`text-[12px] font-medium rounded-full px-3 py-1 border ${
                              plan.featured
                                ? "border-gray-700 text-gray-200"
                                : "border-gray-200 text-gray-700"
                            }`}
                          >
                            {plan.badge}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h2 className="text-[24px] font-medium tracking-[-0.02em]">
                          {plan.name}
                        </h2>
                        <p
                          className={`text-[14px] mt-2 leading-relaxed ${
                            plan.featured ? "text-gray-300" : "text-gray-600"
                          }`}
                        >
                          {plan.description}
                        </p>
                      </div>

                      <div className="pt-2 pb-4 border-b border-gray-200/20 flex items-baseline gap-1.5">
                        <span className="text-[44px] sm:text-[52px] font-medium tracking-[-0.03em] leading-none">
                          ${price}
                        </span>
                        <span
                          className={`text-[13px] ${
                            plan.featured ? "text-gray-400" : "text-gray-500"
                          }`}
                        >
                          / month {annual && price > 0 ? "(billed annually)" : ""}
                        </span>
                      </div>

                      <ul className="space-y-3.5 pt-2">
                        {plan.features.map((feat) => (
                          <li
                            key={feat}
                            className="flex items-start gap-3 text-[14px]"
                          >
                            <span
                              className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                                plan.featured
                                  ? "bg-[#F26522] text-white"
                                  : "bg-[#F5F5F5] text-gray-900"
                              }`}
                            >
                              <Check size={12} />
                            </span>
                            <span
                              className={
                                plan.featured ? "text-gray-200" : "text-gray-700"
                              }
                            >
                              {feat}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="pt-10">
                      <Link
                        href={plan.ctaHref}
                        className={`group w-full text-[14px] font-medium rounded-full pl-6 pr-2 py-2.5 flex items-center justify-between transition-colors duration-300 ${
                          plan.featured
                            ? "bg-[#F26522] hover:bg-[#e05a1a] text-white"
                            : "bg-gray-900 hover:bg-gray-800 text-white"
                        }`}
                      >
                        <span className="overflow-hidden h-[20px] flex flex-col">
                          <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                            <span className="h-[20px] leading-[20px] flex items-center">
                              {plan.ctaLabel}
                            </span>
                            <span className="h-[20px] leading-[20px] flex items-center">
                              {plan.ctaLabel}
                            </span>
                          </span>
                        </span>

                        <span
                          className={`w-8 h-8 rounded-full bg-white flex items-center justify-center shrink-0 ${
                            plan.featured ? "text-[#F26522]" : "text-gray-900"
                          }`}
                        >
                          <ArrowRight
                            size={15}
                            className="transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45"
                          />
                        </span>
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section className="bg-white py-16 sm:py-24">
          <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12">
            <div className="flex items-center gap-3 mb-6">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 text-white text-[11px] sm:text-[12px] font-semibold flex items-center justify-center">
                2
              </span>
              <span className="text-[12px] sm:text-[13px] font-medium border border-gray-200 rounded-full px-3.5 py-1 text-gray-900">
                Frequently Asked Questions
              </span>
            </div>

            <h2 className="text-[clamp(1.5rem,4vw,3.2rem)] font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 mb-12">
              Common questions about plans & limits.
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {[
                {
                  q: "Can I try Derivo Docs without a credit card?",
                  a: "Yes. The Community Starter tier is free forever and includes up to 10 public GitHub repository projects, all 18 documentation sections, and full Markdown export.",
                },
                {
                  q: "What happens when evidence is missing in a repository?",
                  a: "Instead of hallucinating details, Derivo flags the section with a low-confidence indicator and asks you a targeted clarification question citing the exact source files.",
                },
                {
                  q: "Does regenerating a section count against my project limit?",
                  a: "No. Answering clarification questions and surgically regenerating individual sections within an existing project is completely free and unlimited.",
                },
                {
                  q: "Do you store or train AI models on our repository code?",
                  a: "Never. Public repository files are read transiently via the GitHub REST API during synthesis and are never used for model training.",
                },
              ].map((item) => (
                <div
                  key={item.q}
                  className="p-7 rounded-2xl bg-[#F5F5F5] space-y-2.5"
                >
                  <h3 className="text-[16px] font-semibold text-gray-900">
                    {item.q}
                  </h3>
                  <p className="text-[14px] text-gray-600 leading-relaxed">
                    {item.a}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
