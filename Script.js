"use strict";

document.addEventListener("DOMContentLoaded", () => {

  // ─────────────────────────────────────────
  // CONFIG
  // ─────────────────────────────────────────
  const CONFIG = {
    BACKEND_URL: "https://script.google.com/macros/s/AKfycbyRa8d6u8o37yCBcaPOzz9sWKp-xoDYTjAhjxEya64fVEbGicPeHQJKKdbRO95EqWAS/exec"
  };

  // ─────────────────────────────────────────
  // ELEMENTS
  // ─────────────────────────────────────────
  const form = document.getElementById("reikiForm");
  const submitBtn = form ? form.querySelector(".submit-btn") : null;

  const photoInput = document.getElementById("photoInput");
  const photoPreview = document.getElementById("photoPreview");
  const photoStatus = document.getElementById("photoStatus");

  const paymentInput = document.getElementById("paymentScreenshot");
  const paymentStatus = document.getElementById("paymentStatus");

  const qrImage = document.getElementById("qrImage");
  const qrModal = document.getElementById("qrModal");
  const qrModalImg = document.getElementById("qrModalImg");

  const toast = document.getElementById("toast");

  // ─────────────────────────────────────────
  // TOAST
  // ─────────────────────────────────────────
  function showToast(msg, duration = 4000) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add("show");
    setTimeout(() => toast.classList.remove("show"), duration);
  }

  // ─────────────────────────────────────────
  // FILE → BASE64
  // ─────────────────────────────────────────
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // ─────────────────────────────────────────
  // PHOTO PREVIEW
  // ─────────────────────────────────────────
  if (photoInput) {
    photoInput.addEventListener("change", () => {
      const file = photoInput.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (e) => {
        photoPreview.src = e.target.result;
        photoPreview.style.display = "block";
        photoStatus.style.display = "none";
      };
      reader.readAsDataURL(file);
    });
  }

  // ─────────────────────────────────────────
  // PAYMENT STATUS
  // ─────────────────────────────────────────
  if (paymentInput) {
    paymentInput.addEventListener("change", () => {
      if (paymentInput.files.length > 0) {
        paymentStatus.textContent = "✓ Screenshot received: " + paymentInput.files[0].name;
      } else {
        paymentStatus.textContent = "";
      }
    });
  }

  // ─────────────────────────────────────────
  // QR MODAL
  // ─────────────────────────────────────────
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

  // ─────────────────────────────────────────
  // VALIDATION
  // ─────────────────────────────────────────
  function validateForm(form) {
    const errors = [];

    if (!form.name_english.value.trim()) {
      errors.push("Name is required.");
    }

    if (!form.phone.value.trim()) {
      errors.push("Phone number is required.");
    }

    if (!form.dob.value) {
      errors.push("Date of birth is required.");
    }

    const email = form.email.value.trim();
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.push("Invalid email format.");
    }

    if (!photoInput || photoInput.files.length === 0) {
      errors.push("Passport photo is required.");
    }

    return errors;
  }

  // ─────────────────────────────────────────
  // RESET FORM
  // ─────────────────────────────────────────
  function resetForm() {
    form.reset();

    if (photoPreview) {
      photoPreview.src = "";
      photoPreview.style.display = "none";
    }

    if (photoStatus) photoStatus.style.display = "block";
    if (paymentStatus) paymentStatus.textContent = "";
  }

  // ─────────────────────────────────────────
  // SUBMIT HANDLER (FINAL FIXED)
  // ─────────────────────────────────────────
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const errors = validateForm(form);
      if (errors.length > 0) {
        showToast("⚠ " + errors[0]);
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = "Submitting...";

      try {
        const photoFile = photoInput.files[0];
        const paymentFile = paymentInput ? paymentInput.files[0] : null;

        // Convert files to base64
        const photoBase64 = await fileToBase64(photoFile);
        const paymentBase64 = paymentFile ? await fileToBase64(paymentFile) : null;

        // Build payload
        const payload = {
          title: form.title.value,
          date: form.date.value,
          name_english: form.name_english.value,
          address: form.address.value,
          phone: form.phone.value,
          dob: form.dob.value,
          occupation: form.occupation.value,
          blood_group: form.blood_group.value,
          introducer: form.introducer.value,
          email: form.email.value,

          applicant_photo_base64: photoBase64,
          payment_screenshot_base64: paymentBase64,

          submitted_at: new Date().toISOString(),
          form_version: "2.0"
        };

        console.log("Sending payload:", payload);

        const response = await fetch(CONFIG.BACKEND_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log("Server response:", result);

        if (!result.success) {
          throw new Error(result.error || "Submission failed");
        }

        showToast("✓ Submitted successfully!", 5000);
        resetForm();

      } catch (err) {
        console.error("Error:", err);
        showToast("✗ " + err.message, 5000);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Submit";
      }
    });
  }

});
