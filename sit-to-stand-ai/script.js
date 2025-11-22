// ============================================================
// HAND OSTEOARTHRITIS EXERCISE TRACKER - ENHANCED
// Finger-specific tracking, GPT rep goals, dual view, hand model
// ============================================================

// Load API key from environment - for local testing
const API_KEY = typeof process !== 'undefined' && process.env.VITE_OPENAI_API_KEY 
    ? process.env.VITE_OPENAI_API_KEY 
    : (window.__ENV__ && window.__ENV__.VITE_OPENAI_API_KEY)
    ? window.__ENV__.VITE_OPENAI_API_KEY
    : ''; // API key must be set in .env.local file

const CONFIG = {
    modelComplexity: 1,
    maxHands: 2,
    minDetectionConfidence: 0.7,  // Increased from 0.5 for better tracking
    minTrackingConfidence: 0.7,   // Increased from 0.5 for better tracking
    THUMB_OPPOSITION_DISTANCE_THRESHOLD: 0.035,  // Stricter - require actual touching, not just close
    MIN_FRAMES_HELD: 10,
    HOLD_TIME_TARGET: 1.0, // seconds to hold position
    FEEDBACK_COOLDOWN: 2000,
};

let state = {
    isRunning: false,
    isInitialized: false,
    hands: null,
    frameCount: 0,
    repCount: 0,
    repGoal: 8,
    currentPosition: 'open',
    previousPosition: 'open',
    positionHoldFrames: 0,
    holdStartTime: null,
    lastFeedbackTime: 0,
    lastResults: null,
    currentTargetFinger: 0, // 0=index, 1=middle, 2=ring, 3=pinky
    fingerNames: ['Index', 'Middle', 'Ring', 'Pinky'],
    fingerSequence: [], // Track which fingers have been done in current rep
    sessionStartTime: null,
    repTimes: [], // Track time for each rep
    holdTimes: [], // Track hold times per rep
    holdCompleteDingPlayed: false, // Track if ding played for current hold
    sessionSummary: null, // Store GPT summary for download
    falseCloseStartTime: null, // Track when false close (near but not touching) started
    falseCloseFeedbackGiven: false, // Track if we've given feedback about spreading hand
    wristBentStartTime: null, // Track when wrist becomes too bent
    wristBentFeedbackGiven: false, // Track if we've given wrist feedback
    wrongFingerTouchedTime: null, // Track when wrong finger was touched
    wrongFingerFeedbackGiven: false, // Track if we've given wrong finger feedback
    wristNotVerticalStartTime: null, // Track when wrist isn't vertical
    wristNotVerticalFeedbackGiven: false, // Track if we've given vertical feedback
    fingerTooCloseStartTime: null, // Track when fingers are bunched up
    fingerTooCloseFeedbackGiven: false, // Track if we've given spacing feedback
};

const HAND_KEYPOINTS = {
    WRIST: 0,
    THUMB_TIP: 4,
    INDEX_TIP: 8,
    MIDDLE_TIP: 12,
    RING_TIP: 16,
    PINKY_TIP: 20,
    INDEX_MCP: 5,
    MIDDLE_MCP: 9,
    RING_MCP: 13,
    PINKY_MCP: 17,
};

const FINGER_TIPS = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
const FINGER_NAMES = ['Index', 'Middle', 'Ring', 'Pinky'];

// ============================================================
// DISTANCE CALCULATION
// ============================================================

function calculateDistance(point1, point2) {
    if (!point1 || !point2) return Infinity;
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
}

function calculateWristBendAngle(landmarks) {
    // Calculate wrist orientation - check if wrist is vertical (straight up)
    // Wrist is landmark 0, Middle MCP is landmark 9
    const wrist = landmarks[HAND_KEYPOINTS.WRIST];
    const middleMCP = landmarks[HAND_KEYPOINTS.MIDDLE_MCP];
    
    // Calculate the angle from wrist to middle finger
    // Should be pointing roughly straight up (angle close to 90 degrees from horizontal)
    const dx = middleMCP.x - wrist.x;
    const dy = middleMCP.y - wrist.y;
    
    // Calculate angle from vertical (0 = straight up, 90 = horizontal)
    const angleFromVertical = Math.abs(Math.atan2(dx, -dy) * 180 / Math.PI);
    
    // Also check internal hand bending (wrist flex)
    const middlePIP = landmarks[10]; // Middle PIP
    const dx2 = middlePIP.x - middleMCP.x;
    const dy2 = middlePIP.y - middleMCP.y;
    
    const angle1 = Math.atan2(dy, dx);
    const angle2 = Math.atan2(dy2, dx2);
    
    // Get angle difference (how bent the wrist is internally)
    let bendAngle = Math.abs((angle2 - angle1) * 180 / Math.PI);
    if (bendAngle > 180) {
        bendAngle = 360 - bendAngle;
    }
    
    return {
        verticalOrientation: angleFromVertical,  // 0 = perfectly vertical, 90 = horizontal
        internalBend: bendAngle                   // 180 = straight, less = bent
    };
}

