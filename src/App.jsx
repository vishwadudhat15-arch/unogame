import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import HomePage from './components/HomePage';
import UnoFlip from './components/UnoCard';

const App = () => {
  const [gameState, setGameState] = useState('menu'); // menu, playing
  const [gameMode, setGameMode] = useState(null);
  const [gameConfig, setGameConfig] = useState(null);

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

  return (
    <div style={{ minHeight: '100vh', background: 'var(--base-100)', color: 'white', position: 'relative', overflow: 'hidden' }}>
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
    </div>
  );
};

export default App;

