'use client';

import React, { useState, useRef } from 'react';
import { processVoiceTraining } from '@/app/dashboard/bot/actions';

interface VoiceTrainingProps {
  onTranscription: (categorizedFacts: any, transcript: string) => void;
}

export default function VoiceTraining({ onTranscription }: VoiceTrainingProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        await handleUpload(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handleUpload = async (blob: Blob) => {
    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      const res = await processVoiceTraining(base64);
      if (res.success) {
        onTranscription(res.categorizedFacts, res.transcript!);
      } else {
        alert(`Transcription failed: ${res.error}`);
      }
      setIsProcessing(false);
    };
    reader.readAsDataURL(blob);
  };

  return (
    <div style={{ 
      padding: '24px', 
      borderRadius: '20px', 
      background: 'rgba(255,255,255,0.03)', 
      border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '16px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '4px', background: isRecording ? 'linear-gradient(90deg, transparent, #ff4b2b, transparent)' : 'transparent', animation: 'pulse 1.5s infinite' }} />
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '20px' }}>🎙️</span>
        <h4 style={{ fontSize: '15px', fontWeight: 600 }}>Talk to Your Bot</h4>
      </div>
      
      <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', textAlign: 'center' }}>
        Record a voice note to explain pricing, shipping rules, or business facts. 
        AI will transcribe and categorize them for you.
      </p>

      {isProcessing ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
          <div className="spinner-small" />
          <p style={{ fontSize: '13px', color: 'var(--accent-primary)', fontWeight: 700 }}>AI is listening & learning...</p>
        </div>
      ) : (
        <button
          onClick={isRecording ? stopRecording : startRecording}
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: isRecording ? '#ef4444' : 'var(--accent-primary)',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: isRecording ? '0 0 20px rgba(239,68,68,0.4)' : '0 10px 20px rgba(0,168,132,0.3)',
            transition: 'all 0.3s ease'
          }}
        >
          {isRecording ? (
             <div style={{ width: '20px', height: '20px', background: '#fff', borderRadius: '4px' }} />
          ) : (
             <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/>
             </svg>
          )}
        </button>
      )}

      {isRecording && (
        <div style={{ display: 'flex', gap: '4px' }}>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="wave-bar" style={{ 
              width: '4px', 
              height: '16px', 
              background: '#ef4444', 
              borderRadius: '2px', 
              animation: `wave 0.5s ease-in-out infinite alternate ${i * 0.1}s` 
            }} />
          ))}
        </div>
      )}
      
      <style jsx>{`
        @keyframes wave {
          from { height: 8px; }
          to { height: 24px; }
        }
      `}</style>
    </div>
  );
}
