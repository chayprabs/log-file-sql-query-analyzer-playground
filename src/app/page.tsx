"use client";

import { useCallback } from "react";
import { LensQueryWorkspace } from "@/components/LensQueryWorkspace";
import { LensUploadSection } from "@/components/LensUploadSection";
import { useLog } from "@/context/LogContext";

export default function Home() {
  const { db } = useLog();

  const scrollToWorkspace = useCallback((): void => {
    requestAnimationFrame(() => {
      document.getElementById("workspace")?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    });
  }, []);

  return (
    <main className="min-h-0 flex-1 bg-[#fafafa]">
      {!db ? (
        <LensUploadSection onFileLoaded={scrollToWorkspace} />
      ) : (
        <LensQueryWorkspace />
      )}
    </main>
  );
}
