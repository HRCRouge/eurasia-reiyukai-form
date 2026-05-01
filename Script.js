"use strict";

document.addEventListener("DOMContentLoaded", () => {

  const CONFIG = {
    BACKEND_URL:   "https://script.google.com/macros/s/AKfycbyRa8d6u8o37yCBcaPOzz9sWKp-xoDYTjAhjxEya64fVEbGicPeHQJKKdbRO95EqWAS/exec",
    DRY_RUN:       false,
    IMAGE_MAX_PX:  1000,
    IMAGE_QUALITY: 0.75,
  };

  /* ── PASSPORT PHOTO preview ── */
  const photoInput   = document.getElementById("photoInput");
  const photoStatus  = document.getElementById("photoStatus");
  const photoPreview = document.getElementById("photoPreview");

  if (photoInput) {
    photoInput.addEventListener("change", () => {
      const file = photoInput.files[0];
      if (!file) return;
      const r = new FileReader();
      r.onload = ev => {
        photoPreview.src           = ev.target.result;
        photoPreview.style.display = "block";
        photoStatus.style.display  = "none";
      };
      r.readAsDataURL(file);
    });
  }

  /* ── PAYMENT feedback ── */
  const paymentFileInput = document.getElementById("paymentScreenshot");
  const paymentStatus    = document.getElementById("paymentStatus");
  if (paymentFileInput) {
    paymentFileInput.addEventListener("change", () => {
      paymentStatus.textContent = paymentFileInput.files.length
        ? "✓ Screenshot selected: " + paymentFileInput.files[0].name : "";
    });
  }

  /* ── QR MODAL ── */
  const qrImage    = document.getElementById("qrImage");
  const qrModal    = document.getElementById("qrModal");
  const qrModalImg = document.getElementById("qrModalImg");
  if (qrImage && qrModal) {
    qrImage.addEventListener("click", () => { qrModalImg.src = qrImage.src; qrModal.style.display = "flex"; });
    qrModal.addEventListener("click", () => { qrModal.style.display = "none"; });
    document.addEventListener("keydown", e => { if (e.key === "Escape") qrModal.style.display = "none"; });
  }

  /* ── TOAST ── */
  function showToast(msg, duration = 4000) {
    const t = document.getElementById("toast");
    if (!t) return;
    t.textContent = msg;
    t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), duration);
  }

  /* ── VALIDATION ── */
  function validateForm(form) {
    const errors = [];
    if (!form.name_english.value.trim()) errors.push("Name in English is required.");
    if (!form.phone.value.trim())        errors.push("Phone number is required.");
    if (!form.dob.value)                 errors.push("Date of birth is required.");
    const em = form.email.value.trim();
    if (em && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em)) errors.push("Invalid email address.");
    if (!photoInput || !photoInput.files.length)       errors.push("Passport photo is required.");
    return errors;
  }

  /* ── IMAGE COMPRESSION ──
     Shrinks image to max 1000px on longest side and re-encodes
     as JPEG at 75% quality. Turns a 5 MB phone photo into ~100 KB,
     keeping the total JSON payload well under Apps Script's 6 MB limit.
  ── */
  function compressImage(file, maxPx, quality) {
    return new Promise((resolve, reject) => {
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Cannot read " + file.name));
      reader.onload  = ev => {
        const img = new Image();
        img.onerror = () => reject(new Error("Cannot decode " + file.name));
        img.onload  = () => {
          let w = img.width, h = img.height;
          if (w > maxPx || h > maxPx) {
            if (w >= h) { h = Math.round(h / w * maxPx); w = maxPx; }
            else        { w = Math.round(w / h * maxPx); h = maxPx; }
          }
          const canvas = document.createElement("canvas");
          canvas.width = w; canvas.height = h;
          canvas.getContext("2d").drawImage(img, 0, 0, w, h);
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          console.log(`Compressed "${file.name}": ${w}×${h}px ~${Math.round(dataUrl.length * 0.75 / 1024)} KB`);
          resolve(dataUrl);
        };
        img.src = ev.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  /* ── BUILD JSON PAYLOAD ── */
  async function buildPayload(form) {
    const photoFile   = photoInput?.files[0]       || null;
    const paymentFile = paymentFileInput?.files[0] || null;

    const [photoB64, paymentB64] = await Promise.all([
      compressImage(photoFile,   CONFIG.IMAGE_MAX_PX, CONFIG.IMAGE_QUALITY),
      compressImage(paymentFile, CONFIG.IMAGE_MAX_PX, CONFIG.IMAGE_QUALITY),
    ]);

    const payload = {};

    // Read every text field that exists in the form
    ["title", "date", "name_english", "address", "phone",
     "dob", "occupation", "blood_group", "introducer", "email", "branch"
    ].forEach(name => {
      const el = form.elements[name];
      if (el) payload[name] = el.value.trim();
    });

    if (photoB64) {
      payload.applicant_photo_base64   = photoB64;
      payload.applicant_photo_filename = photoFile.name;
    }
    if (paymentB64) {
      payload.payment_screenshot_base64   = paymentB64;
      payload.payment_screenshot_filename = paymentFile.name;
    }

    payload.submitted_at = new Date().toISOString();
    payload.form_version = "2.4";
    return payload;
  }

  /* ── SUBMIT ── */
  const form      = document.getElementById("reikiForm");
  const submitBtn = form?.querySelector(".submit-btn");

  if (form) {
    form.addEventListener("submit", async e => {
      e.preventDefault();

      const errors = validateForm(form);
      if (errors.length) { showToast("⚠ " + errors[0]); return; }

      let payload;
      try {
        showToast("⏳ Compressing images…", 60000);
        payload = await buildPayload(form);
        const kb = Math.round(JSON.stringify(payload).length / 1024);
        console.log("Payload size: ~" + kb + " KB");
        if (kb > 4500) { showToast("⚠ Images too large (" + kb + " KB). Use a smaller photo."); return; }
      } catch (err) {
        showToast("⚠ Image error: " + err.message); return;
      }

      if (CONFIG.DRY_RUN) {
        console.log("DRY RUN:", Object.fromEntries(
          Object.entries(payload).map(([k, v]) => [k, typeof v === "string" && v.length > 80
            ? v.slice(0, 60) + "… (" + Math.round(v.length / 1024) + " KB)" : v])
        ));
        showToast("✓ Dry-run — check console."); return;
      }

      submitBtn.disabled    = true;
      submitBtn.textContent = "Submitting… कृपया प्रतीक्षा गर्नुहोस्";

      try {
        // No Content-Type header — avoids CORS preflight that Apps Script can't handle
        const res  = await fetch(CONFIG.BACKEND_URL, { method: "POST", body: JSON.stringify(payload) });
        const text = await res.text();
        let result;
        try   { result = JSON.parse(text); }
        catch { throw new Error("Bad server response: " + text.slice(0, 200)); }
        if (!result.success) throw new Error(result.error || "Server error.");

        showToast("✓ आवेदन सफलतापूर्वक पेश गरियो! Ref: " + result.membershipRef, 7000);
        resetForm();
      } catch (err) {
        console.error("Submission error:", err);
        showToast("✗ Failed: " + err.message, 6000);
      } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = "Submit | आवेदन पेश गर्नुहोस्";
      }
    });
  }

  function resetForm() {
    form.reset();
    if (photoPreview)  { photoPreview.src = ""; photoPreview.style.display = "none"; }
    if (photoStatus)   { photoStatus.style.display = "block"; }
    if (paymentStatus) { paymentStatus.textContent = ""; }
  }

});
