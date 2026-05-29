"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { LensQueryWorkspace } from "@/components/LensQueryWorkspace";
import { LensUploadSection } from "@/components/LensUploadSection";
import { useLog } from "@/context/LogContext";

/** Legacy route: same single-page experience as home. */
export default function QueryPage() {
  const router = useRouter();
  const { db, loading } = useLog();

  useEffect(() => {
    if (!loading && !db) {
      router.replace("/");
    }
  }, [db, loading, router]);

  if (loading) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-10 text-sm text-neutral-600 sm:px-6">
        Preparing your log database…
      </main>
    );
  }

  if (!db) {
    return (
      <main className="min-h-0 flex-1 bg-[#fafafa]">
        <LensUploadSection onFileLoaded={() => router.replace("/#workspace")} />
      </main>
    );
  }

  return (
    <main className="min-h-0 flex-1 bg-[#fafafa]">
      <LensQueryWorkspace
        onLoadAnother={() => {
          router.push("/");
        }}
      />
    </main>
  );
}
