"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Clock, LogOut, Menu, X } from "lucide-react";
import { UserProfile } from "@/lib/types";
import { StatusIndicator } from "./ui/primitives";
import { DerivoLogo } from "./DerivoLogo";

export function Header({ user }: { user?: UserProfile | null }) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [londonTime, setLondonTime] = useState<string>("12:00");

  useEffect(() => {
    const updateClock = () => {
      try {
        const formatter = new Intl.DateTimeFormat("en-GB", {
          timeZone: "Europe/London",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        setLondonTime(formatter.format(new Date()));
      } catch {
        const now = new Date();
        const hh = String(now.getUTCHours()).padStart(2, "0");
        const mm = String(now.getUTCMinutes()).padStart(2, "0");
        setLondonTime(`${hh}:${mm}`);
      }
    };

    updateClock();
    const timer = setInterval(updateClock, 1000);
    return () => clearInterval(timer);
  }, []);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } finally {
      setLoggingOut(false);
    }
  }

  const navItems = [
    { label: "Projects", href: "/demo" },
    { label: "Studio", href: "/about" },
    { label: "Pricing", href: "/pricing" },
    { label: "Connect", href: "/contact" },
    ...(user ? [{ label: "Dashboard", href: "/dashboard" }] : []),
  ];

  return (
    <>
      <header className="relative z-40 w-full max-w-[1440px] mx-auto p-2 sm:p-3">
        <nav
          aria-label="Primary navigation"
          className="bg-white rounded-full p-[5px] flex items-center justify-between shadow-[0_2px_12px_rgba(0,0,0,0.04)] border border-gray-200/60"
        >
          {/* LEFT: Custom SVG Logo + Desktop Nav Links */}
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="flex items-center gap-2.5 group focus:outline-none"
              aria-label="Derivo Docs Home"
            >
              <DerivoLogo className="w-9 h-9 sm:w-10 sm:h-10 transition-transform duration-300 group-hover:scale-105" />
              <span className="text-[14px] font-semibold tracking-tight text-gray-900 hidden sm:inline">
                Derivo Docs
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6 pl-1">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="text-[14px] text-gray-900 hover:text-gray-500 transition-colors duration-300"
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* RIGHT: Live London Clock + User / Auth Controls */}
          <div className="hidden md:flex items-center gap-4">
            <div className="hidden lg:flex items-center gap-1.5 text-[13px] text-gray-600 tabular-nums pr-1">
              <Clock size={14} className="text-gray-600 shrink-0" aria-hidden="true" />
              <span>{londonTime} in London</span>
            </div>

            {user ? (
              <div className="flex items-center gap-2.5">
                {!user.emailVerified && (
                  <Link href="/verify-email" className="hover:opacity-90">
                    <StatusIndicator status="Waiting for verification" />
                  </Link>
                )}
                <Link
                  href="/dashboard"
                  className="text-[12px] font-mono-code text-gray-900 px-3.5 py-2 bg-[#F5F5F5] hover:bg-gray-200/70 rounded-full font-medium transition-colors"
                >
                  {user.email}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium bg-gray-900 text-white rounded-full hover:bg-gray-800 disabled:opacity-50 cursor-pointer transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
                  <span>{loggingOut ? "Signing out..." : "Log out"}</span>
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-3">
                <Link
                  href="/login"
                  className="px-3 py-2 text-[13px] font-medium text-gray-900 hover:text-gray-500 transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="group bg-gray-900 text-white text-[13px] font-medium rounded-full pl-5 pr-2 py-2 flex items-center gap-3"
                >
                  <span className="overflow-hidden h-[20px] flex flex-col">
                    <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                      <span className="h-[20px] leading-[20px] flex items-center">
                        Document a repository
                      </span>
                      <span className="h-[20px] leading-[20px] flex items-center">
                        Document a repository
                      </span>
                    </span>
                  </span>

                  <span className="w-6 h-6 rounded-full bg-white text-gray-900 flex items-center justify-center shrink-0">
                    <ArrowRight
                      size={13}
                      className="transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </div>
            )}
          </div>

          {/* MOBILE: Menu / Close Toggle Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-expanded={mobileMenuOpen}
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
            className="md:hidden bg-gray-900 text-white text-[13px] font-medium rounded-full px-4 py-2 flex items-center gap-1.5 cursor-pointer"
          >
            {mobileMenuOpen ? (
              <>
                <X size={15} aria-hidden="true" />
                <span>Close</span>
              </>
            ) : (
              <>
                <Menu size={15} aria-hidden="true" />
                <span>Menu</span>
              </>
            )}
          </button>
        </nav>
      </header>

      {/* MOBILE MENU SLIDE-UP BOTTOM SHEET */}
      <div
        className={`fixed inset-0 z-50 md:hidden flex flex-col justify-end transition-opacity duration-500 ${
          mobileMenuOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!mobileMenuOpen}
      >
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setMobileMenuOpen(false)}
        />

        <div
          className={`relative bg-white rounded-2xl mx-3 mb-3 p-6 shadow-2xl transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)] ${
            mobileMenuOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          <div className="flex items-center justify-between pb-5 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-[13px] text-gray-600 tabular-nums bg-gray-100 px-3 py-1 rounded-full">
              <Clock size={14} className="text-gray-600" aria-hidden="true" />
              <span>{londonTime} in London</span>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              className="bg-gray-900 text-white text-[12px] font-medium rounded-full px-3.5 py-1.5 flex items-center gap-1 cursor-pointer"
            >
              <X size={14} aria-hidden="true" />
              <span>Close</span>
            </button>
          </div>

          <div className="py-6 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className="text-[28px] sm:text-[32px] font-medium text-gray-900 hover:text-[#F26522] transition-colors leading-tight"
              >
                {item.label}
              </Link>
            ))}
            {!user && (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="text-[28px] sm:text-[32px] font-medium text-gray-900 hover:text-[#F26522] transition-colors leading-tight"
              >
                Log in
              </Link>
            )}
          </div>

          <div className="pt-4 border-t border-gray-100">
            {user ? (
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-mono-code text-gray-600 truncate">
                  {user.email}
                </span>
                <button
                  type="button"
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="px-4 py-2 text-xs font-medium bg-gray-900 text-white rounded-full cursor-pointer"
                >
                  {loggingOut ? "Signing out..." : "Log out"}
                </button>
              </div>
            ) : (
              <Link
                href="/signup"
                onClick={() => setMobileMenuOpen(false)}
                className="group w-full bg-[#F26522] hover:bg-[#e05a1a] text-white text-[14px] font-medium rounded-full pl-6 pr-2 py-2.5 flex items-center justify-between transition-colors"
              >
                <span>Document a repository</span>
                <span className="w-8 h-8 rounded-full bg-white text-[#F26522] flex items-center justify-center">
                  <ArrowRight
                    size={16}
                    className="transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45"
                    aria-hidden="true"
                  />
                </span>
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
