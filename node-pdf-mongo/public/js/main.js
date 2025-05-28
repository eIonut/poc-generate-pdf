document.addEventListener("DOMContentLoaded", () => {
  const invoiceForm = document.getElementById("invoiceForm");
  const addServiceRowButton = document.getElementById("addServiceRow");
  const servicesTbody = document.getElementById("servicesTbody");
  const previewInvoiceButton = document.getElementById("previewInvoiceButton");
  // const generateInvoiceButton = document.getElementById("generateInvoiceButton"); // For standard form submission

  const subtotalInput = document.getElementById("subtotal");
  const taxPercentageInput = document.getElementById("taxPercentage");
  const grandTotalInput = document.getElementById("grandTotal");

  // For iframe preview
  const previewContainer = document.getElementById("previewContainer");
  const previewIframe = document.getElementById("previewIframe");
  const closePreviewButton = document.getElementById("closePreviewButton");
  let currentPdfUrl = null; // To store the blob URL for revoking

  let serviceRowCount = 0;

  function addServiceRow() {
    serviceRowCount++;
    const row = servicesTbody.insertRow();
    row.innerHTML = `
      <td><input type="text" name="serviceDescription_${serviceRowCount}" required /></td>
      <td><input type="date" name="serviceDate_${serviceRowCount}" /></td>
      <td><input type="number" name="serviceQty_${serviceRowCount}" value="1" min="0" step="any" class="service-qty" required /></td>
      <td><input type="number" name="serviceUnitPrice_${serviceRowCount}" value="0" min="0" step="any" class="service-unit-price" required /></td>
      <td><input type="text" name="serviceLineTotal_${serviceRowCount}" class="service-line-total" readonly /></td>
      <td><button type="button" class="removeServiceRow">Remove</button></td>
    `;
    attachRowEventListeners(row);
    updateTotals();
  }

  function removeServiceRow(button) {
    const row = button.closest("tr");
    row.remove();
    updateTotals();
  }

  function attachRowEventListeners(row) {
    row
      .querySelectorAll(".service-qty, .service-unit-price")
      .forEach((input) => {
        input.addEventListener("input", updateLineTotal);
      });
    row
      .querySelector(".removeServiceRow")
      .addEventListener("click", function () {
        removeServiceRow(this);
      });
  }

  function updateLineTotal(event) {
    const row = event.target.closest("tr");
    const qty = parseFloat(row.querySelector(".service-qty").value) || 0;
    const unitPrice =
      parseFloat(row.querySelector(".service-unit-price").value) || 0;
    const lineTotalInput = row.querySelector(".service-line-total");
    lineTotalInput.value = (qty * unitPrice).toFixed(2);
    updateTotals();
  }

  function updateTotals() {
    let currentSubtotal = 0;
    servicesTbody.querySelectorAll("tr").forEach((row) => {
      const lineTotal =
        parseFloat(row.querySelector(".service-line-total").value) || 0;
      currentSubtotal += lineTotal;
    });
    subtotalInput.value = currentSubtotal.toFixed(2);

    const taxPercentage = parseFloat(taxPercentageInput.value) || 0;
    const taxAmount = currentSubtotal * (taxPercentage / 100);
    const currentGrandTotal = currentSubtotal + taxAmount;
    grandTotalInput.value = currentGrandTotal.toFixed(2);
  }

  // Event listener for tax input
  if (taxPercentageInput) {
    taxPercentageInput.addEventListener("input", updateTotals);
  }

  // Add initial row if needed or let user add first one
  addServiceRow(); // Add one row by default

  if (addServiceRowButton) {
    addServiceRowButton.addEventListener("click", addServiceRow);
  }

  // Handle Preview Invoice button click
  if (previewInvoiceButton && invoiceForm) {
    previewInvoiceButton.addEventListener("click", async () => {
      const formData = new FormData(invoiceForm);
      const services = [];
      servicesTbody.querySelectorAll("tr").forEach((row, index) => {
        const service = {
          description: formData.get(`serviceDescription_${index + 1}`),
          date: formData.get(`serviceDate_${index + 1}`),
          qty: parseFloat(formData.get(`serviceQty_${index + 1}`)) || 0,
          unitPrice:
            parseFloat(formData.get(`serviceUnitPrice_${index + 1}`)) || 0,
          lineTotal:
            parseFloat(row.querySelector(".service-line-total").value) || 0,
        };
        services.push(service);
      });

      const payload = {
        clientCompanyName: formData.get("clientCompanyName"),
        clientContactPerson: formData.get("clientContactPerson"),
        clientEmail: formData.get("clientEmail"),
        clientBillingAddress: formData.get("clientBillingAddress"),
        invoiceNumber: formData.get("invoiceNumber"),
        invoiceDate: formData.get("invoiceDate"),
        dueDate: formData.get("dueDate"),
        services: services,
        subtotal: parseFloat(subtotalInput.value) || 0,
        taxPercentage: parseFloat(taxPercentageInput.value) || 0,
        grandTotal: parseFloat(grandTotalInput.value) || 0,
        additionalNotes: formData.get("additionalNotes"),
      };

      try {
        const response = await fetch("/preview-invoice", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        });

        if (response.ok) {
          const pdfBlob = await response.blob();

          // Revoke previous blob URL if it exists
          if (currentPdfUrl) {
            URL.revokeObjectURL(currentPdfUrl);
          }
          currentPdfUrl = URL.createObjectURL(pdfBlob);

          previewIframe.src = currentPdfUrl;
          previewContainer.style.display = "block"; // Show the preview container
        } else {
          const errorText = await response.text();
          console.error(
            "Failed to generate invoice preview:",
            response.status,
            errorText
          );
          alert(
            `Failed to generate invoice preview: ${response.status} - ${
              errorText || "Server error"
            }`
          );
        }
      } catch (error) {
        console.error("Error previewing invoice:", error);
        alert("Error previewing invoice. See console for details.");
      }
    });
  }

  // Handle Close Preview button click
  if (closePreviewButton && previewContainer && previewIframe) {
    closePreviewButton.addEventListener("click", () => {
      previewContainer.style.display = "none";
      previewIframe.src = "about:blank"; // Clear the iframe
      if (currentPdfUrl) {
        URL.revokeObjectURL(currentPdfUrl);
        currentPdfUrl = null;
      }
    });
  }

  // For the "Generate and Save Invoice" button, we need to ensure services data is included
  // when the form is submitted normally.
  if (invoiceForm) {
    invoiceForm.addEventListener("submit", function (event) {
      // event.preventDefault(); // Uncomment if you want to handle submission fully with JS

      // Create hidden input to store services data as JSON string
      const services = [];
      servicesTbody.querySelectorAll("tr").forEach((row, index) => {
        const service = {
          description: row.querySelector(`input[name^='serviceDescription']`)
            .value,
          date: row.querySelector(`input[name^='serviceDate']`).value,
          qty:
            parseFloat(row.querySelector(`input[name^='serviceQty']`).value) ||
            0,
          unitPrice:
            parseFloat(
              row.querySelector(`input[name^='serviceUnitPrice']`).value
            ) || 0,
          lineTotal:
            parseFloat(row.querySelector(".service-line-total").value) || 0,
        };
        services.push(service);
      });

      const servicesInput = document.createElement("input");
      servicesInput.type = "hidden";
      servicesInput.name = "servicesData"; // Backend will look for this
      servicesInput.value = JSON.stringify(services);
      this.appendChild(servicesInput);

      // Append subtotal, tax, grandTotal as well, as they are readonly and might not be submitted by default by all browsers
      // or if you want to ensure the server gets the calculated values
      const subtotalVal = document.createElement("input");
      subtotalVal.type = "hidden";
      subtotalVal.name = "calculatedSubtotal";
      subtotalVal.value = subtotalInput.value;
      this.appendChild(subtotalVal);

      const taxVal = document.createElement("input");
      taxVal.type = "hidden";
      taxVal.name = "calculatedTaxPercentage";
      taxVal.value = taxPercentageInput.value;
      this.appendChild(taxVal);

      const grandTotalVal = document.createElement("input");
      grandTotalVal.type = "hidden";
      grandTotalVal.name = "calculatedGrandTotal";
      grandTotalVal.value = grandTotalInput.value;
      this.appendChild(grandTotalVal);

      // Now allow the form to submit normally
      // If you had event.preventDefault() above, you would call this.submit() here after appending.
    });
  }
});
