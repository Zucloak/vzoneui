import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MousePointer2, Video, Download, Play, RotateCcw, MonitorPlay, Zap, X } from 'lucide-react';
import { DraggableControls } from './components/DraggableControls';
import { BackgroundPicker } from './components/BackgroundPicker';
import { processVideo } from './services/ffmpegService';
import { ZoomEffect, BackgroundConfig, RecordingState, ProcessingStatus } from './types';

const App: React.FC = () => {
  // State
  const [status, setStatus] = useState<RecordingState>('idle');
  const [time, setTime] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [zoomEvents, setZoomEvents] = useState<ZoomEffect[]>([]);
  const [background, setBackground] = useState<BackgroundConfig>({ type: 'solid', color: '#171717' });
  const [processingStatus, setProcessingStatus] = useState<ProcessingStatus | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  
  // Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);
  const startTimeRef = useRef<number>(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // --- Handlers ---

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { displaySurface: 'monitor' },
        audio: true
      });

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm; codecs=vp9' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      setZoomEvents([]);

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        setRecordedBlob(blob);
        setStatus('finished');
        if (timerRef.current) clearInterval(timerRef.current);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };

      // Handle user clicking "Stop Sharing" native browser button
      stream.getVideoTracks()[0].onended = () => {
        if (mediaRecorder.state !== 'inactive') stopRecording();
      };

      mediaRecorder.start();
      startTimeRef.current = Date.now();
      setStatus('recording');
      
      timerRef.current = window.setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error("Error starting recording:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const togglePause = () => {
    if (!mediaRecorderRef.current) return;
    
    if (status === 'recording') {
      mediaRecorderRef.current.pause();
      setStatus('paused');
      if (timerRef.current) clearInterval(timerRef.current);
    } else if (status === 'paused') {
      mediaRecorderRef.current.resume();
      setStatus('recording');
      timerRef.current = window.setInterval(() => {
        setTime(prev => prev + 1);
      }, 1000);
    }
  };

  const reset = () => {
    setRecordedBlob(null);
    setZoomEvents([]);
    setTime(0);
    setStatus('idle');
    setPreviewUrl(null);
    setProcessingStatus(null);
  };

  const handleExport = async () => {
    if (!recordedBlob) return;
    setStatus('processing');
    
    try {
      const url = await processVideo(recordedBlob, zoomEvents, background, (progress, stage) => {
        setProcessingStatus({ progress, stage });
      });
      setPreviewUrl(url);
    } catch (error) {
      console.error("FFmpeg error:", error);
      alert("Export failed. Ensure Cross-Origin Isolation is enabled if running locally.");
      setStatus('finished');
    }
  };

  // --- Leash System ---
  
  // Track clicks globally within the document when recording
  useEffect(() => {
    if (status !== 'recording') return;

    const handleGlobalClick = (e: MouseEvent) => {
      // Calculate normalized position (0-1) based on window size
      // NOTE: This assumes user is recording THIS tab. 
      // If recording full screen, these coordinates are only valid relative to this window.
      const x = e.clientX / window.innerWidth;
      const y = e.clientY / window.innerHeight;

      const newZoom: ZoomEffect = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: Date.now() - startTimeRef.current,
        duration: 2000,
        zoomLevel: 1.5,
        cursorPosition: { x, y }
      };

      setZoomEvents(prev => [...prev, newZoom]);
      
      // Visual feedback
      const feedback = document.createElement('div');
      feedback.style.position = 'fixed';
      feedback.style.left = `${e.clientX}px`;
      feedback.style.top = `${e.clientY}px`;
      feedback.style.width = '20px';
      feedback.style.height = '20px';
      feedback.style.borderRadius = '50%';
      feedback.style.backgroundColor = 'rgba(255, 255, 255, 0.5)';
      feedback.style.transform = 'translate(-50%, -50%) scale(0)';
      feedback.style.transition = 'transform 0.3s ease-out, opacity 0.3s ease-out';
      feedback.style.pointerEvents = 'none';
      feedback.style.zIndex = '9999';
      document.body.appendChild(feedback);

      requestAnimationFrame(() => {
        feedback.style.transform = 'translate(-50%, -50%) scale(2)';
        feedback.style.opacity = '0';
      });

      setTimeout(() => feedback.remove(), 300);
    };

    window.addEventListener('mousedown', handleGlobalClick);
    return () => window.removeEventListener('mousedown', handleGlobalClick);
  }, [status]);


  // --- Render ---

  // Calculate container style based on background config
  const getBackgroundStyle = () => {
    if (background.type === 'solid') return { backgroundColor: background.color };
    return { background: `linear-gradient(${background.direction || 'to right'}, ${background.startColor}, ${background.endColor})` };
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden" style={{ color: '#111' }}>
      
      {/* Header */}
      <header className="absolute top-0 left-0 w-full p-8 flex justify-between items-center z-10">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 bg-black rounded-sm"></div>
          <span className="font-bold text-xl tracking-tight">V.ZONE</span>
        </div>
        <div className="flex gap-4">
          {status === 'finished' && (
             <button onClick={reset} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-neutral-500 hover:text-black transition-colors">
               <RotateCcw size={14} /> New Project
             </button>
          )}
        </div>
      </header>

      {/* Floating Controls (Active during recording) */}
      {(status === 'recording' || status === 'paused') && (
        <DraggableControls 
          isPaused={status === 'paused'}
          onPauseResume={togglePause}
          onStop={stopRecording}
          timer={time}
        />
      )}

      {/* Main Stage */}
      <main className="w-full max-w-6xl flex flex-col items-center gap-8 z-0">
        
        {/* Hero / Empty State */}
        {status === 'idle' && (
          <div className="text-center space-y-6 max-w-lg">
            <h1 className="text-5xl font-bold tracking-tighter text-neutral-900 leading-tight">
              Record. <span className="text-neutral-400">Refine.</span> Release.
            </h1>
            <p className="text-lg text-neutral-500 font-light">
              The client-side studio for creators. 
              Click below to start capturing. <br/>
              <span className="text-xs mt-2 inline-block opacity-70 bg-yellow-100 text-yellow-800 px-2 py-1 rounded">Note: Smart Zoom tracks clicks within this tab only.</span>
            </p>
            
            <button 
              onClick={startRecording}
              className="group relative inline-flex items-center gap-3 px-8 py-4 bg-neutral-900 text-white rounded-full text-lg font-medium hover:bg-neutral-800 transition-all hover:scale-105 hover:shadow-xl"
            >
              <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
              Start Recording
              <MonitorPlay className="w-5 h-5 ml-1 text-neutral-400 group-hover:text-white transition-colors" />
            </button>
          </div>
        )}

        {/* Preview / Editor State */}
        {(status === 'finished' || status === 'processing') && recordedBlob && (
          <div className="w-full flex flex-col lg:flex-row gap-8 items-start animate-in fade-in slide-in-from-bottom-8 duration-700">
            
            {/* Video Container */}
            <div 
              ref={containerRef}
              className="flex-1 aspect-video rounded-2xl shadow-2xl overflow-hidden relative flex items-center justify-center transition-all duration-500"
              style={getBackgroundStyle()}
            >
              {/* This mimics the layout for FFmpeg: Background + Centered Video */}
              <div className="relative w-[85%] h-[85%] rounded-lg overflow-hidden shadow-lg bg-black">
                {previewUrl ? (
                   <video src={previewUrl} controls className="w-full h-full object-contain" />
                ) : (
                   <video 
                     ref={videoRef}
                     src={URL.createObjectURL(recordedBlob)} 
                     controls 
                     className="w-full h-full object-contain"
                   />
                )}
                
                {/* Visualizing Zoom Points (Overlay) */}
                {!previewUrl && zoomEvents.map((zoom) => (
                  <div 
                    key={zoom.id}
                    className="absolute w-4 h-4 bg-blue-500 rounded-full border-2 border-white pointer-events-none opacity-50"
                    style={{ left: `${zoom.cursorPosition.x * 100}%`, top: `${zoom.cursorPosition.y * 100}%` }}
                    title={`Zoom at ${zoom.timestamp}ms`}
                  />
                ))}
              </div>

              {/* Processing Overlay */}
              {status === 'processing' && (
                <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center z-20">
                  <div className="w-64 h-2 bg-neutral-200 rounded-full overflow-hidden mb-4">
                    <div 
                      className="h-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${processingStatus?.progress || 0}%` }}
                    ></div>
                  </div>
                  <p className="text-sm font-semibold text-neutral-700">{processingStatus?.stage}</p>
                  <p className="text-xs text-neutral-400 mt-2">{processingStatus?.progress}%</p>
                </div>
              )}
            </div>

            {/* Sidebar Controls */}
            <div className="w-full lg:w-80 space-y-8 p-1">
              
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-900 mb-4 flex items-center gap-2">
                  <Zap size={16} className="text-yellow-500"/> 
                  Events Detected
                </h3>
                <div className="text-sm text-neutral-600 mb-4">
                  {zoomEvents.length} smart zoom points captured.
                  <br/>
                  <span className="text-xs text-neutral-400">Zooms are applied automatically on export.</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {zoomEvents.slice(0, 5).map((z, i) => (
                    <span key={i} className="px-2 py-1 bg-neutral-100 rounded text-xs text-neutral-500 font-mono">
                      {(z.timestamp / 1000).toFixed(1)}s
                    </span>
                  ))}
                  {zoomEvents.length > 5 && <span className="text-xs text-neutral-400 pt-1">...</span>}
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-sm border border-neutral-100">
                <h3 className="text-sm font-bold text-neutral-900 mb-4">Canvas Background</h3>
                <BackgroundPicker config={background} onChange={setBackground} />
              </div>

              {!previewUrl ? (
                <button 
                  onClick={handleExport}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium shadow-lg hover:shadow-blue-500/20 transition-all flex justify-center items-center gap-2"
                >
                  Process & Export Video
                </button>
              ) : (
                <a 
                  href={previewUrl} 
                  download="vzone_recording.mp4"
                  className="w-full py-4 bg-green-600 hover:bg-green-700 text-white rounded-xl font-medium shadow-lg hover:shadow-green-500/20 transition-all flex justify-center items-center gap-2"
                >
                  <Download size={18} />
                  Download MP4
                </a>
              )}
            </div>

          </div>
        )}
      </main>

    </div>
  );
};

export default App;