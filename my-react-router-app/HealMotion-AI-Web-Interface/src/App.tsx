import { useState } from 'react';
import { LandingPage } from './components/LandingPage';
import { PublicOnboarding } from './components/PublicOnboarding';
import { Dashboard } from './components/Dashboard';
import { ExercisePlan } from './components/ExercisePlan';
import { LiveSession } from './components/LiveSession';
import { Reports } from './components/Reports';
import { Settings } from './components/Settings';
import { Navigation } from './components/Navigation';

export type UserProfile = {
  age: number;
  gender: string;
  height: number;
  weight: number;
  conditions: string[];
  injuries: string[];
  goals: string[];
};

export type PageType = 'landing' | 'signup' | 'dashboard' | 'plan' | 'live' | 'reports' | 'settings';

function App() {
  const [currentPage, setCurrentPage] = useState<PageType>('landing');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  const handleProfileComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setCurrentPage('dashboard');
  };

  const handleSignUp = () => {
    setCurrentPage('signup');
  };

  const handleSignIn = () => {
    // For demo purposes, just go to signup
    setCurrentPage('signup');
  };

  const handleBackToLanding = () => {
    setCurrentPage('landing');
  };

  const renderPage = () => {
    if (currentPage === 'landing') {
      return <LandingPage onSignUp={handleSignUp} onSignIn={handleSignIn} />;
    }

    if (currentPage === 'signup') {
      return <PublicOnboarding onComplete={handleProfileComplete} onBack={handleBackToLanding} />;
    }

    if (!userProfile) {
      return <LandingPage onSignUp={handleSignUp} onSignIn={handleSignIn} />;
    }

    switch (currentPage) {
      case 'dashboard':
        return <Dashboard onNavigate={setCurrentPage} userProfile={userProfile} />;
      case 'plan':
        return <ExercisePlan onNavigate={setCurrentPage} userProfile={userProfile} />;
      case 'live':
        return <LiveSession onNavigate={setCurrentPage} />;
      case 'reports':
        return <Reports onNavigate={setCurrentPage} />;
      case 'settings':
        return <Settings userProfile={userProfile} onUpdate={setUserProfile} onNavigate={setCurrentPage} />;
      default:
        return <Dashboard onNavigate={setCurrentPage} userProfile={userProfile} />;
    }
  };

  const showNavigation = userProfile && currentPage !== 'landing' && currentPage !== 'signup';

  return (
    <div className="min-h-screen bg-white">
      {renderPage()}
      {showNavigation && <Navigation currentPage={currentPage} onNavigate={setCurrentPage} />}
    </div>
  );
}

export default App;
