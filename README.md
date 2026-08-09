# Void Trigger

**Deep Space Target Protocol** — um jogo de tiro espacial de navegador construído com React + Vite e renderizado em Canvas 2D.

Site publicado: [saimon2008rs-glitch.github.io/-Void-Trigger](https://saimon2008rs-glitch.github.io/-Void-Trigger/)

## Como jogar

- **Desktop:** setas `←` `→` para mover a nave e `Espaço` / `↑` para atirar.
- **Mobile:** botões touch de direção (canto inferior esquerdo) e tiro (canto inferior direito).
- Acerte os alvos **vermelhos (+10)**, não deixe nenhum alvo colidir com a nave — você tem **3 vidas**.
- Complete **2 minutos** de fase e destrave a próxima ao atingir **1.000 pontos** (máximo de 10 fases).
- Acertar alvos gera **moedas** e XP; suba de nível para ver a barra de progresso e o aviso de *Level Up*.

## Características

- 10 fases com dificuldade progressiva (velocidade e frequência de spawn crescem a cada fase)
- Sistema de níveis com XP crescente e notificação de Level Up
- 3 vidas com dano por colisão e 3 tipos de alvos (normal, bônus e penalidade)
- Moedas acumuladas no navegador (localStorage)
- Power-ups disponíveis no código (slow-mo, 2x XP, escudo, mega alvo, auto bot)
- Controles responsivos para desktop e mobile
- Deploy automático no GitHub Pages via GitHub Actions

## Stack

- **Frontend:** React 19 + Vite 6
- **Estilização:** Tailwind CSS 4
- **Animações:** Motion
- **Renderização do jogo:** Canvas 2D
- **Deploy:** GitHub Actions → GitHub Pages

## Desenvolvimento

```bash
npm install
npm run dev      # servidor em http://localhost:3000
npm run build    # build de produção em ./dist
npm run preview  # pré-visualizar o build
```

A base path do Vite (`base: '/-Void-Trigger/'`) está configurada para o GitHub Pages; o jogo não possui backend — todo o progresso é salvo localmente no navegador.

## Organização

| Pasta / Arquivo | Conteúdo |
| --- | --- |
| `src/App.jsx` | Menu de fases, HUD, game over e controles mobile |
| `src/components/GameCanvas.jsx` | Motor do jogo em Canvas (nave, alvos, balas, partículas) |
| `src/constants.js` | Constantes do jogo (duração, geometria, cores) |
| `public/` | Assets: nave, alvos, backgrounds e arquivos de SEO |
| `.github/workflows/deploy.yml` | CI/CD de deploy para GitHub Pages |
