
/* ==================================================
   AI Honeycomb Inspector v3 Web AR
   Camera Controller
================================================== */

const Camera = (() => {

    let stream = null;
    let facingMode = "environment";

    async function start() {
        const video = document.getElementById("cameraVideo");

        stop();

        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            throw new Error("Camera API is not supported in this browser.");
        }

        const constraints = {
            audio: false,
            video: {
                facingMode: {
                    ideal: facingMode
                },
                width: {
                    ideal: 1280
                },
                height: {
                    ideal: 720
                }
            }
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);

        video.srcObject = stream;
        video.setAttribute("playsinline", true);
        video.muted = true;

        await video.play();

        resizeCanvases();
    }

    function stop() {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
    }

    async function switchCamera() {
        facingMode =
            facingMode === "environment"
                ? "user"
                : "environment";

        await start();
    }

    function resizeCanvases() {
        const video = document.getElementById("cameraVideo");
        const processCanvas = document.getElementById("processCanvas");
        const arCanvas = document.getElementById("arCanvas");

        const width = video.videoWidth || window.innerWidth;
        const height = video.videoHeight || window.innerHeight;

        processCanvas.width = width;
        processCanvas.height = height;

        arCanvas.width = width;
        arCanvas.height = height;
    }

    function getStream() {
        return stream;
    }

    return {
        start,
        stop,
        switchCamera,
        resizeCanvases,
        getStream
    };

})();
