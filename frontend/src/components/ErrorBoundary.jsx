import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0f1115] text-slate-100 flex items-center justify-center p-6 font-sans relative">
          {/* Glassmorphic Background Card */}
          <div 
            className="absolute inset-0 bg-cover bg-center z-0"
            style={{ backgroundImage: "url('/assets/bg-hotel.png')" }}
          >
            <div className="absolute inset-0 bg-[#0f1115]/90 backdrop-blur-2xl"></div>
          </div>

          <div className="relative z-10 max-w-3xl w-full bg-black/40 backdrop-blur-md border border-red-500/20 rounded-2xl p-8 shadow-2xl space-y-6">
            <div className="flex items-center gap-4 text-red-500">
              <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center border border-red-500/20 font-bold text-2xl">⚠️</div>
              <div>
                <h1 className="text-2xl font-black tracking-tight text-white uppercase">Application Interface Error</h1>
                <p className="text-slate-400 text-sm">A runtime crash was intercepted in the component tree.</p>
              </div>
            </div>
            
            <div className="bg-black/50 rounded-xl p-5 border border-white/5 font-mono text-xs overflow-x-auto space-y-2 text-rose-300 shadow-inner max-h-80 overflow-y-auto custom-scrollbar">
              <p className="font-bold text-red-400 text-sm">{this.state.error?.toString()}</p>
              <pre className="text-slate-400 text-[10px] leading-relaxed whitespace-pre-wrap">
                {this.state.errorInfo?.componentStack || this.state.error?.stack}
              </pre>
            </div>

            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => window.location.reload()} 
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-xs rounded-xl uppercase tracking-wider transition-all shadow-lg shadow-blue-500/20 active:scale-95 cursor-pointer border border-blue-500/30"
              >
                Reload Application
              </button>
              <button 
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }} 
                className="px-6 py-3 bg-white/5 hover:bg-white/10 text-slate-300 font-extrabold text-xs rounded-xl border border-white/10 uppercase tracking-wider transition-all active:scale-95 cursor-pointer"
              >
                Clear Cache & Reset
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