function calculateFingerSpacing(landmarks) {
    // Calculate distances between adjacent fingers
    // Index (8), Middle (12), Ring (16), Pinky (20)
    // Note: We skip checking Ring-Pinky spacing (thumb to pinky gap is natural)
    const fingerTips = [
        landmarks[HAND_KEYPOINTS.INDEX_TIP],
        landmarks[HAND_KEYPOINTS.MIDDLE_TIP],
        landmarks[HAND_KEYPOINTS.RING_TIP],
        landmarks[HAND_KEYPOINTS.PINKY_TIP]
    ];
    
    const spacings = [];
    // Only check Index-Middle and Middle-Ring spacing
    // Skip Ring-Pinky since the natural hand spread goes there
    for (let i = 0; i < fingerTips.length - 2; i++) {
        const distance = calculateDistance(fingerTips[i], fingerTips[i + 1]);
        spacings.push(distance);
    }
    
    // Average spacing between adjacent fingers (excluding pinky spacing)
    const avgSpacing = spacings.length > 0 ? spacings.reduce((a, b) => a + b, 0) / spacings.length : 0;
    
    return {
        spacings: spacings,
        average: avgSpacing,
        minSpacing: spacings.length > 0 ? Math.min(...spacings) : 0
    };
}

// ============================================================
// GPT SESSION SUMMARY & FEEDBACK
// ============================================================

async function getGPTSessionSummary() {
    const sessionDuration = (Date.now() - state.sessionStartTime) / 1000;
    const prompt = `The user just completed a hand osteoarthritis exercise session (thumb opposition - touching thumb to each finger tip).

Session Stats:
- Reps completed: ${state.repCount}/${state.repGoal}
- Total duration: ${sessionDuration.toFixed(1)} seconds
- Average rep time: ${(sessionDuration / state.repCount).toFixed(1)} seconds
- Hold times: ${state.holdTimes.map(t => t.toFixed(1)).join(', ')} seconds

Please provide:
1. A brief (1-2 sentence) session summary
2. 2-3 specific feedback tips to improve form

Format your response as:
SUMMARY: [your summary]
TIPS: [tip 1], [tip 2], [tip 3]`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a physical therapy assistant providing brief, encouraging feedback for hand exercises.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 200,
                temperature: 0.7
            })
        });

        if (response.ok) {
            const data = await response.json();
            const content = data.choices[0].message.content;
            console.log('GPT Summary:', content);
            return content;
        } else {
            console.error('GPT error:', response.status);
            return null;
        }
    } catch (error) {
        console.error('GPT request failed:', error);
        return null;
    }
}

async function getGPTLiveFeedback(position, metrics) {
    const prompt = `User is doing hand osteoarthritis thumb opposition exercise.
Current status:
- Current position: ${position} (open or closed)
- Distance to target: ${(metrics.distance * 100).toFixed(1)}%
- Total reps so far: ${state.repCount}/${state.repGoal}
- Current target finger: ${state.fingerNames[state.currentTargetFinger]}

Provide ONE brief (under 10 words) encouraging coaching tip. Be specific to their current action.`;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: 'You are a brief, encouraging PT coach. Keep responses under 10 words.' },
                    { role: 'user', content: prompt }
                ],
                max_tokens: 30,
                temperature: 0.8
            })
        });

        if (response.ok) {
            const data = await response.json();
            return data.choices[0].message.content;
        }
    } catch (error) {
        console.error('GPT live feedback error:', error);
    }
    return null;
}

// ============================================================
// HAND SKELETON DRAWING
// ============================================================

