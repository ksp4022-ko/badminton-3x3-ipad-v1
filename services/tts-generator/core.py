import os
import subprocess
import tempfile
from pathlib import Path


MAX_TEXT_LENGTH = 80
SUPPORTED_LANGUAGES = ("zh-TW", "en-US")
VOICE_SPECS = {
    "zh-TW": {"voice": "zh-TW-HsiaoChenNeural", "rate": "+0%"},
    "en-US": {"voice": "en-US-AnaNeural", "rate": "-35%"},
}
SILENCE_FILTER = (
    "silenceremove=start_periods=1:start_duration=0.02:start_threshold=-55dB:"
    "start_silence=0.02:stop_periods=1:stop_duration=0.08:"
    "stop_threshold=-55dB:stop_silence=0.03"
)


class TtsError(Exception):
    def __init__(self, code, message, status=400):
        super().__init__(message)
        self.code = code
        self.status = status


def validate_secret(authorization, expected_secret):
    if not expected_secret:
        raise TtsError("SECRET_NOT_CONFIGURED", "TTS secret is not configured", 500)
    prefix = "Bearer "
    if not authorization or not authorization.startswith(prefix):
        raise TtsError("UNAUTHORIZED", "Authorization required", 401)
    if authorization[len(prefix):] != expected_secret:
        raise TtsError("UNAUTHORIZED", "Authorization required", 401)


def normalize_request_text(text):
    clean = str(text or "").strip()
    if not clean:
        raise TtsError("TEXT_REQUIRED", "Text is required", 400)
    if len(clean) > MAX_TEXT_LENGTH:
        raise TtsError("TEXT_TOO_LONG", "Text is too long", 413)
    if "<speak" in clean.lower() or "</" in clean or "<?" in clean:
        raise TtsError("SSML_NOT_ALLOWED", "SSML is not allowed", 400)
    return clean


def voice_spec_for_language(language):
    if language not in SUPPORTED_LANGUAGES:
        raise TtsError("UNSUPPORTED_LANGUAGE", "Language is not supported", 400)
    return VOICE_SPECS[language]


def validate_generate_request(payload):
    data = payload if isinstance(payload, dict) else {}
    text = normalize_request_text(data.get("text"))
    language = str(data.get("language") or "").strip()
    spec = voice_spec_for_language(language)
    return {"text": text, "language": language, "voice": spec["voice"], "rate": spec["rate"]}


class EdgeTtsProvider:
    async def synthesize(self, text, voice, rate, output_path):
        import edge_tts

        communicate = edge_tts.Communicate(text=text, voice=voice, rate=rate)
        await communicate.save(str(output_path))


def file_non_empty(path):
    return Path(path).is_file() and Path(path).stat().st_size > 0


def normalize_mp3_with_ffmpeg(input_path, output_path):
    result = subprocess.run(
        [
            "ffmpeg",
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(input_path),
            "-af",
            SILENCE_FILTER,
            "-codec:a",
            "libmp3lame",
            "-q:a",
            "4",
            str(output_path),
        ],
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        check=False,
    )
    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", errors="ignore").strip() or "ffmpeg failed"
        raise TtsError("NORMALIZATION_FAILED", detail, 500)
    if not file_non_empty(output_path):
        raise TtsError("NORMALIZATION_EMPTY", "Normalized audio is empty", 500)


async def generate_audio(payload, provider=None, normalizer=None):
    request = validate_generate_request(payload)
    provider = provider or EdgeTtsProvider()
    normalizer = normalizer or normalize_mp3_with_ffmpeg

    with tempfile.TemporaryDirectory() as temp_dir:
        raw_path = Path(temp_dir) / "raw.mp3"
        normalized_path = Path(temp_dir) / "normalized.mp3"
        await provider.synthesize(request["text"], request["voice"], request["rate"], raw_path)
        if not file_non_empty(raw_path):
            raise TtsError("TTS_EMPTY", "Generated audio is empty", 502)
        normalizer(raw_path, normalized_path)
        return normalized_path.read_bytes(), request


def expected_secret_from_env():
    return os.environ.get("TTS_GENERATOR_SECRET", "")
