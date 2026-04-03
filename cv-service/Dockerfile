FROM huggingface/transformers-pytorch-cpu:latest

WORKDIR /app

RUN pip install --no-cache-dir fastapi "uvicorn[standard]" Pillow

# Pre-cache GroundingDINO-Tiny at build time
RUN python3 -c "\
from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection; \
AutoProcessor.from_pretrained('IDEA-Research/grounding-dino-tiny'); \
AutoModelForZeroShotObjectDetection.from_pretrained('IDEA-Research/grounding-dino-tiny'); \
print('GroundingDINO cached.')"

COPY main.py .

EXPOSE 8080
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8080"]
