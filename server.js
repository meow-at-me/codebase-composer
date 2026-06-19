const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Directories to ignore during scan
const IGNORE_DIRS = new Set([
  'node_modules', '.git', '.cache', 'build', 'install', 'log', 'devel',
  '.ros', '.conda', '.miniforge3', '.local', '__pycache__', '.gemini',
  '.agents', '.claude', '.copilot', '.vscode-server', '.vscode-remote-containers',
  '.npm', '.ssh', '.dotnet', '.fzf', '.mamba', '.dotfiles', '.dotfiles.bak.1778813226'
]);

// Map extensions to language names
const EXT_MAP = {
  '.py': 'python',
  '.cpp': 'cpp',
  '.hpp': 'cpp',
  '.h': 'cpp',
  '.cc': 'cpp',
  '.c': 'cpp',
  '.js': 'javascript',
  '.jsx': 'javascript',
  '.ts': 'typescript',
  '.tsx': 'typescript',
  '.html': 'html',
  '.css': 'css',
  '.md': 'markdown',
  '.json': 'json',
  '.xml': 'xml',
  '.yaml': 'yaml',
  '.yml': 'yaml',
  '.sh': 'shell'
};

function scanWorkspace(dirPath, rootDir = dirPath) {
  let stats = {
    summary: {
      totalFiles: 0,
      totalLines: 0,
      directories: 0,
      mainLanguage: 'unknown'
    },
    languages: {},
    recentFiles: []
  };

  try {
    function traverse(currentDir) {
      if (!fs.existsSync(currentDir)) return;
      const items = fs.readdirSync(currentDir, { withFileTypes: true });
      
      for (const item of items) {
        if (IGNORE_DIRS.has(item.name)) continue;
        
        const fullPath = path.join(currentDir, item.name);
        
        if (item.isDirectory()) {
          stats.summary.directories++;
          traverse(fullPath);
        } else if (item.isFile()) {
          stats.summary.totalFiles++;
          
          const ext = path.extname(item.name).toLowerCase();
          const lang = EXT_MAP[ext] || 'other';
          
          let lineCount = 0;
          let fileStats;
          try {
            fileStats = fs.statSync(fullPath);
            if (lang !== 'other' && fileStats.size < 1024 * 1024) { 
              const content = fs.readFileSync(fullPath, 'utf8');
              lineCount = content.split('\n').length;
            }
          } catch (e) {
            // Ignore read errors
          }
          
          stats.summary.totalLines += lineCount;
          
          if (!stats.languages[lang]) {
            stats.languages[lang] = { files: 0, lines: 0 };
          }
          stats.languages[lang].files++;
          stats.languages[lang].lines += lineCount;
          
          stats.recentFiles.push({
            name: item.name,
            relPath: path.relative(rootDir, fullPath),
            size: fileStats ? fileStats.size : 0,
            lines: lineCount,
            lang: lang,
            mtime: fileStats ? fileStats.mtime : new Date()
          });
        }
      }
    }
    
    traverse(dirPath);
    
    stats.recentFiles.sort((a, b) => b.mtime - a.mtime);
    stats.recentFiles = stats.recentFiles.slice(0, 15);
    
    let maxLines = -1;
    let mainLang = 'none';
    for (const [lang, data] of Object.entries(stats.languages)) {
      if (data.lines > maxLines && lang !== 'other') {
        maxLines = data.lines;
        mainLang = lang;
      }
    }
    stats.summary.mainLanguage = mainLang;
    
  } catch (err) {
    console.error('Error scanning workspace:', err);
  }
  
  return stats;
}

// Scans the workspace directory
app.get('/api/codebase', (req, res) => {
  // Check if scanning a specific directory passed in query
  const targetDir = req.query.path ? path.resolve(req.query.path) : path.dirname(__dirname);
  const codebaseData = scanWorkspace(targetDir);
  codebaseData.workspaceName = path.basename(targetDir);
  codebaseData.workspacePath = targetDir;
  res.json(codebaseData);
});

// Gemini AI Music DNA Generation Endpoint
app.post('/api/gemini-mood', async (req, res) => {
  const { apiKey, codebaseData } = req.body;
  const key = apiKey || process.env.GEMINI_API_KEY;

  if (!key) {
    return res.status(400).json({ error: 'Gemini API Key is required.' });
  }

  const promptText = `You are an expert sound designer and coder. Analyze this codebase statistics:
Workspace Name: ${codebaseData.workspaceName}
Total Files: ${codebaseData.summary.totalFiles}
Total Lines: ${codebaseData.summary.totalLines}
Directories Count: ${codebaseData.summary.directories}
Dominant Language: ${codebaseData.summary.mainLanguage}
Language Breakdown: ${JSON.stringify(codebaseData.languages)}
Recent Files Updated: ${JSON.stringify(codebaseData.recentFiles.slice(0, 5).map(f => ({ name: f.name, lines: f.lines, lang: f.lang })))}

Generate a JSON object representing the Lo-Fi Music DNA for this codebase. The scale must be "minor" or "major". The chords must be a 4-chord progression, with each chord having exactly 5 notes (voicing for Rhodes/Pad). Ensure the notes are valid MIDI scientific pitch notations like D2, F3, A3, C4, E4, etc.
Output ONLY the raw JSON block matching this typescript definition:
interface MusicDNA {
  bpm: number; // 60 to 80
  scale: 'minor' | 'major';
  key: string; // e.g. "D", "F", "A", "C"
  chords: string[][]; // Array of 4 arrays. Each contains 5 note strings, e.g. [["D2", "F3", "A3", "C4", "E4"], ...]
  chordNames: string[]; // 4 chord name strings, e.g. ["Dm9", "Bbmaj9", "Am9", "C9"]
  bassRootNotes: string[]; // 4 bass root notes, e.g. ["D1", "Bb1", "A1", "C2"]
  melodyScale: string[]; // 8-10 notes of the pentatonic/natural scale for melody generation, e.g. ["D4", "E4", "F4", "A4", "C5", "D5"]
  explanation: string; // Brief poetic description explaining how this music maps to their codebase's character.
}
Do not wrap it in markdown. Just return the JSON object.`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${key}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: promptText
          }]
        }],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API returned status ${response.status}: ${errText}`);
    }

    const data = await response.json();
    const responseText = data.candidates[0].content.parts[0].text;
    const musicDna = JSON.parse(responseText.trim());
    res.json(musicDna);

  } catch (error) {
    console.error('Error generating Gemini music DNA:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Lo-Fi Codebase Synthesizer Server running on http://localhost:${PORT}`);
});
