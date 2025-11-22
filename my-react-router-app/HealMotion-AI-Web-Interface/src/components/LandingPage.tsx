import { Button } from './ui/button';
import { Check, Activity, FileText, Shield } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

type LandingPageProps = {
  onSignUp: () => void;
  onSignIn: () => void;
};

export function LandingPage({ onSignUp, onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-8 h-8 text-purple-600" />
            <span className="text-slate-900">HealMotion AI</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#home" className="text-slate-700 hover:text-purple-600 transition-colors">
              Home
            </a>
            <a href="#how-it-works" className="text-slate-700 hover:text-purple-600 transition-colors">
              How It Works
            </a>
            <a href="#providers" className="text-slate-700 hover:text-purple-600 transition-colors">
              Providers
            </a>
            <button onClick={onSignIn} className="text-slate-700 hover:text-purple-600 transition-colors">
              Sign In
            </button>
            <Button
              onClick={onSignUp}
              className="h-11 px-8 bg-purple-600 hover:bg-purple-700 text-white"
            >
              Sign Up
            </Button>
          </div>
          <div className="md:hidden">
            <Button
              onClick={onSignUp}
              className="h-11 px-6 bg-purple-600 hover:bg-purple-700 text-white"
            >
              Get Started
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section id="home" className="bg-purple-600">
        <div className="max-w-7xl mx-auto px-6 py-20 md:py-28">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <h1 className="mb-6 text-white">Personal AI Rehab Support — Right at Home.</h1>
              <p className="mb-8 text-purple-50 text-xl leading-relaxed">
                Personalized recovery exercises, real-time motion correction, and seamless health reporting.
              </p>
              <div className="flex flex-col sm:flex-row gap-4">
                <Button
                  onClick={onSignUp}
                  className="h-16 px-10 bg-white text-purple-600 hover:bg-purple-50"
                >
                  Sign Up
                </Button>
                <Button
                  variant="outline"
                  className="h-16 px-10 bg-transparent border-2 border-white text-white hover:bg-white/10"
                >
                  Learn More
                </Button>
              </div>
            </div>
            <div className="relative">
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1658314756052-30e8d440abf8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxlbGRlcmx5JTIwd29tYW4lMjBob21lJTIwZXhlcmNpc2UlMjBwaHlzaWNhbCUyMHRoZXJhcHl8ZW58MXx8fHwxNzYzNzk5ODE0fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Elderly woman doing physical therapy exercises at home"
                className="w-full h-auto rounded-lg"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-16">
            <h2 className="text-slate-900 mb-4">How HealMotion AI Supports Your Recovery</h2>
            <p className="text-slate-600 text-xl max-w-3xl mx-auto">
              Professional rehabilitation support designed for seniors recovering from surgery, injury, or chronic conditions.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 mx-auto mb-6 flex items-center justify-center rounded-full">
                <Activity className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-slate-900 mb-3">Personalized Exercise Plans</h3>
              <p className="text-slate-600 leading-relaxed">
                AI-generated exercises tailored to your specific health conditions, injuries, and recovery goals.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 mx-auto mb-6 flex items-center justify-center rounded-full">
                <Shield className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-slate-900 mb-3">Real-Time Motion Guidance</h3>
              <p className="text-slate-600 leading-relaxed">
                Live camera tracking with voice and visual feedback to ensure proper form and prevent injury.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 mx-auto mb-6 flex items-center justify-center rounded-full">
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-slate-900 mb-3">Automatic Health Reports</h3>
              <p className="text-slate-600 leading-relaxed">
                Share your progress directly with healthcare providers and pharmacies for better coordinated care.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="how-it-works" className="bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="grid md:grid-cols-2 gap-16 items-center">
            <div>
              <ImageWithFallback
                src="https://images.unsplash.com/photo-1657664057951-17679442315d?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzZW5pb3IlMjBtYW4lMjBwaHlzaW90aGVyYXB5JTIwcmVoYWJpbGl0YXRpb258ZW58MXx8fHwxNzYzNzk5ODE0fDA&ixlib=rb-4.1.0&q=80&w=1080"
                alt="Senior man doing physiotherapy exercises"
                className="w-full h-auto rounded-lg"
              />
            </div>
            <div>
              <h2 className="text-slate-900 mb-6">Designed for Your Safety and Progress</h2>
              <div className="space-y-5">
                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-900 mb-1">Safe, Low-Impact Exercises</p>
                    <p className="text-slate-600">
                      All exercises are designed specifically for seniors and those recovering from common conditions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-900 mb-1">Immediate Form Correction</p>
                    <p className="text-slate-600">
                      AI detects improper movements and provides instant guidance to prevent strain or injury.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-900 mb-1">Track Your Recovery Journey</p>
                    <p className="text-slate-600">
                      Monitor progress over time with detailed reports that can be shared with your care team.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="w-6 h-6 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Check className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-slate-900 mb-1">Accessible from Home</p>
                    <p className="text-slate-600">
                      No travel needed. Exercise safely in the comfort of your own home at your own pace.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Healthcare Partners */}
      <section id="providers" className="bg-slate-50 border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="text-center mb-12">
            <h2 className="text-slate-900 mb-4">Trusted by Healthcare Providers</h2>
            <p className="text-slate-600 text-xl">
              Working with leading healthcare organizations to deliver better patient outcomes
            </p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-20 bg-white border border-slate-200 rounded-lg flex items-center justify-center">
                <div className="text-slate-400">Partner Logo</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-purple-600 border-t border-purple-700">
        <div className="max-w-7xl mx-auto px-6 py-20 text-center">
          <h2 className="text-white mb-6">Start Your Recovery Journey Today</h2>
          <p className="text-purple-50 text-xl mb-10 max-w-2xl mx-auto">
            Join thousands of seniors who have improved their mobility, balance, and quality of life with HealMotion AI.
          </p>
          <Button
            onClick={onSignUp}
            className="h-16 px-12 bg-white text-purple-600 hover:bg-purple-50"
          >
            Get Started Now
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Activity className="w-6 h-6 text-purple-400" />
                <span className="text-white">HealMotion AI</span>
              </div>
              <p className="text-slate-400 text-sm">
                Professional AI-powered rehabilitation support for seniors.
              </p>
            </div>
            <div>
              <h4 className="text-white mb-4">Product</h4>
              <div className="space-y-2 text-sm">
                <p className="text-slate-400">Features</p>
                <p className="text-slate-400">How It Works</p>
                <p className="text-slate-400">Pricing</p>
              </div>
            </div>
            <div>
              <h4 className="text-white mb-4">Company</h4>
              <div className="space-y-2 text-sm">
                <p className="text-slate-400">About Us</p>
                <p className="text-slate-400">Providers</p>
                <p className="text-slate-400">Contact</p>
              </div>
            </div>
            <div>
              <h4 className="text-white mb-4">Legal</h4>
              <div className="space-y-2 text-sm">
                <p className="text-slate-400">Privacy Policy</p>
                <p className="text-slate-400">Terms of Service</p>
                <p className="text-slate-400">HIPAA Compliance</p>
              </div>
            </div>
          </div>
          <div className="pt-8 border-t border-slate-800 text-center text-slate-400 text-sm">
            <p>© 2025 HealMotion AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
