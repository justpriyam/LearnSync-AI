'use client';

import React, { useState, useEffect, useRef } from 'react';
import { submitInterviewTurn } from '@/lib/api';
import { InterviewTurnResponse } from '@/lib/types';

interface InterviewSessionProps {
  sessionId: string;
  openingQuestion: string;
  initialDifficulty: string;
  onComplete: () => void;
}

interface TurnHistory {
  question: string;
  answer: string;
  score: number;
  difficulty: string;
}

export default function InterviewSession({
  sessionId,
  openingQuestion,
  initialDifficulty,
  onComplete
}: InterviewSessionProps) {
  const [currentQuestion, setCurrentQuestion] = useState(openingQuestion);
  const [currentDifficulty, setCurrentDifficulty] = useState(initialDifficulty);
  const [answerText, setAnswerText] = useState('');
  const [history, setHistory] = useState<TurnHistory[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastEvaluation, setLastEvaluation] = useState<InterviewTurnResponse['evaluation'] | null>(null);
  
  // Speech API states
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    // Check speech support
    if (typeof window !== 'undefined') {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (!SpeechRecognition) {
        setSpeechSupported(false);
      } else {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onresult = (event: any) => {
          let finalTranscript = '';
          let interimTranscript = '';
          
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            } else {
              interimTranscript += event.results[i][0].transcript;
            }
          }
          
          if (finalTranscript) {
            setAnswerText(prev => prev ? `${prev} ${finalTranscript}` : finalTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error:', event.error);
          setRecognitionError(`Mic error: ${event.error}`);
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    setRecognitionError(null);

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition:', err);
      }
    }
  };

  const speakText = (text: string) => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  const handleSubmit = async () => {
    if (!answerText.trim() || isSubmitting) return;
    
    if (isListening) {
      toggleListening();
    }
    stopSpeaking();

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await submitInterviewTurn(sessionId, answerText.trim());
      
      setHistory(prev => [...prev, {
        question: currentQuestion,
        answer: answerText,
        score: res.evaluation.score,
        difficulty: currentDifficulty
      }]);
      
      setLastEvaluation(res.evaluation);
      setAnswerText('');

      if (res.is_session_complete) {
        setTimeout(() => {
          onComplete();
        }, 3000); // Give user a moment to see the final evaluation
      } else {
        if (res.next_question) {
          setCurrentQuestion(res.next_question);
          setCurrentDifficulty(res.difficulty_level);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit answer';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const difficultyColors: Record<string, string> = {
    'foundational': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    'intermediate': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
    'advanced': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-auto md:h-[80vh]">
      {/* Main interaction area */}
      <div className="md:col-span-2 flex flex-col border rounded-2xl overflow-hidden bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800 shadow-xs">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <h2 className="text-base sm:text-lg font-bold text-gray-900 dark:text-gray-100">Live Mock Session</h2>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider ${difficultyColors[currentDifficulty] || 'bg-blue-100 text-blue-800'}`}>
            {currentDifficulty}
          </span>
        </div>

        {/* Question Area */}
        <div className="p-6 bg-gradient-to-b from-blue-50/50 to-transparent dark:from-blue-950/20 flex-1 overflow-y-auto">
          <div className="flex justify-between items-start gap-4">
            <div className="flex-1">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 block mb-1">
                Mentor Question (Turn {history.length + 1})
              </span>
              <p className="text-lg sm:text-xl font-medium text-gray-900 dark:text-gray-100 leading-relaxed">
                {currentQuestion}
              </p>
            </div>
            
            <button
              onClick={() => isSpeaking ? stopSpeaking() : speakText(currentQuestion)}
              className={`p-2.5 rounded-full transition-all shrink-0 ${
                isSpeaking 
                  ? 'bg-blue-600 text-white shadow-md ring-4 ring-blue-100 dark:ring-blue-900/50' 
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={isSpeaking ? "Stop Speaking" : "Read Aloud"}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
          </div>

          {/* Last Evaluation Alert */}
          {lastEvaluation && (
            <div className="mt-6 p-4 rounded-xl border border-blue-200 dark:border-blue-800 bg-white/80 dark:bg-gray-800/80 shadow-xs">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold uppercase text-gray-500">Previous Answer Score</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200">
                  {lastEvaluation.score} / 5
                </span>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">{lastEvaluation.feedback}</p>
            </div>
          )}
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 space-y-3">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-900 rounded-lg text-red-600 dark:text-red-400 text-sm">
              {error}
            </div>
          )}

          {recognitionError && (
            <p className="text-xs text-amber-600 dark:text-amber-400">{recognitionError}</p>
          )}

          <div className="relative">
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your response or click the microphone to speak..."
              rows={3}
              className="w-full p-3.5 pr-14 border rounded-xl bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:outline-hidden text-sm resize-none"
            />
            
            {speechSupported && (
              <button
                type="button"
                onClick={toggleListening}
                className={`absolute right-3 bottom-3 p-2.5 rounded-full transition-all ${
                  isListening 
                    ? 'bg-red-500 text-white animate-pulse shadow-md ring-4 ring-red-100 dark:ring-red-900/50' 
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-300'
                }`}
                title={isListening ? "Stop Recording" : "Speak Answer"}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </button>
            )}
          </div>

          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-400">
              {isListening ? '🎙️ Listening... speak clearly' : 'Type or speak your answer'}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!answerText.trim() || isSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Evaluating...</span>
                </>
              ) : (
                <>
                  <span>Submit Answer</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* History timeline sidebar */}
      <div className="border rounded-2xl p-4 bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-800 flex flex-col h-[80vh]">
        <h3 className="font-bold text-base mb-4 text-gray-900 dark:text-gray-100 flex items-center justify-between pb-2 border-b border-gray-200 dark:border-gray-800">
          <span>Session Timeline</span>
          <span className="text-xs font-normal text-gray-500">{history.length} turns</span>
        </h3>
        
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {history.length === 0 ? (
            <p className="text-gray-400 text-xs italic text-center mt-12">
              Your answered questions and feedback will appear here as you progress.
            </p>
          ) : (
            history.map((item, idx) => (
              <div key={idx} className="p-3 bg-white dark:bg-gray-800/80 rounded-xl border border-gray-200 dark:border-gray-700/60 shadow-xs space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-bold text-gray-500">Q{idx + 1}</span>
                  <span className="font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950 px-2 py-0.5 rounded-md">
                    {item.score} / 5
                  </span>
                </div>
                <p className="text-xs font-medium text-gray-800 dark:text-gray-200 line-clamp-2">{item.question}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic">“{item.answer}”</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
