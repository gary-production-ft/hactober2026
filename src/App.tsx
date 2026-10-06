import { useEffect, useState, useRef } from 'react';
import { gameEngine } from './game/engine';
import type { GameState } from './game/types';
import { Heart, Crosshair, Skull, DoorOpen, Key, AlertOctagon, LogOut, ShieldAlert } from 'lucide-react';
import Waves from './Waves';
import SkullChain from './SkullChain';
import './App.css';

function App() {
  const [state, setState] = useState<GameState>(gameEngine.state);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [cellSize, setCellSize] = useState({ w: 36, h: 36 });
  const containerRef = useRef<HTMLDivElement>(null);
  const memoryEndRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (memoryEndRef.current) {
      memoryEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [state.liveMemory.length]);

  // Measure grid cell size so skull chain knows pixel positions
  useEffect(() => {
    const measure = () => {
      if (!gridRef.current) return;
      const cell = gridRef.current.querySelector('.cell');
      if (cell) {
        const r = cell.getBoundingClientRect();
        setCellSize({ w: r.width, h: r.height });
      }
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [state.player.roomId]);

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
      // Prevent browser scrolling for movement keys
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
        {/* WAVES BACKGROUND */}
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
        <div className="system-info sys-top-left" style={parallaxStyle}>SYSTEM INSTANCE // 04<br/>I HAVE BEEN WATCHING.</div>
        <div className="system-info sys-top-right" style={parallaxStyle}>PLAYER PATTERN: UNKNOWN<br/>[ INITIALIZING OBSERVATION ]</div>

        <h1 className="title-ech0" style={inverseParallax}>
          <span>E</span><span>C</span><span>H</span><span>O</span>
        </h1>
        
        <div className="entrance-pitch">
          The environment reacts to your choices.<br/>
          <span>ECHO</span> learns your behavior and counters your strategy.
        </div>

        <button className="btn-enter" onClick={() => gameEngine.startGame()}>
          [ ENTER THE FACILITY ]
        </button>

        <div className="entrance-controls">
          <span>WASD</span> / <span>ARROWS</span> to move
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
        const trailIndex = state.playerTrail.findIndex(p => p.x === x && p.y === y);
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
        } else if (trailIndex !== -1) {
          cellClass += ' trail';
          const opacity = 0.1 + (trailIndex / state.playerTrail.length) * 0.3;
          content = <div style={{width: 6, height: 6, borderRadius: '50%', background: `rgba(255,255,255,${opacity})`}}></div>;
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
    return state.gemmaStatus;
  };
  
  const renderBar = (val: number) => {
    const filled = Math.round(val * 10);
    return '█'.repeat(filled) + '░'.repeat(10 - filled);
  };

  const hpPercent = (state.player.hp / state.player.maxHp) * 100;
  const hpColor = hpPercent > 50 ? 'var(--cyan)' : hpPercent > 25 ? '#ffa502' : 'var(--crimson)';
  const isHunting = state.gemmaStatus === 'HUNTING';

  // Skull chain parameters based on awareness
  const chainLength = Math.min(8, state.awarenessLevel * 2);
  const followSpeed = 0.04 + state.awarenessLevel * 0.015 + (state.predictability || 0) * 0.05;

  // Vignette intensity: ramps with predictability and hunting
  const vignetteIntensity = Math.min(1, (state.predictability || 0) * 0.8 + (isHunting ? 0.4 : 0));

  // Find exit door to tell player where to go
  const currentRoom = state.world.rooms[state.player.roomId];
  const exitDoor = currentRoom?.doors.find(d => d.label?.includes('EXIT'));

  return (
    <div className="app-container" ref={containerRef}>
      {/* Hunt vignette overlay — pulses red at screen edges */}
      {vignetteIntensity > 0.1 && (
        <div className="hunt-vignette" style={{ opacity: vignetteIntensity }} />
      )}
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

        {/* GEMMA STATUS */}
        <div style={{display: 'flex', alignItems: 'center', gap: '1rem'}}>
          <div className={`hud-module status-${state.gemmaStatus.toLowerCase()}`}>
            <div className="indicator"></div>
            ECHO ● {getGemmaStatusLabel()}
          </div>
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


          {isExitRoom ? (
            <div className="exit-reached-inner">
              <div style={{fontSize: '3rem', fontFamily: 'Space Mono', color: 'var(--cyan)'}}>EXIT REACHED</div>
              <div style={{color: 'var(--text-muted)', margin: '1rem 0 2rem'}}>Proceeding to next level...</div>
            </div>
          ) : (
            <div className="visual-grid" ref={gridRef} style={{
              gridTemplateColumns: `repeat(${room?.width || 10}, minmax(20px, 48px))`,
              gridTemplateRows: `repeat(${room?.height || 10}, minmax(20px, 48px))`,
            }}>
              {gridCells}
            </div>
          )}

          {/* TOUCH CONTROLS */}
          <div className="touch-controls">
            <div className="dpad">
              <button className="dpad-btn up" onClick={() => gameEngine.movePlayer(0, -1)}>↑</button>
              <div className="dpad-row">
                <button className="dpad-btn left" onClick={() => gameEngine.movePlayer(-1, 0)}>←</button>
                <div className="dpad-center">●</div>
                <button className="dpad-btn right" onClick={() => gameEngine.movePlayer(1, 0)}>→</button>
              </div>
              <button className="dpad-btn down" onClick={() => gameEngine.movePlayer(0, 1)}>↓</button>
            </div>
          </div>
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
            <div className="module-header">ECHO INSIGHT</div>
            
            <div className="profile-stat">
              <div style={{marginBottom: '0.2rem'}}>AGGRESSION</div>
              <div><span style={{color: 'var(--cyan)'}}>{renderBar(state.behavior.aggression)}</span> {Math.round(state.behavior.aggression * 100)}%</div>
            </div>
            <div className="profile-stat">
              <div style={{marginBottom: '0.2rem'}}>RISK TAKING</div>
              <div><span style={{color: 'var(--cyan)'}}>{renderBar(state.behavior.riskTaking)}</span> {Math.round(state.behavior.riskTaking * 100)}%</div>
            </div>
            <div className="profile-stat">
              <div style={{marginBottom: '0.2rem'}}>EXPLORATION</div>
              <div><span style={{color: 'var(--cyan)'}}>{renderBar(state.behavior.exploration)}</span> {Math.round(state.behavior.exploration * 100)}%</div>
            </div>

            <div style={{marginTop: '1.5rem', marginBottom: '0.5rem', fontFamily: 'Space Mono', fontSize: '0.7rem', color: 'var(--text-muted)'}}>
              AWARENESS LEVEL: 0{state.awarenessLevel} &nbsp;|&nbsp; SKULLS: {chainLength}
            </div>

            <div className="profile-stat" style={{marginTop: '0.5rem'}}>
              <div style={{marginBottom: '0.2rem', color: state.predictability > 0.6 ? 'var(--crimson)' : 'var(--text-muted)'}}>
                PREDICTABILITY {state.predictability > 0.6 ? '⚠' : ''}
              </div>
              <div>
                <span style={{color: state.predictability > 0.5 ? 'var(--crimson)' : 'var(--cyan)'}}>
                  {renderBar(state.predictability || 0)}
                </span> {Math.round((state.predictability || 0) * 100)}%
              </div>
            </div>
            
            {state.lastDecision && (
              <div className="last-decision-card">
                <div style={{fontSize: '0.65rem', color: 'var(--text-muted)', marginBottom: '0.4rem'}}>LAST AI ACTION</div>
                <div style={{color: 'var(--cyan)', fontWeight: 700, marginBottom: '0.3rem'}}>{state.lastDecision.action.replace(/_/g, ' ')}</div>
                <div style={{fontSize: '0.7rem', color: 'var(--text-muted)', fontStyle: 'italic'}}>"{state.lastDecision.reason}"</div>
              </div>
            )}
          </div>

          {/* ECHO MEMORY */}
          <div className="module-card" style={{flex: 1}}>
            <div className="module-header">ECHO MEMORY</div>
            <div className="memory-trail">
              {state.liveMemory.length === 0 && <div style={{fontSize: '0.8rem', color: 'var(--text-muted)'}}>Analyzing player patterns...</div>}
              {state.liveMemory.map((mem) => {
                const isDanger = mem.message.includes('aggressive') || mem.message.includes('reckless');
                
                let icon = '·';
                if (mem.type === 'MOVE') icon = '→';
                if (mem.type === 'COMBAT') icon = '⚔';
                if (mem.type === 'PICKUP') icon = '◆';
                if (mem.type === 'ROUTE') icon = '↳';
                if (mem.type === 'OBSERVATION') icon = '◉';
                if (mem.type === 'INTERVENTION') icon = '⚠';

                return (
                  <div key={mem.id} className={`mem-node ai ${isDanger || mem.type === 'INTERVENTION' ? 'alert-anim' : ''}`}>
                    <div className="mem-icon">{icon}</div>
                    <span>
                      {isDanger || mem.type === 'INTERVENTION' ? <Skull size={12} style={{display: 'inline', verticalAlign: 'middle', marginRight: '4px', color: 'var(--crimson)'}} /> : null}
                      {mem.message}
                    </span>
                  </div>
                );
              })}
              <div ref={memoryEndRef} />
            </div>
          </div>

        </div>
      </div>

      {/* ── END STATE OVERLAYS ────────── */}
      {state.gameStatus === 'GAME_OVER' && (
        <div className="overlay-cinematic">
          <h1 className="win-title" style={{color: 'var(--crimson)', fontSize: '4rem'}}>SESSION TERMINATED</h1>
          <div className="overlay-subtitle">ECHO SUCCESSFULLY PREDICTED YOU.</div>
          
          <div className="win-stats">
            <div><span>ROUTE PREFERENCE</span><span>{state.behavior.preferredRoute.toUpperCase() || 'UNKNOWN'}</span></div>
            <div><span>AGGRESSION</span><span>{Math.round(state.behavior.aggression * 100)}%</span></div>
            <div><span>RISK TAKING</span><span>{Math.round(state.behavior.riskTaking * 100)}%</span></div>
          </div>

          <div style={{color: 'var(--cyan)', fontStyle: 'italic', marginBottom: '2rem'}}>
            "You are becoming predictable."
          </div>

          <button className="btn-enter" onClick={() => gameEngine.startGame()}>[ PROVE IT WRONG ]</button>
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

      {/* SKULL CHAIN — Globally overlaid across the entire webpage */}
      {!isExitRoom && gridRef.current && (
        <SkullChain
          playerX={state.player.x}
          playerY={state.player.y}
          cellW={cellSize.w}
          cellH={cellSize.h}
          chainLength={chainLength}
          followSpeed={followSpeed}
          isHunting={isHunting}
          gridRef={gridRef}
        />
      )}
    </div>
  );
}

export default App;
