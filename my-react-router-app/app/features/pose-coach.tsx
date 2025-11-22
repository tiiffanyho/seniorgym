import { useEffect, useMemo, useRef, useState } from "react";
import { 
  FilesetResolver, 
  PoseLandmarker as MediaPipePoseLandmarker,
  type PoseLandmarkerOptions 
} from "@mediapipe/tasks-vision";

type NormalizedLandmark = {
 x: number;
 y: number;
 z?: number;
 visibility?: number;
};

type HolisticLandmarkerResult = {
 poseLandmarks?: NormalizedLandmark[][];
 landmarks?: NormalizedLandmark[][]; // PoseLandmarker uses 'landmarks' instead
};

type HolisticLandmarker = {
 detectForVideo: (
 video: HTMLVideoElement,
 timestamp: number,
 ) => HolisticLandmarkerResult | undefined;
 close: () => void;
};


export type AngleFrame = {
 timestamp: number;
 leftKnee: number;
 rightKnee: number;
 leftElbow: number;
 rightElbow: number;
};

export type RecordedClip = {
 id: string;
 label: string;
 frames: AngleFrame[];
 rom: JointRom;
 tempo: number;
 smoothness: number;
};

export type JointRom = {
 leftKnee: number;
 rightKnee: number;
 leftElbow: number;
 rightElbow: number;
};

const MODEL_ASSET_PATH =
 "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
const VISION_WASM_ROOT = "/wasm";

const ROM_THRESHOLD = 0.8;
const TEMPO_TOLERANCE = 0.25;
const SMOOTHNESS_THRESHOLD = 1.35;
const CONFIDENCE_GATE = 0.5;

// Clinical guidelines for seniors with knee arthritis (based on ACSM and arthritis foundation)
const ARTHRITIS_KNEE_GUIDELINES = {
 // Safe range of motion for knee flexion exercises
 minFlexion: 90, // Minimum knee bend (degrees) - should achieve at least 90° for functional movement
 maxFlexion: 110, // Target deep flexion (degrees) - deeper than 110° may stress arthritic knees
 safeExtension: 160, // Safe extension limit (degrees) - full extension (180°) can stress joints

 // Movement quality thresholds
 maxRepSpeed: 3.0, // Maximum safe reps per second - slower is safer for arthritis
 minRepDuration: 2.0, // Minimum seconds per rep - encourages controlled movement

 // Safety thresholds
 asymmetryThreshold: 15, // Maximum acceptable difference between left/right knees (degrees)
 smoothnessLimit: 50, // Maximum jerk/acceleration (lower = smoother = safer)
};

const CLINICAL_FEEDBACK = {
 tooShallow: "Try to bend your knees a bit more. Aim for 90-110 degrees.",
 tooDeep: "You're bending too far. This may stress your joints. Stay above 90 degrees.",
 goodRange: "Excellent! Your knee angle is in the safe range for arthritis.",
 tooFast: "Slow down. Take at least 2 seconds per repetition for joint safety.",
 asymmetric: "Your left and right knees are uneven. Try to move them together.",
 jerky: "Your movement is jerky. Focus on smooth, controlled motion.",
 excellent: "Perfect form! Safe range, controlled speed, and smooth movement.",
};

function distance3D(a: NormalizedLandmark, b: NormalizedLandmark) {
 const dx = a.x - b.x;
 const dy = a.y - b.y;
 const dz = (a.z || 0) - (b.z || 0);
 return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function calculateAngle(
 a: NormalizedLandmark,
 b: NormalizedLandmark,
 c: NormalizedLandmark,
) {
 const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
 const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };
 const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
 const magAb = Math.sqrt(ab.x * ab.x + ab.y * ab.y + ab.z * ab.z);
 const magCb = Math.sqrt(cb.x * cb.x + cb.y * cb.y + cb.z * cb.z);
 const cosine = dot / (magAb * magCb + 1e-6);
 return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
}

function smoothLandmarks(
 current: NormalizedLandmark[],
 previous: NormalizedLandmark[] | null,
 alpha: number,
) {
 if (!previous || previous.length !== current.length) return current;
 return current.map((point, index) => {
 const prev = previous[index];
 return {
 ...point,
 x: alpha * point.x + (1 - alpha) * prev.x,
 y: alpha * point.y + (1 - alpha) * prev.y,
 z: (alpha * (point.z || 0) + (1 - alpha) * (prev.z || 0)) as number,
 visibility:
 point.visibility !== undefined && prev.visibility !== undefined
 ? alpha * point.visibility + (1 - alpha) * prev.visibility
 : point.visibility,
 } satisfies NormalizedLandmark;
 });
}

function computeTorsoLength(landmarks: NormalizedLandmark[]) {
 const leftShoulder = landmarks[11];
 const rightShoulder = landmarks[12];
 const leftHip = landmarks[23];
 const rightHip = landmarks[24];
 const shoulderSpan = distance3D(leftShoulder, rightShoulder);
 const hipSpan = distance3D(leftHip, rightHip);
 const spineLeft = distance3D(leftShoulder, leftHip);
 const spineRight = distance3D(rightShoulder, rightHip);
 return (shoulderSpan + hipSpan + spineLeft + spineRight) / 4;
}

function normalizeLandmarks(
 landmarks: NormalizedLandmark[],
 torsoLength: number,
): NormalizedLandmark[] {
 if (!torsoLength) return landmarks;
 return landmarks.map((point) => ({
 ...point,
 x: point.x / torsoLength,
 y: point.y / torsoLength,
 z: (point.z || 0) / torsoLength,
 }));
}

function computeJointAngles(landmarks: NormalizedLandmark[]): AngleFrame {
 const leftKnee = calculateAngle(landmarks[23], landmarks[25], landmarks[27]);
 const rightKnee = calculateAngle(landmarks[24], landmarks[26], landmarks[28]);
 const leftElbow = calculateAngle(landmarks[11], landmarks[13], landmarks[15]);
 const rightElbow = calculateAngle(landmarks[12], landmarks[14], landmarks[16]);
 return {
 timestamp: Date.now(),
 leftKnee,
 rightKnee,
 leftElbow,
 rightElbow,
 };
}

function calculateRom(frames: AngleFrame[]): JointRom {
 if (frames.length === 0) {
 return { leftKnee: 0, rightKnee: 0, leftElbow: 0, rightElbow: 0 };
 }
 let min = { ...frames[0] };
 let max = { ...frames[0] };
 frames.forEach((frame) => {
 min = {
 leftKnee: Math.min(min.leftKnee, frame.leftKnee),
 rightKnee: Math.min(min.rightKnee, frame.rightKnee),
 leftElbow: Math.min(min.leftElbow, frame.leftElbow),
 rightElbow: Math.min(min.rightElbow, frame.rightElbow),
 timestamp: 0,
 } as AngleFrame;
 max = {
 leftKnee: Math.max(max.leftKnee, frame.leftKnee),
 rightKnee: Math.max(max.rightKnee, frame.rightKnee),
 leftElbow: Math.max(max.leftElbow, frame.leftElbow),
 rightElbow: Math.max(max.rightElbow, frame.rightElbow),
 timestamp: 0,
 } as AngleFrame;
 });
 return {
 leftKnee: max.leftKnee - min.leftKnee,
 rightKnee: max.rightKnee - min.rightKnee,
 leftElbow: max.leftElbow - min.leftElbow,
 rightElbow: max.rightElbow - min.rightElbow,
 } satisfies JointRom;
}

