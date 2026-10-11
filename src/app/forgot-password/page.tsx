"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ErrorAlert } from "@/components/ui/primitives";
import { StructuredAppError } from "@/lib/types";
import { ArrowRight, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<StructuredAppError | null>(null);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [sentMessage, setSentMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSentMessage(null);
    setResetUrl(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setSentMessage(data.message);
      if (data.resetUrl) {
        setResetUrl(data.resetUrl);
      }
    } catch {
      setError({
        code: "NETWORK_TIMEOUT",
        whatHappened: "Network error while requesting password reset.",
        canRetry: true,
        nextAction: "Submit your email address again.",
        httpStatus: 500,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#EFEFEF] text-gray-900">
      <Header user={null} />
      <main className="flex-1 flex items-center justify-center px-4 py-14 sm:py-20">
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.05)] space-y-7">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-[11px] font-semibold flex items-center justify-center">
                2
              </span>
              <span className="text-[12px] font-medium border border-gray-200 rounded-full px-3.5 py-1 text-gray-900">
                Password Recovery
              </span>
            </div>

            <h1 className="text-[28px] sm:text-[32px] font-medium leading-[1.1] tracking-[-0.03em] text-gray-900">
              Reset your password
            </h1>
            <p className="text-[13px] text-gray-600 mt-2 leading-relaxed">
              Enter your email address and we&apos;ll send a password recovery link to your inbox.
            </p>
          </div>

          {error && <ErrorAlert error={error} />}

          {sentMessage && (
            <div
              role="status"
              className="p-4 bg-[#F5F5F5] border border-gray-200 text-gray-900 rounded-xl text-xs space-y-2"
            >
              <p className="font-medium">{sentMessage}</p>
              {resetUrl && (
                <div className="pt-2 border-t border-gray-200">
                  <Link
                    href={resetUrl}
                    className="inline-block font-mono-code underline font-semibold text-[#F26522]"
                  >
                    Open password reset link →
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="forgot-email"
                className="block text-[13px] font-medium text-gray-900 mb-1.5"
              >
                Email address
              </label>
              <div className="relative">
                <input
                  id="forgot-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="developer@example.com"
                  className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 bg-[#F5F5F5]/60 focus:bg-white rounded-xl text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
                />
                <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={submitting}
                className="group w-full bg-[#F26522] hover:bg-[#e05a1a] text-white text-[14px] font-medium rounded-full pl-6 pr-2 py-2 flex items-center justify-between transition-colors duration-300 disabled:opacity-50 cursor-pointer"
              >
                <span className="overflow-hidden h-[20px] flex flex-col">
                  <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                    <span className="h-[20px] leading-[20px] flex items-center">
                      {submitting ? "Sending reset link..." : "Send reset link"}
                    </span>
                    <span className="h-[20px] leading-[20px] flex items-center">
                      {submitting ? "Sending reset link..." : "Send reset link"}
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
            </div>
          </form>

          <div className="pt-5 border-t border-gray-100 text-[13px] text-gray-600 flex items-center justify-between">
            <Link
              href="/login"
              className="font-medium text-gray-900 hover:text-[#F26522] transition-colors"
            >
              &larr; Back to login
            </Link>
            <Link
              href="/signup"
              className="text-gray-500 hover:text-gray-900 transition-colors"
            >
              Create new account
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
