import * as Mp4Muxer from "mp4-muxer";

async function run() {
  const canvas = new OffscreenCanvas(720, 1280);
  const ctx = canvas.getContext("2d", {
    // This forces the use of a software (instead of hardware accelerated) 2D canvas
    // This isn't necessary, but produces quicker results
    willReadFrequently: true,
    // Desynchronizes the canvas paint cycle from the event loop
    // Should be less necessary with OffscreenCanvas, but with a real canvas you will want this
    desynchronized: true,
  });

  const fps = 30;
  const duration = 60;
  const numFrames = duration * fps;

  let muxer = new Mp4Muxer.Muxer({
    target: new Mp4Muxer.ArrayBufferTarget(),

    video: {
      // If you change this, make sure to change the VideoEncoder codec as well
      codec: "avc",
      width: canvas.width,
      height: canvas.height,
    },

    // mp4-muxer docs claim you should always use this with ArrayBufferTarget
    fastStart: "in-memory",
  });

  let videoEncoder = new VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (e) => console.error(e),
  });

  // This codec should work in most browsers
  // See https://dmnsgn.github.io/media-codecs for list of codecs and see if your browser supports
  videoEncoder.configure({
    codec: "avc1.42001f",
    width: canvas.width,
    height: canvas.height,
    bitrate: 500_000,
    bitrateMode: "constant",
  });

  // Loops through and draws each frame to the canvas then encodes it
  for (let frameNumber = 0; frameNumber < numFrames; frameNumber++) {
    drawFrameToCanvas({
      ctx,
      canvas,
      frameNumber,
      numFrames
    });
    renderCanvasToVideoFrameAndEncode({
      canvas,
      videoEncoder,
      frameNumber,
      fps
    })
  }

  // Forces all pending encodes to complete
  await videoEncoder.flush();

  muxer.finalize();

  let buffer = muxer.target.buffer;
  downloadBlob(new Blob([buffer]));
}

// Animates a red box moving from top left to top right of screen
function drawFrameToCanvas({ canvas, ctx, frameNumber, numFrames }) {
  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const x = (frameNumber / numFrames) * canvas.width;

  ctx.fillStyle = "red";
  ctx.fillRect(x, 0, 100, 100);
}

async function renderCanvasToVideoFrameAndEncode({
  canvas,
  videoEncoder,
  frameNumber,
  fps,
}) {
  let frame = new VideoFrame(canvas, {
    // Equally spaces frames out depending on frames per second
    timestamp: (frameNumber * 1e6) / fps,
  });

  // The encode() method of the VideoEncoder interface asynchronously encodes a VideoFrame
  videoEncoder.encode(frame);

  // The close() method of the VideoFrame interface clears all states and releases the reference to the media resource.
  frame.close();
}

function downloadBlob(blob) {
  let url = window.URL.createObjectURL(blob);
  let a = document.createElement("a");
  a.style.display = "none";
  a.href = url;
  a.download = "animation.mp4";
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
}

run();
