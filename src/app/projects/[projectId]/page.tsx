import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DocumentationWorkspace } from "@/components/DocumentationWorkspace";
import { ErrorAlert } from "@/components/ui/primitives";
import { getAuthenticatedSession } from "@/lib/session";
import { defaultStore } from "@/lib/store";

export const metadata = {
  title: "Repository Documentation Workspace | Derivo Docs",
  description: "Interactive documentation workspace with evidence citations and uncertainty clarifications.",
};

export default async function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const session = await getAuthenticatedSession();

  if (!session.user) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(`/projects/${projectId}`)}`
    );
  }

  const res = defaultStore.getProjectWorkspace({
    actingUserId: session.user.id,
    projectId,
  });

  if (!res.ok) {
    return (
      <div className="min-h-screen flex flex-col bg-[#EFEFEF] text-gray-900">
        <Header user={session.user} />
        <main className="max-w-3xl mx-auto px-4 py-16 w-full space-y-4 flex-1">
          <ErrorAlert error={res.error} />
          <Link
            href="/dashboard"
            className="inline-block text-xs font-semibold text-[#F26522] hover:underline"
          >
            ← Return to your dashboard
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#EFEFEF] text-gray-900">
      <Header user={session.user} />
      <div className="flex-1">
        <DocumentationWorkspace
          initialBundle={res.workspace}
          isDemoMode={false}
        />
      </div>
      <Footer />
    </div>
  );
}
