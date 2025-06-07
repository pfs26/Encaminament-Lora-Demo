import asyncio
import json
from typing import List, Dict, Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Request, HTTPException
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse

# --- Connection Manager for WebSockets ---
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Client connected: {websocket.client}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"Client disconnected: {websocket.client}")

    async def broadcast(self, data: dict):
        if not self.active_connections:
            print("No active WebSocket connections to broadcast to.")
            return

        # Use asyncio.gather for concurrent sending and error handling
        tasks = [connection.send_json(data) for connection in self.active_connections]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                # Handle error, e.g., client disconnected abruptly
                print(f"Error sending to client {self.active_connections[i].client}: {result}")
                # Optionally, try to remove the problematic connection if not already handled by disconnect
                # self.disconnect(self.active_connections[i]) # Be careful if list modified during iteration
manager = ConnectionManager()
app = FastAPI()

# --- Serve Static Files (Frontend UI) ---
app.mount("/static", StaticFiles(directory="static", html=True), name="static")

@app.get("/", response_class=HTMLResponse)
async def get_root():
    # Serve the main HTML page
    try:
        with open("static/index.html") as f:
            return HTMLResponse(content=f.read(), status_code=200)
    except FileNotFoundError:
        raise HTTPException(status_code=404, detail="index.html not found")


# --- TTN Webhook Endpoint ---
@app.post("/webhook/ttn")
async def ttn_webhook(request: Request):
    try:
        uplink_message = await request.json()
        print("TTN Webhook Received:")
        print(json.dumps(uplink_message, indent=2))

        # Adjust this path based on your actual TTN payload structure
        # Common path: uplink_message.uplink_message.decoded_payload
        decoded_payload = uplink_message.get("uplink_message", {}).get("decoded_payload")

        if decoded_payload is not None: # Check for None explicitly, as {} is a valid payload
            print(f"Broadcasting decoded payload: {decoded_payload}")
            await manager.broadcast({"type": "ttn_data", "payload": decoded_payload})
            return {"status": "Webhook received successfully", "data_broadcasted": True}
        else:
            print("No decoded payload found or payload is null.")
            # TTN might expect a 200 OK even if payload is not what we want
            return {"status": "Webhook received, but no relevant decoded payload found", "data_broadcasted": False}

    except json.JSONDecodeError:
        print("Error decoding JSON from TTN webhook")
        raise HTTPException(status_code=400, detail="Invalid JSON payload")
    except Exception as e:
        print(f"Error processing TTN webhook: {e}")
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")

# --- WebSocket Endpoint ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        await websocket.send_json({"message": "Welcome to the WebSocket server!"})
        while True:
            # Keep the connection alive by waiting for messages (or use a periodic ping)
            # For this MVP, we mainly broadcast from server to client.
            # If client sends data, it will be received here:
            data = await websocket.receive_text()
            print(f"Received from {websocket.client}: {data}") # Log or handle client messages
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error for {websocket.client}: {e}")
        manager.disconnect(websocket) # Ensure disconnect on other errors

# --- Uvicorn runner (for PaaS, use their start command) ---
# If __name__ == "__main__":
# import uvicorn
# PaaS like Render will use a command like:
# uvicorn main:app --host 0.0.0.0 --port $PORT
# For local testing:
# uvicorn.run(app, host="0.0.0.0", port=8000)