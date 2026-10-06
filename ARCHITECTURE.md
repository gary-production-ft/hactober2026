# ECHO — Technical Architecture

This document outlines the technical design of ECHO, demonstrating how we natively integrated **Gemma-2-9b-it** as a strategic game director without compromising game loop performance or determinism.

## 1. System Overview

The application is built using React and TypeScript, separated into three strict layers:
- **Presentation Layer** (`App.tsx` & `App.css`): Renders the 2D visual grid and cinematic UI animations.
- **Deterministic Game Engine** (`engine.ts`): The core state machine and logic controller.
- **AI Abstraction Layer** (`GemmaProvider.ts`): The bridge to the Gemma API.

## 2. The Non-Blocking Game Loop

Most LLM integrations freeze the application while waiting for inference. ECHO solves this by decoupling the AI from the core game loop.

1. **Player acts:** The player moves or attacks via keyboard input.
2. **Engine updates:** The `engine.ts` immediately resolves physics/collisions and updates the React state (Zero latency).
3. **AI Trigger:** Every 4 significant actions, the engine triggers an asynchronous `triggerAIAnalysis()` call.
4. **Background Processing:** The game continues normally. An `[AI IS ANALYZING]` overlay appears to build tension, but the player is never prevented from moving.
5. **Injection:** When Gemma responds (e.g., 800ms to 2000ms later), the payload is parsed and injected directly into the live `GameState`.

## 3. Gemma 4 as a Game Director

We specifically target the `gemma-4-26b-a4b-it` model via the Google Generative Language API.

Instead of chat, Gemma is provided with a **JSON stringified Player Profile** containing:
- `Aggression`: Scales up when the player attacks frequently.
- `Repeated Actions`: Scales up when the player uses the same paths.
- `Risk Taking`: Derived from environmental interactions.

Gemma's system prompt strictly instructs it to act as a hostile game director. It is forced via `responseMimeType: "application/json"` to output structured commands corresponding to game engine methods:
- `SPAWN_ENEMY`
- `ALTER_ROUTE`
- `CREATE_HAZARD`

## 4. The Decision Guard

LLMs are prone to hallucinations. To prevent Gemma from breaking the game (e.g., outputting a command like `NUKE_WORLD`), ECHO employs a strict **Decision Guard**.

1. **Schema Validation:** The payload is checked against allowed enums.
2. **Game Rule Validation:** The engine verifies the target exists (e.g., a door can actually be locked).
3. **Fallback Mechanism:** If Gemma returns malformed data or times out, the Decision Guard explicitly intercepts it, prints `[DECISION GUARD] Unreliable AI output detected` to the logs, and injects a safe fallback (e.g., `SPAWN_REWARD`) to ensure the gameplay is never interrupted.

## 5. Security & Mocking

- API keys are handled securely via `.env`.
- If no internet connection or API key is present, `GemmaProvider.ts` automatically switches to an internal **Mock Provider**. The Mock Provider simulates network latency and uses heuristics to mimic Gemma's JSON output so the UI and Engine can still be fully tested.