function drawHandSkeleton(results) {
    const canvas = document.getElementById('canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        return;
    }

    const landmarks = results.multiHandLandmarks[0];

    // Draw connections
    ctx.strokeStyle = '#00FF00';
    ctx.lineWidth = 2;
    const connections = [
        [0, 1], [1, 2], [2, 3], [3, 4], // Thumb
        [0, 5], [5, 6], [6, 7], [7, 8], // Index
        [0, 9], [9, 10], [10, 11], [11, 12], // Middle
        [0, 13], [13, 14], [14, 15], [15, 16], // Ring
        [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
    ];

    for (const [start, end] of connections) {
        const startLm = landmarks[start];
        const endLm = landmarks[end];

        if (startLm && endLm) {
            const x1 = startLm.x * canvas.width;
            const y1 = startLm.y * canvas.height;
            const x2 = endLm.x * canvas.width;
            const y2 = endLm.y * canvas.height;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }
    }

    // Highlight target finger in red
    ctx.fillStyle = '#FF0000';
    const targetFingerTip = FINGER_TIPS[state.currentTargetFinger];
    const lm = landmarks[targetFingerTip];
    const x = lm.x * canvas.width;
    const y = lm.y * canvas.height;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, 2 * Math.PI);
    ctx.fill();

    // Also highlight thumb in orange
    ctx.fillStyle = '#FF6600';
    const thumbLm = landmarks[HAND_KEYPOINTS.THUMB_TIP];
    const tx = thumbLm.x * canvas.width;
    const ty = thumbLm.y * canvas.height;
    ctx.beginPath();
    ctx.arc(tx, ty, 6, 0, 2 * Math.PI);
    ctx.fill();
}

// ============================================================
// HAND MODEL DRAWING (Bottom indicator with hand.jpg image)
// ============================================================

let handImageLoaded = false;
let handImage = null;

function loadHandImage() {
    // Removed - we're using custom drawn hand model now
}

function drawHandModel() {
    const canvas = document.getElementById('handModel');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    // Clear background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, w, h);
    
    // Draw title
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('Touch Sequence', w / 2, 25);
    
    // Draw wrist (palm area)
    ctx.fillStyle = '#FFB6C1';
    ctx.beginPath();
    ctx.ellipse(w / 2, h * 0.7, w * 0.25, h * 0.15, 0, 0, 2 * Math.PI);
    ctx.fill();
    ctx.strokeStyle = '#FF69B4';
    ctx.lineWidth = 3;
    ctx.stroke();
    
    // Finger positions for the hand model
    const fingerData = [
        { x: w * 0.15, y: h * 0.25, name: 'Index', color: '#FF3333', order: '1️⃣' },
        { x: w * 0.30, y: h * 0.08, name: 'Middle', color: '#FF6633', order: '2️⃣' },
        { x: w * 0.70, y: h * 0.08, name: 'Ring', color: '#FFDD33', order: '3️⃣' },
        { x: w * 0.85, y: h * 0.25, name: 'Pinky', color: '#33DD33', order: '4️⃣' },
    ];
    
    // Draw all fingers first (background)
    for (let i = 0; i < fingerData.length; i++) {
        const finger = fingerData[i];
        
        ctx.fillStyle = i < state.currentTargetFinger ? '#CCCCCC' : '#FFFFFF';
        ctx.beginPath();
        ctx.arc(finger.x, finger.y, w * 0.06, 0, 2 * Math.PI);
        ctx.fill();
        
        // Finger borders
        ctx.strokeStyle = '#333333';
        ctx.lineWidth = 2;
        ctx.stroke();
    }
    
    // Draw current target finger with highlight
    if (state.currentTargetFinger < 4) {
        const currentFinger = fingerData[state.currentTargetFinger];
        
        // Large pulsing circle for current target
        ctx.globalAlpha = 0.8;
        ctx.fillStyle = currentFinger.color;
        ctx.beginPath();
        ctx.arc(currentFinger.x, currentFinger.y, w * 0.12, 0, 2 * Math.PI);
        ctx.fill();
        
        // Bright border
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(currentFinger.x, currentFinger.y, w * 0.12, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Label with order number
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 14px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(currentFinger.name.toUpperCase(), currentFinger.x, currentFinger.y - 5);
        ctx.fillText(`Rep #${state.repCount + 1}`, currentFinger.x, currentFinger.y + 15);
    }
    
    // Draw completed fingers
    for (let i = 0; i < state.currentTargetFinger; i++) {
        const finger = fingerData[i];
        ctx.globalAlpha = 0.4;
        ctx.fillStyle = finger.color;
        ctx.beginPath();
        ctx.arc(finger.x, finger.y, w * 0.06, 0, 2 * Math.PI);
        ctx.fill();
        
        // Checkmark for completed
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = finger.color;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(finger.x, finger.y, w * 0.065, 0, 2 * Math.PI);
        ctx.stroke();
        
        // Draw checkmark
        ctx.fillStyle = finger.color;
        ctx.font = 'bold 20px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✓', finger.x, finger.y);
    }
    
    ctx.globalAlpha = 1.0;
}

