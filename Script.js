"use strict";

document.addEventListener("DOMContentLoaded", () => {

  /* ─────────────────────────────────────────
     CONFIG — change BACKEND_URL to your real
     API endpoint before deploying.
  ───────────────────────────────────────── */
  const CONFIG = {
    BACKEND_URL: "https://script.google.com/macros/s/AKfycbyRa8d6u8o37yCBcaPOzz9sWKp-xoDYTjAhjxEya64fVEbGicPeHQJKKdbRO95EqWAS/exec",   // ← replace with your endpoint
    DRY_RUN: false,   // set false in production to actually POST
  };

  /* ─────────────────────────────────────────
     PASSPORT PHOTO — preview inside box
  ───────────────────────────────────────── */
  const photoInput  = document.getElementById("photoInput");
  const photoStatus = document.getElementById("photoStatus");
  const photoPreview = document.getElementById("photoPreview");

  if (photoInput) {
    photoInput.addEventListener("change", () => {
      const file = photoInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        photoPreview.src = e.target.result;
        photoPreview.style.display = "block";
        photoStatus.style.display  = "none";
      };
      reader.readAsDataURL(file);
    });
  }

  /* ─────────────────────────────────────────
     PAYMENT SCREENSHOT feedback
  ───────────────────────────────────────── */
  const paymentFile   = document.getElementById("paymentScreenshot");
  const paymentStatus = document.getElementById("paymentStatus");

  if (paymentFile) {
    paymentFile.addEventListener("change", () => {
      if (paymentFile.files.length > 0) {
        paymentStatus.textContent = "✓ Screenshot received: " + paymentFile.files[0].name;
      } else {
        paymentStatus.textContent = "";
      }
    });
  }

  /* ─────────────────────────────────────────
     QR IMAGE ENLARGE MODAL
  ───────────────────────────────────────── */
  const qrImage    = document.getElementById("qrImage");
  const qrModal    = document.getElementById("qrModal");
  const qrModalImg = document.getElementById("qrModalImg");

  if (qrImage && qrModal) {
    qrImage.addEventListener("click", () => {
      qrModalImg.src = qrImage.src;
      qrModal.style.display = "flex";
    });
    qrModal.addEventListener("click", () => {
      qrModal.style.display = "none";
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") qrModal.style.display = "none";
    });
  }

  /* ─────────────────────────────────────────
     TOAST HELPER
  ───────────────────────────────────────── */
  function showToast(msg, duration = 3500) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), duration);
  }

  /* ─────────────────────────────────────────
     CLIENT-SIDE VALIDATION
  ───────────────────────────────────────── */
  function validateForm(form) {
    const errors = [];

    const nameEn = form.name_english.value.trim();
    if (!nameEn) errors.push("Name in English is required.");

    const phone = form.phone.value.trim();
    if (!phone) errors.push("Phone number is required.");

    const dob = form.dob.value;
    if (!dob) errors.push("Date of birth is required.");

    const email = form.email.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Please enter a valid email address.");
    }

    const photo = document.getElementById("photoInput");
    if (photo && photo.files.length === 0) {
      errors.push("Passport photo is required.");
    }

    return errors;
  }

  /* ─────────────────────────────────────────
     COLLECT FORM DATA (ready for backend)
     Returns a FormData object that can be
     sent via fetch() as multipart/form-data.
  ───────────────────────────────────────── */
  function collectFormData(form) {
    const fd = new FormData();

    // Text fields
    const textFields = [
      "title", "date", "name_english", "address", "phone",
      "dob", "occupation", "blood_group", "introducer",
      "oya_membership_no", "email", "shibucho", "jun_shibucho",
      "hojashu", "father_surname", "mother_surname", "branch"
    ];
    textFields.forEach((name) => {
      const el = form.elements[name];
      if (el) fd.append(name, el.value.trim());
    });

    // File fields
    const photoFile   = document.getElementById("photoInput");
    const paymentFile = document.getElementById("paymentScreenshot");

    if (photoFile && photoFile.files[0])   fd.append("applicant_photo",    photoFile.files[0]);
    if (paymentFile && paymentFile.files[0]) fd.append("payment_screenshot", paymentFile.files[0]);

    // Metadata
    fd.append("submitted_at", new Date().toISOString());
    fd.append("form_version", "2.0");

    return fd;
  }

  /* ─────────────────────────────────────────
     SUBMIT HANDLER
  ───────────────────────────────────────── */
  const form       = document.getElementById("reikiForm");
  const submitBtn  = form ? form.querySelector(".submit-btn") : null;

  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      // Validate
      const errors = validateForm(form);
      if (errors.length > 0) {
        showToast("⚠ " + errors[0]);
        return;
      }

      // Collect data
      const formData = collectFormData(form);

      // Dry run — log and confirm without sending
      if (CONFIG.DRY_RUN) {
        console.log("=== DRY RUN: FormData entries ===");
        for (const [k, v] of formData.entries()) {
          console.log(`  ${k}:`, v instanceof File ? `[File: ${v.name}]` : v);
        }
        showToast("✓ Form validated. (Dry-run mode — not submitted)");
        return;
      }

      // Real submission
      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting…";

      try {
        const response = await fetch(CONFIG.BACKEND_URL, {
          method: "POST",
          body: formData,
          // Do NOT set Content-Type — browser sets it with boundary for multipart
        });

        if (!response.ok) {
          const msg = await response.text().catch(() => "Unknown server error");
          throw new Error(msg || `HTTP ${response.status}`);
        }

        const result = await response.json();
        console.log("Server response:", result);

        showToast("✓ आवेदन सफलतापूर्वक पेश गरियो! (Submitted successfully)", 5000);
        resetForm();

      } catch (err) {
        console.error("Submission error:", err);
        showToast("✗ Submission failed: " + err.message, 5000);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit | आवेदन पेश गर्नुहोस्";
      }
    });
  }

  /* ─────────────────────────────────────────
     RESET HELPER
  ───────────────────────────────────────── */
  function resetForm() {
    form.reset();

    // Reset photo preview
    if (photoPreview) {
      photoPreview.src = "";
      photoPreview.style.display = "none";
    }
    if (photoStatus) photoStatus.style.display = "block";
    if (paymentStatus) paymentStatus.textContent = "";
  }

});
