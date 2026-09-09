"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { listDocuments, generateCourse, generateCourseFromTopic } from "@/lib/api";
import { DocumentResponse, DocumentStatusResponse } from "@/lib/types";
import UploadZone from "@/components/UploadZone";
import ProcessingStatus from "@/components/ProcessingStatus";
import DocumentCard from "@/components/DocumentCard";

const NAV_LINKS = [
  { label: "Courses", href: "/courses" },
  { label: "Sprint Planner", href: "/sprint" },
  { label: "Mock Interview", href: "/interview" },
];

export default function CoursesPage() {
  const [documents, setDocuments] = useState<DocumentResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [processingDocId, setProcessingDocId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  
  // Tabs
  const [activeTab, setActiveTab] = useState<'upload' | 'topic'>('upload');
  
  // Topic generation
  const [topicName, setTopicName] = useState("");
  const [topicDepth, setTopicDepth] = useState("intermediate");
  const [generatingTopic, setGeneratingTopic] = useState(false);

  const router = useRouter();

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const docs = await listDocuments();
      setDocuments(
        docs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      );
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to fetch documents");
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
      prev.map((d) => (d.id === statusDoc.id ? ({ ...d, ...statusDoc } as DocumentResponse) : d))
    );
    setProcessingDocId(null);
  };

  const handleGenerateCourse = async (docId: string) => {
    try {
      const res = await generateCourse(docId);
      router.push(`/courses/${res.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate course");
    }
  };

  const handleGenerateFromTopic = async () => {
    if (!topicName.trim()) return;
    try {
      setGeneratingTopic(true);
      const res = await generateCourseFromTopic(topicName, topicDepth);
      router.push(`/courses/${res.id}`);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to generate course from topic");
      setGeneratingTopic(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900" style={{ fontFamily: "var(--font-body)" }}>
      {/* Navbar */}
      <nav className="flex items-center justify-between px-5 py-4 sm:px-8 sm:py-5 bg-white border-b border-gray-200">
        <Link href="/" className="flex items-center gap-3">
          <span className="text-[21px] sm:text-[26px] tracking-tight text-black font-medium">LearnSync AI®</span>
          <span className="text-[25px] sm:text-[30px] text-black select-none" style={{ letterSpacing: "-0.02em" }}>✳︎</span>
        </Link>
        <div className="hidden md:flex items-center gap-6 text-[18px] text-black">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} className="hover:text-blue-600 transition-colors">
              {link.label}
            </Link>
          ))}
        </div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden">
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
        </button>
      </nav>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-5 py-4 flex flex-col gap-4">
          {NAV_LINKS.map((link) => (
            <Link key={link.label} href={link.href} onClick={() => setMenuOpen(false)} className="text-lg text-black">
              {link.label}
            </Link>
          ))}
        </div>
      )}

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-16 px-5 sm:px-8 border-b border-gray-200">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4">Create Your Next Course</h1>
          <p className="text-lg text-gray-700 max-w-2xl mx-auto">Upload a document or provide a topic, and we'll generate a complete, structured course with lessons, quizzes, and cheat sheets.</p>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-5 py-12 sm:px-8 space-y-12">
        {/* Creation Tabs */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-4 text-center font-medium ${activeTab === 'upload' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Upload PDF
            </button>
            <button
              onClick={() => setActiveTab('topic')}
              className={`flex-1 py-4 text-center font-medium ${activeTab === 'topic' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-gray-600 hover:bg-gray-50'}`}
            >
              Generate from Topic
            </button>
          </div>

          <div className="p-6 sm:p-8">
            {activeTab === 'upload' && (
              <div>
                <h3 className="text-xl font-semibold mb-4">Upload a Document</h3>
                <UploadZone onUploadComplete={handleUploadComplete} />
                {processingDocId && (
                  <div className="mt-4">
                    <ProcessingStatus documentId={processingDocId} onReady={handleDocReady} />
                  </div>
                )}
              </div>
            )}

            {activeTab === 'topic' && (
              <div className="max-w-xl mx-auto space-y-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Topic Name</label>
                  <input
                    type="text"
                    value={topicName}
                    onChange={(e) => setTopicName(e.target.value)}
                    placeholder="e.g. React Hooks, History of Rome, Quantum Physics..."
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Depth</label>
                  <select
                    value={topicDepth}
                    onChange={(e) => setTopicDepth(e.target.value)}
                    className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-gray-900 bg-white"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <button
                  onClick={handleGenerateFromTopic}
                  disabled={!topicName.trim() || generatingTopic}
                  className="w-full bg-indigo-600 text-white rounded-lg py-3 font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {generatingTopic ? "Generating..." : "Generate Course"}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Documents List */}
        <div>
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Your Documents & Courses</h2>
          {loading ? (
            <p className="text-gray-700">Loading documents...</p>
          ) : error ? (
            <div className="text-red-500">
              <p>{error}</p>
              <button onClick={fetchDocs} className="mt-2 underline">Try again</button>
            </div>
          ) : documents.length === 0 ? (
            <p className="text-gray-700 italic">No documents or courses found. Create one above to get started.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {documents.map((doc) => (
                <DocumentCard key={doc.id} document={doc} onGenerateCourse={handleGenerateCourse} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