// ============================================================
// POSITION DETECTION
// ============================================================

function analyzeHand(results) {
    if (!results.multiHandLandmarks || results.multiHandLandmarks.length === 0) {
        return null;
    }

    const landmarks = results.multiHandLandmarks[0];

    const thumbTip = landmarks[HAND_KEYPOINTS.THUMB_TIP];
    const targetFingerTip = landmarks[FINGER_TIPS[state.currentTargetFinger]];

    const distance = calculateDistance(thumbTip, targetFingerTip);
    const wristBendAngle = calculateWristBendAngle(landmarks);
    const fingerSpacing = calculateFingerSpacing(landmarks);

    return {
        distance,
        landmarks,
        targetFingerTip,
        thumbTip,
        wristBendAngle,
        fingerSpacing,
    };
}

function detectPosition(metrics) {
    if (!metrics) return 'unknown';

    const distance = metrics.distance;
    const closedThreshold = CONFIG.THUMB_OPPOSITION_DISTANCE_THRESHOLD;
    const openThreshold = CONFIG.THUMB_OPPOSITION_DISTANCE_THRESHOLD * 3;
    const nearThreshold = CONFIG.THUMB_OPPOSITION_DISTANCE_THRESHOLD * 1.5; // Fingers close but not touching

    if (distance < closedThreshold) {
        // True closed - touching
        state.falseCloseStartTime = null;
        state.falseCloseFeedbackGiven = false;
        return 'closed';
    } else if (distance > openThreshold) {
        // Definitely open
        state.falseCloseStartTime = null;
        state.falseCloseFeedbackGiven = false;
        return 'open';
    } else if (distance < nearThreshold) {
        // Fingers are close but not touching - this is a "false close"
        if (!state.falseCloseStartTime) {
            state.falseCloseStartTime = Date.now();
        }
        
        // If false close for more than 1 second, give feedback
        if (!state.falseCloseFeedbackGiven) {
            const falseCloseDuration = (Date.now() - state.falseCloseStartTime) / 1000;
            if (falseCloseDuration > 1.0) {
                // Give feedback to spread hand wider
                const utterance = new SpeechSynthesisUtterance('Spread your hand wider. Your fingers are close but not quite touching.');
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                speechSynthesis.speak(utterance);
                state.falseCloseFeedbackGiven = true;
            }
        }
        return state.currentPosition; // Keep previous state
    }

    return state.currentPosition;
}

function trackRep(newPosition) {
    // Track how many consecutive frames we've been in this position
    if (state.currentPosition !== newPosition) {
        state.positionHoldFrames = 0;
        state.currentPosition = newPosition;
        if (newPosition === 'closed') {
            state.holdStartTime = Date.now();
        }
    } else {
        state.positionHoldFrames++;
    }

    // Only trigger state changes after holding position for MIN_FRAMES_HELD frames
    if (state.positionHoldFrames < CONFIG.MIN_FRAMES_HELD) {
        return null;
    }

    let repEvent = null;

    // Transition from open to closed
    if (state.previousPosition === 'open' && state.currentPosition === 'closed') {
        state.previousPosition = 'closed';
        repEvent = 'closed_touched';
    } 
    // Transition from closed back to open
    else if (state.previousPosition === 'closed' && state.currentPosition === 'open') {
        // Finger touch complete
        const completedFinger = state.currentTargetFinger; // Save before incrementing
        state.fingerSequence.push(completedFinger);
        
        // Track hold time
        if (state.holdStartTime) {
            const holdTime = (Date.now() - state.holdStartTime) / 1000;
            state.holdTimes.push(holdTime);
        }
        
        if (state.currentTargetFinger < 3) {
            // More fingers to do (0->1, 1->2, 2->3)
            state.currentTargetFinger++;
            repEvent = 'finger_done';
        } else {
            // All 4 fingers done (0,1,2,3) - this completes the rep
            state.repCount++;
            state.currentTargetFinger = 0;
            state.fingerSequence = [];
            repEvent = 'rep_complete';
        }
        state.previousPosition = 'open';
    }

    return repEvent;
}

// ============================================================
// FEEDBACK
// ============================================================

