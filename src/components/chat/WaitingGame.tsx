"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const GRID = 20; // grid cells
const CELL = 18; // px per cell
const TICK = 110; // ms per frame

type Dir = [number, number];
const UP: Dir = [0, -1];
const DOWN: Dir = [0, 1];
const LEFT: Dir = [-1, 0];
const RIGHT: Dir = [1, 0];

export function WaitingGame({ onClose }: { onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }],
    dir: RIGHT as Dir,
    nextDir: RIGHT as Dir,
    food: { x: 15, y: 10 },
    running: true,
    score: 0,
  });

  const spawnFood = useCallback((snake: { x: number; y: number }[]) => {
    let pos: { x: number; y: number };
    do {
      pos = { x: Math.floor(Math.random() * GRID), y: Math.floor(Math.random() * GRID) };
    } while (snake.some(s => s.x === pos.x && s.y === pos.y));
    return pos;
  }, []);

  const resetGame = useCallback(() => {
    const s = stateRef.current;
    s.snake = [{ x: 10, y: 10 }];
    s.dir = RIGHT;
    s.nextDir = RIGHT;
    s.food = { x: 15, y: 10 };
    s.running = true;
    s.score = 0;
    setScore(0);
    setGameOver(false);
  }, []);

  // Game loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const draw = () => {
      const s = stateRef.current;
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, GRID * CELL, GRID * CELL);

      // Grid dots
      ctx.fillStyle = "rgba(255,255,255,0.04)";
      for (let x = 0; x < GRID; x++) {
        for (let y = 0; y < GRID; y++) {
          ctx.fillRect(x * CELL + CELL / 2, y * CELL + CELL / 2, 1, 1);
        }
      }

      // Food
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(s.food.x * CELL + CELL / 2, s.food.y * CELL + CELL / 2, CELL / 2 - 1, 0, Math.PI * 2);
      ctx.fill();

      // Snake
      s.snake.forEach((seg, i) => {
        const brightness = 1 - (i / s.snake.length) * 0.5;
        ctx.fillStyle = `rgba(99, 102, 241, ${brightness})`;
        ctx.beginPath();
        ctx.roundRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2, 3);
        ctx.fill();
      });
    };

    const tick = () => {
      const s = stateRef.current;
      if (!s.running) return;

      s.dir = s.nextDir;
      const head = { x: s.snake[0].x + s.dir[0], y: s.snake[0].y + s.dir[1] };

      // Wall collision — wrap around
      head.x = (head.x + GRID) % GRID;
      head.y = (head.y + GRID) % GRID;

      // Self collision
      if (s.snake.some(seg => seg.x === head.x && seg.y === head.y)) {
        s.running = false;
        setGameOver(true);
        setBest(prev => Math.max(prev, s.score));
        draw();
        return;
      }

      s.snake.unshift(head);

      // Eat food
      if (head.x === s.food.x && head.y === s.food.y) {
        s.score++;
        setScore(s.score);
        s.food = spawnFood(s.snake);
      } else {
        s.snake.pop();
      }

      draw();
    };

    draw();
    const interval = setInterval(tick, TICK);
    return () => clearInterval(interval);
  }, [spawnFood]);

  // Keyboard controls
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const s = stateRef.current;
      if (gameOver) {
        if (e.key === " " || e.key === "Enter") resetGame();
        return;
      }
      const keyMap: Record<string, Dir> = {
        ArrowUp: UP, ArrowDown: DOWN, ArrowLeft: LEFT, ArrowRight: RIGHT,
        w: UP, s: DOWN, a: LEFT, d: RIGHT,
      };
      const newDir = keyMap[e.key];
      if (newDir) {
        e.preventDefault();
        // Prevent 180° turns
        if (newDir[0] !== -s.dir[0] || newDir[1] !== -s.dir[1]) {
          s.nextDir = newDir;
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [gameOver, resetGame]);

  // Touch controls
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      touchRef.current = { x: t.clientX, y: t.clientY };
    };
    const onEnd = (e: TouchEvent) => {
      if (!touchRef.current) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - touchRef.current.x;
      const dy = t.clientY - touchRef.current.y;
      touchRef.current = null;
      if (Math.abs(dx) < 15 && Math.abs(dy) < 15) {
        if (gameOver) resetGame();
        return;
      }
      const s = stateRef.current;
      let newDir: Dir;
      if (Math.abs(dx) > Math.abs(dy)) {
        newDir = dx > 0 ? RIGHT : LEFT;
      } else {
        newDir = dy > 0 ? DOWN : UP;
      }
      if (newDir[0] !== -s.dir[0] || newDir[1] !== -s.dir[1]) {
        s.nextDir = newDir;
      }
    };
    canvas.addEventListener("touchstart", onStart, { passive: true });
    canvas.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      canvas.removeEventListener("touchstart", onStart);
      canvas.removeEventListener("touchend", onEnd);
    };
  }, [gameOver, resetGame]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.5)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div
        style={{
          background: "rgba(30,30,30,0.85)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: 20,
          boxShadow: "0 16px 64px rgba(0,0,0,0.4)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div>
            <span style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>
              🐍 Snake {score > 0 && `· ${score}`}
              {best > 0 && <span style={{ color: "rgba(255,255,255,0.5)", fontWeight: 400 }}> · best {best}</span>}
            </span>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", marginTop: 1 }}>Enjoy a game while we get your answer</div>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", padding: 4 }}
            aria-label="Close game"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

      {/* Canvas */}
      <div style={{ position: "relative" }}>
        <canvas
          ref={canvasRef}
          width={GRID * CELL}
          height={GRID * CELL}
          style={{ display: "block" }}
        />
        {gameOver && (
          <div
            onClick={resetGame}
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              background: "rgba(0,0,0,0.6)",
              cursor: "pointer",
            }}
          >
            <span style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>Game Over</span>
            <span style={{ fontSize: 12, color: "rgba(255,255,255,0.6)", marginTop: 4 }}>Tap to play again</span>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
