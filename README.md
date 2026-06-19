# Codebase Lo-Fi Synth Station 🎧

A beautiful, interactive web application that reads any local codebase structure, file stats, and directory mapping, then converts it into a unique, custom-made **procedural Lo-Fi soundtrack** in real-time.

It features two synthesis modes:
1. **Procedural Mode (No API key needed)**: Uses custom mathematical mappings from codebase structures to determine chords, drum density, tempo, and synth envelopes.
2. **Gemini AI Mode**: Sends code statistics (languages, files, directories, lines) to the **Gemini 2.5 Flash API** to dynamically compose a unique music DNA (custom chord progressions, tempos, melodic scales, and ambient balance) based on the "vibe" of the codebase!

---

## 🎨 Sound Mapping Schema

| Codebase Stat | Musical Mapping | Sound Characteristic |
| :--- | :--- | :--- |
| **Lines of Code (LOC)** | **BPM (Tempo)** | Larger projects speed up (65 - 80 BPM) to sound structured and progressive. |
| **Dominant Language (C++)** | **D Minor Chord Scale** | Industrial, technical, deep chord layers (Dm9, Bbmaj9, Am9, C9). |
| **Dominant Language (Python/JS)** | **F Major Chord Scale** | Warm, jazzy, relaxing Rhodes chords (Fmaj9, G9, Em9, Am9). |
| **Frontend Density (JS/HTML)** | **Filter Cut-off frequency** | Brightens or dims the low-pass filter, making front-end code sound airy. |
| **File modification logs** | **Rhodes Melodies** | Recently touched files trigger light, chimey notes from the pentatonic scale. |

---

## 🚀 Installation & Getting Started

### 1. Clone the project
```bash
git clone <your-repository-url>
cd codebase-lofi-generator
```

### 2. Install Dependencies
Make sure you have Node.js (v18+) installed.
```bash
npm install
```

### 3. Start the Server
```bash
npm start
```
The server will start at **`http://localhost:3000`**.

### 4. (Optional) Run with Gemini AI Composition Mode
You can feed a Gemini API Key to enable the generative composition.
* **Option A**: Run the server with the environment variable set:
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
