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
            setAnswerText(prev => prev ? prev + ' ' + finalTranscript : finalTranscript);
          }
        };

        recognition.onerror = (event: any) => {
          console.error('Speech recognition error', event.error);
          setRecognitionError(event.error);
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
    
    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      setRecognitionError(null);
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start recognition', err);
      }
    }
  };

  const readQuestion = () => {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      setIsSpeaking(true);
      const utterance = new SpeechSynthesisUtterance(currentQuestion);
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() || isSubmitting) return;

    // Stop listening if it was on
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    setIsSubmitting(true);
    setLastEvaluation(null);
    
    try {
      const res = await submitInterviewTurn(sessionId, answerText);
      
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
    } catch (err: any) {
      alert(err.message || 'Failed to submit answer');
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
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[80vh]">
      {/* Main interaction area */}
      <div className="md:col-span-2 flex flex-col border rounded-xl overflow-hidden bg-white dark:bg-gray-900 dark:border-gray-800">
        
        {/* Header */}
        <div className="p-4 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 flex justify-between items-center">
          <h2 className="text-xl font-bold">Interview Session</h2>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${difficultyColors[currentDifficulty] || 'bg-blue-100 text-blue-800'}`}>
            Level: {currentDifficulty}
          </span>
        </div>

        {/* Evaluation Banner (shows briefly after answer) */}
        {lastEvaluation && (
          <div className="p-4 bg-blue-50 border-b border-blue-100 dark:bg-blue-900/20 dark:border-blue-900">
            <h3 className="font-semibold text-blue-800 dark:text-blue-300">Previous Answer Evaluation (Score: {lastEvaluation.score}/5)</h3>
            <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">{lastEvaluation.feedback}</p>
          </div>
        )}

        {/* Q&A Area */}
        <div className="flex-1 p-6 flex flex-col justify-center space-y-6 overflow-y-auto">
          <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-xl relative">
            <p className="text-xl font-medium leading-relaxed">{currentQuestion}</p>
            {speechSupported && (
              <button 
                onClick={readQuestion}
                disabled={isSpeaking}
                className="absolute top-4 right-4 text-gray-400 hover:text-blue-500 transition-colors disabled:opacity-50"
                title="Read aloud"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
            )}
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          {!speechSupported && (
            <p className="text-xs text-orange-500 mb-2">Voice input is not supported in this browser. Please type your answer.</p>
          )}
          {recognitionError && (
            <p className="text-xs text-red-500 mb-2">Voice error: {recognitionError}. Please type your answer.</p>
          )}
          
          <form onSubmit={handleSubmit} className="relative flex flex-col gap-3">
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-32 p-4 border rounded-lg bg-white dark:bg-gray-900 focus:ring-2 focus:ring-blue-500 resize-none dark:border-gray-700"
              disabled={isSubmitting}
            />
            <div className="flex justify-between items-center">
              {speechSupported ? (
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isSubmitting}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                    isListening 
                      ? 'bg-red-100 text-red-600 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-300'
                  }`}
                >
                  <svg className="w-5 h-5" fill={isListening ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  {isListening ? 'Stop Listening' : 'Speak'}
                </button>
              ) : (
                <div /> // Spacer
              )}
              
              <button
                type="submit"
                disabled={isSubmitting || !answerText.trim()}
                className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* History Sidebar */}
      <div className="border rounded-xl bg-white dark:bg-gray-900 dark:border-gray-800 overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50">
          <h3 className="font-bold">Turn History</h3>
          <p className="text-sm text-gray-500">Previous questions & scores</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm italic text-center mt-10">No questions answered yet.</p>
          ) : (
            history.map((turn, i) => (
              <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-100 dark:border-gray-700">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase">Q{i + 1}</span>
                  <div className="flex gap-2">
                    <span className="text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded">{turn.difficulty}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                      turn.score >= 4 ? 'bg-green-100 text-green-700' :
                      turn.score >= 3 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {turn.score}/5
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium line-clamp-2" title={turn.question}>{turn.question}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
