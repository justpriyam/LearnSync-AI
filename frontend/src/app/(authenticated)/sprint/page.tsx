"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { listDocuments, generateSprint } from "@/lib/api";
import { DocumentResponse, DocumentStatusResponse } from "@/lib/types";
import UploadZone from "@/components/UploadZone";
import ProcessingStatus from "@/components/ProcessingStatus";
import DocumentCard from "@/components/DocumentCard";

/* ─── constants ──────────────────────────────────────────────── */
const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260622_204221_5339e40b-e73d-4ab0-9c65-79c18c66fd50.mp4";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Sprint Planner", href: "/sprint" },
  { label: "Mock Interview", href: "/interview" },
];

/* ─── Component ──────────────────────────────────────────────── */
export default function SprintPage() {
  const router = useRouter();

  /* ── sprint planner state ───────────────────────────────────── */
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [syllabusDocId, setSyllabusDocId] = useState<string | null>(null);
  const [pyqDocId, setPyqDocId] = useState<string | null>(null);
  const [processingPyqId, setProcessingPyqId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string>("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);

  const readyDocuments = useMemo(
    () => documents.filter((d) => d.status === "ready"),
    [documents]
  );

  const minDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }, []);

  const daysRemaining = useMemo(() => {
    if (!deadline) return null;
    const d = new Date(deadline);
    const today = new Date();
    const diff = Math.ceil(
      (d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return diff > 0 ? diff : 0;
  }, [deadline]);

  const fetchDocs = useCallback(async () => {
    try {
      setLoadingDocs(true);
      setDocumentsError(null);
      const docs = await listDocuments();
      setDocuments(
        docs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch (err: unknown) {
      setDocumentsError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => void fetchDocs(), 0);
    return () => clearTimeout(timer);
  }, [fetchDocs]);

  const handlePyqUploadComplete = (doc: DocumentResponse) => {
    setDocuments((prev) => [doc, ...prev]);
    setProcessingPyqId(doc.id);
  };

  const handlePyqReady = (statusDoc: DocumentStatusResponse) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === statusDoc.id
          ? ({ ...d, ...statusDoc } as DocumentResponse)
          : d
      )
    );
    setProcessingPyqId(null);
    if (statusDoc.status === "ready") {
      setPyqDocId(statusDoc.id);
    }
  };

  const handleGenerate = async () => {
    if (!syllabusDocId || !pyqDocId || !deadline) return;
    try {
      setGenerating(true);
      const res = await generateSprint(syllabusDocId, pyqDocId, deadline);
      router.push(`/sprint/${res.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate sprint";
      setGenerateError(message);
      setGenerating(false);
    }
  };

  /* ── mobile menu ────────────────────────────────────────────── */
  /* ── scroll ref ─────────────────────────────────────────────── */
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative min-h-[100dvh] overflow-y-auto bg-black">
      {/* ─────────────────────── HERO VIEWPORT ─────────────────── */}
      <div className="relative h-screen w-full overflow-hidden bg-black">
        {/* Background video */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "70% center" }}
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
        />

        {/* ── HERO CONTENT (z-10) ────────────────────────────── */}
        <div
          className="relative z-10 flex flex-col justify-between px-6 pb-10 pt-12 sm:pb-12 sm:pt-16 md:px-12 md:pb-16 md:pt-20 lg:px-16"
          style={{ height: "calc(100vh - 80px)" }}
        >
          {/* Top: headline */}
          <div className="max-w-3xl">
            <p
              className="mb-4 text-xs text-white/90 sm:mb-6 sm:text-sm"
              style={{ animation: "fadeSlideUp 0.8s ease 0.2s both" }}
            >
              AI-Powered Sprint Planning
            </p>
            <h1
              className="text-3xl font-medium leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
              style={{ animation: "fadeSlideUp 0.8s ease 0.4s both" }}
            >
              Plan smarter,
              <br />
              study faster,
              <br />
              ace every exam.
            </h1>
          </div>

          {/* Bottom: subtitle + CTA */}
          <div>
            <p
              className="mb-5 max-w-sm text-sm leading-relaxed text-white/60 sm:mb-6 sm:max-w-lg sm:text-base md:text-lg"
              style={{ animation: "fadeSlideUp 0.8s ease 0.7s both" }}
            >
              Turn your syllabus and past papers into an AI‑optimized study
              sprint — built around your deadline and what matters most.
            </p>
            <button
              onClick={scrollToContent}
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-black transition-transform hover:scale-105 sm:px-6 sm:py-3"
              style={{ animation: "fadeSlideUp 0.8s ease 0.9s both" }}
            >
              Start Planning
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* ──────────────── SPRINT PLANNER CONTENT ───────────────── */}
      <div ref={contentRef} className="relative z-10 bg-white">
        <div className="mx-auto max-w-3xl space-y-12 px-6 py-16 sm:px-8 md:px-10 pb-20">
          <div>
            <h2 className="text-3xl font-bold mb-2 text-gray-900">
              Sprint Planner
            </h2>
            <p className="text-gray-600">
              Generate an optimized study plan based on your syllabus and
              previous year questions (PYQs).
            </p>
          </div>

          {/* Step 1 */}
          <section
            className={`border rounded-xl p-6 ${
              syllabusDocId
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              Step 1: Select Syllabus Document
              {syllabusDocId && (
                <span className="text-green-600 text-sm font-normal">
                  ✓ Selected
                </span>
              )}
            </h3>
            {loadingDocs ? (
              <p className="text-gray-500">Loading documents...</p>
            ) : documentsError ? (
              <div className="text-red-600">
                <p>{documentsError}</p>
                <button onClick={fetchDocs} className="mt-2 underline">Try again</button>
              </div>
            ) : readyDocuments.length === 0 ? (
              <div className="text-gray-500">
                <p>No ready documents found.</p>
                <Link
                  href="/courses"
                  className="text-blue-600 underline hover:text-blue-700 mt-1 inline-block"
                >
                  Go to Courses to upload your syllabus →
                </Link>
              </div>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {readyDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => setSyllabusDocId(doc.id)}
                    className={`cursor-pointer transition-colors ${
                      syllabusDocId === doc.id
                        ? "ring-2 ring-blue-500"
                        : "hover:bg-gray-50"
                    }`}
                  >
                    <DocumentCard
                      document={doc}
                      onGenerateCourse={() => {}}
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Step 2 */}
          <section
            className={`border rounded-xl p-6 ${
              pyqDocId
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white"
            } ${!syllabusDocId ? "opacity-50 pointer-events-none" : ""}`}
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              Step 2: Upload PYQ Document
              {pyqDocId && (
                <span className="text-green-600 text-sm font-normal">
                  ✓ Ready
                </span>
              )}
            </h3>
            {!pyqDocId && !processingPyqId && (
              <UploadZone onUploadComplete={handlePyqUploadComplete} />
            )}
            {processingPyqId && (
              <div className="mt-4">
                <ProcessingStatus
                  documentId={processingPyqId}
                  onReady={handlePyqReady}
                />
              </div>
            )}
            {pyqDocId && (
              <p className="text-sm text-gray-700">
                PYQ Document selected. ID:{" "}
                <code className="bg-gray-100 px-1 rounded">{pyqDocId}</code>
              </p>
            )}
          </section>

          {/* Step 3 */}
          <section
            className={`border rounded-xl p-6 ${
              deadline
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white"
            } ${!pyqDocId ? "opacity-50 pointer-events-none" : ""}`}
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              Step 3: Set Exam Deadline
              {deadline && (
                <span className="text-green-600 text-sm font-normal">
                  ✓ Set
                </span>
              )}
            </h3>
            <div className="flex items-center gap-4">
              <input
                type="date"
                min={minDate}
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500"
              />
              {daysRemaining !== null && (
                <span className="text-sm font-medium text-blue-600">
                  {daysRemaining} days remaining
                </span>
              )}
            </div>
          </section>

          {/* Step 4 */}
          <section className="pt-6">
            <button
              onClick={handleGenerate}
              disabled={
                !syllabusDocId || !pyqDocId || !deadline || generating
              }
              className="w-full py-4 px-6 bg-black hover:bg-gray-900 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl shadow-sm transition-colors flex justify-center items-center gap-2"
            >
              {generating ? "Generating Plan..." : "Generate Sprint Plan"}
            </button>
            {generateError && (
              <p className="text-red-500 text-center mt-4">{generateError}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
