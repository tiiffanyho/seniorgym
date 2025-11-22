import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ArrowLeft, Play, Pause, Volume2, VolumeX, Camera, CheckCircle2 } from 'lucide-react';
import type { PageType } from '../App';

type LiveSessionProps = {
  onNavigate: (page: PageType) => void;
};

type FeedbackMessage = {
  id: number;
  text: string;
  type: 'success' | 'warning' | 'info';
  timestamp: number;
};

export function LiveSession({ onNavigate }: LiveSessionProps) {
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [timer, setTimer] = useState(0);
  const [reps, setReps] = useState(0);
  const [feedback, setFeedback] = useState<FeedbackMessage[]>([]);

  const exerciseName = 'Seated Arm Raises';
  const targetReps = 10;

  useEffect(() => {
    if (isActive && !isPaused) {
      const interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [isActive, isPaused]);

  // Simulate AI feedback
  useEffect(() => {
    if (isActive && !isPaused) {
      const feedbackInterval = setInterval(() => {
        const messages: { text: string; type: 'success' | 'warning' | 'info' }[] = [
          { text: 'Good job keeping your spine straight!', type: 'success' },
          { text: 'Excellent form on that repetition!', type: 'success' },
          { text: 'Try to raise your arms a bit higher', type: 'info' },
          { text: 'Remember to breathe steadily', type: 'info' },
          { text: 'Keep your shoulders relaxed', type: 'warning' },
          { text: 'Perfect alignment! Keep it up!', type: 'success' },
          { text: 'Shift your weight slightly forward', type: 'info' },
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        
        setFeedback((prev) => [
          ...prev.slice(-2),
          {
            id: Date.now(),
            text: randomMessage.text,
            type: randomMessage.type,
            timestamp: Date.now(),
          },
        ]);

        if (Math.random() > 0.5 && reps < targetReps) {
          setReps((prev) => prev + 1);
        }
      }, 4000);

      return () => clearInterval(feedbackInterval);
    }
  }, [isActive, isPaused, reps]);

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    setFeedback([
      {
        id: Date.now(),
        text: 'Exercise started! Position yourself comfortably in your chair.',
        type: 'info',
        timestamp: Date.now(),
      },
    ]);
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleStop = () => {
    setIsActive(false);
    setIsPaused(false);
    setTimer(0);
    setReps(0);
    setFeedback([]);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getTypeColor = (type: 'success' | 'warning' | 'info') => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-300 text-green-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-300 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-300 text-blue-800';
    }
  };

  return (
    <div className="min-h-screen pb-24 bg-white">
      {/* Header */}
      <div className="bg-purple-600 border-b border-purple-700">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-white hover:text-purple-100 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="mb-2 text-white">Live Exercise Session</h1>
          <p className="text-purple-100">Follow along with AI-guided feedback</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Side - Video Feed */}
          <div className="lg:col-span-2 space-y-6">
            {/* Camera View */}
            <div className="bg-white border-2 border-slate-200 rounded-lg overflow-hidden">
              <div className="aspect-video bg-slate-900 relative flex items-center justify-center">
                {!isActive ? (
                  <div className="text-center text-white">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="mb-4 opacity-80">Camera will activate when you start</p>
                    <Button
                      onClick={handleStart}
                      className="h-16 px-12 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      <Play className="w-6 h-6 mr-2" />
                      Start Exercise
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Simulated Video Feed */}
                    <div className="absolute inset-0 bg-slate-700 flex items-center justify-center">
                      <div className="text-center text-white">
                        <Camera className="w-24 h-24 mx-auto mb-4 opacity-30 animate-pulse" />
                        <p className="opacity-60">Live Camera Feed Active</p>
                        <p className="text-sm opacity-40 mt-2">Motion tracking in progress...</p>
                      </div>
                    </div>

                    {/* Overlay Info */}
                    <div className="absolute top-4 left-4 bg-slate-900/90 text-white px-4 py-2 rounded-lg border border-slate-700">
                      <p className="text-sm">Current Exercise</p>
                      <p>{exerciseName}</p>
                    </div>

                    {/* Status Indicator */}
                    <div className="absolute top-4 right-4">
                      <div className="flex items-center gap-2 bg-red-500 px-4 py-2 rounded-full">
                        <div className="w-3 h-3 bg-white rounded-full animate-pulse" />
                        <span className="text-white">LIVE</span>
                      </div>
                    </div>

                    {/* Rep Counter */}
                    <div className="absolute bottom-4 left-4 bg-slate-900/90 text-white px-6 py-4 rounded-lg border border-slate-700">
                      <p className="text-sm mb-1">Repetitions</p>
                      <p className="text-3xl">{reps} / {targetReps}</p>
                      {reps === targetReps && (
                        <div className="flex items-center gap-2 mt-2 text-green-400">
                          <CheckCircle2 className="w-5 h-5" />
                          <span>Goal Reached!</span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Controls */}
            {isActive && (
              <div className="bg-white border-2 border-slate-200 p-6 rounded-lg">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Button
                      onClick={handlePause}
                      className="h-14 px-8 bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {isPaused ? (
                        <>
                          <Play className="w-5 h-5 mr-2" />
                          Resume
                        </>
                      ) : (
                        <>
                          <Pause className="w-5 h-5 mr-2" />
                          Pause
                        </>
                      )}
                    </Button>

                    <Button
                      onClick={handleStop}
                      variant="outline"
                      className="h-14 px-8 border-2 border-slate-300 hover:bg-slate-50"
                    >
                      Stop Session
                    </Button>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="px-6 py-3 bg-slate-50 rounded-lg border border-slate-200">
                      <p className="text-sm text-slate-600 mb-1">Time Elapsed</p>
                      <p className="text-2xl text-slate-900">{formatTime(timer)}</p>
                    </div>

                    <Button
                      onClick={() => setAudioEnabled(!audioEnabled)}
                      variant={audioEnabled ? 'default' : 'outline'}
                      className={`h-14 px-6 ${audioEnabled ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'border-2 border-slate-300'}`}
                    >
                      {audioEnabled ? (
                        <Volume2 className="w-5 h-5" />
                      ) : (
                        <VolumeX className="w-5 h-5" />
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Side - AI Feedback Panel */}
          <div className="space-y-6">
            <div className="bg-white border-2 border-slate-200 p-6 rounded-lg">
              <h3 className="text-slate-900 mb-4">AI Form Feedback</h3>

              {!isActive ? (
                <div className="text-center py-8 text-slate-500">
                  <p>Start your exercise to receive real-time feedback on your form</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {feedback.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                      <p>Analyzing your movement...</p>
                    </div>
                  ) : (
                    feedback.map((msg) => (
                      <div
                        key={msg.id}
                        className={`p-4 rounded-lg border-2 ${getTypeColor(msg.type)}`}
                      >
                        <p>{msg.text}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="bg-purple-50 border-2 border-purple-200 p-6 rounded-lg">
              <h3 className="text-slate-900 mb-3">Exercise Tips</h3>
              <ul className="space-y-2 text-slate-700">
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Keep your back straight and supported</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Breathe steadily throughout the movement</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Stop immediately if you feel pain</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-purple-600 mt-1">•</span>
                  <span>Move slowly and with control</span>
                </li>
              </ul>
            </div>

            {audioEnabled && isActive && (
              <div className="bg-green-50 border-2 border-green-300 p-4 rounded-lg">
                <div className="flex items-center gap-3">
                  <Volume2 className="w-5 h-5 text-green-700" />
                  <p className="text-sm text-green-800">Voice guidance is active</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
