import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Timer, 
  RotateCcw, 
  Zap, 
  Clock, 
  X,
  ShoppingCart,
  Pause,
  Play,
  Home,
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
    isPaused: false,
    isGameOver: false,
    isMenuOpen: true,
    currentPhase: 1,
    phaseKills: 0,
    isPhaseComplete: false,
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
    pendingPowerUps: {
      slowmo: false,
      double: false,
      shield: false,
      mega: false,
      bot: false,
    },
  });

  const [showLevelUp, setShowLevelUp] = useState(false);
  const [isMenuPanelOpen, setIsMenuPanelOpen] = useState(false);
  const [, setControls] = useState({ left: false, right: false, fire: false });
  const controlsRef = useRef({ left: false, right: false, fire: false });
  const levelUpTimeoutRef = useRef(null);
  const previousLevelRef = useRef(1);

  const POWERUP_COSTS = { slowmo: 10, double: 15, shield: 20, mega: 25, bot: 30 };
  const POWERUP_LABELS = { slowmo: 'Slow-Mo', double: '2X PONTOS', shield: 'Shield', mega: 'Mega', bot: 'Bot' };
  const POWERUP_DESCRIPTIONS = {
    slowmo: 'Deixa os inimigos mais lentos.',
    double: 'Dobra os pontos ganhos.',
    shield: 'Protege contra colisões.',
    mega: 'Aumenta o tamanho dos alvos.',
    bot: 'Atira automaticamente nos alvos.',
  };
  const POWERUP_DURATION = 15000;
  
  const startGame = (phaseNum) => {
    setIsMenuPanelOpen(false);
    controlsRef.current = { left: false, right: false, fire: false };
    setControls({ left: false, right: false, fire: false });
    setState(prev => ({
      ...prev,
      activePowerUps: Object.keys(prev.pendingPowerUps).reduce((active, powerUp) => {
        active[powerUp] = prev.pendingPowerUps[powerUp] ? Date.now() + POWERUP_DURATION : 0;
        return active;
      }, {}),
      pendingPowerUps: {
        slowmo: false,
        double: false,
        shield: false,
        mega: false,
        bot: false,
      },
      score: 0,
      lives: 3,
      timeLeft: GAME_DURATION, // Todas as fases têm a mesma duração definida em constants.js
      isActive: true,
      isPaused: false,
      isGameOver: false,
      phaseKills: 0,
      isPhaseComplete: false,
      isMenuOpen: false,
      currentPhase: phaseNum,
      level: 1
    }));
  };

  const restartGame = () => startGame(state.currentPhase);

  const returnToMenu = () => {
    controlsRef.current = { left: false, right: false, fire: false };
    setControls({ left: false, right: false, fire: false });
    setIsMenuPanelOpen(false);
    setState(prev => ({ ...prev, isActive: false, isPaused: false, isGameOver: false, isPhaseComplete: false, isMenuOpen: true }));
  };

  const setControl = (control, value) => {
    controlsRef.current = { ...controlsRef.current, [control]: value };
    setControls(controlsRef.current);
  };

  const getPointerHandlers = (control) => ({
    onPointerDown: (event) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture?.(event.pointerId);
      setControl(control, true);
    },
    onPointerUp: (event) => {
      event.preventDefault();
      setControl(control, false);
    },
    onPointerCancel: () => setControl(control, false),
    onLostPointerCapture: () => setControl(control, false),
  });

  const buyPowerUp = (powerUp) => {
    const cost = POWERUP_COSTS[powerUp];
    setState(prev => {
      if (prev.coins < cost) return prev;
      const remainingCoins = prev.coins - cost;
      localStorage.setItem('coins', String(remainingCoins));
      return {
        ...prev,
        coins: remainingCoins,
        pendingPowerUps: { ...prev.pendingPowerUps, [powerUp]: true },
      };
    });
  };

  const handleScoreUpdate = useCallback((points) => {
    setState(prev => {
      const newScore = Math.max(0, prev.score + points);
      // Níveis agora escalam com a pontuação: Nível 1 (0-500), Nível 2 (500-1200), Nível 3 (1200-2100)...
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

  const handleEnemyDefeated = useCallback(() => {
    setState(prev => {
      if (prev.isPhaseComplete) return prev;
      const requiredKills = prev.currentPhase * 10;
      const phaseKills = Math.min(requiredKills, prev.phaseKills + 1);
      if (phaseKills < requiredKills) {
        return { ...prev, phaseKills };
      }

      const newUnlocked = Math.min(10, Math.max(prev.unlockedPhases, prev.currentPhase + 1));
      localStorage.setItem('unlockedPhases', newUnlocked.toString());
      return {
        ...prev,
        phaseKills,
        isActive: false,
        isPaused: false,
        isPhaseComplete: true,
        unlockedPhases: newUnlocked,
      };
    });
  }, []);

  const advanceToNextPhase = () => {
    if (state.currentPhase >= 10) {
      returnToMenu();
      return;
    }
    startGame(state.currentPhase + 1);
  };

  const handleGameOver = useCallback(() => {
    setState(prev => {
      const isNewHighScore = prev.score > prev.highScore;
      if (isNewHighScore) {
        localStorage.setItem('highScore', prev.score.toString());
      }

      return {
        ...prev,
        isActive: false,
        isGameOver: true,
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
    if (state.isActive && !state.isPaused && (state.timeLeft <= 0 || state.lives <= 0)) {
      handleGameOver();
    }
  }, [state.isActive, state.timeLeft, state.lives, handleGameOver]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!state.isActive || state.isPaused) return;
      if (e.key === 'ArrowLeft') setControl('left', true);
      if (e.key === 'ArrowRight') setControl('right', true);
      if (e.key === ' ' || e.key === 'ArrowUp') setControl('fire', true);
    };

    const handleKeyUp = (e) => {
      if (e.key === 'ArrowLeft') setControl('left', false);
      if (e.key === 'ArrowRight') setControl('right', false);
      if (e.key === ' ' || e.key === 'ArrowUp') setControl('fire', false);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [state.isActive, state.isPaused]);

  useEffect(() => {
    let timer;
    if (state.isActive && !state.isPaused && state.timeLeft > 0) {
      timer = window.setInterval(() => {
        setState(prev => {
          return { ...prev, timeLeft: Math.max(0, prev.timeLeft - 1) };
        });
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [state.isActive, state.isPaused]);

  const now = Date.now();
  const isSlowMo = state.activePowerUps.slowmo > now;
  const isDouble = state.activePowerUps.double > now;
  const isShield = state.activePowerUps.shield > now;
  const isMega = state.activePowerUps.mega > now;
  const isBot = state.activePowerUps.bot > now;

  return (
    <div className="fixed inset-0 overflow-hidden overscroll-none bg-slate-950 font-sans text-slate-100 select-none">
      {/* HUD de Jogo em Tela Cheia */}
      {state.isActive && (
        <div className="pointer-events-none absolute inset-0 z-10 flex flex-col justify-between p-3 sm:p-4 md:p-8">
        <div className="pointer-events-auto self-start">
          <button
            type="button"
            aria-label={state.isPaused ? 'Continuar jogo' : 'Pausar jogo'}
            onClick={() => setState(prev => ({ ...prev, isPaused: !prev.isPaused }))}
            className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-slate-950/80 text-white shadow-xl backdrop-blur-md transition-colors hover:bg-purple-600/80"
          >
            {state.isPaused ? <Play className="h-6 w-6" /> : <Pause className="h-6 w-6" />}
          </button>
        </div>
        <div className="pointer-events-none absolute left-1/2 top-3 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/15 bg-slate-950/85 px-3 py-1.5 shadow-lg backdrop-blur-md md:hidden">
          <Timer className={`h-4 w-4 ${state.timeLeft < 10 ? 'animate-pulse text-red-500' : 'text-emerald-400'}`} />
          <span className={`font-mono text-lg font-black leading-none ${state.timeLeft < 10 ? 'text-red-500' : 'text-emerald-400'}`}>{state.timeLeft}s</span>
        </div>
          {/* Top Bar - Estatísticas da partida */}
          <div className="w-full flex flex-col items-center gap-2">
            <div className="w-full max-w-2xl">
              <div className="mb-1 flex items-end justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-purple-400 fill-purple-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-400 sm:text-xs">Phase {state.currentPhase}</span>
                  <span className="rounded-full border border-purple-400/30 bg-purple-500/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-wide text-purple-200 sm:text-[10px]">
                    {state.phaseKills}/{state.currentPhase * 10} eliminações
                  </span>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                  <div className="mr-1 flex items-center gap-1 sm:mr-4 sm:gap-2">
                    {[...Array(3)].map((_, i) => (
                      <Heart 
                        key={i} 
                        className={`h-4 w-4 sm:h-6 sm:w-6 ${i < state.lives ? 'fill-red-500 text-red-500' : 'text-slate-700'}`}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-1">
                    <Trophy className="h-3.5 w-3.5 text-yellow-500 sm:h-4 sm:w-4" />
                    <span className="font-mono text-base font-black text-yellow-500 sm:text-xl">{state.score}</span>
                  </div>
                  <div className="hidden items-center gap-1 md:flex">
                    <Timer className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${state.timeLeft < 10 ? 'animate-pulse text-red-500' : 'text-emerald-400'}`} />
                    <span className={`font-mono text-base font-black sm:text-xl ${state.timeLeft < 10 ? 'text-red-500' : 'text-emerald-400'}`}>{state.timeLeft}s</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Powerups Ativos */}
            <div className="flex max-w-[calc(100vw-1.5rem)] flex-wrap justify-center gap-1.5 sm:gap-2">
              <AnimatePresence>
                {isSlowMo && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="px-3 py-1 bg-blue-500/20 border border-blue-500/50 rounded-full flex items-center gap-2 text-[10px] text-blue-400 backdrop-blur-sm">
                    <Clock className="w-3 h-3" /> SLOW-MO
                  </motion.div>
                )}
                {isDouble && (
                  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }} className="px-3 py-1 bg-yellow-500/20 border border-yellow-500/50 rounded-full flex items-center gap-2 text-[10px] text-yellow-400 backdrop-blur-sm">
                    <Zap className="w-3 h-3" /> 2X PONTOS
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
          <div className="absolute right-4 top-4 hidden flex-col gap-3 rounded-3xl border border-white/20 bg-slate-900/60 p-4 shadow-2xl backdrop-blur-xl md:flex md:right-8 md:top-8 md:gap-4 md:p-6">
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

      <AnimatePresence>
        {state.isActive && state.isPaused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-6 backdrop-blur-md"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-sm rounded-3xl border border-white/10 bg-slate-900/95 p-8 text-center shadow-2xl"
            >
              <Pause className="mx-auto mb-4 h-10 w-10 text-purple-400" />
              <h2 className="mb-6 text-3xl font-black uppercase italic tracking-tight text-white">Jogo pausado</h2>
              <div className="flex flex-col gap-3">
                <button type="button" onClick={() => setState(prev => ({ ...prev, isPaused: false }))} className="rounded-xl bg-purple-600 px-5 py-3 font-black text-white transition-colors hover:bg-purple-500">Continuar</button>
                <button type="button" onClick={restartGame} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/10 px-5 py-3 font-black text-white transition-colors hover:bg-white/20"><RotateCcw className="h-4 w-4" /> Recomeçar fase</button>
                <button type="button" onClick={returnToMenu} className="flex items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-black text-slate-300 transition-colors hover:bg-white/10"><Home className="h-4 w-4" /> Voltar ao menu</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {state.isPhaseComplete && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/85 p-4 backdrop-blur-md sm:p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="w-full max-w-md rounded-3xl border border-emerald-400/30 bg-slate-900/95 p-6 text-center shadow-2xl sm:p-10"
            >
              <Trophy className="mx-auto mb-4 h-12 w-12 text-emerald-400" />
              <h2 className="mb-2 text-3xl font-black uppercase italic tracking-tight text-white sm:text-4xl">
                {state.currentPhase >= 10 ? 'Jogo concluído' : `Fase ${state.currentPhase} concluída`}
              </h2>
              <p className="mb-7 text-sm text-slate-400 sm:text-base">
                Você eliminou <span className="font-black text-emerald-400">{state.phaseKills}</span> inimigos.
                {state.currentPhase < 10 && ` A fase ${state.currentPhase + 1} exige ${(state.currentPhase + 1) * 10} eliminações.`}
              </p>
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={advanceToNextPhase}
                  className="rounded-xl bg-emerald-500 px-5 py-3 font-black text-slate-950 transition-colors hover:bg-emerald-400"
                >
                  {state.currentPhase >= 10 ? 'Voltar ao menu' : `Avançar para a fase ${state.currentPhase + 1}`}
                </button>
                <button
                  type="button"
                  onClick={returnToMenu}
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 font-black text-slate-300 transition-colors hover:bg-white/10"
                >
                  Menu principal
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Level Up Notification */}
      <AnimatePresence>
        {showLevelUp && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.5 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 1.5 }}
            className="pointer-events-none fixed inset-x-4 top-1/4 z-50"
          >
            <div className="flex flex-col items-center gap-2 rounded-3xl border-4 border-white bg-gradient-to-b from-purple-500 to-pink-600 p-5 shadow-[0_0_50px_rgba(168,85,247,0.5)] sm:p-8">
              <ChevronUp className="h-10 w-10 animate-bounce text-white sm:h-12 sm:w-12" />
              <h2 className="text-3xl font-black uppercase italic tracking-tighter text-white sm:text-5xl">Level Up!</h2>
              <span className="text-xl font-bold text-white/90 sm:text-2xl">Nível {state.level}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botão da loja na página inicial */}
      {state.isMenuOpen && (
        <motion.button
          type="button"
          aria-label="Abrir loja"
          aria-expanded={isMenuPanelOpen}
          onClick={() => setIsMenuPanelOpen(prev => !prev)}
          whileTap={{ scale: 0.92 }}
          className="fixed top-4 left-4 z-[90] flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-slate-950/80 text-white shadow-xl backdrop-blur-md transition-colors hover:bg-purple-600/80"
        >
          <ShoppingCart className="h-7 w-7" />
        </motion.button>
      )}

      <AnimatePresence>
        {state.isMenuOpen && isMenuPanelOpen && (
          <>
            <motion.button
              type="button"
              aria-label="Fechar menu"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuPanelOpen(false)}
              className="fixed inset-0 z-[70] cursor-default bg-black/60"
            />
            <motion.aside
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 280, damping: 28 }}
              aria-label="Menu principal"
              className="fixed inset-y-0 left-0 z-[80] w-[min(88vw,360px)] overflow-y-auto border-r border-white/10 bg-slate-950/95 p-6 pt-20 text-left shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-8 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-400">Void Trigger</p>
                  <h2 className="mt-1 text-2xl font-black uppercase italic tracking-tight text-white">Menu</h2>
                </div>
                <button
                  type="button"
                  aria-label="Fechar menu"
                  onClick={() => setIsMenuPanelOpen(false)}
                  className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-white/10 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="mb-8 grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Recorde</span>
                  <span className="mt-1 block text-2xl font-black text-purple-400">{state.highScore}</span>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                  <span className="block text-[10px] font-bold uppercase tracking-widest text-slate-500">Moedas</span>
                  <span className="mt-1 block text-2xl font-black text-amber-400">{state.coins}</span>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-white">Loja</h3>
                    <p className="mt-1 text-[10px] uppercase tracking-wider text-slate-500">Power-ups por 15 segundos</p>
                  </div>
                  <span className="text-xs font-black text-amber-400">{state.coins} moedas</span>
                </div>
                <div className="space-y-2">
                  {Object.entries(POWERUP_COSTS).map(([powerUp, cost]) => (
                    <button
                      type="button"
                      key={powerUp}
                      onClick={() => buyPowerUp(powerUp)}
                      disabled={state.coins < cost}
                      className="flex w-full items-center justify-between rounded-xl border border-cyan-500/20 bg-slate-900/80 px-4 py-3 text-left transition-colors hover:border-cyan-400/60 hover:bg-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span>
                        <span className="block text-xs font-black uppercase tracking-wide text-cyan-300">{POWERUP_LABELS[powerUp]}</span>
                        <span className="block text-[10px] leading-tight text-slate-500">{POWERUP_DESCRIPTIONS[powerUp]}</span>
                      </span>
                      <span className="text-xs font-black text-amber-400">{cost}</span>
                    </button>
                  ))}
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Menu Screen */}
      <AnimatePresence>
        {state.isMenuOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] flex min-h-[100dvh] flex-col items-center justify-center overflow-y-auto bg-slate-950 bg-cover bg-center bg-no-repeat p-4 sm:p-6"
            style={{ backgroundImage: "linear-gradient(rgba(15, 23, 42, 0.8), rgba(15, 23, 42, 0.9)), url('menu-bg.jpg')" }}
          >
            <motion.div 
              initial={{ y: -50 }}
              animate={{ y: 0 }}
              className="mb-8 text-center sm:mb-12"
            >
              <h1 className="mb-2 text-5xl font-black uppercase italic tracking-tighter text-transparent bg-gradient-to-b from-purple-400 to-purple-700 bg-clip-text sm:text-7xl md:text-8xl">
                Void Trigger
              </h1>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500 sm:text-xs sm:tracking-[0.3em]">Deep Space Target Protocol</p>
            </motion.div>

            <div className="grid w-full max-w-4xl grid-cols-2 gap-3 sm:gap-4 md:grid-cols-5">
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
              <p className="mb-4 text-xs text-slate-400 sm:text-sm">Elimine <span className="font-bold text-white">{state.currentPhase * 10} inimigos</span> na fase atual para avançar. A velocidade dos alvos aumenta a cada fase.</p>
              <div className="flex justify-center gap-6 sm:gap-8">
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

      <div className="relative w-full h-full flex items-center justify-center">
        {state.isActive && (
          <GameCanvas 
            onScoreUpdate={handleScoreUpdate}
            onEnemyDefeated={handleEnemyDefeated}
            onDamage={handleDamage}
            isActive={state.isActive && !state.isPaused}
            isSlowMo={isSlowMo}
            isDoublePoints={isDouble}
            isShield={isShield}
            isMega={isMega}
            isBot={isBot}
            inputControlsRef={controlsRef}
            currentPhase={state.currentPhase}
          />
        )}

        {/* Mobile Controls Overlay */}
        {state.isActive && !state.isPaused && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-end justify-between gap-3 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:p-6 md:p-12">
            <div className="pointer-events-auto flex gap-2 sm:gap-4">
              <button
                type="button"
                aria-label="Mover nave para a esquerda"
                {...getPointerHandlers('left')}
                className="flex h-14 w-14 touch-none items-center justify-center rounded-full border-2 border-white/20 bg-slate-900/70 backdrop-blur-md transition-all active:scale-90 active:bg-purple-600/80 sm:h-20 sm:w-20 md:h-24 md:w-24"
              >
                <ChevronUp className="h-7 w-7 -rotate-90 text-white sm:h-10 sm:w-10" />
              </button>
              <button
                type="button"
                aria-label="Mover nave para a direita"
                {...getPointerHandlers('right')}
                className="flex h-14 w-14 touch-none items-center justify-center rounded-full border-2 border-white/20 bg-slate-900/70 backdrop-blur-md transition-all active:scale-90 active:bg-purple-600/80 sm:h-20 sm:w-20 md:h-24 md:w-24"
              >
                <ChevronUp className="h-7 w-7 rotate-90 text-white sm:h-10 sm:w-10" />
              </button>
            </div>
            <button
              type="button"
              aria-label="Atirar"
              {...getPointerHandlers('fire')}
              className="pointer-events-auto flex h-[4.5rem] w-[4.5rem] touch-none items-center justify-center rounded-full border-4 border-white/30 bg-red-600/70 shadow-[0_0_30px_rgba(220,38,38,0.3)] backdrop-blur-md transition-all active:scale-90 active:bg-red-500 sm:h-24 sm:w-24 md:h-28 md:w-28"
            >
              <Zap className="h-8 w-8 text-white sm:h-10 sm:w-10" />
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
              className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 p-4 backdrop-blur-xl sm:p-6"
            >
              <div className="w-full max-w-md rounded-3xl border-2 border-white/10 bg-slate-900 p-6 text-center shadow-[0_0_100px_rgba(0,0,0,0.5)] sm:p-12">
                <h2 className="mb-4 text-4xl font-black uppercase italic tracking-tighter text-white sm:text-6xl">Mission Over</h2>
                <div className="mb-6 flex flex-col gap-2 sm:mb-8">
                  <div className="flex justify-between text-slate-400 font-bold uppercase tracking-widest text-xs">
                    <span>Score</span>
                    <span className="text-white font-mono">{state.score}</span>
                  </div>
                  <div className="flex justify-between text-slate-400 font-bold uppercase tracking-widest text-xs">
                    <span>High Score</span>
                    <span className="text-yellow-500 font-mono">{state.highScore}</span>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                  <button 
                    onClick={() => startGame(state.currentPhase)}
                    className="px-6 py-4 bg-white text-slate-950 font-black rounded-xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all active:scale-95"
                  >
                    <RotateCcw className="w-5 h-5" /> RETRY
                  </button>
                  <button 
                    onClick={() => { setIsMenuPanelOpen(false); setState(prev => ({ ...prev, isGameOver: false, isMenuOpen: true })); }}
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
