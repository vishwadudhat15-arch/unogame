import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Cpu, Users, Zap, Shield, Trophy, Globe, Sparkles, Star, ArrowLeft, BookOpen, Sun, Moon, Target, Layout, Flame, Award } from 'lucide-react';
import bgImage from './bg1.png';

const DiamondOption = ({ selected, color = '#f39c12', onClick, children, label }) => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', position: 'relative' }}>
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      style={{
        width: 'clamp(2.2rem, 6vw, 3rem)',
        height: 'clamp(2.2rem, 6vw, 3rem)',
        background: selected ? `linear-gradient(135deg, ${color}, #d35400)` : 'rgba(20, 10, 30, 0.5)',
        border: `2px solid ${selected ? '#fff' : 'rgba(255,255,255,0.2)'}`,
        transform: 'rotate(45deg)',
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        boxShadow: selected ? `0 0 20px ${color}80, inset 0 0 10px rgba(255,255,255,0.5)` : 'inset 0 0 10px rgba(0,0,0,0.5)',
        transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
        borderRadius: '8px',
        flexShrink: 0,
      }}
    >
      <div style={{
        transform: 'rotate(-45deg)',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        color: selected ? '#fff' : 'rgba(255,255,255,0.5)',
        transition: 'all 0.3s ease',
      }}>
        {children}
      </div>
    </motion.div>
    {label && (
      <span style={{
        fontSize: 'clamp(0.55rem, 1.5vw, 0.75rem)',
        fontWeight: 900,
        color: selected ? '#fff' : 'rgba(255,255,255,0.5)',
        letterSpacing: '0.05em',
        transition: 'color 0.3s ease',
        whiteSpace: 'nowrap',
      }}>{label}</span>
    )}
  </div>
);

