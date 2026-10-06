import type { GameState, Room, PlayerState, PlayerProfile, Door, Item, Enemy, GemmaDecision } from './types';
import { gemmaProvider } from './GemmaProvider';

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
        routePreference: 'none',
        resourceUsage: 0,
        repeatedActions: 0
      },
      world: {
        rooms: JSON.parse(JSON.stringify(INITIAL_ROOMS)) // Deep copy
      },
      logs: ['Game initialized.'],
      gemmaStatus: 'Idle',
      lastDecision: null,
      gameStatus: 'START',
      level: 1
    };
  }

  startGame() {
    this.state = this.getInitialState();
    this.state.gameStatus = 'PLAYING';
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
      this.state.behavior.routePreference = route;
      const recentRoutes = this.actionHistory.filter(a => a.startsWith('ROUTE_'));
      if (recentRoutes.length >= 3 && recentRoutes.slice(-3).every(r => r === `ROUTE_${route}`)) {
        this.state.behavior.repeatedActions++;
      }
    }
    if (action === 'ATTACK_ENEMY') {
      this.state.behavior.aggression = Math.min(1.0, this.state.behavior.aggression + 0.1);
    }

    // Trigger AI every 4 significant actions
    if (this.actionHistory.length % 4 === 0) {
      this.triggerAIAnalysis();
    }
  }

  // Called periodically or on room enter
  async triggerAIAnalysis() {
    if (this.state.gemmaStatus === 'Processing') return;
    
    this.state.gemmaStatus = 'Processing';
    this.notify();

    const start = Date.now();
    const decision = await gemmaProvider.generateDecision(this.state);
    const latency = Date.now() - start;

    if (decision) {
      this.state.gemmaStatus = 'Idle';
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
