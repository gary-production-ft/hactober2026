export type Position = { x: number; y: number };

export type Enemy = {
  id: string;
  type: string;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  behavior: 'CHASE' | 'EVADE' | 'PATROL' | 'FLANK';
};

export type Item = {
  id: string;
  type: 'KEY' | 'HEALTH' | 'WEAPON' | 'SHIELD';
  x: number;
  y: number;
};

export type Door = {
  id: string;
  x: number;
  y: number;
  targetRoomId: string;
  isLocked: boolean;
  routeType: 'SAFE' | 'DANGEROUS' | 'UNKNOWN';
  label: string;
};

export type Room = {
  id: string;
  width: number;
  height: number;
  doors: Door[];
  enemies: Enemy[];
  items: Item[];
  hazards: Position[];
  isExit?: boolean;
};

export type PlayerState = {
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  roomId: string;
  inventory: string[];
  timeAlive: number;
};

export type PlayerAction = {
  type: string;
  timestamp: number;
  roomId: string;
  position: { x: number; y: number };
  hp: number;
  target?: string;
  risk?: number;
};

export type MemoryEvent = {
  id: string;
  timestamp: number;
  type: 'MOVE' | 'COMBAT' | 'PICKUP' | 'ROUTE' | 'OBSERVATION' | 'INTERVENTION';
  message: string;
  roomId?: string;
  position?: { x: number; y: number };
};

export type PlayerProfile = {
  aggression: number;
  exploration: number;
  riskTaking: number;
  routeRepetition: number;
  hesitation: number;
  enemyAvoidance: number;
  resourceDependence: number;
  combatPreference: number;
  preferredRoute: string;
  actionsObserved: number;
};

export type GameState = {
  player: PlayerState;
  behavior: PlayerProfile;
  world: {
    rooms: Record<string, Room>;
  };
  logs: string[];
  gemmaStatus: 'OBSERVING' | 'ANALYZING' | 'LEARNING' | 'ADAPTING' | 'HUNTING' | 'Timeout' | 'Error';
  awarenessLevel: number;
  predictability: number;
  liveMemory: MemoryEvent[];
  playerTrail: Position[];
  lastDecision: any;
  gameStatus: 'START' | 'PLAYING' | 'GAME_OVER' | 'VICTORY';
  level: number;
};

export type GemmaDecision = {
  action: 'SPAWN_ENEMY' | 'CHANGE_ENEMY_BEHAVIOR' | 'ALTER_ROUTE' | 'LOCK_DOOR' | 'UNLOCK_DOOR' | 'SPAWN_REWARD' | 'CREATE_HAZARD' | 'MOVE_RESOURCE';
  target?: string;
  intensity?: number;
  reason: string;
};
