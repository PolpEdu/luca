from flask import Blueprint, request, jsonify, current_app
from services.transcription_service import TranscriptionService, AudioChunk
import json
from flask_sock import Sock
import numpy as np

bp = Blueprint("transcription", __name__)
transcription_service = TranscriptionService()


def handle_websocket(ws):
    while True:
        try:
            message = ws.receive()
            data = json.loads(message)

            if data["type"] == "audio":
                # Convert audio data to bytes
                audio_data = np.array(data["audio_data"], dtype=np.int16).tobytes()

                # Create AudioChunk
                chunk = AudioChunk(
                    data=audio_data, is_final=data.get("is_final", False)
                )
                print(f"Audio chunk: {chunk.data[:10]}")

                # Process the audio
                result = transcription_service.process_audio_sync(chunk)

                # Send back the result
                if "text" in result:
                    ws.send(json.dumps({"text": result["text"]}))

        except Exception as e:
            print(f"WebSocket error: {str(e)}")
            break


@bp.route("/api/reset-transcription", methods=["POST"])
def reset_transcription():
    try:
        transcription_service.reset_sync()
        return jsonify({"status": "reset successful"}), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Initialize websocket routes when blueprint is registered
@bp.record_once
def on_registered(state):
    app = state.app
    # Get the Sock instance directly from the app
    if not hasattr(app, "sock"):
        app.sock = Sock(app)

    # Register the WebSocket route
    app.sock.route("/ws")(handle_websocket)
