import { Button } from './ui/button';
import { ArrowLeft, Download, Send, TrendingUp, Calendar, Activity } from 'lucide-react';
import type { PageType } from '../App';

type ReportsProps = {
  onNavigate: (page: PageType) => void;
};

export function Reports({ onNavigate }: ReportsProps) {
  const recentSessions = [
    { date: 'Nov 22, 2025', exercises: 4, duration: '24 min', compliance: 100 },
    { date: 'Nov 20, 2025', exercises: 4, duration: '26 min', compliance: 100 },
    { date: 'Nov 18, 2025', exercises: 3, duration: '18 min', compliance: 75 },
    { date: 'Nov 15, 2025', exercises: 4, duration: '25 min', compliance: 100 },
    { date: 'Nov 13, 2025', exercises: 4, duration: '23 min', compliance: 100 },
  ];

  const handleSendToProvider = () => {
    alert('Report will be sent to your healthcare provider via secure email');
  };

  const handleSendToPharmacy = () => {
    alert('Report will be sent to your pharmacy');
  };

  const handleDownload = () => {
    alert('Report downloaded as PDF');
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
          <h1 className="mb-2 text-white">Health & Progress Reports</h1>
          <p className="text-purple-100">Track your recovery journey and share with your care team</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Summary Stats */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-purple-50 border-2 border-purple-200 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <TrendingUp className="w-10 h-10 text-purple-600" />
            </div>
            <p className="text-slate-600 mb-1">Overall Progress</p>
            <p className="text-slate-900">Excellent</p>
            <p className="text-sm text-slate-600 mt-2">95% compliance rate</p>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <Calendar className="w-10 h-10 text-blue-600" />
            </div>
            <p className="text-slate-600 mb-1">Sessions This Month</p>
            <p className="text-slate-900">12 completed</p>
            <p className="text-sm text-slate-600 mt-2">3 sessions per week</p>
          </div>

          <div className="bg-teal-50 border-2 border-teal-200 p-6 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <Activity className="w-10 h-10 text-teal-600" />
            </div>
            <p className="text-slate-600 mb-1">Total Exercise Time</p>
            <p className="text-slate-900">5 hours 12 min</p>
            <p className="text-sm text-slate-600 mt-2">This month</p>
          </div>
        </div>

        {/* Report Card */}
        <div className="bg-white border-2 border-slate-200 p-8 mb-8 rounded-lg">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 mb-8 pb-6 border-b border-slate-200">
            <div>
              <h2 className="text-slate-900 mb-2">Monthly Progress Report</h2>
              <p className="text-slate-600">November 2025 - Recovery Summary</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                onClick={handleSendToProvider}
                className="h-12 px-6 bg-purple-600 hover:bg-purple-700 text-white"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to Healthcare Provider
              </Button>
              <Button
                onClick={handleSendToPharmacy}
                variant="outline"
                className="h-12 px-6 border-2 border-slate-300"
              >
                <Send className="w-4 h-4 mr-2" />
                Send to Pharmacy
              </Button>
              <Button
                onClick={handleDownload}
                variant="outline"
                className="h-12 px-6 border-2 border-slate-300"
              >
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
            </div>
          </div>

          {/* Report Content */}
          <div className="space-y-8">
            {/* Exercise Summary */}
            <div>
              <h3 className="text-slate-900 mb-4">Exercise Summary</h3>
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 space-y-4">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <p className="text-slate-600 mb-1">Total Sessions</p>
                    <p className="text-slate-900">12 sessions completed</p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-1">Average Duration</p>
                    <p className="text-slate-900">24 minutes per session</p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-1">Compliance Rate</p>
                    <p className="text-slate-900">95% (Excellent)</p>
                  </div>
                  <div>
                    <p className="text-slate-600 mb-1">Form Accuracy</p>
                    <p className="text-slate-900">92% (Very Good)</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Sessions */}
            <div>
              <h3 className="text-slate-900 mb-4">Recent Sessions</h3>
              <div className="overflow-x-auto border border-slate-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th className="text-left py-4 px-6 text-slate-900">Date</th>
                      <th className="text-left py-4 px-6 text-slate-900">Exercises</th>
                      <th className="text-left py-4 px-6 text-slate-900">Duration</th>
                      <th className="text-left py-4 px-6 text-slate-900">Compliance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentSessions.map((session, index) => (
                      <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                        <td className="py-4 px-6 text-slate-900">{session.date}</td>
                        <td className="py-4 px-6 text-slate-600">{session.exercises} exercises</td>
                        <td className="py-4 px-6 text-slate-600">{session.duration}</td>
                        <td className="py-4 px-6">
                          <span
                            className={`px-3 py-1 rounded-full ${
                              session.compliance === 100
                                ? 'bg-green-100 text-green-700'
                                : 'bg-yellow-100 text-yellow-700'
                            }`}
                          >
                            {session.compliance}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Progress Notes */}
            <div>
              <h3 className="text-slate-900 mb-4">Progress & Improvements</h3>
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-6 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <p className="text-slate-900 mb-1">Improved mobility in shoulder joints</p>
                    <p className="text-sm text-slate-600">Range of motion increased by approximately 15%</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <p className="text-slate-900 mb-1">Better balance and stability</p>
                    <p className="text-sm text-slate-600">Reduced reliance on chair support during exercises</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-white text-sm">✓</span>
                  </div>
                  <div>
                    <p className="text-slate-900 mb-1">Consistent exercise adherence</p>
                    <p className="text-sm text-slate-600">Meeting weekly goals with 95% compliance</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h3 className="text-slate-900 mb-4">AI Recommendations</h3>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 space-y-3">
                <p className="text-slate-800">
                  • Continue current exercise routine with gradual progression
                </p>
                <p className="text-slate-800">
                  • Consider adding light resistance exercises for strength building
                </p>
                <p className="text-slate-800">
                  • Maintain 3 sessions per week for optimal recovery
                </p>
                <p className="text-slate-800">
                  • Focus on maintaining proper form to prevent strain
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Info Note */}
        <div className="p-5 bg-slate-50 border-l-4 border-slate-400 rounded">
          <p className="text-slate-700">
            <span className="inline-block mr-2">ℹ️</span>
            Reports are automatically generated based on your exercise data and AI analysis. 
            Your healthcare provider will receive a secure, detailed version of this report.
          </p>
        </div>
      </div>
    </div>
  );
}
