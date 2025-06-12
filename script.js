// Use an IIFE with async function declaration for proper top-level await and error handling
(async function () {
  // DOM Elements
  const btnPermissions = document.getElementById("btn-permissions");
  const videoScreen = document.getElementById("video-screen");
  const video = document.getElementById("video");
  const overlay = document.getElementById("overlay");
  const locationPermissionsStatus = document.getElementById("location-permissions-status");
  const cameraPermissionsStatus = document.getElementById("camera-permissions-status");
  const facesStatus = document.getElementById("faces-status");
  const scriptSection = document.getElementById("script-section");
  const btnStartScript = document.getElementById("btn-start-script");
  const sttResult = document.getElementById("stt-result");
  const permissions = document.getElementById("permissions");
  const imageUpload = document.getElementById("image-upload"); // file input element
  const imagePreview = document.getElementById("image-preview"); // preview img element
  const locationDisplay = document.getElementById("location-display"); // Add this element in your HTML

  let mediaStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  const speakThis = "Hello Alok, You bought Nischit Ayush Plan with 8 years premium paying term & 35 policy term. You will pay an annual premium of Rupees 200000";
  const expectedScript = "Hello, I am verifying my identity.";
  let uploadedFaceDescriptor = null; // For storing uploaded image face descriptor

  // --- Load face-api.js models ---
  const loadFaceApiModels = async () => {
    // Assumes models are served from /face-models folder.
    await faceapi.nets.ssdMobilenetv1.loadFromUri("/face-models"); // for face detection
    await faceapi.nets.faceLandmark68Net.loadFromUri("/face-models"); // 68-point landmarks
    await faceapi.nets.faceRecognitionNet.loadFromUri("/face-models"); // face descriptor model
    console.log("face-api.js models loaded");
  };
  await loadFaceApiModels();

  // --- Helper: Get Location Permission ---
  const getLocation = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      locationPermissionsStatus.textContent = "✅ Location permission received.";
      // Do NOT show lat/long yet, just store them
      return position.coords;
    } catch (error) {
      let msg = "❌ Location permission denied: ";
      if (error.code === 1) {
        msg += "User denied the request for Geolocation.";
      } else if (error.code === 2) {
        msg += "Location information is unavailable.";
      } else if (error.code === 3) {
        msg += "The request to get user location timed out.";
      } else {
        msg += error.message;
      }
      locationPermissionsStatus.textContent = msg;
      if (locationDisplay) {
        locationDisplay.innerHTML = "";
      }
      console.error("Geolocation error:", error);
      throw error;
    }
  };

  // --- Helper: Get Video Stream ---
  const getVideo = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
      cameraPermissionsStatus.textContent = "✅ Camera permission received.";
      return stream;
    } catch (error) {
      cameraPermissionsStatus.innerHTML = `❌ Please provide camera access. <br/><small class='grey'>${error.message}<br/><br/><i>Refresh the page & try again</i></small>`;
      throw error;
    }
  };

  // --- Handle Image Upload to Extract Face Descriptor ---
  imageUpload.addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (file) {
      // Convert file to an image element
      const img = await faceapi.bufferToImage(file);
      // Detect the face in the uploaded image with landmarks and descriptor
      const detection = await faceapi.detectSingleFace(img).withFaceLandmarks().withFaceDescriptor();
      if (detection) {
        uploadedFaceDescriptor = detection.descriptor;
        imagePreview.src = img.src;
        imagePreview.classList.remove("d-none");
        console.log("Uploaded face descriptor computed.");
      } else {
        alert("No face detected in the uploaded image. Please try another image.");
      }
    } else {
      console.log(this);
    }
  });

  // --- Face Detection and Orientation Check ---
  function isLookingStraight(landmarks) {
    // Use nose and eyes to estimate if looking straight
    if (!landmarks) return false;
    // Indices for nose tip and eyes in 68-point model
    const nose = landmarks.getNose()[3];
    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    // Calculate eye center
    const eyeCenterX = (leftEye[0].x + rightEye[3].x) / 2;
    // If nose tip is far from eye center horizontally, likely turned
    return Math.abs(nose.x - eyeCenterX) < 20; // pixel threshold, tune as needed
  }

  const startFaceApiDetection = () => {
    setInterval(async () => {
      if (!video || video.readyState !== 4) return;
      try {
        const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
        let status = "";
        if (detections.length === 0) {
          status = "❌ No face detected<br>";
        } else if (detections.length > 1) {
          status = "❌ Too many faces in the frame<br>";
        } else {
          const detection = detections[0];
          const faceDetected = !!detection && !!uploadedFaceDescriptor;
          const faceMatch = faceDetected && faceapi.euclideanDistance(detection.descriptor, uploadedFaceDescriptor) < 0.6;
          // Check if looking straight
          const lookingStraight = detection && isLookingStraight(detection.landmarks);
          if (!lookingStraight) {
            status += "❌ Pl. look straight into the camera for the duration of the recording<br>";
          }
          status += faceDetected ? "✅ Single Face detected<br>" : "❌ No face detected<br>";
          if (faceDetected) {
            status += faceMatch ? "✅ Face in video matches the face in the image<br>" : "❌ Face in video does not match the image<br>";
          }
        }
        facesStatus.innerHTML = status;
      } catch {
        facesStatus.innerHTML = "❌ No face detected<br>";
      }
    }, 1000);
  };

  // --- Button Event: Request Permissions and Start Video ---
  btnPermissions.addEventListener("click", async () => {
    // Request location permission
    const coords = await getLocation();
    // Request camera and mic permissions.
    mediaStream = await getVideo();
    video.srcObject = mediaStream;

    video.addEventListener("loadeddata", function onLoadedData() {
      videoScreen.style.display = "block";
      permissions.classList.add("d-none");
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      scriptSection.style.display = "block";
      // Now show lat/long after video is ready
      if (coords && locationDisplay) {
        locationDisplay.innerHTML = `✅ Lat: ${coords.latitude.toFixed(6)} Long: ${coords.longitude.toFixed(6)}`;
      }
      startFaceApiDetection();
      video.removeEventListener("loadeddata", onLoadedData);
    });
  });

  // --- FastSpeech2 TTS Integration ---
  const getFastSpeech2Audio = async (text) => {
    try {
      const response = await fetch("/api/tts/fastspeech2", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, lang: "en" }),
      });
      if (!response.ok) throw new Error("FastSpeech2 TTS failed: " + response.status);
      return await response.blob();
    } catch (err) {
      console.error("FastSpeech2 error:", err);
      throw err;
    }
  };

  // --- TTS and STT (Server-side, now using FastSpeech2 for English) ---
  btnStartScript.addEventListener("click", async () => {
    try {
      // Use FastSpeech2 for English TTS
      const audioBlob = await getFastSpeech2Audio(speakThis);
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.play();
      audio.onended = () => {
        startRecording();
      };
    } catch (error) {
      sttResult.textContent = "Error during TTS: " + error.message;
      console.error("Error during TTS:", error);
    }
  });

  // --- MediaRecorder & STT (Unchanged) ---
  const startRecording = () => {
    recordedChunks = [];
    mediaRecorder = new MediaRecorder(mediaStream, { mimeType: "audio/webm" });
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) recordedChunks.push(e.data);
    };
    mediaRecorder.onstop = uploadAudioForSTT;
    mediaRecorder.start();
    setTimeout(() => {
      mediaRecorder.stop();
    }, 5000);
  };

  const uploadAudioForSTT = async () => {
    const blob = new Blob(recordedChunks, { type: "audio/webm" });
    const response = await fetch("/speech_to_text", {
      method: "POST",
      body: blob,
    }).catch((error) => {
      sttResult.textContent = "Error in speech to text: " + error.message;
      throw error;
    });
    const result = await response.json();
    sttResult.textContent = "Transcribed Text: " + result.text;
    if (result.text.trim().toLowerCase() === expectedScript.toLowerCase()) {
      sttResult.textContent += " (Match!)";
    } else {
      sttResult.textContent += " (Does not match, please try again.)";
    }
  };

  // Start the camera and facemesh after permissions
  btnPermissions.addEventListener("click", async () => {
    await getLocation();
    mediaStream = await getVideo();
    video.srcObject = mediaStream;
    video.addEventListener("loadeddata", function onLoadedData() {
      videoScreen.style.display = "block";
      permissions.classList.add("d-none");
      overlay.width = video.videoWidth;
      overlay.height = video.videoHeight;
      scriptSection.style.display = "block";
      startFaceApiDetection();
      video.removeEventListener("loadeddata", onLoadedData);
    });
  });

  // Ensure webcam permission is requested as soon as the page loads
  window.addEventListener("DOMContentLoaded", () => {
    const video = document.getElementById("video");
    const cameraStatus = document.getElementById("camera-permissions-status");
    navigator.mediaDevices
      .getUserMedia({ video: true, audio: false })
      .then((stream) => {
        video.srcObject = stream;
        video.onloadedmetadata = () => {
          video.play();
          cameraStatus.textContent = "✅ Camera permission granted.";
        };
      })
      .catch((err) => {
        cameraStatus.textContent = "❌ Camera permission denied: " + err.message;
      });
  });
})();
