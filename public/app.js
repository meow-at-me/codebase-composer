// Color Palette for Languages
const LANG_COLORS = {
  python: '#3572A5',
  cpp: '#f34b7d',
  javascript: '#f1e05a',
  typescript: '#3178c6',
  html: '#e34c26',
  css: '#563d7c',
  markdown: '#083fa1',
  json: '#29beb0',
  shell: '#89e051',
  yaml: '#cb171e',
  other: '#5c5280'
};

// State Variables
let codebase = null;
let isPlaying = false;
let toneStarted = false;
let currentBpm = 72;
let chordLoop = null;
let drumLoop = null;
let melodyLoop = null;
let vinylCrackLoop = null;
let activeChordName = 'None';
let geminiDna = null;

// Synths and Effects
let limiter, mainFilter, delay, reverb, bitcrusher, rainLFO;
let synthPad, synthBass, synthMelody, synthArp, noiseSynth, rainNoise;
let kickSynth, clapSynth, hatSynth;
let volAmbient, volChords, volBass, volMelody, volDrums, volArp;
let analyser;
let arpLoop = null;

// DOM Elements
const playBtn = document.getElementById('play-btn');
const scanBtn = document.getElementById('scan-btn');
const vinylDisc = document.getElementById('vinyl-disc');
const tonearm = document.getElementById('tonearm');
const workspaceNameSpan = document.getElementById('workspace-name');
const nowPlayingLang = document.getElementById('now-playing-lang');
const liveBpmSpan = document.getElementById('live-bpm');
const liveChordSpan = document.getElementById('live-chord');
const liveSynthSpan = document.getElementById('live-synth');
const consoleOutput = document.getElementById('console-output');
const canvas = document.getElementById('visualizer-canvas');
const ctx = canvas.getContext('2d');

const scanPathInput = document.getElementById('scan-path-input');
const geminiKeyInput = document.getElementById('gemini-key-input');
const geminiModeToggle = document.getElementById('gemini-mode-toggle');
const geminiTempSlider = document.getElementById('gemini-temp-slider');
const tempValSpan = document.getElementById('temp-val');

const helpBtn = document.getElementById('help-btn');
const helpDrawer = document.getElementById('help-drawer');
const closeHelpBtn = document.getElementById('close-help-btn');

const browseBtn = document.getElementById('browse-btn');
const explorerDropdown = document.getElementById('explorer-dropdown');
const explorerCurrentPath = document.getElementById('explorer-current-path');
const explorerSelectBtn = document.getElementById('explorer-select-btn');
const explorerList = document.getElementById('explorer-list');
const dashboardLoadingOverlay = document.getElementById('dashboard-loading-overlay');
const loadingOverlayText = document.getElementById('loading-overlay-text');

// --- Helper Functions ---

function logToConsole(text, type = 'system') {
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
  consoleOutput.appendChild(line);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

// Global error logging for debugging client-side audio issues
window.addEventListener('error', (e) => {
  logToConsole(`[JS ERROR] ${e.message} at ${e.filename ? e.filename.split('/').pop() : 'inline'}:${e.lineno}`, 'system');
});
window.addEventListener('unhandledrejection', (e) => {
  logToConsole(`[PROMISE ERROR] ${e.reason}`, 'system');
});

// Adjust canvas size
function resizeCanvas() {
  canvas.width = canvas.parentElement.clientWidth;
  canvas.height = canvas.parentElement.clientHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// --- Codebase API Integration ---

async function fetchCodebaseData() {
  const customPath = scanPathInput.value.trim();
  let url = '/api/codebase';
  if (customPath) {
    url += `?path=${encodeURIComponent(customPath)}`;
  }
  
  logToConsole(`Requesting scan for target path: ${customPath || '[Default Workspaces]'}`, 'system');
  
  // Show spinner, disable scan button
  if (loadingOverlayText) loadingOverlayText.innerText = 'Scanning codebase files...';
  dashboardLoadingOverlay.classList.add('active');
  scanBtn.disabled = true;
  scanBtn.innerHTML = '<span class="spinner-sm"></span>Scanning...';
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `Server status ${response.status}`);
    }
    
    codebase = await response.json();
    
    // Auto-populate target input with resolved path
    if (codebase.workspacePath && !customPath) {
      scanPathInput.value = codebase.workspacePath;
    }
    
    updateUI(codebase);
    logToConsole('Codebase scan complete.', 'system');
    
    // Check if Gemini AI Mode is active and Key is provided
    const isGeminiMode = geminiModeToggle.checked;
    const apiKey = geminiKeyInput.value.trim();
    
    if (isGeminiMode && apiKey) {
      await fetchGeminiMusicDna(apiKey);
    } else {
      geminiDna = null;
      setupProceduralAudioParameters();
    }
  } catch (error) {
    console.error('Error fetching codebase data:', error);
    logToConsole(`Scan failed: ${error.message}. Using fallback simulation data.`, 'system');
    codebase = getMockData();
    updateUI(codebase);
    setupProceduralAudioParameters();
  } finally {
    // Hide spinner, restore scan button
    dashboardLoadingOverlay.classList.remove('active');
    scanBtn.disabled = false;
    scanBtn.innerText = 'Scan & Sync';
  }
}