function playDingSound() {
    // Create a simple beep/ding sound using Web Audio API
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 800; // Ding frequency
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

function downloadSummary() {
    if (!state.sessionSummary) {
        alert('No summary available to download');
        return;
    }

    // Create a more detailed summary file with session details
    const timestamp = new Date().toLocaleString();
    const content = `HAND OSTEOARTHRITIS EXERCISE SESSION SUMMARY
================================================================================

Date & Time: ${timestamp}

SESSION RESULTS
================================================================================
Reps Completed: ${state.repCount}/${state.repGoal}
Session Duration: ${((Date.now() - state.sessionStartTime) / 1000).toFixed(1)} seconds
Average Rep Time: ${(state.repTimes.length > 0 ? state.repTimes.reduce((a, b) => a + b, 0) / state.repTimes.length : 0).toFixed(1)} seconds

AI COACHING & FEEDBACK
================================================================================
${state.sessionSummary}

HOLD TIME DATA
================================================================================
Hold times per rep (seconds): ${state.holdTimes.map(t => t.toFixed(1)).join(', ')}
Average hold time: ${(state.holdTimes.length > 0 ? state.holdTimes.reduce((a, b) => a + b, 0) / state.holdTimes.length : 0).toFixed(1)} seconds

NOTES
================================================================================
- Continue practicing daily for best results
- Consistency is more important than speed
- If you experience pain, consult your physical therapist
- These sessions are tracked to monitor your progress over time

Generated by Hand Osteoarthritis Exercise Tracker
`;

    // Create blob and download
    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hand-exercise-summary-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
}

function checkWristBend(metrics) {
    if (!metrics || !metrics.wristBendAngle) return;
    
    const wristBend = metrics.wristBendAngle;
    
    // Check 1: Wrist should be vertical (straight up)
    // verticalOrientation: 0 = straight up, up to 45 is acceptable, >45 means tilted
    const MAX_WRIST_TILT = 30; // Allow up to 30 degrees from vertical
    
    if (wristBend.verticalOrientation > MAX_WRIST_TILT) {
        // Wrist is not vertical/tilted
        if (!state.wristNotVerticalStartTime) {
            state.wristNotVerticalStartTime = Date.now();
            state.wristNotVerticalFeedbackGiven = false;
        }
        
        // Give feedback after tilted for 1 second
        if (!state.wristNotVerticalFeedbackGiven) {
            const tiltDuration = (Date.now() - state.wristNotVerticalStartTime) / 1000;
            if (tiltDuration > 1.0) {
                const utterance = new SpeechSynthesisUtterance('Keep your wrist straight up.');
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                speechSynthesis.speak(utterance);
                state.wristNotVerticalFeedbackGiven = true;
            }
        }
    } else {
        // Wrist is vertical - reset tracking
        state.wristNotVerticalStartTime = null;
        state.wristNotVerticalFeedbackGiven = false;
    }
    
    // Check 2: Wrist internal bend (should be close to 180 = straight)
    // Less than 160 means wrist is bent
    const MAX_INTERNAL_BEND = 160;
    
    if (wristBend.internalBend < MAX_INTERNAL_BEND) {
        // Wrist is internally bent
        if (!state.wristBentStartTime) {
            state.wristBentStartTime = Date.now();
            state.wristBentFeedbackGiven = false;
        }
        
        // Give feedback after being bent for 1 second
        if (!state.wristBentFeedbackGiven) {
            const bendDuration = (Date.now() - state.wristBentStartTime) / 1000;
            if (bendDuration > 1.0) {
                const utterance = new SpeechSynthesisUtterance('Do not bend your wrist. Keep it straight.');
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                speechSynthesis.speak(utterance);
                state.wristBentFeedbackGiven = true;
            }
        }
    } else {
        // Wrist is straight - reset tracking
        state.wristBentStartTime = null;
        state.wristBentFeedbackGiven = false;
    }
}

function checkFingerSpacing(metrics) {
    if (!metrics || !metrics.fingerSpacing) return;
    
    // Skip finger spacing check when targeting pinky (finger 3)
    // The hand naturally squishes when reaching thumb to pinky
    if (state.currentTargetFinger === 3) {
        state.fingerTooCloseStartTime = null;
        state.fingerTooCloseFeedbackGiven = false;
        return;
    }
    
    const spacing = metrics.fingerSpacing;
    
    // Minimum spacing between adjacent fingers should be at least 0.05 (normalized distance)
    const MIN_FINGER_SPACING = 0.05;
    
    if (spacing.minSpacing < MIN_FINGER_SPACING) {
        // Fingers are too close together
        if (!state.fingerTooCloseStartTime) {
            state.fingerTooCloseStartTime = Date.now();
            state.fingerTooCloseFeedbackGiven = false;
        }
        
        // Give feedback after being too close for 0.8 seconds
        if (!state.fingerTooCloseFeedbackGiven) {
            const closeDuration = (Date.now() - state.fingerTooCloseStartTime) / 1000;
            if (closeDuration > 0.8) {
                const utterance = new SpeechSynthesisUtterance('Spread your fingers apart.');
                utterance.rate = 1.0;
                utterance.pitch = 1.0;
                utterance.volume = 1.0;
                speechSynthesis.speak(utterance);
                state.fingerTooCloseFeedbackGiven = true;
            }
        }
    } else {
        // Fingers are properly spaced - reset tracking
        state.fingerTooCloseStartTime = null;
        state.fingerTooCloseFeedbackGiven = false;
    }
}

function checkWrongFingerTouch(metrics) {
    if (!metrics || !metrics.landmarks) return;
    
    const closedThreshold = CONFIG.THUMB_OPPOSITION_DISTANCE_THRESHOLD;
    const landmarks = metrics.landmarks;
    const thumbTip = landmarks[HAND_KEYPOINTS.THUMB_TIP];
    
    // Check distance to each finger
    for (let i = 0; i < FINGER_TIPS.length; i++) {
        const fingerTip = landmarks[FINGER_TIPS[i]];
        const distance = calculateDistance(thumbTip, fingerTip);
        
        // If any finger (other than current target) is touched
        if (distance < closedThreshold && i !== state.currentTargetFinger) {
            // Wrong finger is being touched
            if (!state.wrongFingerTouchedTime) {
                state.wrongFingerTouchedTime = Date.now();
                state.wrongFingerFeedbackGiven = false;
            }
            
            // Give feedback after 0.5 seconds of wrong touch
            if (!state.wrongFingerFeedbackGiven) {
                const wrongTouchDuration = (Date.now() - state.wrongFingerTouchedTime) / 1000;
                if (wrongTouchDuration > 0.5) {
                    const wrongFingerName = state.fingerNames[i];
                    const targetFingerName = state.fingerNames[state.currentTargetFinger];
                    const utterance = new SpeechSynthesisUtterance(`That's the ${wrongFingerName} finger. Try the ${targetFingerName} finger instead.`);
                    utterance.rate = 1.0;
                    utterance.pitch = 1.0;
                    utterance.volume = 1.0;
                    speechSynthesis.speak(utterance);
                    state.wrongFingerFeedbackGiven = true;
                }
            }
            return; // Exit - we found a wrong touch
        }
    }
    
    // No wrong finger touched - reset tracking
    state.wrongFingerTouchedTime = null;
    state.wrongFingerFeedbackGiven = false;
}

function generateFeedback(metrics, position, repEvent) {
    const now = Date.now();
    if (now - state.lastFeedbackTime < CONFIG.FEEDBACK_COOLDOWN) {
        return null;
    }

    let feedback = null;
    let audioFeedback = null;

    if (repEvent === 'rep_complete') {
        feedback = `Rep ${state.repCount}/${state.repGoal} complete! ${state.repCount >= state.repGoal ? 'Excellent work!' : 'Keep going!'}`;
        audioFeedback = `Rep ${state.repCount} complete.`;
        console.log('Rep complete! Count:', state.repCount);
        
        // Play ding sound
        playDingSound();
    }
    // Only announce on rep complete - no finger-specific feedback

    if (feedback) {
        state.lastFeedbackTime = now;

        const feedbackBox = document.getElementById('feedback');
        if (feedbackBox) {
            feedbackBox.textContent = feedback;
        }

        // Update rep counter UI if rep complete
        if (repEvent === 'rep_complete') {
            const repCounterEl = document.getElementById('repCounter');
            console.log('Updating rep counter element:', repCounterEl);
            if (repCounterEl) {
                repCounterEl.textContent = state.repCount;
                console.log('Rep counter updated to:', state.repCount);
            }
        }

        // Use audioFeedback for speech - basic settings, no voice customization
        speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(audioFeedback);
        utterance.rate = 1.0;
        utterance.pitch = 1.0;
        utterance.volume = 1.0;
        // Don't set voice explicitly - use system default
        speechSynthesis.speak(utterance);

        return feedback;
    }

    return null;
}

// ============================================================
// METRICS DISPLAY
// ============================================================

function drawMetrics(metrics, position) {
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    if (!metrics) return;

    // Hold time
    let holdTime = 0;
    if (state.holdStartTime && position === 'closed') {
        holdTime = (Date.now() - state.holdStartTime) / 1000;
    }

    // Calculate countdown
    const timeRemaining = Math.max(0, CONFIG.HOLD_TIME_TARGET - holdTime);
    const countdownDisplay = timeRemaining > 0 ? `${timeRemaining.toFixed(1)}s` : 'Done!';

    // Play ding when hold time completes
    if (position === 'closed' && holdTime >= CONFIG.HOLD_TIME_TARGET && !state.holdCompleteDingPlayed) {
        playDingSound();
        state.holdCompleteDingPlayed = true;
    }
    
    // Reset ding flag when hand opens
    if (position === 'open') {
        state.holdCompleteDingPlayed = false;
    }

    // Update hold time display
    const holdDisplay = document.getElementById('holdTime');
    if (holdDisplay) {
        if (position === 'closed') {
            // Show countdown when holding
            holdDisplay.textContent = `Holding: ${holdTime.toFixed(1)}s / ${CONFIG.HOLD_TIME_TARGET}s → ${countdownDisplay} remaining`;
        } else {
            holdDisplay.textContent = `Ready to touch`;
        }
    }

    // Metrics on canvas
    ctx.fillStyle = '#FFFFFF';
    ctx.font = 'bold 14px Arial';
    ctx.fillText(`Target: ${state.fingerNames[state.currentTargetFinger]}`, 10, 25);
    ctx.fillText(`Status: ${position.toUpperCase()}`, 10, 45);
    ctx.fillText(`Distance: ${(metrics.distance * 100).toFixed(1)}%`, 10, 65);
    
    // Show countdown on canvas when holding
    if (position === 'closed' && state.holdStartTime) {
        ctx.fillStyle = '#00FF00';
        ctx.font = 'bold 24px Arial';
        ctx.fillText(`Hold: ${countdownDisplay}`, 10, 95);
    }
}

// ============================================================
// DUAL VIDEO SETUP
// ============================================================

async function setupDualWebcams() {
    const fullVideo = document.getElementById('fullVideo');
    const video = document.getElementById('video');
    const canvas = document.getElementById('canvas');

    if (!fullVideo || !video || !canvas) {
        console.error('Video or canvas elements not found');
        return false;
    }

    try {
        // Single stream - use for both
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { width: 640, height: 480 }
        });

        fullVideo.srcObject = stream;
        video.srcObject = stream;

        video.onloadedmetadata = () => {
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            document.getElementById('handModel').width = 400;
            document.getElementById('handModel').height = 400;
            console.log('✅ Canvas size:', canvas.width, 'x', canvas.height);
        };

        return true;
    } catch (error) {
        console.error('❌ Webcam error:', error);
        alert('Cannot access webcam. Check browser permissions.');
        return false;
    }
}

