import { useEffect, useState, useRef } from 'react';
import { gameEngine } from './game/engine';
import type { GameState } from './game/types';
import { Heart, Crosshair, Skull, DoorOpen, Key, AlertOctagon } from 'lucide-react';
import './App.css';

function App() {
  const [state, setState] = useState<GameState>(gameEngine.state);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return gameEngine.subscribe(setState);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 20; // max 20px movement
      const y = (e.clientY / innerHeight - 0.5) * 20;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.gameStatus !== 'PLAYING') return;
      switch(e.key) {
        case 'w': case 'ArrowUp': gameEngine.movePlayer(0, -1); break;
        case 's': case 'ArrowDown': gameEngine.movePlayer(0, 1); break;
        case 'a': case 'ArrowLeft': gameEngine.movePlayer(-1, 0); break;
        case 'd': case 'ArrowRight': gameEngine.movePlayer(1, 0); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.gameStatus]);

  // Parallax transform
  const parallaxStyle = { transform: `translate(${mousePos.x}px, ${mousePos.y}px)` };
  const inverseParallax = { transform: `translate(${-mousePos.x * 2}px, ${-mousePos.y * 2}px)` };

  // PAGE 1 - ENTRANCE
  if (state.gameStatus === 'START') {
    return (
      <div className="entrance-screen" ref={containerRef}>
        <div className="bg-grid" style={inverseParallax}></div>
        <div className="system-info sys-top-left" style={parallaxStyle}>WORLD STATUS<br/>STABLE</div>
        <div className="system-info sys-top-right" style={parallaxStyle}>AI CORE<br/>READY</div>
        <div className="system-info sys-bottom-left" style={parallaxStyle}>PLAYER<br/>UNKNOWN</div>
        
        <h1 className="title-ech0" style={inverseParallax}>
          <span>E</span><span>C</span><span>H</span><span>O</span>
        </h1>
        <div className="entrance-subtitle">THE WORLD IS WATCHING HOW YOU PLAY.</div>
        
        <button className="btn-enter" onClick={() => gameEngine.startGame()}>
          ENTER THE WORLD
        </button>

        <div className="system-info" style={{bottom: '3rem', textAlign: 'center'}}>
          <span style={{color: 'var(--cyan)'}}>◉</span> GEMMA 4 // ONLINE<br/>WORLD INTELLIGENCE READY
        </div>
      </div>
    );
  }

  // PAGE 2 - ACTUAL GAME
  const room = state.world.rooms[state.player.roomId];
  const gridCells = [];
  
  if (room) {
    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        let isPlayer = state.player.x === x && state.player.y === y;
        let door = room.doors.find(d => d.x === x && d.y === y);
        let enemy = room.enemies.find(e => e.x === x && e.y === y);
        let item = room.items.find(i => i.x === x && i.y === y);
        let hazard = room.hazards.find(h => h.x === x && h.y === y);
        
        let cellClass = "cell";
        let content = null;
        
        if (isPlayer) { cellClass += " player"; content = <Crosshair size={24} />; }
        else if (enemy) { cellClass += " enemy"; content = <Skull size={20} />; }
        else if (hazard) { cellClass += " hazard"; content = <AlertOctagon size={20} />; }
        else if (door) { cellClass += ` door ${door.routeType.toLowerCase()} ${door.isLocked ? 'locked' : ''}`; content = <DoorOpen size={20} />; }
        else if (item) { cellClass += " item"; content = item.type === 'KEY' ? <Key size={20} /> : <Heart size={20} />; }

        gridCells.push(
          <div key={`${x}-${y}`} className={cellClass}>
            {content}
          </div>
        );
      }
    }
  }

  const getGemmaStatusLabel = () => {
    if (state.gemmaStatus === 'Processing') return 'ANALYZING';
    if (state.gemmaStatus === 'Timeout') return 'FALLBACK';
    if (state.lastDecision) return 'ADAPTED';
    return 'OBSERVING';
  };

  return (
    <div className="app-container" ref={containerRef}>
      <div className="bg-grid" style={inverseParallax}></div>
      
      {/* HUD */}
      <div className="hud">
        <div className="hud-module">
          <Heart size={16} color="var(--crimson)" /> {state.player.hp} / {state.player.maxHp}
        </div>
        <div className="hud-module hud-center">
          <div><strong>LEVEL 0{state.level}</strong></div>
          <div style={{fontSize: '0.6rem', color: 'var(--text-muted)'}}>FIND THE EXIT</div>
        </div>
        <div className="hud-module" style={{color: 'var(--cyan)'}}>
          <div className="indicator"></div> GEMMA // {getGemmaStatusLabel()}
        </div>
      </div>

      <div className="main-content">
        {/* GAME WORLD */}
        <div className="game-view">
          
          {/* AI INTERVENTION TEMPORARY OVERLAY (INSIDE PAGE 2) */}
          {state.lastDecision && (
            <div className="intervention-overlay" key={state.lastDecision.action + Date.now()}>
              <div className="int-title">WORLD RESPONSE</div>
              <div className="int-action">{state.lastDecision.action.replace('_', ' ')}</div>
              <div className="int-reason">"{state.lastDecision.reason}"</div>
            </div>
          )}

          <div className="visual-grid" style={{
            gridTemplateColumns: `repeat(${room?.width || 10}, minmax(20px, 50px))`,
            gridTemplateRows: `repeat(${room?.height || 10}, minmax(20px, 50px))`,
            ...inverseParallax
          }}>
            {gridCells}
          </div>
        </div>

        {/* SIDE PANELS */}
        <div className="side-panel">
          
          <div className="module-card">
            <div className="module-header">ECHO // WORLD INTELLIGENCE</div>
            
            <div className="profile-stat">
              <span>AGGRESSION</span>
              <span>{Math.round(state.behavior.aggression * 100)}%</span>
            </div>
            <div className="profile-stat">
              <span>ROUTE REPETITION</span>
              <span>{state.behavior.repeatedActions}</span>
            </div>
            <div className="profile-stat">
              <span>EXPLORATION</span>
              <span>34%</span>
            </div>
          </div>

          {state.lastDecision && (
            <div className="module-card pattern-card active" key={`dec-${Date.now()}`}>
              <div className="module-header" style={{color: 'var(--cyan)'}}>PATTERN DETECTED</div>
              <div className="pattern-action">{state.lastDecision.action.replace('_', ' ')}</div>
              <div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>TARGET: {state.lastDecision.target || 'N/A'}</div>
              <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '1rem'}}>
                ✓ SCHEMA VALID<br/>
                ✓ WORLD UPDATED<br/>
                LATENCY: ~850ms
              </div>
            </div>
          )}
          
          {state.gemmaStatus === 'Timeout' && (
            <div className="module-card pattern-card active" style={{borderColor: 'var(--crimson)'}}>
              <div className="module-header" style={{color: 'var(--crimson)'}}>GEMMA // TIMEOUT</div>
              <div className="pattern-action" style={{color: 'var(--crimson)'}}>DECISION REJECTED</div>
              <div style={{fontSize: '0.75rem', color: 'var(--text-muted)'}}>FALLBACK ACTIVE</div>
            </div>
          )}

          <div className="module-card" style={{flex: 1, display: 'flex', flexDirection: 'column'}}>
            <div className="module-header">ECHO MEMORY</div>
            <div className="memory-trail">
              {state.logs.map((log, i) => (
                <div key={i} className={`mem-node ${log.includes('AI') ? 'ai' : ''} ${log.includes('GUARD') || log.includes('died') ? 'alert' : ''}`}>
                  <div className="mem-dot"></div>
                  <span className="mem-text">{log.toUpperCase()}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* OVERLAYS FOR END STATES (STILL ON PAGE 2) */}
      {state.gameStatus === 'GAME_OVER' && (
        <div className="overlay-cinematic">
          <h1 className="win-title" style={{color: 'var(--crimson)', textShadow: '0 0 30px rgba(255,0,60,0.5)'}}>ECHO ADAPTED FASTER.</h1>
          <div className="overlay-subtitle">Your strategy was detected.</div>
          <button className="btn-enter" onClick={() => gameEngine.startGame()}>TRY AGAIN</button>
        </div>
      )}

      {state.gameStatus === 'VICTORY' && (
        <div className="overlay-cinematic">
          <h1 className="win-title" style={{color: 'var(--cyan)'}}>EXIT REACHED</h1>
          <div className="overlay-subtitle">YOU CHANGED YOUR STRATEGY. ECHO CHANGED WITH YOU.</div>
          
          <div style={{display: 'flex', gap: '2rem', marginBottom: '3rem', fontFamily: 'Space Mono', fontSize: '0.9rem', color: 'var(--text-muted)'}}>
            <div>WORLD ADAPTATIONS: <strong style={{color: '#fff'}}>04</strong></div>
            <div>AI DECISIONS: <strong style={{color: '#fff'}}>07</strong></div>
          </div>
          
          <button className="btn-enter" onClick={() => gameEngine.startGame()}>PLAY AGAIN</button>
          
          <div style={{marginTop: '3rem', fontFamily: 'Space Mono', fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.2rem'}}>
            THE WORLD REMEMBERS.
          </div>
        </div>
      )}

    </div>
  );
}

export default App;
