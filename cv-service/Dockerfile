FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgl1 \
    && rm -rf /var/lib/apt/lists/*

# CPU-only torch + transformers (pre-compiled, no CUDA needed)
RUN pip install --no-cache-dir \
    torch==2.3.1+cpu torchvision==0.18.1+cpu --index-url https://download.pytorch.org/whl/cpu

RUN pip install --no-cache-dir \
    fastapi "uvicorn[standard]" \
    transformers>=4.38.0 \
    Pillow numpy

# Pre-cache GroundingDINO model at build time
RUN python3 -c "\
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection; \
AutoProcessor.from_pretrained('IDEA-Research/grounding-dino-tiny'); \
AutoModelForZeroShotObjectDetection.from_pretrained('IDEA-Research/grounding-dino-tiny'); \
print('GroundingDINO cached.')"

COPY main.py .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
