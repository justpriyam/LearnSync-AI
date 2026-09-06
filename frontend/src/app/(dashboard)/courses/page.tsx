"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { listDocuments, generateCourse } from "@/lib/api";
import { DocumentResponse, DocumentStatusResponse } from "@/lib/types";
import UploadZone from "@/components/UploadZone";
import ProcessingStatus from "@/components/ProcessingStatus";
import DocumentCard from "@/components/DocumentCard";

export default function CoursesPage() {
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

  return (
    <div className="space-y-10">
      <section>
        <h2 className="text-2xl font-bold mb-4">Upload Document</h2>
        <UploadZone onUploadComplete={handleUploadComplete} />
        {processingDocId && (
          <div className="mt-4">
            <ProcessingStatus
              documentId={processingDocId}
              onReady={handleDocReady}
            />
          </div>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-bold mb-4">Your Documents</h2>
        {loading ? (
          <p className="text-gray-500">Loading documents...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : documents.length === 0 ? (
          <p className="text-gray-500 italic">No documents uploaded yet.</p>
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
      </section>
    </div>
  );
}
