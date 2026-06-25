/* ==================================================
   AI Honeycomb Inspector v4 — HUD Controller
================================================== */

const HUD = (() => {

    function update(data) {
        setText("fpsValue",      data.fps);
        setText("surfaceStatus", data.surface);
        setText("elapsedTime",   formatTime(data.elapsed));
        setText("voidCount",     data.voids);
        setText("sheetVoidCount", data.voids);

        // Update strip scan status text
        const strip = document.getElementById("scanStatusStrip");
        if (strip) {
            strip.textContent = data.frozen ? "FROZEN" : "SCANNING";
            strip.style.color = data.frozen ? "#ffb000" : "#00dc64";
        }

        updateStatusDot(data);
        updateScanStatus(data);
    }

    function updateStatusDot(data) {
        const dot = document.getElementById("statusDot");
        if (!dot) return;
        dot.className = "dot";
        if (data.frozen) dot.classList.add("warning");
    }

    function updateScanStatus(data) {
        const el = document.getElementById("scanStatus");
        if (!el) return;
        if (data.frozen) {
            el.textContent = "FROZEN";
            el.style.color = "#ffb000";
        } else {
            el.textContent = "SCANNING";
            el.style.color = "#00dc64";
        }
    }

    function reset() {
        setText("scanStatus",     "READY");
        setText("modelStatus",    "Loading…");
        setText("fpsValue",       "0");
        setText("surfaceStatus",  "Active");
        setText("voidCount",      "0");
        setText("sheetVoidCount", "0");
        setText("elapsedTime",    "00:00");
        colorEl("scanStatus", "#00dc64");

        const dot = document.getElementById("statusDot");
        if (dot) dot.className = "dot";

        const badge = document.getElementById("modelBadge");
        if (badge) {
            badge.textContent      = "MODEL LOADING";
            badge.style.background = "#ffb000";
            badge.style.color      = "#000";
        }
    }

    function setText(id, v) {
        const el = document.getElementById(id);
        if (el) el.textContent = v;
    }

    function colorEl(id, c) {
        const el = document.getElementById(id);
        if (el) el.style.color = c;
    }

    function formatTime(s) {
        const safe = Number.isFinite(s) ? s : 0;
        const m = Math.floor(safe / 60);
        const r = Math.floor(safe % 60);
        return String(m).padStart(2, "0") + ":" + String(r).padStart(2, "0");
    }

    return { update, reset };

})();
