/* ==================================================
   AI Honeycomb Inspector v4 — Measurement Engine
   Pixel area → cm²  (scale fixed at 0.05 cm/px)
   Volume / severity calculations removed.
================================================== */

const Measurement = (() => {

    const SCALE_CM_PER_PIXEL = 0.05;

    /* ── INIT ── */
    function init() {
        // No user scale input in this version
    }

    /* ── ANALYSE ── */
    function analyseDetections(detections) {
        if (!Array.isArray(detections)) return emptyResult();

        let totalAreaCm2   = 0;
        let largestAreaCm2 = 0;

        const measured = detections.map((det, i) => {
            const areaPx  = getPixelArea(det);
            const areaCm2 = pixelAreaToCm2(areaPx);

            totalAreaCm2   += areaCm2;
            largestAreaCm2  = Math.max(largestAreaCm2, areaCm2);

            return {
                ...det,
                id:       det.id || `VOID-${i + 1}`,
                areaPx,
                areaCm2,
                areaText: `${areaCm2.toFixed(2)} cm²`
            };
        });

        return {
            detections:      measured,
            totalAreaCm2,
            largestAreaCm2,
            totalAreaText:   `${totalAreaCm2.toFixed(2)} cm²`,
            largestAreaText: `${largestAreaCm2.toFixed(2)} cm²`
        };
    }

    function getPixelArea(det) {
        if (typeof det.areaPx === "number" && det.areaPx > 0) return det.areaPx;
        if (det.bbox) return (det.bbox.w || 0) * (det.bbox.h || 0);
        return 0;
    }

    function pixelAreaToCm2(areaPx) {
        return areaPx * SCALE_CM_PER_PIXEL * SCALE_CM_PER_PIXEL;
    }

    /* ── HUD UPDATE ── */
    function updateHUD(m) {
        setText("totalAreaCm2",   m.totalAreaText);
        setText("largestAreaCm2", m.largestAreaText);
        setText("totalAreaStrip", m.totalAreaText);
    }

    function setText(id, v) {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
    }

    /* ── EMPTY ── */
    function emptyResult() {
        return {
            detections:      [],
            totalAreaCm2:    0,
            largestAreaCm2:  0,
            totalAreaText:   "0.00 cm²",
            largestAreaText: "0.00 cm²"
        };
    }

    function getScale() { return SCALE_CM_PER_PIXEL; }

    return {
        init,
        analyseDetections,
        updateHUD,
        pixelAreaToCm2,
        getScale,
        emptyResult
    };

})();