function cosineSimilarity(seriesA: AngleFrame[], seriesB: AngleFrame[]) {
 const minLength = Math.min(seriesA.length, seriesB.length);
 if (minLength === 0) return 0;
 let dot = 0;
 let magA = 0;
 let magB = 0;
 for (let i = 0; i < minLength; i++) {
 const a = seriesA[i];
 const b = seriesB[i];
 const vecA = [a.leftKnee, a.rightKnee, a.leftElbow, a.rightElbow];
 const vecB = [b.leftKnee, b.rightKnee, b.leftElbow, b.rightElbow];
 for (let j = 0; j < vecA.length; j++) {
 dot += vecA[j] * vecB[j];
 magA += vecA[j] * vecA[j];
 magB += vecB[j] * vecB[j];
 }
 }
 return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-6);
}

function dtw(seriesA: AngleFrame[], seriesB: AngleFrame[]) {
 const n = seriesA.length;
 const m = seriesB.length;
 if (n === 0 || m === 0) return Infinity;
 const dp: number[][] = Array.from({ length: n + 1 }, () =>
 Array(m + 1).fill(Infinity),
 );
 dp[0][0] = 0;
 for (let i = 1; i <= n; i++) {
 for (let j = 1; j <= m; j++) {
 const a = seriesA[i - 1];
 const b = seriesB[j - 1];
 const cost = Math.sqrt(
 Math.pow(a.leftKnee - b.leftKnee, 2) +
 Math.pow(a.rightKnee - b.rightKnee, 2) +
 Math.pow(a.leftElbow - b.leftElbow, 2) +
 Math.pow(a.rightElbow - b.rightElbow, 2),
 );
 dp[i][j] = cost + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
 }
 }
 return dp[n][m] / (n + m);
}

function smoothnessScore(frames: AngleFrame[]) {
 if (frames.length < 2) return 0;
 let total = 0;
 for (let i = 1; i < frames.length; i++) {
 const prev = frames[i - 1];
 const current = frames[i];
 total +=
 Math.abs(current.leftKnee - prev.leftKnee) +
 Math.abs(current.rightKnee - prev.rightKnee) +
 Math.abs(current.leftElbow - prev.leftElbow) +
 Math.abs(current.rightElbow - prev.rightElbow);
 }
 return total / (frames.length - 1);
}

function tempoScore(frames: AngleFrame[]) {
 if (frames.length < 2) return 0;
 const duration =
 (frames[frames.length - 1].timestamp - frames[0].timestamp) / 1000;
 return frames.length / duration;
}

// Smooth angle values to reduce jitter
function smoothAngles(current: AngleFrame, previous: AngleFrame | null, alpha: number = 0.7): AngleFrame {
 if (!previous) return current;

 // Exponential moving average: smoothed = alpha * current + (1 - alpha) * previous
 return {
 timestamp: current.timestamp,
 leftKnee: alpha * current.leftKnee + (1 - alpha) * previous.leftKnee,
 rightKnee: alpha * current.rightKnee + (1 - alpha) * previous.rightKnee,
 leftElbow: alpha * current.leftElbow + (1 - alpha) * previous.leftElbow,
 rightElbow: alpha * current.rightElbow + (1 - alpha) * previous.rightElbow,
 };
}

// Clinical arthritis assessment for current knee angles with hysteresis
function assessKneeForArthritis(angles: AngleFrame, previousAssessment: any = null) {
 const { leftKnee, rightKnee } = angles;
 const avgKnee = (leftKnee + rightKnee) / 2;
 const asymmetry = Math.abs(leftKnee - rightKnee);

 // Add hysteresis (deadzone of ±3°) to prevent jitter
 const HYSTERESIS = 3;

 const feedback: string[] = [];
 let safetyLevel: 'excellent' | 'good' | 'caution' | 'warning' = 'good';

 // Apply hysteresis to range boundaries
 const minFlexionLower = ARTHRITIS_KNEE_GUIDELINES.minFlexion - HYSTERESIS;
 const minFlexionUpper = ARTHRITIS_KNEE_GUIDELINES.minFlexion + HYSTERESIS;
 const maxFlexionLower = ARTHRITIS_KNEE_GUIDELINES.maxFlexion - HYSTERESIS;
 const maxFlexionUpper = ARTHRITIS_KNEE_GUIDELINES.maxFlexion + HYSTERESIS;

 // Check if knees are in safe flexion range (90-110° with hysteresis)
 if (avgKnee < minFlexionLower) {
 // Definitely too deep
 if (avgKnee < 60) {
 feedback.push(CLINICAL_FEEDBACK.tooDeep);
 safetyLevel = 'warning';
 } else if (avgKnee < 80) {
 feedback.push("Good depth, but you can go slightly deeper if comfortable.");
 safetyLevel = 'caution';
 }
 } else if (avgKnee >= minFlexionLower && avgKnee <= maxFlexionUpper) {
 // In or near safe range - check previous state to avoid flipping
 if (previousAssessment?.inSafeRange || (avgKnee >= ARTHRITIS_KNEE_GUIDELINES.minFlexion && avgKnee <= ARTHRITIS_KNEE_GUIDELINES.maxFlexion)) {
 feedback.push(CLINICAL_FEEDBACK.goodRange);
 safetyLevel = 'excellent';
 }
 } else if (avgKnee > maxFlexionUpper && avgKnee < 140) {
 // Definitely too shallow
 feedback.push(CLINICAL_FEEDBACK.tooShallow);
 safetyLevel = 'caution';
 }

 // Check for asymmetry with hysteresis
 const asymmetryThresholdLower = ARTHRITIS_KNEE_GUIDELINES.asymmetryThreshold - HYSTERESIS;
 const asymmetryThresholdUpper = ARTHRITIS_KNEE_GUIDELINES.asymmetryThreshold + HYSTERESIS;

 if (asymmetry > asymmetryThresholdUpper || (previousAssessment && !previousAssessment.symmetrical && asymmetry > asymmetryThresholdLower)) {
 feedback.push(CLINICAL_FEEDBACK.asymmetric);
 if (safetyLevel !== 'warning') {
 safetyLevel = 'warning';
 }
 }

 return {
 avgKnee,
 asymmetry,
 feedback,
 safetyLevel,
 inSafeRange: avgKnee >= minFlexionLower && avgKnee <= maxFlexionUpper,
 symmetrical: asymmetry <= asymmetryThresholdUpper,
 };
}

type RepState = {
 phase: "up" | "down";
 reps: number;
};

