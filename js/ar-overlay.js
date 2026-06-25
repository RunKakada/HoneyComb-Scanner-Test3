
/* ==================================================
   AI Honeycomb Inspector v4
   AR Overlay Renderer
   YOLOv8 Honeycomb + Concrete ROI + Measurement Labels
================================================== */

const AROverlay = (() => {

    const COLOR = {
        honeycomb: "rgb(0, 200, 255)",
        accent: "rgb(0, 120, 255)",
        concrete: "rgb(0, 220, 100)",
        yellow: "rgb(255, 176, 0)",
        dark: "rgba(8, 8, 8, 0.82)",
        text: "rgb(230, 230, 230)"
    };

    /* ==========================================
       HONEYCOMB DETECTION DRAWING
    ========================================== */

    function drawHoneycomb(
        ctx,
        detections,
        overlayMode,
        t
    ) {
        if (
            overlayMode === 2 ||
            !detections ||
            !detections.length
        ) {
            return;
        }

        detections.forEach((det, index) => {

            const box = det.bbox;

            const x1 = box.x;
            const y1 = box.y;
            const x2 = box.x + box.w;
            const y2 = box.y + box.h;

            const pulse =
                0.55 +
                0.45 *
                Math.sin(
                    t * 3.5 + index
                );

            if (overlayMode === 0) {
                drawBoxFill(
                    ctx,
                    x1,
                    y1,
                    x2,
                    y2,
                    pulse
                );
            }

            drawPulsingOuterRing(
                ctx,
                x1,
                y1,
                x2,
                y2,
                pulse
            );

            drawGlowRect(
                ctx,
                x1,
                y1,
                x2,
                y2
            );

            drawCornerBrackets(
                ctx,
                x1,
                y1,
                x2,
                y2
            );

            drawDetectionDot(
                ctx,
                x1,
                y1
            );

            drawTag(
                ctx,
                x1,
                y1,
                det,
                index
            );
        });
    }

    /* ==========================================
       CONCRETE ROI DRAWING
    ========================================== */

    function drawConcreteROI(
        ctx,
        roi,
        t
    ) {
        if (!roi) return;

        const pulse =
            0.45 +
            0.35 *
            Math.sin(t * 2.2);

        ctx.save();

        ctx.strokeStyle =
            COLOR.concrete;

        ctx.lineWidth = 2;

        ctx.setLineDash([12, 8]);

        ctx.globalAlpha =
            0.75 + pulse * 0.25;

        ctx.shadowColor =
            COLOR.concrete;

        ctx.shadowBlur = 10;

        ctx.strokeRect(
            roi.x,
            roi.y,
            roi.w,
            roi.h
        );

        ctx.setLineDash([]);

        drawROILabel(
            ctx,
            roi.x,
            roi.y
        );

        ctx.restore();
    }

    function drawROILabel(
        ctx,
        x,
        y
    ) {
        const label =
            "CONCRETE SURFACE ROI";

        const w = 180;
        const h = 32;

        const tx =
            Math.max(0, x);

        const ty =
            Math.max(0, y - h - 6);

        ctx.save();

        roundRect(
            ctx,
            tx,
            ty,
            w,
            h,
            6,
            "rgba(0, 30, 20, .82)",
            true,
            false
        );

        ctx.strokeStyle =
            COLOR.concrete;

        ctx.lineWidth = 1;

        roundRect(
            ctx,
            tx,
            ty,
            w,
            h,
            6,
            null,
            false,
            true
        );

        ctx.fillStyle =
            COLOR.concrete;

        ctx.font =
            "bold 11px Arial";

        ctx.fillText(
            label,
            tx + 10,
            ty + 20
        );

        ctx.restore();
    }

    /* ==========================================
       SCANLINE EFFECT
    ========================================== */

    function drawScanlines(
        ctx,
        canvas,
        t
    ) {
        const w = canvas.width;
        const h = canvas.height;

        const sy =
            Math.floor(
                (t * 160) % h
            );

        ctx.save();

        ctx.globalAlpha = 0.38;
        ctx.strokeStyle =
            "rgb(0, 230, 160)";
        ctx.lineWidth = 1;

        for (let i = 0; i < 4; i++) {

            const row =
                (sy + i * 5) % h;

            ctx.beginPath();
            ctx.moveTo(0, row);
            ctx.lineTo(w, row);
            ctx.stroke();
        }

        ctx.globalAlpha = 0.16;
        ctx.strokeStyle = "black";

        for (
            let y = 0;
            y < h;
            y += 4
        ) {
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(w, y);
            ctx.stroke();
        }

        ctx.restore();
    }

    /* ==========================================
       BOX FILL
    ========================================== */

    function drawBoxFill(
        ctx,
        x1,
        y1,
        x2,
        y2,
        pulse
    ) {
        ctx.save();

        ctx.fillStyle =
            `rgba(0, 200, 255, ${0.10 + pulse * 0.08})`;

        ctx.fillRect(
            x1,
            y1,
            x2 - x1,
            y2 - y1
        );

        ctx.restore();
    }

    /* ==========================================
       GLOW RECTANGLE
    ========================================== */

    function drawGlowRect(
        ctx,
        x1,
        y1,
        x2,
        y2
    ) {
        ctx.save();

        ctx.strokeStyle =
            COLOR.honeycomb;

        ctx.lineWidth = 2;

        ctx.shadowColor =
            COLOR.honeycomb;

        ctx.shadowBlur = 18;

        ctx.strokeRect(
            x1,
            y1,
            x2 - x1,
            y2 - y1
        );

        ctx.shadowBlur = 0;

        ctx.lineWidth = 1;

        ctx.strokeRect(
            x1,
            y1,
            x2 - x1,
            y2 - y1
        );

        ctx.restore();
    }

    /* ==========================================
       PULSE RING
    ========================================== */

    function drawPulsingOuterRing(
        ctx,
        x1,
        y1,
        x2,
        y2,
        pulse
    ) {
        const expand =
            8 * pulse;

        ctx.save();

        ctx.globalAlpha =
            0.35 * pulse;

        ctx.strokeStyle =
            COLOR.honeycomb;

        ctx.lineWidth = 1;

        ctx.strokeRect(
            x1 - expand,
            y1 - expand,
            x2 - x1 + expand * 2,
            y2 - y1 + expand * 2
        );

        ctx.restore();
    }

    /* ==========================================
       CORNER BRACKETS
    ========================================== */

    function drawCornerBrackets(
        ctx,
        x1,
        y1,
        x2,
        y2
    ) {
        const size =
            Math.min(
                24,
                (x2 - x1) / 3,
                (y2 - y1) / 3
            );

        ctx.save();

        ctx.strokeStyle =
            COLOR.accent;

        ctx.lineWidth = 3;

        ctx.shadowColor =
            COLOR.accent;

        ctx.shadowBlur = 8;

        line(ctx, x1, y1, x1 + size, y1);
        line(ctx, x1, y1, x1, y1 + size);

        line(ctx, x2, y1, x2 - size, y1);
        line(ctx, x2, y1, x2, y1 + size);

        line(ctx, x1, y2, x1 + size, y2);
        line(ctx, x1, y2, x1, y2 - size);

        line(ctx, x2, y2, x2 - size, y2);
        line(ctx, x2, y2, x2, y2 - size);

        ctx.restore();
    }

    function line(
        ctx,
        x1,
        y1,
        x2,
        y2
    ) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }

    /* ==========================================
       DETECTION DOT
    ========================================== */

    function drawDetectionDot(
        ctx,
        x,
        y
    ) {
        ctx.save();

        ctx.fillStyle =
            COLOR.honeycomb;

        ctx.shadowColor =
            COLOR.honeycomb;

        ctx.shadowBlur = 12;

        ctx.beginPath();
        ctx.arc(
            x + 8,
            y + 8,
            5,
            0,
            Math.PI * 2
        );
        ctx.fill();

        ctx.restore();
    }

    /* ==========================================
       TAG PANEL
    ========================================== */

    function drawTag(
        ctx,
        x,
        y,
        det,
        index
    ) {
        const tagW = 220;
        const tagH = 66;

        const canvasW =
            ctx.canvas.width;

        let tx =
            Math.max(
                0,
                Math.min(
                    x,
                    canvasW - tagW
                )
            );

        let ty =
            Math.max(
                0,
                y - tagH - 6
            );

        const confidence =
            det.confidence || 0;

        const areaText =
            det.areaText || "0.00 cm²";

        ctx.save();

        roundRect(
            ctx,
            tx,
            ty,
            tagW,
            tagH,
            7,
            COLOR.dark,
            true,
            false
        );

        ctx.strokeStyle =
            COLOR.honeycomb;

        ctx.lineWidth = 1;

        roundRect(
            ctx,
            tx,
            ty,
            tagW,
            tagH,
            7,
            null,
            false,
            true
        );

        ctx.fillStyle =
            COLOR.honeycomb;

        ctx.fillRect(
            tx,
            ty,
            4,
            tagH
        );

        ctx.fillStyle =
            COLOR.honeycomb;

        ctx.font =
            "bold 12px Arial";

        ctx.fillText(
            `HONEYCOMB VOID ${index + 1}`,
            tx + 10,
            ty + 17
        );

        ctx.fillStyle =
            "rgb(190,190,190)";

        ctx.font =
            "10px Arial";

        ctx.fillText(
            `Area: ${areaText}`,
            tx + 10,
            ty + 34
        );

        ctx.fillText(
            `AI Confidence: ${Math.round(confidence * 100)}%`,
            tx + 10,
            ty + 49
        );

        const bx1 =
            tx + 105;

        const by =
            ty + 46;

        const bw =
            tagW - 120;

        ctx.fillStyle =
            "rgb(40,40,40)";

        ctx.fillRect(
            bx1,
            by - 8,
            bw,
            6
        );

        ctx.fillStyle =
            COLOR.honeycomb;

        ctx.fillRect(
            bx1,
            by - 8,
            bw * confidence,
            6
        );

        ctx.restore();
    }

    /* ==========================================
       ROUNDED RECTANGLE
    ========================================== */

    function roundRect(
        ctx,
        x,
        y,
        w,
        h,
        r,
        fillStyle,
        fill,
        stroke
    ) {
        ctx.beginPath();

        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);

        ctx.quadraticCurveTo(
            x + w,
            y,
            x + w,
            y + r
        );

        ctx.lineTo(
            x + w,
            y + h - r
        );

        ctx.quadraticCurveTo(
            x + w,
            y + h,
            x + w - r,
            y + h
        );

        ctx.lineTo(
            x + r,
            y + h
        );

        ctx.quadraticCurveTo(
            x,
            y + h,
            x,
            y + h - r
        );

        ctx.lineTo(
            x,
            y + r
        );

        ctx.quadraticCurveTo(
            x,
            y,
            x + r,
            y
        );

        ctx.closePath();

        if (fill) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }

        if (stroke) {
            ctx.stroke();
        }
    }

    return {
        drawHoneycomb,
        drawConcreteROI,
        drawScanlines
    };

})();
