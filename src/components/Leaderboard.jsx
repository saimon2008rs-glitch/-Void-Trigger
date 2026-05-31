import React from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, User } from 'lucide-react';

const Leaderboard = ({ scores }) => {
  return (
    <div className="bg-slate-900/50 rounded-2xl border border-white/10 overflow-hidden backdrop-blur-sm">
      <div className="p-4 border-b border-white/5 bg-slate-800/50 flex items-center gap-2">
        <Trophy className="w-5 h-5 text-yellow-500" />
        <h3 className="font-bold uppercase tracking-tight">Global Leaderboard</h3>
      </div>
      <div className="divide-y divide-white/5 max-h-[400px] overflow-y-auto">
        {scores.length === 0 ? (
          <div className="p-8 text-center text-slate-500 italic">
            No scores yet. Be the first!
          </div>
        ) : (
          scores.map((entry, index) => (
            <div 
              key={entry.uid || index} 
              className="p-4 flex items-center justify-between transition-colors hover:bg-white/5"
            >
              <div className="flex items-center gap-4">
                <div className="w-8 flex justify-center">
                  {index === 0 ? <Medal className="w-6 h-6 text-yellow-500" /> :
                   index === 1 ? <Medal className="w-6 h-6 text-slate-400" /> :
                   index === 2 ? <Medal className="w-6 h-6 text-amber-600" /> :
                   <span className="text-slate-500 font-mono font-bold">#{index + 1}</span>}
                </div>
                <div className="flex items-center gap-3">
                  {entry.photoURL ? (
                    <img 
                      src={entry.photoURL} 
                      alt={entry.displayName} 
                      className="w-8 h-8 rounded-full border border-white/10"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-white/10">
                      <User className="w-4 h-4 text-slate-400" />
                    </div>
                  )}
                  <span className="font-bold text-slate-200">
                    {entry.displayName}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className="font-mono font-bold text-lg text-white">{entry.score.toLocaleString()}</div>
                <div className="text-[10px] text-slate-500 uppercase">Points</div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