async function fetchGeminiMusicDna(apiKey) {
  logToConsole('Connecting to Gemini AI for musical DNA composition...', 'system');
  if (loadingOverlayText) loadingOverlayText.innerText = 'AI Composing music DNA...';
  scanBtn.innerHTML = '<span class="spinner-sm"></span>Composing...';
  const temperature = parseFloat(geminiTempSlider.value);
  try {
    const response = await fetch('/api/gemini-mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: apiKey,
        codebaseData: codebase,
        temperature: temperature
      })
    });
    
    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Gemini API Error');
    }
    
    geminiDna = await response.json();
    logToConsole(`[GEMINI AI] Composer Note: "${geminiDna.explanation}"`, 'code');
    
    // Adapt synthesizers based on Gemini DNA
    setupProceduralAudioParameters();
  } catch (error) {
    console.error('Gemini composition failed:', error);
    logToConsole(`[GEMINI AI Error] ${error.message}. Falling back to default synthesizer.`, 'system');
    geminiDna = null;
    setupProceduralAudioParameters();
  }
}

function updateUI(data) {
  workspaceNameSpan.innerText = data.workspaceName;
  nowPlayingLang.innerText = (data.summary.mainLanguage || 'SYS').substring(0, 4).toUpperCase();
  
  // Dashboard Metrics
  document.getElementById('stat-files').innerText = data.summary.totalFiles;
  document.getElementById('stat-lines').innerText = data.summary.totalLines.toLocaleString();
  document.getElementById('stat-dirs').innerText = data.summary.directories;
  document.getElementById('stat-lang').innerText = data.summary.mainLanguage;
  
  // Language Breakdown Progress Bar
  const progressBar = document.getElementById('lang-progress-bar');
  const legendContainer = document.getElementById('lang-legend-container');
  
  progressBar.innerHTML = '';
  legendContainer.innerHTML = '';
  
  const sortedLangs = Object.entries(data.languages)
    .sort((a, b) => b[1].lines - a[1].lines)
    .filter(([_, info]) => info.files > 0);
  
  const totalLines = sortedLangs.reduce((acc, [_, info]) => acc + info.lines, 0) || 1;
  
  sortedLangs.forEach(([lang, info]) => {
    const pct = ((info.lines / totalLines) * 100).toFixed(1);
    const color = LANG_COLORS[lang] || LANG_COLORS.other;
    
    if (parseFloat(pct) > 0.5) {
      const segment = document.createElement('div');
      segment.className = 'progress-bar-segment';
      segment.style.width = `${pct}%`;
      segment.style.backgroundColor = color;
      segment.title = `${lang}: ${pct}%`;
      progressBar.appendChild(segment);
    }
    
    const legendItem = document.createElement('div');
    legendItem.className = 'legend-item';
    legendItem.innerHTML = `
      <span class="legend-dot" style="background-color: ${color}"></span>
      <span class="legend-name">${lang}</span>
      <span class="legend-val">${pct}% (${info.files} files)</span>
    `;
    legendContainer.appendChild(legendItem);
  });
  
  logToConsole(`Mapped ${sortedLangs.length} active languages into sound channels.`, 'code');
}

function getMockData() {
  return {
    workspaceName: "ros2_ws",
    summary: { totalFiles: 84, totalLines: 12450, directories: 18, mainLanguage: "python" },
    languages: {
      python: { files: 32, lines: 6800 },
      cpp: { files: 12, lines: 4100 },
      javascript: { files: 8, lines: 950 },
      markdown: { files: 6, lines: 600 },
      other: { files: 26, lines: 0 }
    },
    recentFiles: [
      { name: "talker_node.py", size: 2314, lines: 84, lang: "python" }
    ]
  };
}

// --- Sound Synthesizer Engine ---

