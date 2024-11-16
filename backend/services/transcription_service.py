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
    is_final: bool

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
        self.ws_url = "wss://api.openai.com/v1/audio/speech-recognition"
        self.ws = None
        self.is_initialized = False
        self._lock = None
        self.message_listener_task = None
        self.message_queue = asyncio.Queue()
        self.running = False

    async def _handle_server_response(self) -> Optional[Dict[str, Any]]:
        """Handle server response and return parsed JSON if available"""
        try:
            response = await self.ws.recv()
            data = json.loads(response)
            print(f"\n[OpenAI Event] Type: {data.get('type')}")
            print(f"[OpenAI Event] Full response:\n{json.dumps(data, indent=2)}")
            return data
        except Exception as e:
            print(f"[OpenAI Event] Error processing response: {str(e)}")
            return None

    async def _message_listener(self):
        """Background task to continuously listen for WebSocket messages"""
        try:
            while self.running:
                if self.ws and self.ws.open:
                    response = await self._handle_server_response()
                    if response:
                        await self.message_queue.put(response)
                else:
                    await asyncio.sleep(0.1)  # Prevent busy waiting
        except Exception as e:
            print(f"[Message Listener] Error: {str(e)}")
        finally:
            self.running = False

    async def _start_message_listener(self):
        """Start the background message listener if not already running"""
        if not self.running:
            self.running = True
            self.message_listener_task = asyncio.create_task(self._message_listener())

    async def ensure_connection(self) -> None:
        """Ensure WebSocket connection is established and initialized"""
        lock = self._get_lock()
        async with lock:
            if not self.ws or not self.ws.open:
                headers = {
                    "Authorization": f"Bearer {os.getenv('OPENAI_API_KEY')}",
                }
                try:
                    print("[OpenAI] Connecting to WebSocket...")
                    self.ws = await websockets.connect(
                        self.ws_url, extra_headers=headers
                    )
                    self.is_initialized = False
                except Exception as e:
                    raise ConnectionError(f"Failed to connect to OpenAI: {str(e)}")

            if not self.is_initialized:
                try:
                    print("[OpenAI] Initializing session...")
                    await self.ws.send(
                        json.dumps(
                            {
                                "type": "start",
                                "model": "whisper-1",
                                "format": "pcm16",
                                "sample_rate": 16000,
                            }
                        )
                    )

                    await self._handle_server_response()

                    await self._start_message_listener()

                    self.is_initialized = True
                except Exception as e:
                    await self.cleanup()
                    raise ConnectionError(f"Failed to initialize session: {str(e)}")

    async def process_audio(self, chunk: AudioChunk) -> Dict[str, Any]:
        """Process audio chunk and return transcription if final"""
        try:
            if chunk.is_final and (not chunk.data or len(chunk.data) == 0):
                print("[TranscriptionService] Received final empty chunk")
                return {"status": "stopped"}

            if chunk.is_silence():
                await self.ws.send(json.dumps({"type": "input_audio_buffer.commit"}))
                await self.ws.send(json.dumps({"type": "response.create"}))
                return {"status": "silence_detected"}

            await self.ensure_connection()
            print(
                f"[TranscriptionService] Processing audio chunk: {len(chunk.data)} bytes"
            )

            base64_audio = base64.b64encode(chunk.data).decode("utf-8")
            await self.ws.send(
                json.dumps({"type": "input_audio_buffer.append", "audio": base64_audio})
            )

            if chunk.is_final:
                print("[OpenAI] Processing final chunk, committing buffer...")
                await self.ws.send(json.dumps({"type": "input_audio_buffer.commit"}))
                await self.ws.send(json.dumps({"type": "response.create"}))

                while True:
                    try:
                        response = await asyncio.wait_for(
                            self.message_queue.get(), timeout=5.0
                        )

                        event_type = response.get("type")

                        if event_type == "input_audio_buffer.speech_started":
                            print("[OpenAI] Speech detected")
                        elif event_type == "input_audio_buffer.speech_stopped":
                            print("[OpenAI] Speech ended")
                        elif event_type == "input_audio_buffer.committed":
                            print("[OpenAI] Audio buffer committed")
                        elif event_type == "error":
                            print(f"[OpenAI Error] {response.get('message')}")
                            break
                        elif event_type == "conversation.item.created":
                            item = response.get("item", {})
                            print(f"[OpenAI] Item: {item}")
                            if item.get("role") == "assistant":
                                content = item.get("content", [])
                                for content_item in content:
                                    if content_item.get("type") == "text":
                                        text = content_item.get("text", "")
                                        print(f"[OpenAI] Transcribed text: {text}")
                                        return {"text": text}
                        elif event_type == "response.completed":
                            print("[OpenAI] Response completed")
                            break

                    except asyncio.TimeoutError:
                        print("[TranscriptionService] Timeout waiting for response")
                        break

            return {"status": "buffering"}

        except websockets.exceptions.ConnectionClosed as e:
            print(f"[TranscriptionService] WebSocket connection closed: {str(e)}")
            await self.cleanup()
            raise ConnectionError("WebSocket connection closed unexpectedly")
        except Exception as e:
            print(f"[TranscriptionService] Unexpected error: {str(e)}")
            await self.cleanup()
            raise RuntimeError(f"Error processing audio: {str(e)}")

    def _get_lock(self):
        if self._lock is None:
            self._lock = asyncio.Lock()
        return self._lock

    def process_audio_sync(self, chunk: AudioChunk) -> Dict[str, Any]:
        """Synchronous version of process_audio"""
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        try:
            self._lock = None
            return loop.run_until_complete(self.process_audio(chunk))
        finally:
            loop.close()

    async def cleanup(self) -> None:
        """Clean up WebSocket connection"""
        self.running = False
        if self.message_listener_task:
            try:
                self.message_listener_task.cancel()
                await self.message_listener_task
            except Exception as e:
                print(
                    f"[TranscriptionService] Error canceling message listener: {str(e)}"
                )

        if self.ws:
            try:
                print("[TranscriptionService] Cleaning up connection...")
                await self.ws.close()
            except Exception as e:
                print(f"[TranscriptionService] Error during cleanup: {str(e)}")
            finally:
                self.ws = None
                self.is_initialized = False

    def reset_sync(self) -> None:
        """Synchronous version of reset"""
        loop = asyncio.new_event_loop()
        try:
            asyncio.set_event_loop(loop)
            loop.run_until_complete(self.cleanup())
        finally:
            loop.close()
