import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RotateCcw, AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  private handleReload = () => {
    window.location.hash = '';
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-black-rich text-white flex flex-col items-center justify-center p-6 text-center select-none">
          <div className="w-16 h-16 rounded-full bg-gold/10 border border-gold/30 flex items-center justify-center text-gold mb-4 shadow-[0_0_30px_rgba(212,175,55,0.3)]">
            <AlertTriangle size={32} />
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl text-white font-bold mb-2">
            Natal Interior Design
          </h1>
          <p className="text-gray-300 text-xs sm:text-sm max-w-md mb-6 leading-relaxed">
            The page encountered a temporary display issue. Click below to refresh and restore the atelier interface.
          </p>
          <button
            onClick={this.handleReload}
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-gold hover:bg-gold-light active:bg-gold-dark text-black-pure font-bold text-xs uppercase tracking-wider rounded-sm transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)] cursor-pointer"
          >
            <RotateCcw size={15} />
            <span>Reload Atelier</span>
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
