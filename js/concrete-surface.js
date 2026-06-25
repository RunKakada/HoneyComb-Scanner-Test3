
/* ==================================================
   AI Honeycomb Inspector v4
   Concrete Surface Detector
   Purpose:
   Restrict AI detection ONLY to concrete surfaces.
================================================== */

const ConcreteSurface = (() => {

    let enabled = true;

    /* ==========================================
       MAIN
    ========================================== */

    function detect(canvas) {

        const ctx = canvas.getContext(
            "2d",
            { willReadFrequently: true }
        );

        const width = canvas.width;
        const height = canvas.height;

        const imageData =
            ctx.getImageData(
                0,
                0,
                width,
                height
            );

        const data = imageData.data;

        const mask =
            new Uint8Array(width * height);

        for (let i = 0, p = 0;
             i < data.length;
             i += 4, p++) {

            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            if (isConcretePixel(r, g, b)) {
                mask[p] = 1;
            }
        }

        const cleaned =
            morphologyClose(
                morphologyOpen(
                    mask,
                    width,
                    height,
                    2
                ),
                width,
                height,
                3
            );

        const roi =
            largestRegion(
                cleaned,
                width,
                height
            );

        return {
            mask: cleaned,
            roi
        };
    }

    /* ==========================================
       CONCRETE COLOR MODEL
    ========================================== */

    function isConcretePixel(r, g, b) {

        const brightness =
            (r + g + b) / 3;

        const diffRG =
            Math.abs(r - g);

        const diffRB =
            Math.abs(r - b);

        const diffGB =
            Math.abs(g - b);

        const neutralColor =
            diffRG < 35 &&
            diffRB < 35 &&
            diffGB < 35;

        const validBrightness =
            brightness > 55 &&
            brightness < 220;

        return (
            neutralColor &&
            validBrightness
        );
    }

    /* ==========================================
       ROI VALIDATION
    ========================================== */

    function insideROI(box, roi) {

        if (!roi) return false;

        const cx =
            box.x + box.w / 2;

        const cy =
            box.y + box.h / 2;

        return (
            cx >= roi.x &&
            cx <= roi.x + roi.w &&
            cy >= roi.y &&
            cy <= roi.y + roi.h
        );
    }

    /* ==========================================
       FIND LARGEST REGION
    ========================================== */

    function largestRegion(
        mask,
        width,
        height
    ) {

        const visited =
            new Uint8Array(mask.length);

        let largest = null;

        for (let y = 0; y < height; y++) {

            for (let x = 0; x < width; x++) {

                const idx =
                    y * width + x;

                if (
                    mask[idx] &&
                    !visited[idx]
                ) {

                    const region =
                        floodFill(
                            mask,
                            visited,
                            width,
                            height,
                            x,
                            y
                        );

                    if (!region)
                        continue;

                    if (
                        !largest ||
                        region.area >
                        largest.area
                    ) {
                        largest = region;
                    }
                }
            }
        }

        return largest;
    }

    /* ==========================================
       FLOOD FILL
    ========================================== */

    function floodFill(
        mask,
        visited,
        width,
        height,
        startX,
        startY
    ) {

        const stack =
            [[startX, startY]];

        let area = 0;

        let minX = startX;
        let maxX = startX;

        let minY = startY;
        let maxY = startY;

        while (stack.length) {

            const [x, y] =
                stack.pop();

            if (
                x < 0 ||
                y < 0 ||
                x >= width ||
                y >= height
            ) {
                continue;
            }

            const idx =
                y * width + x;

            if (
                visited[idx] ||
                !mask[idx]
            ) {
                continue;
            }

            visited[idx] = 1;

            area++;

            minX =
                Math.min(minX, x);

            maxX =
                Math.max(maxX, x);

            minY =
                Math.min(minY, y);

            maxY =
                Math.max(maxY, y);

            stack.push([x + 1, y]);
            stack.push([x - 1, y]);
            stack.push([x, y + 1]);
            stack.push([x, y - 1]);
        }

        if (area < 1000)
            return null;

        return {
            x: minX,
            y: minY,
            w: maxX - minX,
            h: maxY - minY,
            area
        };
    }

    /* ==========================================
       MORPHOLOGY
    ========================================== */

    function morphologyOpen(
        mask,
        width,
        height,
        iterations = 1
    ) {
        return dilate(
            erode(
                mask,
                width,
                height,
                iterations
            ),
            width,
            height,
            iterations
        );
    }

    function morphologyClose(
        mask,
        width,
        height,
        iterations = 1
    ) {
        return erode(
            dilate(
                mask,
                width,
                height,
                iterations
            ),
            width,
            height,
            iterations
        );
    }

    function erode(
        mask,
        width,
        height,
        iterations
    ) {

        let src = mask;

        for (
            let it = 0;
            it < iterations;
            it++
        ) {

            const out =
                new Uint8Array(
                    mask.length
                );

            for (
                let y = 1;
                y < height - 1;
                y++
            ) {

                for (
                    let x = 1;
                    x < width - 1;
                    x++
                ) {

                    let keep = 1;

                    for (
                        let dy = -1;
                        dy <= 1;
                        dy++
                    ) {

                        for (
                            let dx = -1;
                            dx <= 1;
                            dx++
                        ) {

                            if (
                                !src[
                                    (y + dy) *
                                    width +
                                    (x + dx)
                                ]
                            ) {
                                keep = 0;
                            }
                        }
                    }

                    out[
                        y * width + x
                    ] = keep;
                }
            }

            src = out;
        }

        return src;
    }

    function dilate(
        mask,
        width,
        height,
        iterations
    ) {

        let src = mask;

        for (
            let it = 0;
            it < iterations;
            it++
        ) {

            const out =
                new Uint8Array(
                    mask.length
                );

            for (
                let y = 1;
                y < height - 1;
                y++
            ) {

                for (
                    let x = 1;
                    x < width - 1;
                    x++
                ) {

                    let value = 0;

                    for (
                        let dy = -1;
                        dy <= 1;
                        dy++
                    ) {

                        for (
                            let dx = -1;
                            dx <= 1;
                            dx++
                        ) {

                            if (
                                src[
                                    (y + dy) *
                                    width +
                                    (x + dx)
                                ]
                            ) {
                                value = 1;
                            }
                        }
                    }

                    out[
                        y * width + x
                    ] = value;
                }
            }

            src = out;
        }

        return src;
    }

    /* ==========================================
       CONTROL
    ========================================== */

    function setEnabled(value) {
        enabled = value;
    }

    function isEnabled() {
        return enabled;
    }

    return {
        detect,
        insideROI,
        setEnabled,
        isEnabled
    };

})();
