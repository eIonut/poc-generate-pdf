const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { generateInvoicePdfBuffer } = require("../services/pdfService");

const router = express.Router();
let appMessage = null; // This might be better handled with flash messages or similar session-based approaches

router.get("/", async (req, res) => {
  const db = getDB();
  if (!db)
    return res
      .status(503)
      .send("Database not connected. Please try again later.");
  try {
    const pdfs = await db
      .collection("pdfs")
      .find({}, { projection: { filename: 1, createdAt: 1 } })
      .sort({ createdAt: -1 })
      .toArray();
    const messageToSend = appMessage;
    appMessage = null;
    res.render("index", { pdfs, message: messageToSend });
  } catch (error) {
    console.error("Error fetching PDF list:", error);
    res.status(500).send("Error fetching PDF list");
  }
});

router.post("/generate-invoice", async (req, res) => {
  const db = getDB();
  if (!db)
    return res
      .status(503)
      .send("Database not connected. Please try again later.");

  // Backend needs to parse servicesData (JSON string) and other calculated fields
  const {
    clientCompanyName,
    clientContactPerson,
    clientEmail,
    clientBillingAddress,
    invoiceNumber,
    invoiceDate,
    dueDate,
    additionalNotes,
  } = req.body;

  const services = JSON.parse(req.body.servicesData || "[]");
  const subtotal = parseFloat(req.body.calculatedSubtotal) || 0;
  const taxPercentage = parseFloat(req.body.calculatedTaxPercentage) || 0;
  const grandTotal = parseFloat(req.body.calculatedGrandTotal) || 0;

  const invoiceData = {
    clientCompanyName,
    clientContactPerson,
    clientEmail,
    clientBillingAddress,
    invoiceNumber,
    invoiceDate,
    dueDate,
    services, // This is now an array of objects
    subtotal,
    taxPercentage,
    grandTotal,
    additionalNotes,
  };

  try {
    const pdfBuffer = await generateInvoicePdfBuffer(invoiceData); // Renamed function
    const filename = `Invoice_${invoiceNumber || "INV"}_${Date.now()}.pdf`;

    // Consider renaming collection to 'invoices' and adjusting schema
    await db.collection("pdfs").insertOne({
      filename: filename,
      contentType: "application/pdf",
      // Storing full invoiceData might be useful for re-generation or records
      invoiceData: invoiceData, // Store the structured invoice data
      data: pdfBuffer, // The generated PDF buffer
      createdAt: new Date(),
      invoiceNumber: invoiceNumber, // For easier querying if needed
    });
    console.log(`Invoice "${filename}" generated and stored in MongoDB.`);
    appMessage = {
      type: "success",
      text: `Invoice "${filename}" generated successfully!`,
    };
    res.redirect("/");
  } catch (error) {
    console.error("Error in /generate-invoice route:", error);
    appMessage = {
      type: "error",
      text: "Failed to generate invoice. Check server logs for details.",
    };
    if (!res.headersSent) {
      res.redirect("/");
    }
  }
});

router.post("/preview-invoice", async (req, res) => {
  // This route now expects a JSON payload directly from client-side fetch
  const invoiceData = req.body;
  try {
    const pdfBuffer = await generateInvoicePdfBuffer(invoiceData); // Renamed function
    const filename = `Preview_Invoice_${
      invoiceData.invoiceNumber || "INV"
    }_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error in /preview-invoice route:", error);
    if (!res.headersSent) {
      res.status(500).send("Failed to generate invoice for preview.");
    }
  }
});

router.get("/invoices/:id/download", async (req, res) => {
  // Renamed route
  const db = getDB();
  if (!db)
    return res
      .status(503)
      .send("Database not connected. Please try again later.");
  try {
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).send("Invalid PDF ID format.");
    }
    const pdfId = new ObjectId(req.params.id);
    const pdfDoc = await db.collection("pdfs").findOne({ _id: pdfId });

    if (!pdfDoc) {
      return res.status(404).send("PDF not found");
    }

    res.setHeader("Content-Type", pdfDoc.contentType);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${pdfDoc.filename}"`
    );
    res.send(pdfDoc.data.buffer);
  } catch (error) {
    console.error("Error downloading PDF:", error);
    res.status(500).send("Error downloading PDF");
  }
});

module.exports = router;
