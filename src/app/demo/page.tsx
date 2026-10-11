import React from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { DocumentationWorkspace } from "@/components/DocumentationWorkspace";
import { SAMPLE_PROJECT_BUNDLE } from "@/lib/sample-project";
import { getAuthenticatedSession } from "@/lib/session";

export const metadata = {
  title: "Sample Repository Demo | Derivo Docs",
  description: "Explore an evidence-based documentation workspace with clarification questions in demo mode.",
};

export default async function DemoWorkspacePage() {
  const session = await getAuthenticatedSession();

  return (
    <div className="min-h-screen flex flex-col bg-[#EFEFEF] text-gray-900">
      <Header user={session.user} />
      <div className="flex-1">
        <DocumentationWorkspace
          initialBundle={SAMPLE_PROJECT_BUNDLE}
          isDemoMode={true}
        />
      </div>
      <Footer />
    </div>
  );
}
