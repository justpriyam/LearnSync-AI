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
  const [started, setStarted] = useState(false);
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

  const speakWithPremiumVoice = async (text: string) => {
    setIsSpeaking(true);
    try {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      
      const contentType = response.headers.get('content-type');
      if (response.ok && contentType && contentType.includes('audio/mpeg')) {
        const blob = await response.blob();
        const audio = new Audio(URL.createObjectURL(blob));
        audio.onended = () => setIsSpeaking(false);
        audio.play();
        return;
      }
    } catch (e) {
      console.error("Premium voice failed, falling back to Web Speech", e);
    }

    // Fallback to Web Speech API
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      // Try to find a good Google voice
      const voices = window.speechSynthesis.getVoices();
      const googleVoice = voices.find(v => v.name.includes('Google'));
      if (googleVoice) utterance.voice = googleVoice;
      
      utterance.onend = () => setIsSpeaking(false);
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(utterance);
    } else {
      setIsSpeaking(false);
    }
  };

  useEffect(() => {
    if (started && currentQuestion) {
      speakWithPremiumVoice(currentQuestion);
    }
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [currentQuestion, started]);

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
          for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
              finalTranscript += event.results[i][0].transcript;
            }
          }
          if (finalTranscript) {
            setAnswerText(prev => prev ? prev + ' ' + finalTranscript : finalTranscript);
          }
        };

        recognition.onerror = (event: any) => {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answerText.trim() || isSubmitting) return;

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
        }, 3000); 
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
    'foundational': 'bg-green-100 text-green-800',
    'intermediate': 'bg-yellow-100 text-yellow-800',
    'advanced': 'bg-red-100 text-red-800'
  };

  if (!started) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mb-4 shadow-sm">
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" /></svg>
        </div>
        <h2 className="text-3xl font-bold text-gray-900">Ready to begin?</h2>
        <p className="text-gray-600 max-w-md text-center">
          The interviewer will speak the questions out loud. Ensure your volume is up.
        </p>
        <button
          onClick={() => setStarted(true)}
          className="mt-8 px-8 py-4 bg-indigo-600 text-white rounded-xl font-bold text-xl hover:bg-indigo-700 transition-colors shadow-lg"
        >
          Start Interview
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[80vh]">
      {/* Main interaction area */}
      <div className="md:col-span-2 flex flex-col border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
        
        {/* Header */}
        <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-gray-900">Interview Session</h2>
            <span className="text-sm text-gray-500 font-medium">Question {history.length + 1}</span>
          </div>
          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${difficultyColors[currentDifficulty] || 'bg-blue-100 text-blue-800'}`}>
            Level: {currentDifficulty}
          </span>
        </div>

        {/* Evaluation Banner */}
        {lastEvaluation && (
          <div className="p-4 bg-indigo-50 border-b border-indigo-100">
            <h3 className="font-semibold text-indigo-800">Previous Answer Evaluation (Score: {lastEvaluation.score}/5)</h3>
            <p className="text-sm text-indigo-700 mt-1">{lastEvaluation.feedback}</p>
          </div>
        )}

        {/* Q&A Area */}
        <div className="flex-1 p-6 flex flex-col justify-center space-y-6 overflow-y-auto bg-white">
          <div className="bg-gray-50 p-6 rounded-xl relative border border-gray-100 shadow-inner">
            <p className="text-xl font-medium leading-relaxed text-gray-900">{currentQuestion}</p>
            <button 
              onClick={() => speakWithPremiumVoice(currentQuestion)}
              disabled={isSpeaking}
              className="absolute top-4 right-4 text-indigo-600 hover:text-indigo-800 transition-colors disabled:opacity-50 bg-indigo-100 p-2 rounded-full"
              title="Replay Audio"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          {!speechSupported && <p className="text-xs text-orange-500 mb-2">Voice input is not supported in this browser. Please type your answer.</p>}
          {recognitionError && <p className="text-xs text-red-500 mb-2">Voice error: {recognitionError}. Please type your answer.</p>}
          
          <form onSubmit={handleSubmit} className="relative flex flex-col gap-3">
            <textarea
              value={answerText}
              onChange={(e) => setAnswerText(e.target.value)}
              placeholder="Type your answer here..."
              className="w-full h-32 p-4 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500 resize-none outline-none text-gray-900"
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
                      ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                      : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <svg className="w-5 h-5" fill={isListening ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  {isListening ? 'Stop Listening' : 'Speak'}
                </button>
              ) : <div />}
              
              <button
                type="submit"
                disabled={!answerText.trim() || isSubmitting}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors shadow-sm"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Answer'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* History Sidebar */}
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden flex flex-col shadow-sm">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-bold text-gray-900">Turn History</h3>
          <p className="text-sm text-gray-600">Previous questions & scores</p>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {history.length === 0 ? (
            <p className="text-gray-500 text-sm italic text-center mt-10">No questions answered yet.</p>
          ) : (
            history.map((turn, i) => (
              <div key={i} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Q{i + 1}</span>
                  <div className="flex gap-2">
                    <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-800">{turn.difficulty}</span>
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                      turn.score >= 4 ? 'bg-green-100 text-green-800' :
                      turn.score >= 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {turn.score}/5
                    </span>
                  </div>
                </div>
                <p className="text-sm font-medium text-gray-900 mb-1 line-clamp-2">{turn.question}</p>
                <p className="text-xs text-gray-600 line-clamp-2">{turn.answer}</p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