export function PoseCoach() {
 const videoRef = useRef<HTMLVideoElement | null>(null);
 const canvasRef = useRef<HTMLCanvasElement | null>(null);
 const landmarkerRef = useRef<HolisticLandmarker | null>(null);
 const previousLandmarks = useRef<NormalizedLandmark[] | null>(null);
 const previousAngles = useRef<AngleFrame | null>(null); // For temporal angle smoothing
 const exemplarBuffer = useRef<AngleFrame[]>([]);
 const sessionBuffer = useRef<AngleFrame[]>([]);
 const repStateRef = useRef<RepState>({ phase: "up", reps: 0 });
 const [status, setStatus] = useState("Requesting camera");
 const [error, setError] = useState<string | null>(null);
 const [smoothing, setSmoothing] = useState(0.6);
 const [confidence, setConfidence] = useState(0);
 const [exemplarRecording, setExemplarRecording] = useState(false);
 const [sessionRecording, setSessionRecording] = useState(false);
 const [exemplarLabel, setExemplarLabel] = useState("Chair sit-to-stand");
 const [exemplars, setExemplars] = useState<RecordedClip[]>([]);
 const [activeExemplarId, setActiveExemplarId] = useState<string | null>(null);
 const [sessionSummary, setSessionSummary] = useState<{
 reps: number;
 rom: JointRom;
 tempo: number;
 smoothness: number;
 cosine: number;
 dtw: number;
 confidence: number;
 gated: boolean;
 } | null>(null);
 const [lightingWarning, setLightingWarning] = useState(false);
 const [recordingStartTime, setRecordingStartTime] = useState<number | null>(null);
 const [recordingFrameCount, setRecordingFrameCount] = useState(0);
 const [recordingDuration, setRecordingDuration] = useState(0);
 const [voiceEnabled, setVoiceEnabled] = useState(true);
 const lastLowConfidenceWarning = useRef<number>(0);
 const [currentAngles, setCurrentAngles] = useState<AngleFrame | null>(null);
 const [arthritisAssessment, setArthritisAssessment] = useState<{
 avgKnee: number;
 asymmetry: number;
 feedback: string[];
 safetyLevel: 'excellent' | 'good' | 'caution' | 'warning';
 inSafeRange: boolean;
 symmetrical: boolean;
 } | null>(null);
 const [countdown, setCountdown] = useState<number | null>(null);
 const lastDisplayUpdate = useRef<number>(0);
 const DISPLAY_UPDATE_INTERVAL = 200; // Update displayed values every 200ms instead of every frame

 const activeExemplar = useMemo(
 () => exemplars.find((clip) => clip.id === activeExemplarId) || null,
 [exemplarIdDependency(exemplars), activeExemplarId],
 );

 const speak = (text: string) => {
 if (!voiceEnabled || !('speechSynthesis' in window)) return;

 window.speechSynthesis.cancel();
 const utterance = new SpeechSynthesisUtterance(text);
 utterance.rate = 0.9;
 utterance.pitch = 1.0;
 utterance.volume = 1.0;
 window.speechSynthesis.speak(utterance);
 };

 useEffect(() => {
 let mounted = true;
 async function loadLandmarker() {
 try {
 console.log(' Loading MediaPipe from:', VISION_WASM_ROOT);
 const vision = await FilesetResolver.forVisionTasks(VISION_WASM_ROOT);
 console.log(' FilesetResolver loaded');
 console.log(' Loading model from:', MODEL_ASSET_PATH);
 const landmarker = (await MediaPipePoseLandmarker.createFromOptions(
 vision,
 {
 baseOptions: {
 modelAssetPath: MODEL_ASSET_PATH,
 },
 runningMode: "VIDEO",
 },
 )) as HolisticLandmarker;
 console.log(' PoseLandmarker created');
 if (!mounted) {
 landmarker.close();
 return;
 }
 landmarkerRef.current = landmarker;
 setStatus(" Model ready. Align yourself in the frame.");
 setError(null);
 speak("Model ready. Please step back so your full body is visible in the frame.");
 } catch (err) {
 console.error(' MediaPipe loading error:', err);
 setError(` Model load failed: ${err instanceof Error ? err.message : String(err)}`);
 }
 }
 loadLandmarker();
 return () => {
 mounted = false;
 landmarkerRef.current?.close();
 };
 }, []);

 useEffect(() => {
 let stream: MediaStream | null = null;
 async function initCamera() {
 try {
 stream = await navigator.mediaDevices.getUserMedia({
 video: { 
 width: { ideal: 960 },
 height: { ideal: 540 },
 facingMode: 'user'
 },
 audio: false
 });
 if (videoRef.current) {
 videoRef.current.srcObject = stream;
 videoRef.current.onloadedmetadata = () => {
 videoRef.current?.play().catch(err => {
 console.error('Video play error:', err);
 setError("Failed to start video playback");
 });
 };
 setStatus("Camera ready. Stand ~2m back with full body visible.");
 console.log('✅ Camera initialized successfully');
 }
 } catch (err) {
 console.error('Camera access error:', err);
 const errorMsg = err instanceof Error ? err.message : String(err);
 setError(
 `Camera access failed: ${errorMsg}. Check browser permissions and try refreshing.`,
 );
 setStatus("Camera error - check permissions");
 }
 }
 initCamera();
 return () => {
 stream?.getTracks().forEach((track) => track.stop());
 };
 }, []);

 useEffect(() => {
 if (!recordingStartTime) return;

 const interval = setInterval(() => {
 const elapsed = (Date.now() - recordingStartTime) / 1000;
 setRecordingDuration(elapsed);

 // Voice guidance at specific intervals
 if (exemplarRecording || sessionRecording) {
 if (elapsed === 5) {
 speak("Keep going. Maintain steady movements.");
 } else if (elapsed === 10) {
 speak("Good progress. Remember to breathe.");
 }
 }
 }, 100);

 return () => clearInterval(interval);
 }, [recordingStartTime, exemplarRecording, sessionRecording]);

 useEffect(() => {
 let animationFrame: number;
 const renderLoop = async () => {
 const landmarker = landmarkerRef.current;
 const video = videoRef.current;
 const canvas = canvasRef.current;
 if (!landmarker || !video || video.readyState < 2) {
 animationFrame = requestAnimationFrame(renderLoop);
 return;
 }

 const now = performance.now();
 const result: HolisticLandmarkerResult | undefined =
 landmarker.detectForVideo(video, now);

 // PoseLandmarker returns landmarks (not poseLandmarks like HolisticLandmarker)
 const poseLandmarks = result?.landmarks?.[0] || result?.poseLandmarks?.[0];

 if (poseLandmarks && poseLandmarks.length > 0) {
 const rawLandmarks = poseLandmarks;
 const averageConfidence =
 rawLandmarks.reduce((acc: number, point: NormalizedLandmark) => acc + (point.visibility || 0), 0) /
 rawLandmarks.length;
 setConfidence(averageConfidence);

 // Debug: Log first detection
 if (!previousLandmarks.current) {
 console.log(' First pose detected! Landmarks:', rawLandmarks.length, 'Average confidence:', (averageConfidence * 100).toFixed(0) + '%');
 }
 const lowLighting = averageConfidence < 0.25;
 setLightingWarning(lowLighting);

 if (averageConfidence >= CONFIDENCE_GATE) {
 const smoothed = smoothLandmarks(
 rawLandmarks,
 previousLandmarks.current,
 smoothing,
 );
 previousLandmarks.current = smoothed;

 const torsoLength = computeTorsoLength(smoothed);
 const normalized = normalizeLandmarks(smoothed, torsoLength);
 const rawAngles = computeJointAngles(normalized);

 // Apply temporal smoothing to angles (alpha=0.15 means 85% previous, 15% current = extremely smooth for seniors with tremors)
 const smoothedAngles = smoothAngles(rawAngles, previousAngles.current, 0.15);
 previousAngles.current = smoothedAngles;

 // Throttle display updates to reduce jitter (update every 200ms instead of every frame)
 const nowTime = Date.now();
 if (nowTime - lastDisplayUpdate.current >= DISPLAY_UPDATE_INTERVAL) {
 lastDisplayUpdate.current = nowTime;

 // Update current angles for live display
 setCurrentAngles(smoothedAngles);

 // Assess knee angles against arthritis guidelines (with hysteresis using previous assessment)
 setArthritisAssessment(prevAssessment => {
 const assessment = assessKneeForArthritis(smoothedAngles, prevAssessment);
 return assessment;
 });
 }

 if (exemplarRecording) {
 exemplarBuffer.current.push(rawAngles);
 setRecordingFrameCount(exemplarBuffer.current.length);
 }
 if (sessionRecording) {
 sessionBuffer.current.push(rawAngles);
 setRecordingFrameCount(sessionBuffer.current.length);
 updateRepCount(rawAngles, repStateRef);
 }

 drawPose(canvas, video, smoothed);
 } else {
 // Low confidence during recording
 if ((exemplarRecording || sessionRecording) && Date.now() - lastLowConfidenceWarning.current > 5000) {
 speak("Warning: Low visibility. Please improve lighting or adjust your position.");
 lastLowConfidenceWarning.current = Date.now();
 }
 if (canvas) {
 const ctx = canvas.getContext("2d");
 ctx?.clearRect(0, 0, canvas.width, canvas.height);
 }
 }
 }
 animationFrame = requestAnimationFrame(renderLoop);
 };

 animationFrame = requestAnimationFrame(renderLoop);
 return () => cancelAnimationFrame(animationFrame);
 }, [smoothing, exemplarRecording, sessionRecording]);

 const startExemplarRecording = () => {
 setStatus("⏳ Preparing to record exemplar...");
 speak("Recording will start in 3 seconds. Get ready.");
 setCountdown(3);

 const countdownInterval = setInterval(() => {
 setCountdown(prev => {
 if (prev === null) return null;
 if (prev <= 1) {
 clearInterval(countdownInterval);
 // Start actual recording
 exemplarBuffer.current = [];
 setExemplarRecording(true);
 setRecordingStartTime(Date.now());
 setRecordingFrameCount(0);
 setRecordingDuration(0);
 setStatus(" Recording exemplar: move steadily within frame.");
 speak("Recording started. Perform two to three slow, controlled repetitions.");
 return null;
 }
 speak(String(prev - 1));
 return prev - 1;
 });
 }, 1000);
 };

 const stopExemplarRecording = () => {
 setExemplarRecording(false);
 setRecordingStartTime(null);
 setRecordingFrameCount(0);
 setRecordingDuration(0);
 const frames = [...exemplarBuffer.current];
 exemplarBuffer.current = [];
 if (frames.length === 0) {
 setStatus(" No exemplar frames captured. Try again with clearer lighting.");
 speak("No frames captured. Please improve lighting and try again.");
 return;
 }
 const clip: RecordedClip = {
 id: `${Date.now()}`,
 label: exemplarLabel,
 frames,
 rom: calculateRom(frames),
 tempo: tempoScore(frames),
 smoothness: smoothnessScore(frames),
 };
 setExemplars((prev) => [...prev, clip]);
 setActiveExemplarId(clip.id);
 console.log(' Saved exemplar:', clip.label, 'with', frames.length, 'frames');
 console.log('Total exemplars now:', exemplars.length + 1);
 setStatus(
 ` Saved exemplar "${exemplarLabel}" (${frames.length} frames, ${recordingDuration.toFixed(1)}s). Now select it and start practice!`,
 );
 speak(`Exemplar saved with ${frames.length} frames. You can now start a practice session.`);
 };

 const startSessionRecording = () => {
 setStatus("⏳ Preparing to record practice session...");
 speak("Recording will start in 3 seconds. Get ready.");
 setSessionSummary(null);
 setCountdown(3);

 const countdownInterval = setInterval(() => {
 setCountdown(prev => {
 if (prev === null) return null;
 if (prev <= 1) {
 clearInterval(countdownInterval);
 // Start actual recording
 sessionBuffer.current = [];
 repStateRef.current = { phase: "up", reps: 0 };
 setSessionRecording(true);
 setRecordingStartTime(Date.now());
 setRecordingFrameCount(0);
 setRecordingDuration(0);
 setStatus(" Recording practice set. Keep movements pain-free.");
 speak("Recording started. Perform the exercise slowly and stop if you feel any pain.");
 return null;
 }
 speak(String(prev - 1));
 return prev - 1;
 });
 }, 1000);
 };

 const stopSessionRecording = () => {
 setSessionRecording(false);
 setRecordingStartTime(null);
 setRecordingFrameCount(0);
 setRecordingDuration(0);
 const frames = [...sessionBuffer.current];
 sessionBuffer.current = [];
 const active = activeExemplar;
 if (frames.length === 0) {
 setStatus(" No movement captured. Make sure you are centered in view.");
 return;
 }
 const rom = calculateRom(frames);
 const tempo = tempoScore(frames);
 const smoothness = smoothnessScore(frames);
 let cosine = 0;
 let dtwScore = 0;
 if (active) {
 cosine = cosineSimilarity(frames, active.frames);
 dtwScore = dtw(frames, active.frames);
 console.log(' Comparing to exemplar:', active.label);
 console.log('Practice frames:', frames.length, '| Exemplar frames:', active.frames.length);
 console.log('Cosine similarity:', cosine.toFixed(2), '| DTW:', dtwScore.toFixed(2));
 } else {
 console.log(' No exemplar selected - cannot compare');
 }
 const gated = confidence < CONFIDENCE_GATE;
 setSessionSummary({
 reps: repStateRef.current.reps,
 rom,
 tempo,
 smoothness,
 cosine,
 dtw: dtwScore,
 confidence,
 gated,
 });
 setStatus(
 ` Session recorded (${frames.length} frames, ${repStateRef.current.reps} reps). ${
 gated ? " Confidence low—review lighting." : active ? "Scroll down for comparison!" : " Select an exemplar to compare."
 }`,
 );

 if (gated) {
 speak("Session recorded, but confidence was low. Please improve lighting for accurate results.");
 } else if (active) {
 const romPass = romFeedback?.pass;
 const tempoPass = tempoFeedback?.pass;
 const smoothPass = smoothnessFeedback?.pass;

 if (romPass && tempoPass && smoothPass) {
 speak(`Excellent work! You completed ${repStateRef.current.reps} repetitions. Your range of motion, tempo, and smoothness all matched the exemplar.`);
 } else {
 const issues = [];
 if (!romPass) issues.push("range of motion");
 if (!tempoPass) issues.push("tempo");
 if (!smoothPass) issues.push("smoothness");
 speak(`Good effort! You completed ${repStateRef.current.reps} repetitions. Try to improve your ${issues.join(" and ")}.`);
 }
 } else {
 speak(`Session recorded with ${repStateRef.current.reps} repetitions. Please select an exemplar to compare your movements.`);
 }
 };

 const romFeedback = useMemo(() => {
 if (!sessionSummary || !activeExemplar) return null;
 const ratio = {
 leftKnee: sessionSummary.rom.leftKnee / (activeExemplar.rom.leftKnee || 1),
 rightKnee:
 sessionSummary.rom.rightKnee / (activeExemplar.rom.rightKnee || 1),
 leftElbow:
 sessionSummary.rom.leftElbow / (activeExemplar.rom.leftElbow || 1),
 rightElbow:
 sessionSummary.rom.rightElbow / (activeExemplar.rom.rightElbow || 1),
 } satisfies JointRom;
 return {
 ratio,
 pass:
 ratio.leftKnee >= ROM_THRESHOLD &&
 ratio.rightKnee >= ROM_THRESHOLD &&
 ratio.leftElbow >= ROM_THRESHOLD &&
 ratio.rightElbow >= ROM_THRESHOLD,
 };
 }, [sessionSummary, activeExemplar]);

 const tempoFeedback = useMemo(() => {
 if (!sessionSummary || !activeExemplar) return null;
 const target = activeExemplar.tempo;
 const delta = Math.abs(sessionSummary.tempo - target) / (target || 1);
 return { delta, pass: delta <= TEMPO_TOLERANCE };
 }, [sessionSummary, activeExemplar]);

 const smoothnessFeedback = useMemo(() => {
 if (!sessionSummary || !activeExemplar) return null;
 const ratio = sessionSummary.smoothness / (activeExemplar.smoothness || 1);
 return { ratio, pass: ratio <= SMOOTHNESS_THRESHOLD };
 }, [sessionSummary, activeExemplar]);

 const guidance = useMemo(() => {
 const prompts = [
 "Center your whole body with head and feet visible.",
 "Stand about two meters from the camera with even lighting.",
 "Keep arms clear of the torso so elbows are visible.",
 "Move slowly if balance feels unsteady; stop with any pain.",
 ];
 if (confidence < CONFIDENCE_GATE) {
 prompts.unshift(
 "Landmark confidence is low. Brighten the room or face the light.",
 );
 }
 if (lightingWarning) {
 prompts.unshift("Lighting appears low; try turning to brighter area.");
 }
 return prompts;
 }, [confidence, lightingWarning]);

 return (
 <div className="mx-auto max-w-6xl space-y-8 pb-12 text-gray-900 dark:text-gray-100">
 <header className="pt-12 flex flex-col gap-4 border-b border-gray-200 pb-6 dark:border-gray-800">
 <p className="text-sm uppercase tracking-[0.2em] text-green-600 dark:text-green-400">
 SeniorGym - Arthritis-Safe Exercise Coaching
 </p>
 <h1 className="text-4xl font-semibold">Real-Time Knee Movement Assessment</h1>
 <p className="text-lg text-gray-700 max-w-3xl dark:text-gray-200">
 Using MediaPipe pose detection, we track your knee and elbow angles in real-time and
 provide instant feedback based on clinical guidelines for seniors with knee arthritis.
 The system monitors safe range of motion (90-110° for knees), left/right symmetry,
 movement speed, and smoothness to ensure exercises are safe and effective.
 </p>
 <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-red-900 dark:border-red-800 dark:bg-red-950 dark:text-red-100">
 <p className="font-medium"> Important Safety Notice</p>
 <p className="text-sm">
 This tool is NOT medical advice and does not replace consultation with a healthcare provider.
 Stop immediately if you experience pain, dizziness, or loss of balance. Always consult your
 doctor before starting any exercise program, especially if you have arthritis or joint conditions.
 </p>
 </div>
 </header>

 <section className="rounded-2xl border border-green-100 bg-green-50 p-4 text-sm text-green-900 shadow-sm dark:border-green-900/60 dark:bg-green-900/30 dark:text-green-50">
 <h2 className="text-base font-semibold"> Clinical Arthritis Guidelines</h2>
 <ul className="mt-2 space-y-1 list-disc pl-5">
 <li><strong>Safe knee flexion range:</strong> 90-110° (based on ACSM and Arthritis Foundation guidelines)</li>
 <li><strong>Symmetry target:</strong> Left/right knee angle difference should be less than 15°</li>
 <li><strong>Movement speed:</strong> Slow and controlled - at least 2 seconds per repetition</li>
 <li><strong>Pain-free movement:</strong> Stop immediately if any exercise causes discomfort or pain</li>
 <li><strong>Progressive approach:</strong> Start with smaller ranges and gradually increase as comfort allows</li>
 </ul>
 </section>

 {/* Debug info and fallback when pose not detected */}
 {!currentAngles && (
 <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6 shadow-sm dark:border-amber-800 dark:bg-amber-900/30">
 <h2 className="text-xl font-semibold text-amber-900 dark:text-amber-100 mb-3">
 ⏳ Waiting for Pose Detection
 </h2>
 <p className="text-sm text-amber-800 dark:text-amber-200 mb-4">
 The joint tracking diagram and live angle measurements will appear once your body is detected by the camera.
 </p>
 <div className="space-y-3">
 <div className="flex items-start gap-3">
 <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${landmarkerRef.current ? 'bg-green-500' : 'bg-red-500'}`}>
 {landmarkerRef.current ? '' : ''}
 </div>
 <div>
 <p className="font-medium text-amber-900 dark:text-amber-100">MediaPipe Model</p>
 <p className="text-xs text-amber-700 dark:text-amber-300">
 {landmarkerRef.current ? 'Loaded successfully' : 'Not loaded - check console for errors'}
 </p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${videoRef.current?.srcObject ? 'bg-green-500' : 'bg-red-500'}`}>
 {videoRef.current?.srcObject ? '' : ''}
 </div>
 <div>
 <p className="font-medium text-amber-900 dark:text-amber-100">Camera Access</p>
 <p className="text-xs text-amber-700 dark:text-amber-300">
 {videoRef.current?.srcObject ? 'Camera is active' : 'Waiting for camera permissions'}
 </p>
 </div>
 </div>
 <div className="flex items-start gap-3">
 <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${confidence >= CONFIDENCE_GATE ? 'bg-green-500' : 'bg-amber-500'}`}>
 {confidence >= CONFIDENCE_GATE ? '' : ''}
 </div>
 <div>
 <p className="font-medium text-amber-900 dark:text-amber-100">Landmark Confidence</p>
 <p className="text-xs text-amber-700 dark:text-amber-300">
 Current: {(confidence * 100).toFixed(0)}% (needs ≥50%)
 {confidence > 0 && confidence < CONFIDENCE_GATE && ' - Step back and ensure full body is visible with good lighting'}
 </p>
 </div>
 </div>
 </div>
 <div className="mt-4 p-4 bg-white dark:bg-gray-900 rounded-lg border border-amber-300 dark:border-amber-700">
 <p className="text-sm font-medium text-amber-900 dark:text-amber-100 mb-2">Troubleshooting Tips:</p>
 <ul className="text-xs text-amber-800 dark:text-amber-200 space-y-1 list-disc ml-4">
 <li>Ensure camera permissions are granted in your browser</li>
 <li>Step back so your entire body (head to feet) is visible in the frame</li>
 <li>Improve lighting - face a window or turn on more lights</li>
 <li>Check browser console (F12) for any error messages</li>
 <li>Stand against a plain background for better detection</li>
 </ul>
 </div>
 </section>
 )}

 {/* Body Tracking Visualization */}
 {currentAngles && (
 <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900">
 <h2 className="text-2xl font-semibold mb-4">What We're Tracking</h2>
 <div className="grid md:grid-cols-2 gap-6">
 {/* Visual body diagram */}
 <div className="flex flex-col items-center justify-center bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6">
 <div className="relative w-48 h-64">
 {/* Simple stick figure */}
 <svg viewBox="0 0 100 150" className="w-full h-full">
 {/* Head */}
 <circle cx="50" cy="15" r="10" fill="#3B82F6" />

 {/* Torso */}
 <line x1="50" y1="25" x2="50" y2="70" stroke="#3B82F6" strokeWidth="3" />

 {/* Left arm */}
 <line x1="50" y1="35" x2="30" y2="55" stroke="#3B82F6" strokeWidth="3" />
 <line x1="30" y1="55" x2="20" y2="75" stroke="#10B981" strokeWidth="3" />
 <circle cx="30" cy="55" r="4" fill="#EF4444" className="animate-pulse" />
 <text x="10" y="58" fontSize="8" fill="#EF4444" fontWeight="bold">L Elbow</text>

 {/* Right arm */}
 <line x1="50" y1="35" x2="70" y2="55" stroke="#3B82F6" strokeWidth="3" />
 <line x1="70" y1="55" x2="80" y2="75" stroke="#10B981" strokeWidth="3" />
 <circle cx="70" cy="55" r="4" fill="#EF4444" className="animate-pulse" />
 <text x="75" y="58" fontSize="8" fill="#EF4444" fontWeight="bold">R Elbow</text>

 {/* Left leg */}
 <line x1="50" y1="70" x2="40" y2="100" stroke="#3B82F6" strokeWidth="3" />
 <line x1="40" y1="100" x2="35" y2="140" stroke="#10B981" strokeWidth="3" />
 <circle cx="40" cy="100" r="4" fill="#EF4444" className="animate-pulse" />
 <text x="10" y="103" fontSize="8" fill="#EF4444" fontWeight="bold">L Knee</text>

 {/* Right leg */}
 <line x1="50" y1="70" x2="60" y2="100" stroke="#3B82F6" strokeWidth="3" />
 <line x1="60" y1="100" x2="65" y2="140" stroke="#10B981" strokeWidth="3" />
 <circle cx="60" cy="100" r="4" fill="#EF4444" className="animate-pulse" />
 <text x="65" y="103" fontSize="8" fill="#EF4444" fontWeight="bold">R Knee</text>
 </svg>
 </div>
 <p className="mt-4 text-sm text-center text-gray-600 dark:text-gray-300">
 <span className="inline-block w-3 h-3 rounded-full bg-red-500 mr-1"></span>
 Red dots = Tracked joints
 </p>
 </div>

 {/* Legend and info */}
 <div className="space-y-4">
 <div className="rounded-lg bg-blue-50 dark:bg-blue-900/30 p-4">
 <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2"> Tracked Joints</h3>
 <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
 <li className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-red-500"></span>
 <strong>Knees (Left & Right)</strong> - Track squat depth, sit-to-stand
 </li>
 <li className="flex items-center gap-2">
 <span className="w-2 h-2 rounded-full bg-red-500"></span>
 <strong>Elbows (Left & Right)</strong> - Track arm raises, reaching movements
 </li>
 </ul>
 </div>

 <div className="rounded-lg bg-green-50 dark:bg-green-900/30 p-4">
 <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2"> Arthritis-Safe Guidelines</h3>
 <ul className="space-y-1 text-sm text-green-800 dark:text-green-200">
 <li>• <strong>Safe knee flexion:</strong> 90-110° (avoid deeper bends)</li>
 <li>• <strong>Symmetry:</strong> Left/right difference should be &lt;15°</li>
 <li>• <strong>Speed:</strong> Slow, controlled movements (2+ seconds per rep)</li>
 <li>• <strong>Smoothness:</strong> No jerky or sudden motions</li>
 <li>• <strong>Pain-free:</strong> Stop immediately if you feel discomfort</li>
 </ul>
 </div>

 <div className="rounded-lg bg-amber-50 dark:bg-amber-900/30 p-4">
 <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2"> Real-Time Feedback</h3>
 <ul className="space-y-1 text-sm text-amber-800 dark:text-amber-200">
 <li>• <strong>Green zone (90-110°):</strong> Safe arthritis-friendly range</li>
 <li>• <strong>Yellow zone:</strong> Caution - approaching limits</li>
 <li>• <strong>Red zone:</strong> Warning - adjust your movement</li>
 <li>• Voice guidance will alert you to unsafe patterns</li>
 </ul>
 </div>
 </div>
 </div>
 </section>
 )}

 {/* Compact Single-Screen Layout */}
 <section className="grid gap-4 lg:grid-cols-[1.2fr,1fr] items-start">
 {/* Left Column: Camera + Live Tracking */}
 <div className="space-y-4">
 <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden relative dark:border-gray-800 dark:bg-gray-900">
 <div className="relative aspect-video bg-gray-100 dark:bg-gray-800">
 <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
 <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
 {countdown !== null && (
 <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm">
 <div className="text-center">
 <div className="text-9xl font-bold text-white animate-pulse">
 {countdown}
 </div>
 <div className="text-2xl text-white mt-4">
 Get Ready!
 </div>
 </div>
 </div>
 )}
 {(exemplarRecording || sessionRecording) && (
 <div className="absolute top-4 left-4 right-4 flex items-start justify-between gap-4">
 <div className="rounded-lg bg-red-600 px-4 py-3 text-white shadow-lg backdrop-blur-sm">
 <div className="flex items-center gap-2">
 <span className="flex h-3 w-3">
 <span className="animate-ping absolute inline-flex h-3 w-3 rounded-full bg-white opacity-75"></span>
 <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
 </span>
 <span className="font-bold text-lg">
 {exemplarRecording ? "RECORDING EXEMPLAR" : "RECORDING PRACTICE"}
 </span>
 </div>
 <div className="mt-2 flex items-center gap-4 text-sm">
 <span>⏱ {recordingDuration.toFixed(1)}s</span>
 <span> {recordingFrameCount} frames</span>
 {sessionRecording && <span> {repStateRef.current.reps} reps</span>}
 </div>
 </div>
 <div className="rounded-lg bg-black/60 px-3 py-2 text-white text-sm backdrop-blur-sm">
 {confidence >= CONFIDENCE_GATE
 ? " Good visibility"
 : " Low visibility - improve lighting"}
 </div>
 </div>
 )}
 </div>
 <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-4 py-2 text-sm dark:border-gray-800">
 <StatusBadge label="Status" value={status} />
 <StatusBadge
 label="Confidence"
 value={`${(confidence * 100).toFixed(0)}%`}
 tone={confidence >= CONFIDENCE_GATE ? "good" : "warn"}
 />
 {lightingWarning && (
 <StatusBadge label="Lighting" value="Low" tone="warn" />
 )}
 {error && <StatusBadge label="Error" value={error} tone="error" />}
 </div>
 </div>

 {/* Live Joint Tracking - Compact */}
 {currentAngles && (
 <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900">
 <h2 className="text-lg font-semibold mb-3">Live Joint Tracking</h2>
 <div className="grid grid-cols-2 gap-3">
 {/* Left Knee */}
 <CompactJointDisplay label="L Knee" angle={currentAngles.leftKnee} icon="" />
 {/* Right Knee */}
 <CompactJointDisplay label="R Knee" angle={currentAngles.rightKnee} icon="" />
 {/* Left Elbow */}
 <CompactJointDisplay label="L Elbow" angle={currentAngles.leftElbow} icon="" />
 {/* Right Elbow */}
 <CompactJointDisplay label="R Elbow" angle={currentAngles.rightElbow} icon="" />
 </div>
 </div>
 )}
 </div>

 {/* Right Column: Assessment + Controls */}
 <div className="space-y-4">
 {/* Clinical Arthritis Assessment - Compact */}
 {arthritisAssessment && currentAngles && (
 <div className={`rounded-2xl border p-3 shadow-sm ${
 arthritisAssessment.safetyLevel === 'excellent' ? 'border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-900/30' :
 arthritisAssessment.safetyLevel === 'good' ? 'border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-900/30' :
 arthritisAssessment.safetyLevel === 'caution' ? 'border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-900/30' :
 'border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-900/30'
 }`}>
 <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
 {arthritisAssessment.safetyLevel === 'excellent' && ''}
 {arthritisAssessment.safetyLevel === 'good' && ''}
 {arthritisAssessment.safetyLevel === 'caution' && ''}
 {arthritisAssessment.safetyLevel === 'warning' && ''}
 <span>Safety Assessment</span>
 </h2>

 <div className="space-y-2">
 {/* Average knee angle */}
 <div className="flex items-center justify-between">
 <span className="text-xs font-medium">Avg Knee Angle:</span>
 <span className={`text-lg font-bold ${
 arthritisAssessment.inSafeRange ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'
 }`}>
 {arthritisAssessment.avgKnee.toFixed(0)}°
 </span>
 </div>

 {/* Safe range indicator */}
 <div className="relative h-6 bg-gray-200 dark:bg-gray-700 rounded-lg overflow-hidden">
 {/* Safe zone (90-110°) */}
 <div
 className="absolute h-full bg-green-300 dark:bg-green-600 opacity-50"
 style={{
 left: `${(90 / 180) * 100}%`,
 width: `${((110 - 90) / 180) * 100}%`
 }}
 />
 {/* Current position marker */}
 <div
 className="absolute top-0 bottom-0 w-1 bg-black dark:bg-white shadow-lg"
 style={{ left: `${Math.min(100, (arthritisAssessment.avgKnee / 180) * 100)}%` }}
 />
 {/* Labels */}
 <div className="absolute inset-0 flex items-center justify-between px-2 text-[10px] font-medium">
 <span>0°</span>
 <span className="text-green-700 dark:text-green-300">SAFE 90-110°</span>
 <span>180°</span>
 </div>
 </div>

 {/* Symmetry check */}
 <div className="flex items-center justify-between">
 <span className="text-xs font-medium">L/R Symmetry:</span>
 <span className={`text-xs font-bold ${
 arthritisAssessment.symmetrical ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'
 }`}>
 {arthritisAssessment.asymmetry.toFixed(0)}° diff {arthritisAssessment.symmetrical ? '' : ''}
 </span>
 </div>

 {/* Clinical feedback */}
 {arthritisAssessment.feedback.length > 0 && (
 <div className={`mt-2 p-2 rounded-lg ${
 arthritisAssessment.safetyLevel === 'excellent' ? 'bg-green-100 dark:bg-green-800/50' :
 arthritisAssessment.safetyLevel === 'good' ? 'bg-blue-100 dark:bg-blue-800/50' :
 arthritisAssessment.safetyLevel === 'caution' ? 'bg-yellow-100 dark:bg-yellow-800/50' :
 'bg-red-100 dark:bg-red-800/50'
 }`}>
 <ul className="text-xs space-y-1">
 {arthritisAssessment.feedback.map((fb, idx) => (
 <li key={idx}>• {fb}</li>
 ))}
 </ul>
 </div>
 )}
 </div>
 </div>
 )}

 {/* Controls - Compact */}
 <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-2">
 <h2 className="text-lg font-semibold">Settings</h2>
 <div className="flex items-center gap-2">
 <label className="text-xs flex-shrink-0">Smoothing</label>
 <input
 type="range"
 min={0.3}
 max={0.9}
 step={0.05}
 value={smoothing}
 onChange={(e) => setSmoothing(parseFloat(e.target.value))}
 className="w-full"
 />
 <span className="text-xs text-gray-500">{smoothing.toFixed(2)}</span>
 </div>
 <label className="flex items-center gap-2 text-xs cursor-pointer">
 <input
 type="checkbox"
 checked={voiceEnabled}
 onChange={(e) => setVoiceEnabled(e.target.checked)}
 className="w-4 h-4 rounded border-gray-300"
 />
 <span> Voice guidance</span>
 </label>
 </div>

 <div className="rounded-2xl border border-gray-200 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-2">
 <h2 className="text-xl font-semibold">Record exemplar</h2>
 <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-900 dark:bg-blue-900/30 dark:text-blue-100">
 <p className="font-medium"> For a good recording:</p>
 <ul className="mt-1 ml-4 list-disc space-y-1">
 <li>Landmark confidence must be ≥50%</li>
 <li>Perform 2-3 slow, controlled reps</li>
 <li>Aim for ~60-120 frames (5-10 seconds)</li>
 <li>Ensure full body is visible</li>
 </ul>
 </div>
 <label className="flex flex-col gap-2 text-sm">
 <span>Clip label</span>
 <input
 value={exemplarLabel}
 onChange={(e) => setExemplarLabel(e.target.value)}
 className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700"
 placeholder="E.g., chair sit-to-stand"
 />
 </label>
 <div className="flex flex-wrap gap-2">
 <button
 onClick={startExemplarRecording}
 disabled={exemplarRecording}
 className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
 >
 Start exemplar
 </button>
 <button
 onClick={stopExemplarRecording}
 disabled={!exemplarRecording}
 className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-gray-700"
 >
 Stop exemplar
 </button>
 </div>
 <p className="text-xs text-gray-500 dark:text-gray-400">
 We store joint-angle time series with torso normalization for later comparison.
 </p>
 </div>

 <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 space-y-3">
 <h2 className="text-xl font-semibold">Practice session</h2>
 <label className="flex flex-col gap-2 text-sm">
 <span>Reference exemplar</span>
 <select
 value={activeExemplarId || ""}
 onChange={(e) => setActiveExemplarId(e.target.value || null)}
 className="rounded-lg border border-gray-300 bg-transparent px-3 py-2 text-sm outline-none focus:border-blue-500 dark:border-gray-700"
 >
 <option value="">None yet</option>
 {exemplars.map((clip) => (
 <option key={clip.id} value={clip.id}>
 {clip.label} — {clip.frames.length} frames
 </option>
 ))}
 </select>
 </label>
 <div className="flex flex-wrap gap-2">
 <button
 onClick={startSessionRecording}
 disabled={sessionRecording}
 className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
 >
 Start session
 </button>
 <button
 onClick={stopSessionRecording}
 disabled={!sessionRecording}
 className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40 dark:bg-gray-700"
 >
 Stop & score
 </button>
 </div>
 <p className="text-xs text-gray-500 dark:text-gray-400">
 Feedback uses DTW for timing, cosine similarity for shape, ROM ratios, and smoothness.
 Low landmark confidence will gate results until the image is clear.
 </p>
 </div>
 </div>
 </section>

 {exemplars.length > 0 && (
 <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
 <h2 className="text-xl font-semibold">Saved exemplar clips</h2>
 <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
 {exemplars.map((clip) => (
 <article
 key={clip.id}
 className={`rounded-xl border px-3 py-3 text-sm shadow-sm transition hover:border-blue-500 dark:border-gray-700 ${
 activeExemplarId === clip.id
 ? "border-blue-500 bg-blue-50/60 dark:border-blue-400/80 dark:bg-blue-900/40"
 : "border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
 }`}
 >
 <div className="flex items-center justify-between gap-2">
 <div>
 <p className="font-medium">{clip.label}</p>
 <p className="text-xs text-gray-500 dark:text-gray-400">
 {clip.frames.length} frames · tempo {clip.tempo.toFixed(1)} fps
 </p>
 </div>
 <button
 onClick={() => setActiveExemplarId(clip.id)}
 className="rounded-full border border-blue-500 px-3 py-1 text-xs font-semibold text-blue-700 hover:bg-blue-50 dark:border-blue-400 dark:text-blue-200 dark:hover:bg-blue-900/60"
 >
 Use
 </button>
 </div>
 <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-600 dark:text-gray-300">
 <div>
 <dt className="font-semibold">Knee ROM</dt>
 <dd>
 L {clip.rom.leftKnee.toFixed(1)}° · R {clip.rom.rightKnee.toFixed(1)}°
 </dd>
 </div>
 <div>
 <dt className="font-semibold">Elbow ROM</dt>
 <dd>
 L {clip.rom.leftElbow.toFixed(1)}° · R {clip.rom.rightElbow.toFixed(1)}°
 </dd>
 </div>
 <div>
 <dt className="font-semibold">Smoothness</dt>
 <dd>{clip.smoothness.toFixed(1)}</dd>
 </div>
 <div>
 <dt className="font-semibold">Tempo</dt>
 <dd>{clip.tempo.toFixed(1)} fps</dd>
 </div>
 </dl>
 </article>
 ))}
 </div>
 </section>
 )}

 {sessionSummary && (
 <section className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900">
 <h2 className="text-xl font-semibold">Session summary</h2>
 {sessionSummary.gated && (
 <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
 Landmark confidence was low ({(sessionSummary.confidence * 100).toFixed(0)}%).
 Please retry with brighter, front-facing lighting for reliable feedback.
 </p>
 )}
 <div className="mt-3 grid gap-3 md:grid-cols-3 text-sm">
 <MetricCard label="Reps counted" value={sessionSummary.reps} />
 <MetricCard label="Tempo (fps)" value={sessionSummary.tempo.toFixed(1)} />
 <MetricCard label="Smoothness" value={sessionSummary.smoothness.toFixed(1)} />
 </div>
 {activeExemplar && (
 <div className="mt-4 grid gap-3 md:grid-cols-3 text-sm">
 <MetricCard
 label="ROM match"
 value={romFeedback?.ratio ? `${(romFeedback.ratio.leftKnee * 100).toFixed(0)}–${(romFeedback.ratio.rightKnee * 100).toFixed(0)}% knees` : "—"}
 status={romFeedback?.pass}
 />
 <MetricCard
 label="Tempo match"
 value={tempoFeedback ? `${((1 - tempoFeedback.delta) * 100).toFixed(0)}% aligned` : "—"}
 status={tempoFeedback?.pass}
 />
 <MetricCard
 label="Smoothness vs exemplar"
 value={smoothnessFeedback ? `${smoothnessFeedback.ratio.toFixed(2)}x jerk` : "—"}
 status={smoothnessFeedback?.pass}
 />
 <MetricCard
 label="Cosine similarity"
 value={sessionSummary.cosine.toFixed(2)}
 status={sessionSummary.cosine > 0.85}
 />
 <MetricCard
 label="DTW distance"
 value={sessionSummary.dtw.toFixed(2)}
 status={sessionSummary.dtw < 25}
 />
 <MetricCard
 label="ROM detail"
 value={`Knees L${sessionSummary.rom.leftKnee.toFixed(1)}°/R${sessionSummary.rom.rightKnee.toFixed(1)}°, Elbows L${sessionSummary.rom.leftElbow.toFixed(1)}°/R${sessionSummary.rom.rightElbow.toFixed(1)}°`}
 />
 </div>
 )}
 <p className="mt-4 text-xs text-gray-500 dark:text-gray-400">
 Interpretation: green metrics mean the motion broadly matched the exemplar’s range, tempo, and smoothness.
 If metrics stay amber/red, slow down, increase lighting, or shorten the range to stay comfortable.
 Always prioritize balance and stop with any discomfort.
 </p>
 </section>
 )}
 </div>
 );
}

function updateRepCount(frame: AngleFrame, repStateRef: React.MutableRefObject<RepState>) {
 const { leftKnee, rightKnee } = frame;
 const averageKnee = (leftKnee + rightKnee) / 2;
 const state = repStateRef.current;
 const flexed = averageKnee < 140;
 const extended = averageKnee > 165;
 if (state.phase === "up" && flexed) {
 state.phase = "down";
 } else if (state.phase === "down" && extended) {
 state.phase = "up";
 state.reps += 1;
 }
}

function drawPose(
 canvas: HTMLCanvasElement | null,
 video: HTMLVideoElement,
 landmarks: NormalizedLandmark[],
) {
 if (!canvas) return;
 const ctx = canvas.getContext("2d");
 if (!ctx) return;

 // Match canvas size to the DISPLAYED video size (not intrinsic dimensions)
 // This ensures skeleton overlay aligns perfectly with the video
 const rect = video.getBoundingClientRect();
 canvas.width = rect.width;
 canvas.height = rect.height;
 ctx.clearRect(0, 0, canvas.width, canvas.height);

 ctx.strokeStyle = "rgba(59, 130, 246, 0.9)";
 ctx.lineWidth = 4;
 const connections: [number, number][] = [
 [11, 12],
 [11, 13],
 [13, 15],
 [12, 14],
 [14, 16],
 [11, 23],
 [12, 24],
 [23, 24],
 [23, 25],
 [25, 27],
 [24, 26],
 [26, 28],
 ];
 connections.forEach(([a, b]) => {
 const p1 = landmarks[a];
 const p2 = landmarks[b];
 ctx.beginPath();
 ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
 ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
 ctx.stroke();
 });

 ctx.fillStyle = "rgba(16, 185, 129, 0.9)";
 landmarks.forEach((point) => {
 ctx.beginPath();
 ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, 2 * Math.PI);
 ctx.fill();
 });
}

function StatusBadge({
 label,
 value,
 tone = "default",
}: {
 label: string;
 value: string;
 tone?: "default" | "good" | "warn" | "error";
}) {
 const palette: Record<typeof tone, string> = {
 default: "bg-gray-100 text-gray-900 border-gray-200 dark:bg-gray-800 dark:text-gray-100 dark:border-gray-700",
 good: "bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-100 dark:border-emerald-800/60",
 warn: "bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-900/30 dark:text-amber-100 dark:border-amber-800/60",
 error: "bg-red-50 text-red-900 border-red-200 dark:bg-red-900/30 dark:text-red-50 dark:border-red-800/60",
 } as const;
 return (
 <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${palette[tone]}`}>
 <span className="font-semibold">{label}</span>
 <span className="text-[11px] leading-none">{value}</span>
 </span>
 );
}

