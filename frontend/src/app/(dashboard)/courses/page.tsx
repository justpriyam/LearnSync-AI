"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listDocuments, generateCourse } from "@/lib/api";
import { DocumentResponse, DocumentStatusResponse } from "@/lib/types";
import UploadZone from "@/components/UploadZone";
import ProcessingStatus from "@/components/ProcessingStatus";
import DocumentCard from "@/components/DocumentCard";

/* ─── useTypewriter hook ─────────────────────────────────────── */
function useTypewriter(
  text: string,
  speed = 38,
  startDelay = 600
): { displayed: string; done: boolean } {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);

  useEffect(() => {
    let idx = 0;
    let interval: NodeJS.Timeout;

    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        idx++;
        setDisplayed(text.slice(0, idx));
        if (idx >= text.length) {
          clearInterval(interval);
          setDone(true);
        }
      }, speed);
    }, startDelay);

    return () => {
      clearTimeout(timeout);
      clearInterval(interval);
    };
  }, [text, speed, startDelay]);

  return { displayed, done };
}

/* ─── constants ──────────────────────────────────────────────── */
const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4";

const SENSITIVITY = 0.8;

const NAV_LINKS = [
  { label: "Courses", href: "/courses" },
  { label: "Sprint Planner", href: "/sprint" },
  { label: "Mock Interview", href: "/interview" },
];

const PILL_BUTTONS = [
  "Upload a document",
  "Generate a course",
  "Plan a sprint",
  "Practice interviews",
];

