"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Mail, MessageSquare, Clock, CheckCircle2, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function ContactPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [category, setCategory] = useState("support");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 400);
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#EFEFEF] text-gray-900">
      <Header user={null} />

      <main className="flex-1 py-12 sm:py-20">
        <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 space-y-12">
          {/* Header Intro */}
          <div>
            <div className="flex items-center gap-3 mb-6">
              <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 text-white text-[11px] sm:text-[12px] font-semibold flex items-center justify-center">
                1
              </span>
              <span className="text-[12px] sm:text-[13px] font-medium border border-gray-300 bg-white rounded-full px-3.5 sm:px-4 py-1 sm:py-1.5 text-gray-900">
                Connect with Derivo
              </span>
            </div>

            <h1 className="text-[clamp(1.75rem,7vw,4.2rem)] sm:text-[clamp(2.5rem,5vw,4.2rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 max-w-3xl">
              Let&apos;s talk about your codebase documentation.
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left 5 cols: Official Contact Cards & SLA */}
            <div className="lg:col-span-5 space-y-6">
              <div className="bg-white p-8 rounded-2xl border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] space-y-6">
                <div className="flex items-center gap-2.5">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-[11px] font-semibold flex items-center justify-center">
                    2
                  </span>
                  <span className="text-[12px] font-medium border border-gray-200 rounded-full px-3 py-1 text-gray-900">
                    Direct Studio Channels
                  </span>
                </div>

                <div className="space-y-5 text-sm pt-1">
                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-[#F26522]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        Customer & Technical Support
                      </p>
                      <a
                        href="mailto:support@derivo.in"
                        className="text-[#F26522] hover:underline font-mono-code text-xs mt-0.5 block"
                      >
                        support@derivo.in
                      </a>
                      <p className="text-xs text-gray-500 mt-1">
                        Assistance with repository parsing, account access, and Markdown exports.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4 text-[#F26522]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">
                        General & Partnerships
                      </p>
                      <a
                        href="mailto:contact@derivo.in"
                        className="text-[#F26522] hover:underline font-mono-code text-xs mt-0.5 block"
                      >
                        contact@derivo.in
                      </a>
                      <p className="text-xs text-gray-500 mt-1">
                        Custom integrations, volume tiers, or engineering team licenses.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3.5">
                    <div className="w-10 h-10 rounded-full bg-gray-900 text-white flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4 text-[#F26522]" />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">Response SLA</p>
                      <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">
                        Guaranteed response within <strong>24 business hours</strong> (Monday–Friday, 9:00 AM – 6:00 PM IST).
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-gray-100 text-xs text-gray-500 flex flex-wrap items-center justify-between gap-2">
                  <span>
                    Domain:{" "}
                    <strong className="font-mono-code text-gray-900">derivo.in</strong>
                  </span>
                  <span>
                    Mailer:{" "}
                    <strong className="font-mono-code text-gray-900">no-reply@derivo.in</strong>
                  </span>
                </div>
              </div>

              <div className="bg-gray-900 text-white p-7 rounded-2xl space-y-3">
                <p className="text-[14px] font-semibold">
                  Want to test Derivo right now?
                </p>
                <p className="text-[13px] text-gray-300 leading-relaxed">
                  Explore our pre-analyzed 18-section sample workspace with live clarification Q&A—no login required.
                </p>
                <div className="pt-1 flex gap-4 text-[13px] font-medium">
                  <Link href="/demo" className="text-[#F26522] hover:underline">
                    Open sample workspace &rarr;
                  </Link>
                  <Link href="/pricing" className="text-white hover:underline">
                    View pricing &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* Right 7 cols: Interactive Message Form */}
            <div className="lg:col-span-7">
              <div className="bg-white p-8 sm:p-10 rounded-2xl border border-gray-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
                {submitted ? (
                  <div className="py-12 text-center space-y-5">
                    <div className="w-16 h-16 rounded-full bg-gray-900 text-white flex items-center justify-center mx-auto">
                      <CheckCircle2 className="w-8 h-8 text-[#F26522]" />
                    </div>
                    <h3 className="text-[28px] font-medium tracking-[-0.03em] text-gray-900">
                      Message received
                    </h3>
                    <p className="text-[14px] text-gray-600 max-w-md mx-auto leading-relaxed">
                      Thank you, <strong>{name}</strong>. Our engineering team has received your inquiry from{" "}
                      <strong className="text-gray-900">{email}</strong> and will respond shortly.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSubmitted(false);
                        setName("");
                        setEmail("");
                        setSubject("");
                        setMessage("");
                      }}
                      className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gray-900 text-white text-[13px] font-medium cursor-pointer"
                    >
                      Send another message
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <div className="border-b border-gray-100 pb-4">
                      <h2 className="text-[22px] font-medium tracking-[-0.02em] text-gray-900">
                        Send a message to the studio
                      </h2>
                      <p className="text-[13px] text-gray-500 mt-1">
                        Fill out the details below and our engineering team will follow up directly.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="contact-name"
                          className="block text-[13px] font-medium text-gray-900 mb-1.5"
                        >
                          Your Name
                        </label>
                        <input
                          id="contact-name"
                          type="text"
                          required
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="Linus Torvalds"
                          className="w-full px-4 py-3 text-sm bg-[#F5F5F5]/60 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 text-gray-900 transition-colors"
                        />
                      </div>

                      <div>
                        <label
                          htmlFor="contact-email"
                          className="block text-[13px] font-medium text-gray-900 mb-1.5"
                        >
                          Email Address
                        </label>
                        <input
                          id="contact-email"
                          type="email"
                          required
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="linus@example.com"
                          className="w-full px-4 py-3 text-sm bg-[#F5F5F5]/60 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 text-gray-900 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label
                          htmlFor="contact-category"
                          className="block text-[13px] font-medium text-gray-900 mb-1.5"
                        >
                          Inquiry Type
                        </label>
                        <select
                          id="contact-category"
                          value={category}
                          onChange={(e) => setCategory(e.target.value)}
                          className="w-full px-4 py-3 text-sm bg-[#F5F5F5]/60 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 text-gray-900 cursor-pointer transition-colors"
                        >
                          <option value="support">Technical Support</option>
                          <option value="billing">Pricing & Billing</option>
                          <option value="api">Enterprise & Custom API</option>
                          <option value="feature">Feature Request & Feedback</option>
                        </select>
                      </div>

                      <div>
                        <label
                          htmlFor="contact-subject"
                          className="block text-[13px] font-medium text-gray-900 mb-1.5"
                        >
                          Subject
                        </label>
                        <input
                          id="contact-subject"
                          type="text"
                          required
                          value={subject}
                          onChange={(e) => setSubject(e.target.value)}
                          placeholder="Question regarding repository limits"
                          className="w-full px-4 py-3 text-sm bg-[#F5F5F5]/60 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 text-gray-900 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label
                        htmlFor="contact-message"
                        className="block text-[13px] font-medium text-gray-900 mb-1.5"
                      >
                        Message
                      </label>
                      <textarea
                        id="contact-message"
                        rows={5}
                        required
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        placeholder="Describe how our team can help..."
                        className="w-full px-4 py-3 text-sm bg-[#F5F5F5]/60 focus:bg-white border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 text-gray-900 resize-y transition-colors"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submitting || !name || !email || !message}
                      className="group w-full bg-[#F26522] hover:bg-[#e05a1a] text-white text-[14px] font-medium rounded-full pl-6 pr-2 py-2 flex items-center justify-between transition-colors duration-300 disabled:opacity-50 cursor-pointer"
                    >
                      <span className="overflow-hidden h-[20px] flex flex-col">
                        <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                          <span className="h-[20px] leading-[20px] flex items-center">
                            {submitting ? "Sending message..." : "Submit inquiry"}
                          </span>
                          <span className="h-[20px] leading-[20px] flex items-center">
                            {submitting ? "Sending message..." : "Submit inquiry"}
                          </span>
                        </span>
                      </span>

                      <span className="w-8 h-8 rounded-full bg-white text-[#F26522] flex items-center justify-center shrink-0">
                        <ArrowRight
                          size={15}
                          className="transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45"
                        />
                      </span>
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