function MetricCard({
 label,
 value,
 status,
}: {
 label: string;
 value: string | number;
 status?: boolean;
}) {
 return (
 <div
 className={`rounded-xl border px-3 py-3 shadow-sm dark:border-gray-700 ${
 status === undefined
 ? "border-gray-200 bg-white dark:bg-gray-800"
 : status
 ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-900/20"
 : "border-amber-200 bg-amber-50 dark:border-amber-800/60 dark:bg-amber-900/30"
 }`}
 >
 <p className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">{label}</p>
 <p className="mt-1 text-lg font-semibold">{value}</p>
 </div>
 );
}

function JointAngleDisplay({
 label,
 angle,
 targetAngle,
 icon,
}: {
 label: string;
 angle: number;
 targetAngle: number | null;
 icon: string;
}) {
 const getAngleColor = (angle: number) => {
 if (angle < 90) return "text-blue-600 dark:text-blue-400";
 if (angle < 140) return "text-green-600 dark:text-green-400";
 if (angle < 165) return "text-yellow-600 dark:text-yellow-400";
 return "text-gray-600 dark:text-gray-400";
 };

 const getFlexionLabel = (angle: number) => {
 if (angle < 90) return "Deep Flexion";
 if (angle < 140) return "Flexion";
 if (angle < 165) return "Partial Extension";
 return "Full Extension";
 };

 const percentProgress = Math.min(100, (angle / 180) * 100);

 return (
 <div className="space-y-2">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-2">
 <span className="text-2xl">{icon}</span>
 <span className="font-semibold text-sm">{label}</span>
 </div>
 <div className="text-right">
 <div className={`text-2xl font-bold ${getAngleColor(angle)}`}>
 {angle.toFixed(1)}°
 </div>
 <div className="text-xs text-gray-500 dark:text-gray-400">
 {getFlexionLabel(angle)}
 </div>
 </div>
 </div>

 {/* Visual angle bar */}
 <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
 <div
 className="absolute h-full bg-blue-500 transition-all duration-150"
 style={{ width: `${percentProgress}%` }}
 />
 {targetAngle && (
 <div
 className="absolute top-0 bottom-0 w-1 bg-red-500"
 style={{ left: `${Math.min(100, (targetAngle / 180) * 100)}%` }}
 title={`Target: ${targetAngle.toFixed(1)}°`}
 />
 )}
 </div>

 {/* Angle scale */}
 <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
 <span>0° (Bent)</span>
 <span>90°</span>
 <span>180° (Straight)</span>
 </div>

 {targetAngle && (
 <div className="text-xs text-gray-600 dark:text-gray-300">
 Target: <span className="font-semibold">{targetAngle.toFixed(1)}°</span>
 {Math.abs(angle - targetAngle) > 10 && (
 <span className="ml-2 text-amber-600 dark:text-amber-400">
 ({angle > targetAngle ? "+" : ""}{(angle - targetAngle).toFixed(1)}° difference)
 </span>
 )}
 </div>
 )}
 </div>
 );
}