// ============================================================
// MAIN DETECTION LOOP
// ============================================================

async function detectFrame() {
    if (!state.isRunning || !state.hands) {
        requestAnimationFrame(detectFrame);
        return;
    }

    const video = document.getElementById('video');

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
        try {
            await state.hands.send({ image: video });

            if (state.lastResults) {
                drawHandSkeleton(state.lastResults);

                const metrics = analyzeHand(state.lastResults);

                if (metrics) {
                    const newPosition = detectPosition(metrics);
                    const repEvent = trackRep(newPosition);

                    generateFeedback(metrics, state.currentPosition, repEvent);
                    checkWristBend(metrics);
                    checkFingerSpacing(metrics);
                    checkWrongFingerTouch(metrics);
                    drawMetrics(metrics, state.currentPosition);
                    
                    // Auto-stop when rep goal is reached
                    if (state.repCount >= state.repGoal) {
                        console.log('Rep goal reached! Auto-stopping exercise.');
                        stopExercise();
                    }
                }
            }

            drawHandModel();
            state.frameCount++;
        } catch (error) {
            console.error('Detection error:', error);
        }
    }

    requestAnimationFrame(detectFrame);
}

// ============================================================
// INITIALIZATION
// ============================================================

async function initializeHands() {
    try {
        console.log('Initializing MediaPipe Hands...');

        const hands = new Hands({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
            }
        });

        hands.setOptions({
            maxNumHands: CONFIG.maxHands,
            modelComplexity: CONFIG.modelComplexity,
            minDetectionConfidence: CONFIG.minDetectionConfidence,
            minTrackingConfidence: CONFIG.minTrackingConfidence,
        });

        hands.onResults((results) => {
            state.lastResults = results;
        });

        state.hands = hands;
        state.isInitialized = true;

        console.log('✅ MediaPipe Hands initialized');
        return true;
    } catch (error) {
        console.error('❌ Error initializing hands:', error);
        return false;
    }
}

