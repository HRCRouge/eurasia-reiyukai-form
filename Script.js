"use strict";

document.addEventListener("DOMContentLoaded", () => {

  /* ─────────────────────────────────────────
     CONFIG
  ───────────────────────────────────────── */
  const CONFIG = {
    BACKEND_URL: "https://script.google.com/macros/s/AKfycbyRa8d6u8o37yCBcaPOzz9sWKp-xoDYTjAhjxEya64fVEbGicPeHQJKKdbRO95EqWAS/exec",
    DRY_RUN: false,
  };

  /* ─────────────────────────────────────────
     PASSPORT PHOTO — preview inside box
  ───────────────────────────────────────── */
  const photoInput   = document.getElementById("photoInput");
  const photoStatus  = document.getElementById("photoStatus");
  const photoPreview = document.getElementById("photoPreview");

  if (photoInput) {
    photoInput.addEventListener("change", () => {
      const file = photoInput.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        photoPreview.src = ev.target.result;
        photoPreview.style.display = "block";
        photoStatus.style.display  = "none";
      };
      reader.readAsDataURL(file);
    });
  }

  /* ─────────────────────────────────────────
     PAYMENT SCREENSHOT feedback
  ───────────────────────────────────────── */
  const paymentFileInput = document.getElementById("paymentScreenshot");
  const paymentStatus    = document.getElementById("paymentStatus");

  if (paymentFileInput) {
    paymentFileInput.addEventListener("change", () => {
      paymentStatus.textContent = paymentFileInput.files.length > 0
        ? "✓ Screenshot selected: " + paymentFileInput.files[0].name
        : "";
    });
  }

  /* ─────────────────────────────────────────
     QR MODAL
  ───────────────────────────────────────── */
  const qrImage    = document.getElementById("qrImage");
  const qrModal    = document.getElementById("qrModal");
  const qrModalImg = document.getElementById("qrModalImg");

  if (qrImage && qrModal) {
    qrImage.addEventListener("click", () => {
      qrModalImg.src = qrImage.src;
      qrModal.style.display = "flex";
    });
    qrModal.addEventListener("click", () => { qrModal.style.display = "none"; });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") qrModal.style.display = "none";
    });
  }

  /* ─────────────────────────────────────────
     TOAST
  ───────────────────────────────────────── */
  function showToast(msg, duration = 4000) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), duration);
  }

  /* ─────────────────────────────────────────
     VALIDATION
  ───────────────────────────────────────── */
  function validateForm(form) {
    const errors = [];
    if (!form.name_english.value.trim()) errors.push("Name in English is required.");
    if (!form.phone.value.trim())        errors.push("Phone number is required.");
    if (!form.dob.value)                 errors.push("Date of birth is required.");

    const email = form.email.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      errors.push("Please enter a valid email address.");

    if (!photoInput || photoInput.files.length === 0)
      errors.push("Passport photo is required.");

    return errors;
  }

  /* ─────────────────────────────────────────
     FILE → BASE64 HELPER
     Apps Script cannot receive multipart/form-data.
     We convert images to base64 strings and send
     everything as a single JSON payload.
  ───────────────────────────────────────── */
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      if (!file) { resolve(null); return; }
      const reader = new FileReader();
      reader.onload  = (e) => resolve(e.target.result); // full data URL: "data:image/jpeg;base64,..."
      reader.onerror = () => reject(new Error("Failed to read file: " + file.name));
      reader.readAsDataURL(file);
    });
  }

  /* ─────────────────────────────────────────
     BUILD JSON PAYLOAD
  ───────────────────────────────────────── */
  async function buildPayload(form) {
    const photoFile   = photoInput?.files[0]       || null;
    const paymentFile = paymentFileInput?.files[0] || null;

    // Convert both images to base64 in parallel
    const [photoBase64, paymentBase64] = await Promise.all([
      fileToBase64(photoFile),
      fileToBase64(paymentFile),
    ]);

    // Collect all text fields
    const textFields = [
      "title", "date", "name_english", "address", "phone",
      "dob", "occupation", "blood_group", "introducer", "email", "branch"
    ];
    const payload = {};
    textFields.forEach((name) => {
      const el = form.elements[name];
      if (el) payload[name] = el.value.trim();
    });

    // Attach images
    if (photoBase64) {
      payload.applicant_photo_base64   = photoBase64;
      payload.applicant_photo_filename = photoFile.name;
    }
    if (paymentBase64) {
      payload.payment_screenshot_base64   = paymentBase64;
      payload.payment_screenshot_filename = paymentFile.name;
    }

    payload.submitted_at = new Date().toISOString();
    payload.form_version = "2.1";

    return payload;
  }

  /* ─────────────────────────────────────────
     SUBMIT HANDLER
  ───────────────────────────────────────── */
  const form      = document.getElementById("reikiForm");
  const submitBtn = form?.querySelector(".submit-btn");

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // 1. Validate
      const errors = validateForm(form);
      if (errors.length > 0) {
        showToast("⚠ " + errors[0]);
        return;
      }

      // 2. Build payload — show a "preparing" message while reading files
      let payload;
      try {
        showToast("⏳ Preparing files…", 60000);
        payload = await buildPayload(form);
      } catch (err) {
        showToast("⚠ File error: " + err.message);
        return;
      }

      // 3. Dry run — inspect payload in console without sending
      if (CONFIG.DRY_RUN) {
        console.log("=== DRY RUN payload keys ===");
        Object.keys(payload).forEach(k => {
          const v = payload[k];
          console.log(" ", k, ":", typeof v === "string" && v.length > 80 ? v.slice(0, 60) + "…" : v);
        });
        showToast("✓ Dry-run complete — check browser console.");
        return;
      }

      // 4. Send as JSON
      // IMPORTANT: Do NOT add a Content-Type header here.
      // Apps Script reads e.postData.contents as plain text regardless,
      // and adding headers (like "application/json") triggers a CORS preflight
      // that Apps Script's doPost does not handle. Omitting Content-Type
      // lets the browser send it as text/plain, which bypasses the preflight.
      submitBtn.disabled    = true;
      submitBtn.textContent = "Submitting… कृपया प्रतीक्षा गर्नुहोस्";

      try {
        const response = await fetch(CONFIG.BACKEND_URL, {
          method: "POST",
          body:   JSON.stringify(payload),
          // NO headers object — intentional, see note above
        });

        // Apps Script always returns HTTP 200; errors are inside the JSON body
        const text = await response.text();
        let result;
        try {
          result = JSON.parse(text);
        } catch {
          throw new Error("Unexpected server response: " + text.slice(0, 150));
        }

        if (!result.success) {
          throw new Error(result.error || "Server reported an error.");
        }

        showToast(`✓ आवेदन सफलतापूर्वक पेश गरियो! Ref: ${result.membershipRef}`, 7000);
        resetForm();

      } catch (err) {
        console.error("Submission error:", err);
        showToast("✗ Submission failed: " + err.message, 6000);
      } finally {
        submitBtn.disabled    = false;
        submitBtn.textContent = "Submit | आवेदन पेश गर्नुहोस्";
      }
    });
  }

  /* ─────────────────────────────────────────
     RESET
  ───────────────────────────────────────── */
  function resetForm() {
    form.reset();
    if (photoPreview)  { photoPreview.src = ""; photoPreview.style.display = "none"; }
    if (photoStatus)   { photoStatus.style.display = "block"; }
    if (paymentStatus) { paymentStatus.textContent = ""; }
  }

});
