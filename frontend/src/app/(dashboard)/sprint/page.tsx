"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { listDocuments, generateSprint, generateSprintFromTopic } from "@/lib/api";
import { DocumentResponse, DocumentStatusResponse } from "@/lib/types";
import UploadZone from "@/components/UploadZone";
import ProcessingStatus from "@/components/ProcessingStatus";
import DocumentCard from "@/components/DocumentCard";

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Courses", href: "/courses" },
  { label: "Sprint Planner", href: "/sprint" },
  { label: "Mock Interview", href: "/interview" },
];

export default function SprintPage() {
  const router = useRouter();

  // Tabs
  const [activeTab, setActiveTab] = useState<'quick' | 'advanced'>('quick');

  // Quick mode state
  const [topicName, setTopicName] = useState("");
  const [quickDeadline, setQuickDeadline] = useState("");
  const [quickHours, setQuickHours] = useState(4);
  const [generatingQuick, setGeneratingQuick] = useState(false);
  const [quickError, setQuickError] = useState<string | null>(null);

  // Advanced mode state
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [documentsError, setDocumentsError] = useState<string | null>(null);
  const [syllabusDocId, setSyllabusDocId] = useState<string | null>(null);
  const [pyqDocId, setPyqDocId] = useState<string | null>(null);
  const [processingPyqId, setProcessingPyqId] = useState<string | null>(null);
  const [processingSyllabusId, setProcessingSyllabusId] = useState<string | null>(null);
  const [deadline, setDeadline] = useState<string>("");
  const [availableHoursPerDay, setAvailableHoursPerDay] = useState(4);
  const [supportingFile, setSupportingFile] = useState<File | null>(null);
  const [generatingAdvanced, setGeneratingAdvanced] = useState(false);
  const [advancedError, setAdvancedError] = useState<string | null>(null);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const readyDocuments = useMemo(() => documents.filter((d) => d.status === "ready"), [documents]);

  const minDate = useMemo(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split("T")[0];
  }, []);

  const fetchDocs = useCallback(async () => {
    try {
      setLoadingDocs(true);
      setDocumentsError(null);
      const docs = await listDocuments();
      setDocuments(docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
    } catch (err: unknown) {
      setDocumentsError(err instanceof Error ? err.message : "Failed to load documents");
    } finally {
      setLoadingDocs(false);
    }
  }, []);

  useEffect(() => {
    if (activeTab === 'advanced') {
      fetchDocs();
    }
  }, [activeTab, fetchDocs]);

  const handlePyqUploadComplete = (doc: DocumentResponse) => {
    setDocuments((prev) => [doc, ...prev]);
    setProcessingPyqId(doc.id);
  };

  const handlePyqReady = (statusDoc: DocumentStatusResponse) => {
    setDocuments((prev) => prev.map((d) => (d.id === statusDoc.id ? ({ ...d, ...statusDoc } as DocumentResponse) : d)));
    setProcessingPyqId(null);
    if (statusDoc.status === "ready") setPyqDocId(statusDoc.id);
  };

  const handleSyllabusUploadComplete = (doc: DocumentResponse) => {
    setDocuments((prev) => [doc, ...prev]);
    setProcessingSyllabusId(doc.id);
  };

  const handleSyllabusReady = (statusDoc: DocumentStatusResponse) => {
    setDocuments((prev) => prev.map((doc) => (doc.id === statusDoc.id ? ({ ...doc, ...statusDoc } as DocumentResponse) : doc)));
    setProcessingSyllabusId(null);
    if (statusDoc.status === "ready") setSyllabusDocId(statusDoc.id);
  };

  const handleGenerateQuick = async () => {
    if (!topicName.trim() || !quickDeadline) return;
    setQuickError(null);
    try {
      setGeneratingQuick(true);
      const res = await generateSprintFromTopic(topicName, quickDeadline, quickHours);
      router.push(`/sprint/${res.id}`);
    } catch (err: unknown) {
      setQuickError(err instanceof Error ? err.message : "Failed to generate quick sprint");
      setGeneratingQuick(false);
    }
  };

  const handleGenerateAdvanced = async () => {
    if (!syllabusDocId || !pyqDocId || !deadline) return;
    setAdvancedError(null);
    try {
      setGeneratingAdvanced(true);
      const res = await generateSprint(syllabusDocId, pyqDocId, deadline, availableHoursPerDay, supportingFile);
      router.push(`/sprint/${res.id}`);
    } catch (err: unknown) {
      setAdvancedError(err instanceof Error ? err.message : "Failed to generate advanced sprint");
      setGeneratingAdvanced(false);
    }
  };

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

      {/* HERO SECTION */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-16 border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-gray-900 mb-6">
            Sprint Planner
          </h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">
            Generate an optimized study plan based on your topics, syllabus, and previous year questions (PYQs). Let AI organize your success.
          </p>
        </div>
      </section>

      {/* PLANNER TABS */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('quick')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'quick' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Quick Mode
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`flex-1 py-4 text-center font-medium transition-colors ${activeTab === 'advanced' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Advanced Mode
            </button>
          </div>

          <div className="p-6 md:p-8">
            {activeTab === 'quick' && (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">Quick Sprint Plan</h2>
                {quickError && (
                  <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                    {quickError}
                  </div>
                )}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic / Subject</label>
                  <input
                    type="text"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    placeholder="e.g. Data Structures and Algorithms"
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Target Exam Date</label>
                    <input
                      type="date"
                      min={minDate}
                      value={quickDeadline}
                      onChange={(e) => setQuickDeadline(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Hours available per day</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      value={quickHours}
                      onChange={(e) => setQuickHours(Number(e.target.value) || 1)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
                    />
                  </div>
                </div>
                <button
                  onClick={handleGenerateQuick}
                  disabled={!topicName.trim() || !quickDeadline || generatingQuick}
                  className="w-full mt-4 bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {generatingQuick ? "Generating Plan..." : "Generate Sprint Plan"}
                </button>
              </div>
            )}

            {activeTab === 'advanced' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Advanced Plan via Documents</h2>
                {advancedError && (
                  <div className="p-4 bg-red-50 text-red-700 border border-red-200 rounded-lg">
                    {advancedError}
                  </div>
                )}
                
                {/* Step 1 */}
                <section className={`border rounded-xl p-5 ${syllabusDocId ? "border-green-300 bg-green-50" : "border-gray-200"}`}>
                  <h3 className="font-semibold mb-3 flex justify-between">
                    Step 1: Syllabus Document
                    {syllabusDocId && <span className="text-green-600 text-sm">✓ Selected</span>}
                  </h3>
                  {loadingDocs ? (
                    <p className="text-gray-600 text-sm">Loading documents...</p>
                  ) : documentsError ? (
                    <div className="text-red-600 text-sm"><p>{documentsError}</p><button onClick={fetchDocs} className="underline">Retry</button></div>
                  ) : (
                    <div className="space-y-3">
                      {!syllabusDocId && !processingSyllabusId && <UploadZone onUploadComplete={handleSyllabusUploadComplete} />}
                      {processingSyllabusId && <ProcessingStatus documentId={processingSyllabusId} onReady={handleSyllabusReady} />}
                      {readyDocuments.length > 0 && !syllabusDocId && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Or select existing:</p>
                          <div className="max-h-40 overflow-y-auto space-y-2 pr-2">
                            {readyDocuments.map((doc) => (
                              <div key={doc.id} onClick={() => setSyllabusDocId(doc.id)} className="cursor-pointer hover:bg-gray-50 border border-gray-100 rounded-lg p-2">
                                <p className="text-sm font-medium truncate">{doc.filename}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </section>

                {/* Step 2 */}
                <section className={`border rounded-xl p-5 ${pyqDocId ? "border-green-300 bg-green-50" : "border-gray-200"} ${!syllabusDocId ? "opacity-50 pointer-events-none" : ""}`}>
                  <h3 className="font-semibold mb-3 flex justify-between">
                    Step 2: PYQ Document (Past Papers)
                    {pyqDocId && <span className="text-green-600 text-sm">✓ Selected</span>}
                  </h3>
                  {!pyqDocId && !processingPyqId && <UploadZone onUploadComplete={handlePyqUploadComplete} />}
                  {processingPyqId && <ProcessingStatus documentId={processingPyqId} onReady={handlePyqReady} />}
                </section>

                {/* Step 3 */}
                <section className={`border rounded-xl p-5 ${deadline ? "border-green-300 bg-green-50" : "border-gray-200"} ${!pyqDocId ? "opacity-50 pointer-events-none" : ""}`}>
                  <h3 className="font-semibold mb-3">Step 3: Exam Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Deadline</label>
                      <input type="date" min={minDate} value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-700 mb-1">Hours/day</label>
                      <input type="number" min={1} max={24} value={availableHoursPerDay} onChange={(e) => setAvailableHoursPerDay(Number(e.target.value) || 1)} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                </section>

                <button
                  onClick={handleGenerateAdvanced}
                  disabled={!syllabusDocId || !pyqDocId || !deadline || generatingAdvanced}
                  className="w-full bg-indigo-600 text-white rounded-lg py-3 font-semibold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                >
                  {generatingAdvanced ? "Generating Plan..." : "Generate Sprint Plan"}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
