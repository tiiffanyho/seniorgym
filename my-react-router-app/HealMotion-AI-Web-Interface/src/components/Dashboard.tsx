import { Button } from './ui/button';
import { Dumbbell, Video, FileText, ArrowRight } from 'lucide-react';
import type { PageType, UserProfile } from '../App';

type DashboardProps = {
  onNavigate: (page: PageType) => void;
  userProfile: UserProfile;
};

export function Dashboard({ onNavigate, userProfile }: DashboardProps) {
  return (
    <div className="min-h-screen pb-24 bg-white">
      {/* Header */}
      <div className="bg-purple-600 border-b border-purple-700">
        <div className="max-w-6xl mx-auto px-6 py-8">
          <h1 className="mb-2 text-white">Welcome back!</h1>
          <p className="text-purple-100">Let's continue your recovery journey</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Quick Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-slate-600 mb-1">Total Sessions</p>
                <p className="text-slate-900">12 completed</p>
              </div>
              <Dumbbell className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-slate-600 mb-1">This Week</p>
                <p className="text-slate-900">3 sessions</p>
              </div>
              <Video className="w-10 h-10 text-purple-600" />
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-slate-600 mb-1">Progress</p>
                <p className="text-slate-900">Excellent</p>
              </div>
              <FileText className="w-10 h-10 text-purple-600" />
            </div>
          </div>
        </div>

        {/* Main Action Section */}
        <div className="bg-purple-600 p-8 mb-10 rounded-lg border border-purple-700">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="text-white">
              <h2 className="text-white mb-3">Ready for Today's Session?</h2>
              <p className="text-purple-100 mb-6 max-w-2xl">
                You have 4 exercises scheduled for today. Each session takes about 15-20 minutes.
              </p>
              <Button
                onClick={() => onNavigate('live')}
                className="h-14 px-8 bg-white text-purple-600 hover:bg-purple-50"
              >
                <Video className="w-5 h-5 mr-2" />
                Start Exercise Session
              </Button>
            </div>
            <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center">
              <Dumbbell className="w-12 h-12 text-white" />
            </div>
          </div>
        </div>

        {/* Main Sections */}
        <div className="border-t border-slate-200 pt-10">
          <h2 className="text-slate-900 mb-6">Your Recovery Tools</h2>
          
          <div className="space-y-4">
            {/* My Exercise Plan */}
            <button
              onClick={() => onNavigate('plan')}
              className="w-full bg-white border-2 border-slate-200 hover:border-purple-600 p-6 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Dumbbell className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 mb-1">My Exercise Plan</h3>
                    <p className="text-slate-600">
                      View your personalized exercises based on your health conditions and recovery goals
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-400" />
              </div>
            </button>

            {/* Live Motion Tracking */}
            <button
              onClick={() => onNavigate('live')}
              className="w-full bg-white border-2 border-slate-200 hover:border-purple-600 p-6 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <Video className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 mb-1">Live Motion Tracking</h3>
                    <p className="text-slate-600">
                      Start your exercise session with real-time AI guidance and feedback on your form
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-400" />
              </div>
            </button>

            {/* Health Reports */}
            <button
              onClick={() => onNavigate('reports')}
              className="w-full bg-white border-2 border-slate-200 hover:border-purple-600 p-6 rounded-lg transition-colors text-left"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                    <FileText className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="text-slate-900 mb-1">Health Reports & Sharing</h3>
                    <p className="text-slate-600">
                      View your progress reports and share them with your healthcare provider or pharmacy
                    </p>
                  </div>
                </div>
                <ArrowRight className="w-6 h-6 text-slate-400" />
              </div>
            </button>
          </div>
        </div>

        {/* Active Goals */}
        <div className="mt-10 border-t border-slate-200 pt-10">
          <h3 className="text-slate-900 mb-4">Your Active Recovery Goals</h3>
          <div className="flex flex-wrap gap-3">
            {userProfile.goals.map((goal) => (
              <div key={goal} className="px-5 py-3 bg-purple-50 text-purple-700 rounded-full border border-purple-200">
                {goal}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
