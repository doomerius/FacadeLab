FROM python:3.11-slim

WORKDIR /app

# System deps
RUN apt-get update && apt-get install -y \
    git wget curl build-essential \
    libglib2.0-0 libsm6 libxext6 libxrender-dev libgl1 \
    && rm -rf /var/lib/apt/lists/*

# Python deps (base + torch CPU)
RUN pip install --no-cache-dir \
    fastapi "uvicorn[standard]" \
    Pillow numpy supervision

RUN pip install --no-cache-dir \
    torch==2.3.1 torchvision==0.18.1 \
    --index-url https://download.pytorch.org/whl/cpu

# GroundingDINO
RUN pip install --no-cache-dir groundingdino-py

# SAM2
RUN pip install --no-cache-dir "git+https://github.com/facebookresearch/sam2.git"

# Download model weights
RUN mkdir -p /app/weights

RUN wget -q -O /app/weights/groundingdino_swint_ogc.pth \
    "https://github.com/IDEA-Research/GroundingDINO/releases/download/v0.1.0-alpha/groundingdino_swint_ogc.pth"

RUN wget -q -O /app/weights/sam2_hiera_small.pt \
    "https://dl.fbaipublicfiles.com/segment_anything_2/072824/sam2_hiera_small.pt"

COPY main.py .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
