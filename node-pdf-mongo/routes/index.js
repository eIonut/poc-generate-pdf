const express = require("express");
const { ObjectId } = require("mongodb");
const { getDB } = require("../config/db");
const { generatePdfBuffer } = require("../services/pdfService");

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

router.post("/generate-pdf", async (req, res) => {
  const db = getDB();
  if (!db)
    return res
      .status(503)
      .send("Database not connected. Please try again later.");

  const { title, content, qrData } = req.body;

  try {
    const pdfBuffer = await generatePdfBuffer({ title, content, qrData });
    const filename = `${(title || "document")
      .replace(/[^\w\s-]/gi, "")
      .replace(/\s+/g, "_")}_${Date.now()}.pdf`;

    await db.collection("pdfs").insertOne({
      filename: filename,
      contentType: "application/pdf",
      data: pdfBuffer,
      createdAt: new Date(),
    });
    console.log(`PDF "${filename}" generated and stored in MongoDB.`);
    appMessage = {
      type: "success",
      text: `PDF "${filename}" generated successfully!`,
    };
    res.redirect("/");
  } catch (error) {
    console.error("Error in /generate-pdf route:", error);
    appMessage = {
      type: "error",
      text: "Failed to generate PDF. Check server logs for details.",
    };
    if (!res.headersSent) {
      res.redirect("/");
    }
  }
});

router.post("/preview-pdf", async (req, res) => {
  const { title, content, qrData } = req.body;
  try {
    const pdfBuffer = await generatePdfBuffer({ title, content, qrData });
    const filename = `${(title || "document")
      .replace(/[^\w\s-]/gi, "")
      .replace(/\s+/g, "_")}_${Date.now()}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error in /preview-pdf route:", error);
    if (!res.headersSent) {
      res.status(500).send("Failed to generate PDF for preview.");
    }
  }
});

router.get("/pdfs/:id/download", async (req, res) => {
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
