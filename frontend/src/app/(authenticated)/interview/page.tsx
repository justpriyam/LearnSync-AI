"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { startInterview } from "@/lib/api";
import { InterviewStartResponse } from "@/lib/types";
import UploadZone from "@/components/UploadZone";
import ProcessingStatus from "@/components/ProcessingStatus";
import InterviewSession from "@/components/InterviewSession";

/* ─── constants ──────────────────────────────────────────────── */
const VIDEO_SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260826_124724_bc041163-d651-425f-aea3-2acc1efc2c96.mp4";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Sprint Planner", href: "/sprint" },
  { label: "Mock Interview", href: "/interview" },
];

const EASING_PRIMARY = "cubic-bezier(.16,1,.3,1)";
const EASING_SOFT = "cubic-bezier(.22,1,.36,1)";

/* ─── Chip icons (filled currentColor blobs) ─────────────────── */
function ResumeIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6zm-1 2.5L17.5 9H13V4.5zM8 13h8v2H8v-2zm0 4h5v2H8v-2z" />
    </svg>
  );
}

function BriefcaseIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20 6h-4V4c0-1.1-.9-2-2-2h-4c-1.1 0-2 .9-2 2v2H4c-1.1 0-2 .9-2 2v11c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-6 0h-4V4h4v2z" />
    </svg>
  );
}

function SparkIcon({ size = 12 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
    </svg>
  );
}

/* ─── Send arrow SVG ──────────────────────────────────────────── */
function SendArrow() {
  return (
    <svg width={12} height={12} viewBox="0 0 24 24" fill="white">
      <path d="M12 4l-1.41 1.41L16.17 11H4v2h12.17l-5.58 5.59L12 20l8-8-8-8z" />
    </svg>
  );
}

