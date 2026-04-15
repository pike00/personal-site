---
title: YOLO Date Stamp Detector
description: Fine-tuned YOLOv8 model that locates LED date stamps on scanned photographs so downstream OCR can recover the original capture date as EXIF metadata.
repo: https://github.com/pike00/yolo-datestamp-detector
tags: ["YOLOv8", "Python", "Computer Vision", "PyTorch"]
date: "2026-04-15"
---

A single-class object detector trained on ~3,000 hand-labeled scans to find the orange LED date stamps that 1980s–2000s consumer cameras burned onto film. Once the stamp region is localized, a separate OCR stage reads the digits and writes the recovered date back to the photo's EXIF metadata.

## Results

Trained on a Ryzen 5 5600G (CPU) and later fine-tuned on GPU with YOLO26-small:

| Metric | Value |
|--------|-------|
| Precision | 95.9% |
| Recall | 96.1% |
| mAP@50 | 96.2% |
| mAP@50-95 | 75.4% |

The lower mAP@50-95 reflects loose bounding-box tightness, which is fine — the box only needs to crop the stamp for the OCR pass.

## Pipeline

- **Label & train** — `scripts/train.py` wraps Ultralytics with apprise notifications to Mattermost every 10 epochs
- **Active learning loop** — `docker-cycle` recipe runs inference on unlabeled scans, surfaces low-confidence detections in a browser review UI, and feeds the corrections back into the next training run
- **OCR stage** — cropped stamps go through a parallel Haiku-based OCR pipeline that achieved 87.3% clean reads across 6,458 photos
- **Background training in Docker** — `just docker-train` launches a detached container on the homelab GPU host and pings Mattermost on completion

## Why

I had thousands of family photos from the 90s sitting in a scanner backlog, and the only timestamp on most of them was the LED date the camera had imprinted in the corner. Off-the-shelf OCR couldn't find the stamps reliably against busy photo backgrounds, so I trained a detector to locate them first and then ran OCR only on the cropped region. The two-stage pipeline turned out to be both more accurate and dramatically cheaper than feeding whole scans to a vision model.
