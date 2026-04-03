#!/bin/bash
set -e
pip install -q fastapi uvicorn Pillow
python3 -c "from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection; AutoProcessor.from_pretrained('IDEA-Research/grounding-dino-tiny'); AutoModelForZeroShotObjectDetection.from_pretrained('IDEA-Research/grounding-dino-tiny'); print('GroundingDINO cached')"
curl -fsSL https://raw.githubusercontent.com/doomerius/FacadeLab/main/cv-service/main.py -o /app/main.py
cd /app
exec uvicorn main:app --host 0.0.0.0 --port 8080
