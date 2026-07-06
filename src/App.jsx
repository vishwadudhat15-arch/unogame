import React, { useState, useEffect } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Volume2, VolumeX } from 'lucide-react';
import HomePage from './components/HomePage';
import UnoFlip from './components/UnoCard';
import bgImage from './components/bg1.png';
import AdOverlay from './components/AdOverlay';
import { logAnalyticsEvent } from './data/adEventManager';
import { isMuted, toggleMute } from './data/soundManager';

if (typeof window !== 'undefined') {
  window.logAnalyticsEvent = logAnalyticsEvent;
}

const useWindowSize = () => {
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  useEffect(() => {
    const handleResize = () => {
      // Small timeout to allow mobile browsers to finish adjusting viewport sizes
      setTimeout(() => {
        setSize({ w: window.innerWidth, h: window.innerHeight });
      }, 100);
    };
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
    };
  }, []);
  return size;
};

const App = () => {
  const [gameState, setGameState] = useState('menu'); // menu, playing
  const [gameMode, setGameMode] = useState(null);
  const [gameConfig, setGameConfig] = useState(null);
  const [muted, setMutedState] = useState(isMuted());

  const { w: vw, h: vh } = useWindowSize();
  const isMobileDevice = /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isLandscapeMobile = vw > vh && isMobileDevice;

  const startNewGame = (mode, config) => {
    setGameMode(mode);
    setGameConfig(config);
    setGameState('playing');
  };

  const quitGame = () => {
    setGameState('menu');
    setGameMode(null);
    setGameConfig(null);
  };

  const handleToggleMute = () => {
    const nowMuted = toggleMute();
    setMutedState(nowMuted);
  };

  if (isLandscapeMobile) {
    return (
      <div style={{
        height: "100dvh", width: "100vw", position: "relative", overflow: "hidden",
        backgroundColor: "#1a0a2e",
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 20,
      }}>
        <div style={{ position: "absolute", inset: "-20px", backgroundImage: `url(${bgImage})`, backgroundSize: "cover", backgroundPosition: "center", filter: "blur(10px)", zIndex: 0, opacity: 0.4 }} />
        <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1 }} />
        <div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, padding: "20px 30px", background: "rgba(20,10,40,0.9)", borderRadius: 20, border: "2px solid rgba(243,156,18,0.6)", boxShadow: "0 0 40px rgba(243,156,18,0.2)", maxWidth: "80vw", textAlign: "center" }}>
          <div style={{ fontSize: 56, animation: "rotatePhone 1.5s ease-in-out infinite" }}>📱</div>
          <div style={{ color: "#f39c12", fontSize: 20, fontWeight: 900, letterSpacing: 2, textTransform: "uppercase" }}>Rotate Your Device</div>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 14, lineHeight: 1.6, fontWeight: 500 }}>
            This game is best played in <strong style={{ color: "#fff" }}>portrait mode</strong>.<br />
            Please rotate your phone to continue.
          </div>
        </div>
        <style>{`
          @keyframes rotatePhone {
            0%, 100% { transform: rotate(0deg); }
            30% { transform: rotate(-90deg); }
            60% { transform: rotate(-90deg); }
            80% { transform: rotate(0deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base-100)', color: 'white', position: 'relative', overflow: 'hidden' }}>
      
      {/* Sound Mute/Unmute Overlay Button */}
      <div style={{ position: 'absolute', top: '1rem', right: '1rem', zIndex: 100 }}>
        <button
          onClick={handleToggleMute}
          className="btn btn-outline"
          style={{ 
            padding: '0.5rem', 
            borderRadius: '50%', 
            background: 'rgba(0,0,0,0.5)', 
            width: '40px', 
            height: '40px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            color: '#fff', 
            border: '1px solid rgba(255,255,255,0.2)',
            cursor: 'pointer'
          }}
          title={muted ? "Unmute" : "Mute"}
        >
          {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {gameState === 'menu' ? (
          <motion.div
            key="menu"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <HomePage onStartGame={startNewGame} />
          </motion.div>
        ) : (
          <motion.div
            key="playing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}
          >
            <div style={{ position: 'absolute', top: '1rem', left: '1rem', zIndex: 100 }}>
              <button
                onClick={quitGame}
                className="btn btn-outline"
                style={{ padding: '0.5rem', borderRadius: '50%', background: 'rgba(0,0,0,0.5)' }}
              >
                <ArrowLeft size={20} />
              </button>
            </div>

            {/* Render the actual UNO game */}
            <div style={{ flex: 1, overflow: 'auto' }}>
              <UnoFlip config={gameConfig} mode={gameMode} onHome={quitGame} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AdOverlay />
    </div>
  );
};

export default App;