function initializeAudio() {
  try {
    if (toneStarted) return;
    
    // Prevent CPU audio glitches by setting buffer latency hint to playback
    Tone.context.latencyHint = "playback";
    Tone.context.lookAhead = 0.15; // Increased schedule window for stutter-free playback
    
    limiter = new Tone.Limiter(-1).toDestination();
    mainFilter = new Tone.Filter(850, "lowpass").connect(limiter);
    
    reverb = new Tone.Reverb({ roomSize: 0.8, wet: 0.35 }).connect(mainFilter);
    delay = new Tone.FeedbackDelay("8n.", 0.25).connect(reverb);
    delay.wet.value = 0.25;

    analyser = new Tone.Analyser("fft", 256);
    mainFilter.connect(analyser);

    volAmbient = new Tone.Volume(-60).connect(mainFilter); // Muted by default to isolate synth audio
    volChords = new Tone.Volume(-10).connect(mainFilter);
    volBass = new Tone.Volume(-12).connect(mainFilter);
    bitcrusher = new Tone.BitCrusher(8).connect(delay);
    bitcrusher.wet.value = 0.0;
    volMelody = new Tone.Volume(-8).connect(bitcrusher);
    volDrums = new Tone.Volume(-8).connect(mainFilter);

    rainNoise = new Tone.Noise("pink");
    const rainFilter = new Tone.Filter(400, "lowpass").connect(volAmbient);
    rainNoise.connect(rainFilter);
    rainNoise.volume.value = -12;

    // LFO to create a organic, breathing wind sweep effect in the background
    rainLFO = new Tone.LFO(0.03, 200, 650).start();
    rainLFO.connect(rainFilter.frequency);

    // Bandpass filter to make white noise vinyl crackle sound warm and analog, avoiding harsh digital clicks
    const crackleFilter = new Tone.Filter({
      type: "bandpass",
      frequency: 1000,
      Q: 3
    }).connect(volAmbient);

    noiseSynth = new Tone.NoiseSynth({
      noise: { type: "white" },
      envelope: { attack: 0.001, decay: 0.005, sustain: 0 }
    }).connect(crackleFilter);

    synthPad = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 1.5, decay: 1.0, sustain: 0.7, release: 2.0 }
    }).connect(volChords);
    synthPad.set({ maxPolyphony: 6 }); // Prevent CPU overload from voice stacking

    synthBass = new Tone.MonoSynth({
      oscillator: { type: "sine" },
      filter: { Q: 1, type: "lowpass", frequency: 180 },
      envelope: { attack: 0.1, decay: 0.5, sustain: 0.8, release: 0.5 },
      filterEnvelope: { attack: 0.05, decay: 0.2, sustain: 0.5, baseFrequency: 100, octaves: 1 }
    }).connect(volBass);

    synthMelody = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "sine" },
      envelope: { attack: 0.05, decay: 0.8, sustain: 0.2, release: 1.5 }
    }).connect(volMelody);
    synthMelody.set({ maxPolyphony: 4 }); // Cap melody polyphony

    // Setup Arpeggiator volume and synth
    volArp = new Tone.Volume(-12).connect(delay);
    synthArp = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.01, decay: 0.15, sustain: 0.1, release: 0.4 }
    }).connect(volArp);
    synthArp.set({ maxPolyphony: 6 });

    // Setup Drum synths in global scope to prevent memory leaks on restart
    kickSynth = new Tone.MembraneSynth({
      envelope: { attack: 0.005, decay: 0.15, sustain: 0 }
    }).connect(volDrums);
    kickSynth.volume.value = -3;

    clapSynth = new Tone.NoiseSynth({
      noise: { type: "pink" },
      envelope: { attack: 0.001, decay: 0.08, sustain: 0 }
    }).connect(volDrums);
    clapSynth.volume.value = -12;

    hatSynth = new Tone.MetalSynth({
      envelope: { attack: 0.001, decay: 0.05, sustain: 0 }
    }).connect(volDrums);
    hatSynth.volume.value = -25;

    // Setup Mixer controls
    document.getElementById('vol-ambient').addEventListener('input', (e) => { volAmbient.volume.value = parseFloat(e.target.value); });
    document.getElementById('vol-chords').addEventListener('input', (e) => { volChords.volume.value = parseFloat(e.target.value); });
    document.getElementById('vol-bass').addEventListener('input', (e) => { volBass.volume.value = parseFloat(e.target.value); });
    document.getElementById('vol-melody').addEventListener('input', (e) => { volMelody.volume.value = parseFloat(e.target.value); });
    document.getElementById('vol-drums').addEventListener('input', (e) => { volDrums.volume.value = parseFloat(e.target.value); });
    document.getElementById('vol-arp').addEventListener('input', (e) => { volArp.volume.value = parseFloat(e.target.value); });

    toneStarted = true;
    logToConsole('Web Audio Engine & Synthesizers initialized.', 'system');
  } catch (err) {
    console.error('Audio initialization failed:', err);
    logToConsole(`[AUDIO ERROR] Init failed: ${err.message}`, 'system');
  }
}

// Global Note Transposition Helpers
const NOTE_SEMITONES = { 'C': 0, 'C#': 1, 'Db': 1, 'D': 2, 'D#': 3, 'Eb': 3, 'E': 4, 'F': 5, 'F#': 6, 'Gb': 6, 'G': 7, 'G#': 8, 'Ab': 8, 'A': 9, 'A#': 10, 'Bb': 10, 'B': 11 };
const SEMITONE_NOTES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

