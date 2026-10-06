# ECHO — Flowcharts & System Diagrams

Visual reference for the complete architecture, user flow, and AI decision pipeline of ECHO.

---

## 1. Complete User Journey

> From opening the browser to winning or losing — every possible path.

```mermaid
flowchart TD
    START([🌐 Open ECHO in Browser]) --> P1

    subgraph P1 ["PAGE 1 — ENTRANCE"]
        E1[Cinematic entrance screen\nAnimated Waves background]
        E1 --> E2{Hover on\nENTER button}
        E2 --> E3[Button glows cyan\nText: INITIALIZE WORLD]
        E3 --> E4[Click button]
        E4 --> E5[Spring animation\nScreen transition]
    end

    E5 --> P2

    subgraph P2 ["PAGE 2 — GAME WORLD"]
        direction TB
        G1[Level 01 starts\nPlayer spawns in Room 1]
        G1 --> G2[Player sees 2D grid\nHUD: HP / Level / Gemma Status]
        G2 --> G3[Player presses\nWSAD or Arrow Keys]
        G3 --> G4{What is on\nthe target tile?}

        G4 -->|Empty tile| G5[Move player]
        G4 -->|Enemy Skull| G6[⚔️ Combat\nDeal 10 DMG / Take 5 DMG]
        G4 -->|Hazard Octagon| G7[💥 -10 HP\nAI-placed trap]
        G4 -->|KEY item| G8[🔑 Pick up KEY\nAdded to inventory]
        G4 -->|HEALTH item| G9[❤️ Heal\nRestore HP]
        G4 -->|Unlocked Door| G10[🚪 Travel to\nnext room]
        G4 -->|Locked Door\nno KEY| G11[🚫 Blocked\nLog: Need KEY]
        G4 -->|Locked Door\n+ have KEY| G12[🔓 Unlock door\nConsume KEY]
        G4 -->|EXIT Door| G13[🟢 Level complete!]
        G4 -->|Wall boundary| G14[Blocked\nno movement]

        G5 --> AI_CHECK
        G6 --> HP_CHECK
        G7 --> HP_CHECK
        G8 --> AI_CHECK
        G9 --> AI_CHECK
        G10 --> AI_CHECK
        G12 --> AI_CHECK
        G14 --> G3

        HP_CHECK{HP = 0?}
        HP_CHECK -->|No| AI_CHECK
        HP_CHECK -->|Yes| DEAD

        AI_CHECK{4 actions\ncompleted?}
        AI_CHECK -->|No| G3
        AI_CHECK -->|Yes| GEMMA
    end

    DEAD([💀 GAME OVER\nECHO ADAPTED FASTER])
    
    G13 --> LEVEL_CHECK
    LEVEL_CHECK{Level = 3?}
    LEVEL_CHECK -->|No| NEXT_LEVEL[🆙 Level Up\nWorld resets harder]
    NEXT_LEVEL --> G1
    LEVEL_CHECK -->|Yes| WIN([🏆 VICTORY\nYOU ESCAPED ECHO])

    subgraph GEMMA ["GEMMA AI ANALYSIS"]
        direction LR
        AI1[Package behavior data\nJSON player profile]
        AI1 --> AI2[Send to\ngemma-4-26b-a4b-it API]
        AI2 --> AI3{Response\nvalid?}
        AI3 -->|Yes| AI4[Decision Guard\nValidates schema]
        AI3 -->|Timeout / Error| AI5[🛡️ Fallback\nSPAWN_REWARD]
        AI4 -->|Valid| AI6[Apply to World]
        AI4 -->|Invalid action| AI5
        AI6 --> AI7[Show intervention\noverlay to player]
        AI5 --> AI7
        AI7 --> AI8[Update ECHO Memory]
    end

    AI8 --> G3
```

---

## 2. Gemma AI Decision Pipeline

> How raw player actions become world-changing AI decisions.

```mermaid
flowchart LR
    subgraph OBSERVE ["OBSERVE"]
        O1[Player moves\nattacks, explores]
        O2[recordAction\ncalled in engine.ts]
        O3[Behavior Profile\nupdated in memory]
        O1 --> O2 --> O3
    end

    subgraph PROFILE ["PLAYER PROFILE"]
        P1{{"aggression: 0.72\nrepeatedActions: 4\nroutePreference: LEFT\nexploration: 0.34\nriskTaking: 0.68"}}
    end

    subgraph PROMPT ["BUILD PROMPT"]
        PR1["You are ECHO, a hostile AI...\nAnalyze this player profile:\n{ JSON data }\nReturn: { action, reason }"]
    end

    subgraph API ["GEMMA API"]
        A1[POST /v1beta/models\ngemma-4-26b-a4b-it:generateContent]
        A2{Response\n< 5000ms?}
        A3[Extract JSON\nfrom response text]
        A1 --> A2
        A2 -->|Yes| A3
        A2 -->|Timeout| FALLBACK
    end

    subgraph GUARD ["DECISION GUARD"]
        G1[validateDecision\nCheck schema]
        G2{Action in\nallowed list?}
        G3{Target\nexists?}
        G1 --> G2
        G2 -->|No| FALLBACK
        G2 -->|Yes| G3
        G3 -->|No| FALLBACK
        G3 -->|Yes| APPLY
    end

    subgraph FALLBACK ["FALLBACK SYSTEM"]
        F1[Log: DECISION GUARD\nUnreliable output detected]
        F2[Inject: SPAWN_REWARD\nSafe default action]
        F1 --> F2
    end

    subgraph APPLY ["APPLY TO WORLD"]
        AW1{Which action?}
        AW1 -->|SPAWN_ENEMY| AW2[Add enemy to room]
        AW1 -->|CREATE_HAZARD| AW3[Place hazard tiles]
        AW1 -->|ALTER_ROUTE| AW4[Change door state]
        AW1 -->|LOCK_DOOR| AW5[Lock a door]
        AW1 -->|SPAWN_REWARD| AW6[Add health pack]
    end

    O3 --> P1 --> PR1 --> A1
    A3 --> G1
    FALLBACK --> AW1
    APPLY --> AW1

    AW2 & AW3 & AW4 & AW5 & AW6 --> NOTIFY[Notify React\nRe-render world]
    NOTIFY --> OVERLAY[Show cinematic\nintervention overlay]
    OVERLAY --> MEMORY[Log to\nECHO Memory]
```

