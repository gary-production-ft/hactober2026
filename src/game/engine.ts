import type { GameState, Room, GemmaDecision } from './types';
import { gemmaProvider } from './GemmaProvider';

// Deterministic ECHO observation phrases based on pattern
const ECHO_OBSERVATIONS = [
  { trigger: (h: string[]) => h.filter(a => a === 'MOVE_EAST').length >= 4, msg: 'You keep going right.' },
  { trigger: (h: string[]) => h.filter(a => a === 'MOVE_WEST').length >= 4, msg: 'You keep going left.' },
  { trigger: (h: string[]) => h.filter(a => a === 'MOVE_NORTH').length >= 4, msg: 'You keep going north.' },
  { trigger: (h: string[]) => h.filter(a => a === 'MOVE_SOUTH').length >= 4, msg: 'You keep going south.' },
  { trigger: (h: string[]) => h.slice(-6).every(a => a === h[h.length-1]), msg: 'Interesting. You have not changed direction.' },
  { trigger: (h: string[]) => { const l = h.slice(-10); return l.filter(a => a === 'ATTACK_ENEMY').length >= 3; }, msg: 'You are highly aggressive.' },
  { trigger: (h: string[]) => { const l = h.slice(-10); return l.filter(a => a.startsWith('PICKUP')).length >= 2; }, msg: 'You scavenge everything you find.' },
];

const INITIAL_ROOMS: Record<string, Room> = {
  room_1: {
    id: 'room_1',
    width: 10,
    height: 10,
    doors: [
      { id: 'd1', x: 5, y: 0, targetRoomId: 'room_2', isLocked: false, routeType: 'SAFE', label: 'LEFT' },
      { id: 'd2', x: 9, y: 5, targetRoomId: 'room_3', isLocked: false, routeType: 'DANGEROUS', label: 'RIGHT' }
    ],
    enemies: [],
    items: [],
    hazards: []
  },
  room_2: {
    id: 'room_2',
    width: 10,
    height: 10,
    doors: [
      { id: 'd3', x: 5, y: 9, targetRoomId: 'room_1', isLocked: false, routeType: 'SAFE', label: 'BACK' },
      { id: 'd4', x: 5, y: 0, targetRoomId: 'room_4', isLocked: false, routeType: 'SAFE', label: 'FORWARD' }
    ],
    enemies: [{ id: 'e1', type: 'Sentry', x: 5, y: 5, hp: 10, maxHp: 10, behavior: 'PATROL' }],
    items: [],
    hazards: []
  },
  room_3: {
    id: 'room_3',
    width: 10,
    height: 10,
    doors: [
      { id: 'd5', x: 0, y: 5, targetRoomId: 'room_1', isLocked: false, routeType: 'SAFE', label: 'BACK' },
      { id: 'd6', x: 5, y: 0, targetRoomId: 'room_4', isLocked: true, routeType: 'DANGEROUS', label: 'FORWARD' }
    ],
    enemies: [{ id: 'e2', type: 'Stalker', x: 8, y: 8, hp: 20, maxHp: 20, behavior: 'CHASE' }],
    items: [{ id: 'i1', type: 'KEY', x: 2, y: 2 }],
    hazards: [{ x: 5, y: 5 }, { x: 6, y: 5 }]
  },
  room_4: {
    id: 'room_4',
    width: 12,
    height: 12,
    doors: [
      { id: 'd7', x: 5, y: 11, targetRoomId: 'room_2', isLocked: false, routeType: 'SAFE', label: 'BACK_LEFT' },
      { id: 'd8', x: 6, y: 11, targetRoomId: 'room_3', isLocked: false, routeType: 'SAFE', label: 'BACK_RIGHT' },
      { id: 'd9', x: 5, y: 0, targetRoomId: 'room_5', isLocked: true, routeType: 'UNKNOWN', label: 'EXIT_DOOR' }
    ],
    enemies: [],
    items: [{ id: 'i2', type: 'KEY', x: 10, y: 10 }],
    hazards: []
  },
  room_5: {
    id: 'room_5',
    width: 10,
    height: 10,
    doors: [],
    enemies: [],
    items: [],
    hazards: [],
    isExit: true
  }
};

export class GameEngine {
  state: GameState;
  listeners: Set<(state: GameState) => void> = new Set();
  actionHistory: string[] = [];
  moveHistory: string[] = [];   // raw move directions for pattern detection
  moveCount: number = 0;        // total moves, for observation cadence
  lastObservationMove = 0;      // move index when we last emitted a local observation

  constructor() {
    this.state = this.getInitialState();
  }

