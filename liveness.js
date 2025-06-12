// Liveness and Face Match Detection using face-api.js, MediaPipe FaceMesh, and TensorFlow.js
let video = document.getElementById("video");
let overlay = document.getElementById("overlay");
let ctx = overlay.getContext("2d");
let statusDiv = document.getElementById("status");
let faceMatchResult = document.getElementById("faceMatchResult");
let photoUpload = document.getElementById("photoUpload");

let uploadedDescriptor = null;
let blinkCount = 0;
let staticFrames = 0;
let lastLandmarks = null;
let lastEyeState = null;
let staticThreshold = 30; // Number of frames to consider as static
let blinkThreshold = 0.18; // Eye aspect ratio threshold for blink
let minBlinks = 1; // Minimum blinks in 10 seconds
let faceapiModelsLoaded = false;

// Load face-api.js models
Promise.all([faceapi.nets.tinyFaceDetector.loadFromUri("/models"), faceapi.nets.faceLandmark68Net.loadFromUri("/models"), faceapi.nets.faceRecognitionNet.loadFromUri("/models")]).then(() => {
  faceapiModelsLoaded = true;
});

// Start webcam
navigator.mediaDevices
  .getUserMedia({ video: true, audio: false })
  .then((stream) => {
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      video.play();
      // Start MediaPipe camera only after video is ready
      camera.start();
    };
  })
  .catch((err) => {
    statusDiv.textContent = "Webcam access denied or not available: " + err.message;
  });

// MediaPipe FaceMesh setup
const faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
faceMesh.setOptions({
  maxNumFaces: 2,
  refineLandmarks: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5,
});
faceMesh.onResults(onFaceMeshResults);

const camera = new Camera(video, {
  onFrame: async () => {
    await faceMesh.send({ image: video });
  },
  width: 480,
  height: 360,
});

// Face Match: Upload photo and compute descriptor
photoUpload.addEventListener("change", async function () {
  const file = this.files[0];
  if (file && faceapiModelsLoaded) {
    const img = await faceapi.bufferToImage(file);
    const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
    if (detection) {
      uploadedDescriptor = detection.descriptor;
      faceMatchResult.textContent = "Photo uploaded.";
    } else {
      faceMatchResult.textContent = "No face detected in photo.";
    }
  }
});

// Helper: Eye aspect ratio for blink detection
function getEAR(landmarks, left = true) {
  // Use MediaPipe FaceMesh landmark indices for eyes
  // Left: [33, 160, 158, 133, 153, 144], Right: [362, 385, 387, 263, 373, 380]
  const idx = left ? [33, 160, 158, 133, 153, 144] : [362, 385, 387, 263, 373, 380];
  function dist(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }
  const p = idx.map((i) => landmarks[i]);
  return (dist(p[1], p[5]) + dist(p[2], p[4])) / (2.0 * dist(p[0], p[3]));
}

// Helper: Check if landmarks are static
function isStatic(landmarks, lastLandmarks, threshold = 2) {
  if (!landmarks || !lastLandmarks) return false;
  let total = 0;
  for (let i = 0; i < landmarks.length; i++) {
    total += Math.abs(landmarks[i].x - lastLandmarks[i].x) + Math.abs(landmarks[i].y - lastLandmarks[i].y);
  }
  return total / landmarks.length < threshold / 1000;
}

// Main callback for MediaPipe FaceMesh
async function onFaceMeshResults(results) {
  ctx.clearRect(0, 0, overlay.width, overlay.height);
  if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
    statusDiv.textContent = "No face detected.";
    return;
  }
  if (results.multiFaceLandmarks.length > 1) {
    statusDiv.textContent = "More than one face detected!";
    return;
  }
  const landmarks = results.multiFaceLandmarks[0];
  // Draw landmarks
  ctx.strokeStyle = "lime";
  ctx.beginPath();
  for (const pt of landmarks) {
    ctx.moveTo(pt.x * overlay.width, pt.y * overlay.height);
    ctx.arc(pt.x * overlay.width, pt.y * overlay.height, 1, 0, 2 * Math.PI);
  }
  ctx.stroke();

  // Blink detection
  const leftEAR = getEAR(landmarks, true);
  const rightEAR = getEAR(landmarks, false);
  const ear = (leftEAR + rightEAR) / 2.0;
  let eyeState = ear < blinkThreshold ? "closed" : "open";
  if (lastEyeState === "open" && eyeState === "closed") blinkCount++;
  lastEyeState = eyeState;

  // Static face detection
  if (isStatic(landmarks, lastLandmarks)) staticFrames++;
  else staticFrames = 0;
  lastLandmarks = landmarks;

  // Face match (live video vs uploaded photo)
  if (uploadedDescriptor && faceapiModelsLoaded) {
    const detection = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();
    if (detection) {
      const distance = faceapi.euclideanDistance(uploadedDescriptor, detection.descriptor);
      faceMatchResult.textContent = distance < 0.6 ? "Face matches photo." : "Face does NOT match photo!";
    }
  }

  // Status
  let statusMsg = `Blink count: ${blinkCount} | `;
  statusMsg += staticFrames > staticThreshold ? "Face static (possible spoof)" : "Face moving";
  statusDiv.textContent = statusMsg;
}
