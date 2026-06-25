# AI Honeycomb Inspector v5 Professional

Professional web-based AI concrete honeycomb inspection prototype using the existing YOLOv8 ONNX model.

## Important

The trained model is kept unchanged:

```text
Model/best.onnx
```

Training images, validation images, labels, and Roboflow dataset folders are **not required** for deployment and are intentionally removed from this web app package.

## New v5 Concepts

1. Modern iOS-style white interface
2. Optimized report workflow with no live rendering while typing
3. Executive summary
4. Inspection statistics dashboard
5. Detection overview table
6. Large captured image cards
7. Individual defect analysis
8. AI engineering assessment
9. Risk assessment
10. Repair recommendation
11. General method statement and signature verification section

## Recommended Workflow

1. Run with a local server, not by double-clicking `index.html`.
2. Start inspection.
3. Capture one or more photos.
4. Open report form.
5. Type project information.
6. Click **Generate Report Preview**.
7. Export PNG or PDF.

## Run Locally

```bash
python -m http.server 8000
```

Open:

```text
http://localhost:8000
```

## Deploy

Upload this project to GitHub Pages, Vercel, or Netlify. Make sure `Model/best.onnx` is included and the path remains exactly:

```text
Model/best.onnx
```
