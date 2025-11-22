#!/usr/bin/env python3
import re

# Read the file
with open('my-react-router-app/app/features/pose-coach.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Define emoji replacements
replacements = [
    ('🏥 Clinical Arthritis Guidelines', 'Clinical Arthritis Guidelines'),
    ('⏳ Waiting for Pose Detection', 'Waiting for Pose Detection'),
    ("'✓'", "'Y'"),
    ("'✗'", "'N'"),
    ("'⚠'", "'!'"),
    ('⚠️ Important Safety Notice', 'Important Safety Notice'),
    ('🎯 Tracked Joints', 'Tracked Joints'),
    ('🏥 Arthritis-Safe Guidelines', 'Arthritis-Safe Guidelines'),
    ('💡 Real-Time Feedback', 'Real-Time Feedback'),
    ('⏱️ {recordingDuration', 'Time: {recordingDuration'),
    ('📊 {recordingFrameCount} frames', 'Frames: {recordingFrameCount}'),
    ('🔁 {repStateRef.current.reps} reps', 'Reps: {repStateRef.current.reps}'),
    ('✅ Good visibility', 'Good visibility'),
    ('⚠️ Low visibility', 'Low visibility'),
    ('icon="🦵"', 'icon=""'),
    ('icon="💪"', 'icon=""'),
    ("'✅'", "''"),
    ("'👍'", "''"),
    ("'⚠️'", "''"),
    ("'🚨'", "''"),
    ("'✓'", "'OK'"),
    ("'✗'", "'HIGH'"),
    ('🔊 Voice guidance', 'Voice guidance'),
    ('📹 For a good recording:', 'For a good recording:'),
]

# Apply replacements
for old, new in replacements:
    content = content.replace(old, new)

# Update CompactJointDisplay to not show icon
content = content.replace(
    '''  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          <span className="text-lg">{icon}</span>
          <span className="font-semibold text-xs">{label}</span>
        </div>
        <div className={`text-xl font-bold ${getAngleColor(angle)}`}>
          {angle.toFixed(0)}°
        </div>
      </div>''',
    '''  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-semibold text-sm">{label}</span>
        <div className={`text-xl font-bold ${getAngleColor(angle)}`}>
          {angle.toFixed(0)}°
        </div>
      </div>'''
)

# Safety assessment - replace emojis with text labels
content = content.replace(
    '''              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                {arthritisAssessment.safetyLevel === 'excellent' && ''}
                {arthritisAssessment.safetyLevel === 'good' && ''}
                {arthritisAssessment.safetyLevel === 'caution' && ''}
                {arthritisAssessment.safetyLevel === 'warning' && ''}
                <span>Safety Assessment</span>
              </h2>''',
    '''              <h2 className="text-lg font-semibold mb-2 flex items-center gap-2">
                <span>Safety Assessment</span>
                {arthritisAssessment.safetyLevel === 'excellent' && <span className="text-green-600">(Excellent)</span>}
                {arthritisAssessment.safetyLevel === 'good' && <span className="text-blue-600">(Good)</span>}
                {arthritisAssessment.safetyLevel === 'caution' && <span className="text-yellow-600">(Caution)</span>}
                {arthritisAssessment.safetyLevel === 'warning' && <span className="text-red-600">(Warning)</span>}
              </h2>'''
)

# Write the file
with open('my-react-router-app/app/features/pose-coach.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("✓ Emojis removed successfully")
