# ✋ Hand Osteoarthritis Exercise Assistant

A browser-based AI coaching tool for finger flexion & extension exercises. Real-time pose tracking, form analysis, and voice guidance.

## ✨ Features

✅ **Real-time Pose Detection** - Uses TensorFlow.js + BlazePose for arm and hand tracking  
✅ **Finger Flexion Detection** - Estimates flex/extend state from elbow angle  
✅ **Rep Counting** - Automatically counts extend→flex→extend cycles  
✅ **Voice Coaching** - Personalized audio feedback on hand position (with cooldown)  
✅ **Visual Guidance** - Hand illustration showing ideal form (extended/flexed)  
✅ **Live Stats** - Reps, hand state, and form quality in real-time  
✅ **No Backend Required** - Runs entirely in your browser (local-first privacy)

## 🚀 Quick Start

### Option 1: Simple Local Server (Recommended)

1. **Navigate to the project folder:**

   ```bash
   cd /Users/ethanzhang/Desktop/seniorgym/sit-to-stand-ai
   ```

2. **Start a simple Python HTTP server:**

   ```bash
   # Python 3
   python3 -m http.server 8000

   # OR Python 2
   python -m SimpleHTTPServer 8000
   ```

3. **Open in your browser:**

   - Go to `http://localhost:8000`
   - Allow webcam access when prompted

4. **Start the exercise:**
   - Click "Start Exercise"
   - Perform sit-to-stand movements
   - Listen to voice feedback
   - Click "Stop Exercise" when done

### Option 2: Using Node.js http-server

1. **Install http-server globally:**

   ```bash
   npm install -g http-server
   ```

2. **Run from the project folder:**

   ```bash
   cd /Users/ethanzhang/Desktop/seniorgym/sit-to-stand-ai
   http-server
   ```

3. **Open in your browser:**
   - Go to `http://localhost:8080` (or the port shown in terminal)

### Option 3: Direct File Opening (Limited)

You can also open `index.html` directly in your browser:

```bash
open index.html
```

⚠️ **Note:** Browser security may prevent webcam access with the `file://` protocol. Use a local server instead.

## 📋 How to Use

1. **Setup**

   - Position yourself 3-4 feet from your camera
   - Ensure good lighting
   - Wear clothes that show your body outline clearly

2. **Start**

   - Click "Start Exercise"
   - Allow webcam access
   - Position your right hand and arm in view
   - Hear the audio prompt

3. **Exercise**

   - Perform controlled finger extend/flex movements
   - Keep your arm visible to the camera
   - The app tracks your hand and provides real-time voice feedback
   - Watch the rep counter increment

4. **View Results**

   - Check your rep count
   - Monitor form quality indicators
   - Listen for coaching cues

5. **Stop**
   - Click "Stop Exercise"
   - Hear final rep count
   - Rest and recover

## 📐 Form Analysis Details

### Hand Position States

- **Extended:** Arm straight, fingers open
- **Flexed:** Arm bent, fingers curled/closed

### Detection Method

- Uses elbow angle to estimate finger flexion
- Straight arm (180°) = fingers extended
- Bent arm (90°) = fingers flexed
- Smooth transitions between states

## 🎤 Voice Feedback Examples

The system provides guidance when tracking your hand:

- ✓ "Keep up the great work!"
- 🛑 "Please show your hand to the camera."
- 🛑 "Relax your hand. Don't over-clench your fingers."

## 📁 File Structure

```
sit-to-stand-ai/
├── index.html          # Main HTML page (UI layout & styling)
├── script.js           # Main JavaScript (all logic)
└── README.md           # This file
```

## 🔧 Configuration

Edit the `CONFIG` object in `script.js` to customize:

