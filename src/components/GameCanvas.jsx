import React, { useEffect, useRef } from 'react';
import { TARGET_RADIUS, COLORS } from '../constants';

const GameCanvas = ({ 
  onScoreUpdate, 
  onDamage,
  isActive, 
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
  const enemyBulletsRef = useRef([]);
  const particlesRef = useRef([]);
  const shipRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight - 100 });
  const shipImageRef = useRef(null);
  const phaseBgImageRef = useRef(null);
  const requestRef = useRef(null);
  const lastSpawnRef = useRef(0);
  const lastFireRef = useRef(0);
  const lastBotClickRef = useRef(0);
  const lastFrameTimeRef = useRef(0);
  const damageCooldownUntilRef = useRef(0);
  const controlsRef = useRef(controls);
  const backgroundLayerRef = useRef(null);
  const gridLayerRef = useRef({ canvas: null, width: 0, height: 0, slowMo: null });

  const rebuildBackgroundLayer = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const layer = document.createElement('canvas');
    layer.width = canvas.width;
    layer.height = canvas.height;
    const layerContext = layer.getContext('2d');
    if (!layerContext) return;

    if (phaseBgImageRef.current?.complete) {
      layerContext.drawImage(phaseBgImageRef.current, 0, 0, layer.width, layer.height);
      layerContext.fillStyle = 'rgba(15, 23, 42, 0.4)';
      layerContext.fillRect(0, 0, layer.width, layer.height);
    } else {
      layerContext.fillStyle = COLORS.background;
      layerContext.fillRect(0, 0, layer.width, layer.height);
    }
    backgroundLayerRef.current = layer;
  };

  const getGridLayer = (width, height, slowMo) => {
    const cached = gridLayerRef.current;
    if (cached.canvas && cached.width === width && cached.height === height && cached.slowMo === slowMo) {
      return cached.canvas;
    }

    const layer = document.createElement('canvas');
    layer.width = width;
    layer.height = height;
    const layerContext = layer.getContext('2d');
    if (!layerContext) return null;
    layerContext.strokeStyle = slowMo ? 'rgba(56, 189, 248, 0.1)' : 'rgba(255, 255, 255, 0.05)';
    layerContext.lineWidth = 1;
    for (let x = 0; x < width; x += 50) {
      layerContext.beginPath();
      layerContext.moveTo(x, 0);
      layerContext.lineTo(x, height);
      layerContext.stroke();
    }
    for (let y = 0; y < height; y += 50) {
      layerContext.beginPath();
      layerContext.moveTo(0, y);
      layerContext.lineTo(width, y);
      layerContext.stroke();
    }
    gridLayerRef.current = { canvas: layer, width, height, slowMo };
    return layer;
  };
  const gameStateRef = useRef({ isActive, isSlowMo, isDoublePoints, isShield, isMega, isBot, currentPhase, onScoreUpdate, onDamage });

  useEffect(() => {
    controlsRef.current = controls;
  }, [controls]);

  useEffect(() => {
    gameStateRef.current = { isActive, isSlowMo, isDoublePoints, isShield, isMega, isBot, currentPhase, onScoreUpdate, onDamage };
  }, [isActive, isSlowMo, isDoublePoints, isShield, isMega, isBot, currentPhase, onScoreUpdate, onDamage]);

  const spawnTarget = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const side = Math.floor(Math.random() * 3); // Apenas 3 lados: Cima, Direita, Esquerda
    let x, y, vx, vy;
    const speed = 2 + currentPhase * 1.2;
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

    const randomId = globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const newTarget = {
      id: randomId,
      x, y, vx, vy, radius: currentRadius, points, type, color,
      maxHealth: type === 'bonus' ? 3 : 1,
      health: type === 'bonus' ? 3 : 1,
    };

    targetsRef.current.push(newTarget);
  };

  const createExplosion = (x, y, color) => {
    const particleCount = Math.min(10, 200 - particlesRef.current.length);
    for (let i = 0; i < particleCount; i++) {
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

  const fireEnemyRetaliation = (target) => {
    const angleToShip = Math.atan2(shipRef.current.y - target.y, shipRef.current.x - target.x);
    const spread = Math.PI / 8;
    for (let shot = -2; shot <= 2; shot++) {
      const angle = angleToShip + shot * spread;
      enemyBulletsRef.current.push({
        x: target.x,
        y: target.y,
        vx: Math.cos(angle) * 5,
        vy: Math.sin(angle) * 5,
      });
      if (enemyBulletsRef.current.length > 120) enemyBulletsRef.current.shift();
    }
  };

  const update = (time) => {
    const gameState = gameStateRef.current;
    if (!gameState.isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) return;
    const frameScale = lastFrameTimeRef.current
      ? Math.min((time - lastFrameTimeRef.current) / (1000 / 60), 2)
      : 1;
    lastFrameTimeRef.current = time;
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Spawn logic
    // Spawn fica mais rápido a cada fase
    if (time - lastSpawnRef.current > Math.max(150, 1000 - currentPhase * 150)) {
      spawnTarget();
      lastSpawnRef.current = time;
    }

    // Bot logic
    if (gameState.isBot && time - lastBotClickRef.current > 300) {
      if (targetsRef.current.length > 0) {
        const target = targetsRef.current[0];
        if (target.type !== 'penalty') {
          target.health -= 1;
          createExplosion(target.x, target.y, target.color);
          if (target.health <= 0) {
            const finalPoints = gameState.isDoublePoints ? target.points * 2 : target.points;
            gameState.onScoreUpdate(finalPoints);
            if (target.type === 'normal') fireEnemyRetaliation(target);
            targetsRef.current.shift();
          }
          lastBotClickRef.current = time;
        }
      }
    }

    // Ship movement
    if (controlsRef.current.left) shipRef.current.x = Math.max(30, shipRef.current.x - 12 * frameScale);
    if (controlsRef.current.right) shipRef.current.x = Math.min(width - 30, shipRef.current.x + 12 * frameScale);

    // Firing logic
    if (controlsRef.current.fire && time - lastFireRef.current > 200) {
      bulletsRef.current.push({
        x: shipRef.current.x,
        y: shipRef.current.y - 20,
        vy: -10
      });
      lastFireRef.current = time;
    }

    // Camadas estáticas são desenhadas uma vez e reutilizadas a cada frame.
    if (!backgroundLayerRef.current || backgroundLayerRef.current.width !== canvas.width || backgroundLayerRef.current.height !== canvas.height) {
      rebuildBackgroundLayer();
    }
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (backgroundLayerRef.current) {
      ctx.drawImage(backgroundLayerRef.current, 0, 0);
    }

    // Slow mo effect overlay
    if (gameState.isSlowMo) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.1)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Shield effect overlay
    if (gameState.isShield) {
      ctx.strokeStyle = 'rgba(16, 185, 129, 0.3)';
      ctx.lineWidth = 10;
      ctx.strokeRect(0, 0, canvas.width, canvas.height);
    }

    const gridLayer = getGridLayer(canvas.width, canvas.height, gameState.isSlowMo);
    if (gridLayer) ctx.drawImage(gridLayer, 0, 0);

    // Update enemy bullets
    enemyBulletsRef.current.forEach(bullet => {
      bullet.x += bullet.vx * frameScale;
      bullet.y += bullet.vy * frameScale;
      ctx.save();
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ef4444';
      ctx.fillStyle = '#fca5a5';
      ctx.beginPath();
      ctx.arc(bullet.x, bullet.y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const distanceToShip = Math.sqrt((bullet.x - shipRef.current.x) ** 2 + (bullet.y - shipRef.current.y) ** 2);
      if (distanceToShip < 50 + 6) {
        if (!gameState.isShield && time >= damageCooldownUntilRef.current) {
          gameState.onDamage();
          damageCooldownUntilRef.current = time + 1000;
        }
        createExplosion(bullet.x, bullet.y, '#ef4444');
        bullet.toRemove = true;
      }
    });
    enemyBulletsRef.current = enemyBulletsRef.current.filter(bullet => (
      !bullet.toRemove && bullet.x > -30 && bullet.x < width + 30 && bullet.y > -30 && bullet.y < height + 30
    ));

    // Update player bullets
    bulletsRef.current.forEach(bullet => {
      bullet.y += bullet.vy * frameScale;
      ctx.fillStyle = '#fff';
      ctx.fillRect(bullet.x - 2, bullet.y - 10, 4, 20);
      
      // Check collision with targets (cada bala pode acertar apenas um alvo)
      let bulletHit = false;
      targetsRef.current = targetsRef.current.filter(target => {
        if (bulletHit) return true;
        const dist = Math.sqrt((bullet.x - target.x) ** 2 + (bullet.y - target.y) ** 2);
        if (dist < target.radius + 10) {
          target.health -= 1;
          createExplosion(target.x, target.y, target.color);
          bullet.toRemove = true;
          bulletHit = true;

          if (target.health <= 0) {
            const finalPoints = gameState.isDoublePoints ? target.points * 2 : target.points;
            gameState.onScoreUpdate(finalPoints);
            if (target.type === 'normal') fireEnemyRetaliation(target);
            return false;
          }
          return true;
        }
        return true;
      });
    });
    bulletsRef.current = bulletsRef.current.filter(b => !b.toRemove && b.y > -50);

    // Update targets
    targetsRef.current.forEach(target => {
      const speedMult = gameState.isSlowMo ? 0.3 : 1;
      target.x += target.vx * speedMult * frameScale;
      target.y += target.vy * speedMult * frameScale;

      // Check collision with ship
      const shipCollisionRadius = 50;
      const distToShip = Math.sqrt((target.x - shipRef.current.x) ** 2 + (target.y - shipRef.current.y) ** 2);
      if (distToShip < target.radius + shipCollisionRadius) {
        const canTakeDamage = time >= damageCooldownUntilRef.current;
        if (!gameState.isShield && canTakeDamage) {
          gameState.onDamage();
          damageCooldownUntilRef.current = time + 1000;
        }
        createExplosion(target.x, target.y, target.color);
        target.toRemove = true;
      }

      // Draw target
      ctx.beginPath();
      ctx.arc(target.x, target.y, target.radius, 0, Math.PI * 2);
      ctx.fillStyle = target.color;
      ctx.fill();

      // Rings
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Barra de vida exclusiva dos inimigos verdes (bonus)
      if (target.type === 'bonus') {
        const barWidth = target.radius * 2;
        const barHeight = 5;
        const barX = target.x - barWidth / 2;
        const barY = target.y + target.radius + 8;
        ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = '#22c55e';
        ctx.fillRect(barX, barY, barWidth * (target.health / target.maxHealth), barHeight);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
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
      p.x += p.vx * frameScale;
      p.y += p.vy * frameScale;
      p.life -= 0.02 * frameScale;

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

    // Carregar Fundo
    if (currentPhase === 1) {
      const bgImg = new Image();
      bgImg.src = `level1-bg.png?v=${version}`;
      bgImg.onload = () => {
        phaseBgImageRef.current = bgImg;
        backgroundLayerRef.current = null;
      };
      bgImg.onerror = () => {
        bgImg.src = `/-Void-Trigger/level1-bg.png?v=${version}`;
      };
    } else {
      phaseBgImageRef.current = null;
      backgroundLayerRef.current = null;
    }
  }, [currentPhase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const resizeCanvas = () => {
      if (!canvas) return;
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      backgroundLayerRef.current = null;
      gridLayerRef.current = { canvas: null, width: 0, height: 0, slowMo: null };
      shipRef.current.x = Math.min(Math.max(shipRef.current.x, 30), window.innerWidth - 30);
      shipRef.current.y = window.innerHeight - 100;
    };
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    if (isActive) {
      requestRef.current = requestAnimationFrame(update);
    } else {
      lastFrameTimeRef.current = 0;
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    }
    return () => {
      window.removeEventListener('resize', resizeCanvas);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [isActive, currentPhase]);

  return (
    <canvas
      ref={canvasRef}
      width={window.innerWidth}
      height={window.innerHeight}
      className="w-full h-full cursor-crosshair bg-slate-900"
      id="game-canvas"
      style={{ touchAction: 'none' }}
    />
  );
};

export default GameCanvas;
