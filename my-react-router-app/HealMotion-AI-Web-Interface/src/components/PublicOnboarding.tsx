import { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Checkbox } from './ui/checkbox';
import { ArrowLeft } from 'lucide-react';
import type { UserProfile } from '../App';

type PublicOnboardingProps = {
  onComplete: (profile: UserProfile) => void;
  onBack: () => void;
};

export function PublicOnboarding({ onComplete, onBack }: PublicOnboardingProps) {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<Partial<UserProfile>>({
    conditions: [],
    injuries: [],
    goals: [],
  });

  const totalSteps = 4;

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

  const injuries = [
    'Hip Surgery',
    'Knee Surgery',
    'Shoulder Surgery',
    'Spine Surgery',
    'Fracture Recovery',
    'Fall Injury',
    'None',
  ];

  const activityLevels = [
    'Sedentary - Mostly sitting or lying down',
    'Light Activity - Short walks, light household tasks',
    'Moderate Activity - Regular walking, some exercise',
    'Active - Regular exercise and physical activity',
  ];

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Set some default goals for the final step
      if (!profile.goals || profile.goals.length === 0) {
        profile.goals = ['Improve Mobility', 'Better Balance', 'Pain Management'];
      }
      onComplete(profile as UserProfile);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    } else {
      onBack();
    }
  };

  const toggleArrayItem = (key: 'conditions' | 'injuries', item: string) => {
    const currentArray = profile[key] || [];
    const newArray = currentArray.includes(item)
      ? currentArray.filter((i) => i !== item)
      : [...currentArray, item];
    setProfile({ ...profile, [key]: newArray });
  };

  const setActivityLevel = (level: string) => {
    setProfile({ ...profile, goals: [level] });
  };

  const isStepValid = () => {
    switch (step) {
      case 1:
        return profile.age && profile.gender && profile.height && profile.weight;
      case 2:
        return profile.conditions && profile.conditions.length > 0;
      case 3:
        return true;
      case 4:
        return true;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-6">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 text-slate-700 hover:text-purple-600 transition-colors mb-4"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          <h1 className="text-slate-900 mb-2">Let's Create Your Recovery Plan</h1>
          <p className="text-slate-600">Step {step} of {totalSteps}</p>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6">
          <div className="h-2 bg-slate-100">
            <div
              className="h-full bg-purple-600 transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-6 py-12">
        {step === 1 && (
          <div>
            <h2 className="text-slate-900 mb-2">Personal Details</h2>
            <p className="text-slate-600 mb-8">Help us understand your basic information</p>

            <div className="space-y-6 bg-white p-8 border border-slate-200 rounded-lg">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    type="number"
                    placeholder="Enter your age"
                    value={profile.age || ''}
                    onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) })}
                    className="h-14 bg-white border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <select
                    id="gender"
                    value={profile.gender || ''}
                    onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    className="w-full h-14 px-3 rounded-md border border-slate-300 bg-white"
                  >
                    <option value="">Select gender</option>
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
                    placeholder="Enter height"
                    value={profile.height || ''}
                    onChange={(e) => setProfile({ ...profile, height: parseInt(e.target.value) })}
                    className="h-14 bg-white border-slate-300"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="Enter weight"
                    value={profile.weight || ''}
                    onChange={(e) => setProfile({ ...profile, weight: parseInt(e.target.value) })}
                    className="h-14 bg-white border-slate-300"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h2 className="text-slate-900 mb-2">Health Conditions</h2>
            <p className="text-slate-600 mb-8">Select all conditions that apply to you</p>

            <div className="space-y-3">
              {conditions.map((condition) => (
                <button
                  key={condition}
                  onClick={() => toggleArrayItem('conditions', condition)}
                  className="w-full flex items-center gap-4 p-5 bg-white border-2 border-slate-200 rounded-lg hover:border-purple-600 transition-colors text-left"
                >
                  <Checkbox
                    checked={profile.conditions?.includes(condition)}
                    onCheckedChange={() => toggleArrayItem('conditions', condition)}
                  />
                  <span className="text-slate-900">{condition}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h2 className="text-slate-900 mb-2">Previous Injuries or Surgeries</h2>
            <p className="text-slate-600 mb-8">Select any past injuries or surgeries (optional)</p>

            <div className="space-y-3">
              {injuries.map((injury) => (
                <button
                  key={injury}
                  onClick={() => toggleArrayItem('injuries', injury)}
                  className="w-full flex items-center gap-4 p-5 bg-white border-2 border-slate-200 rounded-lg hover:border-purple-600 transition-colors text-left"
                >
                  <Checkbox
                    checked={profile.injuries?.includes(injury)}
                    onCheckedChange={() => toggleArrayItem('injuries', injury)}
                  />
                  <span className="text-slate-900">{injury}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-slate-900 mb-2">Daily Activity Level</h2>
            <p className="text-slate-600 mb-8">Help us understand your current activity level</p>

            <div className="space-y-3">
              {activityLevels.map((level) => (
                <button
                  key={level}
                  onClick={() => setActivityLevel(level)}
                  className={`w-full flex items-center gap-4 p-5 bg-white border-2 rounded-lg transition-colors text-left ${
                    profile.goals?.includes(level)
                      ? 'border-purple-600 bg-purple-50'
                      : 'border-slate-200 hover:border-purple-600'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      profile.goals?.includes(level)
                        ? 'border-purple-600 bg-purple-600'
                        : 'border-slate-300'
                    }`}
                  >
                    {profile.goals?.includes(level) && (
                      <div className="w-2 h-2 bg-white rounded-full" />
                    )}
                  </div>
                  <span className="text-slate-900">{level}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-4 mt-10">
          <Button
            onClick={handleNext}
            disabled={!isStepValid()}
            className="flex-1 h-16 bg-purple-600 hover:bg-purple-700 text-white disabled:bg-slate-300 disabled:text-slate-500"
          >
            {step === totalSteps ? 'Start My Personalized Recovery Plan' : 'Continue'}
          </Button>
        </div>
      </div>
    </div>
  );
}
