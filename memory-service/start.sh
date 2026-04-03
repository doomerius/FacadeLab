#!/bin/bash
set -e
mkdir -p /data /app
pip install -q fastapi uvicorn
curl -fsSL https://raw.githubusercontent.com/doomerius/FacadeLab/main/memory-service/main.py -o /app/main.py
mkdir -p /app/static
curl -fsSL https://raw.githubusercontent.com/doomerius/FacadeLab/main/memory-service/static/index.html -o /app/static/index.html 2>/dev/null || true
cd /app
exec uvicorn main:app --host 0.0.0.0 --port 8081