---

## 3. System Architecture

> How the three layers of ECHO interact.

```mermaid
graph TB
    subgraph Browser ["🌐 Browser (React + Vite)"]
        subgraph UILayer ["Presentation Layer"]
            UI1["App.tsx\nPage 1: Entrance"]
            UI2["App.tsx\nPage 2: Game"]
            UI3["Waves.jsx\nAnimated Canvas Background"]
            UI4["App.css\nCinematic Styles + Spring Animations"]
        end

        subgraph EngineLayer ["Game Engine Layer"]
            ENG1["engine.ts\n───────────────\nmovePlayer(dx, dy)\nenterRoom(roomId)\ncheckStatus()\nrecordAction(action)\ntriggerAIAnalysis()\napplyGemmaDecision(d)"]
        end

        subgraph AILayer ["AI Abstraction Layer"]
            AI1["GemmaProvider.ts\n───────────────\nbuildPrompt(state)\ngenerateDecision(state)\nvalidateDecision(d)\nmockDecision(state)"]
        end

        subgraph StateLayer ["Shared State (types.ts)"]
            ST1["player: { x, y, hp, inventory }"]
            ST2["behavior: { aggression, repetition }"]
            ST3["world: { rooms, enemies, hazards }"]
            ST4["logs: string[]"]
            ST5["lastDecision: GemmaDecision"]
            ST6["gemmaStatus: Idle | Processing | Timeout"]
        end
    end

    subgraph External ["☁️ External Services"]
        EXT1["Google Generative Language API\ngemma-4-26b-a4b-it"]
    end

    UI2 -->|"KeyDown event"| ENG1
    ENG1 -->|"notify() → setState"| UI2
    ENG1 -->|"triggerAIAnalysis()"| AI1
    AI1 -->|"fetch() POST"| EXT1
    EXT1 -->|"JSON response"| AI1
    AI1 -->|"GemmaDecision"| ENG1
    ENG1 <-->|"read/write"| StateLayer
    StateLayer -->|"React state subscription"| UILayer

    style Browser fill:#07080B,stroke:#334155,color:#f8fafc
    style External fill:#0a0c10,stroke:#00f0ff,color:#00f0ff
```

---

## 4. Room Navigation Map

> The physical layout of the ECHO facility.

```mermaid
graph TD
    R1["🟦 ROOM 1\nStart room\nNo enemies\n2 exits: LEFT / RIGHT"]
    R2["🟨 ROOM 2\nSentry enemy\nSafe route\nForward door"]
    R3["🟥 ROOM 3\nStalker enemy\nKEY item\nHazards on floor\nLocked forward door"]
    R4["🟪 ROOM 4\n12×12 grid\nKEY item hidden\nLocked EXIT door"]
    R5["🟩 ROOM 5\nEXIT reached!\nLevel complete"]

    R1 -->|"LEFT route"| R2
    R1 -->|"RIGHT route"| R3
    R2 -->|"FORWARD"| R4
    R3 -->|"FORWARD\n🔑 requires KEY"| R4
    R4 -->|"EXIT\n🔑 requires KEY"| R5
    R2 -->|"BACK"| R1
    R3 -->|"BACK"| R1
    R4 -->|"BACK LEFT"| R2
    R4 -->|"BACK RIGHT"| R3

    style R5 fill:#003d1a,stroke:#00ff9d,color:#00ff9d
    style R3 fill:#3d0000,stroke:#ff003c,color:#ffffff
```

---

## 5. Game State Machine

> Every state the game can be in and what triggers transitions.

```mermaid
stateDiagram-v2
    [*] --> START : Page loads

    START --> PLAYING : Player clicks\n"ENTER THE WORLD"

    PLAYING --> PLAYING : Player moves\nAI intervenes\nRoom changes

    PLAYING --> GAME_OVER : Player HP\nreaches 0

    PLAYING --> LEVEL_TRANSITION : Player reaches\nEXIT door\nLevel ≤ 3

    LEVEL_TRANSITION --> PLAYING : World resets\nEnemies harder\nLevel counter +1

    PLAYING --> VICTORY : Player reaches\nEXIT on Level 3

    GAME_OVER --> PLAYING : Player clicks\n"TRY AGAIN"

    VICTORY --> PLAYING : Player clicks\n"PLAY AGAIN"
```
