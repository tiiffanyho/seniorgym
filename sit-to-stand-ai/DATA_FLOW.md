# 🔄 Data Flow & Quick Reference Guide

## Data Processing Pipeline

```
┌─────────────────┐
│   Video Frame   │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────┐
│  BlazePose Detection        │
│  (17 joint keypoints)       │
└────────┬────────────────────┘
         │
         ▼
┌─────────────────────────────┐
│  1. JOINT POSITIONS         │
│  Extract + Smooth (5-frame) │
│  Output: x,y per joint      │
└────────┬────────────────────┘
         │
         ├─────────────────┐
         │                 │
         ▼                 ▼
    ┌────────────┐   ┌──────────────┐
    │ 2. ANGLES  │   │ 6. STABILITY │
    │ (Knee,Hip, │   │ (Head sway)  │
    │  Back)     │   └──────────────┘
    └──────┬─────┘
         │
         ├─────────────────────────────────────┐
         │                                     │
         ▼                                     ▼
    ┌────────────┐                     ┌──────────────┐
    │ 3. ROM     │                     │ 5. SYMMETRY  │
    │ (Min/Max   │                     │ (L vs R diff)│
    │  per rep)  │                     └──────────────┘
    └──────┬─────┘
         │
         ├─────────────────────────────┐
         │                             │
         ▼                             ▼
    ┌────────────┐              ┌──────────────┐
    │ 4. TIMING  │              │ 7. DEPTH     │
    │ (Phase dur)│              │ (Chair test) │
    └──────┬─────┘              └──────────────┘
         │
         └─────────────────────────────┐
                                       │
                                       ▼
                             ┌──────────────────────┐
                             │ 8. CONFIDENCE       │
                             │ & SMOOTHING         │
                             │ (Filter + average)  │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │ 9. GPT ANALYSIS      │
                             │ (Every 30 frames)    │
                             │ Contextual Feedback  │
                             └──────────┬───────────┘
                                        │
                                        ▼
                             ┌──────────────────────┐
                             │ VOICE + TEXT OUTPUT  │
                             │ Real-time Coaching   │
                             └──────────────────────┘
```

---

## Key Metrics at a Glance

### 1️⃣ Joint Positions (Per Frame)

```
Output: 17 joints × (x, y, confidence)
Example:
  left_knee: {x: 245, y: 380, score: 0.95}
  right_knee: {x: 255, y: 382, score: 0.92}
```

### 2️⃣ Joint Angles (Per Frame)

```
Knee Angle:  85-175°  (90° sitting, 170° standing)
Hip Angle:   70-180°  (85° sitting, 170° standing)
Back Angle:  60-180°  (70° sitting, 175° standing)
```

### 3️⃣ Range of Motion (Per Rep)

```
ROM = Max Angle - Min Angle
Example: 170° - 92° = 78° ROM
↑ Healthy ROM: 70-90°
```

### 4️⃣ Timing (Per Phase)

```
Sit to Stand:   Ideal 20-30 frames (~0.7-1.0 sec)
Stand to Sit:   Ideal 20-30 frames (~0.7-1.0 sec)
Total Cycle:    Ideal 40-60 frames (~1.3-2.0 sec)

Flagged if:
  < 15 frames: Too fast (risky)
  > 40 frames: Too slow (fatigued)
```

### 5️⃣ Symmetry Score (Per Rep)

```
Score = 100 - (difference / 50 * 100)
100% = Perfect (L knee = R knee)
80% = Good (10° difference)
60% = Warn (20° difference)
<50% = Flag (>25° difference)
```

### 6️⃣ Stability/Balance (Per Frame)

```
Head Movement:   < 10px stable, >20px unstable
X-Drift (sway):  < 10px stable, >15px flag
Vertical Jitter: < 8px smooth, >12px jittery
```

### 7️⃣ Depth Detection (Per Rep)

```
Full Sit:     Hip drops 100+ pixels + brief pause
Half Squat:   Hip drops 50-80 pixels + no pause
Controlled:   Smooth descent, not dropping
Flag if:      Inconsistent depth per rep
```

### 8️⃣ Confidence Filtering

```
Keypoint score < 0.5   → Ignore (not confident)
Keypoint score ≥ 0.5   → Use in calculation
Smoothed over 5 frames → Reduces jitter
```

### 9️⃣ GPT Feedback (Every ~1 second)

```
Input: All above metrics
Output: 1-2 sentence coaching cue
Example: "Great balance! Both legs working together."
```

---

## Quick Decision Tree for Feedback

```
Is there a safety issue?
├─ YES: Knee angle > 175°?
│       → "Don't lock your knees. Keep a slight bend."
├─ YES: Back angle < 50°?
│       → "STOP! You're leaning too far. Straighten up."
├─ YES: Head movement > 20px?
│       → "Use support if you feel unsteady."
└─ NO: Continue below

Is form degrading (late rep vs early)?
├─ YES: Depth decreasing?
│       → "You're getting tired. Take your time."
├─ YES: Tempo speeding up?
│       → "Slow down. Control is more important."
├─ YES: Asymmetry growing?
│       → "Balance your weight between both legs."
└─ NO: Continue below

Is form good but suboptimal?
├─ YES: ROM less than 60°?
│       → "Try to bend a bit more if it feels comfortable."
├─ YES: Asymmetry > 15°?
│       → "Try to work both legs equally."
├─ YES: Tempo inconsistent?
│       → "Keep a steady pace, smooth and even."
└─ NO: Continue below

Form is good! Provide encouragement:
├─ Great symmetry?
│   → "Excellent symmetry! Both legs working together."
├─ Smooth & controlled?
│   → "Perfect! Keep that form."
├─ Good depth?
│   → "Nice control! Full range of motion."
└─ Or just:
    → "You're doing great! Keep it up!"
```

