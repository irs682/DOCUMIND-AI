const mongoose = require('mongoose');
const net = require('net');
const path = require('path');
const os = require('os');
const fs = require('fs');
const { spawn } = require('child_process');

let retryTimer = null;

const checkPort = (port, host = '127.0.0.1') =>
  new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(1200);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, host);
  });

const tryStartLocalMongod = async () => {
  try {
    const possiblePaths = [
      'C:\\Program Files\\MongoDB\\Server\\8.2\\bin\\mongod.exe',
      'C:\\Program Files\\MongoDB\\Server\\8.0\\bin\\mongod.exe',
      'C:\\Program Files\\MongoDB\\Server\\7.0\\bin\\mongod.exe',
      'C:\\Program Files\\MongoDB\\Server\\6.0\\bin\\mongod.exe',
      'mongod.exe',
    ];

    let mongodExe = possiblePaths.find((p) => fs.existsSync(p));
    if (!mongodExe) return false;

    const userHome = process.env.USERPROFILE || process.env.HOME || os.homedir();
    const dataDir = path.join(userHome, '.documind', 'mongodb_data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    console.log(`[MongoDB] Starting background mongod instance from ${mongodExe}...`);
    const child = spawn(mongodExe, ['--dbpath', dataDir, '--port', '27017'], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true,
    });
    child.unref();

    await new Promise((r) => setTimeout(r, 2000));
    return true;
  } catch (err) {
    console.warn(`[MongoDB] Could not auto-launch mongod: ${err.message}`);
    return false;
  }
};

const connectDB = async () => {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/document-ai';

  try {
    // If targeting localhost:27017, verify port is reachable or try starting mongod
    if (uri.includes('127.0.0.1:27017') || uri.includes('localhost:27017')) {
      const isListening = await checkPort(27017, '127.0.0.1');
      if (!isListening) {
        await tryStartLocalMongod();
      }
    }

    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected: ${conn.connection.host}`);
    if (retryTimer) {
      clearInterval(retryTimer);
      retryTimer = null;
    }
    return true;
  } catch (error) {
    console.warn(`[MongoDB] Connection error (${error.message}). Operating with in-memory persistence fallback.`);

    if (!retryTimer) {
      retryTimer = setInterval(async () => {
        try {
          if (mongoose.connection.readyState === 1) {
            clearInterval(retryTimer);
            retryTimer = null;
            return;
          }
          await mongoose.connect(uri, { serverSelectionTimeoutMS: 3000 });
          console.log(`[MongoDB] Background reconnection successful.`);
          clearInterval(retryTimer);
          retryTimer = null;
        } catch (_) {}
      }, 5000);
      if (retryTimer.unref) retryTimer.unref();
    }
    return false;
  }
};

const getMongoHealth = () => {
  const state = mongoose.connection.readyState;
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return {
    status: state === 1 ? 'ready' : (state === 2 ? 'connecting' : 'disconnected'),
    state: states[state] || 'unknown',
    readyState: state,
    host: mongoose.connection.host || null,
    name: mongoose.connection.name || null,
  };
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.getMongoHealth = getMongoHealth;
