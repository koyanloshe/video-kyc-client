// Use an IIFE with async function declaration for proper top-level await and error handling
(async () => {
  // DOM Elements
  const btnPermissions = document.getElementById("btn-permissions");
  const videoScreen = document.getElementById("video-screen");
  const video = document.getElementById("video");
  const overlay = document.getElementById("overlay");
  const locationPermissionsStatus = document.getElementById(
    "location-permissions-status"
  );
  const cameraPermissionsStatus = document.getElementById(
    "camera-permissions-status"
  );
  const facesStatus = document.getElementById("faces-status");
  const scriptSection = document.getElementById("script-section");
  const btnStartScript = document.getElementById("btn-start-script");
  const sttResult = document.getElementById("stt-result");
  const permissions = document.getElementById("permissions");
  const imageUpload = document.getElementById("image-upload"); // file input element
  const imagePreview = document.getElementById("image-preview"); // preview img element
  const locationDisplay = document.getElementById("location-display"); // Add this element in your HTML
  const btnUploadImage = document.getElementById("btn-upload-image");
  const uploadHelpText = document.getElementById("upload-help-text");
  const faceSuccess = document.querySelector(".face-success");
  const imageUploadLoader = document.getElementById("image-upload-loader");
  const loginForm = document.getElementById("login-form");
  const loginError = document.getElementById("login-error");
  const ttsAudio = document.getElementById("audio-tts");
  const selectedLanguageEl = document.getElementById("language-select");
  const videoFacesStatus = document.getElementById("video-faces-status");
  const loginScreen = document.getElementById("login-screen");
  const appContent = document.getElementById("app-content");
  const imageUploadSection = document.getElementById("image-upload-section");
  const imageUploadWidget = document.getElementById("image-upload-widget");
  const btnResetBrightness = document.getElementById("btn-reset-brightness");
  const btnIncreaseBrightness = document.getElementById(
    "btn-increase-brightness"
  );
  const btnDecreaseBrightness = document.getElementById(
    "btn-decrease-brightness"
  );
  const backToUpload = document.getElementById("btn-back-to-upload");

  const backFromPermissions = document.getElementById(
    "btn-back-from-permissions"
  );
  const backFromVideo = document.getElementById("btn-back-from-video");
  const videoSection = document.getElementById("video-section");

  // global variables
  let mediaStream = null;
  let mediaRecorder = null;
  let recordedChunks = [];
  let audioContent = null;

  let uploadedFaceDescriptor = null; // For storing uploaded image face descriptor

  // --- Preload face-api models as soon as possible ---
  let faceApiModelsLoaded = false;
  let faceApiModelsLoadingPromise = null;

  // --- PBKDF2 password hash and salt for login ---
  const PBKDF2_SALT = "video-kyc-demo-salt";
  const PBKDF2_HASH =
    "9ae72d6eb561507f92ea0c2d4ad027282b04589f108583deed954d2fb6c063c6";
  const expectedScript = "Hello, I am verifying my identity.";
  const defaultLanguage = "en-IN"; // Default language for TTS
  const speakThisMap = {
    "en-IN":
      "Hello Alok Shenoy, You bought Nischit Ayush Plan with 8 years premium paying term & 35 policy term. You will pay an annual premium of Rupees 2 Lakhs",
    "hi-IN":
      "नमस्ते आलोक शेनॉय, आपने निशचित आयुष योजना खरीदी है जिसमें 8 वर्षों की प्रीमियम भुगतान अवधि और 35 पॉलिसी अवधि है। आप हर साल 2 लाख रुपये का प्रीमियम देंगे।",
    "ta-IN":
      "வணக்கம் ஆலோக் ஷெனாய், நீங்கள் 8 ஆண்டுகள் பிரீமியம் செலுத்தும் காலம் மற்றும் 35 கொள்கை காலத்துடன் நிச்சயித் ஆயுஷ் திட்டத்தை வாங்கியுள்ளீர்கள். நீங்கள் ஆண்டுக்கு ரூபாய் 2 லட்சம் பிரீமியம் செலுத்துவீர்கள்.",
    "te-IN":
      "హలో ఆలక్ శెనోయ్, మీరు 8 సంవత్సరాల ప్రీమియం చెల్లింపు కాలం మరియు 35 పాలసీ కాలంతో నిశ్చిత ఆయుష్ ప్లాన్ కొనుగోలు చేసారు. మీరు వార్షికంగా రూ. 2 లక్షల ప్రీమియం చెల్లిస్తారు.",
    "kn-IN":
      "ನಮಸ್ಕಾರ ಆಲೋಕ್ ಶೆನಾಯ್, ನೀವು 8 ವರ್ಷಗಳ ಪ್ರೀಮಿಯಂ ಪಾವತಿ ಅವಧಿ ಮತ್ತು 35 ಪಾಲಿಸಿ ಅವಧಿಯೊಂದಿಗೆ ನಿಶ್ಚಿತ ಆಯುಷ್ ಯೋಜನೆಯನ್ನು ಖರೀದಿಸಿದ್ದೀರಿ. ನೀವು ವಾರ್ಷಿಕವಾಗಿ ರೂ. 2 ಲಕ್ಷ ಪ್ರೀಮಿಯಂ ಪಾವತಿಸುತ್ತೀರಿ.",
    "ml-IN":
      "ഹലോ അലോക് ഷേനോയ്, നിങ്ങൾ 8 വർഷ പ്രീമിയം പെയിംഗ് കാലവും 35 പോളിസി കാലവും ഉള്ള നിശ്ചിത ആയുഷ് പ്ലാൻ വാങ്ങിയിരിക്കുന്നു. നിങ്ങൾ വാർഷികമായി 2 ലക്ഷം രൂപ പ്രീമിയം നൽകും.",
    "mr-IN":
      "नमस्कार आलोक शेनॉय, तुम्ही 8 वर्षे प्रीमियम भरण्याची मुदत आणि 35 पॉलिसी कालावधीसह निशचित आयुष योजना खरेदी केली आहे. तुम्ही वार्षिक 2 लाख रुपयांचे प्रीमियम भराल.",
    "gu-IN":
      "નમસ્તે આલોક શેનોય, તમે 8 વર્ષ પ્રીમિયમ ચૂકવણી સમયગાળો અને 35 પોલિસી સમયગાળો સાથે નિશ્ચિત આયુષ્ય યોજના ખરીદી છે. તમે વાર્ષિક 2 લાખ રૂપિયાનું પ્રીમિયમ ચૂકવશો.",
    "bn-IN":
      "হ্যালো আলোক শেনয়, আপনি 8 বছরের প্রিমিয়াম পরিশোধের মেয়াদ এবং 35 পলিসি মেয়াদ সহ নিশ্চিত আয়ুষ পরিকল্পনা কিনেছেন। আপনি বার্ষিক 2 লাখ রুপি প্রিমিয়াম পরিশোধ করবেন।",
    "ur-IN":
      "ہیلو الوک شینوی، آپ نے 8 سال کی پریمیم ادائیگی کی مدت اور 35 پالیسی کی مدت کے ساتھ نشتھت آیوش منصوبہ خریدا ہے۔ آپ سالانہ 2 لاکھ روپے کا پریمیم ادا کریں گے۔",
  };
  let selectedLanguage =
    localStorage.getItem("selectedLanguage") || defaultLanguage; // Get from localStorage or use default
  let speakThis =
    speakThisMap[selectedLanguage] || speakThisMap[defaultLanguage]; // Default language content

  // Functions
  // Helper functions for loading placeholder
  const showLoadingPlaceholder = () => {
    document.getElementById("loading-placeholder")?.classList.remove("d-none");
  };

  const hideLoadingPlaceholder = () => {
    document.getElementById("loading-placeholder")?.classList.add("d-none");
  };

  const preloadFaceApiModels = async () => {
    if (!faceApiModelsLoadingPromise) {
      faceApiModelsLoadingPromise = (async () => {
        await faceapi.nets.ssdMobilenetv1.loadFromUri(
          "https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/refs/heads/master/ssd_mobilenetv1/ssd_mobilenetv1_model-weights_manifest.json"
        );
        await faceapi.nets.faceLandmark68Net.loadFromUri(
          "https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/refs/heads/master/face_landmark_68/face_landmark_68_model-weights_manifest.json"
        );
        await faceapi.nets.faceRecognitionNet.loadFromUri(
          "https://raw.githubusercontent.com/justadudewhohacks/face-api.js-models/refs/heads/master/face_recognition/face_recognition_model-weights_manifest.json"
        );
        faceApiModelsLoaded = true;
      })();
    }
    return faceApiModelsLoadingPromise;
  };

  // --- Helper: Get Location Permission ---
  const getLocation = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      locationPermissionsStatus.textContent =
        "✅ Location permission received.";
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

  // --- PBKDF2 Hashing Function for Login ---
  const hashPasswordPBKDF2 = async (password, salt) => {
    const enc = new TextEncoder();
    const key = await window.crypto.subtle.importKey(
      "raw",
      enc.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveBits"]
    );
    const derivedBits = await window.crypto.subtle.deriveBits(
      {
        name: "PBKDF2",
        salt: enc.encode(salt),
        iterations: 100000,
        hash: "SHA-256",
      },
      key,
      256
    );
    return Array.from(new Uint8Array(derivedBits))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  };

  // --- Centering/size check for image upload (less strict) ---
  const isFaceCenteredAndSizedImage = (
    detection,
    containerWidth,
    containerHeight
  ) => {
    if (!detection) return false;
    const box = detection.detection.box;
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const frameCenterX = containerWidth / 2;
    const frameCenterY = containerHeight / 2;
    // Less strict: 20% margin
    const marginX = containerWidth * 0.2;
    const marginY = containerHeight * 0.2;
    const centered =
      Math.abs(faceCenterX - frameCenterX) < marginX &&
      Math.abs(faceCenterY - frameCenterY) < marginY;
    // Sizing: portrait vs landscape
    const isPortrait = containerHeight > containerWidth;
    let sizeOk = false;
    if (isPortrait) {
      sizeOk = box.height / containerHeight >= 0.3; // 30% for image
    } else {
      sizeOk = box.width / containerWidth >= 0.15; // 15% for image
    }
    return centered && sizeOk;
  };

  // --- Centering/size check for video (strict, must stay within outline) ---
  const isFaceCenteredAndSizedVideo = (
    detection,
    containerWidth,
    containerHeight
  ) => {
    if (!detection) return false;
    const box = detection.detection.box;
    // SVG outline: ellipse cx=320 cy=240 rx=100 ry=140 for 640x480
    // Scale for current video size
    const svgW = 640,
      svgH = 480;
    const scaleX = containerWidth / svgW;
    const scaleY = containerHeight / svgH;
    const ellipseCx = 320 * scaleX;
    const ellipseCy = 240 * scaleY;
    const ellipseRx = 100 * scaleX;
    const ellipseRy = 140 * scaleY;
    // Face center must be within ellipse
    const faceCenterX = box.x + box.width / 2;
    const faceCenterY = box.y + box.height / 2;
    const normX = (faceCenterX - ellipseCx) / ellipseRx;
    const normY = (faceCenterY - ellipseCy) / ellipseRy;
    const insideEllipse = normX * normX + normY * normY <= 1;
    // Face must not be larger than the ellipse
    const fitsEllipse =
      box.width <= ellipseRx * 2 && box.height <= ellipseRy * 2;
    // Face must not be too small
    const minSize = 0.15 * Math.min(containerWidth, containerHeight);
    const sizeOk = box.width >= minSize && box.height >= minSize;
    return insideEllipse && fitsEllipse && sizeOk;
  };

  // --- Strict face orientation check for image ---
  const isFacePointingForwardImage = (landmarks) => {
    if (!landmarks) return false;
    const nose = landmarks.getNose()[3];
    const jaw = landmarks.getJawOutline();
    const jawLeft = jaw[0];
    const jawRight = jaw[16];
    const jawCenterX = (jawLeft.x + jawRight.x) / 2;
    const yaw = Math.abs(nose.x - jawCenterX);
    const jawAvgY = jaw.reduce((sum, pt) => sum + pt.y, 0) / jaw.length;
    const pitch = Math.abs(nose.y - jawAvgY);
    // --- Debug: log yaw and pitch for image upload orientation check ---
    console.log("Selfie orientation check:", { yaw, pitch });
    // Selfie friendly: yaw < 120px, pitch < 160px
    return yaw < 120 && pitch < 250;
  };

  // --- Strict face orientation check for video ---
  const isFacePointingForwardVideo = (landmarks) => {
    if (!landmarks) return false;
    const nose = landmarks.getNose()[3];
    const jaw = landmarks.getJawOutline();
    const jawLeft = jaw[0];
    const jawRight = jaw[16];
    const jawCenterX = (jawLeft.x + jawRight.x) / 2;
    const yaw = Math.abs(nose.x - jawCenterX);
    const jawAvgY = jaw.reduce((sum, pt) => sum + pt.y, 0) / jaw.length;
    const pitch = Math.abs(nose.y - jawAvgY);
    // Restore strict: yaw < 20px, pitch < 70px
    return yaw < 20 && pitch < 70;
  };

  // Helper to set SVG face outline color
  const setFaceOutlineColor = (color) => {
    const ellipse = document.getElementById("face-outline-ellipse");
    if (ellipse) ellipse.setAttribute("stroke", color);
  };

  const updateVideoFaceStatus = (opts) => {
    let status = "";
    // 1. Face count
    if (opts.faceCount === 0) {
      status += "❌ No face detected<br>";
      setFaceOutlineColor("white");
    } else if (opts.faceCount > 1) {
      status += "❌ Too many faces in the frame<br>";
      setFaceOutlineColor("red");
    } else {
      status += "✅ Single Face detected<br>";
    }
    // 2. Centering and size (strict)
    let allPass = opts.faceCount === 1;
    if (opts.faceCount === 1) {
      if (opts.centeredAndSized) {
        status += "✅ Face is centered & of the right size<br>";
      } else {
        status += "❌ Face is not centered or not of the right size<br>";
        allPass = false;
      }
    }
    // 3. Looking straight
    if (opts.faceCount === 1) {
      if (opts.lookingStraight) {
        status += "✅ Face is looking towards the camera<br>";
      } else {
        status +=
          "❌ Pl. look straight into the camera for the duration of the recording<br>";
        allPass = false;
      }
    }
    // 4. Face match
    if (opts.faceCount === 1 && opts.hasUploadedDescriptor) {
      if (opts.faceMatch) {
        status += "✅ Face in video matches the face in the image<br>";
      } else {
        status += "❌ Face in video does not match the image<br>";
        allPass = false;
      }
    }
    // Set SVG color: green if all pass, red if any fail, white if no face
    if (opts.faceCount === 0) {
      setFaceOutlineColor("white");
    } else if (allPass) {
      setFaceOutlineColor("green");
    } else {
      setFaceOutlineColor("red");
    }
    // Enable or disable btn-start-script using Bootstrap's disabled attribute
    if (btnStartScript) {
      if (allPass) {
        btnStartScript.removeAttribute("disabled");
      } else {
        btnStartScript.setAttribute("disabled", "disabled");
      }
    }
    videoFacesStatus.innerHTML = status;
  };

  const startFaceApiDetection = () => {
    setInterval(async () => {
      if (!video || video.readyState !== 4) return;
      try {
        const detections = await faceapi
          .detectAllFaces(video)
          .withFaceLandmarks()
          .withFaceDescriptors();
        const faceCount = detections.length;
        let lookingStraight = false;
        let faceMatch = false;
        let centeredAndSized = false;
        if (faceCount === 1) {
          const detection = detections[0];
          lookingStraight = isFacePointingForwardVideo(detection.landmarks);
          faceMatch =
            !!uploadedFaceDescriptor &&
            faceapi.euclideanDistance(
              detection.descriptor,
              uploadedFaceDescriptor
            ) < 0.6;
          centeredAndSized = isFaceCenteredAndSizedVideo(
            detection,
            video.videoWidth,
            video.videoHeight
          );
        }
        updateVideoFaceStatus({
          faceCount,
          lookingStraight,
          faceMatch,
          hasUploadedDescriptor: !!uploadedFaceDescriptor,
          centeredAndSized,
        });
      } catch {
        updateVideoFaceStatus({
          faceCount: 0,
          lookingStraight: false,
          faceMatch: false,
          hasUploadedDescriptor: !!uploadedFaceDescriptor,
          centeredAndSized: false,
        });
      }
    }, 1000);
  };

  // --- Google TTS Integration ---
  const playGoogleTTS = async (text) => {
    try {
      const apiKey = await fetch(
        "https://gist.githubusercontent.com/koyanloshe/63ea67f77d87f57e02c3d912f7b99349/raw/26da150ef5bec711231e83da80c68c0ba00e24ff/stt-tts.json"
      )
        .then((result) => result.json())
        .catch((err) => {
          console.error("Error fetching API key:", err);
        });

      const body = {
        audioConfig: {
          audioEncoding: "LINEAR16",
          effectsProfileId: ["handset-class-device"],
          pitch: 0,
          speakingRate: 1,
        },
        input: { text },
        voice: {
          languageCode: selectedLanguage,
          name: `${selectedLanguage}-Chirp3-HD-Achird`,
        },
      };
      const response = await fetch(
        "https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=" +
          apiKey["apiKey"],
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }
      );
      if (!response.ok)
        throw new Error("Google TTS failed: " + response.status);
      const data = await response.json();
      audioContent = data.audioContent;
      localStorage.setItem("tts", audioContent); // Store the audio URL in localStorage
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioContent), (c) => c.charCodeAt(0))],
        { type: "audio/wav" }
      );
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      ttsAudio.src = audioUrl;
      // dont play audio immediately, just set the source
      audio.load(); // Load the audio to prepare for playback
      audio.play();
      return new Promise((resolve) => {
        audio.onended = resolve;
      });
    } catch (error) {
      console.error("Error during Google TTS:", error);
    }
  };

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

  const getCurrentBrightness = () => {
    const brightnessRegex = /brightness\(([^)]+)\)/;
    const match = brightnessRegex.exec(video.style.filter);
    const currentBrightness = parseFloat(match?.[1] || 1);
    return currentBrightness;
  };

  // Executions
  // Start preloading as soon as script loads
  preloadFaceApiModels();

  // Set script-text content to speakThis on page load
  window.addEventListener("DOMContentLoaded", () => {
    const scriptText = document.getElementById("script-text");
    if (localStorage.getItem("selectedLanguage")) {
      selectedLanguage = localStorage.getItem("selectedLanguage");
      selectedLanguageEl.value = selectedLanguage; // Set the select element to the stored language

      if (localStorage.getItem("ttsContent")) {
        speakThis = localStorage.getItem("ttsContent");
      } else {
        speakThis =
          speakThisMap[selectedLanguage] || speakThisMap[defaultLanguage];
      }
    } else {
      localStorage.setItem("selectedLanguage", defaultLanguage);
      speakThis = speakThisMap[defaultLanguage];
      localStorage.setItem("ttsContent", speakThis);
    }
    if (scriptText) scriptText.textContent = speakThis;
  });

  // --- Login event handler (PBKDF2) ---
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // Prevent default form submission
    const formData = new FormData(e.target);
    const user = formData.get("username").toLowerCase().trim();
    const pass = formData.get("password");
    try {
      const inputHash = await hashPasswordPBKDF2(pass, PBKDF2_SALT);
      if (user === "alok" && inputHash === PBKDF2_HASH) {
        loginScreen?.classList.add("d-none");
        appContent?.classList.remove("d-none");
        if (!faceApiModelsLoaded) showLoadingPlaceholder();
        await preloadFaceApiModels();
        hideLoadingPlaceholder();
        imageUploadSection?.classList.remove("d-none");
        loginScreen?.classList.add("d-none");
      } else {
        loginError.textContent = "Invalid credentials";
        loginError.classList.remove("d-none");
        loginScreen?.classList.remove("d-none");
        appContent?.classList.add("d-none");
      }
    } catch (err) {
      loginError.textContent = "Login error: " + (err.message || err);
      loginError.classList.remove("d-none");
      loginScreen?.classList.remove("d-none");
      appContent?.classList.add("d-none");
    }
  });

  // --- Language Selection Event ---
  selectedLanguageEl.addEventListener("change", () => {
    const lang = selectedLanguageEl.value;
    localStorage.setItem("selectedLanguage", lang);

    speakThis = speakThisMap[lang] || speakThisMap["en-IN"];
    localStorage.setItem("ttsContent", speakThis);
    document.getElementById("script-text").textContent = speakThis;
  });

  // Accept this Image button event: show permissions section and hide upload section
  btnUploadImage.addEventListener("click", () => {
    permissions.classList.remove("d-none");
    imageUploadSection.classList.add("d-none");
  });

  backToUpload.addEventListener("click", () => {
    permissions.classList.add("d-none");
    imageUploadSection.classList.remove("d-none");
    imageUploadWidget.classList.remove("d-none");
    uploadHelpText.classList.remove("d-none");
    imagePreview.src = "";
    imagePreview.classList.add("d-none");
    facesStatus.classList.add("d-none");
    faceSuccess.classList.add("d-none");
    uploadedFaceDescriptor = null;
  });

  // --- Handle Image Upload to Extract Face Descriptor and Validate Orientation ---
  imageUpload.addEventListener("change", async (e) => {
    if (imageUploadLoader) imageUploadLoader.classList.remove("d-none");
    overlay.classList.add("d-none");
    const file = e.target.files[0];
    facesStatus.classList.remove("d-none");
    faceSuccess.classList.add("d-none");
    imageUploadWidget.classList.add("d-none");
    uploadedFaceDescriptor = null;
    imagePreview.src = "";
    imagePreview.classList.add("d-none");

    let status = "";
    let allValid = true;

    try {
      if (!file) {
        status = "❌ No file selected.";
        allValid = false;
      } else {
        const img = await faceapi.bufferToImage(file);
        const detections = await faceapi
          .detectAllFaces(img)
          .withFaceLandmarks()
          .withFaceDescriptors();

        if (detections.length !== 1) {
          status =
            detections.length === 0
              ? "❌ No face detected in the uploaded image."
              : "❌ Multiple faces detected. Please upload a photo with only one face.";
          allValid = false;
        } else {
          const detection = detections[0];
          const landmarks = detection.landmarks;
          const imgWidth = img.width || imagePreview.width || 640;
          const imgHeight = img.height || imagePreview.height || 480;

          const centeredAndSized = isFaceCenteredAndSizedImage(
            detection,
            imgWidth,
            imgHeight
          );
          const pointingForward = isFacePointingForwardImage(landmarks);

          if (!centeredAndSized) {
            status += "❌ Face is not centered or not the right size.<br>";
            allValid = false;
          } else {
            status += "✅ Face is centered and the right size.<br>";
          }
          if (!pointingForward) {
            status +=
              "❌ Please upload a photo where your face is pointing mostly straight at the camera.";
            allValid = false;
          } else {
            status += "✅ Face is pointing straight at the camera.<br>";
          }

          if (allValid) {
            status += "✅ Valid image uploaded. Ready for verification.";
            faceSuccess.classList.remove("d-none");
            uploadedFaceDescriptor = detection.descriptor;
            imagePreview.src = img.src;
            imagePreview.classList.remove("d-none");
          } else {
            imageUploadWidget.classList.remove("d-none");
          }
        }
      }
      facesStatus.innerHTML = status;
    } finally {
      if (imageUploadLoader) imageUploadLoader.classList.add("d-none");
    }
  });

  // --- Button Event: Request Permissions and Start Video ---
  btnPermissions.addEventListener("click", async () => {
    try {
      // Request location permission
      const coords = await getLocation();
      // Request camera and mic permissions.
      mediaStream = await getVideo();
      video.srcObject = mediaStream;

      video.addEventListener("loadeddata", function onLoadedData() {
        videoScreen.classList.remove("d-none");
        permissions.classList.add("d-none");
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
        scriptSection.classList.remove("d-none");
        overlay.classList.remove("d-none"); // Show canvas after permissions
        videoSection.classList.remove("d-none");
        // Now show lat/long after video is ready
        if (coords && locationDisplay) {
          locationDisplay.innerHTML = `✅ Lat: ${coords.latitude.toFixed(
            6
          )} Long: ${coords.longitude.toFixed(6)}`;
        }
        startFaceApiDetection();
        video.removeEventListener("loadeddata", onLoadedData);
      });
    } catch (error) {
      console.error("Error during permissions request:", error);
    }
  });

  backFromPermissions.addEventListener("click", () => {
    permissions.classList.add("d-none");
    imageUploadSection.classList.remove("d-none");
    imageUploadWidget.classList.remove("d-none");
    uploadHelpText.classList.remove("d-none");
    imagePreview.src = "";
    imagePreview.classList.add("d-none");
    facesStatus.classList.add("d-none");
    faceSuccess.classList.add("d-none");
    uploadedFaceDescriptor = null;
  });

  // --- Script Section: Play TTS for speakThis ---
  if (btnStartScript) {
    btnStartScript.addEventListener("click", async () => {
      try {
        if (localStorage.getItem("tts")) {
          audioContent = localStorage.getItem("tts");
        } else {
          await playGoogleTTS(speakThis);
        }
        // Next steps after TTS playback can be added here
      } catch (error) {
        sttResult.textContent = "Error during TTS: " + error.message;
        console.error("Error during TTS:", error);
      }
    });
  }

  btnResetBrightness.addEventListener("click", () => {
    video.style.filter = "brightness(1)";
  });

  btnIncreaseBrightness.addEventListener("click", () => {
    // get existing brightness value then add + 0.25
    const currentBrightness = getCurrentBrightness();
    video.style.filter = `brightness(${currentBrightness + 0.25})`;
  });

  btnDecreaseBrightness.addEventListener("click", () => {
    // get existing brightness value then subtract - 0.25
    const currentBrightness = getCurrentBrightness();
    video.style.filter = `brightness(${currentBrightness - 0.25})`;
  });

  backFromVideo.addEventListener("click", () => {
    videoSection.classList.add("d-none");
    locationDisplay.innerHTML = "";
    videoFacesStatus.innerHTML = "";
    scriptSection.classList.add("d-none");
    videoScreen.classList.add("d-none");
    permissions.classList.remove("d-none");
    overlay.classList.add("d-none");
    video.srcObject = null; // Stop the video stream
    if (mediaStream) {
      mediaStream.getTracks().forEach((track) => track.stop());
      mediaStream = null;
    }
  });
})();
