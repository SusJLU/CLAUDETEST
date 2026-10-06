FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 LCRM_DATA=/data LCRM_HOST=0.0.0.0
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt \
 && useradd --system --uid 10001 lcrm && mkdir /data && chown lcrm /data
COPY app.py .
COPY static ./static
USER lcrm
EXPOSE 8000
CMD ["python", "app.py"]
