import { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { CleanGridBackground } from './components/CleanGridBackground';
import { Home } from './pages/Home';
import { Privacy } from './pages/Privacy';
import { Terms } from './pages/Terms';
import { Pricing } from './pages/Pricing';
import { Auth } from './pages/Auth';

export function App() {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (path: string) => {
    window.history.pushState({}, '', path);
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const renderContent = () => {
    switch (currentPath) {
      case '/auth':
      case '/login':
      case '/signup':
        return <Auth navigate={navigate} />;
      case '/privacy':
        return <Privacy />;
      case '/terms':
        return <Terms />;
      case '/pricing':
        return <Pricing />;
      case '/':
        return <Home navigate={navigate} />;
      default:
        return <NotFound navigate={navigate} />;
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative overflow-x-hidden">
      {/* Clean, Minimalist Linear/Vercel-style Blueprint Grid Background */}
      <CleanGridBackground />

      <a href="#main" className="skip-link">
        Skip to content
      </a>

      {/* Floating pill navigation */}
      <Navbar currentPath={currentPath} navigate={navigate} />

      <div id="main" className="flex-grow relative z-10">
        {renderContent()}
      </div>

      <Footer navigate={navigate} />

      {/* Subtle organic film grain */}
      <div className="noise-overlay" aria-hidden="true" />
    </div>
  );
}

const NotFound: React.FC<{ navigate: (path: string) => void }> = ({ navigate }) => (
  <main className="container-site py-32 text-center relative z-10">
    <div className="font-mono text-xs text-accent uppercase tracking-[0.2em]">404</div>
    <h1 className="mt-4 font-display text-4xl font-bold tracking-tight">
      This tab has been judged.
    </h1>
    <p className="mt-4 text-paper-muted max-w-sm mx-auto leading-relaxed">
      It leads nowhere productive. Even the gremlin won’t follow you here.
    </p>
    <button onClick={() => navigate('/')} className="btn-primary mt-8">
      Back to safety
    </button>
  </main>
);

export default App;
