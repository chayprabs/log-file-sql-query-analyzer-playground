"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useLog } from "@/context/LogContext";

export default function Home() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { db, error, fileName, loadFile, loading, progress, clearError } = useLog();

  const handleSelectedFile = async (file: File): Promise<void> => {
    clearError();
    const loaded = await loadFile(file);
    if (loaded) {
      router.push("/query");
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
      ? `Parsing line ${Math.min(progress.current, progress.total).toLocaleString()} of ${progress.total.toLocaleString()}...`
      : "Preparing file...";

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f6f1e8 0%, #fcfaf7 45%, #f1f5f2 100%)",
        color: "#1d2a26",
        padding: "24px",
      }}
    >
      <div
        style={{
          margin: "0 auto",
          maxWidth: "960px",
          display: "grid",
          gap: "24px",
        }}
      >
        <section
          style={{
            border: "1px solid rgba(29, 42, 38, 0.12)",
            borderRadius: "24px",
            padding: "28px",
            background: "rgba(255, 255, 255, 0.82)",
            boxShadow: "0 24px 80px rgba(29, 42, 38, 0.08)",
          }}
        >
          <div style={{ display: "grid", gap: "12px" }}>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "#6d7c75",
              }}
            >
              Browser-native log analysis
            </p>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(2rem, 4vw, 3.4rem)",
                lineHeight: 1.05,
              }}
            >
              Load a log file and query it locally with SQLite.
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: "720px",
                fontSize: "1rem",
                lineHeight: 1.7,
                color: "#42544c",
              }}
            >
              Drag in an access log, syslog export, journald dump, JSON lines
              file, or plain text log. The file stays in the browser and gets
              parsed into an in-memory `logs` table.
            </p>
          </div>
        </section>

        {db && (
          <section
            style={{
              border: "1px solid rgba(29, 42, 38, 0.12)",
              borderRadius: "20px",
              padding: "20px 24px",
              background: "rgba(255, 255, 255, 0.78)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "16px",
              flexWrap: "wrap",
            }}
          >
            <div style={{ display: "grid", gap: "6px" }}>
              <strong>Current file</strong>
              <span style={{ color: "#55665f" }}>
                {fileName ?? "Unnamed file"}: {db.rowCount.toLocaleString()} rows
                loaded as {db.format.name}
                {db.skippedCount > 0
                  ? `, ${db.skippedCount.toLocaleString()} skipped`
                  : ""}
              </span>
            </div>
            <button
              onClick={() => router.push("/query")}
              style={{
                border: "none",
                borderRadius: "999px",
                background: "#234b3d",
                color: "#fff",
                padding: "12px 18px",
                cursor: "pointer",
                fontWeight: 600,
              }}
            >
              Open query workspace
            </button>
          </section>
        )}

        <section
          onClick={() => fileInputRef.current?.click()}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          style={{
            border: `2px dashed ${isDragging ? "#234b3d" : "rgba(35, 75, 61, 0.24)"}`,
            borderRadius: "28px",
            padding: "36px 24px",
            background: isDragging
              ? "rgba(35, 75, 61, 0.08)"
              : "rgba(255, 255, 255, 0.7)",
            cursor: "pointer",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".log,.txt,.json"
            onChange={handleFileInput}
            style={{ display: "none" }}
          />

          <div
            style={{
              display: "grid",
              gap: "18px",
              justifyItems: "center",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "24px",
                background: "linear-gradient(135deg, #234b3d 0%, #4f8663 100%)",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontSize: "26px",
                fontWeight: 700,
              }}
            >
              SQL
            </div>

            {loading ? (
              <div style={{ display: "grid", gap: "8px" }}>
                <strong style={{ fontSize: "1.05rem" }}>{progressLabel}</strong>
                <span style={{ color: "#55665f" }}>
                  Large files stay responsive because rows are inserted in
                  batches.
                </span>
              </div>
            ) : (
              <>
                <div style={{ display: "grid", gap: "8px" }}>
                  <strong style={{ fontSize: "1.15rem" }}>
                    Drop a log file here
                  </strong>
                  <span style={{ color: "#55665f" }}>
                    or use the file picker if you&apos;re on mobile
                  </span>
                </div>

                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    fileInputRef.current?.click();
                  }}
                  style={{
                    border: "none",
                    borderRadius: "999px",
                    background: "#1d2a26",
                    color: "#fff",
                    padding: "12px 20px",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Choose file
                </button>
              </>
            )}
          </div>
        </section>

        {error && (
          <section
            style={{
              border: "1px solid rgba(166, 50, 34, 0.18)",
              borderRadius: "18px",
              padding: "16px 18px",
              background: "rgba(255, 245, 243, 0.95)",
              color: "#8a2d20",
            }}
          >
            {error}
          </section>
        )}

        <section
          style={{
            border: "1px solid rgba(29, 42, 38, 0.12)",
            borderRadius: "20px",
            padding: "22px 24px",
            background: "rgba(255, 255, 255, 0.68)",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Accepted formats</h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "12px",
            }}
          >
            {[
              "Nginx and Apache access logs",
              "RFC 3164 syslog",
              "journald JSON and key=value export blocks",
              "Generic JSON lines",
              "Plain text fallback",
            ].map((format) => (
              <div
                key={format}
                style={{
                  borderRadius: "16px",
                  padding: "14px 16px",
                  background: "#f5f7f4",
                  color: "#42544c",
                }}
              >
                {format}
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