  getInitialState(): GameState {
    return {
      player: {
        x: 5,
        y: 8,
        hp: 100,
        maxHp: 100,
        roomId: 'room_1',
        inventory: [],
        timeAlive: 0
      },
      behavior: {
        aggression: 0.5,
        exploration: 0.5,
        riskTaking: 0.5,
        routeRepetition: 0,
        hesitation: 0,
        enemyAvoidance: 0,
        resourceDependence: 0,
        combatPreference: 0.5,
        preferredRoute: 'none',
        actionsObserved: 0
      },
      world: {
        rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)) // Deep copy
      },
      logs: ['Game initialized.'],
      gemmaStatus: 'OBSERVING',
      awarenessLevel: 1,
      liveMemory: [],
      playerTrail: [],
      predictability: 0,
      lastDecision: null,
      gameStatus: 'START',
      level: 1
    };
  }

  startGame() {
    this.state = this.getInitialState();
    this.state.gameStatus = 'PLAYING';
    this.moveHistory = [];
    this.moveCount = 0;
    this.lastObservationMove = 0;
    this.log('Entered ECHO facility.');
    this.notify();
  }

  subscribe(listener: (state: GameState) => void) {
    this.listeners.add(listener);
    listener(this.state);
    return () => { this.listeners.delete(listener); };
  }

  notify() {
    this.listeners.forEach(l => l({ ...this.state }));
  }

  log(msg: string) {
    this.state.logs = [msg, ...this.state.logs].slice(0, 10);
  }

  addMemoryEvent(type: 'MOVE' | 'COMBAT' | 'PICKUP' | 'ROUTE' | 'OBSERVATION' | 'INTERVENTION', message: string, pos?: {x: number, y: number}) {
    this.state.liveMemory.push({
      id: Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      type,
      message,
      position: pos
    });
    if (this.state.liveMemory.length > 50) {
      this.state.liveMemory.shift();
    }
  }

  movePlayer(dx: number, dy: number) {
    if (this.state.gameStatus !== 'PLAYING') return;

    const { player, world } = this.state;
    const room = world.rooms[player.roomId];
    
    let nx = player.x + dx;
    let ny = player.y + dy;

    // Check bounds
    if (nx < 0 || nx >= room.width || ny < 0 || ny >= room.height) {
      return; // Wall
    }

    // Check doors
    const door = room.doors.find(d => d.x === nx && d.y === ny);
    if (door) {
      if (door.isLocked) {
        if (player.inventory.includes('KEY')) {
          door.isLocked = false;
          player.inventory.splice(player.inventory.indexOf('KEY'), 1);
          this.log(`Unlocked door to ${door.label}`);
          this.recordAction(`UNLOCK_${door.label}`);
        } else {
          this.log(`Door to ${door.label} is locked. Need KEY.`);
          return;
        }
      } else {
        this.log(`Took route: ${door.label}`);
        this.recordAction(`ROUTE_${door.label}`);
        this.enterRoom(door.targetRoomId);
        return;
      }
    }

    // Move
    player.x = nx;
    player.y = ny;
    
    this.state.playerTrail.push({ x: nx, y: ny });
    if (this.state.playerTrail.length > 6) this.state.playerTrail.shift();
    
    let dir = 'UNKNOWN';
    if (dy === -1) dir = 'NORTH';
    if (dy === 1) dir = 'SOUTH';
    if (dx === -1) dir = 'WEST';
    if (dx === 1) dir = 'EAST';
    
    this.addMemoryEvent('MOVE', `PLAYER MOVED ${dir}`, {x: nx, y: ny});
    
    // Track direction for pattern detection
    this.moveHistory.push(`MOVE_${dir}`);
    if (this.moveHistory.length > 40) this.moveHistory.shift();
    this.moveCount++;

    // Update predictability: same direction = +, change = -
    const recent = this.moveHistory.slice(-4);
    const allSame = recent.length >= 4 && recent.every(m => m === recent[0]);
    if (allSame) {
      this.state.predictability = Math.min(1, this.state.predictability + 0.06);
    } else if (recent.length >= 2 && recent[recent.length-1] !== recent[recent.length-2]) {
      this.state.predictability = Math.max(0, this.state.predictability - 0.04);
    }

    // Pattern break reward
    if (this.state.predictability < 0.2 && this.moveCount > 10) {
      if (!this.state.liveMemory.some(m => m.message === 'I did not expect that.')) {
        this.addMemoryEvent('OBSERVATION', 'I did not expect that.');
      }
    }

    // Local ECHO observation every 8 moves
    if (this.moveCount - this.lastObservationMove >= 8) {
      this.lastObservationMove = this.moveCount;
      for (const obs of ECHO_OBSERVATIONS) {
        if (obs.trigger(this.moveHistory) && !this.state.liveMemory.slice(-6).some(m => m.message === obs.msg)) {
          this.addMemoryEvent('OBSERVATION', obs.msg);
          break;
        }
      }
    }

    // Check items
    const itemIdx = room.items.findIndex(i => i.x === player.x && i.y === player.y);
    if (itemIdx >= 0) {
      const item = room.items[itemIdx];
      room.items.splice(itemIdx, 1);
      player.inventory.push(item.type);
      this.log(`Picked up ${item.type}`);
      this.recordAction(`PICKUP_${item.type}`);
    }

    // Enemy collision (combat)
    const enemyIdx = room.enemies.findIndex(e => e.x === player.x && e.y === player.y);
    if (enemyIdx >= 0) {
      const enemy = room.enemies[enemyIdx];
      enemy.hp -= 10;
      this.log(`Attacked ${enemy.type} for 10 DMG`);
      this.recordAction('ATTACK_ENEMY');
      
      if (enemy.hp <= 0) {
        room.enemies.splice(enemyIdx, 1);
        this.log(`${enemy.type} destroyed.`);
      } else {
        player.hp -= 5;
        this.log(`${enemy.type} hits back for 5 DMG`);
      }
    }
    
    // Hazard collision
    const hazardIdx = room.hazards.findIndex(h => h.x === player.x && h.y === player.y);
    if (hazardIdx >= 0) {
      player.hp -= 10;
      this.log('You stepped on a HAZARD! -10 HP');
    }

    this.checkStatus();
    this.notify();
  }

  enterRoom(roomId: string) {
    this.state.player.roomId = roomId;
    const room = this.state.world.rooms[roomId];
    if (room.isExit) {
      this.state.level += 1;
      if (this.state.level > 3) {
        this.state.gameStatus = 'VICTORY';
        this.log('You escaped all levels.');
      } else {
        this.log(`Level ${this.state.level} Reached.`);
        // Reset to room 1 for next level but keep profile/inventory
        this.state.world.rooms = JSON.parse(JSON.stringify(INITIAL_ROOMS));
        this.state.player.roomId = 'room_1';
        this.state.player.x = 5;
        this.state.player.y = 8;
        // AI makes environment harder
        this.state.world.rooms['room_2'].enemies.push({ id: `e_lvl_${Date.now()}`, type: 'Hunter', x: 2, y: 2, hp: 20 * this.state.level, maxHp: 20 * this.state.level, behavior: 'CHASE' });
      }
    } else {
      this.state.player.x = Math.floor(room.width / 2);
      this.state.player.y = Math.floor(room.height / 2);
      this.log(`Entered ${roomId}`);
    }
    this.triggerAIAnalysis();
    this.notify();
  }

  checkStatus() {
    if (this.state.player.hp <= 0) {
      this.state.player.hp = 0;
      this.state.gameStatus = 'GAME_OVER';
      this.log('You have died.');
    }
  }

  recordAction(action: string) {
    this.actionHistory.push(action);
    if (this.actionHistory.length > 20) this.actionHistory.shift();

    // Update profile
    if (action.startsWith('ROUTE_')) {
      const route = action.split('_')[1];
      this.state.behavior.preferredRoute = route;
      const recentRoutes = this.actionHistory.filter(a => a.startsWith('ROUTE_'));
      if (recentRoutes.length >= 2 && recentRoutes.slice(-2).every(r => r === `ROUTE_${route}`)) {
        this.state.behavior.routeRepetition++;
        if (this.state.behavior.routeRepetition > 1 && !this.state.liveMemory.some(m => m.message === 'You rely on the same routes.')) {
          this.addMemoryEvent('OBSERVATION', 'You rely on the same routes.');
          this.notify();
        }
      }
    }
    if (action === 'ATTACK_ENEMY') {
      this.addMemoryEvent('COMBAT', 'ATTACKED ENEMY');
      this.state.behavior.aggression = Math.min(1.0, this.state.behavior.aggression + 0.15);
      if (this.state.behavior.aggression > 0.5 && !this.state.liveMemory.some(m => m.message === 'You are highly aggressive.')) {
        this.addMemoryEvent('OBSERVATION', 'You are highly aggressive.');
        this.notify();
      }
    }
    if (action.startsWith('PICKUP_')) {
      const itemType = action.split('_')[1];
      this.addMemoryEvent('PICKUP', `COLLECTED ${itemType}`);
      if (!this.state.liveMemory.some(m => m.message === 'You scavenge for resources.')) {
        this.addMemoryEvent('OBSERVATION', 'You scavenge for resources.');
        this.notify();
      }
    }

    // Trigger AI every 4 significant actions
    if (this.actionHistory.length % 4 === 0) {
      this.triggerAIAnalysis();
    }
  }

  // Called periodically or on room enter
  async triggerAIAnalysis() {
    if (this.state.gemmaStatus === 'ANALYZING' || this.state.gemmaStatus === 'ADAPTING' || this.state.gemmaStatus === 'HUNTING') return;
    
    this.state.gemmaStatus = 'ANALYZING';
    this.notify();

    const start = Date.now();
    const decision = await gemmaProvider.generateDecision(this.state);
    const latency = Date.now() - start;

    if (decision) {
      this.state.gemmaStatus = 'ADAPTING';
      this.notify();
      
      // Update awareness level based on AI interventions
      if (this.state.awarenessLevel < 5) {
        this.state.awarenessLevel++;
      }
      
      // Add a session memory based on behavior
      if (this.state.behavior.routeRepetition > 2 && !this.state.liveMemory.some(m => m.message === 'You rely on the same routes.')) {
        this.addMemoryEvent('OBSERVATION', 'You rely on the same routes.');
      } else if (this.state.behavior.aggression > 0.6 && !this.state.liveMemory.some(m => m.message === 'You are highly aggressive.')) {
        this.addMemoryEvent('OBSERVATION', 'You are highly aggressive.');
      } else if (decision.action === 'CREATE_HAZARD' && !this.state.liveMemory.some(m => m.message === 'You are reckless with traps.')) {
        this.addMemoryEvent('OBSERVATION', 'You are reckless with traps.');
      }

      this.applyGemmaDecision(decision);
      this.log(`[LATENCY] AI processed in ${latency}ms`);
    } else {
      this.state.gemmaStatus = 'Timeout';
      this.log('[DECISION GUARD] Unreliable AI output detected.');
      this.log('[FALLBACK] Injecting reward to maintain flow.');
      this.applyGemmaDecision({
        action: 'SPAWN_REWARD',
        reason: 'Decision Guard activated. Safe fallback deployed.'
      });
    }
    this.notify();
  }

  applyGemmaDecision(decision: GemmaDecision) {
    this.addMemoryEvent('INTERVENTION', `AI ACTION: ${decision.action.replace(/_/g, ' ')}`);
    this.log(`AI DECISION: ${decision.action}`);
    this.state.lastDecision = decision;

    const { world, player } = this.state;
    const room = world.rooms[player.roomId];

    switch (decision.action) {
      case 'SPAWN_ENEMY':
        if (room) {
          room.enemies.push({
            id: `e_${Date.now()}`,
            type: 'Anomaly',
            x: Math.floor(Math.random() * room.width),
            y: Math.floor(Math.random() * room.height),
            hp: 20 * (decision.intensity || 1),
            maxHp: 20 * (decision.intensity || 1),
            behavior: 'CHASE'
          });
        }
        break;
      case 'ALTER_ROUTE':
        if (decision.target) {
           const door = room.doors.find(d => d.label === decision.target);
           if (door) {
             door.routeType = 'DANGEROUS';
             this.log(`Route ${door.label} has become dangerous.`);
           }
        }
        break;
      case 'LOCK_DOOR':
        if (decision.target) {
           const door = room.doors.find(d => d.label === decision.target);
           if (door) {
             door.isLocked = true;
           }
        }
        break;
      case 'SPAWN_REWARD':
        room.items.push({
          id: `i_${Date.now()}`,
          type: 'HEALTH',
          x: Math.floor(Math.random() * room.width),
          y: Math.floor(Math.random() * room.height),
        });
        break;
      case 'CREATE_HAZARD':
        if (room) {
          for (let i = 0; i < (decision.intensity || 2); i++) {
            room.hazards.push({
              x: Math.floor(Math.random() * room.width),
              y: Math.floor(Math.random() * room.height),
            });
          }
          this.log(`Hazards have appeared.`);
        }
        break;
    }
    
    // Set state back to OBSERVING or HUNTING
    if (this.state.awarenessLevel >= 5) {
      this.state.gemmaStatus = 'HUNTING';
    } else {
      this.state.gemmaStatus = 'OBSERVING';
    }
    
    // Auto clear last decision banner after 4 seconds
    setTimeout(() => {
      if (this.state.lastDecision === decision) {
        this.state.lastDecision = null;
        this.notify();
      }
    }, 4000);
    
    this.notify();
  }
}

export const gameEngine = new GameEngine();