/* ─── Component ──────────────────────────────────────────────── */
export default function CoursesPage() {
  /* ── courses state ──────────────────────────────────────────── */
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const router = useRouter();

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await listDocuments();
      setDocuments(
        docs.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )
      );
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch documents";
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  const handleUploadComplete = (doc: DocumentResponse) => {
    setDocuments((prev) => [doc, ...prev]);
    setProcessingDocId(doc.id);
  };

  const handleDocReady = (statusDoc: DocumentStatusResponse) => {
    setDocuments((prev) =>
      prev.map((d) =>
        d.id === statusDoc.id
          ? ({ ...d, ...statusDoc } as DocumentResponse)
          : d
      )
    );
    setProcessingDocId(null);
  };

  const handleGenerateCourse = async (docId: string) => {
    try {
      const res = await generateCourse(docId);
      router.push(`/courses/${res.id}`);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to generate course";
      alert(message);
    }
  };

  /* ── video mouse-scrub ──────────────────────────────────────── */
  const videoRef = useRef<HTMLVideoElement>(null);
  const prevXRef = useRef<number | null>(null);
  const targetTimeRef = useRef(0);
  const seekingRef = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const video = videoRef.current;
      if (!video || !video.duration) return;

      if (prevXRef.current === null) {
        prevXRef.current = e.clientX;
        return;
      }

      const delta = e.clientX - prevXRef.current;
      prevXRef.current = e.clientX;

      const timeOffset =
        (delta / window.innerWidth) * SENSITIVITY * video.duration;
      targetTimeRef.current = Math.max(
        0,
        Math.min(video.duration, targetTimeRef.current + timeOffset)
      );

      if (!seekingRef.current) {
        seekingRef.current = true;
        video.currentTime = targetTimeRef.current;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSeeked = () => {
    const video = videoRef.current;
    if (!video) return;
    if (Math.abs(video.currentTime - targetTimeRef.current) > 0.01) {
      video.currentTime = targetTimeRef.current;
    } else {
      seekingRef.current = false;
    }
  };

  /* ── menu state ─────────────────────────────────────────────── */
  const [menuOpen, setMenuOpen] = useState(false);

  /* ── pill visibility ────────────────────────────────────────── */
  const [pillsVisible, setPillsVisible] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setPillsVisible(true), 400);
    return () => clearTimeout(t);
  }, []);

  /* ── typewriter ─────────────────────────────────────────────── */
  const { displayed, done } = useTypewriter(
    "Ready to learn something new? Upload your documents and we'll build you a structured course — complete with quizzes and cheat sheets.",
    38,
    600
  );

  /* ── ref for scrolling to content ───────────────────────────── */
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* ── copy email ─────────────────────────────────────────────── */
  const handleCopyEmail = () => {
    navigator.clipboard.writeText("hello@learnsync.ai");
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      style={{ fontFamily: "var(--font-body)" }}
    >
      {/* ── BACKGROUND VIDEO (fixed, mouse-scrub) ──────────────── */}
      <video
        ref={videoRef}
        className="pointer-events-none"
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          objectPosition: "70% center",
          zIndex: 0,
        }}
        src={VIDEO_SRC}
        muted
        playsInline
        preload="auto"
        onSeeked={handleSeeked}
      />

      {/* ── NAVBAR (fixed, z-10) ───────────────────────────────── */}
      <nav
        className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5"
        style={{ fontFamily: "var(--font-body)" }}
      >
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3">
          <span
            className="text-[21px] sm:text-[26px] tracking-tight text-black"
            style={{ fontFamily: "var(--font-heading)" }}
          >
            LearnSync AI®
          </span>
          <span
            className="text-[25px] sm:text-[30px] text-black select-none"
            style={{ letterSpacing: "-0.02em" }}
          >
            ✳︎
          </span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden md:flex items-center text-[23px] text-black">
          {NAV_LINKS.map((link, i) => (
            <span key={link.label}>
              {i > 0 && <span>, </span>}
              <Link
                href={link.href}
                className="hover:opacity-60 transition-opacity"
              >
                {link.label}
              </Link>
            </span>
          ))}
        </div>

        {/* Desktop CTA */}
        <Link
          href="/interview"
          className="hidden md:block text-[23px] text-black underline underline-offset-2 hover:opacity-60 transition-opacity"
        >
          Get in touch
        </Link>

        {/* Mobile hamburger */}
        <button
          onClick={() => setMenuOpen((p) => !p)}
          className="flex flex-col gap-[5px] md:hidden"
          aria-label="Toggle menu"
        >
          <span
            className="block w-6 h-[2px] bg-black transition-all duration-300"
            style={{
              transform: menuOpen
                ? "rotate(45deg) translateY(7px)"
                : "none",
            }}
          />
          <span
            className="block w-6 h-[2px] bg-black transition-all duration-300"
            style={{ opacity: menuOpen ? 0 : 1 }}
          />
          <span
            className="block w-6 h-[2px] bg-black transition-all duration-300"
            style={{
              transform: menuOpen
                ? "rotate(-45deg) translateY(-7px)"
                : "none",
            }}
          />
        </button>
      </nav>

      {/* ── MOBILE OVERLAY (z-9) ───────────────────────────────── */}
      <div
        className="fixed inset-0 bg-white/95 backdrop-blur-sm flex flex-col justify-center px-8 gap-8 md:hidden transition-opacity duration-300"
        style={{
          zIndex: 9,
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
        }}
      >
        {NAV_LINKS.map((link) => (
          <Link
            key={link.label}
            href={link.href}
            onClick={() => setMenuOpen(false)}
            className="text-[32px] font-medium text-black hover:opacity-60 transition-opacity"
          >
            {link.label}
          </Link>
        ))}
        <Link
          href="/interview"
          onClick={() => setMenuOpen(false)}
          className="text-[32px] font-medium text-black underline underline-offset-2 hover:opacity-60 transition-opacity"
        >
          Get in touch
        </Link>
      </div>

      {/* ── HERO SECTION (z-1) ─────────────────────────────────── */}
      <section
        className="relative h-screen flex flex-col justify-end pb-12 md:justify-center md:pb-0 px-5 sm:px-8 md:px-10 overflow-hidden"
        style={{ zIndex: 1 }}
      >
        <div className="max-w-xl relative z-10">
          {/* Blurred intro label */}
          <div
            className="pointer-events-none select-none mb-5 sm:mb-6"
            style={{
              fontSize: "clamp(18px, 4vw, 26px)",
              lineHeight: 1.3,
              fontWeight: 400,
              color: "#000",
              filter: "blur(4px)",
            }}
          >
            Hey there, meet L.E.A.R.N,
            <br />
            LearnSync&apos;s AI-powered Course Engine
          </div>

          {/* Typewriter text */}
          <p
            className="text-black mb-5 sm:mb-6"
            style={{
              fontSize: "clamp(18px, 4vw, 26px)",
              lineHeight: 1.35,
              fontWeight: 400,
              minHeight: 54,
            }}
          >
            {displayed}
            {!done && (
              <span
                className="inline-block w-[2px] h-[1.1em] bg-black align-middle ml-[2px]"
                style={{ animation: "blink 1s step-end infinite" }}
              />
            )}
          </p>

          {/* Action pill buttons */}
          <div
            className="flex flex-wrap gap-y-1"
            style={{
              opacity: pillsVisible ? 1 : 0,
              transform: pillsVisible
                ? "translateY(0)"
                : "translateY(8px)",
              transition: "opacity 0.4s ease, transform 0.4s ease",
            }}
          >
            {PILL_BUTTONS.map((label) => (
              <button
                key={label}
                onClick={scrollToContent}
                className="inline-flex items-center justify-center bg-white text-black border border-black/10 rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap hover:bg-black hover:text-white transition-colors duration-200"
              >
                {label}
              </button>
            ))}
            <button
              onClick={handleCopyEmail}
              className="inline-flex items-center justify-center text-white bg-transparent border border-white rounded-full text-[13px] sm:text-[15px] px-4 sm:px-5 py-[0.3em] mx-[0.2em] mb-[0.4em] whitespace-nowrap gap-2 sm:gap-3 hover:bg-white hover:text-black transition-colors duration-200"
            >
              <span>
                Reach us:{" "}
                <span className="underline underline-offset-1">
                  hello@learnsync.ai
                </span>
              </span>
              {/* Copy icon */}
              <svg
                width={12}
                height={12}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="9" y="9" width="13" height="13" rx="2" />
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
              </svg>
            </button>
          </div>
        </div>
      </section>

      {/* ── COURSES CONTENT SECTION ────────────────────────────── */}
      <section
        ref={contentRef}
        className="relative bg-white min-h-screen"
        style={{ zIndex: 2 }}
      >
        <div className="max-w-4xl mx-auto px-5 py-16 sm:px-8 md:px-10 space-y-12">
          {/* Upload */}
          <div>
            <h2
              className="text-3xl font-bold mb-6 text-gray-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Upload Document
            </h2>
            <UploadZone onUploadComplete={handleUploadComplete} />
            {processingDocId && (
              <div className="mt-4">
                <ProcessingStatus
                  documentId={processingDocId}
                  onReady={handleDocReady}
                />
              </div>
            )}
          </div>

          {/* Documents */}
          <div>
            <h2
              className="text-3xl font-bold mb-6 text-gray-900"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              Your Documents
            </h2>
            {loading ? (
              <p className="text-gray-500">Loading documents...</p>
            ) : error ? (
              <p className="text-red-500">{error}</p>
            ) : documents.length === 0 ? (
              <p className="text-gray-500 italic">
                No documents uploaded yet. Upload a PDF above to get started.
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                {documents.map((doc) => (
                  <DocumentCard
                    key={doc.id}
                    document={doc}
                    onGenerateCourse={handleGenerateCourse}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
