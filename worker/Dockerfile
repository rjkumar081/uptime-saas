FROM python:3.11-slim
WORKDIR /worker
COPY ./worker.py /worker/worker.py
RUN pip install requests redis rq
CMD ["rq", "worker", "checks", "--url", "redis://redis:6379/0"]