---

## Rep Quality Scoring (0-100)

```
Base Score: 50

Add Points:
+ Symmetry > 90%:        +15 pts
+ Depth > 70°:           +10 pts
+ Timing consistent:     +10 pts
+ Stability > 80%:       +10 pts
+ No form issues:        +15 pts
+ Smooth movement:       +10 pts

Subtract Points:
- Asymmetry > 25°:       -15 pts
- Depth < 50°:           -15 pts
- Stability < 60%:       -10 pts
- Form issues present:   -10 pts
- Very fast or slow:     -5 pts

Rep Quality:
  > 80:  Excellent
  60-80: Good
  40-60: Fair (could improve)
  < 40:  Poor (needs correction)
```

---

## Telemetry Collected Per Session

```
Session Data:
├─ Duration (frames): 500
├─ Reps completed: 5
├─ Reps quality scores: [85, 78, 82, 65, 60]
├─ Average quality: 74%
├─ Total depth variation: 18° (consistency)
├─ Total symmetry variation: 22° (consistency)
│
├─ Per-Rep Breakdown:
│  ├─ Rep 1: 95° min, 168° max, 0.92 sym, 26 frames down, 25 up
│  ├─ Rep 2: 98° min, 166° max, 0.85 sym, 24 frames down, 24 up
│  ├─ Rep 3: 92° min, 169° max, 0.90 sym, 28 frames down, 27 up
│  ├─ Rep 4: 105° min, 164° max, 0.70 sym, 20 frames down, 22 up
│  └─ Rep 5: 103° min, 162° max, 0.65 sym, 18 frames down, 20 up
│
└─ Trends:
   ├─ Depth decreasing (fatigue)
   ├─ Symmetry decreasing (one leg tiring)
   ├─ Speed increasing (rushing)
   └─ Recommendation: Rest, good first 3 reps
```

---

## Configuration Values

```javascript
// In CONFIG object:

KEYPOINT_CONFIDENCE: 0.5
  → Only use joints detected with >50% confidence

SMOOTHING_FRAMES: 5
  → Average positions over 5 frames to reduce jitter

FEEDBACK_COOLDOWN: 4000
  → Wait 4 seconds between feedback messages

IDEAL_FORM:
  kneeAngle: { min: 85, max: 175, sitting: 90, standing: 170 }
  hipAngle: { min: 70, max: 180, sitting: 85, standing: 170 }
  backAngle: { min: 60, max: 180, sitting: 70, standing: 175 }

POSITION_THRESHOLDS:
  sitToStandKneeAngle: 130   (> 130° = standing)
  standToSitKneeAngle: 110   (< 110° = sitting)
  minFramesHeld: 10          (Must hold 10 frames to confirm)
```

---

## Debugging / Troubleshooting

### Issue: Reps not counting

```
Check:
1. Knee angle smoothing: Is it stable?
2. Position threshold: 110° < detected < 130°?
3. Frame holding: Is person staying in position 10+ frames?
```

### Issue: Feedback not making sense

```
Check:
1. Angles being calculated correctly?
   Print: angles.leftKnee, angles.rightKnee
2. GPT getting proper context?
   Print: formDescription variable
3. Cooldown not blocking feedback?
   Check: lastFeedbackTime vs now
```

### Issue: Skeleton jittery/jerky

```
Check:
1. Increase smoothing: SMOOTHING_FRAMES = 8 (was 5)
2. Increase confidence threshold: KEYPOINT_CONFIDENCE = 0.6 (was 0.5)
3. Check webcam resolution: Is it 640×480+?
```

### Issue: False symmetry readings

```
Check:
1. Person fully in frame?
2. Both ankles visible?
3. Uneven lighting causing joint detection issues?
4. Person standing at an angle (not head-on)?
```

---

## Integration Points

### Real-time Display (Could add):

```html
<div>Knee: 95° | Hip: 85° | Back: 65°</div>
<div>Symmetry: 92% | Stability: 85%</div>
<div>Rep 3: Min 92°, Max 168°, 26 frames</div>
```

### Export Data (Could add):

```json
{
  "session_id": "2025-11-22-001",
  "duration_seconds": 45,
  "reps": 5,
  "rep_metrics": [...],
  "average_quality": 74,
  "feedback_given": 12
}
```

### Medical/PT Integration (Could add):

```
POST /api/patient/5821/exercise_session
{
  "exercise_type": "sit-to-stand",
  "rep_count": 5,
  "quality_score": 74,
  "pain_level": null,
  "notes": "Fatigue in leg 4-5"
}
```

---

This system provides **clinical-grade movement analysis** for a healthcare app. 🏥
