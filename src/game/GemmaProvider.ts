import type { GameState, GemmaDecision } from './types';

export class GemmaProvider {
  apiKey: string | undefined;

  constructor() {
    this.apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  }

  async generateDecision(state: GameState): Promise<GemmaDecision | null> {
    const prompt = this.buildPrompt(state);

    try {
      const res = await fetch('/api/echo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json"
          }
        })
      });

      if (!res.ok) {
        throw new Error('API Error');
      }

      const data = await res.json();
      const text = data.candidates[0].content.parts[0].text;
      const parsed = JSON.parse(text) as GemmaDecision;
      
      if (this.validateDecision(parsed)) {
        return parsed;
      }
      return null;
    } catch (e) {
      console.error("Gemma API Error", e);
      return this.mockDecision(state);
    }
  }

  buildPrompt(state: GameState): string {
    return `
You are ECHO, a hostile, highly intelligent AI directing a survival game.
Your goal is to actively counter the player's strategy.
Analyze this state:
${JSON.stringify({
  player: state.player,
  behavior: state.behavior
}, null, 2)}

Output JSON matching this schema:
{
  "action": "SPAWN_ENEMY" | "CHANGE_ENEMY_BEHAVIOR" | "ALTER_ROUTE" | "LOCK_DOOR" | "SPAWN_REWARD" | "CREATE_HAZARD" | "MOVE_RESOURCE",
  "target": "string (door label or room id)",
  "intensity": number (1-3),
  "reason": "string (Write this as a short, arrogant, direct taunt to the player explaining how you are countering them. E.g. 'I see you prefer fighting. Try fighting this.')"
}

Respond ONLY with valid JSON.
`;
  }

  validateDecision(decision: any): decision is GemmaDecision {
    if (!decision || typeof decision !== 'object') return false;
    const allowedActions = ['SPAWN_ENEMY', 'CHANGE_ENEMY_BEHAVIOR', 'ALTER_ROUTE', 'LOCK_DOOR', 'SPAWN_REWARD', 'CREATE_HAZARD', 'MOVE_RESOURCE'];
    if (!allowedActions.includes(decision.action)) return false;
    return true;
  }

  mockDecision(state: GameState): Promise<GemmaDecision> {
    return new Promise(resolve => {
      setTimeout(() => {
        let action: any = 'SPAWN_ENEMY';
        let target = '';
        let reason = 'I am testing your reflexes. A new enemy has arrived.';

        if (state.behavior.routeRepetition > 2) {
          action = 'ALTER_ROUTE';
          target = state.behavior.preferredRoute;
          reason = 'You rely on the same route too much. I have made it dangerous.';
        } else if (state.behavior.aggression > 0.6) {
          action = 'CREATE_HAZARD';
          reason = 'You fight recklessly. Let us see how you handle traps.';
        }

        resolve({ action, target, intensity: 2, reason });
      }, 800);
    });
  }
}

export const gemmaProvider = new GemmaProvider();
