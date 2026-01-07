
import http from 'http';
import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import url from 'url';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Allow environment port or default to 3001
const PORT = process.env.PORT || 3001;
const DB_FILE = path.join(__dirname, 'database.json');
const VOICE_ASSETS_DIR = path.join(__dirname, 'voice_assets');
const DIST_DIR = path.join(__dirname, 'dist'); // Production build folder

// Mime Type Lookup
const getMimeType = (ext) => {
  const map = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.wav': 'audio/wav',
    '.mp3': 'audio/mpeg',
    '.ogg': 'audio/ogg'
  };
  return map[ext] || 'application/octet-stream';
};

// WebSocket Server
let appState = null;
let saveTimeout = null;

// Debounced Save Function
// RPi Optimization: Reduces disk I/O operations by 90%
const scheduleSave = () => {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (appState) {
        fs.writeFile(DB_FILE, JSON.stringify(appState, null, 2), (err) => {
            if (err) console.error("Error saving DB:", err);
            else console.log("Database saved to disk.");
        });
    }
  }, 2000); // Reduced to 2 seconds for faster persistence
};

try {
  if (fs.existsSync(DB_FILE)) {
    appState = JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
    console.log('Database loaded.');
  }
} catch (e) { console.error('Database load error:', e); }

const server = http.createServer((req, res) => {
  const parsedUrl = url.parse(req.url);
  let pathname = parsedUrl.pathname;

  // 0. API Endpoint for Polling (Fallback Mechanism)
  if (pathname === '/api/state') {
    res.writeHead(200, { 
      'Content-Type': 'application/json', 
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache'
    });
    res.end(JSON.stringify(appState || {})); 
    return;
  }

  // 1. Audio Assets
  if (pathname.startsWith('/voice/')) {
    const safePath = path.normalize(pathname.replace('/voice/', '')).replace(/^(\.\.[\/\\])+/, '');
    const filePath = path.join(VOICE_ASSETS_DIR, safePath);
    
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Audio not found');
      } else {
        res.writeHead(200, { 
          'Content-Type': getMimeType(path.extname(filePath).toLowerCase()),
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'public, max-age=3600' 
        });
        res.end(data);
      }
    });
    return;
  }

  // 2. Serve React Frontend (Production Build)
  // Default to index.html if in root
  if (pathname === '/') pathname = '/index.html';

  let filePath = path.join(DIST_DIR, pathname);
  
  // Check if file exists, if not, serve index.html (SPA Fallback)
  fs.access(filePath, fs.constants.F_OK, (err) => {
    if (err) {
      // If file not found, serve index.html for client-side routing
      filePath = path.join(DIST_DIR, 'index.html');
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        // Build folder likely missing
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Server Error: "dist" folder not found. Please run "npm run build" to compile the application.');
      } else {
        const ext = path.extname(filePath).toLowerCase();
        res.writeHead(200, { 'Content-Type': getMimeType(ext) });
        res.end(data);
      }
    });
  });
});

const wss = new WebSocketServer({ server });

// Ensure directories
if (!fs.existsSync(VOICE_ASSETS_DIR)) fs.mkdirSync(VOICE_ASSETS_DIR);
if (!fs.existsSync(path.join(VOICE_ASSETS_DIR, 'numbers'))) fs.mkdirSync(path.join(VOICE_ASSETS_DIR, 'numbers'));

wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });

  // Immediate sync on connect
  if (appState) ws.send(JSON.stringify({ type: 'SYNC', payload: appState }));

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);
      
      if (data.type === 'PING') {
          ws.send(JSON.stringify({ type: 'PONG' }));
          return;
      }

      if (data.type === 'SYNC') {
        const incoming = data.payload;
        
        // CONFLICT RESOLUTION:
        // Use strictly increasing dataVersion to resolve conflicts.
        if (appState && appState.dataVersion && incoming.dataVersion) {
            // REJECT Stale Update: If server has V10, and client sends V0 or V5, ignore.
            if (incoming.dataVersion < appState.dataVersion) {
                // Force sync back to this client so they get up to date
                ws.send(JSON.stringify({ type: 'SYNC', payload: appState }));
                return;
            }
        }
        
        appState = incoming;
        
        // Trigger Debounced Save
        scheduleSave();
        
        // Broadcast to ALL connected clients (including sender)
        // This ensures the "Server State" is the single source of truth for everyone.
        const broadcastMsg = JSON.stringify({ type: 'SYNC', payload: appState });
        wss.clients.forEach(client => {
          if (client.readyState === 1) { // WebSocket.OPEN
            client.send(broadcastMsg);
          }
        });
      } else if (data.type === 'REQUEST_SYNC') {
        if (appState) ws.send(JSON.stringify({ type: 'SYNC', payload: appState }));
        else ws.send(JSON.stringify({ type: 'SYNC_EMPTY' }));
      }
    } catch (e) { console.error('WS Error:', e); }
  });
});

// Keep-alive heartbeat
setInterval(() => {
  wss.clients.forEach(ws => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n==================================================`);
  console.log(` CMH Quetta QMS - Server Online (RPi Optimized)`);
  console.log(`--------------------------------------------------`);
  console.log(` > Access App:   http://localhost:${PORT}`);
  console.log(` > LAN Access:   http://[YOUR_IP_ADDRESS]:${PORT}`);
  console.log(`==================================================\n`);
});
