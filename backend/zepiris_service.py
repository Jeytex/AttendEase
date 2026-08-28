"""Zepiris Face Recognition Service Integration for AttendEase.

Provides a clean singleton abstraction layer wrapping Zepiris ML inference models:
- InsightFace Buffalo_L (Face detection + 512-d normalized embedding extraction)
- Blur Detection Service (Image sharpness assessment)
- Spoof Detection Service (Liveness detection)
- NSFW Detection Service (Safety assessment)
- Cosine similarity comparison for 1-to-1 identity verification
"""

from __future__ import annotations

import base64
import io
import sys
from pathlib import Path
from typing import Optional, Tuple, Dict, Any

import numpy as np
from PIL import Image

# Ensure zepiris package can be imported from zepiris-main directory
BASE_DIR = Path(__file__).resolve().parent.parent
ZEPIRIS_ROOT = BASE_DIR / "zepiris-main"
if str(ZEPIRIS_ROOT) not in sys.path:
    sys.path.insert(0, str(ZEPIRIS_ROOT))

from zepiris.ml_inference.blur_detection import BlurDetectionService
from zepiris.ml_inference.face_embedding import FaceEmbeddingService
from zepiris.ml_inference.nsfw_detection import NSFWDetectionService
from zepiris.ml_inference.spoof_detection import SpoofDetectionService


