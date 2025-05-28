const PdfPrinter = require("pdfmake");
const fs = require("fs");
const path = require("path");
const QRCode = require("qrcode");

// --- PDF Font Setup ---
const fonts = {
  Roboto: {
    normal: path.join(__dirname, "../fonts/Roboto-Regular.ttf"), // Adjusted path
    bold: path.join(__dirname, "../fonts/Roboto-Medium.ttf"), // Adjusted path
    italics: path.join(__dirname, "../fonts/Roboto-Italic.ttf"), // Adjusted path
    bolditalics: path.join(__dirname, "../fonts/Roboto-MediumItalic.ttf"), // Adjusted path
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
    // Consider whether to throw an error or handle this more gracefully
  }
});

const printer = new PdfPrinter(fonts);

// --- Helper to load logo image ---
async function getLogoBase64() {
  const logoPath = path.join(__dirname, "../public/images/logo.png"); // Adjusted path
  if (fs.existsSync(logoPath)) {
    try {
      const logoBuffer = fs.readFileSync(logoPath);
      return "data:image/png;base64," + logoBuffer.toString("base64");
    } catch (err) {
      console.warn("Could not read logo file:", err.message);
      return null;
    }
  }
  console.warn(`Logo file not found at ${logoPath}. Skipping logo.`);
  return null;
}

// --- PDF Generation Function ---
async function generatePdfBuffer(data) {
  const { title, content, qrData } = data;

  const qrCodeImage = await QRCode.toDataURL(qrData || "https://nodejs.org/");
  // const logoBase64 = await getLogoBase64(); // If you have a dynamic logo
  const logoBase64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="; // Placeholder

  const documentDefinition = {
    info: {
      title: title || "Generated PDF",
      author: "My NodeJS App",
    },
    header: function (currentPage, pageCount, pageSize) {
      const headerColumns = [];
      if (logoBase64) {
        headerColumns.push({
          image: logoBase64,
          width: 50,
          margin: [20, 10, 0, 0],
        });
      } else {
        headerColumns.push({ text: "", width: 50, margin: [20, 10, 0, 0] });
      }
      headerColumns.push({
        text: title || "Document",
        alignment: "center",
        fontSize: 16,
        margin: [0, 20, 0, 0],
      });
      headerColumns.push({ text: "", fit: [100, 100] });
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
          headerRows: 1,
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
      { image: qrCodeImage, width: 150, alignment: "center" },
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
          "Item 1 on the new page.",
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

  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(documentDefinition);
    const chunks = [];
    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => resolve(Buffer.concat(chunks)));
    pdfDoc.on("error", reject);
    pdfDoc.end();
  });
}

module.exports = { generatePdfBuffer };
