#!/usr/bin/env node
/*
 * Saw Board — entry point. Starts the local board server for the current project.
 *
 *   node .saw/board.mjs            (or: npm run board)
 *   node .saw/board.mjs --port 5000
 *
 * The interesting code lives next to this file:
 *   .saw/server/server.mjs   HTTP server + routes
 *   .saw/server/state.mjs    reads .workflow/ into the board state
 *   .saw/ui/                 index.html · styles.css · app.js   (edit these freely)
 */
import { start } from './server/server.mjs';

const args = process.argv.slice(2);
const port = Number(args.includes('--port') ? args[args.indexOf('--port') + 1] : process.env.SAW_BOARD_PORT || 4173);

start(process.cwd(), port);
