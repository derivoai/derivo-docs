"use client";

import React, { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Mail, ExternalLink, RefreshCw, ArrowRight } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ErrorAlert } from "@/components/ui/primitives";
import { StructuredAppError, UserProfile } from "@/lib/types";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token") ?? "";
  const repoParam = searchParams.get("repo") ?? "";
  const redirectTo = searchParams.get("redirectTo") ?? "";

  const [user, setUser] = useState<UserProfile | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [verifiedSuccess, setVerifiedSuccess] = useState(false);
  const [resentMessage, setResentMessage] = useState<string | null>(null);
  const [error, setError] = useState<StructuredAppError | null>(null);

  useEffect(() => {
    async function loadSession() {
      const res = await fetch("/api/auth/session");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        if (data.user?.emailVerified) {
          setVerifiedSuccess(true);
        }
      }
    }
    loadSession();
  }, []);

  useEffect(() => {
    if (urlToken) {
      handleVerifyToken(urlToken);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlToken]);

  async function handleVerifyToken(tokenToVerify: string) {
    setError(null);
    setVerifying(true);
    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenToVerify }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setUser(data.user);
      setVerifiedSuccess(true);
    } catch {
      setError({
        code: "NETWORK_TIMEOUT",
        whatHappened: "Network error while verifying your email.",
        canRetry: true,
        nextAction: "Click the verification link again.",
        httpStatus: 500,
      });
    } finally {
      setVerifying(false);
    }
  }

  async function handleResendEmail() {
    setError(null);
    setResentMessage(null);
    setResending(true);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error);
        return;
      }
      setResentMessage(`Sent a fresh verification email to ${data.email}.`);
    } catch {
      setError({
        code: "NETWORK_TIMEOUT",
        whatHappened: "Failed to resend verification email.",
        canRetry: true,
        nextAction: "Try clicking Resend email again.",
        httpStatus: 500,
      });
    } finally {
      setResending(false);
    }
  }

  const nextDashboardHref = repoParam
    ? `/dashboard?repo=${encodeURIComponent(repoParam)}`
    : redirectTo || "/dashboard";

  const emailDomain = user?.email?.split("@")[1]?.toLowerCase() || "";
  let webmailLink = "https://mail.google.com";
  let webmailName = "Open Gmail";
  if (
    emailDomain.includes("outlook") ||
    emailDomain.includes("hotmail") ||
    emailDomain.includes("live")
  ) {
    webmailLink = "https://outlook.live.com/mail/";
    webmailName = "Open Outlook";
  } else if (emailDomain.includes("yahoo")) {
    webmailLink = "https://mail.yahoo.com";
    webmailName = "Open Yahoo Mail";
  } else if (emailDomain.includes("icloud")) {
    webmailLink = "https://www.icloud.com/mail";
    webmailName = "Open iCloud Mail";
  }

  return (
    <>
      <Header user={user} />
      <main className="flex-1 flex items-center justify-center px-4 py-14 sm:py-20">
        <div className="w-full max-w-md bg-white border border-gray-200/80 rounded-2xl p-8 sm:p-10 shadow-[0_4px_24px_rgba(0,0,0,0.05)]">
          {verifying ? (
            <div className="py-10 text-center space-y-3">
              <RefreshCw
                className="w-8 h-8 text-[#F26522] animate-spin mx-auto"
                aria-hidden="true"
              />
              <p className="text-base font-medium text-gray-900">
                Verifying your email...
              </p>
            </div>
          ) : verifiedSuccess ? (
            <div className="space-y-6 text-center">
              <div className="w-14 h-14 bg-gray-900 text-white rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7 text-[#F26522]" aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-[28px] font-medium tracking-[-0.03em] text-gray-900">
                  Email verified
                </h1>
                <p className="text-[14px] text-gray-600 mt-2">
                  Your account is active. You can now analyze public GitHub repositories.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  router.push(nextDashboardHref);
                  router.refresh();
                }}
                className="group w-full bg-[#F26522] hover:bg-[#e05a1a] text-white text-[14px] font-medium rounded-full pl-6 pr-2 py-2 flex items-center justify-between transition-colors cursor-pointer"
              >
                <span>Continue to Dashboard</span>
                <span className="w-8 h-8 rounded-full bg-white text-[#F26522] flex items-center justify-center">
                  <ArrowRight
                    size={15}
                    className="transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45"
                  />
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2.5 mb-4">
                  <span className="w-6 h-6 rounded-full bg-gray-900 text-white text-[11px] font-semibold flex items-center justify-center">
                    2
                  </span>
                  <span className="text-[12px] font-medium border border-gray-200 rounded-full px-3.5 py-1 text-gray-900">
                    Email Verification
                  </span>
                </div>

                <h1 className="text-[28px] sm:text-[32px] font-medium leading-[1.1] tracking-[-0.03em] text-gray-900">
                  Check your inbox
                </h1>
                <p className="text-[14px] text-gray-600 leading-relaxed mt-2.5">
                  Open{" "}
                  <strong className="text-gray-900 font-semibold">
                    {user?.email || "your email"}
                  </strong>{" "}
                  and click the verification link to activate your account.
                </p>
              </div>

              {error && <ErrorAlert error={error} />}

              {resentMessage && (
                <div
                  role="status"
                  className="p-3.5 text-xs bg-[#F5F5F5] border border-gray-200 text-gray-900 rounded-xl font-medium"
                >
                  {resentMessage}
                </div>
              )}

              <div className="pt-1 space-y-3">
                <a
                  href={webmailLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group w-full bg-[#F26522] hover:bg-[#e05a1a] text-white text-[14px] font-medium rounded-full pl-6 pr-2 py-2 flex items-center justify-between transition-colors cursor-pointer"
                >
                  <span className="overflow-hidden h-[20px] flex flex-col">
                    <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                      <span className="h-[20px] leading-[20px] flex items-center">
                        {webmailName}
                      </span>
                      <span className="h-[20px] leading-[20px] flex items-center">
                        {webmailName}
                      </span>
                    </span>
                  </span>
                  <span className="w-8 h-8 rounded-full bg-white text-[#F26522] flex items-center justify-center">
                    <ExternalLink
                      size={14}
                      className="transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:scale-110"
                      aria-hidden="true"
                    />
                  </span>
                </a>

                <button
                  type="button"
                  onClick={handleResendEmail}
                  disabled={resending}
                  className="w-full py-2.5 px-4 text-[13px] font-medium bg-[#F5F5F5] hover:bg-gray-200/70 text-gray-900 rounded-full transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${resending ? "animate-spin" : ""}`}
                    aria-hidden="true"
                  />
                  <span>{resending ? "Sending..." : "Resend verification email"}</span>
                </button>
              </div>

              <div className="pt-4 border-t border-gray-100 text-center">
                <Link
                  href="/dashboard"
                  className="text-[12px] text-gray-500 hover:text-gray-900 transition-colors"
                >
                  Continue to dashboard in read-only mode &rarr;
                </Link>
              </div>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

export default function VerifyEmailPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#EFEFEF] text-gray-900">
      <Suspense
        fallback={
          <div className="p-8 text-sm text-gray-500 text-center">Loading...</div>
        }
      >
        <VerifyEmailContent />
      </Suspense>
      <Footer />
    </div>
  );
}
