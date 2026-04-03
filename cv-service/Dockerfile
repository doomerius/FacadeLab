FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies
RUN pip install --no-cache-dir \
    fastapi "uvicorn[standard]" \
    transformers>=4.38.0 \
    Pillow numpy \
    torch==2.3.1 torchvision==0.18.1 --index-url https://download.pytorch.org/whl/cpu

# Pre-download GroundingDINO model at build time
RUN python3 << 'PYEOF'
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
print('Downloading GroundingDINO-Tiny...')
AutoProcessor.from_pretrained('IDEA-Research/grounding-dino-tiny')
AutoModelForZeroShotObjectDetection.from_pretrained('IDEA-Research/grounding-dino-tiny')
print('Done.')
PYEOF

COPY main.py .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
