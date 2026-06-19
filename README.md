# Codebase Lo-Fi Synth Station 🎧

A beautiful, interactive web application that reads any local codebase structure, file stats, and directory mapping, then converts it into a unique, custom-made **procedural Lo-Fi soundtrack** in real-time.

It features two synthesis modes:
1. **Procedural Mode (No API key needed)**: Uses custom mathematical mappings from codebase structures to determine chords, drum density, tempo, and synth envelopes.
2. **Gemini AI Mode**: Sends code statistics (languages, files, directories, lines) to the **Gemini 2.5 Flash API** to dynamically compose a unique music DNA (custom chord progressions, tempos, melodic scales, and ambient balance) based on the "vibe" of the codebase!

---

## 🎨 Sound Mapping Schema & Procedural Engine

The synthesizer converts your code statistics into music DNA through a complex mapping:

| Codebase Stat | Musical Mapping | Sound Characteristic |
| :--- | :--- | :--- |
| **Lines of Code (LOC)** | **BPM (Tempo)** | Larger projects speed up (65 - 80 BPM). Tempo shifts are smoothly ramped (DJ-like transition) to prevent context clicks. |
| **Dominant Language (C++/Shell)** | **Minor Chord Mode** | Technical, industrial, deep chord layers (8 different progression templates). |
| **Dominant Language (Python/JS/Web)** | **Major Chord Mode** | Jazzy, warm, relaxing Rhodes key layers (8 different progression templates). |
| **Frontend Density (JS/HTML)** | **Filter Cut-off frequency** | Brightens or dims the low-pass filter, making front-end-heavy code sound airy. |
| **File modification logs** | **Rhodes Melodies** | Recently touched files trigger light, chimey notes from the transposed pentatonic scale. |
| **Folder Path String Hash** | **Root Key & Progressions** | Transposes the entire music scale (notes, chords, bass roots, chord names) across all 12 keys (C through B) and selects one of 8 templates, creating **96 unique procedural combinations** so different codebases sound completely distinct. |

---

## 📁 VS Code-Style Directory Explorer & Cross-Platform Paths

* **Platform-Aware Path Handling**: You can type or paste Windows host paths (e.g. `C:\Users\user\OneDrive\바탕 화면\others\advanced-theme-park`) directly in both environments. The server detects the OS at runtime: on **native Windows** it uses the drive path as-is, and inside **WSL/Linux** it automatically translates it to a mount format (`/mnt/c/...`) to scan files on the Windows host. Either way, paths are presented as clean native paths in the UI.
* **Interactive Directory Explorer**: Clicking the `📁` icon opens a dropdown directory browser:
  - **Navigate**: Click on any folder row `📁 folder_name` to enter it, or click `📁 ..` to go up a level.
  - **Quick Select**: Hover over any folder item and click the `Select` button that appears on the right to immediately select, close, and scan that directory.
  - **Header Select**: Click the `Select` button in the explorer header to choose the folder you have currently navigated into.
  - **Resilient Errors**: If a path fails to load (e.g. permission issues or a typo like `바탅`), the browser shows troubleshooting tips (typo checks) and preserves the typed path so clicking "Select" doesn't reset your input.

---

## 🔄 Rich Loading States
* **Scan Button**: Displays a spinning loader icon next to `Scanning...` or `Composing...` when updating codebase statistics.
* **Explorer List**: Displays a medium loading circle with a pulsing `Loading folders...` label when fetching subdirectories.
* **Metrics Card Overlay**: Blurs the dashboard card with a large spinning loader and active stage labels (e.g., `Scanning codebase files...` or `AI Composing music DNA...`) to provide clear visual feedback during loading.

---

## 🚀 Installation & Getting Started

### 1. Clone the project
```bash
git clone <your-repository-url>
cd codebase-lofi-generator
```

### 2. Install Dependencies
Make sure you have Node.js (v18+) installed. The same commands work on **Windows (PowerShell/CMD)**, **WSL**, **macOS**, and **Linux** — the server is OS-agnostic.
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```
The server will start at **`http://localhost:3000`**.

> **Windows vs. WSL**: Run `npm start` from whichever environment owns the codebase you want to scan.
> - **Native Windows** (PowerShell/CMD): type host paths like `C:\Users\you\project` directly.
> - **WSL**: the same `C:\...` paths are auto-translated to `/mnt/c/...`, so you can scan Windows files from inside WSL.

### 4. (Optional) Run with Gemini AI Composition Mode
You can feed a Gemini API Key to enable the generative composition.
* **Option A**: Run the server with the environment variable set:

  **Windows (PowerShell):**
  ```powershell
  $env:GEMINI_API_KEY="your-api-key-here"; npm start
  ```
  **Windows (CMD):**
  ```cmd
  set GEMINI_API_KEY=your-api-key-here && npm start
  ```
  **WSL / macOS / Linux (bash):**
  ```bash
  export GEMINI_API_KEY="your-api-key-here"
  npm start
  ```
* **Option B**: Paste the API Key directly into the **Settings panel** on the web page and toggle the **AI Compose** switch.

---

## 🛠️ How it's Built

- **Sound Synthesis**: Built using **Tone.js** (Web Audio API). It features a limiter, multi-band mixers, delay line filters, stereo space reverbs, lowpass pink-noise filters (simulating rain), and custom membrane/metal drums.
- **Backend Analyzer**: Built using **Express** (Node.js). Recursively scans files in target folders while ignoring standard build/system files (like `node_modules`, `.git`, `.ros`, `.conda`, etc.).
- **Visualizer**: Custom high-refresh **HTML5 Canvas** rendering a responsive glowing audio frequency spectrum.
- **Aesthetic UI**: Retro cassette/vinyl deck aesthetic using CSS glassmorphism, responsive grid layouts, and smooth animations.

---

## 🤝 Custom Plugin Integration (Antigravity Custom Skill)
To add this as a Workspace Skill for Antigravity, save the following configuration in your workspace at `.agents/skills/codebase_lofi/SKILL.md`:

```markdown
---
name: codebase-lofi
description: "Starts the codebase lo-fi synthesizer server to scan the current directory and play custom music."
---

# Codebase Lo-Fi Synthesizer Skill
This skill scans your workspace and launches a local server on port 3000 to synthesize lo-fi beats mapped to your code structure.

## Usage
Run the script to start the server:
`node /absolute/path/to/codebase-lofi-generator/server.js`
```
