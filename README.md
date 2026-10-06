    # ECHO

    **"You are not playing the game. The game is learning how you play."**

    ECHO is a premium, cinematic browser game where **Gemma** acts as the strategic intelligence of the game world. Built specifically for the **"Gemma as the Brain of a Game"** hackathon challenge, ECHO flips the traditional gaming script: instead of you trying to beat a static level, an AI is actively observing your behavior, building a psychological profile on you, and modifying the environment in real-time to counter your strategies.

    ![ECHO UI Concept](https://img.shields.io/badge/UI-Cinematic_SciFi-00f0ff.svg) ![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB) ![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)

    ---

    ## 🧠 The Gemma Integration

    ECHO directly utilizes the Google Generative Language API (`gemma-2-9b-it`) to fulfill the core hackathon objective: **Make the model act, not answer.**

    1. **Observation**: As you play, the engine tracks your Aggression, Route Repetition, Risk-taking, and Exploration habits.
    2. **Analysis**: Every few moves, this raw behavioral data is serialized into JSON and sent to Gemma.
    3. **Action**: Gemma evaluates your strategy and returns strict JSON commands (e.g., `CREATE_HAZARD`, `SPAWN_ENEMY`, `ALTER_ROUTE`). 
    4. **Execution**: The game engine immediately manifests these changes in the 2D visual grid, forcing you to adapt.

    ---

    ## 🎮 How to Play

    ECHO is played entirely with your keyboard. The goal is to survive 3 increasingly difficult levels and find the Exit Door.

    ### Controls
    - **W / Arrow Up**: Move Up
    - **S / Arrow Down**: Move Down
    - **A / Arrow Left**: Move Left
    - **D / Arrow Right**: Move Right

    ### The Visual Grid
    You are the **Glowing Cyan Crosshair**. Interact with the grid by moving onto tiles:
    - 🟥 **Skulls (Enemies)**: Move onto them to attack.
    - 🟩 **Hearts / Keys (Items)**: Move onto them to heal or unlock doors.
    - 🟧 **Octagons (Hazards)**: Hidden traps spawned by the AI. Avoid them!
    - ⬜ **Doors**: Exits to other rooms.

    ### The AI Director
    Watch the **ECHO // WORLD INTELLIGENCE** panel on the right. It shows exactly what the AI thinks of you. When you repeat a pattern, the AI panel will bounce, flash cyan, and instantly change the world around you to stop you.

    ---

    ## 🚀 How to Run the Project Locally

    ### 1. Prerequisites
    Ensure you have [Node.js](https://nodejs.org/) installed on your machine.

    ### 2. Installation
    Clone the repository and install the dependencies:
    ```bash
    git clone https://github.com/your-repo/echo.git
    cd echo
    npm install
    ```

    ### 3. Environment Variables
    ECHO requires a Gemini API key to allow Gemma to control the game.
    1. Create a file named `.env` in the root of the project folder.
    2. Add your API key inside it like this:
    ```env
    VITE_GEMINI_API_KEY=your_api_key_here
    ```
    *(Note: If you do not provide an API key, ECHO will automatically switch to a built-in Mock Provider, allowing you to test the UI and game loop without internet access).*

    ### 4. Start the Game
    Run the local development server:
    ```bash
    npm run dev
    ```
    Open your browser and navigate to `http://localhost:5173` (or the URL provided in your terminal).

    ---

    ## ⚙️ Technical Architecture

    Handling an LLM in a real-time game requires overcoming severe technical hurdles: **Latency, Unreliable Outputs, and Bad Decisions.**

    ### 1. The Non-Blocking Engine
    Most AI games freeze while waiting for an API response. ECHO uses a decoupled engine. The player can continue moving and fighting synchronously while the `engine.ts` awaits Gemma's asynchronous analysis in the background.

    ### 2. The Decision Guard
    LLMs occasionally hallucinate. If Gemma returns invalid JSON or commands the game to do something impossible (e.g., `NUKE_PLAYER`), ECHO's **Decision Guard** catches it. 
    - It validates the schema strictly.
    - If the output is unreliable, it rejects the payload, prints a fallback alert to the UI Memory Log, and safely injects a minor reward to keep the gameplay flowing without crashing.

    ### 3. The Cinematic UI
    The React frontend leverages CSS Parallax, Spring Animations, and Glassmorphism to create an immersive, responsive environment. It was specifically designed to avoid looking like a "dashboard," ensuring the player feels trapped inside an intelligent facility.
