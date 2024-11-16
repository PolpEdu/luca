import asyncio
import websockets
import json
import base64
import os
from typing import Optional, Dict, Any
from dataclasses import dataclass
import numpy as np


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
        self.ws_url = (
            "wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-10-01"
        )
        self.ws = None
        self.is_initialized = False
        self._lock = None
        self._recv_task = None
        self._message_queue = None
        self.has_speech = False
        self._loop = None
        self._audio_buffer = bytearray()
        self.MIN_BUFFER_SIZE = 50 * 1024

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

    async def ensure_connection(self) -> None:
        """Ensure WebSocket connection is established and initialized"""
        if self._lock is None:
            self._lock = asyncio.Lock()

        async with self._lock:
            if not self.ws or not self.ws.open:
                headers = {
                    "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                    "OpenAI-Beta": "realtime=v1",
                }
                try:
                    print("[OpenAI] Connecting to WebSocket...")
                    self.ws = await websockets.connect(
                        self.ws_url, extra_headers=headers
                    )
                    # Start message listener
                    self._recv_task = asyncio.create_task(self._message_listener())
                    self.is_initialized = False

                except Exception as e:
                    raise ConnectionError(f"Failed to connect to OpenAI: {str(e)}")

            if not self.is_initialized:
                try:
                    print("[OpenAI] Initializing session...")
                    await self.ws.send(
                        json.dumps(
                            {
                                "type": "session.update",
                                "session": {
                                    "instructions": "Make an accurate transcription of the audio given in the prompt.",
                                    "input_audio_format": {
                                        "type": "pcm",
                                        "sample_rate": 16000,
                                        "bit_depth": 16,
                                        "channels": 1,
                                    },
                                    "output_audio_format": {
                                        "type": "pcm",
                                        "sample_rate": 16000,
                                        "bit_depth": 16,
                                        "channels": 1,
                                    },
                                    "transcription": {
                                        "model": "whisper-1",
                                        "turns": True,
                                    },
                                    "vad": {
                                        "type": "server",
                                        "threshold": 0.1,
                                        "prefix_padding_ms": 10,
                                        "silence_duration_ms": 999,
                                    },
                                },
                            }
                        )
                    )

                    # Wait for session.updated response
                    response = await self._get_next_message()
                    if response and response.get("type") == "session.created":
                        self.is_initialized = True
                    else:
                        print("response err", response)
                        raise ConnectionError("Failed to initialize session")

                except Exception as e:
                    await self.cleanup()
                    raise ConnectionError(f"Failed to initialize session: {str(e)}")

    async def process_audio(self, chunk: AudioChunk) -> Dict[str, Any]:
        """Process audio chunk and return transcription"""
        try:
            await self.ensure_connection()
            print(
                f"[TranscriptionService] Processing audio chunk: {len(chunk.data)} bytes"
            )

            # Accumulate audio data
            self._audio_buffer.extend(chunk.data)

            # If buffer is too small, keep accumulating
            if len(self._audio_buffer) < self.MIN_BUFFER_SIZE:
                print(
                    f"[TranscriptionService] Buffer size ({len(self._audio_buffer)} bytes) < minimum ({self.MIN_BUFFER_SIZE} bytes), accumulating more data"
                )
                return {"status": "buffering"}

            # Process the accumulated buffer
            buffer_data = bytes(self._audio_buffer)
            self._audio_buffer.clear()  # Clear the buffer after processing

            # Count the number of zero bytes
            zero_count = buffer_data.count(b"\x00")
            zero_percentage = zero_count / len(buffer_data)

            if zero_percentage > 0.95:
                if self.has_speech:  # Only commit if we've seen speech before
                    print(
                        "[TranscriptionService] Silence detected after speech, committing buffer"
                    )
                    await self.ws.send(
                        json.dumps({"type": "input_audio_buffer.commit"})
                    )
                    self.has_speech = False
                else:
                    print("[TranscriptionService] Skipping initial silence")
                return {"status": "buffering"}

            # Calculate audio duration
            audio_duration_ms = (len(buffer_data) / 2) / 16000 * 1000

            if audio_duration_ms < 100:  # Minimum 100ms required
                print(
                    f"[TranscriptionService] Buffer too small ({audio_duration_ms:.2f}ms), accumulating more data"
                )
                return {"status": "buffering"}

            # Send audio data to buffer
            base64_audio = base64.b64encode(buffer_data).decode("utf-8")
            await self.ws.send(
                json.dumps({"type": "input_audio_buffer.append", "audio": base64_audio})
            )

            self.has_speech = True

            # Process messages with timeout
            while True:
                response = await self._get_next_message(timeout=0.1)
                if not response:
                    return {"status": "buffering"}

                event_type = response.get("type")
                print(f"[OpenAI Event] Received Type: {event_type}")

                if event_type == "input_audio_buffer.speech_started":
                    print("[OpenAI] Speech detected")
                elif event_type == "input_audio_buffer.speech_stopped":
                    print("[OpenAI] Speech ended")
                elif event_type == "input_audio_buffer.committed":
                    print("[OpenAI] Audio buffer committed")
                elif event_type == "error":
                    print(f"[OpenAI Error] {response.get('error', {}).get('message')}")
                    return {"error": response.get("error", {}).get("message")}
                elif event_type == "conversation.item.created":
                    item = response.get("item", {})
                    if item.get("role") == "assistant":
                        content = item.get("content", [])
                        for content_item in content:
                            if content_item.get("type") == "text":
                                text = content_item.get("text", "")
                                print(f"[OpenAI] Transcribed text: {text}")
                                return {"text": text}
                elif (
                    event_type == "response.content_part.done"
                    or event_type == "response.output_item.done"
                    or event_type == "response.done"
                    or event_type == "input_audio_buffer.speech_stopped"
                ):
                    print(f"[OpenAI LFG] {response}")
            return {"status": "buffering"}

        except websockets.exceptions.ConnectionClosed as e:
            print(f"[TranscriptionService] WebSocket connection closed: {str(e)}")
            await self.cleanup()
            raise ConnectionError("WebSocket connection closed unexpectedly")
        except Exception as e:
            print(f"[TranscriptionService] Unexpected error: {str(e)}")
            await self.cleanup()
            raise RuntimeError(f"Error processing audio: {str(e)}")

    def process_audio_sync(self, chunk: AudioChunk) -> Dict[str, Any]:
        """Synchronous version of process_audio"""
        self._ensure_loop()
        try:
            return self._loop.run_until_complete(self.process_audio(chunk))
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

        if self.ws:
            try:
                await self.ws.close()
            except Exception as e:
                print(f"Error closing websocket: {str(e)}")

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
