FROM python:3.13-slim

WORKDIR /app

COPY scoring/requirements.txt /tmp/requirements.txt
RUN pip install --no-cache-dir -r /tmp/requirements.txt

COPY scoring /app/scoring

ENV PYTHONUNBUFFERED=1
EXPOSE 8000

CMD ["python", "-m", "scoring.server"]
