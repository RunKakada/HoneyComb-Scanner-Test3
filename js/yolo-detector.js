
/* ==================================================
   AI Honeycomb Inspector v4
   YOLOv8 ONNX Detector
   Purpose:
   Run YOLOv8 honeycomb detection in browser using ONNX Runtime Web.

   Required model:
   models/best.onnx

   Expected YOLO class:
   class 0 = honeycomb
================================================== */

const YOLODetector = (() => {

    const MODEL_PATH = "./Model/best.onnx";

    const INPUT_SIZE = 640;

    const CONF_THRESHOLD = 0.35;
    const IOU_THRESHOLD = 0.45;

    let session = null;
    let inputName = null;
    let outputName = null;

    let modelLoaded = false;

    /* ==========================================
       INITIALIZE MODEL
    ========================================== */

    async function init() {
        try {
            updateModelStatus("LOADING", "#ffb000", "#000");

            if (typeof ort === "undefined") {
                throw new Error("ONNX Runtime Web is not loaded.");
            }

            ort.env.wasm.numThreads = 1;
            ort.env.wasm.simd = true;

            session = await ort.InferenceSession.create(
                MODEL_PATH,
                {
                    executionProviders: ["wasm"]
                }
            );

            inputName = session.inputNames[0];
            outputName = session.outputNames[0];

            modelLoaded = true;

            updateModelStatus("AI READY", "#00dc64", "#000");

            console.log("YOLOv8 model loaded:", MODEL_PATH);

            return true;

        } catch (error) {
            modelLoaded = false;

            updateModelStatus("MODEL ERROR", "#ff4040", "#fff");

            console.error("YOLOv8 model loading failed:", error);

            return false;
        }
    }

    /* ==========================================
       MAIN DETECTION
    ========================================== */

    async function detect(canvas, concreteData = null) {

        if (!modelLoaded || !session) {
            return [];
        }

        const prep =
            preprocess(canvas);

        const tensor =
            new ort.Tensor(
                "float32",
                prep.input,
                [1, 3, INPUT_SIZE, INPUT_SIZE]
            );

        const feeds = {};
        feeds[inputName] = tensor;

        const results =
            await session.run(feeds);

        const output =
            results[outputName];

        let detections =
            postprocess(
                output.data,
                output.dims,
                prep.scale,
                prep.padX,
                prep.padY,
                canvas.width,
                canvas.height
            );

        if (
            concreteData &&
            ConcreteSurface &&
            ConcreteSurface.isEnabled()
        ) {
            detections =
                detections.filter(det =>
                    ConcreteSurface.insideROI(
                        det.bbox,
                        concreteData.roi
                    )
                );
        }

        return detections;
    }

    /* ==========================================
       PREPROCESS IMAGE
       Canvas → 640x640 RGB CHW float32
    ========================================== */

    function preprocess(sourceCanvas) {

        const srcW = sourceCanvas.width;
        const srcH = sourceCanvas.height;

        const scale =
            Math.min(
                INPUT_SIZE / srcW,
                INPUT_SIZE / srcH
            );

        const newW =
            Math.round(srcW * scale);

        const newH =
            Math.round(srcH * scale);

        const padX =
            Math.floor((INPUT_SIZE - newW) / 2);

        const padY =
            Math.floor((INPUT_SIZE - newH) / 2);

        const tmp =
            document.createElement("canvas");

        tmp.width = INPUT_SIZE;
        tmp.height = INPUT_SIZE;

        const ctx =
            tmp.getContext(
                "2d",
                { willReadFrequently: true }
            );

        ctx.fillStyle = "rgb(114,114,114)";
        ctx.fillRect(0, 0, INPUT_SIZE, INPUT_SIZE);

        ctx.drawImage(
            sourceCanvas,
            0,
            0,
            srcW,
            srcH,
            padX,
            padY,
            newW,
            newH
        );

        const imageData =
            ctx.getImageData(
                0,
                0,
                INPUT_SIZE,
                INPUT_SIZE
            );

        const data =
            imageData.data;

        const input =
            new Float32Array(
                1 * 3 * INPUT_SIZE * INPUT_SIZE
            );

        const area =
            INPUT_SIZE * INPUT_SIZE;

        for (let i = 0; i < area; i++) {

            const r =
                data[i * 4] / 255;

            const g =
                data[i * 4 + 1] / 255;

            const b =
                data[i * 4 + 2] / 255;

            input[i] = r;
            input[area + i] = g;
            input[area * 2 + i] = b;
        }

        return {
            input,
            scale,
            padX,
            padY
        };
    }

    /* ==========================================
       POSTPROCESS YOLO OUTPUT

       Supports common YOLOv8 ONNX output:
       [1, 84, 8400]
       or
       [1, 8400, 84]

       For custom one-class model:
       [x, y, w, h, confidence]
    ========================================== */

    function postprocess(
        data,
        dims,
        scale,
        padX,
        padY,
        originalW,
        originalH
    ) {

        const boxes = [];

        const dim1 = dims[1];
        const dim2 = dims[2];

        const transposed =
            dim1 < dim2;

        const numPreds =
            transposed ? dim2 : dim1;

        const numAttrs =
            transposed ? dim1 : dim2;

        for (let i = 0; i < numPreds; i++) {

            let cx, cy, w, h, conf;

            if (transposed) {

                cx = data[0 * numPreds + i];
                cy = data[1 * numPreds + i];
                w  = data[2 * numPreds + i];
                h  = data[3 * numPreds + i];

                conf =
                    getBestClassConfidenceTransposed(
                        data,
                        i,
                        numPreds,
                        numAttrs
                    );

            } else {

                const offset =
                    i * numAttrs;

                cx = data[offset + 0];
                cy = data[offset + 1];
                w  = data[offset + 2];
                h  = data[offset + 3];

                conf =
                    getBestClassConfidenceNormal(
                        data,
                        offset,
                        numAttrs
                    );
            }

            if (conf < CONF_THRESHOLD)
                continue;

            let x1 =
                cx - w / 2;

            let y1 =
                cy - h / 2;

            let x2 =
                cx + w / 2;

            let y2 =
                cy + h / 2;

            x1 =
                (x1 - padX) / scale;

            y1 =
                (y1 - padY) / scale;

            x2 =
                (x2 - padX) / scale;

            y2 =
                (y2 - padY) / scale;

            x1 =
                clamp(x1, 0, originalW - 1);

            y1 =
                clamp(y1, 0, originalH - 1);

            x2 =
                clamp(x2, 0, originalW - 1);

            y2 =
                clamp(y2, 0, originalH - 1);

            const boxW =
                x2 - x1;

            const boxH =
                y2 - y1;

            if (
                boxW <= 4 ||
                boxH <= 4
            ) {
                continue;
            }

            boxes.push({
                className: "Honeycomb",
                classId: 0,
                confidence: conf,

                bbox: {
                    x: x1,
                    y: y1,
                    w: boxW,
                    h: boxH
                },

                areaPx:
                    boxW * boxH
            });
        }

        return nms(
            boxes,
            IOU_THRESHOLD
        );
    }

    /* ==========================================
       CONFIDENCE HELPERS
    ========================================== */

    function getBestClassConfidenceTransposed(
        data,
        predIndex,
        numPreds,
        numAttrs
    ) {

        let best = 0;

        for (
            let c = 4;
            c < numAttrs;
            c++
        ) {

            const value =
                data[c * numPreds + predIndex];

            if (value > best) {
                best = value;
            }
        }

        return best;
    }

    function getBestClassConfidenceNormal(
        data,
        offset,
        numAttrs
    ) {

        let best = 0;

        for (
            let c = 4;
            c < numAttrs;
            c++
        ) {

            const value =
                data[offset + c];

            if (value > best) {
                best = value;
            }
        }

        return best;
    }

    /* ==========================================
       NON-MAXIMUM SUPPRESSION
    ========================================== */

    function nms(
        detections,
        threshold
    ) {

        const sorted =
            detections.sort(
                (a, b) =>
                    b.confidence -
                    a.confidence
            );

        const kept = [];

        for (const det of sorted) {

            let keep = true;

            for (const other of kept) {

                if (
                    iou(
                        det.bbox,
                        other.bbox
                    ) > threshold
                ) {
                    keep = false;
                    break;
                }
            }

            if (keep) {
                kept.push(det);
            }
        }

        return kept.slice(0, 20);
    }

    function iou(a, b) {

        const x1 =
            Math.max(a.x, b.x);

        const y1 =
            Math.max(a.y, b.y);

        const x2 =
            Math.min(
                a.x + a.w,
                b.x + b.w
            );

        const y2 =
            Math.min(
                a.y + a.h,
                b.y + b.h
            );

        const interW =
            Math.max(0, x2 - x1);

        const interH =
            Math.max(0, y2 - y1);

        const inter =
            interW * interH;

        const union =
            a.w * a.h +
            b.w * b.h -
            inter;

        return union <= 0
            ? 0
            : inter / union;
    }

    /* ==========================================
       UTILITIES
    ========================================== */

    function clamp(value, min, max) {
        return Math.max(
            min,
            Math.min(max, value)
        );
    }

    function updateModelStatus(
        text,
        bg,
        color
    ) {

        const badge =
            document.getElementById("modelBadge");

        const status =
            document.getElementById("modelStatus");

        if (badge) {
            badge.textContent = text;
            badge.style.background = bg;
            badge.style.color = color;
        }

        if (status) {
            status.textContent = text;
            status.style.color = bg;
        }
    }

    function isLoaded() {
        return modelLoaded;
    }

    return {
        init,
        detect,
        isLoaded
    };

})();
