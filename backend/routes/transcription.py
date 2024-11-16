from flask import Blueprint, request, jsonify, current_app
from services.transcription_service import TranscriptionService, AudioChunk
import json
from flask_sock import Sock
import numpy as np
import asyncio

bp = Blueprint("transcription", __name__)
transcription_service = TranscriptionService()


@bp.route("/api/transcribe", methods=["POST"])
def transcribe_audio():
    try:
        # Get audio data from request
        data = request.get_json()
        if not data or "audio_data" not in data:
            return jsonify({"error": "No audio data provided"}), 400

        # Convert array data to bytes
        audio_data = np.array(data["audio_data"], dtype=np.int16).tobytes()
        print(f"Transcribing audio data of length {len(audio_data)}")

        # Process the audio using asyncio
        result = asyncio.run(transcription_service.transcribe_audio(audio_data))

        return jsonify(result)
    except Exception as e:
        print(f"Transcription error: {str(e)}")
        return jsonify({"error": str(e)}), 500
