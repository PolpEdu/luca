import asyncio
import websockets
from services.transcription_service import TranscriptionService, AudioChunk
import json


class WebSocketManager:
    def __init__(self):
        self.transcription_services = {}

    def reset_all(self):
        for service in self.transcription_services.values():
            service.reset_sync()
        self.transcription_services.clear()

    async def handle_client(self, websocket, path):
        client_id = id(websocket)
        self.transcription_services[client_id] = TranscriptionService()

        try:
            async for message in websocket:
                try:
                    data = json.loads(message)

                    if data["type"] == "audio":
                        chunk = AudioChunk(
                            data=bytes(data["audio_data"]),
                        )

                        result = await self.transcription_services[
                            client_id
                        ].process_audio(chunk)

                        print(f"[WebSocket] Sending result: {result}")
                        await websocket.send(json.dumps(result))

                except Exception as e:
                    await websocket.send(json.dumps({"error": str(e)}))

        except websockets.exceptions.ConnectionClosed:
            pass
        finally:
            if client_id in self.transcription_services:
                await self.transcription_services[client_id].cleanup()
                del self.transcription_services[client_id]


websocket_manager = WebSocketManager()


async def start_websocket_server(host="0.0.0.0", port=6789):
    async with websockets.serve(
        websocket_manager.handle_client,
        host,
        port,
        ping_interval=None,  # Disable ping to avoid interference with audio streaming
    ):
        print(f"WebSocket server started on {host}:{port}")
        await asyncio.Future()  # run forever
