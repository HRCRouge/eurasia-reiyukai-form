/* ================= PASSPORT PHOTO FEEDBACK ================= */
const photoInput = document.getElementById("photoInput");
const photoStatus = document.getElementById("photoStatus");

photoInput.addEventListener("change", function () {
    if (this.files.length > 0) {
        photoStatus.innerHTML = "Photo<br>Received ✓";
        photoStatus.style.color = "#2e7d32";
        photoStatus.style.fontWeight = "bold";
    }
});

/* ================= FORM SUBMISSION ================= */
const form = document.getElementById("reikiForm");

form.addEventListener("submit", function (e) {
    e.preventDefault();

    const formData = new FormData(form);

    fetch("https://formsubmit.co/YOUR_EMAIL@gmail.com", {
        method: "POST",
        body: formData,
        headers: { "Accept": "application/json" }
    })
    .then(response => response.json())
    .then(() => {
        alert("आवेदन सफलतापूर्वक पेश गरियो।");
        form.reset();
        photoStatus.innerHTML = "Passport<br>Photo";
    })
    .catch(error => {
        console.error(error);
        alert("Submission failed. Please try again.");
    });
});
