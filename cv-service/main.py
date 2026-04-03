from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import io
import torch
import numpy as np
from PIL import Image
import json

app = FastAPI(title="FacadeLab CV Service", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load models at startup
import groundingdino.datasets.transforms as T
from groundingdino.util.inference import load_model, predict
from sam2.build_sam import build_sam2
from sam2.sam2_image_predictor import SAM2ImagePredictor

GDINO_CONFIG = "groundingdino/config/GroundingDINO_SwinT_OGC.py"
GDINO_CHECKPOINT = "/app/weights/groundingdino_swint_ogc.pth"
SAM2_CHECKPOINT = "/app/weights/sam2_hiera_small.pt"
SAM2_CONFIG = "sam2_hiera_s.yaml"

print("Loading GroundingDINO...")
gdino_model = load_model(GDINO_CONFIG, GDINO_CHECKPOINT, device="cpu")
print("Loading SAM2...")
sam2_model = build_sam2(SAM2_CONFIG, SAM2_CHECKPOINT, device="cpu")
sam2_predictor = SAM2ImagePredictor(sam2_model)
print("Models loaded.")

class DetectRequest(BaseModel):
    image_b64: str  # base64 encoded image (with or without data URI prefix)
    text_prompt: str = "window . door"
    box_threshold: float = 0.30
    text_threshold: float = 0.25

class DetectionResult(BaseModel):
    boxes: list  # [{x, y, w, h, label, confidence}]
    masks: list  # [{id, mask_b64, bbox}] — mask as base64 PNG
    image_width: int
    image_height: int
    processing_time_ms: int

def decode_image(b64_str: str) -> Image.Image:
    if b64_str.startswith("data:"):
        b64_str = b64_str.split(",", 1)[1]
    data = base64.b64decode(b64_str)
    return Image.open(io.BytesIO(data)).convert("RGB")

def mask_to_b64(mask: np.ndarray) -> str:
    """Convert boolean mask array to base64 PNG (white=mask, black=background)"""
    img = Image.fromarray((mask * 255).astype(np.uint8), mode="L")
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    return base64.b64encode(buf.getvalue()).decode()

import time

@app.post("/detect", response_model=DetectionResult)
async def detect(req: DetectRequest):
    t0 = time.time()
    
    pil_img = decode_image(req.image_b64)
    W, H = pil_img.size
    
    # GroundingDINO transform
    transform = T.Compose([
        T.RandomResize([800], max_size=1333),
        T.ToTensor(),
        T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    ])
    img_tensor, _ = transform(pil_img, None)
    
    # Detect
    boxes_xyxy, logits, phrases = predict(
        model=gdino_model,
        image=img_tensor,
        caption=req.text_prompt,
        box_threshold=req.box_threshold,
        text_threshold=req.text_threshold,
        device="cpu",
    )
    
    # Convert boxes from normalized cxcywh to pixel xywh
    boxes_out = []
    boxes_pixel = []  # for SAM2
    for i, (box, logit, phrase) in enumerate(zip(boxes_xyxy, logits, phrases)):
        # boxes_xyxy are in [0,1] normalized xyxy format
        x1, y1, x2, y2 = box.tolist()
        px = int(x1 * W)
        py = int(y1 * H)
        pw = int((x2 - x1) * W)
        ph = int((y2 - y1) * H)
        boxes_out.append({
            "id": i + 1,
            "x": px, "y": py, "w": pw, "h": ph,
            "label": phrase,
            "confidence": round(float(logit), 3),
            "type": "door" if "door" in phrase.lower() else "window",
        })
        boxes_pixel.append([px, py, px + pw, py + ph])
    
    if not boxes_out:
        return DetectionResult(
            boxes=[], masks=[], image_width=W, image_height=H,
            processing_time_ms=int((time.time() - t0) * 1000)
        )
    
    # SAM2 segmentation
    img_array = np.array(pil_img)
    sam2_predictor.set_image(img_array)
    
    masks_out = []
    for i, (box_px, box_info) in enumerate(zip(boxes_pixel, boxes_out)):
        try:
            input_box = np.array(box_px)
            masks, scores, _ = sam2_predictor.predict(
                point_coords=None,
                point_labels=None,
                box=input_box,
                multimask_output=False,
            )
            best_mask = masks[0]  # shape: (H, W)
            masks_out.append({
                "id": i + 1,
                "mask_b64": mask_to_b64(best_mask),
                "bbox": box_info,
                "score": round(float(scores[0]), 3),
            })
        except Exception as e:
            print(f"SAM2 failed for box {i}: {e}")
            masks_out.append({"id": i + 1, "mask_b64": None, "bbox": box_info, "score": 0})
    
    return DetectionResult(
        boxes=boxes_out,
        masks=masks_out,
        image_width=W,
        image_height=H,
        processing_time_ms=int((time.time() - t0) * 1000),
    )

@app.get("/health")
def health():
    return {"status": "ok", "models": ["groundingdino-tiny", "sam2-small"]}