function CompactJointDisplay({
 label,
 angle,
 icon,
}: {
 label: string;
 angle: number;
 icon: string;
}) {
 const getAngleColor = (angle: number) => {
 if (angle < 90) return "text-blue-600 dark:text-blue-400";
 if (angle < 140) return "text-green-600 dark:text-green-400";
 if (angle < 165) return "text-yellow-600 dark:text-yellow-400";
 return "text-gray-600 dark:text-gray-400";
 };

 const percentProgress = Math.min(100, (angle / 180) * 100);

 return (
 <div className="space-y-1">
 <div className="flex items-center justify-between">
 <div className="flex items-center gap-1">
 <span className="text-lg">{icon}</span>
 <span className="font-semibold text-xs">{label}</span>
 </div>
 <div className={`text-xl font-bold ${getAngleColor(angle)}`}>
 {angle.toFixed(0)}°
 </div>
 </div>
 {/* Visual angle bar */}
 <div className="relative h-2 bg-gray-200 rounded-full overflow-hidden dark:bg-gray-700">
 <div
 className="absolute h-full bg-blue-500 transition-all duration-150"
 style={{ width: `${percentProgress}%` }}
 />
 </div>
 </div>
 );
}

function exemplarIdDependency(list: RecordedClip[]) {
 return list.map((clip) => `${clip.id}:${clip.frames.length}`).join("|");
} 