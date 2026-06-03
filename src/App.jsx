import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Target as TargetIcon, 
  Trophy, 
  Timer, 
  Play, 
  RotateCcw, 
  Zap, 
  Coins, 
  ShoppingBag, 
  Clock, 
  X,
  User,
  Shield,
  Maximize,
  Bot,
  Star,
  ChevronUp,
  Lock,
  Unlock
} from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import { INITIAL_TIME, COLORS, SHOP_ITEMS } from './constants';

export default function App() {
  const [leaderboard, setLeaderboard] = useState([]);
  const [state, setState] = useState({
    score: 0,
    coins: parseInt(localStorage.getItem('coins') || '0'),
    timeLeft: INITIAL_TIME,
    isActive: false,
    isGameOver: false,
    isMenuOpen: true,
    currentPhase: 1,
    unlockedPhases: parseInt(localStorage.getItem('unlockedPhases') || '1'),
    level: 1,
    highScore: parseInt(localStorage.getItem('highScore') || '0'),
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
  
  const startGame = (phaseNum) => {
    setState(prev => ({
      ...prev,
      score: 0,
      timeLeft: INITIAL_TIME + (phaseNum * 5), // Mais tempo para fases maiores
      isActive: true,
      isGameOver: false,
      isMenuOpen: false,
      currentPhase: phaseNum,
      level: phaseNum,
      activePowerUps: { slowmo: 0, double: 0, shield: 0, mega: 0, bot: 0 }
    }));
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
      
      // Notificação de Level Up
      if (newLevel > prev.level) {
        setShowLevelUp(true);
        setTimeout(() => setShowLevelUp(false), 3000);
      }

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

  const handleGameOver = useCallback(async () => {
    setState(prev => {
      const isNewHighScore = prev.score > prev.highScore;
      if (isNewHighScore) {
        localStorage.setItem('highScore', prev.score.toString());
      }

      // Requisito para desbloquear próxima fase: 1000 pontos na fase atual
      const nextPhase = prev.currentPhase + 1;
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

    // Save to Firebase logic removed for Guest Players to simplify
    // You can re-enable this later with a prompt for name if desired.
  }, [state.score]);



  useEffect(() => {
    // Leaderboard logic disabled as Firebase was removed to protect exposed API keys
    setLeaderboard([]);
  }, []);

  useEffect(() => {
    let timer;
    if (state.isActive && state.timeLeft > 0) {
      timer = window.setInterval(() => {
        setState(prev => {
          if (prev.timeLeft <= 1) {
            handleGameOver();
            return { ...prev, timeLeft: 0 };
          }
          return { ...prev, timeLeft: prev.timeLeft - 1 };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [state.isActive, state.timeLeft, handleGameOver]);

  const now = Date.now();
  const isSlowMo = state.activePowerUps.slowmo > now;
  const isDouble = state.activePowerUps.double > now;

  const getIcon = (iconName) => {
    switch(iconName) {
      case 'Clock': return <Clock className="w-6 h-6" />;
      case 'Timer': return <Timer className="w-6 h-6" />;
      case 'Zap': return <Zap className="w-6 h-6" />;
      case 'Shield': return <Shield className="w-6 h-6" />;
      case 'Maximize': return <Maximize className="w-6 h-6" />;
      case 'Bot': return <Bot className="w-6 h-6" />;
      default: return <ShoppingBag className="w-6 h-6" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans flex flex-col items-center justify-start p-4 overflow-y-auto">
      {/* Header removido para focar na experiência imersiva */}

      {/* HUD - Responsivo */}
      <div className="w-full max-w-4xl grid grid-cols-2 md:flex md:justify-between items-center gap-4 mb-6 bg-slate-900/50 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-4 md:gap-6 order-1">
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-slate-500 font-bold">Score</span>
            <div className="flex items-center gap-1 md:gap-2">
              <Trophy className="w-3 h-3 md:w-4 md:h-4 text-yellow-500" />
              <span className="text-lg md:text-2xl font-mono font-bold text-yellow-500">{state.score}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-slate-500 font-bold">Coins</span>
            <div className="flex items-center gap-1 md:gap-2">
              <Coins className="w-3 h-3 md:w-4 md:h-4 text-amber-400" />
              <span className="text-lg md:text-2xl font-mono font-bold text-amber-400">{state.coins}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center flex-1 min-w-full md:min-w-0 md:max-w-xs order-3 md:order-2 col-span-2">
           <div className="w-full flex justify-between items-end mb-1 px-1">
             <div className="flex items-center gap-1">
               <Star className="w-3 h-3 text-purple-400 fill-purple-400" />
               <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-purple-400 font-bold">Phase {state.currentPhase}</span>
             </div>
             <span className="text-[8px] md:text-[10px] font-mono text-slate-500">{state.score} XP</span>
           </div>
           {/* Progress Bar */}
           <div className="w-full h-1.5 md:h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
             <motion.div 
               className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
               initial={{ width: 0 }}
               animate={{ 
                 width: `${Math.min(100, (state.score / 1000) * 100)}%` 
               }}
               transition={{ type: "spring", stiffness: 50 }}
             />
           </div>
           <div className="flex items-center gap-2 mt-1 md:mt-2">
             <Timer className={`w-3 h-3 md:w-4 md:h-4 ${state.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`} />
             <span className={`text-xl md:text-2xl font-mono font-bold ${state.timeLeft < 10 ? 'text-red-500' : 'text-emerald-400'}`}>
               {state.timeLeft}s
             </span>
           </div>
        </div>

        <div className="flex justify-end gap-2 md:gap-4 order-2 md:order-3">
          <div className="flex flex-col items-end">
            <span className="text-[8px] md:text-[10px] uppercase tracking-widest text-slate-500 font-bold">High Score</span>
            <span className="text-sm md:text-xl font-mono text-slate-400">{state.highScore}</span>
          </div>
        </div>
      </div>

      {/* Active Powerups Bar */}
      <div className="w-full max-w-4xl h-8 mb-2 flex gap-2">
        <AnimatePresence>
          {isSlowMo && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full flex items-center gap-2 text-xs text-blue-400"
            >
              <Clock className="w-3 h-3" /> SLOW MOTION ACTIVE
            </motion.div>
          )}
          {isDouble && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full flex items-center gap-2 text-xs text-yellow-400"
            >
              <Zap className="w-3 h-3" /> 2X POINTS ACTIVE
            </motion.div>
          )}
          {state.activePowerUps.shield > now && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="px-3 py-1 bg-emerald-500/20 border border-emerald-500/50 rounded-full flex items-center gap-2 text-xs text-emerald-400"
            >
              <Shield className="w-3 h-3" /> SHIELD ACTIVE
            </motion.div>
          )}
          {state.activePowerUps.mega > now && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full flex items-center gap-2 text-xs text-purple-400"
            >
              <Maximize className="w-3 h-3" /> MEGA TARGETS ACTIVE
            </motion.div>
          )}
          {state.activePowerUps.bot > now && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="px-3 py-1 bg-red-500/20 border border-red-500/50 rounded-full flex items-center gap-2 text-xs text-red-400"
            >
              <Bot className="w-3 h-3" /> AUTO-BOT ACTIVE
            </motion.div>
          )}
        </AnimatePresence>
      </div>

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
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Game Area */}
      <div className="w-full max-w-4xl relative group mb-4">
        <div>
          <GameCanvas 
            isActive={state.isActive} 
            onScoreUpdate={handleScoreUpdate} 
            onGameOver={handleGameOver}
            level={state.level}
            isSlowMo={isSlowMo}
            isDoublePoints={isDouble}
            isShield={state.activePowerUps.shield > now}
            isMega={state.activePowerUps.mega > now}
            isBot={state.activePowerUps.bot > now}
            controls={controls}
          />

          <AnimatePresence>
            {!state.isActive && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.1 }}
                className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md rounded-lg z-10"
              >
                {state.isGameOver ? (
                  <div className="text-center p-8">
                    <motion.h2 
                      initial={{ y: -20 }}
                      animate={{ y: 0 }}
                      className="text-6xl font-black mb-2 text-red-500 uppercase tracking-tighter"
                    >
                      Game Over
                    </motion.h2>
                    <p className="text-slate-400 mb-8 text-lg">Final Score: <span className="text-white font-bold">{state.score}</span></p>
                    <div className="flex gap-4 justify-center">
                      <button 
                        onClick={() => startGame(state.currentPhase)}
                        className="group relative px-8 py-4 bg-white text-black font-bold rounded-full flex items-center gap-3 hover:bg-emerald-400 transition-all active:scale-95"
                      >
                        <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                        Try Again
                      </button>
                      <button 
                        onClick={() => setState(prev => ({ ...prev, isMenuOpen: true, isGameOver: false }))}
                        className="px-8 py-4 bg-slate-800 text-white font-bold rounded-full flex items-center gap-3 hover:bg-slate-700 transition-all active:scale-95"
                      >
                        Menu
                      </button>

                    </div>
                  </div>
                ) : (
                  <div className="text-center p-8">
                    <TargetIcon className="w-24 h-24 text-red-500 mx-auto mb-6 animate-bounce" />
                    <h1 className="text-7xl font-black mb-4 tracking-tighter uppercase italic">
                      Target <span className="text-red-500">Shooter</span>
                    </h1>
                    <p className="text-slate-400 mb-12 max-w-md mx-auto">
                      Test your reflexes. Hit targets to earn coins and buy power-ups in the shop!
                    </p>
                    <div className="flex gap-6 justify-center">
                      <button 
                        onClick={startGame}
                        className="group relative px-12 py-6 bg-red-600 text-white font-black text-2xl rounded-2xl flex items-center gap-4 hover:bg-red-500 transition-all shadow-[0_0_40px_rgba(220,38,38,0.4)] active:scale-95"
                      >
                        <Play className="w-8 h-8 fill-current" />
                        START MISSION
                      </button>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Mobile Controls */}
      {state.isActive && (
        <div className="w-full max-w-4xl flex justify-between items-center px-4 mb-8">
          <div className="flex gap-4">
            <button 
              onMouseDown={() => setControls(prev => ({ ...prev, left: true }))}
              onMouseUp={() => setControls(prev => ({ ...prev, left: false }))}
              onMouseLeave={() => setControls(prev => ({ ...prev, left: false }))}
              onTouchStart={() => setControls(prev => ({ ...prev, left: true }))}
              onTouchEnd={() => setControls(prev => ({ ...prev, left: false }))}
              className="w-20 h-20 bg-slate-800/80 rounded-full flex items-center justify-center border-2 border-white/20 active:bg-purple-600 transition-colors"
            >
              <ChevronUp className="w-10 h-10 -rotate-90 text-white" />
            </button>
            <button 
              onMouseDown={() => setControls(prev => ({ ...prev, right: true }))}
              onMouseUp={() => setControls(prev => ({ ...prev, right: false }))}
              onMouseLeave={() => setControls(prev => ({ ...prev, right: false }))}
              onTouchStart={() => setControls(prev => ({ ...prev, right: true }))}
              onTouchEnd={() => setControls(prev => ({ ...prev, right: false }))}
              className="w-20 h-20 bg-slate-800/80 rounded-full flex items-center justify-center border-2 border-white/20 active:bg-purple-600 transition-colors"
            >
              <ChevronUp className="w-10 h-10 rotate-90 text-white" />
            </button>
          </div>
          <button 
            onMouseDown={() => setControls(prev => ({ ...prev, fire: true }))}
            onMouseUp={() => setControls(prev => ({ ...prev, fire: false }))}
            onMouseLeave={() => setControls(prev => ({ ...prev, fire: false }))}
            onTouchStart={() => setControls(prev => ({ ...prev, fire: true }))}
            onTouchEnd={() => setControls(prev => ({ ...prev, fire: false }))}
            className="w-24 h-24 bg-red-600/80 rounded-full flex items-center justify-center border-4 border-white/40 active:bg-red-500 shadow-[0_0_30px_rgba(220,38,38,0.5)] transition-all active:scale-90"
          >
            <Zap className="w-10 h-10 text-white" />
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-8 grid grid-cols-3 gap-4 w-full max-w-4xl pb-12">
        <div className="bg-slate-900/30 p-4 rounded-xl border border-white/5 flex items-center gap-4">
          <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
          <span className="text-sm text-slate-400">Normal Target (+10 pts)</span>
        </div>
        <div className="bg-slate-900/30 p-4 rounded-xl border border-white/5 flex items-center gap-4">
          <div className="w-4 h-4 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
          <span className="text-sm text-slate-400">Bonus Target (+50 pts)</span>
        </div>
        <div className="bg-slate-900/30 p-4 rounded-xl border border-white/5 flex items-center gap-4">
          <div className="w-4 h-4 rounded-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]" />
          <span className="text-sm text-slate-400">Penalty Target (-20 pts)</span>
        </div>
      </div>
    </div>
  );
}
