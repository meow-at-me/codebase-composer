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
let limiter, mainFilter, delay, reverb;
let synthPad, synthBass, synthMelody, noiseSynth, rainNoise;
let volAmbient, volChords, volBass, volMelody, volDrums;
let analyser;

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

const helpBtn = document.getElementById('help-btn');
const helpDrawer = document.getElementById('help-drawer');
const closeHelpBtn = document.getElementById('close-help-btn');

const browseBtn = document.getElementById('browse-btn');
const explorerDropdown = document.getElementById('explorer-dropdown');
const explorerCurrentPath = document.getElementById('explorer-current-path');
const explorerSelectBtn = document.getElementById('explorer-select-btn');
const explorerList = document.getElementById('explorer-list');

// --- Helper Functions ---

function logToConsole(text, type = 'system') {
  const line = document.createElement('div');
  line.className = `log-line ${type}`;
  line.innerText = `[${new Date().toLocaleTimeString()}] ${text}`;
  consoleOutput.appendChild(line);
  consoleOutput.scrollTop = consoleOutput.scrollHeight;
}

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
    logToConsole('Scan failed. Using fallback simulation data.', 'system');
    codebase = getMockData();
    updateUI(codebase);
    setupProceduralAudioParameters();
  }
}

async function fetchGeminiMusicDna(apiKey) {
  logToConsole('Connecting to Gemini AI for musical DNA composition...', 'system');
  try {
    const response = await fetch('/api/gemini-mood', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        apiKey: apiKey,
        codebaseData: codebase
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
  volMelody = new Tone.Volume(-8).connect(delay);
  volDrums = new Tone.Volume(-8).connect(mainFilter);

  rainNoise = new Tone.Noise("pink");
  const rainFilter = new Tone.Filter(400, "lowpass").connect(volAmbient);
  rainNoise.connect(rainFilter);
  rainNoise.volume.value = -12;

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

  // Setup Mixer controls
  document.getElementById('vol-ambient').addEventListener('input', (e) => { volAmbient.volume.value = parseFloat(e.target.value); });
  document.getElementById('vol-chords').addEventListener('input', (e) => { volChords.volume.value = parseFloat(e.target.value); });
  document.getElementById('vol-bass').addEventListener('input', (e) => { volBass.volume.value = parseFloat(e.target.value); });
  document.getElementById('vol-melody').addEventListener('input', (e) => { volMelody.volume.value = parseFloat(e.target.value); });
  document.getElementById('vol-drums').addEventListener('input', (e) => { volDrums.volume.value = parseFloat(e.target.value); });

  toneStarted = true;
  logToConsole('Web Audio Engine & Synthesizers initialized.', 'system');
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
    
    Tone.Transport.bpm.value = currentBpm;
    liveBpmSpan.innerText = `${currentBpm} BPM`;
    logToConsole(`[GEMINI DNA LOADED] Chords: ${chordNamesList.join(', ')} | Tempo: ${currentBpm} BPM`, 'synth');
    return;
  }

  // Standard procedural fallback mapping
  const totalLines = codebase.summary.totalLines;
  const mainLang = codebase.summary.mainLanguage.toLowerCase();
  
  currentBpm = Math.max(65, Math.min(80, 62 + Math.floor(totalLines / 2000)));
  Tone.Transport.bpm.value = currentBpm;
  liveBpmSpan.innerText = `${currentBpm} BPM`;

  if (mainLang === 'cpp' || mainLang === 'shell' || mainLang === 'other') {
    activeMode = 'minor';
    notesScale = ['D4', 'E4', 'F4', 'G4', 'A4', 'Bb4', 'C5', 'D5', 'E5', 'F5'];
    chordProgression = [
      ['D3', 'F3', 'A3', 'C4', 'E4'], // Dm9
      ['Bb2', 'D3', 'F3', 'A3', 'C4'], // Bbmaj9
      ['A2', 'C3', 'E3', 'G3', 'B3'], // Am9
      ['C3', 'E3', 'G3', 'Bb3', 'D4']  // C9
    ];
    chordNamesList = ['Dm9', 'BbMaj9', 'Am9', 'C9'];
    bassRootNotes = ['D2', 'Bb1', 'A1', 'C2'];
    logToConsole('Dominant tone: C++/Shell. Scale set to D Minor (Moody).', 'synth');
  } else {
    activeMode = 'major';
    notesScale = ['F4', 'G4', 'A4', 'C5', 'D5', 'F5', 'G5', 'A5', 'C6', 'D6'];
    chordProgression = [
      ['F2', 'A3', 'C4', 'E4', 'G4'],  // Fmaj9
      ['G2', 'B3', 'D4', 'F4', 'A4'],  // G9
      ['E2', 'G3', 'B3', 'D4', 'F4'],  // Em9
      ['A2', 'C3', 'E3', 'G3', 'B3']   // Am9
    ];
    chordNamesList = ['Fmaj9', 'G9', 'Em9', 'Am9'];
    bassRootNotes = ['F1', 'G1', 'E1', 'A1'];
    logToConsole('Dominant tone: Python/Web technologies. Scale set to F Major (Jazzy).', 'synth');
  }

  if (toneStarted) {
    const jsInfo = codebase.languages.javascript || { files: 0 };
    const htmlInfo = codebase.languages.html || { files: 0 };
    const webDensity = (jsInfo.files + htmlInfo.files) / codebase.summary.totalFiles;
    mainFilter.frequency.value = 650 + (webDensity * 400);
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
    if (chordProgression.length === 0) return;
    
    const notes = chordProgression[chordIndex % chordProgression.length];
    const bassNote = bassRootNotes[chordIndex % bassRootNotes.length];
    
    synthPad.triggerAttackRelease(notes, "1m", time, 0.4);
    synthBass.triggerAttackRelease(bassNote, "2n", time, 0.5);

    activeChordName = chordNamesList[chordIndex % chordNamesList.length] || 'Chord';
    
    Tone.Draw.schedule(() => {
      liveChordSpan.innerText = activeChordName;
      logToConsole(`Chord Trigger: ${activeChordName} (Bass: ${bassNote.substring(0,2)})`, 'synth');
    }, time);

    chordIndex = (chordIndex + 1) % chordProgression.length;
  }, "1m").start(0);

  // 2. Vinyl Crackle Loop
  vinylCrackLoop = new Tone.Loop((time) => {
    if (Math.random() < 0.6) {
      noiseSynth.triggerAttackRelease("16n", time, Math.random() * 0.05 + 0.01);
    }
  }, "8n").start(0);

  // 3. Drums Trigger Loop
  const kickSynth = new Tone.MembraneSynth({
    envelope: { attack: 0.005, decay: 0.15, sustain: 0 }
  }).connect(volDrums);
  kickSynth.volume.value = -3;

  const clapSynth = new Tone.NoiseSynth({
    noise: { type: "pink" },
    envelope: { attack: 0.001, decay: 0.08, sustain: 0 }
  }).connect(volDrums);
  clapSynth.volume.value = -12;

  const hatSynth = new Tone.MetalSynth({
    envelope: { attack: 0.001, decay: 0.05, sustain: 0 }
  }).connect(volDrums);
  hatSynth.volume.value = -25;

  drumLoop = new Tone.Loop((time) => {
    const kickSteps = [0, 8, 10];
    const snareSteps = [4, 12];
    
    if (kickSteps.includes(step)) {
      kickSynth.triggerAttackRelease("C1", "8n", time, 0.8);
      Tone.Draw.schedule(() => {
        liveSynthSpan.innerText = 'Kick drum';
      }, time);
    }
    
    if (snareSteps.includes(step)) {
      clapSynth.triggerAttackRelease("16n", time, 0.7);
      Tone.Draw.schedule(() => {
        liveSynthSpan.innerText = 'Snare drum';
      }, time);
    }

    const pythonFilesCount = (codebase.languages.python && codebase.languages.python.files) || 10;
    const cppFilesCount = (codebase.languages.cpp && codebase.languages.cpp.files) || 10;
    
    const shouldPlayHat = step % 2 === 0 || (step % 4 === 1 && pythonFilesCount > cppFilesCount);
    if (shouldPlayHat) {
      const vel = 0.3 + Math.random() * 0.4;
      hatSynth.triggerAttackRelease("16n", time, vel);
    }

    step = (step + 1) % 16;
  }, "16n").start(0);

  // 4. Rhodes Melody Loop
  melodyLoop = new Tone.Loop((time) => {
    if (notesScale.length === 0) return;
    
    const mainLang = codebase.summary.mainLanguage.toLowerCase();
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
}

function stopSequencer() {
  if (chordLoop) chordLoop.dispose();
  if (drumLoop) drumLoop.dispose();
  if (melodyLoop) melodyLoop.dispose();
  if (vinylCrackLoop) vinylCrackLoop.dispose();
}

// --- Player Controls Event ---

async function togglePlayback() {
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
}

// Save config when changed
geminiKeyInput.addEventListener('input', () => {
  localStorage.setItem('lofi_gemini_api_key', geminiKeyInput.value.trim());
});
geminiModeToggle.addEventListener('change', () => {
  localStorage.setItem('lofi_gemini_mode_active', geminiModeToggle.checked);
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
    explorerCurrentPath.innerText = 'Loading folders...';
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


