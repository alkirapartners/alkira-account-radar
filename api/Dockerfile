FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY radar ./radar
ENV PYTHONUNBUFFERED=1
EXPOSE 8601
CMD ["uvicorn", "radar.api:app", "--host", "127.0.0.1", "--port", "8601", "--workers", "1"]