async function startExercise() {
    console.log('Starting exercise...');

    if (!state.isInitialized) {
        document.getElementById('startBtn').disabled = true;
        document.getElementById('startBtn').textContent = 'Initializing...';

        const initialized = await initializeHands();
        if (!initialized) {
            document.getElementById('startBtn').disabled = false;
            document.getElementById('startBtn').textContent = 'Start';
            alert('Failed to initialize hand detector');
            return;
        }

        document.getElementById('startBtn').textContent = 'Start';
        document.getElementById('startBtn').disabled = false;
    }

    state.isRunning = true;
    state.repCount = 0;
    state.frameCount = 0;
    state.currentTargetFinger = 0;
    state.currentPosition = 'open';
    state.previousPosition = 'open';
    state.positionHoldFrames = 0;
    state.sessionStartTime = Date.now();
    state.repTimes = [];
    state.holdTimes = [];
    state.falseCloseStartTime = null;
    state.falseCloseFeedbackGiven = false;
    state.wristBentStartTime = null;
    state.wristBentFeedbackGiven = false;
    state.wrongFingerTouchedTime = null;
    state.wrongFingerFeedbackGiven = false;
    state.wristNotVerticalStartTime = null;
    state.wristNotVerticalFeedbackGiven = false;
    state.fingerTooCloseStartTime = null;
    state.fingerTooCloseFeedbackGiven = false;

    document.getElementById('startBtn').disabled = true;
    document.getElementById('stopBtn').disabled = false;
    document.getElementById('feedback').textContent = `Rep Goal: ${state.repGoal} reps | Begin when ready`;
    
    // Reset rep counter display
    const repCounterEl = document.getElementById('repCounter');
    if (repCounterEl) {
        repCounterEl.textContent = '0';
    }
    const repGoalEl = document.getElementById('repGoal');
    if (repGoalEl) {
        repGoalEl.textContent = state.repGoal;
    }

    // Announce rep goal only - let user figure out the sequence - use system default voice
    const utterance = new SpeechSynthesisUtterance(`Starting exercise. Your goal is ${state.repGoal} reps.`);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.volume = 1.0;
    // Don't set voice explicitly - use system default
    speechSynthesis.speak(utterance);

    console.log('Exercise running...');
    detectFrame();
}

