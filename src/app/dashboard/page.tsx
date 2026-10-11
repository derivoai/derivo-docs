import React from "react";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DashboardClient } from "@/components/DashboardClient";
import { getAuthenticatedSession } from "@/lib/session";
import { defaultStore } from "@/lib/store";

export const metadata = {
  title: "Dashboard | Derivo Docs",
  description: "Manage and analyze public GitHub repository documentation workspaces.",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ repo?: string }>;
}) {
  const session = await getAuthenticatedSession();
  const resolvedSearchParams = await searchParams;

  if (!session.user) {
    const target = resolvedSearchParams.repo
      ? `/dashboard?repo=${encodeURIComponent(resolvedSearchParams.repo)}`
      : "/dashboard";
    redirect(`/login?redirectTo=${encodeURIComponent(target)}`);
  }

  const projects = defaultStore.listProjectsForUser(session.user.id);

  return (
    <div className="min-h-screen flex flex-col bg-[#EFEFEF] text-gray-900">
      <Header user={session.user} />
      <div className="flex-1">
        <DashboardClient
          user={session.user}
          initialProjects={projects}
          initialRepoParam={resolvedSearchParams.repo ?? ""}
        />
      </div>
      <Footer />
    </div>
  );
}
