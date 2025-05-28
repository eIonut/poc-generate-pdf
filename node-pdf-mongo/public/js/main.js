document.addEventListener("DOMContentLoaded", () => {
  const previewButton = document.getElementById("previewPdfButton");
  const pdfForm = document.getElementById("pdfGenerateForm"); // Get the form itself

  if (previewButton && pdfForm) {
    previewButton.addEventListener("click", async () => {
      // Changed from form submit to button click
      // No event.preventDefault() needed as it's a type="button"

      const formData = new FormData(pdfForm); // Use the form to get data
      const title = formData.get("title");
      const content = formData.get("content");
      const qrData = formData.get("qrData");

      try {
        const response = await fetch("/preview-pdf", {
          // Changed endpoint to /preview-pdf
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({
            title: title,
            content: content,
            qrData: qrData,
          }),
        });

        if (response.ok) {
          const pdfBlob = await response.blob();
          const pdfUrl = URL.createObjectURL(pdfBlob);
          window.open(pdfUrl, "_blank");
        } else {
          const errorText = await response.text();
          console.error(
            "Failed to generate PDF for preview:",
            response.status,
            errorText
          );
          alert(
            `Failed to generate PDF for preview: ${response.status} - ${
              errorText || "Server error"
            }`
          );
        }
      } catch (error) {
        console.error("Error previewing PDF:", error);
        alert("Error previewing PDF. See console for details.");
      }
    });
  }
});
