from fastapi import FastAPI, Header, Request
from fastapi.responses import JSONResponse, Response

from core import TtsError, expected_secret_from_env, generate_audio, validate_secret


app = FastAPI(title="Badminton TTS Generator")


@app.get("/healthz")
async def healthz():
    return {"ok": True}


@app.post("/generate")
async def generate(request: Request, authorization: str = Header(default="")):
    try:
        validate_secret(authorization, expected_secret_from_env())
        payload = await request.json()
        audio, _ = await generate_audio(payload)
        return Response(
            content=audio,
            media_type="audio/mpeg",
            headers={"cache-control": "no-store"},
        )
    except TtsError as error:
        return JSONResponse(
            {"ok": False, "error": {"code": error.code, "message": str(error)}},
            status_code=error.status,
        )
    except Exception:
        return JSONResponse(
            {"ok": False, "error": {"code": "INTERNAL_ERROR", "message": "TTS generation failed"}},
            status_code=500,
        )
