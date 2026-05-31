import React, { useEffect, useRef } from 'react';
import { GAME_WIDTH, GAME_HEIGHT, TARGET_RADIUS, COLORS } from '../constants';

const GameCanvas = ({ 
  onScoreUpdate, 
  onGameOver, 
  isActive, 
  level,
  isSlowMo,
  isDoublePoints,
  isShield,
  isMega,
  isBot
}) => {
  const canvasRef = useRef(null);
  const targetsRef = useRef([]);
  const particlesRef = useRef([]);
  const requestRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const lastBotClickRef = useRef(0);

  const spawnTarget = () => {
    const side = Math.floor(Math.random() * 4);
    let x, y, vx, vy;
    // Dificuldade aumenta drasticamente a cada fase
    const speed = 2 + level * 1.2;
    const currentRadius = isMega ? TARGET_RADIUS * 2 : TARGET_RADIUS;

    if (side === 0) { // Top
      x = Math.random() * GAME_WIDTH;
      y = -currentRadius;
      vx = (Math.random() - 0.5) * speed;
      vy = Math.random() * speed + 1;
    } else if (side === 1) { // Right
      x = GAME_WIDTH + currentRadius;
      y = Math.random() * GAME_HEIGHT;
      vx = -(Math.random() * speed + 1);
      vy = (Math.random() - 0.5) * speed;
    } else if (side === 2) { // Bottom
      x = Math.random() * GAME_WIDTH;
      y = GAME_HEIGHT + currentRadius;
      vx = (Math.random() - 0.5) * speed;
      vy = -(Math.random() * speed + 1);
    } else { // Left
      x = -currentRadius;
      y = Math.random() * GAME_HEIGHT;
      vx = Math.random() * speed + 1;
      vy = (Math.random() - 0.5) * speed;
    }

    const typeRand = Math.random();
    let type = 'normal';
    let color = COLORS.target;
    let points = 10;

    if (typeRand > 0.9) {
      type = 'bonus';
      color = COLORS.bonus;
      points = 50;
    } else if (typeRand > 0.8) {
      type = 'penalty';
      color = COLORS.penalty;
      points = isShield ? 0 : -20;
    }

    const newTarget = {
      id: Math.random().toString(36).substr(2, 9),
      x, y, vx, vy, radius: currentRadius, points, type, color
    };

    targetsRef.current.push(newTarget);
  };

  const createExplosion = (x, y, color) => {
    for (let i = 0; i < 10; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1,
        color
      });
    }
  };

  const handleCanvasClick = (e) => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const mouseX = (e.clientX - rect.left) * scaleX;
    const mouseY = (e.clientY - rect.top) * scaleY;

    targetsRef.current = targetsRef.current.filter(target => {
      const dist = Math.sqrt((mouseX - target.x) ** 2 + (mouseY - target.y) ** 2);
      if (dist < target.radius) {
        let finalPoints = isDoublePoints ? target.points * 2 : target.points;
        // If shield is active and it's a penalty, points are 0 (already handled in spawn but good to be safe)
        if (isShield && target.type === 'penalty') finalPoints = 0;
        
        onScoreUpdate(finalPoints);
        createExplosion(target.x, target.y, target.color);
        return false;
      }
      return true;
    });
  };

  const update = (time) => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;

    // Spawn logic
    // Spawn fica mais rápido a cada fase
    if (time - lastSpawnRef.current > Math.max(150, 1000 - level * 150)) {
      spawnTarget();
      lastSpawnRef.current = time;
    }

    // Bot logic
    if (isBot && time - lastBotClickRef.current > 300) {
      if (targetsRef.current.length > 0) {
        const target = targetsRef.current[0];
        if (target.type !== 'penalty') {
          let finalPoints = isDoublePoints ? target.points * 2 : target.points;
          onScoreUpdate(finalPoints);
          createExplosion(target.x, target.y, target.color);
          targetsRef.current.shift();
          lastBotClickRef.current = time;
        }
      }
    }

    // Clear
    ctx.fillStyle = COLORS.background;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Slow mo effect overlay
    if (isSlowMo) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Shield effect overlay
    if (isShield) {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    // Grid effect
    ctx.strokeStyle = isSlowMo ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.05)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.width; i += 50) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, canvas.height);
      ctx.stroke();
    }
    for (let i = 0; i < canvas.height; i += 50) {
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(canvas.width, i);
      ctx.stroke();
    }

    // Update targets
    targetsRef.current.forEach(target => {
      const speedMult = isSlowMo ? 0.3 : 1;
      target.x += target.vx * speedMult;
      target.y += target.vy * speedMult;

      // Draw target
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      ctx.fillStyle = target.color;
      ctx.fill();
      
      // Rings
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 0.6, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius * 0.2, 0, Math.PI * 2);
      ctx.stroke();
    });

    // Remove off-screen targets
    targetsRef.current = targetsRef.current.filter(t => 
      t.x > -100 && t.x < GAME_WIDTH + 100 && t.y > -100 && t.y < GAME_HEIGHT + 100
    );

    // Update particles
    particlesRef.current.forEach(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;

      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, 4, 4);
    });
    ctx.globalAlpha = 1;
    particlesRef.current = particlesRef.current.filter(p => p.life > 0);

    requestRef.current = requestAnimationFrame(update);
  };

  useEffect(() => {
    if (isActive) {
      requestRef.current = requestAnimationFrame(update);
    } else {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, level]);

  return (
    <canvas
      ref={canvasRef}
      width={GAME_WIDTH}
      height={GAME_HEIGHT}
      onClick={handleCanvasClick}
      className="w-full h-auto aspect-video max-w-4xl rounded-lg shadow-2xl cursor-crosshair border-2 md:border-4 border-slate-800 bg-slate-900"
      id="game-canvas"
      style={{ touchAction: 'none' }}
    />
  );
};

export default GameCanvas;
