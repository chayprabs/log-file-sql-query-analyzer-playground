"use client";

import { useRef, useState } from "react";
import { useLog } from "@/context/LogContext";
import type { LogFormat } from "@/lib/engine/formats";
import { FORMATS } from "@/lib/engine/formats";
import {
  LARGE_CONFIRM_BYTES,
  SOFT_WARNING_BYTES,
} from "@/lib/engine/limits";

interface LensUploadSectionProps {
  onFileLoaded: () => void;
}

export function LensUploadSection({ onFileLoaded }: LensUploadSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showLargeBadge, setShowLargeBadge] = useState(false);
  const [formatOverride, setFormatOverride] = useState<LogFormat["name"] | undefined>(
    undefined
  );
  const { db, error, loadFile, loading, progress, clearError } = useLog();

  const handleSelectedFile = async (file: File): Promise<void> => {
    if (loading) {
      return;
    }

    clearError();

    setShowLargeBadge(
      file.size > SOFT_WARNING_BYTES && file.size <= LARGE_CONFIRM_BYTES
    );

    const options = formatOverride ? { formatOverride } : undefined;
    const result = await loadFile(file, options);
    if (result.ok) {
      onFileLoaded();
    }
  };

  const handleFileInput = async (
    event: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    await handleSelectedFile(file);
    event.target.value = "";
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>): Promise<void> => {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files[0];
    if (file) {
      await handleSelectedFile(file);
    }
  };

  const progressLabel =
    progress && progress.total > 0
      ? `Parsing line ${Math.min(progress.current, progress.total).toLocaleString()} of ${progress.total.toLocaleString()}…`
      : "Parsing…";

  if (db) {
    return null;
  }

  return (
    <section
      className="mx-auto max-w-6xl px-4 py-6 sm:px-6"
      aria-label="Upload a log file"
    >
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload a log file. Drop a file here or press Enter or Space to open the file picker."
        aria-describedby="upload-privacy-notice dropzone-instructions"
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(event: React.KeyboardEvent<HTMLElement>) => {
          if (event.target !== event.currentTarget) {
            return;
          }
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            fileInputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        aria-busy={loading}
        className={`flex min-h-[220px] cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-10 transition-colors ${
          isDragging
            ? "border-neutral-900 bg-neutral-100"
            : loading
              ? "border-neutral-200 bg-neutral-50 cursor-wait"
              : "border-neutral-300 bg-white hover:border-neutral-400"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          aria-label="Choose log file"
          onChange={handleFileInput}
          className="hidden"
        />

        {loading ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              aria-hidden
              className="h-10 w-10 animate-spin rounded-full border-2 border-neutral-200 border-t-neutral-900"
            />
            <p className="m-0 text-sm font-medium text-neutral-900">{progressLabel}</p>
            <p className="m-0 max-w-md text-xs text-neutral-600">
              Large files are inserted in batches so the page stays responsive.
            </p>
          </div>
        ) : (
          <>
            <p
              id="dropzone-instructions"
              className="m-0 text-base font-semibold text-neutral-900"
            >
              Drop a log file here
            </p>
            <p className="mt-1 mb-4 text-sm text-neutral-600">
              or click to choose a file
            </p>

            <div
              className="mb-4 flex flex-wrap items-center justify-center gap-2"
              onClick={(event) => event.stopPropagation()}
            >
              <label htmlFor="format-override" className="text-sm text-neutral-600">
                Format
              </label>
              <select
                id="format-override"
                value={formatOverride ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setFormatOverride(
                    value === "" ? undefined : (value as LogFormat["name"])
                  );
                }}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm text-neutral-900"
              >
                <option value="">Auto-detect</option>
                {FORMATS.filter((format) => format.name !== "generic").map(
                  (format) => (
                    <option key={format.name} value={format.name}>
                      {format.displayName}
                    </option>
                  )
                )}
                <option value="generic">Generic text</option>
              </select>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="rounded-lg bg-neutral-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-neutral-800"
            >
              Choose file
            </button>
          </>
        )}
      </div>

      <p
        id="upload-privacy-notice"
        className="mt-3 text-center text-xs text-neutral-600"
      >
        Your log files never leave your browser. Parsing and SQL run locally via
        WebAssembly — nothing is uploaded.
      </p>

      {showLargeBadge && !loading && (
        <p className="mt-2 text-center text-sm font-medium text-amber-800">
          Large file — parsing may take a while
        </p>
      )}

      {error && (
        <div
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
          role="alert"
        >
          {error}
        </div>
      )}
    </section>
  );
}
