FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    git wget curl \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies - use transformers for GroundingDINO (reliable, pre-compiled)
RUN pip install --no-cache-dir \
    fastapi "uvicorn[standard]" \
    torch==2.3.1 torchvision==0.18.1 --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir \
    transformers>=4.38.0 \
    Pillow numpy

# SAM2 from HuggingFace (also reliable)
RUN pip install --no-cache-dir \
    "sam2 @ git+https://github.com/facebookresearch/sam2.git" || \
    pip install --no-cache-dir segment-anything-2

# Pre-download models at build time so startup is fast
RUN python -c "
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
print('Downloading GroundingDINO-Tiny...')
AutoProcessor.from_pretrained('IDEA-Research/grounding-dino-tiny')
AutoModelForZeroShotObjectDetection.from_pretrained('IDEA-Research/grounding-dino-tiny')
print('Done.')
"

COPY main.py .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
