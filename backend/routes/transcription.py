from flask import Blueprint, request, jsonify, Response, stream_with_context
from agent.run_agent import run_agent
from services.transcription_service import TranscriptionService, AudioChunk
import numpy as np
import asyncio
from flask import current_app

bp = Blueprint("transcription", __name__)
transcription_service = TranscriptionService()


@bp.route("/api/transcribe", methods=["POST"])
def transcribe_audio():
    try:
        # Get audio data from request
        data = request.get_json()
        if not data or "audio_data" not in data:
            return jsonify({"error": "No audio data provided"}), 400

        if len(data["audio_data"]) == 0:
            return jsonify({"error": "No audio data provided"}), 400

        # Convert array data to bytes
        audio_data = np.array(data["audio_data"], dtype=np.int16).tobytes()
        print(f"Transcribing audio data of length {len(audio_data)}")

        # Process the audio using asyncio
        result = asyncio.run(transcription_service.transcribe_audio(audio_data))
        print("Transcribed text:", result["text"])

        # First, send the transcribed text
        def generate():
            # Send the transcribed text as a JSON object with 'transcribed' key
            yield f"data: {{'type': 'transcribed', 'content': {repr(result['text'])}}}"

            # Then stream the agent's response
            config = {"configurable": {"thread_id": data["conversation_id"]}}
            yield from run_agent(result["text"], current_app.agent_executor, config)

        return Response(
            stream_with_context(generate()),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Content-Type": "text/event-stream",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return jsonify({"error": str(e)}), 500


# route to just stream with context
@bp.route("/api/stream", methods=["POST"])
def streamWithContext():
    try:
        # Get audio data from request
        data = request.get_json()
        if not data or "input" not in data:
            return jsonify({"error": "No audio data provided"}), 400

        if len(data["input"]) == 0:
            return jsonify({"error": "No audio data provided"}), 400

        config = {"configurable": {"thread_id": data["conversation_id"]}}

        return Response(
            stream_with_context(
                run_agent(data["input"], current_app.agent_executor, config)
            ),
            mimetype="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Content-Type": "text/event-stream",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return jsonify({"error": str(e)}), 500
