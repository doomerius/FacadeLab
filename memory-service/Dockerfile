FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

RUN pip install --no-cache-dir \
    fastapi uvicorn[standard] \
    sentence-transformers \
    numpy

COPY main.py .
COPY static/ static/

RUN mkdir -p /data

EXPOSE 8081

ENV MEMORY_API_KEY=palkia-memory-2026

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8081"]
