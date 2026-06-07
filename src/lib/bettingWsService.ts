import WebSocket from 'ws';
import { getSystemConfig } from './dbService';

let ws: WebSocket | null = null;

export async function initBettingWs() {
  const config = await getSystemConfig();
  if (!config.sproAgencyEnabled || !process.env.SPRO_AGENCY_WS_KEY) {
    console.log("SproAgency WebSocket disabled or key missing.");
    return;
  }

  const uri = `wss://spro.agency/api?key=${process.env.SPRO_AGENCY_WS_KEY}`;
  
  ws = new WebSocket(uri);

  ws.on('open', () => {
    console.log('Connected to SproAgency WebSocket');
    const subscribeMessage = {
        "action": "subscribe",
        "filters": {
            "sports": ["Brazil Serie A"],
            "markets": ["Moneyline", "Spread"]
        }
    };
    ws?.send(JSON.stringify(subscribeMessage));
  });

  ws.on('message', async (data: WebSocket.RawData) => {
    try {
      const msg = JSON.parse(data.toString());
      if (!Array.isArray(msg)) return;

      for (const actionData of msg) {
        if (actionData.action === 'game_update' || actionData.action === 'game_added') {
            // Map actionData to Match type and call addOrUpdateMatch
            // For now, logging to indicate flow
            console.log("Game update received:", actionData.action);
        } else if (actionData.action === 'game_removed') {
            // Call removeMatch
            console.log("Game removed received");
        }
        // ... handle other actions
      }
    } catch (e) {
      console.error("Error parsing WebSocket message:", e);
    }
  });

  ws.on('close', () => {
    console.log('SproAgency WebSocket closed. Reconnecting in 5s...');
    setTimeout(initBettingWs, 5000);
  });

  ws.on('error', (err) => {
    console.error('SproAgency WebSocket error:', err);
  });
}