/* ─── Component ──────────────────────────────────────────────── */
export default function InterviewPage() {
  const router = useRouter();

  /* ── interview state ────────────────────────────────────────── */
  const [resumeDocId, setResumeDocId] = useState<string | null>(null);
  const [resumeReady, setResumeReady] = useState(false);
  const [jdDocId, setJdDocId] = useState<string | null>(null);
  const [jdReady, setJdReady] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [sessionInfo, setSessionInfo] =
    useState<InterviewStartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleStart = async () => {
    if (!resumeDocId || !jdDocId) return;
    setIsStarting(true);
    setError(null);
    try {
      const res = await startInterview(resumeDocId, jdDocId);
      setSessionInfo(res);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to start interview";
      setError(message);
    } finally {
      setIsStarting(false);
    }
  };

  const handleComplete = () => {
    if (sessionInfo) {
      router.push(`/interview/${sessionInfo.session_id}/report`);
    }
  };

  /* ── scroll ref ─────────────────────────────────────────────── */
  const contentRef = useRef<HTMLDivElement>(null);
  const scrollToContent = () => {
    contentRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  /* ── if session active, show interview (no hero) ────────────── */
  if (sessionInfo) {
    return (
      <div className="relative min-h-[100dvh] overflow-y-auto bg-white">
        <div className="max-w-4xl mx-auto py-8 px-6">
          <InterviewSession
            sessionId={sessionInfo.session_id}
            openingQuestion={sessionInfo.opening_question}
            initialDifficulty={sessionInfo.difficulty_level}
            onComplete={handleComplete}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-[100dvh] overflow-y-auto" style={{ background: "#0a0d12" }}>
      {/* ─────────────────────── HERO VIEWPORT ─────────────────── */}
      <div className="relative h-screen w-full overflow-hidden" style={{ background: "#0a0d12" }}>
        {/* Background video */}
        <video
          className="absolute inset-0 h-full w-full object-cover"
          style={{ objectPosition: "70% center", zIndex: 0 }}
          src={VIDEO_SRC}
          autoPlay
          muted
          loop
          playsInline
        />

        {/* ── HERO CONTENT (z-10) ────────────────────────────── */}
        <div
          className="relative z-10 flex flex-col justify-between px-6 pb-10 pt-8 sm:pb-12 sm:pt-12 md:px-12 md:pb-16 md:pt-16 lg:px-16"
          style={{ height: "calc(100vh - 80px)" }}
        >
          {/* Top: headline */}
          <div className="flex flex-col items-center justify-center flex-1 text-center">
            <h1
              className="text-3xl font-medium leading-[1.1] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl"
              style={{
                letterSpacing: "0.0018em",
                textShadow: "0 2px 22px rgba(0,0,0,.30)",
                animation: `e-focus 1.0s ${EASING_PRIMARY} .30s both`,
              }}
            >
              Ace your next
              <br />
              interview with AI.
            </h1>

            {/* Composer card */}
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-10 w-full sm:mt-12"
              style={{
                maxWidth: "min(100%, 708px)",
                animation: `e-panel .90s ${EASING_PRIMARY} .62s both`,
              }}
            >
              <div
                className="relative rounded-2xl sm:rounded-3xl"
                style={{
                  background: "rgba(41,41,43,.955)",
                  backdropFilter: "blur(26px) saturate(112%)",
                  boxShadow:
                    "inset 0 0 0 1px rgba(214,228,255,.14), 0 22px 60px rgba(0,0,0,.30)",
                  padding: "clamp(15px, 2vw, 24px)",
                }}
              >
                {/* Placeholder text */}
                <p
                  className="truncate text-left"
                  style={{
                    color: "#8B8C8E",
                    fontSize: "clamp(10px, 1.35vw, 14px)",
                    fontWeight: 400,
                    lineHeight: 1.35,
                    letterSpacing: "0.007em",
                    marginBottom: "clamp(20px, 3.2vh, 44px)",
                    animation: `e-populate .50s ${EASING_SOFT} .88s both`,
                  }}
                >
                  Upload your resume and job description to start a mock
                  interview...
                </p>

                {/* Toolbar: chips left, controls right */}
                <div
                  className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-0"
                  style={{
                    animation: `e-populate .50s ${EASING_SOFT} .94s both`,
                  }}
                >
                  {/* Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[
                      {
                        label: "Upload Resume",
                        Icon: ResumeIcon,
                      },
                      {
                        label: "Upload JD",
                        Icon: BriefcaseIcon,
                      },
                      {
                        label: "AI Interview",
                        Icon: SparkIcon,
                      },
                    ].map(({ label, Icon }) => (
                      <button
                        key={label}
                        type="button"
                        onClick={scrollToContent}
                        className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                        style={{
                          height: 30,
                          color: "#909093",
                          background:
                            "linear-gradient(180deg, rgba(255,255,255,.088) 0%, rgba(255,255,255,.050) 45%, rgba(255,255,255,.038) 100%)",
                          border: "1px solid rgba(255,255,255,.05)",
                          fontSize: "clamp(9px, 1.12vw, 12.5px)",
                          letterSpacing: "normal",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "linear-gradient(180deg, rgba(255,255,255,.14), rgba(255,255,255,.07))";
                          e.currentTarget.style.color = "#c8c8cb";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "linear-gradient(180deg, rgba(255,255,255,.088) 0%, rgba(255,255,255,.050) 45%, rgba(255,255,255,.038) 100%)";
                          e.currentTarget.style.color = "#909093";
                        }}
                      >
                        <Icon size={12} />
                        <span style={{ transform: "translateY(1px)" }}>
                          {label}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Right cluster: model label + attach + send */}
                  <div className="flex items-center sm:ml-auto">
                    {/* Model label */}
                    <span
                      className="inline-flex items-center gap-1.5"
                      style={{
                        color: "#98999C",
                        fontSize: "clamp(9.8px, 1.12vw, 12.5px)",
                        fontWeight: 400,
                        letterSpacing: "normal",
                      }}
                    >
                      AI Mentor
                      <svg
                        width={7}
                        height={7}
                        viewBox="0 0 10 6"
                        fill="currentColor"
                      >
                        <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth={1.5} fill="none" />
                      </svg>
                    </span>

                    {/* Attach (paperclip) */}
                    <svg
                      className="transition-colors hover:text-white"
                      style={{
                        color: "#A9AAAD",
                        marginLeft: "clamp(9px, 1.4vw, 20px)",
                        cursor: "pointer",
                      }}
                      width={20}
                      height={20}
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>

                    {/* Send button */}
                    <button
                      type="button"
                      onClick={scrollToContent}
                      className="flex items-center justify-center rounded-full transition-all hover:brightness-[1.07] active:scale-95"
                      style={{
                        width: "clamp(32px, 3.5vw, 38px)",
                        height: "clamp(32px, 3.5vw, 38px)",
                        marginLeft: "clamp(9px, 1.3vw, 18px)",
                        background:
                          "linear-gradient(163deg, #FBBC94 0%, #F49D70 46%, #E88654 100%)",
                        boxShadow: "0 3px 12px rgba(210,110,60,.34)",
                        animation: `e-send .50s ${EASING_PRIMARY} 1.00s both`,
                      }}
                      aria-label="Start interview"
                    >
                      <SendArrow />
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </div>

          {/* Bottom: proof */}
          <div className="flex flex-col items-center gap-4 pt-8">
            <p
              className="text-center text-sm text-white/95"
              style={{
                fontWeight: 480,
                letterSpacing: "0.0065em",
                textShadow: "0 1px 12px rgba(0,0,0,.35)",
                animation: `e-settle-up .55s ${EASING_SOFT} 1.08s both`,
              }}
            >
              AI-powered interview preparation
            </p>
            <div
              className="flex items-center gap-8 text-white/80 sm:gap-12"
              style={{
                animation: `e-settle-up .55s ${EASING_SOFT} 1.16s both`,
              }}
            >
              <span className="text-xs font-medium tracking-wide uppercase opacity-60">
                Resume Analysis
              </span>
              <span className="text-xs font-medium tracking-wide uppercase opacity-60">
                Real-time Feedback
              </span>
              <span className="text-xs font-medium tracking-wide uppercase opacity-60 hidden sm:block">
                Performance Report
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ──────────── INTERVIEW SETUP CONTENT ──────────────────── */}
      <div ref={contentRef} className="relative z-10 bg-white">
        <div className="mx-auto max-w-3xl space-y-8 px-6 py-16 sm:px-8 md:px-10 pb-20">
          <div>
            <h2 className="text-3xl font-bold mb-2 text-gray-900">
              Mock Interview Mentor
            </h2>
            <p className="text-gray-600">
              Practice your interview skills with an AI mentor tailored to your
              resume and the job description.
            </p>
          </div>

          {/* Step 1: Resume Upload */}
          <section
            className={`border rounded-xl p-6 ${
              resumeDocId
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white"
            }`}
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              Step 1: Upload Resume
              {resumeReady && (
                <span className="text-green-600 text-sm font-normal">
                  ✓ Ready
                </span>
              )}
            </h3>
            {!resumeDocId ? (
              <UploadZone
                onUploadComplete={(doc) => setResumeDocId(doc.id)}
              />
            ) : !resumeReady ? (
              <ProcessingStatus
                documentId={resumeDocId}
                onReady={() => setResumeReady(true)}
              />
            ) : (
              <p className="text-sm text-gray-700">
                Resume uploaded and processed successfully.
              </p>
            )}
          </section>

          {/* Step 2: JD Upload */}
          <section
            className={`border rounded-xl p-6 ${
              jdDocId
                ? "border-green-500 bg-green-50"
                : "border-gray-200 bg-white"
            } ${!resumeReady ? "opacity-50 pointer-events-none" : ""}`}
          >
            <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
              Step 2: Upload Job Description (JD)
              {jdReady && (
                <span className="text-green-600 text-sm font-normal">
                  ✓ Ready
                </span>
              )}
            </h3>
            {!jdDocId ? (
              <UploadZone
                onUploadComplete={(doc) => setJdDocId(doc.id)}
              />
            ) : !jdReady ? (
              <ProcessingStatus
                documentId={jdDocId}
                onReady={() => setJdReady(true)}
              />
            ) : (
              <p className="text-sm text-gray-700">
                Job Description uploaded and processed successfully.
              </p>
            )}
          </section>

          {/* Start Button */}
          <section className="pt-4">
            <button
              onClick={handleStart}
              disabled={!resumeReady || !jdReady || isStarting}
              className="w-full py-4 px-6 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-lg font-semibold rounded-xl shadow-sm transition-all flex justify-center items-center gap-2 hover:brightness-[1.1] active:translate-y-px"
              style={{
                background: !resumeReady || !jdReady || isStarting
                  ? undefined
                  : "linear-gradient(163deg, #FBBC94 0%, #F49D70 46%, #E88654 100%)",
                boxShadow: resumeReady && jdReady && !isStarting
                  ? "0 3px 12px rgba(210,110,60,.34)"
                  : undefined,
              }}
            >
              {isStarting ? "Starting Session..." : "Start Mock Interview"}
              {!isStarting && <ArrowRight size={20} />}
            </button>
            {error && (
              <p className="text-red-500 text-center mt-4">{error}</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