function stopExercise() {
    console.log('Stopping exercise...');
    state.isRunning = false;

    document.getElementById('startBtn').disabled = false;
    document.getElementById('stopBtn').disabled = true;
    document.getElementById('feedback').textContent = `Session complete! Reps: ${state.repCount}/${state.repGoal}. Getting AI summary...`;

    // Get GPT summary asynchronously
    getGPTSessionSummary().then(summary => {
        if (summary) {
            // Store summary for download
            state.sessionSummary = summary;
            
            const feedbackBox = document.getElementById('feedback');
            if (feedbackBox) {
                feedbackBox.innerHTML = `<div style="margin-bottom: 15px;">${summary}</div><button id="downloadBtn" style="background: #3b82f6; color: white; padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: bold;">📥 Download Summary</button>`;
                
                // Add download button event listener
                const downloadBtn = document.getElementById('downloadBtn');
                if (downloadBtn) {
                    downloadBtn.addEventListener('click', downloadSummary);
                    downloadBtn.addEventListener('mouseover', () => {
                        downloadBtn.style.background = '#2563eb';
                    });
                    downloadBtn.addEventListener('mouseout', () => {
                        downloadBtn.style.background = '#3b82f6';
                    });
                }
            }
            
            // Also speak the summary - use system default voice
            const utterance = new SpeechSynthesisUtterance(summary);
            utterance.rate = 1.0;
            utterance.pitch = 1.0;
            utterance.volume = 1.0;
            // Don't set voice explicitly - use system default
            speechSynthesis.speak(utterance);
        }
    });

    console.log('Exercise stopped');
}

// ============================================================
// PAGE INITIALIZATION
// ============================================================

async function init() {
    console.log('Initializing app...');

    if (!window.Hands) {
        console.error('❌ MediaPipe Hands not loaded');
        document.getElementById('feedback').textContent = 'Error: MediaPipe not loaded. Refresh page.';
        return;
    }

    console.log('✅ MediaPipe libraries loaded');

    const webcamReady = await setupDualWebcams();
    if (!webcamReady) {
        return;
    }

    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');

    if (startBtn) {
        startBtn.addEventListener('click', startExercise);
        startBtn.disabled = false;
        startBtn.textContent = 'Start';
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', stopExercise);
        stopBtn.disabled = true;
    }

    // Load hand image
    loadHandImage();

    document.getElementById('feedback').textContent = 'Ready! Click Start to begin.';
    drawHandModel(); // Draw initial model
    console.log('✅ App ready!');
}

document.addEventListener('DOMContentLoaded', init);
