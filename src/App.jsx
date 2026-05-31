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
  LogIn,
  LogOut,
  User,
  Shield,
  Maximize,
  Bot,
  Star,
  ChevronUp
} from 'lucide-react';
import GameCanvas from './components/GameCanvas';
import Leaderboard from './components/Leaderboard';
import { INITIAL_TIME, COLORS, SHOP_ITEMS } from './constants';
import { auth, db, signInWithGoogle, logout } from './firebase';
import { 
  collection, 
  query, 
  orderBy, 
  limit, 
  onSnapshot, 
  setDoc, 
  doc, 
  serverTimestamp,
  getDoc
} from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [state, setState] = useState({
    score: 0,
    coins: parseInt(localStorage.getItem('coins') || '0'),
    timeLeft: INITIAL_TIME,
    isActive: false,
    isGameOver: false,
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

  const [isShopOpen, setIsShopOpen] = useState(false);
  const [showLevelUp, setShowLevelUp] = useState(false);
  
  const startGame = () => {
    setState(prev => ({
      ...prev,
      score: 0,
      timeLeft: INITIAL_TIME,
      isActive: true,
      isGameOver: false,
      level: 1,
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
      return {
        ...prev,
        isActive: false,
        isGameOver: true,
        highScore: isNewHighScore ? prev.score : prev.highScore,
      };
    });

    // Save to Firebase if logged in
    if (auth.currentUser) {
      try {
        const scoreRef = doc(db, 'leaderboard', auth.currentUser.uid);
        const scoreDoc = await getDoc(scoreRef);
        
        // Only update if it's a new personal best on the server too
        if (!scoreDoc.exists() || state.score > scoreDoc.data().score) {
          await setDoc(scoreRef, {
            uid: auth.currentUser.uid,
            displayName: auth.currentUser.displayName || 'Anonymous',
            photoURL: auth.currentUser.photoURL,
            score: state.score,
            updatedAt: serverTimestamp()
          }, { merge: true });
        }
      } catch (error) {
        console.error("Error saving score:", error);
      }
    }
  }, [state.score]);

  const buyItem = (item) => {
    if (state.coins < item.price) return;

    setState(prev => {
      const newCoins = prev.coins - item.price;
      localStorage.setItem('coins', newCoins.toString());
      
      const now = Date.now();
      let newPowerUps = { ...prev.activePowerUps };
      let newTimeLeft = prev.timeLeft;

      if (item.type === 'slowmo') {
        newPowerUps.slowmo = now + 5000;
      } else if (item.type === 'double') {
        newPowerUps.double = now + 10000;
      } else if (item.type === 'time') {
        newTimeLeft += 10;
      } else if (item.type === 'shield') {
        newPowerUps.shield = now + 15000;
      } else if (item.type === 'mega') {
        newPowerUps.mega = now + 10000;
      } else if (item.type === 'bot') {
        newPowerUps.bot = now + 5000;
      }

      return {
        ...prev,
        coins: newCoins,
        activePowerUps: newPowerUps,
        timeLeft: newTimeLeft,
      };
    });
  };

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((u) => {
      setUser(u);
    });

    const q = query(collection(db, 'leaderboard'), orderBy('score', 'desc'), limit(10));
    const unsubscribeLeaderboard = onSnapshot(q, (snapshot) => {
      const scores = snapshot.docs.map(doc => doc.data());
      setLeaderboard(scores);
    }, (error) => {
      console.error("Leaderboard error:", error);
    });

    return () => {
      unsubscribeAuth();
      unsubscribeLeaderboard();
    };
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
      {/* Top Bar / Auth */}
      <div className="w-full max-w-6xl flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <TargetIcon className="w-6 h-6 text-red-500" />
          <span className="font-black tracking-tighter uppercase italic text-xl">Target Shooter <span className="text-red-500">Pro</span></span>
        </div>
        
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3 bg-slate-900/50 p-1.5 pr-4 rounded-full border border-white/10">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} className="w-8 h-8 rounded-full border border-white/10" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center"><User className="w-4 h-4" /></div>
              )}
              <span className="text-sm font-bold hidden sm:inline">{user.displayName}</span>
              <button onClick={logout} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={signInWithGoogle}
              className="flex items-center gap-2 bg-white text-black px-4 py-2 rounded-full font-bold text-sm hover:bg-slate-200 transition-all active:scale-95"
            >
              <LogIn className="w-4 h-4" />
              Login to Save Score
            </button>
          )}
        </div>
      </div>

      {/* HUD */}
      <div className="w-full max-w-4xl flex justify-between items-center mb-6 bg-slate-900/50 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Score</span>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span className="text-2xl font-mono font-bold text-yellow-500">{state.score}</span>
            </div>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">Coins</span>
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-2xl font-mono font-bold text-amber-400">{state.coins}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center flex-1 max-w-xs mx-8">
           <div className="w-full flex justify-between items-end mb-1">
             <div className="flex items-center gap-1">
               <Star className="w-3 h-3 text-purple-400 fill-purple-400" />
               <span className="text-[10px] uppercase tracking-widest text-purple-400 font-bold">Level {state.level}</span>
             </div>
             <span className="text-[10px] font-mono text-slate-500">{state.score} XP</span>
           </div>
           {/* Progress Bar */}
           <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden border border-white/5">
             <motion.div 
               className="h-full bg-gradient-to-r from-purple-500 to-pink-500"
               initial={{ width: 0 }}
               animate={{ 
                 width: `${Math.min(100, (state.score % (state.level * 500 + (state.level - 1) * 250)) / (state.level * 5 + 2.5))}%` 
               }}
               transition={{ type: "spring", stiffness: 50 }}
             />
           </div>
           <div className="flex items-center gap-2 mt-2">
             <Timer className={`w-4 h-4 ${state.timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-emerald-400'}`} />
             <span className={`text-2xl font-mono font-bold ${state.timeLeft < 10 ? 'text-red-500' : 'text-emerald-400'}`}>
               {state.timeLeft}s
             </span>
           </div>
        </div>

        <div className="flex gap-4">
          <button 
            onClick={() => setIsShopOpen(true)}
            className="p-3 bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors relative"
          >
            <ShoppingBag className="w-6 h-6 text-slate-300" />
            {state.coins >= 50 && !state.isActive && (
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
            )}
          </button>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">High Score</span>
            <span className="text-xl font-mono text-slate-400">{state.highScore}</span>
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

      {/* Game and Leaderboard Grid */}
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Game Area */}
        <div className="lg:col-span-2 relative group">
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
                        onClick={startGame}
                        className="group relative px-8 py-4 bg-white text-black font-bold rounded-full flex items-center gap-3 hover:bg-emerald-400 transition-all active:scale-95"
                      >
                        <RotateCcw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                        Try Again
                      </button>
                      <button 
                        onClick={() => setIsShopOpen(true)}
                        className="px-8 py-4 bg-slate-800 text-white font-bold rounded-full flex items-center gap-3 hover:bg-slate-700 transition-all active:scale-95"
                      >
                        <ShoppingBag className="w-5 h-5" />
                        Visit Shop
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

        {/* Leaderboard Sidebar */}
        <div className="flex flex-col gap-4">
          <Leaderboard scores={leaderboard} currentUser={user} />
          
          <div className="bg-slate-900/30 p-6 rounded-2xl border border-white/5">
            <h4 className="font-bold text-sm uppercase tracking-widest text-slate-500 mb-4">How to Play</h4>
            <ul className="space-y-3 text-sm text-slate-400">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Click targets before they disappear
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Green targets give bonus points
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Avoid orange penalty targets
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Use coins in the shop for power-ups
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Shop Modal */}
      <AnimatePresence>
        {isShopOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-slate-900 w-full max-w-2xl rounded-3xl border border-white/10 shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-white/5 flex justify-between items-center bg-slate-800/50">
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-6 h-6 text-red-500" />
                  <h2 className="text-2xl font-bold uppercase tracking-tight">Armory Shop</h2>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2 bg-slate-950 px-4 py-2 rounded-full border border-white/5">
                    <Coins className="w-4 h-4 text-amber-400" />
                    <span className="font-mono font-bold text-amber-400">{state.coins}</span>
                  </div>
                  <button 
                    onClick={() => setIsShopOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                {SHOP_ITEMS.map((item) => (
                  <div 
                    key={item.id}
                    className={`p-5 rounded-2xl border transition-all flex flex-col items-center text-center ${
                      state.coins >= item.price 
                        ? 'bg-slate-800/50 border-white/10 hover:border-red-500/50' 
                        : 'bg-slate-900/50 border-white/5 opacity-60'
                    }`}
                  >
                    <div className="w-12 h-12 bg-slate-950 rounded-xl flex items-center justify-center mb-4 text-red-500">
                      {getIcon(item.icon)}
                    </div>
                    <h3 className="font-bold text-lg mb-1">{item.name}</h3>
                    <p className="text-xs text-slate-400 mb-4 h-8">{item.description}</p>
                    <button 
                      onClick={() => buyItem(item)}
                      disabled={state.coins < item.price}
                      className={`w-full py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                        state.coins >= item.price 
                          ? 'bg-red-600 hover:bg-red-500 text-white' 
                          : 'bg-slate-700 text-slate-500 cursor-not-allowed'
                      }`}
                    >
                      <Coins className="w-4 h-4" />
                      {item.price}
                    </button>
                  </div>
                ))}
              </div>
              
              <div className="p-6 bg-slate-800/30 text-center">
                <p className="text-sm text-slate-500 italic">Power-ups can be bought during gameplay or in the menu!</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