class ZepirisService:
    """Singleton service wrapping Zepiris face recognition & quality models."""

    _instance: Optional[ZepirisService] = None

    def __new__(cls) -> ZepirisService:
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self) -> None:
        if getattr(self, "_initialized", False):
            return

        self.models_dir = ZEPIRIS_ROOT / "models"
        self.device = "cpu"
        self.similarity_threshold = 0.50  # InsightFace cosine similarity threshold

        print("[ZepirisService] Initializing Zepiris ML models...")

        # 1. Face Embedding Service (buffalo_l: det_10g + w600k_r50)
        self.face_service = FaceEmbeddingService(
            face_model="buffalo_l",
            device=self.device,
            embedding_dim=512,
        )
        self.face_service.load_model()

        # 2. Blur Quality Assessment Service
        blur_model_path = str(self.models_dir / "blur_model.pth")
        self.blur_service = BlurDetectionService(
            huggingface_repo_id="",
            local_model_path=blur_model_path if Path(blur_model_path).exists() else None,
            model_source="local" if Path(blur_model_path).exists() else "huggingface",
            device=self.device,
        )
        try:
            self.blur_service.load_model()
        except Exception as e:
            print(f"[ZepirisService] Warning: Blur service load note: {e}")

        # 3. Anti-Spoofing / Liveness Service
        spoof_model_path = str(self.models_dir / "spoof_model.pth")
        self.spoof_service = SpoofDetectionService(
            huggingface_repo_id="",
            local_model_path=spoof_model_path if Path(spoof_model_path).exists() else None,
            model_source="local" if Path(spoof_model_path).exists() else "huggingface",
            device=self.device,
        )
        try:
            self.spoof_service.load_model()
        except Exception as e:
            print(f"[ZepirisService] Warning: Spoof service load note: {e}")

        # 4. NSFW Detection Service
        nsfw_model_path = str(self.models_dir / "nsfw_model.pth")
        self.nsfw_service = NSFWDetectionService(
            huggingface_repo_id="",
            local_model_path=nsfw_model_path if Path(nsfw_model_path).exists() else None,
            model_source="local" if Path(nsfw_model_path).exists() else "huggingface",
            device=self.device,
        )
        try:
            self.nsfw_service.load_model()
        except Exception as e:
            print(f"[ZepirisService] Warning: NSFW service load note: {e}")

        self._initialized = True
        print("[ZepirisService] All Zepiris ML services loaded successfully.")

    @staticmethod
    def decode_image(image_input: str | bytes) -> np.ndarray:
        """Decode base64 string (Data URL or raw base64) or bytes into RGB NumPy array.

        Args:
            image_input: base64 string or raw bytes

        Returns:
            np.ndarray: RGB image array of shape (H, W, 3), dtype uint8
        """
        if isinstance(image_input, str):
            if "," in image_input:
                image_input = image_input.split(",", 1)[1]
            image_bytes = base64.b64decode(image_input)
        elif isinstance(image_input, (bytes, bytearray)):
            image_bytes = bytes(image_input)
        else:
            raise ValueError("Unsupported image input type. Expected base64 str or bytes.")

        pil_image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        return np.array(pil_image, dtype=np.uint8)

    def assess_quality(self, image_rgb: np.ndarray) -> Dict[str, Any]:
        """Perform Image Quality Assessment (sharpness, liveness, safety).

        Args:
            image_rgb: RGB image numpy array

        Returns:
            Dict containing quality metrics and overall pass/fail status
        """
        results: Dict[str, Any] = {
            "passed": True,
            "blur": {"is_sharp": True, "probability": 1.0},
            "spoof": {"is_live": True, "probability": 1.0},
            "nsfw": {"is_safe": True, "probability": 1.0},
        }

        try:
            blur_res = self.blur_service.forward(image_rgb)
            results["blur"] = {
                "is_sharp": bool(blur_res.is_sharp),
                "probability": float(blur_res.probability),
            }
            if not blur_res.is_sharp:
                results["passed"] = False
        except Exception as e:
            print(f"[ZepirisService] Blur check error: {e}")
            results["blur"] = {
                "is_sharp": False,
                "probability": 0.0,
                "error": "Sharpness assessment unavailable",
            }
            results["passed"] = False

        try:
            spoof_res = self.spoof_service.forward(image_rgb)
            results["spoof"] = {
                "is_live": bool(spoof_res.is_live),
                "probability": float(spoof_res.probability),
            }
            if not spoof_res.is_live:
                results["passed"] = False
        except Exception as e:
            print(f"[ZepirisService] Spoof check error: {e}")
            results["spoof"] = {
                "is_live": False,
                "probability": 0.0,
                "error": "Liveness check unavailable",
            }
            results["passed"] = False

        try:
            nsfw_res = self.nsfw_service.forward(image_rgb)
            results["nsfw"] = {
                "is_safe": bool(nsfw_res.is_safe),
                "probability": float(nsfw_res.probability),
            }
            if not nsfw_res.is_safe:
                results["passed"] = False
        except Exception as e:
            print(f"[ZepirisService] NSFW check error: {e}")
            results["nsfw"] = {
                "is_safe": False,
                "probability": 0.0,
                "error": "Safety check unavailable",
            }
            results["passed"] = False

        return results

    def extract_face_embedding(self, image_rgb: np.ndarray) -> Tuple[Optional[np.ndarray], Dict[str, Any]]:
        """Detect face and extract 512-d normalized embedding vector.

        Args:
            image_rgb: RGB image numpy array

        Returns:
            Tuple of (embedding_array or None, info_dict)
        """
        embed_res = self.face_service.embed(image_rgb)

        if not embed_res.face_detected:
            return None, {
                "face_detected": False,
                "error": "No face detected in the camera frame. Please look directly into the camera.",
            }

        embedding = np.array(embed_res.embedding, dtype=np.float32)
        # Ensure L2 normalization
        norm = np.linalg.norm(embedding)
        if norm > 0:
            embedding = embedding / norm

        return embedding, {
            "face_detected": True,
            "embedding_dim": len(embedding),
        }

    @staticmethod
    def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
        """Compute cosine similarity between two normalized embedding vectors."""
        dot = float(np.dot(a, b))
        norm_a = float(np.linalg.norm(a))
        norm_b = float(np.linalg.norm(b))
        if norm_a == 0.0 or norm_b == 0.0:
            return 0.0
        return dot / (norm_a * norm_b)

    def verify_face_match(
        self,
        query_embedding: np.ndarray,
        enrolled_embedding: np.ndarray,
        threshold: Optional[float] = None,
    ) -> Tuple[bool, float, float]:
        """Compare query face embedding against registered student face embedding.

        Args:
            query_embedding: 512-d embedding extracted from live capture
            enrolled_embedding: 512-d embedding stored in student profile
            threshold: cosine similarity cutoff (defaults to 0.50)

        Returns:
            Tuple of (is_match: bool, similarity: float, threshold: float)
        """
        if threshold is None:
            threshold = self.similarity_threshold

        similarity = self.cosine_similarity(query_embedding, enrolled_embedding)
        is_match = similarity >= threshold
        return is_match, similarity, threshold


# Module-level helper instance
zepiris_service = ZepirisService()