const RuleSection = ({ title, icon: Icon, children, color = "#d35400" }) => (
  <div style={{ marginBottom: '1.2rem' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.6rem' }}>
      <div style={{ padding: '7px', borderRadius: '10px', background: `${color}1A`, color: color, flexShrink: 0 }}>
        <Icon size={18} />
      </div>
      <h3 style={{ fontSize: 'clamp(0.8rem, 2.5vw, 1rem)', margin: 0, color: color, fontWeight: 900, textTransform: 'uppercase' }}>{title}</h3>
    </div>
    <div style={{ paddingLeft: '2.5rem', color: '#5d4037', fontSize: 'clamp(0.75rem, 2vw, 0.88rem)', lineHeight: 1.6, fontWeight: 500 }}>
      {children}
    </div>
  </div>
);

const HomePage = ({ onStartGame }) => {
  const [view, setView] = useState('main');
  const [players, setPlayers] = useState(2);
  const [difficulty, setDifficulty] = useState('medium');

  const [vpSize, setVpSize] = React.useState({ w: window.innerWidth, h: window.innerHeight });
  React.useEffect(() => {
    const fn = () => setVpSize({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, []);
  const isMobile = vpSize.w <= 480;
  const isTablet = vpSize.w <= 768;

  const renderMain = () => (
    <motion.div
      key="main"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      style={{
        position: 'relative', width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        zIndex: 10,
        padding: isMobile ? '1rem 0.75rem' : '1.5rem',
        overflowY: 'auto',
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        display: 'flex', flexDirection: 'column',
        alignItems: 'center',
        gap: isMobile ? '12px' : '16px',
        width: '100%',
        maxWidth: isMobile ? '100%' : '420px',
      }}>
        {/* Logo + Title */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
        >
          <img
            src="https://upload.wikimedia.org/wikipedia/commons/f/f9/UNO_Logo.svg"
            alt="UNO Logo"
            className="animate-float"
            style={{
              width: isMobile ? '80px' : 'clamp(80px, 12vw, 110px)',
              height: 'auto',
              filter: 'drop-shadow(0 0 16px rgba(255,62,62,0.4))',
            }}
          />
          <div style={{ textAlign: 'center' }}>
            <h1 style={{
              fontSize: isMobile ? '1.4rem' : 'clamp(1.4rem, 4vw, 1.8rem)',
              fontWeight: 900, margin: 0,
              textTransform: 'uppercase', letterSpacing: '0.1em',
              color: '#fff', textShadow: '2px 2px 0px #d35400',
              lineHeight: 1.1,
            }}>DESERT SERIES</h1>
            <span style={{
              color: '#fff', background: '#d35400',
              padding: '2px 10px',
              borderRadius: '10px', fontWeight: 700, letterSpacing: '0.2em',
              textTransform: 'uppercase',
              fontSize: isMobile ? '0.6rem' : 'clamp(0.6rem, 1.5vw, 0.75rem)',
              display: 'inline-block', marginTop: '4px',
            }}>Arcade Edition</span>
          </div>
        </motion.div>

        {/* Cards wrapper */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: isMobile ? '10px' : '14px' }}>
          {/* VS COMPUTER Card */}
          <motion.div
            whileHover={{ y: -4, scale: 1.01, boxShadow: "0 20px 40px rgba(0,0,0,0.5), inset 0 0 0 2px #f39c12" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setView('ai_config')}
            style={{
              position: 'relative', overflow: 'hidden',
              padding: isMobile ? '1rem' : '1.2rem 1.5rem',
              background: 'rgba(20, 10, 30, 0.82)', backdropFilter: 'blur(20px)',
              borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column',
              transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(243,156,18,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.5rem', zIndex: 1 }}>
              <div style={{ padding: '8px', borderRadius: '14px', background: 'linear-gradient(135deg, #f39c12, #d35400)', color: '#fff', boxShadow: '0 6px 16px rgba(211,84,0,0.4)', flexShrink: 0 }}>
                <Cpu size={isMobile ? 20 : 24} />
              </div>
              <h2 style={{ fontSize: isMobile ? '1rem' : 'clamp(1rem, 3vw, 1.25rem)', margin: 0, color: '#fff', fontWeight: 900, letterSpacing: '1px', textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>VS COMPUTER</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.78rem' : 'clamp(0.78rem, 2vw, 0.88rem)', marginBottom: '0.8rem', lineHeight: 1.4, fontWeight: 500, zIndex: 1 }}>
              Test your skills against the Pharaoh's AI. Prove your mastery of the Flip!
            </p>
            <button
              style={{
                width: '100%', padding: isMobile ? '0.6rem' : '0.7rem',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                background: 'linear-gradient(to right, #f39c12, #d35400)',
                color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 900,
                cursor: 'pointer', boxShadow: '0 6px 16px rgba(211,84,0,0.4)',
                textTransform: 'uppercase', letterSpacing: '2px',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              MATCH SETUP
            </button>
          </motion.div>

          {/* HOW TO PLAY Card */}
          <motion.div
            whileHover={{ y: -4, scale: 1.01, boxShadow: "0 20px 40px rgba(0,0,0,0.5), inset 0 0 0 2px #e74c3c" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setView('rules')}
            style={{
              position: 'relative', overflow: 'hidden',
              padding: isMobile ? '1rem' : '1.2rem 1.5rem',
              background: 'rgba(20, 10, 30, 0.82)', backdropFilter: 'blur(20px)',
              borderRadius: '20px', border: '1px solid rgba(255,255,255,0.12)',
              boxShadow: '0 12px 30px rgba(0,0,0,0.4)',
              display: 'flex', flexDirection: 'column',
              transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
              cursor: 'pointer',
            }}
          >
            <div style={{ position: 'absolute', top: '-50%', left: '-50%', width: '200%', height: '200%', background: 'radial-gradient(circle, rgba(231,76,60,0.15) 0%, transparent 70%)', pointerEvents: 'none' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.7rem', marginBottom: '0.5rem', zIndex: 1 }}>
              <div style={{ padding: '8px', borderRadius: '14px', background: 'linear-gradient(135deg, #e74c3c, #c0392b)', color: '#fff', boxShadow: '0 6px 16px rgba(192,57,43,0.4)', flexShrink: 0 }}>
                <BookOpen size={isMobile ? 20 : 24} />
              </div>
              <h2 style={{ fontSize: isMobile ? '1rem' : 'clamp(1rem, 3vw, 1.25rem)', margin: 0, color: '#fff', fontWeight: 900, letterSpacing: '1px', textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>HOW TO PLAY</h2>
            </div>
            <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: isMobile ? '0.78rem' : 'clamp(0.78rem, 2vw, 0.88rem)', marginBottom: '0.8rem', lineHeight: 1.4, fontWeight: 500, zIndex: 1 }}>
              Learn the secrets of the Sun and Moon cards. Master the dual deck system!
            </p>
            <button
              style={{
                width: '100%', padding: isMobile ? '0.6rem' : '0.7rem',
                fontSize: isMobile ? '0.8rem' : '0.9rem',
                background: 'linear-gradient(to right, #e74c3c, #c0392b)',
                color: '#fff', border: 'none', borderRadius: '14px', fontWeight: 900,
                cursor: 'pointer', boxShadow: '0 6px 16px rgba(192,57,43,0.4)',
                textTransform: 'uppercase', letterSpacing: '2px',
                transition: 'transform 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              READ RULES
            </button>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );

  const renderRules = () => (
    <motion.div
      key="rules"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '0.75rem' : '1.5rem',
        position: 'relative', zIndex: 10,
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        background: 'rgba(255,255,255,0.98)',
        border: `${isMobile ? '3px' : '4px'} solid #d35400`,
        borderRadius: isMobile ? '20px' : '28px',
        padding: isMobile ? '1rem' : '1.5rem 2rem',
        width: '100%',
        maxWidth: '700px',
        height: isMobile ? '90vh' : '82vh',
        maxHeight: '92vh',
        display: 'flex',
        flexDirection: 'column',
        gap: isMobile ? '0.75rem' : '1.2rem',
        boxShadow: '0 20px 40px rgba(0,0,0,0.2)',
        overflow: 'hidden',
        boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: isMobile ? '0.6rem' : '0.8rem', borderBottom: '2px solid rgba(211, 84, 0, 0.15)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '0.5rem' : '0.8rem' }}>
            <div style={{ padding: isMobile ? '7px' : '10px', borderRadius: '12px', background: '#d35400', color: '#fff', flexShrink: 0 }}>
              <BookOpen size={isMobile ? 18 : 22} />
            </div>
            <h2 style={{ fontSize: isMobile ? '1.1rem' : '1.5rem', fontWeight: 900, color: '#d35400', margin: 0 }}>UNO FLIP RULES</h2>
          </div>
          <button
            onClick={() => setView('main')}
            style={{ background: 'rgba(211, 84, 0, 0.1)', border: 'none', color: '#d35400', padding: isMobile ? '6px 12px' : '8px 16px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: isMobile ? '0.75rem' : '0.9rem', fontWeight: 800, flexShrink: 0 }}
          >
            <ArrowLeft size={isMobile ? 14 : 16} /> BACK
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="rules-scroll" style={{ overflowY: 'auto', paddingRight: isMobile ? '0.3rem' : '0.8rem', flex: 1 }}>
          <RuleSection title="THE OBJECTIVE" icon={Target}>
            Be the first player to finish all your cards. UNO Flip has two sides:
            <div style={{ marginTop: '0.4rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#E53935' }}><Sun size={14} /> Light Side (Normal)</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#4a004e' }}><Moon size={14} /> Dark Side (Intense)</span>
            </div>
          </RuleSection>

          <RuleSection title="SETUP" icon={Layout}>
            • Each player gets 7 cards.<br />
            • Keep cards with the <b>Light Side</b> facing you.<br />
            • Put remaining cards as the draw pile.<br />
            • Flip the top card to start the discard pile.
          </RuleSection>

          <RuleSection title="GAMEPLAY BASICS" icon={Zap}>
            On your turn, match the top card by color, number, or symbol. If you can't play, you must draw 1 card.
          </RuleSection>

          <RuleSection title="THE FLIP RULE" icon={Flame} color="#e74c3c">
            When someone plays a <b>FLIP card</b>, the entire game changes!
            <br /><br />
            <b>All players must flip their cards</b> to the other side. You also flip the draw pile and discard pile.
          </RuleSection>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: isMobile ? '0.8rem' : '1.2rem', marginBottom: '1.2rem' }}>
            <div style={{ background: 'rgba(229, 57, 53, 0.05)', padding: isMobile ? '0.8rem' : '1.2rem', borderRadius: '16px', border: '1px solid #E53935' }}>
              <h4 style={{ color: '#E53935', margin: '0 0 0.6rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: isMobile ? '0.85rem' : '1rem' }}><Sun size={14} /> LIGHT SIDE</h4>
              <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#5d4037' }}>
                <li><b>Draw One:</b> Next player draws 1</li>
                <li><b>Skip:</b> Next player loses turn</li>
                <li><b>Reverse:</b> Direction changes</li>
                <li><b>Wild:</b> Choose color</li>
                <li><b>Flip:</b> Switch to Dark side</li>
              </ul>
            </div>
            <div style={{ background: 'rgba(74, 0, 78, 0.05)', padding: isMobile ? '0.8rem' : '1.2rem', borderRadius: '16px', border: '1px solid #4a004e' }}>
              <h4 style={{ color: '#4a004e', margin: '0 0 0.6rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: isMobile ? '0.85rem' : '1rem' }}><Moon size={14} /> DARK SIDE</h4>
              <ul style={{ margin: 0, paddingLeft: '1rem', fontSize: isMobile ? '0.75rem' : '0.85rem', color: '#5d4037' }}>
                <li><b>Draw Five:</b> Next player draws 5!</li>
                <li><b>Skip Everyone:</b> You play again!</li>
                <li><b>Wild Draw Color:</b> Draw until match</li>
                <li><b>Flip:</b> Switch back to Light</li>
              </ul>
            </div>
          </div>

          <RuleSection title="UNO RULE" icon={Award}>
            When you have <b>1 card left</b>, you must say UNO! If you forget and someone catches you, draw penalty cards.
          </RuleSection>

          <div style={{ background: '#d35400', padding: isMobile ? '0.8rem' : '1.2rem', borderRadius: '16px', color: '#fff' }}>
            <h4 style={{ margin: '0 0 0.4rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: isMobile ? '0.85rem' : '1rem' }}><Sparkles size={14} /> PRO TIPS</h4>
            <p style={{ margin: 0, fontSize: isMobile ? '0.75rem' : '0.85rem', opacity: 0.9 }}>
              The Dark Side is dangerous—try to flip back quickly if you're in trouble! Save your Flip cards for the perfect moment.
            </p>
          </div>
        </div>
      </div>

      <style>{`
        .rules-scroll::-webkit-scrollbar { width: 6px; }
        .rules-scroll::-webkit-scrollbar-track { background: rgba(211, 84, 0, 0.05); border-radius: 10px; }
        .rules-scroll::-webkit-scrollbar-thumb { background: rgba(211, 84, 0, 0.2); border-radius: 10px; }
        .rules-scroll::-webkit-scrollbar-thumb:hover { background: rgba(211, 84, 0, 0.3); }
      `}</style>
    </motion.div>
  );

  const renderConfig = () => (
    <motion.div
      key="config"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      style={{
        width: '100%', height: '100%',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: isMobile ? '0.75rem' : '1.5rem',
        position: 'relative', zIndex: 10,
        boxSizing: 'border-box',
      }}
    >
      <div style={{
        background: 'rgba(20, 10, 30, 0.7)', backdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: isMobile ? '24px' : '32px',
        padding: isMobile ? '1.2rem 1rem' : '2rem 2.5rem',
        width: '100%', maxWidth: '560px',
        display: 'flex', flexDirection: 'column',
        gap: isMobile ? '1.2rem' : '1.8rem',
        boxShadow: '0 25px 50px rgba(0,0,0,0.5), inset 0 0 0 2px #f39c12',
        maxHeight: '92vh', overflowY: 'auto',
        boxSizing: 'border-box',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: isMobile ? '1.2rem' : '1.5rem', fontWeight: 900, color: '#fff', margin: 0, textShadow: '0 2px 5px rgba(0,0,0,0.5)' }}>MATCH SETUP</h2>
          <button
            onClick={() => setView('main')}
            style={{ background: 'rgba(255, 255, 255, 0.1)', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', padding: '6px 14px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: isMobile ? '0.72rem' : '0.8rem', fontWeight: 800, transition: 'all 0.2s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.2)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; }}
          >
            <ArrowLeft size={13} /> BACK
          </button>
        </div>

        {/* Options Row */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-around',
          gap: isMobile ? '0.8rem' : '1.5rem',
          flexWrap: isMobile ? 'wrap' : 'nowrap',
        }}>
          {/* Opponents */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '0.8rem' : '1.2rem', flex: 1 }}>
            <span style={{ fontSize: isMobile ? '0.72rem' : '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 900, letterSpacing: '0.1em' }}>OPPONENTS</span>
            <div style={{ display: 'flex', gap: isMobile ? '0.8rem' : '1.2rem' }}>
              <DiamondOption selected={players === 2} label="2P" color="#f39c12" onClick={() => setPlayers(2)}>
                <User size={isMobile ? 14 : 18} fill={players === 2 ? '#fff' : 'none'} />
              </DiamondOption>
              <DiamondOption selected={players === 3} label="3P" color="#f39c12" onClick={() => setPlayers(3)}>
                <Users size={isMobile ? 14 : 18} fill={players === 3 ? '#fff' : 'none'} />
              </DiamondOption>
              <DiamondOption selected={players === 4} label="4P" color="#f39c12" onClick={() => setPlayers(4)}>
                <Zap size={isMobile ? 14 : 18} fill={players === 4 ? '#fff' : 'none'} />
              </DiamondOption>
            </div>
            <div style={{ fontSize: isMobile ? '0.7rem' : '0.82rem', color: '#f39c12', fontWeight: 800, letterSpacing: '0.05em', background: 'rgba(243, 156, 18, 0.1)', padding: '3px 10px', borderRadius: '10px', border: '1px solid rgba(243, 156, 18, 0.3)', textAlign: 'center' }}>
              {players === 2 ? "1 AI + YOU" : players === 3 ? "2 AI + YOU" : "3 AI + YOU"}
            </div>
          </div>

          {/* Divider for non-mobile */}
          {!isMobile && <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)', alignSelf: 'stretch', margin: '0.5rem 0' }} />}

          {/* Difficulty */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: isMobile ? '0.8rem' : '1.2rem', flex: 1 }}>
            <span style={{ fontSize: isMobile ? '0.72rem' : '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 900, letterSpacing: '0.1em' }}>DIFFICULTY</span>
            <div style={{ display: 'flex', gap: isMobile ? '0.8rem' : '1.2rem' }}>
              <DiamondOption selected={difficulty === 'easy'} label="EASY" color="#27ae60" onClick={() => setDifficulty('easy')}>
                <Star size={isMobile ? 13 : 16} fill={difficulty === 'easy' ? '#fff' : 'none'} />
              </DiamondOption>
              <DiamondOption selected={difficulty === 'medium'} label="MED" color="#f39c12" onClick={() => setDifficulty('medium')}>
                <Star size={isMobile ? 13 : 16} fill={difficulty === 'medium' ? '#fff' : 'none'} />
              </DiamondOption>
              <DiamondOption selected={difficulty === 'hard'} label="HARD" color="#c0392b" onClick={() => setDifficulty('hard')}>
                <Star size={isMobile ? 13 : 16} fill={difficulty === 'hard' ? '#fff' : 'none'} />
              </DiamondOption>
            </div>
            <div style={{ fontSize: isMobile ? '0.7rem' : '0.82rem', color: difficulty === 'easy' ? '#27ae60' : difficulty === 'hard' ? '#c0392b' : '#f39c12', fontWeight: 800, background: 'rgba(255,255,255,0.05)', padding: '3px 10px', borderRadius: '10px', border: `1px solid rgba(255,255,255,0.1)`, textAlign: 'center' }}>
              {difficulty === 'easy' ? 'CASUAL' : difficulty === 'hard' ? 'PHARAOH' : 'BALANCED'}
            </div>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={() => onStartGame('ai', { players, difficulty })}
          style={{
            width: '100%',
            padding: isMobile ? '0.85rem' : '1.1rem',
            fontSize: isMobile ? '1rem' : '1.15rem',
            fontWeight: 900,
            background: 'linear-gradient(to right, #f39c12, #d35400)',
            color: '#fff', border: 'none', borderRadius: '18px', cursor: 'pointer',
            boxShadow: '0 8px 20px rgba(211, 84, 0, 0.4)',
            textTransform: 'uppercase', letterSpacing: '2px',
            transition: 'transform 0.2s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.03)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          START GAME ▶
        </button>
      </div>
    </motion.div>
  );

  return (
    <div
      style={{
        height: '100dvh',
        width: '100vw',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Blurred Background */}
      <div style={{
        position: 'absolute', inset: 0,
        backgroundImage: `url(${bgImage})`,
        backgroundSize: 'cover', backgroundPosition: 'center',
        filter: 'blur(4px)',
        transform: 'scale(1.08)',
        zIndex: 0,
      }} />

      {/* Overlay */}
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.52)', zIndex: 1 }} />

      {/* Content */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 2, overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          {view === 'main' ? renderMain() : view === 'ai_config' ? renderConfig() : renderRules()}
        </AnimatePresence>
      </div>

      <style>{`
        * { box-sizing: border-box; }
        body { margin: 0; padding: 0; }
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-8px); }
        }
        .animate-float { animation: float 3s ease-in-out infinite; }
      `}</style>
    </div>
  );
};

export default HomePage;