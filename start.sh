#!/bin/bash
# Start the backend API server in background
cd /home/runner/workspace/server && node src/index.js &
SERVER_PID=$!

# Wait for server to start
sleep 2

# Start the frontend Vite dev server
cd /home/runner/workspace/client && npm run dev
