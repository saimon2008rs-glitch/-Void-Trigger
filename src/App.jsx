import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Timer, 
  RotateCcw, 
  Zap, 
  Clock, 
  X,
  Shield,
  Maximize,
  Bot,
  Star,
  ChevronUp,
  Lock,
  Unlock,
  Heart
} from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import { GAME_DURATION, COLORS } from './constants';

export default function App() {
  const [state, setState] = useState({
    score: 0,
    coins: parseInt(localStorage.getItem('coins') || '0'),
    timeLeft: GAME_DURATION,
    isActive: false,
    isGameOver: false,
    isMenuOpen: true,
    currentPhase: 1,
    unlockedPhases: parseInt(localStorage.getItem('unlockedPhases') || '1'),
    level: 1,
    highScore: parseInt(localStorage.getItem('highScore') || '0'),
    lives: 3,
    activePowerUps: {
      slowmo: 0,
      double: 0,
      shield: 0,
      mega: 0,
      bot: 0,
    },
  });

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [controls, setControls] = useState({ left: false, right: false, fire: false });
  const levelUpTimeoutRef = useRef(null);
  const previousLevelRef = useRef(1);

  const POWERUP_COSTS = { slowmo: 10, double: 15, shield: 20, mega: 25, bot: 30 };
  const POWERUP_LABELS = { slowmo: 'Slow-Mo', double: '2X XP', shield: 'Shield', mega: 'Mega', bot: 'Bot' };
  const POWERUP_DURATION = 15000;
  
  const startGame = (phaseNum) => {
    setState(prev => ({
      ...prev,
      score: 0,
      lives: 3,
      timeLeft: GAME_DURATION, // Todas as fases têm a mesma duração definida em constants.js
      isActive: true,
      isGameOver: false,
      isMenuOpen: false,
      currentPhase: phaseNum,
      level: 1
    }));
  };

  const buyPowerUp = (powerUp) => {
    const cost = POWERUP_COSTS[powerUp];
    if (state.coins < cost) return;
    const expiresAt = Date.now() + POWERUP_DURATION;
    setState(prev => ({
      ...prev,
      coins: prev.coins - cost,
      activePowerUps: { ...prev.activePowerUps, [powerUp]: expiresAt }
    }));
    localStorage.setItem('coins', String(state.coins - cost));
  };

  const handleScoreUpdate = useCallback((points) => {
    setState(prev => {
      const newScore = Math.max(0, prev.score + points);
      // Níveis agora escalam: Nível 1 (0-500), Nível 2 (500-1200), Nível 3 (1200-2100)...
      // Fórmula: XP necessário = Nível * 500 + (Nível-1) * 200
      const calculateLevel = (score) => {
        let lvl = 1;
        let threshold = 500;
        while (score >= threshold) {
          lvl++;
          threshold += 500 + (lvl - 1) * 250;
        }
        return lvl;
      };

      const newLevel = calculateLevel(newScore);
      
      const earnedCoins = points > 0 ? Math.max(1, Math.floor(points / 10)) : 0;
      const totalCoins = prev.coins + earnedCoins;
      localStorage.setItem('coins', totalCoins.toString());
      
      return {
        ...prev,
        score: newScore,
        level: newLevel,
        coins: totalCoins,
      };
    });
  }, []);

  const handleDamage = useCallback(() => {
    setState(prev => ({ ...prev, lives: Math.max(0, prev.lives - 1) }));
  }, []);

  const handleGameOver = useCallback(() => {
    setState(prev => {
      const isNewHighScore = prev.score > prev.highScore;
      if (isNewHighScore) {
        localStorage.setItem('highScore', prev.score.toString());
      }

      // Requisito para desbloquear próxima fase: 1000 pontos na fase atual
      let newUnlocked = prev.unlockedPhases;
      if (prev.score >= 1000 && prev.currentPhase === prev.unlockedPhases) {
        newUnlocked = Math.min(10, prev.unlockedPhases + 1);
        localStorage.setItem('unlockedPhases', newUnlocked.toString());
      }

      return {
        ...prev,
        isActive: false,
        isGameOver: true,
        unlockedPhases: newUnlocked,
        highScore: isNewHighScore ? prev.score : prev.highScore,
      };
    });

  }, []);

  useEffect(() => {
    if (state.level > previousLevelRef.current) {
      setShowLevelUp(true);
      if (levelUpTimeoutRef.current) clearTimeout(levelUpTimeoutRef.current);
      levelUpTimeoutRef.current = window.setTimeout(() => setShowLevelUp(false), 3000);
    }
    previousLevelRef.current = state.level;
  }, [state.level]);

  useEffect(() => () => {
    if (levelUpTimeoutRef.current) clearTimeout(levelUpTimeoutRef.current);
  }, []);

  useEffect(() => {
    if (state.isActive && (state.timeLeft <= 0 || state.lives <= 0)) {
      handleGameOver();
    }
  }, [state.isActive, state.timeLeft, state.lives, handleGameOver]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!state.isActive) return;
      if (e.key === 'ArrowLeft') setControls(prev => ({ ...prev, left: true }));
      if (e.key === 'ArrowRight') setControls(prev => ({ ...prev, right: true }));
      if (e.key === ' ' || e.key === 'ArrowUp') setControls(prev => ({ ...prev, fire: true }));
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft') setControls(prev => ({ ...prev, left: false }));
      if (e.key === 'ArrowRight') setControls(prev => ({ ...prev, right: false }));
      if (e.key === ' ' || e.key === 'ArrowUp') setControls(prev => ({ ...prev, fire: false }));
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state.isActive]);

  useEffect(() => {
    let timer;
    if (state.isActive && state.timeLeft > 0) {
      timer = window.setInterval(() => {
        setState(prev => {
          return { ...prev, timeLeft: Math.max(0, prev.timeLeft - 1) };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [state.isActive]);

  const now = Date.now();
  const isSlowMo = state.activePowerUps.slowmo > now;
  const isDouble = state.activePowerUps.double > now;
  const isShield = state.activePowerUps.shield > now;
  const isMega = state.activePowerUps.mega > now;
  const isBot = state.activePowerUps.bot > now;

  return (
    <div className="fixed inset-0 bg-slate-950 text-slate-100 font-sans overflow-hidden select-none">
      {/* HUD de Jogo em Tela Cheia */}
      {state.isActive && (
        <div className="absolute inset-0 z-10 pointer-events-none p-4 md:p-8 flex flex-col justify-between">
          {/* Top Bar - Barra de Nível e Stats */}
          <div className="w-full flex flex-col items-center gap-2">
            <div className="w-full max-w-2xl">
              <div className="flex justify-between items-end mb-1 px-1">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-400 fill-purple-400" />
                  <span className="text-xs uppercase tracking-widest text-purple-400 font-black">Phase {state.currentPhase}</span>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2 mr-4">
                    {[...Array(3)].map((_, i) => (
                      <Heart 
                        key={i} 
                        className={`w-6 h-6 ${i < state.lives ? 'text-red-500 fill-red-500' : 'text-slate-700'}`} 
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="w-4 h-4 text-yellow-500" />
                    <span className="text-xl font-mono font-black text-yellow-500">{state.score}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Timer className={`w-4 h-4 ${state.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`} />
                    <span className={`text-xl font-mono font-black ${state.timeLeft < 10 ? 'text-red-500' : 'text-emerald-400'}`}>{state.timeLeft}s</span>
                  </div>
                </div>
              </div>
              <div className="w-full h-3 bg-slate-900/80 rounded-full overflow-hidden border border-white/10 backdrop-blur-md">
                <motion.div 
                  className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (state.score / 1000) * 100)}%` }}
                  transition={{ type: "spring", stiffness: 50 }}
                />
              </div>
            </div>

            {/* Powerups Ativos */}
            <div className="flex gap-2">
              <AnimatePresence>
                {isSlowMo && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full flex items-center gap-2 text-[10px] text-blue-400 backdrop-blur-sm">
                    <Clock className="w-3 h-3" /> SLOW-MO
                  </motion.div>
                )}
                {isDouble && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full flex items-center gap-2 text-[10px] text-yellow-400 backdrop-blur-sm">
                    <Zap className="w-3 h-3" /> 2X XP
                  </motion.div>
                )}
                {isShield && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center gap-2 text-[10px] text-emerald-400 backdrop-blur-sm">
                    <Shield className="w-3 h-3" /> SHIELD
                  </motion.div>
                )}
                {isMega && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="px-3 py-1 bg-pink-500/20 border border-pink-500/50 rounded-full flex items-center gap-2 text-[10px] text-pink-400 backdrop-blur-sm">
                    <Maximize className="w-3 h-3" /> MEGA
                  </motion.div>
                )}
                {isBot && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="px-3 py-1 bg-cyan-500/20 border border-cyan-500/50 rounded-full flex items-center gap-2 text-[10px] text-cyan-400 backdrop-blur-sm">
                    <Bot className="w-3 h-3" /> BOT
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Legenda de Alvos (Canto Superior Direito) */}
          <div className="absolute top-4 right-4 md:top-8 md:right-8 bg-slate-900/60 backdrop-blur-xl p-4 md:p-6 rounded-3xl border border-white/20 flex flex-col gap-3 md:gap-4 shadow-2xl">
            <div className="flex items-center gap-4">
              <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-red-500 shadow-[0_0_12px_rgba(239,68,68,0.6)]" />
              <span className="text-xs md:text-sm font-black text-slate-100 uppercase tracking-widest">Normal (+10)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.6)]" />
              <span className="text-xs md:text-sm font-black text-slate-100 uppercase tracking-widest">Bonus (+50)</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-3.5 h-3.5 md:w-4 md:h-4 rounded-full bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
              <span className="text-xs md:text-sm font-black text-slate-100 uppercase tracking-widest">Minor (+5)</span>
            </div>
          </div>
        </div>
      )}

      {/* Level Up Notification */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="fixed top-1/4 z-50 pointer-events-none"
          >
            <div className="bg-gradient-to-b from-purple-500 to-pink-600 p-8 rounded-3xl shadow-[0_0_50px_rgba(168,85,247,0.5)] border-4 border-white flex flex-col items-center gap-2">
              <ChevronUp className="w-12 h-12 text-white animate-bounce" />
              <h2 className="text-5xl font-black text-white uppercase italic tracking-tighter">Level Up!</h2>
              <span className="text-2xl font-bold text-white/90">Nível {state.level}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Menu Screen */}
      <AnimatePresence>
        {state.isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-slate-950 flex flex-col items-center justify-center p-6 overflow-y-auto bg-cover bg-center bg-no-repeat"
            style={{ backgroundImage: "linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.9)), url('menu-bg.jpg')" }}
          >
            <motion.div 
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              className="text-center mb-12"
            >
              <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-purple-400 to-purple-700 uppercase italic tracking-tighter mb-2">
                Void Trigger
              </h1>
              <p className="text-slate-500 tracking-[0.3em] uppercase font-bold">Deep Space Target Protocol</p>
            </motion.div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 w-full max-w-4xl">
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((phase) => {
                const isUnlocked = phase <= state.unlockedPhases;
                return (
                  <motion.button
                    key={phase}
                    whileHover={isUnlocked ? { scale: 1.05, backgroundColor: 'rgba(168, 85, 247, 0.2)' } : {}}
                    whileTap={isUnlocked ? { scale: 0.95 } : {}}
                    onClick={() => isUnlocked && startGame(phase)}
                    className={`relative aspect-square rounded-2xl border-2 flex flex-col items-center justify-center gap-2 transition-all ${
                      isUnlocked 
                        ? 'border-purple-500/50 bg-slate-900/50 text-white shadow-[0_0_20px_rgba(168,85,247,0.1)]' 
                        : 'border-slate-800 bg-slate-900/20 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <span className="text-3xl font-black">{phase}</span>
                    <span className="text-[10px] uppercase font-bold tracking-widest">Phase</span>
                    {!isUnlocked && <Lock className="w-4 h-4 absolute top-3 right-3 opacity-50" />}
                    {isUnlocked && phase < state.unlockedPhases && <Unlock className="w-4 h-4 absolute top-3 right-3 text-emerald-500 opacity-50" />}
                  </motion.button>
                );
              })}
            </div>

            <div className="mt-12 text-center max-w-md">
              <p className="text-slate-400 text-sm mb-4">Alcance <span className="text-white font-bold">1000 pontos</span> na fase atual para desbloquear a próxima. A velocidade dos alvos aumenta a cada fase.</p>
              <div className="flex justify-center gap-8">
                <div className="flex flex-col">
                  <span className="text-slate-600 text-[10px] uppercase font-bold">Recorde</span>
                  <span className="text-2xl font-mono font-bold text-purple-400">{state.highScore}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-slate-600 text-[10px] uppercase font-bold">Moedas</span>
                  <span className="text-2xl font-mono font-bold text-amber-400">{state.coins}</span>
                </div>
              </div>
              <div className="mt-8 w-full max-w-2xl">
                <h2 className="text-center text-xs uppercase tracking-[0.25em] text-slate-500 font-black mb-3">Power-ups — duração: 15s</h2>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                  {Object.entries(POWERUP_COSTS).map(([powerUp, cost]) => (
                    <button
                      key={powerUp}
                      onClick={() => buyPowerUp(powerUp)}
                      disabled={state.coins < cost}
                      className="rounded-xl border border-cyan-500/30 bg-slate-900/70 px-2 py-2 text-[10px] font-bold uppercase tracking-wide text-cyan-300 disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      {POWERUP_LABELS[powerUp]}<br /><span className="text-amber-400">{cost} moedas</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="relative w-full h-full flex items-center justify-center">
        {state.isActive && (
          <GameCanvas 
            onScoreUpdate={handleScoreUpdate}
            onDamage={handleDamage}
            isActive={state.isActive}
            isSlowMo={isSlowMo}
            isDoublePoints={isDouble}
            isShield={isShield}
            isMega={isMega}
            isBot={isBot}
            controls={controls}
            currentPhase={state.currentPhase}
          />
        )}

        {/* Mobile Controls Overlay */}
        {state.isActive && (
          <div className="absolute inset-x-0 bottom-0 z-20 pointer-events-none p-6 md:p-12 flex justify-between items-end">
            <div className="flex gap-4 pointer-events-auto">
              <button 
                onMouseDown={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, left: true })); }}
                onMouseUp={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, left: false })); }}
                onMouseLeave={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, left: false })); }}
                onTouchStart={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, left: true })); }}
                onTouchEnd={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, left: false })); }}
                onTouchCancel={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, left: false })); }}
                className="w-20 h-20 md:w-24 md:h-24 bg-slate-900/60 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/20 active:bg-purple-600/80 transition-all active:scale-90"
              >
                <ChevronUp className="w-10 h-10 -rotate-90 text-white" />
              </button>
              <button 
                onMouseDown={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, right: true })); }}
                onMouseUp={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, right: false })); }}
                onMouseLeave={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, right: false })); }}
                onTouchStart={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, right: true })); }}
                onTouchEnd={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, right: false })); }}
                onTouchCancel={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, right: false })); }}
                className="w-20 h-20 md:w-24 md:h-24 bg-slate-900/60 backdrop-blur-md rounded-full flex items-center justify-center border-2 border-white/20 active:bg-purple-600/80 transition-all active:scale-90"
              >
                <ChevronUp className="w-10 h-10 rotate-90 text-white" />
              </button>
            </div>
            <button 
              onMouseDown={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, fire: true })); }}
              onMouseUp={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, fire: false })); }}
              onMouseLeave={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, fire: false })); }}
              onTouchStart={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, fire: true })); }}
              onTouchEnd={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, fire: false })); }}
              onTouchCancel={(e) => { e.preventDefault(); setControls(prev => ({ ...prev, fire: false })); }}
              className="w-24 h-24 md:w-28 md:h-28 bg-red-600/60 backdrop-blur-md rounded-full flex items-center justify-center border-4 border-white/30 active:bg-red-500 shadow-[0_0_30px_rgba(220,38,38,0.3)] transition-all active:scale-90 pointer-events-auto"
            >
              <Zap className="w-10 h-10 text-white" />
            </button>
          </div>
        )}

        {/* Game Over Overlay */}
        <AnimatePresence>
          {state.isGameOver && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6"
            >
              <div className="bg-slate-900 p-12 rounded-3xl border-2 border-white/10 text-center max-w-md w-full shadow-[0_0_100px_rgba(0,0,0,0.5)]">
                <h2 className="text-6xl font-black text-white uppercase italic tracking-tighter mb-4">Mission Over</h2>
                <div className="flex flex-col gap-2 mb-8">
                  <div className="flex justify-between text-slate-400 font-bold uppercase tracking-widest text-xs">
                    <span>Score</span>
                    <span className="text-white font-mono">{state.score}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 font-bold uppercase tracking-widest text-xs">
                    <span>High Score</span>
                    <span className="text-yellow-500 font-mono">{state.highScore}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => startGame(state.currentPhase)}
                    className="px-6 py-4 bg-white text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-95"
                  >
                    <RotateCcw className="w-5 h-5" /> RETRY
                  </button>
                  <button 
                    onClick={() => setState(prev => ({ ...prev, isGameOver: false, isMenuOpen: true }))}
                    className="px-6 py-4 bg-slate-800 text-white font-black rounded-xl flex items-center justify-center gap-2 hover:bg-slate-700 transition-all active:scale-95"
                  >
                    <X className="w-5 h-5" /> MENU
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
