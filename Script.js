document.addEventListener("DOMContentLoaded", () => {

  /* ================= PASSPORT PHOTO FEEDBACK ================= */
  const photoInput = document.getElementById("photoInput");
  const photoStatus = document.getElementById("photoStatus");

  if (photoInput) {
    photoInput.addEventListener("change", () => {
      if (photoInput.files.length > 0) {
        photoStatus.innerHTML = "Photo<br>Received ✓";
        photoStatus.style.color = "#2e7d32";
        photoStatus.style.fontWeight = "bold";
      }
    });
  }

  /* ================= QR IMAGE ENLARGE ================= */
  const qrImage = document.getElementById("qrImage");
  const qrModal = document.getElementById("qrModal");
  const qrModalImg = document.getElementById("qrModalImg");

  if (qrImage) {
    qrImage.addEventListener("click", () => {
      qrModalImg.src = qrImage.src;
      qrModal.style.display = "flex";
    });
  }

  qrModal.addEventListener("click", () => {
    qrModal.style.display = "none";
  });

  /* ================= FORM SUBMIT (LOCAL ONLY) ================= */
  const form = document.getElementById("reikiForm");

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault(); // STOP sending anywhere
      alert("Form validation successful. (Submission disabled)");
      form.reset();
      photoStatus.innerHTML = "Passport<br>Photo";
      photoStatus.style.color = "#555";
    });
  }

});