# ECHO

> **"You are not playing the game. The game is learning how you play."**

ECHO is an experimental browser game where **Gemma 2** (Google's open-weights AI model) acts as the living brain of the game world. It observes your behavior in real-time, builds a psychological profile on you, and physically changes the environment to counter your strategies.

Built for the **Hacktoberfest 2026 — "Gemma as the Brain of a Game"** challenge.

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat&logo=react) ![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=flat&logo=typescript) ![Vite](https://img.shields.io/badge/Vite-8-646CFF?style=flat&logo=vite) ![Gemma](https://img.shields.io/badge/Gemma_2-9B_IT-00f0ff?style=flat&logo=google)

---

## 🎯 What is ECHO?

Most games have static rules. ECHO has none.

Instead, **Gemma 2** watches everything you do:

- Do you always take the same route? Gemma locks it.
- Do you fight every enemy? Gemma spawns more.
- Do you avoid danger? Gemma places hazards on your safe path.

The game is not trying to be beaten. It is trying to learn you — and stop you.

---

## 🗺️ User Flow

```mermaid
flowchart TD
    A([🖥️ Open ECHO]) --> B[Entrance Screen\nAnimated waves background]
    B --> C{Click\nENTER THE WORLD}
    C --> D[Game Starts\nLevel 01 — Room 1]

    D --> E[Player Explores\nWSAD / Arrow Keys]
    E --> F{What did\nthe player do?}

    F -->|Walked into enemy| G[⚔️ Combat\nDeal 10 DMG, Take 5 DMG]
    F -->|Stepped on hazard| H[💥 -10 HP\nAI-placed trap]
    F -->|Picked up item| I[🔑 KEY or ❤️ HEALTH\nAdded to inventory]
    F -->|Walked into door| J{Is door\nlocked?}

    J -->|Yes + has KEY| K[🔓 Unlock Door\nMove to next room]
    J -->|Yes, no KEY| L[🚫 Blocked\nNeed KEY first]
    J -->|No| K

    G --> M[Behavior Profile Updated]
    H --> M
    I --> M
    K --> M

    M --> N{Every 4 actions\ntrigger AI analysis}
    N -->|Not yet| E
    N -->|Yes| O[🧠 Gemma Analyzes\nPlayer Profile JSON sent to API]

    O --> P{Gemma\nresponds?}
    P -->|Valid JSON| Q[✅ Decision Guard\nValidate schema + action]
    P -->|Timeout / Invalid| R[🛡️ Fallback Controller\nSafe reward spawned]

    Q --> S{Which action\ndid Gemma choose?}
    S -->|SPAWN_ENEMY| T[💀 New enemy\nappears on grid]
    S -->|ALTER_ROUTE| U[🚪 A door changes\nstate or locks]
    S -->|CREATE_HAZARD| V[⚠️ Hazards placed\non player's route]
    S -->|SPAWN_REWARD| W[❤️ Health pack\nappears]
    S -->|LOCK_DOOR| X[🔒 A door\nbecomes locked]

    T --> Y[🌊 World Changes\nAI Intervention Overlay shown]
    U --> Y
    V --> Y
    W --> Y
    X --> Y
    R --> Y

    Y --> Z[Echo Memory\nEvent logged to timeline]
    Z --> E

    K --> AA{Reached\nExit Room?}
    AA -->|No| E
    AA -->|Yes, Level < 3| AB[🆙 Level Up!\nWorld resets, enemies get harder]
    AA -->|Yes, Level 3| AC([🏆 VICTORY\nYOU ESCAPED])
    
    G --> AD{HP = 0?}
    H --> AD
    AD -->|No| E
    AD -->|Yes| AE([💀 GAME OVER\nECHO ADAPTED FASTER])
```

---

## 🤖 Gemma AI Decision Flow

```mermaid
flowchart LR
    A[Player Actions] --> B[Behavior Tracker]
    
    B --> C{Every 4\nactions}
    C --> D[Build Player Profile\nJSON Object]
    
    D --> E{{"Aggression: 72%\nRoute Repetition: 4x\nRisk: 68%"}}
    
    E --> F[Send to Gemma 2\ngoogle/gemma-2-9b-it]
    
    F --> G{API\nResponse}
    
    G -->|Success| H[Parse JSON\nDecision]
    G -->|Timeout| I[Fallback\nController]
    G -->|Invalid JSON| I
    
    H --> J[Decision Guard\nValidate Schema]
    J -->|Invalid action| I
    J -->|Valid| K[Apply to\nGame World]
    
    I --> L[SPAWN_REWARD\nSafe fallback]
    L --> M[Log to\nECHO Memory]
    K --> M
```

---

## 🏗️ System Architecture

```mermaid
graph TB
    subgraph UI ["Presentation Layer (React)"]
        A1[App.tsx\nEntrance Page]
        A2[App.tsx\nGame Page]
        A3[Waves.jsx\nAnimated Background]
        A4[App.css\nCinematic Styles]
    end

    subgraph Engine ["Game Engine (engine.ts)"]
        B1[State Machine\nGameState]
        B2[movePlayer\nDeterministic Logic]
        B3[enterRoom\nRoom Transitions]
        B4[recordAction\nBehavior Tracker]
        B5[triggerAIAnalysis\nAsync AI Call]
        B6[applyGemmaDecision\nWorld Mutation]
        B7[Decision Guard\nValidation + Fallback]
    end

    subgraph AI ["AI Layer (GemmaProvider.ts)"]
        C1[buildPrompt\nPlayer Profile → JSON]
        C2[API Call\ngemma-2-9b-it]
        C3[parseResponse\nJSON Extraction]
        C4[mockDecision\nOffline Fallback]
    end

    subgraph State ["Game State (types.ts)"]
        D1[player: position, hp, inventory]
        D2[behavior: aggression, repetition]
        D3[world: rooms, enemies, hazards]
        D4[logs: ECHO Memory]
        D5[lastDecision: AI output]
    end

    A2 --> B2
    B2 --> B4
    B4 --> B5
    B5 --> C1
    C1 --> C2
    C2 --> C3
    C3 --> B7
    B7 -->|Valid| B6
    B7 -->|Invalid| B6
    B6 --> D3
    B1 --> A2
    D1 & D2 & D3 & D4 & D5 --> B1
```

---

## 🎮 How to Play

### Controls
| Key | Action |
|-----|--------|
| `W` / `↑` | Move Up |
| `S` / `↓` | Move Down |
| `A` / `←` | Move Left |
| `D` / `→` | Move Right |

### Grid Legend
| Icon | Meaning | Interaction |
|------|---------|-------------|
| ⊕ Crosshair | **YOU** | — |
| 💀 Skull | **Enemy** | Walk into to attack (deal 10 DMG, take 5 DMG) |
| 🚪 Door | **Exit to next room** | Walk into to travel |
| 🟢 Exit | **Level exit** | Walk in to complete the level |
| 🔑 Key | **Key item** | Walk onto to pick up |
| ❤️ Heart | **Health pack** | Walk onto to heal |
| ⚠️ Octagon | **AI Hazard** | Avoid! -10 HP if stepped on |
| 🔒 Locked | **Locked door** | Need KEY in inventory first |

### Objective
- Survive 3 levels by finding the **Exit Door** in each level.
- The longer you survive, the more Gemma learns your strategy.
- **Change how you play** — or Gemma will stop you.

---

## 🚀 How to Run Locally

### Prerequisites
- [Node.js 18+](https://nodejs.org/)
- A [Google AI Studio](https://aistudio.google.com/) API key (free)

### 1. Clone & Install
```bash
git clone https://github.com/gary-production-ft/hactober2026.git
cd hactober2026
npm install
```

### 2. Configure API Key
```bash
cp .env.example .env
```
Open `.env` and add your key:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

> **No API key?** The game automatically falls back to a **Mock AI Provider** that simulates Gemma's behavior locally using heuristics. The full game loop works without internet.

### 3. Start the Game
```bash
npm run dev
```
Open **[http://localhost:5173](http://localhost:5173)**

### 4. Build for Production
```bash
npm run build
```

---

## ⚙️ Technical Deep Dive

### The Core Challenge: Latency
LLM inference takes 500ms–2000ms. A game running at 60fps cannot freeze.

**Solution — Decoupled Async Engine:**
- The `GameEngine` runs a fully synchronous, deterministic game loop. Player moves instantly.
- `triggerAIAnalysis()` fires **asynchronously** in the background every 4 actions.
- The `[GEMMA // ANALYZING]` indicator shows while inference runs.
- When Gemma responds, the decision is injected into the live `GameState` without dropping a frame.

### The Decision Guard
Gemma can hallucinate. If it invents an action like `DESTROY_ALL_ENEMIES` or returns malformed JSON:
1. `GemmaProvider.validateDecision()` schema-checks the response against allowed actions.
2. Invalid decisions are **silently rejected**.
3. The **Fallback Controller** injects a safe `SPAWN_REWARD` action instead.
4. The player sees `[DECISION GUARD] Unreliable AI output detected` in the ECHO Memory log.

The game **never crashes due to AI failure.**

### Gemma as a Director (not a chatbot)
Gemma receives this prompt structure:
```
You are ECHO, a hostile AI directing a survival game.
Analyze this player profile: { aggression: 0.72, repeatedActions: 4, ... }
Return JSON: { action, target, intensity, reason }
```

The `reason` field is displayed as a **direct taunt to the player** — making the AI feel alive and intelligent.

---

## 📁 Project Structure

```
echo/
├── src/
│   ├── App.tsx              # Main UI — entrance + game pages
│   ├── App.css              # Cinematic sci-fi styles + animations
│   ├── Waves.jsx            # Animated wave background (React Bits)
│   ├── Waves.css            # Wave canvas styles
│   ├── Waves.d.ts           # TypeScript declarations for Waves
│   └── game/
│       ├── engine.ts        # Core game engine + state machine
│       ├── GemmaProvider.ts # Gemma API integration + fallback
│       └── types.ts         # TypeScript interfaces
├── .env.example             # API key template
├── README.md                # This file
├── ARCHITECTURE.md          # Deep technical architecture notes
└── HOW_TO_PLAY.md           # Standalone player guide
```

---

## 🏆 Hackathon Criteria Mapping

| Criterion | Implementation |
|-----------|---------------|
| **Idea & Originality** | AI acts as an adversarial game director, not a game character |
| **Technical Depth** | Non-blocking async engine, Decision Guard, schema validation, fallback system |
| **Working Demo** | Fully playable 3-level game deployed on Vercel |
| **Meaningful use of Gemma 4** | `gemma-2-9b-it` directly observes player behavior and mutates the world |
| **Documentation** | This README + ARCHITECTURE.md + HOW_TO_PLAY.md |
