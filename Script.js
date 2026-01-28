/* ================= PASSPORT PHOTO FEEDBACK ================= */

const photoInput = document.getElementById("photoInput");
const photoStatus = document.getElementById("photoStatus");

photoInput.addEventListener("change", () => {
  if (photoInput.files.length > 0) {
    photoStatus.innerHTML = "Photo<br>Received ✓";
    photoStatus.style.color = "#2e7d32";
    photoStatus.style.fontWeight = "bold";
  }
});

/* ================= OPTIONAL SUBMIT FEEDBACK ================= */
/* NOTE: We DO NOT block submission */

const form = document.getElementById("reikiForm");

form.addEventListener("submit", () => {
  alert("आवेदन पेश हुँदैछ। कृपया केही समय पर्खनुहोस्…");
});
