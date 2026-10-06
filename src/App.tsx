import { useEffect, useState, useRef } from 'react';
import { gameEngine } from './game/engine';
import type { GameState } from './game/types';
import { Heart, Crosshair, Skull, DoorOpen, Key, AlertOctagon, LogOut, ShieldAlert, Map } from 'lucide-react';
import Waves from './Waves';
import './App.css';

function App() {
  const [state, setState] = useState<GameState>(gameEngine.state);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [showLegend, setShowLegend] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return gameEngine.subscribe(setState);
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      const { innerWidth, innerHeight } = window;
      const x = (e.clientX / innerWidth - 0.5) * 12;
      const y = (e.clientY / innerHeight - 0.5) * 12;
      setMousePos({ x, y });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (state.gameStatus !== 'PLAYING') return;
      switch(e.key) {
        case 'w': case 'W': case 'ArrowUp': e.preventDefault(); gameEngine.movePlayer(0, -1); break;
        case 's': case 'S': case 'ArrowDown': e.preventDefault(); gameEngine.movePlayer(0, 1); break;
        case 'a': case 'A': case 'ArrowLeft': e.preventDefault(); gameEngine.movePlayer(-1, 0); break;
        case 'd': case 'D': case 'ArrowRight': e.preventDefault(); gameEngine.movePlayer(1, 0); break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [state.gameStatus]);

  const parallaxStyle = { transform: `translate(${mousePos.x}px, ${mousePos.y}px)` };
  const inverseParallax = { transform: `translate(${-mousePos.x * 1.5}px, ${-mousePos.y * 1.5}px)` };

  // ─── PAGE 1: ENTRANCE ───────────────────────────────────────────────
  if (state.gameStatus === 'START') {
    return (
      <div className="entrance-screen" ref={containerRef}>
        {/* WAVES BACKGROUND — fills behind everything */}
        <Waves
          lineColor="rgba(0, 240, 255, 0.08)"
          backgroundColor="transparent"
          waveSpeedX={0.015}
          waveSpeedY={0.008}
          waveAmpX={40}
          waveAmpY={20}
          friction={0.92}
          tension={0.008}
          maxCursorMove={120}
          xGap={14}
          yGap={40}
          style={{ zIndex: 0 }}
        />
        <div className="system-info sys-top-left" style={parallaxStyle}>WORLD STATUS: STABLE<br/>PLAYER: NOT DETECTED</div>
        <div className="system-info sys-top-right" style={parallaxStyle}>AI CORE: READY</div>

        <h1 className="title-ech0" style={inverseParallax}>
          <span>E</span><span>C</span><span>H</span><span>O</span>
        </h1>
        <div className="entrance-subtitle">THE WORLD IS WATCHING HOW YOU PLAY.</div>

        {/* WHAT IS ECHO quick pitch */}
        <div className="entrance-pitch">
          Navigate a dangerous facility across 3 levels.<br/>
          <span>Gemma AI</span> watches your every move and adapts the world to stop you.
        </div>

        <button className="btn-enter" onClick={() => gameEngine.startGame()}>
          ENTER THE WORLD
        </button>

        {/* CONTROLS HINT */}
        <div className="entrance-controls">
          <span>WASD</span> or <span>ARROW KEYS</span> to move &nbsp;·&nbsp; Walk into tiles to interact
        </div>

        <div className="system-info" style={{bottom: '2rem', textAlign: 'center', opacity: 0.6}}>
          <span style={{color: 'var(--cyan)'}}>◉</span> GEMMA 4 // ONLINE — ADAPTIVE WORLD SYSTEM READY
        </div>
      </div>
    );
  }

  // ─── PAGE 2: ACTUAL GAME ─────────────────────────────────────────────
  const room = state.world.rooms[state.player.roomId];
  const gridCells = [];
  const isExitRoom = room?.isExit;

  if (room) {
    for (let y = 0; y < room.height; y++) {
      for (let x = 0; x < room.width; x++) {
        const isPlayer = state.player.x === x && state.player.y === y;
        const door = room.doors.find(d => d.x === x && d.y === y);
        const enemy = room.enemies.find(e => e.x === x && e.y === y);
        const item = room.items.find(i => i.x === x && i.y === y);
        const hazard = room.hazards.find(h => h.x === x && h.y === y);
        const isExitDoor = door?.label?.includes('EXIT');

        let cellClass = 'cell';
        let content = null;
        let tooltip = '';

        if (isPlayer) {
          cellClass += ' player';
          content = <Crosshair size={22} />;
          tooltip = 'YOU';
        } else if (enemy) {
          cellClass += ' enemy';
          content = <Skull size={18} />;
          tooltip = `${enemy.type} — HP: ${enemy.hp}. Walk into it to attack.`;
        } else if (hazard) {
          cellClass += ' hazard';
          content = <AlertOctagon size={18} />;
          tooltip = 'HAZARD — -10 HP if stepped on! Spawned by AI.';
        } else if (isExitDoor) {
          cellClass += ' door exit-door' + (door!.isLocked ? ' locked' : '');
          content = <LogOut size={18} />;
          tooltip = door!.isLocked ? 'EXIT — Locked! Find a KEY.' : 'EXIT — Walk in to escape!';
        } else if (door) {
          cellClass += ` door ${door.routeType.toLowerCase()}${door.isLocked ? ' locked' : ''}`;
          content = door.isLocked ? <ShieldAlert size={18} /> : <DoorOpen size={18} />;
          tooltip = door.isLocked ? `Door: ${door.label} — Locked. Find a KEY.` : `Door: ${door.label} — Walk through.`;
        } else if (item) {
          cellClass += ' item';
          content = item.type === 'KEY' ? <Key size={18} /> : <Heart size={18} />;
          tooltip = item.type === 'KEY' ? 'KEY — Walk on it to pick up. Used to unlock doors.' : 'HEALTH PACK — Walk on it to heal.';
        }

        gridCells.push(
          <div key={`${x}-${y}`} className={cellClass} title={tooltip}>
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

  const hpPercent = (state.player.hp / state.player.maxHp) * 100;
  const hpColor = hpPercent > 50 ? 'var(--cyan)' : hpPercent > 25 ? '#ffa502' : 'var(--crimson)';

  // Find exit door to tell player where to go
  const currentRoom = state.world.rooms[state.player.roomId];
  const exitDoor = currentRoom?.doors.find(d => d.label?.includes('EXIT'));

  return (
    <div className="app-container" ref={containerRef}>
      {/* WAVES BACKGROUND — fills behind everything on game page */}
      <Waves
        lineColor="rgba(0, 240, 255, 0.05)"
        backgroundColor="transparent"
        waveSpeedX={0.01}
        waveSpeedY={0.005}
        waveAmpX={30}
        waveAmpY={15}
        friction={0.93}
        tension={0.006}
        maxCursorMove={80}
        xGap={16}
        yGap={44}
        style={{ zIndex: 0 }}
      />
      <div className="bg-grid" style={inverseParallax}></div>

      {/* ── TOP HUD ─────────────────────────────────── */}
      <div className="hud">
        {/* HP */}
        <div className="hud-module">
          <Heart size={14} color={hpColor} />
          <span style={{color: hpColor, fontFamily: 'Space Mono', fontSize: '0.8rem'}}>
            {state.player.hp} / {state.player.maxHp}
          </span>
          <div className="hp-bar">
            <div className="hp-fill" style={{width: `${hpPercent}%`, background: hpColor}}></div>
          </div>
        </div>

        {/* OBJECTIVE */}
        <div className="hud-module hud-center">
          <div style={{color: 'var(--cyan)', fontFamily: 'Space Mono', fontSize: '0.75rem', letterSpacing: '0.15rem'}}>
            LEVEL 0{state.level}
          </div>
          <div style={{fontSize: '0.65rem', color: 'var(--text-muted)'}}>
            {exitDoor
              ? exitDoor.isLocked
                ? `🔑 Find KEY → Unlock EXIT`
                : `🚪 Reach the EXIT door`
              : `Explore rooms → Find the EXIT`}
          </div>
        </div>

        {/* GEMMA STATUS + LEGEND TOGGLE */}
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div className="hud-module" style={{color: state.gemmaStatus === 'Timeout' ? 'var(--crimson)' : 'var(--cyan)'}}>
            <div className="indicator" style={{background: state.gemmaStatus === 'Timeout' ? 'var(--crimson)' : 'var(--cyan)'}}></div>
            GEMMA // {getGemmaStatusLabel()}
          </div>
          <button className="legend-btn" onClick={() => setShowLegend(v => !v)} title="Show legend">
            <Map size={16} />
          </button>
        </div>
      </div>

      {/* INVENTORY BAR */}
      {state.player.inventory.length > 0 && (
        <div className="inventory-bar">
          {state.player.inventory.map((item, i) => (
            <div key={i} className="inv-item">
              {item === 'KEY' ? <Key size={14} /> : <Heart size={14} />} {item}
            </div>
          ))}
        </div>
      )}

      <div className="main-content">

        {/* ── GAME WORLD ───────────────────────────────── */}
        <div className="game-view">

          {/* AI INTERVENTION OVERLAY */}
          {state.lastDecision && (
            <div className="intervention-overlay" key={state.lastDecision.action + state.lastDecision.reason}>
              <div className="int-label">ECHO // WORLD RESPONSE</div>
              <div className="int-action">{state.lastDecision.action.replace(/_/g, ' ')}</div>
              <div className="int-reason">"{state.lastDecision.reason}"</div>
            </div>
          )}

          {/* LEGEND POPUP */}
          {showLegend && (
            <div className="legend-popup">
              <div className="legend-title">LEGEND</div>
              <div className="legend-item"><span className="lc player-c"><Crosshair size={14}/></span> YOU</div>
              <div className="legend-item"><span className="lc enemy-c"><Skull size={14}/></span> ENEMY — Walk into to attack</div>
              <div className="legend-item"><span className="lc door-c"><DoorOpen size={14}/></span> DOOR — Walk in to travel</div>
              <div className="legend-item"><span className="lc exit-c"><LogOut size={14}/></span> EXIT — Your objective!</div>
              <div className="legend-item"><span className="lc lock-c"><ShieldAlert size={14}/></span> LOCKED — Need a KEY</div>
              <div className="legend-item"><span className="lc key-c"><Key size={14}/></span> KEY — Walk onto to pick up</div>
              <div className="legend-item"><span className="lc hp-c"><Heart size={14}/></span> HEALTH — Walk onto to heal</div>
              <div className="legend-item"><span className="lc hazard-c"><AlertOctagon size={14}/></span> HAZARD — AI trap, avoid it!</div>
              <div className="legend-controls">WASD / ARROW KEYS to move</div>
            </div>
          )}

          {isExitRoom ? (
            <div className="exit-reached-inner">
              <div style={{fontSize: '3rem', fontFamily: 'Space Mono', color: 'var(--cyan)'}}>EXIT REACHED</div>
              <div style={{color: 'var(--text-muted)', margin: '1rem 0 2rem'}}>Proceeding to next level...</div>
            </div>
          ) : (
            <div className="visual-grid" style={{
              gridTemplateColumns: `repeat(${room?.width || 10}, minmax(20px, 48px))`,
              gridTemplateRows: `repeat(${room?.height || 10}, minmax(20px, 48px))`,
            }}>
              {gridCells}
            </div>
          )}
        </div>

        {/* ── SIDE PANEL ────────────────────────────────── */}
        <div className="side-panel">

          {/* ROOM INFO */}
          <div className="module-card">
            <div className="module-header">CURRENT ROOM</div>
            <div style={{fontFamily: 'Space Mono', fontSize: '0.75rem', color: 'var(--text-muted)', lineHeight: 2}}>
              <div>ID: <span style={{color: 'var(--text)'}}>{state.player.roomId.replace('_', ' ').toUpperCase()}</span></div>
              <div>ENEMIES: <span style={{color: room?.enemies.length ? 'var(--crimson)' : 'var(--text)'}}>{room?.enemies.length || 0}</span></div>
              <div>ITEMS: <span style={{color: 'var(--cyan)'}}>{room?.items.length || 0}</span></div>
              <div>EXITS: <span style={{color: 'var(--text)'}}>{room?.doors.length || 0}</span></div>
            </div>
          </div>

          {/* AI INTELLIGENCE */}
          <div className="module-card">
            <div className="module-header">ECHO // WORLD INTELLIGENCE</div>
            <div className="profile-stat">
              <span>AGGRESSION</span>
              <span>{Math.round(state.behavior.aggression * 100)}%</span>
            </div>
            <div className="profile-stat">
              <span>ROUTE REPETITION</span>
              <span>{state.behavior.repeatedActions}x</span>
            </div>

            {state.lastDecision && (
              <div className="last-decision-card">
                <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.4rem'}}>LAST AI ACTION</div>
                <div style={{color: 'var(--cyan)', fontWeight: 700, marginBottom: '0.3rem'}}>{state.lastDecision.action.replace(/_/g, ' ')}</div>
                <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic'}}>"{state.lastDecision.reason}"</div>
              </div>
            )}

            {state.gemmaStatus === 'Timeout' && (
              <div className="last-decision-card" style={{borderColor: 'var(--crimson)'}}>
                <div style={{color: 'var(--crimson)', fontWeight: 700}}>DECISION REJECTED</div>
                <div style={{fontSize: '0.7rem', color: 'var(--text-muted)'}}>Fallback controller active</div>
              </div>
            )}
          </div>

          {/* ECHO MEMORY */}
          <div className="module-card" style={{flex: 1}}>
            <div className="module-header">ECHO MEMORY</div>
            <div className="memory-trail">
              {state.logs.map((log, i) => (
                <div key={i} className={`mem-node ${log.includes('AI') || log.includes('GUARD') || log.includes('FALLBACK') ? 'ai' : ''} ${log.includes('HAZARD') || log.includes('died') || log.includes('hits back') ? 'alert' : ''}`}>
                  <div className="mem-dot"></div>
                  <span>{log}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>

      {/* ── END STATE OVERLAYS (INSIDE PAGE 2) ────────── */}
      {state.gameStatus === 'GAME_OVER' && (
        <div className="overlay-cinematic">
          <h1 className="win-title" style={{color: 'var(--crimson)'}}>ECHO ADAPTED FASTER.</h1>
          <div className="overlay-subtitle">Your strategy was detected. The world won.</div>
          <div className="win-stats">
            <div><span>HP REMAINING</span><span>0</span></div>
            <div><span>LEVEL REACHED</span><span>{state.level}</span></div>
          </div>
          <button className="btn-enter" onClick={() => gameEngine.startGame()}>TRY AGAIN</button>
        </div>
      )}

      {state.gameStatus === 'VICTORY' && (
        <div className="overlay-cinematic">
          <h1 className="win-title" style={{color: 'var(--cyan)'}}>YOU ESCAPED.</h1>
          <div className="overlay-subtitle">You changed your strategy. Echo changed with you.</div>
          <div className="win-stats">
            <div><span>LEVELS CLEARED</span><span>3</span></div>
            <div><span>AI DECISIONS</span><span>—</span></div>
          </div>
          <button className="btn-enter" onClick={() => gameEngine.startGame()}>PLAY AGAIN</button>
          <div className="world-remembers">THE WORLD REMEMBERS.</div>
        </div>
      )}
    </div>
  );
}

export default App;
