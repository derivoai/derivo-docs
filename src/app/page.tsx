import React from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HeroShaderBackground } from "@/components/HeroShaderBackground";
import { LandingNavbar } from "@/components/LandingNavbar";
import { Footer } from "@/components/Footer";
import { getAuthenticatedSession } from "@/lib/session";

const SMALL_ABOUT_IMAGE =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260516_090123_74be96d4-9c1b-40cf-932a-96f4f4babed3.png&w=1280&q=85";

const LARGE_ABOUT_IMAGE =
  "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260516_090133_c157d30b-a99a-4477-bec1-a446149ec3f2.png&w=1280&q=85";

const NARRATIV_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260516_122702_390f5305-8719-41d5-ae80-d23ab3796c28.mp4";

const LUMINAR_VIDEO =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260516_123323_f909c2b8-ff6c-4edf-882b-8ebcdbe389b5.mp4";

export default async function LandingPage() {
  const session = await getAuthenticatedSession();
  const primaryHref = session.user ? "/dashboard" : "/signup";

  return (
    <div className="min-h-screen flex flex-col bg-[#EFEFEF] text-gray-900 selection:bg-[#F26522] selection:text-white">
      {/* =====================================================================
          SECTION 1: HERO (Full viewport height)
      ===================================================================== */}
      <section className="relative min-h-screen flex flex-col justify-between bg-[#EFEFEF] overflow-hidden">
        {/* Animated Shader Stack Overlay */}
        <HeroShaderBackground />

        {/* Pill Navigation Bar */}
        <LandingNavbar user={session.user} />

        {/* Flex spacer to push Hero Content to the bottom of the viewport */}
        <div className="flex-1" />

        {/* Hero Bottom Content */}
        <div className="relative z-20 w-full max-w-[1440px] mx-auto px-5 sm:px-8 lg:px-12 pb-14 sm:pb-16 lg:pb-20">
          <p className="text-[13px] sm:text-[14px] text-gray-900 tracking-wide mb-5 sm:mb-8">
            Derivo Docs
          </p>

          <h1 className="text-[clamp(1.75rem,7vw,4.2rem)] sm:text-[clamp(2.5rem,5vw,4.2rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900">
            We craft living documentation
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            for engineering teams ready to
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            understand any codebase in minutes.
          </h1>

          {/* CTA Row */}
          <div className="mt-8 sm:mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
            {/* Orange CTA Button with Text Roll Animation */}
            <Link
              href={primaryHref}
              className="group bg-[#F26522] hover:bg-[#e05a1a] text-white text-[13px] sm:text-[14px] font-medium rounded-full pl-5 sm:pl-6 pr-2 py-2 flex items-center gap-3 transition-colors duration-300"
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

              <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-[#F26522] flex items-center justify-center shrink-0">
                <ArrowRight
                  size={15}
                  className="transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45"
                  aria-hidden="true"
                />
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 2: ABOUT (White background)
      ===================================================================== */}
      <section
        id="about"
        className="bg-white pt-16 sm:pt-20 lg:pt-32 pb-12 sm:pb-16 lg:pb-24 overflow-hidden"
      >
        <div className="max-w-[1440px] mx-auto">
          {/* Badge Row */}
          <div className="px-5 sm:px-8 lg:px-12 flex items-center gap-3 mb-6 sm:mb-8">
            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 text-white text-[11px] sm:text-[12px] font-semibold flex items-center justify-center">
              1
            </span>
            <span className="text-[12px] sm:text-[13px] font-medium border border-gray-200 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-gray-900">
              Introducing Derivo
            </span>
          </div>

          {/* Section 2 Heading */}
          <h2 className="px-5 sm:px-8 lg:px-12 text-[clamp(1.5rem,4vw,3.2rem)] font-medium leading-[1.12] tracking-[-0.02em] text-gray-900 mb-12 sm:mb-16 lg:mb-28">
            Evidence-led documentation, delivering
            <br className="hidden sm:block" />
            <span className="sm:hidden"> </span>
            clarity across codebases and beyond.
          </h2>

          {/* MOBILE / TABLET LAYOUT (lg:hidden) */}
          <div className="lg:hidden px-5 sm:px-8 space-y-8">
            <div className="space-y-6">
              <p className="text-[15px] sm:text-[17px] leading-[1.6] font-medium text-gray-900">
                Through static AST analysis, source citations and targeted maintainer questions we help growing engineering teams realize their repository&apos;s full clarity.
              </p>

              <div className="flex">
                <Link
                  href="/demo"
                  className="group bg-[#F26522] hover:bg-[#e05a1a] text-white text-[13px] sm:text-[14px] font-medium rounded-full pl-5 sm:pl-6 pr-2 py-2 inline-flex items-center gap-3 transition-colors duration-300"
                >
                  <span className="overflow-hidden h-[20px] flex flex-col">
                    <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                      <span className="h-[20px] leading-[20px] flex items-center">
                        Explore sample workspace
                      </span>
                      <span className="h-[20px] leading-[20px] flex items-center">
                        Explore sample workspace
                      </span>
                    </span>
                  </span>

                  <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-[#F26522] flex items-center justify-center shrink-0">
                    <ArrowRight
                      size={15}
                      className="transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45"
                      aria-hidden="true"
                    />
                  </span>
                </Link>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 sm:gap-5">
              <img
                src={SMALL_ABOUT_IMAGE}
                alt="Derivo Docs architecture inspection"
                className="w-full sm:w-[45%] aspect-[438/346] rounded-xl sm:rounded-2xl object-cover"
              />
              <img
                src={LARGE_ABOUT_IMAGE}
                alt="Derivo Docs interactive documentation workspace"
                className="w-full sm:w-[55%] aspect-[900/600] rounded-xl sm:rounded-2xl object-cover"
              />
            </div>
          </div>

          {/* DESKTOP LAYOUT (hidden lg:grid) */}
          <div className="hidden lg:grid grid-cols-[26%_1fr_48%] items-end gap-6 xl:gap-8 px-12">
            {/* Left Column: Small image */}
            <div className="self-end">
              <img
                src={SMALL_ABOUT_IMAGE}
                alt="Derivo Docs architecture inspection"
                className="w-full aspect-[438/346] rounded-2xl object-cover"
              />
            </div>

            {/* Center Column: Paragraph + Orange Button */}
            <div className="self-start flex justify-end">
              <div className="space-y-7">
                <p className="text-[16px] xl:text-[18px] leading-[1.65] font-medium text-gray-900 whitespace-nowrap">
                  Through static AST analysis,
                  <br />
                  source citations and iteration
                  <br />
                  we help engineering teams
                  <br />
                  understand any repo fast.
                </p>

                <div>
                  <Link
                    href="/demo"
                    className="group bg-[#F26522] hover:bg-[#e05a1a] text-white text-[13px] sm:text-[14px] font-medium rounded-full pl-5 sm:pl-6 pr-2 py-2 inline-flex items-center gap-3 transition-colors duration-300"
                  >
                    <span className="overflow-hidden h-[20px] flex flex-col">
                      <span className="flex flex-col transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-translate-y-1/2">
                        <span className="h-[20px] leading-[20px] flex items-center">
                          About our studio
                        </span>
                        <span className="h-[20px] leading-[20px] flex items-center">
                          About our studio
                        </span>
                      </span>
                    </span>

                    <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white text-[#F26522] flex items-center justify-center shrink-0">
                      <ArrowRight
                        size={15}
                        className="transition-transform duration-500 ease-[cubic-bezier(0.25,0.1,0.25,1)] group-hover:-rotate-45"
                        aria-hidden="true"
                      />
                    </span>
                  </Link>
                </div>
              </div>
            </div>

            {/* Right Column: Large image */}
            <div className="self-end">
              <img
                src={LARGE_ABOUT_IMAGE}
                alt="Derivo Docs interactive documentation workspace"
                className="w-full aspect-[3/2] rounded-2xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================================
          SECTION 3: CASE STUDIES (Light gray background)
      ===================================================================== */}
      <section
        id="projects"
        className="bg-[#F5F5F5] pt-16 sm:pt-20 lg:pt-28 pb-16 sm:pb-20 lg:pb-28"
      >
        <div className="max-w-[1440px] mx-auto">
          {/* Badge Row */}
          <div className="px-5 sm:px-8 lg:px-12 flex items-center gap-3 mb-6 sm:mb-8">
            <span className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-gray-900 text-white text-[11px] sm:text-[12px] font-semibold flex items-center justify-center">
              2
            </span>
            <span className="text-[12px] sm:text-[13px] font-medium border border-gray-300 rounded-full px-3 sm:px-4 py-1 sm:py-1.5 text-gray-900">
              Featured client work
            </span>
          </div>

          {/* Heading */}
          <h2 className="px-5 sm:px-8 lg:px-12 text-[clamp(1.75rem,7vw,4.2rem)] sm:text-[clamp(2.5rem,5vw,4.2rem)] font-medium leading-[1.08] tracking-[-0.03em] text-gray-900 mb-10 sm:mb-14 lg:mb-16">
            Our projects
          </h2>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6 lg:gap-7 px-5 sm:px-8 lg:px-12">
            {/* Card 1: Narrativ */}
            <Link href="/demo" className="block group">
              <div className="relative aspect-[329/246] rounded-2xl overflow-hidden bg-[#1a1d2e] cursor-pointer">
                <video
                  src={NARRATIV_VIDEO}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Expanding White Pill Hover Button */}
                <div className="absolute bottom-4 left-4 h-9 w-9 group-hover:w-[148px] bg-white rounded-full flex items-center justify-end px-2.5 overflow-hidden transition-all duration-300 ease-in-out shadow-sm">
                  <span className="text-[13px] font-medium text-gray-900 whitespace-nowrap mr-auto pl-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
                    Learn more
                  </span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-gray-900 -rotate-45 group-hover:rotate-0 transition-transform duration-300 shrink-0"
                    aria-hidden="true"
                  >
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                </div>
              </div>

              <p className="text-[13px] sm:text-[14px] text-gray-600 mt-4 leading-relaxed">
                Winner of Site of the Month 2025 - an interactive 3D showcase driving record engagement
              </p>
              <h3 className="text-[14px] sm:text-[15px] font-semibold text-gray-900 mt-1">
                Narrativ
              </h3>
            </Link>

            {/* Card 2: Luminar */}
            <Link href={primaryHref} className="block group">
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#6b6b6b] cursor-pointer">
                <video
                  src={LUMINAR_VIDEO}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="w-full h-full object-cover"
                />

                {/* Expanding Dark Pill Hover Button */}
                <div className="absolute bottom-4 left-4 h-9 w-9 group-hover:w-[168px] bg-gray-900 rounded-full flex items-center justify-end px-2.5 overflow-hidden transition-all duration-300 ease-in-out shadow-sm">
                  <span className="text-[13px] font-medium text-white whitespace-nowrap mr-auto pl-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 delay-100">
                    View case study
                  </span>
                  <ArrowRight
                    size={14}
                    className="text-white -rotate-45 group-hover:rotate-0 transition-transform duration-300 shrink-0"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <p className="text-[13px] sm:text-[14px] text-gray-600 mt-4 leading-relaxed">
                Transforming a dated platform into a conversion-focused brand experience
              </p>
              <h3 className="text-[14px] sm:text-[15px] font-semibold text-gray-900 mt-1">
                Luminar
              </h3>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
