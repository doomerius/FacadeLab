from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import io
import time
import numpy as np
from PIL import Image
import torch

app = FastAPI(title="FacadeLab CV Service", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection

MODEL_ID = "IDEA-Research/grounding-dino-tiny"
DEVICE = "cpu"

print(f"Loading GroundingDINO ({MODEL_ID})...")
processor = AutoProcessor.from_pretrained(MODEL_ID)
gdino_model = AutoModelForZeroShotObjectDetection.from_pretrained(MODEL_ID).to(DEVICE)
print("GroundingDINO loaded.")


class DetectRequest(BaseModel):
    image_b64: str
    text_prompt: str = "window . door"
    box_threshold: float = 0.30
    text_threshold: float = 0.25


def decode_image(b64_str: str) -> Image.Image:
    if b64_str.startswith("data:"):
        b64_str = b64_str.split(",", 1)[1]
    data = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(data)).convert("RGB")


@app.post("/detect")
async def detect(req: DetectRequest):
    t0 = time.time()
    pil_img = decode_image(req.image_b64)
    W, H = pil_img.size

    text = req.text_prompt.replace(" . ", ". ").strip()
    if not text.endswith("."):
        text += "."

    inputs = processor(images=pil_img, text=text, return_tensors="pt").to(DEVICE)

    with torch.no_grad():
        outputs = gdino_model(**inputs)

    results = processor.post_process_grounded_object_detection(
        outputs,
        inputs.input_ids,
        box_threshold=req.box_threshold,
        text_threshold=req.text_threshold,
        target_sizes=[(H, W)],
    )[0]

    boxes_out = []
    for i, (box, score, label) in enumerate(zip(
        results["boxes"], results["scores"], results["labels"]
    )):
        x1, y1, x2, y2 = box.tolist()
        px, py = int(x1), int(y1)
        pw, ph = int(x2 - x1), int(y2 - y1)
        label_str = str(label).lower()
        boxes_out.append({
            "id": i + 1,
            "x": px, "y": py, "w": pw, "h": ph,
            "label": label_str,
            "confidence": round(float(score), 3),
            "type": "door" if "door" in label_str else "window",
        })

    # No SAM2 in this version — bbox-only mode
    # Frontend falls back to dilated rectangles for masks
    masks_out = [{"id": b["id"], "mask_b64": None, "bbox": b, "score": 0} for b in boxes_out]

    return {
        "boxes": boxes_out,
        "masks": masks_out,
        "image_width": W,
        "image_height": H,
        "processing_time_ms": int((time.time() - t0) * 1000),
        "sam2_available": False,
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "models": {
            "detection": "grounding-dino-tiny (transformers)",
            "segmentation": "unavailable (bbox-only mode — SAM2 planned for GPU upgrade)",
        }
    }
