import React, { useEffect, useRef } from 'react';
import { GAME_WIDTH, GAME_HEIGHT, TARGET_RADIUS, COLORS } from '../constants';

const GameCanvas = ({ 
  onScoreUpdate, 
  onGameOver,
  onDamage,
  isActive, 
  level,
  isSlowMo,
  isDoublePoints,
  isShield,
  isMega,
  isBot,
  controls,
  currentPhase
}) => {
  const canvasRef = useRef(null);
  const targetsRef = useRef([]);
  const bulletsRef = useRef([]);
  const particlesRef = useRef([]);
  const shipRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight - 100 });
      const shipImageRef = useRef(null);
  const phaseBgImageRef = useRef(null);
  const alienRedImageRef = useRef(null);


  const requestRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const lastFireRef = useRef(0);
  const lastBotClickRef = useRef(0);
  const controlsRef = useRef(controls);

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  const spawnTarget = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const side = Math.floor(Math.random() * 3); // Apenas 3 lados: Cima, Direita, Esquerda
    let x, y, vx, vy;
    const speed = 2 + level * 1.2;
    const currentRadius = isMega ? TARGET_RADIUS * 2 : TARGET_RADIUS;

    if (side === 0) { // Top
      x = Math.random() * width;
      y = -currentRadius;
      vx = (Math.random() - 0.5) * speed;
      vy = Math.random() * speed + 1;
    } else if (side === 1) { // Right
      x = width + currentRadius;
      y = Math.random() * (height * 0.7); // Limita o surgimento lateral até 70% da altura para não vir de trás
      vx = -(Math.random() * speed + 1);
      vy = (Math.random() - 0.5) * speed;
    } else { // Left
      x = -currentRadius;
      y = Math.random() * (height * 0.7); // Limita o surgimento lateral até 70% da altura para não vir de trás
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
      points = 5;
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

  const handleCanvasClick = () => {
    // Click on canvas disabled in favor of manual firing
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

    // Ship movement
    const width = window.innerWidth;
    const height = window.innerHeight;
    if (controlsRef.current.left) shipRef.current.x = Math.max(30, shipRef.current.x - 12);
    if (controlsRef.current.right) shipRef.current.x = Math.min(width - 30, shipRef.current.x + 12);

    // Firing logic
    if (controlsRef.current.fire && time - lastFireRef.current > 200) {
      bulletsRef.current.push({
        x: shipRef.current.x,
        y: shipRef.current.y - 20,
        vy: -10
      });
      lastFireRef.current = time;
    }

    // Clear & Background
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (phaseBgImageRef.current && phaseBgImageRef.current.complete) {
      ctx.drawImage(phaseBgImageRef.current, 0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'rgba(15, 23, 42, 0.4)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.fillStyle = COLORS.background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }

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

    // Update Bullets
    bulletsRef.current.forEach(bullet => {
      bullet.y += bullet.vy;
      ctx.fillStyle = '#fff';
      ctx.fillRect(bullet.x - 2, bullet.y - 10, 4, 20);
      
      // Check collision with targets
      targetsRef.current = targetsRef.current.filter(target => {
        const dist = Math.sqrt((bullet.x - target.x) ** 2 + (bullet.y - target.y) ** 2);
        if (dist < target.radius + 10) {
          let finalPoints = isDoublePoints ? target.points * 2 : target.points;
          if (isShield && target.type === 'penalty') finalPoints = 0;
          onScoreUpdate(finalPoints);
          createExplosion(target.x, target.y, target.color);
          bullet.toRemove = true;
          return false;
        }
        return true;
      });
    });
    bulletsRef.current = bulletsRef.current.filter(b => !b.toRemove && b.y > -50);

    // Update targets
    targetsRef.current.forEach(target => {
      const speedMult = isSlowMo ? 0.3 : 1;
      target.x += target.vx * speedMult;
      target.y += target.vy * speedMult;

      // Check collision with ship
      const distToShip = Math.sqrt((target.x - shipRef.current.x) ** 2 + (target.y - shipRef.current.y) ** 2);
      if (distToShip < target.radius + 20) {
        onDamage();
        createExplosion(target.x, target.y, target.color);
        target.toRemove = true;
      }

      // Draw target
      if (target.type === 'normal' && alienRedImageRef.current) {
        ctx.drawImage(
          alienRedImageRef.current, 
          target.x - target.radius * 1.5, 
          target.y - target.radius * 1.5, 
          target.radius * 3, 
          target.radius * 3
        );
      } else {
        ctx.beginPath();
        ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
        ctx.fillStyle = target.color;
        ctx.fill();
        
        // Rings
        ctx.strokeStyle = 'white';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });

    // Draw Ship
    const shipSize = 100; // Tamanho ideal para a pixel art
    if (shipImageRef.current) {
      ctx.drawImage(
        shipImageRef.current, 
        shipRef.current.x - shipSize / 2, 
        shipRef.current.y - shipSize / 2, 
        shipSize, 
        shipSize
      );
    } else {
      // Se a imagem ainda estiver carregando, desenhamos um brilho temporário
      // mas NUNCA mais o triângulo roxo.
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#a855f7';
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(shipRef.current.x, shipRef.current.y, 10, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
    }

    // Remove off-screen or hit targets
    targetsRef.current = targetsRef.current.filter(t => 
      !t.toRemove && t.x > -100 && t.x < width + 100 && t.y > -100 && t.y < height + 100
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
    const version = new Date().getTime();
    
    // Carregar Nave
    const shipImg = new Image();
    shipImg.src = `ship-transparent.webp?v=${version}`;
    shipImg.onload = () => {
      shipImageRef.current = shipImg;
    };
    shipImg.onerror = () => {
      shipImg.src = `/-Void-Trigger/ship-transparent.webp?v=${version}`;
    };







    // Carregar Alien
    const alienImg = new Image();
    alienImg.src = `alien-red.png?v=${version}`;
    alienImg.onload = () => {
      alienRedImageRef.current = alienImg;
    };
    alienImg.onerror = () => {
      alienImg.src = `/-Void-Trigger/alien-red.png?v=${version}`;
    };

    // Carregar Fundo
    if (currentPhase === 1) {
      const bgImg = new Image();
      bgImg.src = `level1-bg.png?v=${version}`;
      bgImg.onload = () => {
        phaseBgImageRef.current = bgImg;
      };
      bgImg.onerror = () => {
        bgImg.src = `/-Void-Trigger/level1-bg.png?v=${version}`;
      };
    } else {
      phaseBgImageRef.current = null;
    }
  }, [currentPhase]);

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
      width={window.innerWidth}
      height={window.innerHeight}
      onClick={handleCanvasClick}
      className="w-full h-full cursor-crosshair bg-slate-900"
      id="game-canvas"
      style={{ touchAction: 'none' }}
    />
  );
};

export default GameCanvas;