```javascript
CONFIG = {
  IDEAL_FORM: {
    kneeAngle: { min: 85, max: 175 },
    hipAngle: { min: 70, max: 180 },
    backAngle: { min: 60, max: 180 },
  },
  POSITION_THRESHOLDS: {
    sitToStandKneeAngle: 130,
    standToSitKneeAngle: 110,
    minFramesHeld: 10,
  },
  FEEDBACK_COOLDOWN: 3000, // milliseconds
  KEYPOINT_CONFIDENCE: 0.5,
};
```

## 🖥️ Browser Compatibility

- ✅ Chrome 90+
- ✅ Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Mobile browsers (iOS 14.5+, Android Chrome)

**Requirements:**

- WebGL (for TensorFlow.js)
- WebRTC (for webcam access)
- Web Audio API (for voice synthesis)

## 🛡️ Privacy & Safety

- ✅ **No data sent to servers** - All processing happens locally in your browser
- ✅ **Webcam data never stored** - Only used for real-time pose detection
- ✅ **No cookies or tracking** - Pure local-first operation
- ⚠️ **Not medical advice** - This is a coaching tool, not a diagnostic tool
- ⚠️ **Always consult a healthcare provider** before starting any exercise program

## 🚧 Improvement Ideas

### Phase 1 (MVP)

- [ ] Add progress chart (reps over time)
- [ ] Store session history in localStorage
- [ ] Add video recording option (client-side)
- [ ] Add difficulty levels (beginner, intermediate, advanced)

### Phase 2 (Enhanced)

- [ ] Add more exercises (step-ups, leg raises, etc.)
- [ ] Implement form scoring system (0-100%)
- [ ] Add personalized targets based on initial assessment
- [ ] Add break timer between sets
- [ ] Compare session-to-session progress

### Phase 3 (Advanced)

- [ ] Backend integration for saving user profiles
- [ ] Physical therapist dashboard to monitor patients
- [ ] ML-based form prediction (better angle detection)
- [ ] Multi-language support
- [ ] Integration with wearables (Apple Watch, Fitbit)

### Technical Debt

- [ ] Add error handling for edge cases
- [ ] Optimize pose detection performance (use worker threads)
- [ ] Add unit tests
- [ ] Cache models for offline use
- [ ] Add WebGL fallback for older browsers

## 🐛 Troubleshooting

### No webcam access

- Check browser permissions
- Try a different browser
- Use HTTPS (required by many browsers)
- Restart the app

### Poor pose detection

- Improve lighting (face a light source)
- Wear contrasting colors
- Increase distance from camera (3-4 feet)
- Ensure full body is visible
- Try facing the camera head-on (not at an angle)

### Voice not working

- Check system volume
- Check browser audio permissions
- Try in a different browser
- Test with a simple site like howlerjs.com

### Jerky movement tracking

- Close other apps using GPU
- Reduce video quality (lower resolution)
- Disable other browser tabs
- Restart browser

## 📚 Technical Stack

- **Pose Detection:** TensorFlow.js + BlazePose
- **Geometry:** Angle calculations from 2D keypoints
- **Audio:** Web Speech Synthesis API
- **Rendering:** HTML5 Canvas
- **Backend:** None (local-first)

## 🔗 Resources

- [TensorFlow.js Pose Detection](https://github.com/tensorflow/tfjs-models/tree/master/pose-detection)
- [BlazePose Model](https://google.github.io/mediapipe/solutions/pose.html)
- [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Canvas API](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API)

## ⚖️ License

This is an open-source project for educational and healthcare purposes.

## 👨‍💼 Support

For issues or suggestions, check:

1. Browser console for errors (F12 → Console tab)
2. Troubleshooting section above
3. Ensure TensorFlow.js loads (check Network tab in DevTools)

---

**⚠️ Important Disclaimer:**

This tool is designed for **coaching and guidance only**. It is NOT a medical device and should NOT replace professional medical advice. Always consult with a healthcare provider before starting any new exercise program, especially if you have knee osteoarthritis or other joint conditions.

Stay safe and healthy! 🏃‍♀️
