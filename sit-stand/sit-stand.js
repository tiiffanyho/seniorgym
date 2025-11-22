(() => {
    const MODEL_ASSET_PATH = "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";
    const CONFIDENCE_GATE = 0.5;
    const ARTHRITIS_MIN_FLEXION = 90;
    const ARTHRITIS_MAX_FLEXION = 110;
    const ASYMMETRY_THRESHOLD = 15;

    let landmarker = null;
    let videoElement = null;
    let canvasElement = null;
    let mediaStream = null;
    let videoReady = false;
    let isRecording = false;
    let startTime = null;
    let frameCount = 0;
    let repCount = 0;
    let previousAngles = null;
    let previousLandmarks = null;
    let currentConfidence = 0;
    let awaitingUserGesture = false;
    let reconnecting = false;
    let voiceEnabled = true;
    let lastSpokenFeedback = "";
    let lastSpokenStatus = "";

    function cacheElements() {
        videoElement = document.getElementById('sitStandVideo');
        canvasElement = document.getElementById('sitStandCanvas');
        if (videoElement) {
            videoElement.muted = true;
            videoElement.playsInline = true;
            videoElement.autoplay = true;
        }
    }

    function speak(text) {
        if (!voiceEnabled || !('speechSynthesis' in window) || !text) return;
        if (text === lastSpokenFeedback || text === lastSpokenStatus) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        window.speechSynthesis.speak(utterance);
        lastSpokenFeedback = text;
        lastSpokenStatus = text;
    }

    async function init() {
        try {
            const { FilesetResolver, PoseLandmarker } = window.FilesetResolver
                ? window
                : await import('https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9');

            const vision = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.9/wasm");

            landmarker = await PoseLandmarker.createFromOptions(vision, {
                baseOptions: {
                    modelAssetPath: MODEL_ASSET_PATH,
                },
                runningMode: "VIDEO",
            });

            updateStatus("Model loaded. Starting camera...", "good");
            speak("Model loaded. Starting the camera.");
            await setupCamera();
        } catch (err) {
            console.error("Initialization error:", err);
            updateStatus("Error: " + err.message, "error");
            speak("There was a problem loading the model. Please refresh and try again.");
        }
    }

    function isStreamActive(stream) {
        return !!stream && stream.getVideoTracks().some(track => track.readyState === "live");
    }

    async function setupCamera() {
        if (isStreamActive(mediaStream)) {
            return;
        }

        if (reconnecting) return;
        reconnecting = true;

        try {
            mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { width: 960, height: 540, facingMode: "user" },
            });

            videoElement.srcObject = mediaStream;

            mediaStream.getVideoTracks().forEach(track => {
                track.onended = () => {
                    videoReady = false;
                    mediaStream = null;
                    updateStatus("Camera disconnected. Reconnecting...", "warning");
                    setupCamera();
                };
            });

            await new Promise((resolve) => {
                const onReady = async () => {
                    videoElement.removeEventListener('loadeddata', onReady);
                    try {
                        await videoElement.play();
                        videoReady = true;
                        updateStatus("Camera ready. Center yourself in the frame.", "good");
                        requestAnimationFrame(detectPose);
                        resolve();
                        return;
                    } catch (playError) {
                        awaitingUserGesture = true;
                        updateStatus("Camera needs your permission. Tap Start to begin.", "warning");
                        updateFeedback("Tap Start Recording or click the video to enable the camera.");
                    }
                    resolve();
                };

                if (videoElement.readyState >= 2) {
                    onReady();
                } else {
                    videoElement.addEventListener('loadeddata', onReady);
                }
            });

            videoElement.addEventListener('play', () => {
                if (!videoReady) {
                    videoReady = true;
                    awaitingUserGesture = false;
                    updateStatus("Camera ready. Center yourself in the frame.", "good");
                    requestAnimationFrame(detectPose);
                }
            });
        } catch (err) {
            console.error("Camera setup error:", err);
            updateStatus("Camera error: " + err.message + " - click Start to retry.", "error");
        } finally {
            reconnecting = false;
        }
    }

    async function ensureCameraPlaying() {
        if (!isStreamActive(mediaStream)) {
            await setupCamera();
        }

        if (videoReady && !videoElement.paused) return true;

        try {
            await videoElement.play();
            videoReady = true;
            awaitingUserGesture = false;
            updateStatus("Camera ready. Center yourself in the frame.", "good");
            speak("Camera ready. Center yourself in the frame.");
            requestAnimationFrame(detectPose);
            return true;
        } catch (err) {
            awaitingUserGesture = true;
            updateFeedback("Tap the video or press Start Recording to allow camera playback.");
            return false;
        }
    }

    function updateStatus(text, tone = "default") {
        const statusText = document.getElementById('statusText');
        const indicator = document.getElementById('statusIndicator');
        if (statusText) statusText.textContent = text;
        if (indicator) {
            indicator.className = 'status-indicator ' + (tone === 'error' ? 'error' : tone === 'warning' ? 'warning' : '');
        }
        if (text && text !== lastSpokenStatus && tone !== 'default') {
            speak(text);
        }
    }

    function updateFeedback(text) {
        const box = document.getElementById('feedbackText');
        if (box) box.textContent = text;
        if (text && text !== lastSpokenFeedback && voiceEnabled) {
            speak(text);
        }
    }

    function distance3D(a, b) {
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dz = (a.z || 0) - (b.z || 0);
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function calculateAngle(a, b, c) {
        const ab = { x: a.x - b.x, y: a.y - b.y, z: (a.z || 0) - (b.z || 0) };
        const cb = { x: c.x - b.x, y: c.y - b.y, z: (c.z || 0) - (b.z || 0) };
        const dot = ab.x * cb.x + ab.y * cb.y + ab.z * cb.z;
        const magAb = Math.sqrt(ab.x * ab.x + ab.y * ab.y + ab.z * ab.z);
        const magCb = Math.sqrt(cb.x * cb.x + cb.y * cb.y + cb.z * cb.z);
        const cosine = dot / (magAb * magCb + 1e-6);
        return (Math.acos(Math.min(1, Math.max(-1, cosine))) * 180) / Math.PI;
    }

    function computeTorsoLength(landmarks) {
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

    function normalizeLandmarks(landmarks, torsoLength) {
        if (!torsoLength) return landmarks;
        return landmarks.map(point => ({
            ...point,
            x: point.x / torsoLength,
            y: point.y / torsoLength,
            z: (point.z || 0) / torsoLength,
        }));
    }

    function smoothLandmarks(current, previous, alpha) {
        if (!previous || previous.length !== current.length) return current;
        return current.map((point, index) => {
            const prev = previous[index];
            return {
                ...point,
                x: alpha * point.x + (1 - alpha) * prev.x,
                y: alpha * point.y + (1 - alpha) * prev.y,
                z: (alpha * (point.z || 0) + (1 - alpha) * (prev.z || 0)),
                visibility: point.visibility !== undefined && prev.visibility !== undefined
                    ? alpha * point.visibility + (1 - alpha) * prev.visibility
                    : point.visibility,
            };
        });
    }

    async function detectPose() {
        if (!landmarker || !videoReady || videoElement.readyState !== videoElement.HAVE_ENOUGH_DATA) {
            requestAnimationFrame(detectPose);
            return;
        }

        const now = performance.now();
        const result = landmarker.detectForVideo(videoElement, now);

        if (result && result.landmarks && result.landmarks[0]) {
            const landmarks = result.landmarks[0];
            const confidence = landmarks.reduce((acc, p) => acc + (p.visibility || 0), 0) / landmarks.length;
            currentConfidence = confidence;

            const confidenceEl = document.getElementById('confidence');
            if (confidenceEl) confidenceEl.textContent = Math.round(confidence * 100) + '%';

            if (confidence >= CONFIDENCE_GATE) {
                const smoothed = smoothLandmarks(landmarks, previousLandmarks, 0.6);
                previousLandmarks = smoothed;

                const torsoLength = computeTorsoLength(smoothed);
                const normalized = normalizeLandmarks(smoothed, torsoLength);

                const leftKnee = calculateAngle(normalized[23], normalized[25], normalized[27]);
                const rightKnee = calculateAngle(normalized[24], normalized[26], normalized[28]);
                const avgKnee = (leftKnee + rightKnee) / 2;
                const asymmetry = Math.abs(leftKnee - rightKnee);

                const leftEl = document.getElementById('lKnee');
                const rightEl = document.getElementById('rKnee');
                if (leftEl) leftEl.textContent = Math.round(leftKnee);
                if (rightEl) rightEl.textContent = Math.round(rightKnee);

                if (asymmetry > ASYMMETRY_THRESHOLD) {
                    updateFeedback("Your knees are uneven. Try to move them together symmetrically.");
                } else if (avgKnee < ARTHRITIS_MIN_FLEXION) {
                    updateFeedback("Bend your knees a bit more. Aim for ninety to one ten degrees.");
                } else if (avgKnee > ARTHRITIS_MAX_FLEXION + 20) {
                    updateFeedback("You are bending too far. This may stress your joints. Stay above ninety degrees.");
                } else if (avgKnee >= ARTHRITIS_MIN_FLEXION && avgKnee <= ARTHRITIS_MAX_FLEXION) {
                    updateFeedback("Excellent! Your knee angle is in the safe range for arthritis.");
                } else {
                    updateFeedback("Good form. Keep moving steadily and maintain balance.");
                }

                if (isRecording) {
                    frameCount++;
                    updateRepCount(avgKnee);
                    const durationEl = document.getElementById('duration');
                    const repsEl = document.getElementById('repsCount');
                    if (durationEl) durationEl.textContent = Math.round((Date.now() - startTime) / 1000) + 's';
                    if (repsEl) repsEl.textContent = repCount;
                }

                drawPose(landmarks);
                updateStatus("Detecting motion...", "good");
            } else {
                updateStatus("Low visibility. Improve lighting or step back.", "warning");
            }
        }

        requestAnimationFrame(detectPose);
    }

    function updateRepCount(avgKnee) {
        const flexed = avgKnee < 140;
        const extended = avgKnee > 165;

        if (!previousAngles) {
            previousAngles = { phase: "up", reps: 0 };
        }

        if (previousAngles.phase === "up" && flexed) {
            previousAngles.phase = "down";
        } else if (previousAngles.phase === "down" && extended) {
            previousAngles.phase = "up";
            previousAngles.reps += 1;
            repCount = previousAngles.reps;
        }
    }

    function drawPose(landmarks) {
        const ctx = canvasElement.getContext('2d');
        const width = videoElement.videoWidth || videoElement.clientWidth || 640;
        const height = videoElement.videoHeight || videoElement.clientHeight || 480;
        canvasElement.width = width;
        canvasElement.height = height;
        ctx.clearRect(0, 0, canvasElement.width, canvasElement.height);

        ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)';
        ctx.lineWidth = 3;
        const connections = [
            [11, 12], [11, 13], [13, 15], [12, 14], [14, 16],
            [11, 23], [12, 24], [23, 24], [23, 25], [25, 27],
            [24, 26], [26, 28]
        ];

        connections.forEach(([a, b]) => {
            const p1 = landmarks[a];
            const p2 = landmarks[b];
            ctx.beginPath();
            ctx.moveTo(p1.x * canvasElement.width, p1.y * canvasElement.height);
            ctx.lineTo(p2.x * canvasElement.width, p2.y * canvasElement.height);
            ctx.stroke();
        });

        ctx.fillStyle = 'rgba(16, 185, 129, 0.8)';
        landmarks.forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x * canvasElement.width, point.y * canvasElement.height, 4, 0, 2 * Math.PI);
            ctx.fill();
        });
    }

    async function startExercise() {
        updateStatus("Starting camera...", "warning");
        await setupCamera();

        const playable = await ensureCameraPlaying();
        if (!playable) return;

        if (!videoReady) {
            updateFeedback("Tap the video area or allow camera access to begin.");
            return;
        }

        if (currentConfidence < CONFIDENCE_GATE) {
            updateFeedback("⚠ Low visibility. Starting anyway—adjust lighting or step back for better tracking.");
        }

        isRecording = true;
        startTime = Date.now();
        frameCount = 0;
        repCount = 0;
        previousAngles = null;

        const startBtn = document.getElementById('sitStandStartBtn');
        const stopBtn = document.getElementById('sitStandStopBtn');
        const indicator = document.getElementById('recordingIndicator');
        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = false;
        if (indicator) indicator.classList.add('active');

        updateStatus("Recording started. Perform slow, controlled movements.", "good");
        updateFeedback("Start your sit-to-stand motion. Move slowly and steadily.");
        speak("Recording started. Perform slow, controlled movements.");
    }

    function stopExercise() {
        isRecording = false;
        const startBtn = document.getElementById('sitStandStartBtn');
        const stopBtn = document.getElementById('sitStandStopBtn');
        const indicator = document.getElementById('recordingIndicator');
        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = true;
        if (indicator) indicator.classList.remove('active');

        const duration = Math.round((Date.now() - startTime) / 1000);
        updateStatus(`Recording stopped. Completed ${repCount} reps in ${duration} seconds.`, "good");
        updateFeedback(`✓ Great job! You completed ${repCount} repetitions. Great form and controlled movement!`);
        speak(`Recording stopped. You completed ${repCount} repetitions in ${duration} seconds.`);
    }

    function bindControls() {
        const startBtn = document.getElementById('sitStandStartBtn');
        const stopBtn = document.getElementById('sitStandStopBtn');
        const backBtn = document.getElementById('sitStandBackBtn');
        const voiceToggle = document.getElementById('voiceToggle');
        const voiceStatus = document.getElementById('voiceStatus');

        startBtn?.addEventListener('click', startExercise);
        stopBtn?.addEventListener('click', stopExercise);
        videoElement?.addEventListener('click', ensureCameraPlaying);
        backBtn?.addEventListener('click', () => window.history.back());
        voiceToggle?.addEventListener('change', (e) => {
            const target = e.target;
            const checked = target && typeof target.checked === 'boolean' ? target.checked : voiceEnabled;
            voiceEnabled = checked;
            if (voiceStatus) {
                voiceStatus.textContent = voiceEnabled ? 'Voice coach is on.' : 'Voice coach is off.';
            }
            if (!voiceEnabled && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        });
    }

    window.addEventListener('load', () => {
        cacheElements();
        bindControls();
        init();
    });
})();
