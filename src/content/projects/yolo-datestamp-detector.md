---
title: YOLO Date Stamp Detector
description: Fine-tuned YOLO object detector that locates burned-in LED date stamps on scanned 1980s–2000s photographs so downstream OCR can recover the capture date as EXIF metadata.
repo: https://github.com/pike00/yolo-datestamp-detector
tags: ["YOLOv8", "Python", "Computer Vision", "PyTorch"]
date: "2026-04-15"
stack: ["Ultralytics YOLO", "PyTorch", "Python", "Docker", "Claude Haiku (OCR)"]
image: "/blog/teaching-neural-net/golden-gate-stamp.jpg"
---

A single-class object detector trained on ~3,000 hand-labeled scans to find the orange LED date stamps that 1980s–2000s consumer cameras burned into the lower-right corner. Once the stamp region is localized, a separate OCR stage reads the digits and writes the recovered date back to the photo's EXIF metadata.

For the long-form write-up of how it was built — annotation tooling, active-learning loop, CPU-vs-GPU training, and the OCR pass — see [Teaching a Neural Net to Find Date Stamps on Scanned Photos](/blog/teaching-a-neural-net-to-find-date-stamps).

## Results

Trained on a Ryzen 5 5600G (CPU), then fine-tuned on a homelab GPU host with YOLO26-small:

| Metric | Value |
|--------|-------|
| Precision | 95.9% |
| Recall | 96.1% |
| mAP@50 | 96.2% |
| mAP@50-95 | 75.4% |

OCR pass (Claude Haiku over cropped stamps): **87.3% clean reads across 6,458 photos.**

The lower mAP@50-95 reflects loose bounding-box tightness, which is fine — the box only needs to crop the stamp for the OCR pass, not be pixel-perfect.

## How it's built

- **Annotation** — browser-based labeler that walks an unlabeled queue, lets you drag a single bounding box per scan, and saves YOLO-format labels straight to disk.
- **Active learning loop** — `docker-cycle` recipe runs inference on remaining unlabeled scans, surfaces low-confidence detections in a review UI, and feeds corrections into the next training run.
- **Background training** — `just docker-train` launches a detached container on the homelab GPU host and pings Mattermost every 10 epochs and on completion via apprise.
- **Two-stage pipeline** — the detector crops the stamp; OCR runs only on the crop. Both more accurate and dramatically cheaper than feeding whole 4000×3000 scans to a vision model.

## Why

I had thousands of family photos from the 90s sitting in a scanner backlog, and the only timestamp on most of them was the LED date the camera had imprinted. General OCR couldn't find the stamps reliably against busy photo backgrounds — too much false signal from clouds, license plates, signs. Localizing first turned the problem from "find tiny digits anywhere in a noisy image" into "OCR a 200×40 crop with high contrast," which is something Haiku is very good at.
