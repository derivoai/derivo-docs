"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ErrorAlert } from "@/components/ui/primitives";
import { StructuredAppError } from "@/lib/types";
import { ArrowRight, Lock, Mail } from "lucide-react";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirectTo") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<StructuredAppError | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, redirectTo }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }

      if (!data.user.emailVerified) {
        const q = data.verificationToken
          ? `?pendingToken=${encodeURIComponent(data.verificationToken)}`
          : "";
        router.push(`/verify-email${q}`);
      } else {
        router.push(data.redirectTo || "/dashboard");
      }
      router.refresh();
    } catch {
      setError({
        code: "NETWORK_TIMEOUT",
        whatHappened: "Network error while signing in.",
        canRetry: true,
        nextAction: "Check your connection and try logging in again.",
        httpStatus: 500,
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="relative z-20 flex-1 flex items-center justify-center px-4 py-14 sm:py-20">
      <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.05)] space-y-7">
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-[11px] font-semibold flex items-center justify-center">
              1
            </span>
            <span className="text-[12px] font-medium border border-gray-200 rounded-full px-3.5 py-1 text-gray-900">
              Account Access
            </span>
          </div>

          <h1 className="text-[28px] sm:text-[32px] font-medium leading-[1.1] tracking-[-0.03em] text-gray-900">
            Log in to Derivo Docs
          </h1>
          {redirectTo && redirectTo !== "/dashboard" && (
            <p className="text-xs font-mono-code text-gray-500 mt-2">
              Returning to: {redirectTo}
            </p>
          )}
        </div>

        {error && <ErrorAlert error={error} />}

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div>
            <label
              htmlFor="login-email"
              className="block text-[13px] font-medium text-gray-900 mb-1.5"
            >
              Email address
            </label>
            <div className="relative">
              <input
                id="login-email"
                name="email"
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

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label
                htmlFor="login-password"
                className="block text-[13px] font-medium text-gray-900"
              >
                Password
              </label>
              <Link
                href="/forgot-password"
                className="text-[12px] text-[#F26522] hover:text-[#e05a1a] font-medium"
              >
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <input
                id="login-password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-3 text-sm border border-gray-200 bg-[#F5F5F5]/60 focus:bg-white rounded-xl text-gray-900 focus:outline-none focus:border-gray-900 transition-colors"
              />
              <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5 pointer-events-none" />
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
                    {submitting ? "Signing in..." : "Sign in to workspace"}
                  </span>
                  <span className="h-[20px] leading-[20px] flex items-center">
                    {submitting ? "Signing in..." : "Sign in to workspace"}
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
          <span>New to Derivo Docs?</span>
          <Link
            href={
              redirectTo && redirectTo !== "/dashboard"
                ? `/signup?redirectTo=${encodeURIComponent(redirectTo)}`
                : "/signup"
            }
            className="font-medium text-gray-900 hover:text-[#F26522] transition-colors"
          >
            Create an account &rarr;
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#EFEFEF] text-gray-900">
      <Header user={null} />
      <Suspense fallback={<div className="p-8 text-sm text-gray-500 text-center">Loading...</div>}>
        <LoginFormContent />
      </Suspense>
      <Footer />
    </div>
  );
}
