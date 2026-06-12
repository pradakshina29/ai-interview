import React, { useState, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import * as tf from '@tensorflow/tfjs';
import * as blazeface from '@tensorflow-models/blazeface';
import './Interview.css';

const API = process.env.REACT_APP_API_URL || (window.location.hostname === 'localhost' ? 'http://localhost:5000' : '');

const GRADE_CONFIG = {
  Excellent: { color: '#34d399', bg: 'rgba(16,185,129,0.12)', emoji: '🏆' },
  Good:      { color: '#fbbf24', bg: 'rgba(245,158,11,0.12)',  emoji: '👍' },
  Average:   { color: '#f97316', bg: 'rgba(249,115,22,0.12)', emoji: '📈' },
  Poor:      { color: '#f87171', bg: 'rgba(239,68,68,0.12)',   emoji: '💪' },
};

export default function Interview() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const { getToken } = useAuth();

  const [session]       = useState(state?.session || null);
  const [currentIndex,  setCurrentIndex]  = useState(0);
  const [answer,        setAnswer]        = useState('');
  const [answers,       setAnswers]       = useState([]);
  const [evaluation,    setEvaluation]    = useState(null);
  const [submitting,    setSubmitting]    = useState(false);
  const [completing,    setCompleting]    = useState(false);
  const [phase,         setPhase]         = useState('setup'); // 'setup' | 'answering' | 'feedback' | 'done'
  const [timeLeft,      setTimeLeft]      = useState(180);
  const [timerActive,   setTimerActive]   = useState(false);
  const [mediaRequested, setMediaRequested] = useState(true);

  const [isRecording, setIsRecording] = useState(false);
  const [isCamOn, setIsCamOn] = useState(true);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoRecording, setIsVideoRecording] = useState(false);
  const [videoBlobUrl, setVideoBlobUrl] = useState(null);
  const [isFaceVisible, setIsFaceVisible] = useState(true);
  const [speakingDuration, setSpeakingDuration] = useState(0);

  const videoRef = React.useRef(null);
  const mediaStreamRef = React.useRef(null);
  const recognitionRef = React.useRef(null);
  const mediaRecorderRef = React.useRef(null);
  const recordedChunksRef = React.useRef([]);
  const faceModelRef = React.useRef(null);
  const faceLoopRef = React.useRef(null);
  const speakingStartRef = React.useRef(null);
  const missingFaceFrames = React.useRef(0);

  // Load BlazeFace model
  useEffect(() => {
    async function loadModel() {
      try {
        await tf.ready();
        faceModelRef.current = await blazeface.load();
        console.log("BlazeFace model loaded");
      } catch (err) {
        console.error("Error loading face model", err);
      }
    }
    loadModel();
  }, []);

  // Redirect if no session
  useEffect(() => {
    if (!session) { navigate('/dashboard'); }
  }, [session, navigate]);

  // Timer countdown
  useEffect(() => {
    if (!timerActive || phase !== 'answering') return;
    if (timeLeft <= 0) { toast.warning('⏰ Time is up!'); setTimerActive(false); return; }
    const t = setInterval(() => setTimeLeft(p => p - 1), 1000);
    return () => clearInterval(t);
  }, [timerActive, timeLeft, phase]);

  // Track Speaking Duration
  useEffect(() => {
    if (isRecording) {
      speakingStartRef.current = Date.now();
    } else {
      if (speakingStartRef.current) {
        const duration = (Date.now() - speakingStartRef.current) / 1000;
        setSpeakingDuration(prev => prev + duration);
        speakingStartRef.current = null;
      }
    }
  }, [isRecording]);

  // Speech Recognition Setup
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onresult = (event) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setAnswer(prev => prev.trim() + ' ' + currentTranscript.trim());
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error", event.error);
        if (event.error !== 'no-speech') {
          toast.error("Speech recognition failed: " + event.error);
          setIsRecording(false);
        }
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  const detectFace = async () => {
    if (!faceModelRef.current || !videoRef.current || videoRef.current.readyState !== 4) {
      faceLoopRef.current = requestAnimationFrame(detectFace);
      return;
    }
    try {
      const predictions = await faceModelRef.current.estimateFaces(videoRef.current, false);
      if (predictions.length > 0) {
        missingFaceFrames.current = 0;
        setIsFaceVisible(true);
      } else {
        missingFaceFrames.current += 1;
        if (missingFaceFrames.current > 45) { // ~1.5 seconds at 30fps
          setIsFaceVisible(false);
        }
      }
    } catch (err) {}
    faceLoopRef.current = requestAnimationFrame(detectFace);
  };

  useEffect(() => {
    if (phase === 'answering' && mediaRequested && isCamOn) {
      faceLoopRef.current = requestAnimationFrame(detectFace);
    } else {
      if (faceLoopRef.current) cancelAnimationFrame(faceLoopRef.current);
    }
    return () => {
      if (faceLoopRef.current) cancelAnimationFrame(faceLoopRef.current);
    };
  }, [phase, mediaRequested, isCamOn]);

  // Camera & Mic Setup
  useEffect(() => {
    let activeStream = null;

    const getMedia = async () => {
      try {
        // Try both first
        activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (err1) {
        console.warn("Could not get both video and audio. Trying video only...", err1);
        try {
          // Fallback 1: Video only
          activeStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
          toast.info("Microphone not found. Using camera only.");
        } catch (err2) {
          console.warn("Could not get video. Trying audio only...", err2);
          try {
            // Fallback 2: Audio only
            activeStream = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
            toast.info("Camera not found. Using microphone only.");
          } catch (err3) {
            console.error("Camera/Mic access denied or unavailable:", err3);
            toast.error("Camera and Microphone are both unavailable or access was denied.");
            return;
          }
        }
      }

      if (activeStream) {
        mediaStreamRef.current = activeStream;
        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
        }
        activeStream.getVideoTracks().forEach(track => (track.enabled = isCamOn));
        activeStream.getAudioTracks().forEach(track => (track.enabled = isMicOn));
        
        setTimerActive(true);
      }
    };

    if (phase === 'answering') {
      if (mediaRequested) {
        getMedia();
      } else {
        setTimerActive(true);
      }
    } else {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
      if (isVideoRecording) {
        stopVideoRecording();
      }
    }
    return () => {
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  const toggleCam = () => {
    if (mediaStreamRef.current) {
      const videoTrack = mediaStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isCamOn;
        setIsCamOn(!isCamOn);
      }
    }
  };

  const toggleMic = () => {
    if (mediaStreamRef.current) {
      const audioTrack = mediaStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isMicOn;
        setIsMicOn(!isMicOn);
      }
    }
  };

  const startVideoRecording = () => {
    if (!mediaStreamRef.current) {
      toast.error("Camera and microphone stream not available.");
      return;
    }
    recordedChunksRef.current = [];
    setVideoBlobUrl(null);
    
    try {
      let options;
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) {
        options = { mimeType: 'video/webm;codecs=vp8,opus' };
      } else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) {
        options = { mimeType: 'video/webm;codecs=vp9,opus' };
      } else if (MediaRecorder.isTypeSupported('video/webm')) {
        options = { mimeType: 'video/webm' };
      } else if (MediaRecorder.isTypeSupported('video/mp4')) {
        options = { mimeType: 'video/mp4' };
      }
      
      const mediaRecorder = options 
        ? new MediaRecorder(mediaStreamRef.current, options)
        : new MediaRecorder(mediaStreamRef.current);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };
      mediaRecorder.onstop = () => {
        const type = options ? options.mimeType : 'video/webm';
        const blob = new Blob(recordedChunksRef.current, { type });
        const url = URL.createObjectURL(blob);
        setVideoBlobUrl(url);
      };
      
      mediaRecorder.start();
      mediaRecorderRef.current = mediaRecorder;
      setIsVideoRecording(true);
      toast.info('Video recording started.');
    } catch (e) {
      console.error("MediaRecorder error:", e);
      toast.error("Video recording is not supported in this browser.");
    }
  };

  const stopVideoRecording = () => {
    if (mediaRecorderRef.current && isVideoRecording) {
      mediaRecorderRef.current.stop();
      setIsVideoRecording(false);
      toast.info('Video recording stopped.');
    }
  };

  const downloadRecording = () => {
    if (videoBlobUrl) {
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = videoBlobUrl;
      a.download = `interview_q${currentIndex + 1}.webm`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(videoBlobUrl);
      document.body.removeChild(a);
    }
  };

  const toggleRecording = () => {
    if (!recognitionRef.current) {
      toast.error('Speech recognition is not supported in this browser.');
      return;
    }
    if (isRecording) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
      toast.info('Listening...');
    }
  };

  const resetTimer = useCallback(() => {
    setTimeLeft(180);
    setTimerActive(false);
  }, []);

  if (!session) return null;

  const questions   = session.questions || [];
  const currentQ    = questions[currentIndex];
  const progress    = ((currentIndex) / questions.length) * 100;
  const isLastQ     = currentIndex === questions.length - 1;

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
  const timerColor = timeLeft <= 30 ? '#f87171' : timeLeft <= 60 ? '#fbbf24' : '#34d399';

  async function handleSubmitAnswer() {
    if (!answer.trim() || answer.trim().length < 10) {
      return toast.error('Please write a more detailed answer (at least 10 characters).');
    }
    setSubmitting(true);
    setTimerActive(false);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/interview/evaluate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          sessionId:     session.sessionId,
          questionId:    currentQ.id,
          question:      currentQ.question,
          answer:        answer.trim(),
          role:          session.role,
          difficulty:    session.difficulty,
          expectedPoints: currentQ.expectedPoints,
          speakingDuration: Math.round(speakingDuration),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const evalResult = data.evaluation;
      setEvaluation(evalResult);
      setAnswers(prev => [...prev, {
        questionId:  currentQ.id,
        question:    currentQ.question,
        answer:      answer.trim(),
        evaluation:  evalResult,
        videoUrl:    videoBlobUrl,
      }]);
      setPhase('feedback');
    } catch (err) {
      toast.error(err.message || 'Evaluation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  function handleNext() {
    if (isLastQ) {
      handleCompleteInterview();
    } else {
      setCurrentIndex(i => i + 1);
      setAnswer('');
      setEvaluation(null);
      setVideoBlobUrl(null);
      recordedChunksRef.current = [];
      setSpeakingDuration(0);
      setIsFaceVisible(true);
      setPhase('answering');
      resetTimer();
    }
  }

  async function handleCompleteInterview() {
    setCompleting(true);
    try {
      const token = await getToken();
      const allAnswers = phase === 'feedback'
        ? answers
        : [...answers];

      const res = await fetch(`${API}/api/interview/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ sessionId: session.sessionId, answers: allAnswers }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success('🎉 Interview completed!');
      navigate(`/results/${session.sessionId}`, {
        state: { answers: allAnswers, summary: data, session },
      });
    } catch (err) {
      toast.error(err.message || 'Failed to complete interview.');
    } finally {
      setCompleting(false);
    }
  }

  const grade = evaluation ? GRADE_CONFIG[evaluation.grade] || GRADE_CONFIG.Average : null;

  return (
    <div className="page-wrapper">
      <div className="container interview-container">

        {/* ── Top Progress Bar ── */}
        <div className="interview-topbar animate-fade-in">
          <div className="interview-meta">
            <span className="badge badge-purple">{session.role}</span>
            <span className="badge badge-cyan">{session.difficulty}</span>
          </div>
          <div className="interview-progress-info">
            <span className="q-counter">Question {currentIndex + 1} of {questions.length}</span>
            <div className="progress-bar-wrap" style={{ width: 200 }}>
              <div className="progress-bar-fill" style={{ width: `${progress}%` }} />
            </div>
          </div>
          <div className="interview-timer" style={{ color: timerColor }}>
            ⏱ {formatTime(timeLeft)}
          </div>
        </div>

        {/* ── Setup Card ── */}
        {phase === 'setup' && (
          <div className="question-card card animate-fade-in-up" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <h2 style={{ fontSize: '1.8rem', marginBottom: '16px' }}>Ready to Start Your Interview?</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '32px', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 32px auto' }}>
              This interview simulates a real environment. We recommend enabling your camera and microphone for the best experience.
            </p>
            <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button
                className="btn btn-primary btn-lg"
                onClick={() => { setMediaRequested(true); setPhase('answering'); }}
                style={{ fontSize: '1.1rem', padding: '12px 24px' }}
              >
                Enable Camera & Mic
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => { setMediaRequested(false); setPhase('answering'); }}
                style={{ fontSize: '1.1rem', padding: '12px 24px' }}
              >
                Text-Only (No Media)
              </button>
            </div>
          </div>
        )}

        {/* ── Question Card ── */}
        {phase === 'answering' && (
          <div className="question-card card animate-fade-in-up">
            <div className="question-header">
              <div className="q-number-badge">Q{currentIndex + 1}</div>
              <div className="q-tags">
                <span className="badge badge-purple">{currentQ?.type}</span>
                <span className="badge badge-cyan">{currentQ?.topic}</span>
              </div>
            </div>

            <h2 className="question-text">{currentQ?.question}</h2>

            {currentQ?.expectedPoints?.length > 0 && (
              <div className="hint-box">
                <p className="hint-label">💡 Think about covering:</p>
                <div className="hint-chips">
                  {currentQ.expectedPoints.map((p, i) => (
                    <span key={i} className="hint-chip">{p}</span>
                  ))}
                </div>
              </div>
            )}

            {mediaRequested && (
            <div className="media-container" style={{ flexDirection: 'column', alignItems: 'center' }}>
              <div className="camera-wrapper" style={{ width: '100%', maxWidth: '360px', height: '260px' }}>
                <video ref={videoRef} autoPlay muted playsInline className="interview-video" />
                {isVideoRecording && <div className="recording-indicator">🔴 REC</div>}
                {!isFaceVisible && isCamOn && (
                  <div className="face-warning-overlay">
                    ⚠️ Please maintain eye contact with the camera
                  </div>
                )}
                {!isMicOn && (
                  <div className="mic-warning-overlay" style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '6px 10px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 10 }}>
                    🔇 Mic is OFF
                  </div>
                )}
                {!isCamOn && (
                  <div className="cam-warning-overlay" style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(239, 68, 68, 0.9)', color: 'white', padding: '6px 10px', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold', zIndex: 10 }}>
                    🚫 Cam is OFF
                  </div>
                )}
                
                <div className="media-controls">
                  <button type="button" onClick={toggleCam} className={`control-btn ${!isCamOn ? 'off' : ''}`} title="Toggle Camera">
                    {isCamOn ? '📷' : '🚫'}
                  </button>
                  <button type="button" onClick={toggleMic} className={`control-btn ${!isMicOn ? 'off' : ''}`} title="Toggle Mic">
                    {isMicOn ? '🎤' : '🔇'}
                  </button>
                  {!isVideoRecording ? (
                    <button type="button" onClick={startVideoRecording} className="control-btn record-btn" title="Start Video Recording">
                      ⏺
                    </button>
                  ) : (
                    <button type="button" onClick={stopVideoRecording} className="control-btn record-btn active" title="Stop Video Recording">
                      ⏹
                    </button>
                  )}
                </div>
              </div>
              
              {videoBlobUrl && (
                <div className="playback-wrapper">
                  <h4 style={{marginTop: '15px', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)'}}>Recorded Answer</h4>
                  <video src={videoBlobUrl} controls className="interview-playback-video" style={{ width: '100%', maxWidth: '360px', borderRadius: '8px' }} />
                  <div style={{display: 'flex', justifyContent: 'center', marginTop: '10px'}}>
                    <button type="button" onClick={downloadRecording} className="btn btn-sm btn-secondary">
                      ⬇️ Download Video
                    </button>
                  </div>
                </div>
              )}
            </div>
            )}

            <div className="answer-area">
              <div className="answer-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label className="form-label" style={{ marginBottom: 0 }}>Your Answer</label>
                <button 
                  type="button" 
                  onClick={toggleRecording} 
                  className={`btn btn-sm ${isRecording ? 'btn-danger animate-pulse' : 'btn-secondary'}`}
                >
                  {isRecording ? '⏹ Stop Recording' : '🎤 Start Speech-to-Text'}
                </button>
              </div>
              <textarea
                id="answer-textarea"
                className="form-textarea answer-textarea"
                placeholder="Type your detailed answer here... Be specific and use examples where possible."
                value={answer}
                onChange={e => setAnswer(e.target.value)}
                rows={7}
                disabled={submitting}
              />
              <div className="answer-meta">
                <span className="char-count">{answer.length} characters</span>
                <span style={{ color: answer.length >= 100 ? '#34d399' : 'var(--text-muted)', fontSize: '0.8rem' }}>
                  {answer.length >= 100 ? '✓ Good length' : `${100 - answer.length} more chars recommended`}
                </span>
              </div>
            </div>

            <div className="question-actions">
              <button
                id="btn-skip"
                className="btn btn-secondary"
                onClick={handleNext}
                disabled={submitting}
              >
                Skip →
              </button>
              <button
                id="btn-submit-answer"
                className="btn btn-primary btn-lg"
                onClick={handleSubmitAnswer}
                disabled={submitting || !answer.trim()}
              >
                {submitting
                  ? <><span className="spinner spinner-sm" /> Evaluating...</>
                  : '✅ Submit Answer'}
              </button>
            </div>
          </div>
        )}

        {/* ── Feedback Card ── */}
        {phase === 'feedback' && evaluation && (
          <div className="feedback-card animate-fade-in-up">

            {/* Score Header */}
            <div className="feedback-header" style={{ background: grade?.bg }}>
              <div className="feedback-score-ring">
                <div className="score-ring" style={{ borderColor: grade?.color }}>
                  <span style={{ color: grade?.color }}>{evaluation.score}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>/10</span>
                </div>
              </div>
              <div className="feedback-grade-info">
                <div className="feedback-grade" style={{ color: grade?.color }}>
                  {grade?.emoji} {evaluation.score}/10 — {evaluation.verdict || evaluation.feedback || 'Evaluated'}
                </div>
                <p className="feedback-summary" style={{ fontSize: '0.95rem', color: 'var(--text-secondary)' }}>
                  {evaluation.verdict || evaluation.feedback}
                </p>
              </div>
            </div>

            <div className="feedback-body">
              {/* Behavioral Analytics */}
              <div className="behavioral-analytics-grid">
                <div className="analytics-card">
                  <span className="analytics-icon">⚡</span>
                  <div className="analytics-info">
                    <span className="analytics-value">{evaluation.wpm || 0}</span>
                    <span className="analytics-label">Words / Min</span>
                  </div>
                </div>
                <div className="analytics-card">
                  <span className="analytics-icon">🗣️</span>
                  <div className="analytics-info">
                    <span className="analytics-value">{evaluation.fillerWordCount || 0}</span>
                    <span className="analytics-label">Filler Words</span>
                  </div>
                </div>
                <div className="analytics-card">
                  <span className="analytics-icon">🎯</span>
                  <div className="analytics-info">
                    <span className="analytics-value">{evaluation.confidenceScore || '-'} <small>/ 10</small></span>
                    <span className="analytics-label">Confidence</span>
                  </div>
                </div>
              </div>

              {/* Strengths */}
              {evaluation.strengths?.length > 0 && (
                <div className="feedback-section">
                  <h3 className="feedback-section-title" style={{ color: '#34d399' }}>✅ Strengths</h3>
                  <ul className="feedback-list">
                    {evaluation.strengths.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {/* Improvements */}
              {evaluation.improvements?.length > 0 && (
                <div className="feedback-section">
                  <h3 className="feedback-section-title" style={{ color: '#fbbf24' }}>📈 Areas to Improve</h3>
                  <ul className="feedback-list">
                    {evaluation.improvements.map((s, i) => <li key={i}>{s}</li>)}
                  </ul>
                </div>
              )}

              {/* Model Answer */}
              {evaluation.modelAnswer && (
                <div className="model-answer-box">
                  <h3 className="feedback-section-title">🎯 Model Answer</h3>
                  <p className="model-answer-text">{evaluation.modelAnswer}</p>
                </div>
              )}

              {/* Follow Up */}
              {evaluation.followUp && (
                <div className="model-answer-box" style={{ background: 'rgba(6, 182, 212, 0.05)', borderColor: 'rgba(6, 182, 212, 0.2)' }}>
                  <h3 className="feedback-section-title" style={{ color: '#06b6d4' }}>❓ Follow-up Question</h3>
                  <p className="model-answer-text" style={{ fontStyle: 'italic' }}>{evaluation.followUp}</p>
                </div>
              )}

              {/* Your Answer */}
              <div className="your-answer-box">
                <h3 className="feedback-section-title">📝 Your Answer</h3>
                <p className="your-answer-text">{answers[answers.length - 1]?.answer}</p>
              </div>
            </div>

            <div className="question-actions">
              <button id="btn-prev-review" className="btn btn-secondary" disabled>
                ← Review
              </button>
              <button
                id="btn-next-question"
                className="btn btn-primary btn-lg"
                onClick={handleNext}
                disabled={completing}
              >
                {completing
                  ? <><span className="spinner spinner-sm" /> Finishing...</>
                  : isLastQ ? '🏁 Finish & See Results' : `Next Question →`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
