import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft, Save, Edit2 } from 'lucide-react';
import type { PageType, UserProfile } from '../App';

type SettingsProps = {
  userProfile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  onNavigate: (page: PageType) => void;
};

export function Settings({ userProfile, onUpdate, onNavigate }: SettingsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [profile, setProfile] = useState<UserProfile>(userProfile);

  const conditions = [
    'Arthritis',
    'Joint Pain',
    'Osteoporosis',
    'Hip Replacement',
    'Knee Replacement',
    'Stroke Recovery',
    'Balance Issues',
    'Chronic Pain',
  ];

  const goals = [
    'Improve Mobility',
    'Better Balance',
    'Improve Posture',
    'Build Strength',
    'Pain Management',
    'Prevent Falls',
    'Daily Independence',
  ];

  const handleSave = () => {
    onUpdate(profile);
    setIsEditing(false);
    alert('Profile updated successfully!');
  };

  const toggleArrayItem = (key: 'conditions' | 'goals', item: string) => {
    const currentArray = profile[key] || [];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i) => i !== item)
      : [...currentArray, item];
    setProfile({ ...profile, [key]: newArray });
  };

  return (
    <div className="min-h-screen pb-24 bg-white">
      {/* Header */}
      <div className="bg-purple-600 border-b border-purple-700">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 text-white hover:text-purple-100 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back to Dashboard</span>
          </button>
          <h1 className="mb-2 text-white">Profile & Settings</h1>
          <p className="text-purple-100">Manage your personal information and preferences</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        <div className="bg-white border-2 border-slate-200 p-8 rounded-lg mb-6">
          <div className="flex items-center justify-between mb-8 pb-6 border-b border-slate-200">
            <h2 className="text-slate-900">Your Profile</h2>
            {!isEditing && (
              <Button
                onClick={() => setIsEditing(true)}
                className="h-12 px-6 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Edit2 className="w-4 h-4 mr-2" />
                Edit Profile
              </Button>
            )}
          </div>

          {/* Basic Information */}
          <div className="mb-8">
            <h3 className="text-slate-900 mb-4">Basic Information</h3>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="age">Age</Label>
                <Input
                  id="age"
                  type="number"
                  value={profile.age}
                  onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })}
                  disabled={!isEditing}
                  className="h-12 border-slate-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <select
                  id="gender"
                  value={profile.gender}
                  onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                  disabled={!isEditing}
                  className="w-full h-12 px-3 rounded-md border border-slate-300 bg-white disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="height">Height (cm)</Label>
                <Input
                  id="height"
                  type="number"
                  value={profile.height}
                  onChange={(e) => setProfile({ ...profile, height: parseInt(e.target.value) })}
                  disabled={!isEditing}
                  className="h-12 border-slate-300"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="weight">Weight (kg)</Label>
                <Input
                  id="weight"
                  type="number"
                  value={profile.weight}
                  onChange={(e) => setProfile({ ...profile, weight: parseInt(e.target.value) })}
                  disabled={!isEditing}
                  className="h-12 border-slate-300"
                />
              </div>
            </div>
          </div>

          {/* Health Conditions */}
          <div className="mb-8 pb-8 border-b border-slate-200">
            <h3 className="text-slate-900 mb-4">Health Conditions</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {conditions.map((condition) => (
                <button
                  key={condition}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 ${
                    isEditing ? 'hover:border-purple-600 cursor-pointer' : 'bg-slate-50 cursor-default'
                  } ${profile.conditions.includes(condition) ? 'border-purple-600 bg-purple-50' : 'border-slate-200'}`}
                  onClick={() => isEditing && toggleArrayItem('conditions', condition)}
                  disabled={!isEditing}
                >
                  <Checkbox
                    checked={profile.conditions.includes(condition)}
                    onCheckedChange={() => isEditing && toggleArrayItem('conditions', condition)}
                    disabled={!isEditing}
                  />
                  <span className="flex-1 text-left text-slate-900">{condition}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Recovery Goals */}
          <div className="mb-8">
            <h3 className="text-slate-900 mb-4">Recovery Goals</h3>
            <div className="grid md:grid-cols-2 gap-4">
              {goals.map((goal) => (
                <button
                  key={goal}
                  className={`flex items-center space-x-3 p-4 rounded-lg border-2 ${
                    isEditing ? 'hover:border-purple-600 cursor-pointer' : 'bg-slate-50 cursor-default'
                  } ${profile.goals.includes(goal) ? 'border-purple-600 bg-purple-50' : 'border-slate-200'}`}
                  onClick={() => isEditing && toggleArrayItem('goals', goal)}
                  disabled={!isEditing}
                >
                  <Checkbox
                    checked={profile.goals.includes(goal)}
                    onCheckedChange={() => isEditing && toggleArrayItem('goals', goal)}
                    disabled={!isEditing}
                  />
                  <span className="flex-1 text-left text-slate-900">{goal}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          {isEditing && (
            <div className="flex gap-4">
              <Button
                onClick={() => {
                  setProfile(userProfile);
                  setIsEditing(false);
                }}
                variant="outline"
                className="flex-1 h-14 border-2 border-slate-300"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                className="flex-1 h-14 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Save className="w-5 h-5 mr-2" />
                Save Changes
              </Button>
            </div>
          )}
        </div>

        {/* Additional Settings */}
        <div className="bg-white border-2 border-slate-200 p-8 rounded-lg">
          <h2 className="text-slate-900 mb-6">Preferences</h2>
          
          <div className="space-y-6">
            <div className="flex items-center justify-between py-4 border-b border-slate-200">
              <div>
                <p className="text-slate-900 mb-1">Voice Guidance</p>
                <p className="text-sm text-slate-600">Enable audio feedback during exercises</p>
              </div>
              <Checkbox defaultChecked />
            </div>

            <div className="flex items-center justify-between py-4 border-b border-slate-200">
              <div>
                <p className="text-slate-900 mb-1">Email Notifications</p>
                <p className="text-sm text-slate-600">Receive reminders and progress updates</p>
              </div>
              <Checkbox defaultChecked />
            </div>

            <div className="flex items-center justify-between py-4 border-b border-slate-200">
              <div>
                <p className="text-slate-900 mb-1">Weekly Reports</p>
                <p className="text-sm text-slate-600">Automatically send reports to healthcare provider</p>
              </div>
              <Checkbox />
            </div>

            <div className="flex items-center justify-between py-4">
              <div>
                <p className="text-slate-900 mb-1">High Contrast Mode</p>
                <p className="text-sm text-slate-600">Improve visibility for better accessibility</p>
              </div>
              <Checkbox />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
