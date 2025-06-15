// Run this in your browser console or Node.js to generate the encrypted password and public key JWK
(async () => {
  const password = "absli123";
  const keyPair = await window.crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["encrypt", "decrypt"]);
  const publicKeyJwk = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const enc = new TextEncoder();
  const encrypted = await window.crypto.subtle.encrypt({ name: "RSA-OAEP" }, keyPair.publicKey, enc.encode(password));
  const encryptedB64 = btoa(String.fromCharCode(...new Uint8Array(encrypted)));
  console.log("PUBLIC_KEY_JWK:", JSON.stringify(publicKeyJwk, null, 2));
  console.log("ENCRYPTED_PASSWORD_B64:", encryptedB64);
})();

// Run this in your browser console to generate a PBKDF2 hash for the password
(async () => {
  const password = "absli123";
  const salt = "video-kyc-demo-salt"; // Use a random string for real apps
  const enc = new TextEncoder();
  const key = await window.crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
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
  const hashHex = Array.from(new Uint8Array(derivedBits))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  console.log("PBKDF2_SALT:", salt);
  console.log("PBKDF2_HASH:", hashHex);
})();

// --- Check if face is centered in the frame ---
// const isFaceCentered = (detection, containerWidth) => {
//   if (!detection) return false;
//   const box = detection.detection.box;
//   const faceCenterX = box.x + box.width / 2;
//   const frameCenterX = containerWidth / 2;
//   // Make the margin stricter: 10% of frame width
//   const margin = containerWidth * 0.1;
//   return Math.abs(faceCenterX - frameCenterX) < margin;
// };

// --- Helper: Get Face Descriptor from Video ---
// const getVideoFaceDescriptor = async () => {
//   if (!video || video.readyState !== 4) return null;
//   const detections = await faceapi.detectAllFaces(video).withFaceLandmarks().withFaceDescriptors();
//   if (detections.length === 0) return null;
//   return detections[0].descriptor;
// };
