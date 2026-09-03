import asyncio
import os
import tempfile
import unittest
from pathlib import Path

from core import (
    SILENCE_FILTER,
    TtsError,
    generate_audio,
    validate_generate_request,
    validate_secret,
)


class FakeProvider:
    def __init__(self):
        self.calls = []

    async def synthesize(self, text, voice, rate, output_path):
        self.calls.append({"text": text, "voice": voice, "rate": rate})
        Path(output_path).write_bytes(b"raw-mp3")


def fake_normalizer(raw_path, normalized_path):
    assert Path(raw_path).read_bytes() == b"raw-mp3"
    Path(normalized_path).write_bytes(b"normalized-mp3")


class CoreTest(unittest.TestCase):
    def test_auth_required(self):
        with self.assertRaises(TtsError) as ctx:
            validate_secret("", "secret")
        self.assertEqual(ctx.exception.status, 401)
        validate_secret("Bearer secret", "secret")

    def test_zh_tw_mapping(self):
        request = validate_generate_request({"text": "柯", "language": "zh-TW"})
        self.assertEqual(request["voice"], "zh-TW-HsiaoChenNeural")
        self.assertEqual(request["rate"], "+0%")

    def test_en_us_mapping(self):
        request = validate_generate_request({"text": "Chris", "language": "en-US"})
        self.assertEqual(request["voice"], "en-US-AnaNeural")
        self.assertEqual(request["rate"], "-35%")

    def test_invalid_requests(self):
        cases = [
            ({}, "TEXT_REQUIRED"),
            ({"text": "x", "language": "ja-JP"}, "UNSUPPORTED_LANGUAGE"),
            ({"text": "x" * 81, "language": "en-US"}, "TEXT_TOO_LONG"),
            ({"text": "<speak>x</speak>", "language": "en-US"}, "SSML_NOT_ALLOWED"),
        ]
        for payload, code in cases:
            with self.subTest(code=code):
                with self.assertRaises(TtsError) as ctx:
                    validate_generate_request(payload)
                self.assertEqual(ctx.exception.code, code)

    def test_generate_audio_returns_mpeg_bytes_and_normalizes(self):
        provider = FakeProvider()
        audio, request = asyncio.run(generate_audio(
            {"text": " Chris ", "language": "en-US"},
            provider=provider,
            normalizer=fake_normalizer,
        ))
        self.assertEqual(audio, b"normalized-mp3")
        self.assertEqual(provider.calls, [{"text": "Chris", "voice": "en-US-AnaNeural", "rate": "-35%"}])
        self.assertEqual(request["language"], "en-US")

    def test_normalization_filter_matches_scheduler(self):
        self.assertIn("start_threshold=-55dB", SILENCE_FILTER)
        self.assertIn("stop_silence=0.03", SILENCE_FILTER)


if __name__ == "__main__":
    unittest.main()
