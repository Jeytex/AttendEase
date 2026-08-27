"""Live Webcam Authentication & Testing App for ZepIris.

Allows users to enroll their face directly through their webcam, run real-time
anti-spoofing / blur quality checks, and authenticate with cosine similarity.
"""

from __future__ import annotations

import base64
import io
import sys
from pathlib import Path
from typing import Dict

import numpy as np
import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from pydantic import BaseModel
from PIL import Image

sys.path.insert(0, str(Path(__file__).parent.parent))

from zepiris.ml_inference.blur_detection import BlurDetectionService
from zepiris.ml_inference.face_embedding import FaceEmbeddingService
from zepiris.ml_inference.nsfw_detection import NSFWDetectionService
from zepiris.ml_inference.spoof_detection import SpoofDetectionService

app = FastAPI(title="ZepIris Live Camera Tester")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print("Initializing ZepIris ML services...")
face_service = FaceEmbeddingService(face_model="buffalo_l", device="cpu")
face_service.load_model()

blur_service = BlurDetectionService(
    huggingface_repo_id="", local_model_path="models/blur_model.pth", model_source="local", device="cpu"
)
blur_service.load_model()

spoof_service = SpoofDetectionService(
    huggingface_repo_id="", local_model_path="models/spoof_model.pth", model_source="local", device="cpu"
)
spoof_service.load_model()

nsfw_service = NSFWDetectionService(
    huggingface_repo_id="", local_model_path="models/nsfw_model.pth", model_source="local", device="cpu"
)
nsfw_service.load_model()
print("All ML services ready!")

enrolled_faces: Dict[str, dict] = {}


class ImagePayload(BaseModel):
    image_base64: str
    user_name: str = "User"


def decode_base64_image(image_base64: str) -> np.ndarray:
    if "," in image_base64:
        image_base64 = image_base64.split(",", 1)[1]
    image_bytes = base64.b64decode(image_base64)
    image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    return np.array(image)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    dot = np.dot(a, b)
    norm_a = np.linalg.norm(a)
    norm_b = np.linalg.norm(b)
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return float(dot / (norm_a * norm_b))


@app.get("/", response_class=HTMLResponse)
async def index():
    html_file = Path(__file__).parent / "webcam_ui.html"
    return HTMLResponse(content=html_file.read_text(encoding="utf-8"))


@app.post("/api/enroll")
async def enroll(payload: ImagePayload):
    try:
        image_rgb = decode_base64_image(payload.image_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    blur_res = blur_service.forward(image_rgb)
    spoof_res = spoof_service.forward(image_rgb)
    nsfw_res = nsfw_service.forward(image_rgb)

    embed_res = face_service.embed(image_rgb)

    if not embed_res.face_detected:
        return {
            "success": False,
            "message": "No face detected. Please look directly into the camera.",
            "quality": {
                "sharpness_pct": round((1 - blur_res.probability) * 100, 1),
                "liveness_pct": round((1 - spoof_res.probability) * 100, 1),
                "is_safe": nsfw_res.is_safe,
            },
        }

    user_id = payload.user_name.strip() or "User_1"
    enrolled_faces[user_id] = {
        "name": user_id,
        "embedding": np.array(embed_res.embedding, dtype=np.float32),
    }

    return {
        "success": True,
        "message": f"Successfully enrolled face for '{user_id}'!",
        "quality": {
            "is_sharp": blur_res.is_sharp,
            "sharpness_pct": round((1 - blur_res.probability) * 100, 1),
            "is_live": spoof_res.is_live,
            "liveness_pct": round((1 - spoof_res.probability) * 100, 1),
            "is_safe": nsfw_res.is_safe,
        },
        "enrolled_count": len(enrolled_faces),
    }


@app.post("/api/authenticate")
async def authenticate(payload: ImagePayload):
    if not enrolled_faces:
        return {
            "authenticated": False,
            "message": "No faces enrolled yet! Please enroll your face first.",
            "similarity": 0.0,
            "matched_user": None,
        }

    try:
        image_rgb = decode_base64_image(payload.image_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid image: {e}")

    blur_res = blur_service.forward(image_rgb)
    spoof_res = spoof_service.forward(image_rgb)
    nsfw_res = nsfw_service.forward(image_rgb)

    embed_res = face_service.embed(image_rgb)
    if not embed_res.face_detected:
        return {
            "authenticated": False,
            "message": "No face detected in the camera frame.",
            "similarity": 0.0,
            "matched_user": None,
            "quality": {
                "sharpness_pct": round((1 - blur_res.probability) * 100, 1),
                "liveness_pct": round((1 - spoof_res.probability) * 100, 1),
                "is_safe": nsfw_res.is_safe,
            },
        }

    query_emb = np.array(embed_res.embedding, dtype=np.float32)

    best_match = None
    best_score = -1.0

    for user_id, record in enrolled_faces.items():
        sim = cosine_similarity(query_emb, record["embedding"])
        if sim > best_score:
            best_score = sim
            best_match = user_id

    THRESHOLD = 0.50
    is_match = best_score >= THRESHOLD

    return {
        "authenticated": is_match,
        "matched_user": best_match if is_match else None,
        "similarity": round(best_score * 100, 2),
        "threshold": round(THRESHOLD * 100, 1),
        "quality": {
            "is_sharp": blur_res.is_sharp,
            "sharpness_pct": round((1 - blur_res.probability) * 100, 1),
            "is_live": spoof_res.is_live,
            "liveness_pct": round((1 - spoof_res.probability) * 100, 1),
            "is_safe": nsfw_res.is_safe,
        },
        "message": (
            f"Access Granted! Recognized as '{best_match}' with {round(best_score * 100, 1)}% match."
            if is_match
            else f"Access Denied. Best match was only {round(best_score * 100, 1)}% (below {round(THRESHOLD * 100)}% threshold)."
        ),
    }


@app.get("/api/enrolled")
async def get_enrolled():
    return {"enrolled": list(enrolled_faces.keys())}


@app.post("/api/clear")
async def clear_database():
    enrolled_faces.clear()
    return {"success": True, "message": "Enrolled faces cleared."}


if __name__ == "__main__":
    print("\n" + "=" * 60)
    print("ZepIris Live Camera Tester running at: http://localhost:8080")
    print("=" * 60 + "\n")
    uvicorn.run(app, host="127.0.0.1", port=8080)
