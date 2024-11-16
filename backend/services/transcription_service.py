import asyncio
import websockets
import json
import wave
from typing import Optional, Dict, Any
from dataclasses import dataclass
import numpy as np
import tempfile
from faster_whisper import WhisperModel
import os
import traceback


@dataclass
class AudioChunk:
    data: bytes

    def is_silence(self, threshold: float = 0.005) -> bool:
        """Check if audio chunk is silence or empty"""
        try:
            if not self.data or len(self.data) == 0:
                return True

            audio_array = np.frombuffer(self.data, dtype=np.int16)
            if audio_array.size == 0:
                return True

            audio_array = audio_array.astype(np.float32) / 32768.0
            rms = np.sqrt(np.mean(np.square(audio_array)))
            return rms < threshold
        except Exception as e:
            print(f"Error in is_silence: {str(e)}")
            return True


class TranscriptionService:
    def __init__(self):
        self._lock = None
        self._loop = None
        self._audio_buffer = bytearray()
        self._recv_task = None
        self.MIN_BUFFER_SIZE = 50 * 1024
        self.has_speech = False
        # Initialize faster-whisper model
        self.model = WhisperModel(
            "large-v3",
            local_files_only=False,
        )

    def _ensure_loop(self):
        """Ensure we have an event loop and queue initialized"""
        if self._loop is None or self._loop.is_closed():
            self._loop = asyncio.new_event_loop()
            asyncio.set_event_loop(self._loop)
            self._message_queue = asyncio.Queue()
            self._lock = asyncio.Lock()

    async def _message_listener(self):
        """Background task to continuously listen for messages"""
        try:
            while True:
                if not self.ws:
                    break
                try:
                    message = await self.ws.recv()
                    await self._message_queue.put(json.loads(message))
                except websockets.exceptions.ConnectionClosed:
                    break
                except Exception as e:
                    print(f"Error in message listener: {str(e)}")
                    break
        except Exception as e:
            print(f"Message listener terminated: {str(e)}")

    async def _get_next_message(self, timeout: float = 5.0) -> Optional[Dict[str, Any]]:
        """Get next message from the queue with timeout"""
        try:
            return await asyncio.wait_for(self._message_queue.get(), timeout)
        except asyncio.TimeoutError:
            return None

    async def process_audio(self, chunk: AudioChunk) -> Dict[str, Any]:
        """Process audio chunk and return transcription"""
        try:
            # Validate incoming chunk
            if not chunk or not chunk.data:
                return {"status": "error", "message": "Invalid audio chunk received"}

            # Accumulate audio data
            self._audio_buffer.extend(chunk.data)

            # If buffer is too small, keep accumulating
            if len(self._audio_buffer) < self.MIN_BUFFER_SIZE:
                print(
                    f"[TranscriptionService] Buffer size ({len(self._audio_buffer)} bytes) < minimum ({self.MIN_BUFFER_SIZE} bytes), accumulating more data"
                )
                return {"status": "buffering"}

            # Validate buffer before processing
            if len(self._audio_buffer) == 0:
                return {"status": "error", "message": "Empty audio buffer"}

            # Process the accumulated buffer
            buffer_data = bytes(self._audio_buffer)

            # Validate audio data before creating WAV file
            if len(buffer_data) == 0:
                return {"status": "error", "message": "No audio data to process"}

            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_file:
                with wave.open(temp_file.name, "wb") as wav_file:
                    wav_file.setnchannels(1)  # Mono
                    wav_file.setsampwidth(2)  # 16-bit
                    wav_file.setframerate(16000)  # 16kHz
                    wav_file.writeframes(buffer_data)

                # Transcribe using faster-whisper
                try:
                    segments, info = self.model.transcribe(
                        temp_file.name,
                        beam_size=5,
                        vad_filter=True,
                        vad_parameters=dict(
                            min_silence_duration_ms=500,
                        ),
                    )
                except Exception as e:
                    # get the traceback
                    traceback.print_exc()
                    print(f"[TranscriptionService] Transcription error: {str(e)}")
                    return {
                        "status": "error",
                        "message": f"Transcription failed: {str(e)}",
                    }
                finally:
                    # Clean up the temporary file
                    os.unlink(temp_file.name)

            # Handle case where no speech was detected
            segments_list = list(segments)  # Convert generator to list
            if not segments_list:
                self._audio_buffer.clear()
                self.has_speech = False
                return {"text": "", "status": "no_speech_detected"}

            # Get the transcribed text
            text = " ".join(segment.text for segment in segments_list)
            self._audio_buffer.clear()
            self.has_speech = False
            return {"text": text}

        except Exception as e:
            print(f"[TranscriptionService] Unexpected error: {str(e)}")
            self._audio_buffer.clear()  # Clear buffer on error
            return {"status": "error", "message": f"Error processing audio: {str(e)}"}

    def process_audio_sync(self, chunk: AudioChunk) -> Dict[str, Any]:
        """Synchronous version of process_audio"""
        self._ensure_loop()
        try:
            result = self._loop.run_until_complete(self.process_audio(chunk))
            if result.get("status") == "error":
                print(f"Error in process_audio_sync: {result.get('message')}")
            return result
        except Exception as e:
            print(f"Error in process_audio_sync: {str(e)}")
            self._loop.run_until_complete(self.cleanup())
            raise

    async def cleanup(self) -> None:
        """Clean up WebSocket connection"""
        self._audio_buffer.clear()
        if self._recv_task and not self._recv_task.done():
            self._recv_task.cancel()
            try:
                await self._recv_task
            except asyncio.CancelledError:
                pass

        self.ws = None
        self.is_initialized = False
        self._recv_task = None

    def reset_sync(self) -> None:
        """Synchronous version of reset"""
        if self._loop and not self._loop.is_closed():
            try:
                self._loop.run_until_complete(self.cleanup())
            except Exception as e:
                print(f"Error in reset_sync: {str(e)}")
            finally:
                self._loop.close()
                self._loop = None
                self._message_queue = None
                self._lock = None
