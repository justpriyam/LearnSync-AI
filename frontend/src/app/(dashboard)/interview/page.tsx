"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { createTextDocument, getDocumentStatus, startInterview } from "@/lib/api";
import { InterviewStartResponse } from "@/lib/types";
import UploadZone from "@/components/UploadZone";
import ProcessingStatus from "@/components/ProcessingStatus";
import InterviewSession from "@/components/InterviewSession";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Sprint Planner", href: "/sprint" },
  { label: "Mock Interview", href: "/interview" },
];

export default function InterviewPage() {
  const router = useRouter();

  // interview state
  const [resumeDocId, setResumeDocId] = useState<string | null>(null);
  const [jdDocId, setJdDocId] = useState<string | null>(null);
  const [resumeReady, setResumeReady] = useState(false);
  const [jdReady, setJdReady] = useState(false);
  const [jdInputMode, setJdInputMode] = useState<"pdf" | "text">("pdf");
  const [jdText, setJdText] = useState("");
  
  const [isCreatingJd, setIsCreatingJd] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  
  const [sessionInfo, setSessionInfo] = useState<InterviewStartResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // nav state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleStart = async () => {
    if (!resumeDocId || !jdDocId || !resumeReady || !jdReady) return;
    
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const unlockUtterance = new SpeechSynthesisUtterance(" ");
      unlockUtterance.volume = 0;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(unlockUtterance);
    }
    
    setIsStarting(true);
    setError(null);
    try {
      const res = await startInterview(resumeDocId, jdDocId);
      setSessionInfo(res);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to start interview");
    } finally {
      setIsStarting(false);
    }
  };

  const handleJdTextSubmit = async () => {
    if (jdText.trim().length < 20 || isCreatingJd) return;
    setIsCreatingJd(true);
    setError(null);
    try {
      const doc = await createTextDocument(jdText);
      setJdDocId(doc.id);
      await waitForDocument(doc.id, setJdReady);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to process job description");
    } finally {
      setIsCreatingJd(false);
    }
  };

  const waitForDocument = async (documentId: string, setReady: (ready: boolean) => void) => {
    for (let attempt = 0; attempt < 90; attempt += 1) {
      const status = await getDocumentStatus(documentId);
      if (status.status === "ready") {
        setReady(true);
        return;
      }
      if (status.status === "failed") {
        throw new Error(status.error_message || "Document processing failed");
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
    throw new Error("Document processing timed out. Please try again.");
  };

  const handleResumeUpload = async (doc: { id: string }) => {
    setResumeDocId(doc.id);
    setResumeReady(false);
    try {
      await waitForDocument(doc.id, setResumeReady);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to process resume");
      setResumeDocId(null);
    }
  };

  const handleJdUpload = async (doc: { id: string }) => {
    setJdDocId(doc.id);
    setJdReady(false);
    try {
      await waitForDocument(doc.id, setJdReady);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to process job description");
      setJdDocId(null);
    }
  };

  const handleComplete = () => {
    if (sessionInfo) {
      router.push(`/interview/${sessionInfo.session_id}/report`);
    }
  };

  if (sessionInfo) {
    return (
      <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-16">
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
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans">
      {/* NAVBAR */}
      <nav className="flex items-center justify-between px-6 py-5 md:px-12 bg-white border-b border-gray-200">
        <Link href="/" className="text-xl font-semibold tracking-tight text-indigo-600">
          LearnSync AI
        </Link>
        <div className="hidden md:flex items-center gap-6">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="text-gray-600 hover:text-indigo-600 font-medium transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden">
          {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 p-4 flex flex-col gap-4 shadow-sm">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} onClick={() => setMobileMenuOpen(false)} className="text-lg font-medium text-gray-800">
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {/* HEADER SECTION */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-16 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">
            AI Mock Interviewer
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Upload your resume and the job description, and practice your technical and behavioral skills with our adaptive AI interviewer.
          </p>
        </div>
      </section>

      {/* SETUP CONTENT */}
      <div className="max-w-3xl mx-auto px-6 py-12 space-y-8">
        {error && (
          <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
            {error}
          </div>
        )}

        {/* STEP 1: RESUME */}
        <section className={`border rounded-xl p-6 md:p-8 ${resumeDocId ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"}`}>
          <h2 className="text-2xl font-bold mb-4 flex items-center justify-between">
            Step 1: Upload Resume
            {resumeDocId && <span className="text-green-600 text-sm font-semibold">✓ Ready</span>}
          </h2>
          {!resumeDocId ? (
            <UploadZone onUploadComplete={handleResumeUpload} />
          ) : (
            <p className="text-gray-700">Resume {resumeReady ? "ready" : "processing..."}. ID: <code className="bg-white px-1 py-0.5 rounded border border-gray-200 text-sm">{resumeDocId}</code></p>
          )}
        </section>

        {/* STEP 2: JOB DESCRIPTION */}
        <section className={`border rounded-xl overflow-hidden ${jdDocId ? "border-green-300 bg-green-50" : "border-gray-200 bg-white"} ${!resumeDocId ? "opacity-50 pointer-events-none" : ""}`}>
          <div className="p-6 md:p-8 border-b border-gray-100">
            <h2 className="text-2xl font-bold flex items-center justify-between">
              Step 2: Job Description
              {jdDocId && <span className="text-green-600 text-sm font-semibold">✓ Ready</span>}
            </h2>
          </div>

          {!jdDocId ? (
            <>
              <div className="flex border-b border-gray-200 bg-gray-50">
                <button
                  onClick={() => setJdInputMode('pdf')}
                  className={`flex-1 py-3 font-medium text-sm transition-colors ${jdInputMode === 'pdf' ? 'bg-white text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600'}`}
                >
                  Upload PDF
                </button>
                <button
                  onClick={() => setJdInputMode('text')}
                  className={`flex-1 py-3 font-medium text-sm transition-colors ${jdInputMode === 'text' ? 'bg-white text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600'}`}
                >
                  Paste Text
                </button>
              </div>

              <div className="p-6 md:p-8">
                {jdInputMode === 'pdf' && (
                  <UploadZone onUploadComplete={handleJdUpload} />
                )}

                {jdInputMode === 'text' && (
                  <div className="space-y-4">
                    <textarea
                      value={jdText}
                      onChange={(e) => setJdText(e.target.value)}
                      placeholder="Paste the job description or requirements here..."
                      className="w-full h-40 p-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none resize-none bg-white"
                    />
                    <button
                      onClick={handleJdTextSubmit}
                      disabled={jdText.trim().length < 20 || isCreatingJd}
                      className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium transition-colors"
                    >
                      {isCreatingJd ? "Processing..." : "Use this text"}
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="p-6 md:p-8">
              <p className="text-gray-700">Job description attached. ID: <code className="bg-white px-1 py-0.5 rounded border border-gray-200 text-sm">{jdDocId}</code></p>
            </div>
          )}
        </section>

        {/* START BUTTON */}
        <button
          onClick={handleStart}
          disabled={!resumeDocId || !jdDocId || !resumeReady || !jdReady || isStarting}
          className="w-full py-5 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xl font-bold rounded-xl shadow-lg transition-colors flex justify-center items-center gap-3 mt-8"
        >
          🎤 {isStarting ? "Preparing Session..." : "Start Mock Interview"}
        </button>
      </div>
    </div>
  );
}
