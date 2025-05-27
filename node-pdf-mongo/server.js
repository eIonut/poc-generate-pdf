require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const PdfPrinter = require("pdfmake");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");
const bodyParser = require("body-parser");

const app = express();
const port = process.env.SERVER_PORT || 3000;

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// MongoDB Connection
const mongoUri = process.env.MONGODB_URI;
let db;
let mongoClientInstance;

MongoClient.connect(mongoUri)
  .then((client) => {
    console.log("Connected to MongoDB");
    mongoClientInstance = client;
    db = client.db();
  })
  .catch((error) => {
    console.error("MongoDB connection error:", error);
    process.exit(1);
  });

// --- PDF Font Setup ---
const fonts = {
  Roboto: {
    normal: path.join(__dirname, "fonts/Roboto-Regular.ttf"),
    bold: path.join(__dirname, "fonts/Roboto-Medium.ttf"),
    italics: path.join(__dirname, "fonts/Roboto-Italic.ttf"),
    bolditalics: path.join(__dirname, "fonts/Roboto-MediumItalic.ttf"),
  },
};

Object.values(fonts.Roboto).forEach((fontPath) => {
  if (!fs.existsSync(fontPath)) {
    console.error(
      `\n!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!`
    );
    console.error(`!!! FONT FILE NOT FOUND: ${fontPath}`);
    console.error(
      `!!! Please create a 'fonts' directory in your project root and add Roboto .ttf files.`
    );
    console.error(
      `!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!\n`
    );
  }
});

const printer = new PdfPrinter(fonts);

// --- Helper to load logo image ---
async function getLogoBase64() {
  const logoPath = path.join(__dirname, "public/images/logo.png");
  if (fs.existsSync(logoPath)) {
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      // Ensure you have a valid image type, common ones are image/png, image/jpeg
      return "data:image/png;base64," + logoBuffer.toString("base64");
    } catch (err) {
      console.warn("Could not read logo file:", err.message);
      return null;
    }
  }
  console.warn(`Logo file not found at ${logoPath}. Skipping logo.`);
  return null;
}

// --- Routes ---
let appMessage = null;

app.get("/", async (req, res) => {
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

app.post("/generate-pdf", async (req, res) => {
  if (!db)
    return res
      .status(503)
      .send("Database not connected. Please try again later.");

  const { title, content, qrData } = req.body;

  try {
    const qrCodeImage = await QRCode.toDataURL(qrData || "https://nodejs.org/");
    const logoBase64 =
      "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg==";

    const documentDefinition = {
      info: {
        title: title || "Generated PDF",
        author: "My NodeJS App",
      },
      header: function (currentPage, pageCount, pageSize) {
        const headerColumns = [];
        if (logoBase64) {
          // Only add the image object if logoBase64 is not null
          headerColumns.push({
            image: logoBase64,
            width: 50,
            margin: [20, 10, 0, 0],
          });
        } else {
          headerColumns.push({ text: "", width: 50, margin: [20, 10, 0, 0] }); // Placeholder for alignment
        }
        headerColumns.push({
          text: title || "Document",
          alignment: "center",
          fontSize: 16,
          margin: [0, 20, 0, 0],
        });
        headerColumns.push({ text: "", fit: [100, 100] }); // Placeholder for right alignment, use fit to take remaining space or specific width

        return [
          {
            columns: headerColumns,
          },
          {
            canvas: [
              {
                type: "line",
                x1: 20,
                y1: 5,
                x2: pageSize.width - 20,
                y2: 5,
                lineWidth: 0.5,
              },
            ],
            margin: [0, 0, 0, 10],
          },
        ];
      },
      footer: function (currentPage, pageCount) {
        return {
          columns: [
            {
              text: `Generated: ${new Date().toLocaleDateString()}`,
              alignment: "left",
              margin: [40, 10, 0, 0],
            },
            {
              text: `Page ${currentPage.toString()} of ${pageCount}`,
              alignment: "right",
              margin: [0, 10, 40, 0],
            },
          ],
          style: "footerText",
        };
      },
      content: [
        {
          text: title || "Sample PDF Document",
          style: "header",
          alignment: "center",
          margin: [0, 10, 0, 20],
        },
        {
          text: content || "This is some sample content for the PDF.",
          margin: [0, 0, 0, 20],
        },

        {
          text: "Complex Table Example",
          style: "subheader",
          margin: [0, 10, 0, 10],
        },
        {
          table: {
            /* ... table definition ... */ headerRows: 1,
            widths: ["*", "auto", 100, "*"],
            body: [
              [
                { text: "First Header", style: "tableHeader" },
                { text: "Second Header", style: "tableHeader" },
                { text: "Third Header", style: "tableHeader" },
                { text: "Fourth Header", style: "tableHeader" },
              ],
              [
                "Sample value 1",
                "Sample value 2",
                "Sample value 3",
                "Sample value 4",
              ],
              [{ text: "Bold value", bold: true }, "Val 2", "Val 3", "Val 4"],
              [
                "Value 1",
                "Value 2",
                "Value 3",
                { text: "Different style", italics: true, color: "blue" },
              ],
              [
                {
                  text: "Multi-row\nCell",
                  rowSpan: 2,
                  alignment: "center",
                  margin: [0, 15, 0, 0],
                },
                "Data A1",
                "Data B1",
                "Data C1",
              ],
              ["", "Data A2", "Data B2", "Data C2"],
            ],
          },
          layout: "lightHorizontalLines",
        },

        { text: "QR Code:", style: "subheader", margin: [0, 20, 0, 5] },
        { image: qrCodeImage, width: 150, alignment: "center" }, // qrCodeImage is already a data URL

        {
          text: "Second Page Content Example",
          pageBreak: "before",
          style: "subheader",
          margin: [0, 20, 0, 10],
        },
        {
          text: "This content is on a new page to demonstrate multi-page layout.",
        },
        {
          ul: [
            /* ... list items ... */ "Item 1 on the new page.",
            "Item 2, perhaps with some detail.",
            {
              text: "Item 3 with sub-items",
              ul: ["Sub-item A", "Sub-item B: further explanation here."],
            },
            "Item 4, the final one for this list example.",
          ],
          margin: [0, 0, 0, 20],
        },
      ],
      styles: {
        header: { fontSize: 22, bold: true },
        subheader: { fontSize: 16, bold: true },
        tableHeader: { bold: true, fontSize: 13, color: "black" },
        footerText: { fontSize: 8 },
      },
      defaultStyle: { font: "Roboto" },
    };

    const pdfDoc = printer.createPdfKitDocument(documentDefinition);

    const chunks = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", async () => {
      const pdfBuffer = Buffer.concat(chunks);
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
    });
    pdfDoc.on("error", (err) => {
      // Add error handling for pdfDoc stream
      console.error("PDF Stream Error:", err);
      appMessage = { type: "error", text: "Failed to generate PDF stream." };
      if (!res.headersSent) {
        res.redirect("/");
      }
    });
    pdfDoc.end();
  } catch (error) {
    console.error("Error in /generate-pdf route:", error); // Changed log message slightly
    appMessage = {
      type: "error",
      text: "Failed to generate PDF. Check server logs for details.",
    };
    if (!res.headersSent) {
      res.redirect("/");
    }
  }
});

app.get("/pdfs/:id/download", async (req, res) => {
  // ... (download route remains the same) ...
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

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log("Shutting down server...");
  if (mongoClientInstance) {
    await mongoClientInstance.close();
    console.log("MongoDB connection closed.");
  }
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
  if (!db) {
    console.warn(
      "NOTE: MongoDB connection is pending or failed. PDF functionality will be affected."
    );
  }
});
