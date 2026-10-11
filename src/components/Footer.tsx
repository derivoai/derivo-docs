import React from "react";
import Link from "next/link";
import { ArrowRight, Github, Mail, ShieldCheck } from "lucide-react";
import { DerivoLogo } from "./DerivoLogo";

export function Footer() {
  return (
    <footer className="bg-white border-t border-gray-200/80 text-gray-600 mt-auto">
      <div className="max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 py-16 sm:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10 lg:gap-8 pb-14 border-b border-gray-200/80">
          {/* Brand Column (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <Link
              href="/"
              className="inline-flex items-center gap-3 text-gray-900 group"
            >
              <DerivoLogo className="w-9 h-9 sm:w-10 sm:h-10" />
              <span className="text-[18px] font-semibold tracking-tight text-gray-900">
                Derivo Docs
              </span>
            </Link>

            <p className="text-[14px] text-gray-600 leading-relaxed max-w-sm">
              We craft living, evidence-verified developer documentation for engineering teams ready to understand any public GitHub codebase in minutes.
            </p>

            <div className="pt-1 flex flex-wrap items-center gap-3">
              <a
                href="mailto:support@derivo.in"
                className="inline-flex items-center gap-2 text-[12px] font-medium text-gray-900 bg-[#F5F5F5] hover:bg-gray-200/80 px-3.5 py-1.5 rounded-full transition-colors"
              >
                <Mail className="w-3.5 h-3.5 text-[#F26522]" />
                <span>support@derivo.in</span>
              </a>
              <span className="inline-flex items-center gap-1.5 text-[12px] font-mono-code text-gray-600 bg-[#F5F5F5] px-3 py-1.5 rounded-full">
                derivo.in
              </span>
            </div>
          </div>

          {/* Product Links (2 cols) */}
          <div className="lg:col-span-2 space-y-3.5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-900">
              Platform
            </p>
            <ul className="space-y-2.5 text-[14px]">
              <li>
                <Link href="/demo" className="hover:text-[#F26522] transition-colors">
                  Sample Workspace
                </Link>
              </li>
              <li>
                <Link href="/pricing" className="hover:text-[#F26522] transition-colors">
                  Pricing Plans
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="hover:text-[#F26522] transition-colors">
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>

          {/* Studio Links (2 cols) */}
          <div className="lg:col-span-2 space-y-3.5">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-900">
              Studio
            </p>
            <ul className="space-y-2.5 text-[14px]">
              <li>
                <Link href="/about" className="hover:text-[#F26522] transition-colors">
                  About Derivo
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-[#F26522] transition-colors">
                  Contact Us
                </Link>
              </li>
              <li>
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#F26522] transition-colors inline-flex items-center gap-1.5"
                >
                  <Github className="w-3.5 h-3.5" />
                  <span>GitHub</span>
                </a>
              </li>
            </ul>
          </div>

          {/* Legal & CTA Column (3 cols) */}
          <div className="lg:col-span-3 space-y-4">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-gray-900">
              Legal & Security
            </p>
            <ul className="space-y-2.5 text-[14px]">
              <li>
                <Link href="/terms" className="hover:text-[#F26522] transition-colors">
                  Terms of Service
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#F26522] transition-colors">
                  Privacy Policy
                </Link>
              </li>
              <li className="pt-1 flex items-center gap-1.5 text-[12px] text-emerald-700 font-medium">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Read-only static GitHub inspection</span>
              </li>
            </ul>

            <div className="pt-2">
              <Link
                href="/signup"
                className="group bg-[#F26522] hover:bg-[#e05a1a] text-white text-[13px] font-medium rounded-full pl-5 pr-2 py-2 inline-flex items-center gap-3 transition-colors"
              >
                <span>Start a project</span>
                <span className="w-6 h-6 rounded-full bg-white text-[#F26522] flex items-center justify-center">
                  <ArrowRight
                    size={13}
                    className="transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45"
                  />
                </span>
              </Link>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px] text-gray-500">
          <p>© {new Date().getFullYear()} Derivo Docs (derivo.in). All rights reserved.</p>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[#F26522]" />
            <span>Zero-Hallucination Evidence Engine &bull; Multi-Provider AI Pipeline</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