function transposeNote(noteStr, semitones) {
  if (!semitones) return noteStr;
  const match = noteStr.match(/^([A-G][b#]?)([0-9])$/i);
  if (!match) return noteStr;
  
  const pitchName = match[1];
  const octave = parseInt(match[2]);
  
  let formattedPitch = pitchName.charAt(0).toUpperCase() + pitchName.slice(1);
  let val = NOTE_SEMITONES[formattedPitch];
  if (val === undefined) return noteStr;
  
  let newVal = val + semitones;
  let newOctave = octave + Math.floor(newVal / 12);
  let noteIndex = ((newVal % 12) + 12) % 12;
  
  return `${SEMITONE_NOTES[noteIndex]}${newOctave}`;
}

function transposeChordName(name, semitones) {
  if (!semitones) return name;
  const match = name.match(/^([A-G][b#]?)(.*)$/i);
  if (!match) return name;
  
  const pitchName = match[1];
  const suffix = match[2];
  
  let formattedPitch = pitchName.charAt(0).toUpperCase() + pitchName.slice(1);
  let val = NOTE_SEMITONES[formattedPitch];
  if (val === undefined) return name;
  
  let newVal = val + semitones;
  let noteIndex = ((newVal % 12) + 12) % 12;
  
  return `${SEMITONE_NOTES[noteIndex]}${suffix}`;
}

// Music scales mapping
let notesScale = [];
let chordProgression = [];
let bassRootNotes = [];
let activeMode = 'minor';
let chordNamesList = [];

function setupProceduralAudioParameters() {
  if (!codebase) return;

  // Use Gemini DNA if loaded successfully
  if (geminiDna) {
    currentBpm = geminiDna.bpm || 72;
    notesScale = geminiDna.melodyScale || [];
    chordProgression = geminiDna.chords || [];
    bassRootNotes = geminiDna.bassRootNotes || [];
    chordNamesList = geminiDna.chordNames || [];
    activeMode = geminiDna.scale || 'minor';
    
    if (toneStarted) {
      Tone.Transport.bpm.rampTo(currentBpm, 1.2);
    } else {
      Tone.Transport.bpm.value = currentBpm;
    }
    liveBpmSpan.innerText = `${currentBpm} BPM`;
    logToConsole(`[GEMINI DNA LOADED] Chords: ${chordNamesList.join(', ')} | Tempo: ${currentBpm} BPM`, 'synth');

    // Apply Gemini Custom Synth Sound Design
    if (geminiDna.soundDesign && toneStarted) {
      const sd = geminiDna.soundDesign;
      
      // Pad chords settings
      if (sd.padOscillator) {
        synthPad.set({ oscillator: { type: sd.padOscillator } });
      }
      synthPad.set({
        envelope: {
          attack: sd.padAttack || 1.5,
          release: sd.padRelease || 2.0
        }
      });
      
      // Melody settings
      if (sd.melodyOscillator) {
        synthMelody.set({ oscillator: { type: sd.melodyOscillator } });
      }
      synthMelody.set({
        envelope: {
          attack: sd.melodyAttack || 0.05
        }
      });
      
      // FX settings
      if (bitcrusher) bitcrusher.wet.value = sd.bitcrusherWet ?? 0.0;
      if (reverb) reverb.wet.value = sd.reverbWet ?? 0.35;
      
      logToConsole(`[AI INSTRUMENTS] Pad Osc: ${sd.padOscillator} (atk: ${sd.padAttack}s) | Melody Osc: ${sd.melodyOscillator} | Crusher: ${(sd.bitcrusherWet*100).toFixed(0)}%`, 'synth');
    }
    return;
  }

  // Standard procedural fallback mapping
  const totalLines = codebase.summary.totalLines;
  const mainLang = codebase.summary.mainLanguage.toLowerCase();
  
  currentBpm = Math.max(65, Math.min(80, 62 + Math.floor(totalLines / 2000)));
  if (toneStarted) {
    Tone.Transport.bpm.rampTo(currentBpm, 1.2);
  } else {
    Tone.Transport.bpm.value = currentBpm;
  }
  liveBpmSpan.innerText = `${currentBpm} BPM`;

  // Simple hash based on folder path to pick from different progressions (avoids all projects sounding same)
  let hash = 0;
  const pathStr = codebase.workspacePath || '';
  for (let i = 0; i < pathStr.length; i++) {
    hash = pathStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const keyOffset = Math.abs(hash) % 12; // 12 different transpositions (keys)
  const progIndex = Math.abs(hash >> 2) % 8; // 8 different progression templates

  // Sound Design defaults
  let padOscillator = 'triangle';
  let padAttack = 1.5;
  let padRelease = 2.0;
  let melodyOscillator = 'sine';
  let melodyAttack = 0.05;
  let bitcrusherWet = 0.0;
  let reverbWet = 0.35;

  const jsInfo = codebase.languages.javascript || { files: 0 };
  const htmlInfo = codebase.languages.html || { files: 0 };
  const webDensity = (jsInfo.files + htmlInfo.files) / codebase.summary.totalFiles;

  if (mainLang === 'cpp' || mainLang === 'shell' || mainLang === 'other') {
    activeMode = 'minor';
    
    const minorProgs = [
      // Prog 0: Dm9 - Bbmaj9 - Am9 - C9 (i - VI - v - VII)
      {
        chords: [['D3', 'F3', 'A3', 'C4', 'E4'], ['Bb2', 'D3', 'F3', 'A3', 'C4'], ['A2', 'C3', 'E3', 'G3', 'B3'], ['C3', 'E3', 'G3', 'Bb3', 'D4']],
        names: ['Dm9', 'Bbmaj9', 'Am9', 'C9'],
        roots: ['D2', 'Bb1', 'A1', 'C2']
      },
      // Prog 1: Dm9 - Gm9 - C9 - Fmaj9 (i - iv - VII - III)
      {
        chords: [['D3', 'F3', 'A3', 'C4', 'E4'], ['G2', 'Bb3', 'D4', 'F4', 'A4'], ['C3', 'E3', 'G3', 'Bb3', 'D4'], ['F2', 'A3', 'C4', 'E4', 'G4']],
        names: ['Dm9', 'Gm9', 'C9', 'Fmaj9'],
        roots: ['D2', 'G1', 'C2', 'F1']
      },
      // Prog 2: Dm9 - C9 - Bbmaj9 - Am9 (i - VII - VI - v)
      {
        chords: [['D3', 'F3', 'A3', 'C4', 'E4'], ['C3', 'E3', 'G3', 'Bb3', 'D4'], ['Bb2', 'D3', 'F3', 'A3', 'C4'], ['A2', 'C3', 'E3', 'G3', 'B3']],
        names: ['Dm9', 'C9', 'Bbmaj9', 'Am9'],
        roots: ['D2', 'C2', 'Bb1', 'A1']
      },
      // Prog 3: Dm9 - Em7b5 - A7alt - Dm9 (i - ii° - V7 - i)
      {
        chords: [['D3', 'F3', 'A3', 'C4', 'E4'], ['E3', 'G3', 'Bb3', 'D4', 'F4'], ['A2', 'C#3', 'G3', 'Bb3', 'F4'], ['D3', 'F3', 'A3', 'C4', 'E4']],
        names: ['Dm9', 'Em7b5', 'A7alt', 'Dm9'],
        roots: ['D2', 'E2', 'A1', 'D2']
      },
      // Prog 4: Dm9 - Bbmaj7 - Gm9 - Asus7 (i - VI - iv - V7sus)
      {
        chords: [['D3', 'F3', 'A3', 'C4', 'E4'], ['Bb2', 'D3', 'F3', 'A3', 'D4'], ['G2', 'Bb3', 'D4', 'F4', 'A4'], ['A2', 'D3', 'E3', 'G3', 'C4']],
        names: ['Dm9', 'Bbmaj7', 'Gm9', 'Asus7'],
        roots: ['D2', 'Bb1', 'G1', 'A1']
      },
      // Prog 5: Dm9 - Cmaj7 - Bbmaj7 - A7alt (i - VII - VI - V7)
      {
        chords: [['D3', 'F3', 'A3', 'C4', 'E4'], ['C3', 'E3', 'G3', 'B3', 'E4'], ['Bb2', 'D3', 'F3', 'A3', 'D4'], ['A2', 'C#3', 'G3', 'Bb3', 'F4']],
        names: ['Dm9', 'Cmaj7', 'Bbmaj7', 'A7alt'],
        roots: ['D2', 'C2', 'Bb1', 'A1']
      },
      // Prog 6: Dm9 - Fmaj9 - Bbmaj9 - C9 (i - III - VI - VII)
      {
        chords: [['D3', 'F3', 'A3', 'C4', 'E4'], ['F2', 'A3', 'C4', 'E4', 'G4'], ['Bb2', 'D3', 'F3', 'A3', 'C4'], ['C3', 'E3', 'G3', 'Bb3', 'D4']],
        names: ['Dm9', 'Fmaj9', 'Bbmaj9', 'C9'],
        roots: ['D2', 'F2', 'Bb1', 'C2']
      },
      // Prog 7: Dm9 - G7 - Cmaj9 - Fmaj9 (ii - V - I - IV)
      {
        chords: [['D3', 'F3', 'A3', 'C4', 'E4'], ['G2', 'B3', 'D4', 'F4', 'B4'], ['C3', 'E3', 'G3', 'B3', 'D4'], ['F2', 'A3', 'C4', 'E4', 'G4']],
        names: ['Dm9', 'G7', 'Cmaj9', 'Fmaj9'],
        roots: ['D2', 'G1', 'C2', 'F1']
      }
    ];

    const chosen = minorProgs[progIndex];
    chordProgression = chosen.chords.map(chord => chord.map(note => transposeNote(note, keyOffset)));
    chordNamesList = chosen.names.map(name => transposeChordName(name, keyOffset));
    bassRootNotes = chosen.roots.map(note => transposeNote(note, keyOffset));
    notesScale = ['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5', 'F5'].map(note => transposeNote(note, keyOffset));

    const rootKeyName = transposeChordName('D', keyOffset);

    // C++ / Hardware Sound Design: Gritty analogue feel
    padOscillator = 'sawtooth'; // Rich, buzzy sawtooth (heavy filter will make it warm)
    padAttack = 2.2;
    padRelease = 3.0;
    melodyOscillator = 'triangle';
    melodyAttack = 0.08;
    bitcrusherWet = 0.2; // Subtle digital crunch
    reverbWet = 0.45;

    logToConsole(`Dominant tone: C++/Shell. Scale: ${rootKeyName} Minor Prog #${progIndex} (${chordNamesList.join(', ')}).`, 'synth');
    logToConsole('[SYNTH PATCH] Loaded heavy filtered Sawtooth pad with 12-bit sampler crunch.', 'synth');
  } else {
    activeMode = 'major';
    
    const majorProgs = [
      // Prog 0: Fmaj9 - G9 - Em9 - Am9 (IV - V - iii - vi)
      {
        chords: [['F2', 'A3', 'C4', 'E4', 'G4'], ['G2', 'B3', 'D4', 'F4', 'A4'], ['E2', 'G3', 'B3', 'D4', 'F4'], ['A2', 'C3', 'E3', 'G3', 'B3']],
        names: ['Fmaj9', 'G9', 'Em9', 'Am9'],
        roots: ['F1', 'G1', 'E1', 'A1']
      },
      // Prog 1: Cmaj9 - Am9 - Fmaj9 - G9 (I - vi - IV - V)
      {
        chords: [['C3', 'E3', 'G3', 'B3', 'D4'], ['A2', 'C3', 'E3', 'G3', 'B3'], ['F2', 'A3', 'C4', 'E4', 'G4'], ['G2', 'B3', 'D4', 'F4', 'A4']],
        names: ['Cmaj9', 'Am9', 'Fmaj9', 'G9'],
        roots: ['C2', 'A1', 'F1', 'G1']
      },
      // Prog 2: Fmaj9 - Fm9 - Cmaj9 - Cmaj9 (IV - iv - I - I)
      {
        chords: [['F2', 'A3', 'C4', 'E4', 'G4'], ['F2', 'Ab3', 'C4', 'Eb4', 'G4'], ['C3', 'E3', 'G3', 'B3', 'D4'], ['C3', 'E3', 'G3', 'B3', 'D4']],
        names: ['Fmaj9', 'Fm9', 'Cmaj9', 'Cmaj9'],
        roots: ['F1', 'F1', 'C2', 'C2']
      },
      // Prog 3: Fmaj9 - Bbmaj9 - G7 - C9 (I - IV - II7 - V)
      {
        chords: [['F2', 'A3', 'C4', 'E4', 'G4'], ['Bb2', 'D3', 'F3', 'A3', 'C4'], ['G2', 'B3', 'D4', 'F4', 'A4'], ['C3', 'E3', 'G3', 'Bb3', 'D4']],
        names: ['Fmaj9', 'Bbmaj9', 'G7', 'C9'],
        roots: ['F1', 'Bb1', 'G1', 'C2']
      },
      // Prog 4: Fmaj9 - Dm9 - Gm9 - C9 (I - vi - ii - V)
      {
        chords: [['F2', 'A3', 'C4', 'E4', 'G4'], ['D3', 'F3', 'A3', 'C4', 'E4'], ['G2', 'Bb3', 'D4', 'F4', 'A4'], ['C3', 'E3', 'G3', 'Bb3', 'D4']],
        names: ['Fmaj9', 'Dm9', 'Gm9', 'C9'],
        roots: ['F1', 'D2', 'G1', 'C2']
      },
      // Prog 5: Fmaj9 - A7 - Dm9 - G9 (I - VI7 - ii - V7)
      {
        chords: [['F2', 'A3', 'C4', 'E4', 'G4'], ['A2', 'C#3', 'G3', 'C#4', 'E4'], ['D3', 'F3', 'A3', 'C4', 'E4'], ['G2', 'B3', 'D4', 'F4', 'A4']],
        names: ['Fmaj9', 'A7', 'Dm9', 'G9'],
        roots: ['F1', 'A1', 'D2', 'G1']
      },
      // Prog 6: Fmaj9 - Ebmaj9 - Dbmaj9 - C9 (I - bVII - bVI - V)
      {
        chords: [['F2', 'A3', 'C4', 'E4', 'G4'], ['Eb2', 'G3', 'Bb3', 'D4', 'F4'], ['Db2', 'F3', 'Ab3', 'C4', 'Eb4'], ['C3', 'E3', 'G3', 'Bb3', 'D4']],
        names: ['Fmaj9', 'Ebmaj9', 'Dbmaj9', 'C9'],
        roots: ['F1', 'Eb1', 'Db1', 'C2']
      },
      // Prog 7: Fmaj9 - Gm9 - A7 - Dm9 (I - ii - III7 - vi)
      {
        chords: [['F2', 'A3', 'C4', 'E4', 'G4'], ['G2', 'Bb3', 'D4', 'F4', 'A4'], ['A2', 'C#3', 'G3', 'C#4', 'E4'], ['D3', 'F3', 'A3', 'C4', 'E4']],
        names: ['Fmaj9', 'Gm9', 'A7', 'Dm9'],
        roots: ['F1', 'G1', 'A1', 'D2']
      }
    ];

    const chosen = majorProgs[progIndex];
    chordProgression = chosen.chords.map(chord => chord.map(note => transposeNote(note, keyOffset)));
    chordNamesList = chosen.names.map(name => transposeChordName(name, keyOffset));
    bassRootNotes = chosen.roots.map(note => transposeNote(note, keyOffset));
    notesScale = ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5', 'C6', 'D6'].map(note => transposeNote(note, keyOffset));

    const rootKeyName = transposeChordName('F', keyOffset);

    // Web technologies vs Python Sound Design
    if (webDensity > 0.4) {
      padOscillator = 'square'; // Hollow, mellow square wave retro pad
      padAttack = 0.8;
      padRelease = 1.8;
      melodyOscillator = 'sine';
      melodyAttack = 0.03;
      bitcrusherWet = 0.0;
      reverbWet = 0.55; // Highly spacious delay wetness
      logToConsole(`Dominant tone: Web (HTML/JS/CSS). Scale: ${rootKeyName} Major Prog #${progIndex} (${chordNamesList.join(', ')}).`, 'synth');
      logToConsole('[SYNTH PATCH] Loaded hollow retro Square-wave pad with deep delay spacing.', 'synth');
    } else {
      padOscillator = 'triangle'; // Warm Rhodes keyboard look
      padAttack = 0.15; // Quick attack keys feel
      padRelease = 2.0;
      melodyOscillator = 'sine';
      melodyAttack = 0.01;
      bitcrusherWet = 0.0;
      reverbWet = 0.4;
      logToConsole(`Dominant tone: Python backend. Scale: ${rootKeyName} Major Prog #${progIndex} (${chordNamesList.join(', ')}).`, 'synth');
      logToConsole('[SYNTH PATCH] Loaded warm dynamic Triangle keyboard keys (Rhodes feel).', 'synth');
    }
  }

  // Apply Procedural Synth Sound Design to Synthesizers
  if (toneStarted) {
    synthPad.set({ oscillator: { type: padOscillator } });
    synthPad.set({
      envelope: {
        attack: padAttack,
        release: padRelease
      }
    });

    synthMelody.set({ oscillator: { type: melodyOscillator } });
    synthMelody.set({
      envelope: {
        attack: melodyAttack
      }
    });

    if (bitcrusher) bitcrusher.wet.value = bitcrusherWet;
    if (reverb) reverb.wet.value = reverbWet;

    // Adjust main filter brightness based on html/css files
    const validDensity = isNaN(webDensity) ? 0.0 : webDensity;
    mainFilter.frequency.value = 650 + (validDensity * 400);
  }
}

// Draw spectrum visualizer
function drawVisualizer() {
  requestAnimationFrame(drawVisualizer);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  if (!isPlaying || !analyser) {
    ctx.beginPath();
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.strokeStyle = 'rgba(161, 119, 255, 0.2)';
    ctx.lineWidth = 2;
    ctx.stroke();
    return;
  }
  
  const values = analyser.getValue();
  const bufferLength = values.length;
  ctx.shadowBlur = 10;
  ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
  
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, 0);
  gradient.addColorStop(0, '#a177ff');
  gradient.addColorStop(0.5, '#00f0ff');
  gradient.addColorStop(1, '#ff75b5');
  
  ctx.beginPath();
  ctx.lineWidth = 3;
  ctx.strokeStyle = gradient;
  
  const sliceWidth = canvas.width / bufferLength;
  let x = 0;
  
  for (let i = 0; i < bufferLength; i++) {
    const val = values[i];
    const percent = (val + 140) / 140;
    const y = canvas.height - (percent * canvas.height * 0.8) - (canvas.height * 0.1);
    
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
    x += sliceWidth;
  }
  ctx.lineTo(canvas.width, canvas.height / 2);
  ctx.stroke();
  ctx.shadowBlur = 0;
}
drawVisualizer();

// --- Sequencer Loops ---

function startSequencer() {
  let chordIndex = 0;
  let step = 0;

  // 1. Chords & Bass Trigger Loop
  chordLoop = new Tone.Loop((time) => {
    if (!chordProgression || chordProgression.length === 0) return;
    
    const notes = chordProgression[chordIndex % chordProgression.length];
    const bassRootList = bassRootNotes && bassRootNotes.length > 0 ? bassRootNotes : ['C2'];
    const bassNote = bassRootList[chordIndex % bassRootList.length];
    
    if (notes && notes.length > 0) {
      synthPad.triggerAttackRelease(notes, "1m", time, 0.4);
    }
    
    if (bassNote) {
      synthBass.triggerAttackRelease(bassNote, "2n", time, 0.5);
    }

    activeChordName = chordNamesList[chordIndex % chordNamesList.length] || 'Chord';
    const bassName = bassNote ? bassNote.substring(0, 2) : 'C';
    
    Tone.Draw.schedule(() => {
      liveChordSpan.innerText = activeChordName;
      logToConsole(`Chord Trigger: ${activeChordName} (Bass: ${bassName})`, 'synth');
    }, time);

    chordIndex = (chordIndex + 1) % chordProgression.length;
  }, "1m").start(0);

  // 2. Vinyl Crackle Loop
  vinylCrackLoop = new Tone.Loop((time) => {
    if (Math.random() < 0.6) {
      noiseSynth.triggerAttackRelease("16n", time, Math.random() * 0.05 + 0.01);
    }
  }, "8n").start(0);

  // 3. Drums Trigger Loop (References global synth variables)
  drumLoop = new Tone.Loop((time) => {
    const kickSteps = [0, 8, 10];
    const snareSteps = [4, 12];
    
    if (kickSteps.includes(step)) {
      if (kickSynth) kickSynth.triggerAttackRelease("C1", "8n", time, 0.8);
      Tone.Draw.schedule(() => {
        liveSynthSpan.innerText = 'Kick drum';
      }, time);
    }
    
    if (snareSteps.includes(step)) {
      if (clapSynth) clapSynth.triggerAttackRelease("16n", time, 0.7);
      Tone.Draw.schedule(() => {
        liveSynthSpan.innerText = 'Snare drum';
      }, time);
    }

    const pythonFilesCount = (codebase && codebase.languages && codebase.languages.python && codebase.languages.python.files) || 10;
    const cppFilesCount = (codebase && codebase.languages && codebase.languages.cpp && codebase.languages.cpp.files) || 10;
    
    const shouldPlayHat = step % 2 === 0 || (step % 4 === 1 && pythonFilesCount > cppFilesCount);
    if (shouldPlayHat && hatSynth) {
      const vel = 0.3 + Math.random() * 0.4;
      hatSynth.triggerAttackRelease("16n", time, vel);
    }

    step = (step + 1) % 16;
  }, "16n").start(0);

  // 4. Rhodes Melody Loop
  melodyLoop = new Tone.Loop((time) => {
    if (notesScale.length === 0) return;
    
    const mainLang = (codebase && codebase.summary && codebase.summary.mainLanguage) ? codebase.summary.mainLanguage.toLowerCase() : 'python';
    const prob = mainLang === 'python' || geminiDna ? 0.45 : 0.25;

    if (Math.random() < prob) {
      const note = notesScale[Math.floor(Math.random() * notesScale.length)];
      const velocity = 0.3 + Math.random() * 0.4;
      const duration = Math.random() < 0.5 ? "4n" : "2n";
      
      synthMelody.triggerAttackRelease(note, duration, time, velocity);
      
      Tone.Draw.schedule(() => {
        liveSynthSpan.innerText = `Rhodes: ${note}`;
        logToConsole(`Rhodes Note: ${note}`, 'synth');
      }, time);
    }
  }, "8n").start(0);

  // 5. Arpeggiator loop (Sparkles)
  let arpIndex = 0;
  arpLoop = new Tone.Loop((time) => {
    if (!chordProgression || chordProgression.length === 0) return;
    
    if (Math.random() < 0.4) {
      // Safely access current chord notes using chordIndex shared closure variable
      const activeChord = chordProgression[chordIndex % chordProgression.length];
      if (activeChord && activeChord.length > 0) {
        const baseNote = activeChord[arpIndex % activeChord.length];
        
        if (baseNote) {
          // Robust regex to split note name from octave and pitch up safely
          const match = baseNote.match(/^([A-G][b#]?)([0-9])$/i);
          if (match) {
            const noteName = match[1].charAt(0).toUpperCase() + match[1].slice(1);
            const baseOctave = parseInt(match[2]);
            const arpNote = `${noteName}${baseOctave + 1}`;
            
            synthArp.triggerAttackRelease(arpNote, "16n", time, 0.25);
          }
        }
        arpIndex++;
      }
    }
  }, "16n").start(0);
}

function stopSequencer() {
  if (chordLoop) chordLoop.dispose();
  if (drumLoop) drumLoop.dispose();
  if (melodyLoop) melodyLoop.dispose();
  if (vinylCrackLoop) vinylCrackLoop.dispose();
  if (arpLoop) arpLoop.dispose();
}

// --- Player Controls Event ---

async function togglePlayback() {
  try {
    initializeAudio();

    if (isPlaying) {
      Tone.Transport.pause();
      stopSequencer();
      if (rainNoise) rainNoise.stop();
      isPlaying = false;
      
      playBtn.innerHTML = '<span class="icon">▶</span> Play Codebase';
      playBtn.classList.remove('btn-primary');
      playBtn.classList.add('btn-primary');
      
      vinylDisc.classList.remove('playing');
      tonearm.classList.remove('playing');
      
      liveSynthSpan.innerText = 'Idle';
      liveChordSpan.innerText = 'None';
      logToConsole('Playback paused.', 'system');
    } else {
      await Tone.start();
      
      if (!codebase) {
        logToConsole('Codebase data not yet scanned. Loading default simulation music...', 'system');
        codebase = getMockData();
        updateUI(codebase);
      }
      
      logToConsole(`Audio Context State: ${Tone.context.state}`, 'system');
      
      setupProceduralAudioParameters();
      startSequencer();
      if (rainNoise) rainNoise.start();
      
      Tone.Transport.start();
      isPlaying = true;
      
      playBtn.innerHTML = '<span class="icon">⏸</span> Pause Music';
      playBtn.classList.remove('btn-primary');
      playBtn.classList.add('btn-primary');
      
      vinylDisc.classList.add('playing');
      tonearm.classList.add('playing');
      
      logToConsole('Playback started! Playing codebase soundtrack.', 'system');
    }
  } catch (err) {
    console.error('Playback toggle failed:', err);
    logToConsole(`[PLAYBACK ERROR] ${err.message}`, 'system');
  }
}

// Load configurations from localStorage if available
function loadSavedSettings() {
  const savedKey = localStorage.getItem('lofi_gemini_api_key');
  if (savedKey) {
    geminiKeyInput.value = savedKey;
  }
  const savedToggle = localStorage.getItem('lofi_gemini_mode_active');
  if (savedToggle === 'true') {
    geminiModeToggle.checked = true;
  }
  const savedTemp = localStorage.getItem('lofi_gemini_temperature');
  if (savedTemp) {
    geminiTempSlider.value = savedTemp;
    tempValSpan.innerText = savedTemp;
  }
}

// Save config when changed
geminiKeyInput.addEventListener('input', () => {
  localStorage.setItem('lofi_gemini_api_key', geminiKeyInput.value.trim());
});
geminiModeToggle.addEventListener('change', () => {
  localStorage.setItem('lofi_gemini_mode_active', geminiModeToggle.checked);
});
geminiTempSlider.addEventListener('input', () => {
  tempValSpan.innerText = geminiTempSlider.value;
  localStorage.setItem('lofi_gemini_temperature', geminiTempSlider.value);
});

// Event Listeners
playBtn.addEventListener('click', togglePlayback);
scanBtn.addEventListener('click', async () => {
  logToConsole('Initiating sync scan...', 'system');
  await fetchCodebaseData();
  logToConsole('Sync scan applied in real-time!', 'system');
});

// Trigger scan on Enter key press
scanPathInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    scanBtn.click();
  }
});


// Initial Scan on Load
window.addEventListener('load', () => {
  loadSavedSettings();
  fetchCodebaseData();
});

// Help Drawer Toggle Event Listeners
helpBtn.addEventListener('click', () => {
  helpDrawer.classList.add('open');
});
closeHelpBtn.addEventListener('click', () => {
  helpDrawer.classList.remove('open');
});

// --- Directory Explorer Navigation ---
let explorerPath = '/home/user';

async function loadDirectories(dirPath) {
  try {
    explorerCurrentPath.innerText = 'Loading...';
    explorerList.innerHTML = `
      <div class="explorer-loading">
        <div class="spinner-md"></div>
        <span>Loading folders...</span>
      </div>
    `;
    let url = `/api/browse?path=${encodeURIComponent(dirPath)}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Directory browse request failed');
    const data = await res.json();
    
    explorerPath = data.currentPath;
    explorerCurrentPath.innerText = data.currentPath;
    explorerList.innerHTML = '';
    
    // Parent Directory (📁 ..)
    if (data.parentPath) {
      const upItem = document.createElement('div');
      upItem.className = 'explorer-item parent-dir';
      upItem.innerHTML = '📁 .. (Up a level)';
      upItem.addEventListener('click', () => {
        loadDirectories(data.parentPath);
      });
      explorerList.appendChild(upItem);
    }
    
    // Subdirectories
    if (data.subdirs.length === 0) {
      const emptyItem = document.createElement('div');
      emptyItem.className = 'explorer-item';
      emptyItem.style.fontStyle = 'italic';
      emptyItem.style.color = 'var(--color-text-dim)';
      emptyItem.innerHTML = 'No subdirectories found';
      explorerList.appendChild(emptyItem);
    } else {
      data.subdirs.forEach(dir => {
        const item = document.createElement('div');
        item.className = 'explorer-item';
        item.innerHTML = `📁 ${dir}`;
        item.addEventListener('click', () => {
          const next = explorerPath === '/' ? `/${dir}` : `${explorerPath}/${dir}`;
          loadDirectories(next);
        });
        explorerList.appendChild(item);
      });
    }
  } catch (err) {
    console.error('Error loading directories:', err);
    explorerCurrentPath.innerText = 'Failed to load directory';
    explorerList.innerHTML = `
      <div class="explorer-loading" style="color: var(--accent-primary);">
        ⚠️ Failed to load folders
      </div>
    `;
  }
}

// Toggle folder explorer
browseBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  const isOpen = explorerDropdown.classList.toggle('open');
  if (isOpen) {
    const current = scanPathInput.value.trim() || '/home/user';
    loadDirectories(current);
  }
});

// Select folder button click
explorerSelectBtn.addEventListener('click', () => {
  scanPathInput.value = explorerPath;
  explorerDropdown.classList.remove('open');
  scanBtn.click(); // Trigger scan sync
});

// Close explorer dropdown if clicked outside
document.addEventListener('click', (e) => {
  if (explorerDropdown.classList.contains('open')) {
    if (!explorerDropdown.contains(e.target) && e.target !== browseBtn) {
      explorerDropdown.classList.remove('open');
    }
  }
});


