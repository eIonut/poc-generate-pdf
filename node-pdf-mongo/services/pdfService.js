const PdfPrinter = require("pdfmake");
const fs = require("fs");
const path = require("path");
// QRCode is not used in invoice, can be removed if not needed elsewhere.
// const QRCode = require("qrcode");

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

// --- Invoice PDF Generation Function ---
async function generateInvoicePdfBuffer(invoiceData) {
  const {
    clientCompanyName,
    clientContactPerson,
    clientEmail,
    clientBillingAddress,
    invoiceNumber,
    invoiceDate,
    dueDate,
    services, // Array of service objects
    subtotal,
    taxPercentage,
    grandTotal,
    additionalNotes,
  } = invoiceData;

  // const logoBase64 = await getLogoBase64(); // Load your actual logo if you have one
  const logoBase64 =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUAAAAFCAYAAACNbyblAAAAHElEQVQI12P4//8/w38GIAXDIBKE0DHxgljNBAAO9TXL0Y4OHwAAAABJRU5ErkJggg=="; // Placeholder

  const servicesTableBody = [
    [
      { text: "Description", style: "tableHeader" },
      { text: "Service Date", style: "tableHeader" },
      { text: "Qty", style: "tableHeader", alignment: "right" },
      { text: "Unit Price", style: "tableHeader", alignment: "right" },
      { text: "Line Total", style: "tableHeader", alignment: "right" },
    ],
  ];

  services.forEach((service) => {
    servicesTableBody.push([
      service.description || "",
      service.date ? new Date(service.date).toLocaleDateString() : "",
      {
        text: service.qty !== undefined ? service.qty.toString() : "0",
        alignment: "right",
      },
      {
        text:
          service.unitPrice !== undefined
            ? parseFloat(service.unitPrice).toFixed(2)
            : "0.00",
        alignment: "right",
      },
      {
        text:
          service.lineTotal !== undefined
            ? parseFloat(service.lineTotal).toFixed(2)
            : "0.00",
        alignment: "right",
      },
    ]);
  });

  const documentDefinition = {
    info: {
      title: `Invoice ${invoiceNumber || "N/A"}`,
      author: "My Invoicing App", // Replace with your app name
    },
    pageMargins: [40, 60, 40, 60], // [left, top, right, bottom]
    header: {
      columns: [
        logoBase64
          ? { image: logoBase64, width: 50, margin: [0, 0, 20, 0] }
          : { text: "Your Company", style: "header", margin: [0, 0, 20, 0] },
        {
          text: "INVOICE",
          style: "invoiceTitle",
          alignment: "right",
        },
      ],
      margin: [40, 30, 40, 10], // Adjust header margin
    },
    content: [
      // Client Information and Invoice Details
      {
        columns: [
          {
            width: "*",
            text: [
              { text: "Bill To:\n", style: "subheader" },
              `${clientCompanyName || "N/A"}\n`,
              clientContactPerson ? `${clientContactPerson}\n` : "",
              clientEmail ? `${clientEmail}\n` : "",
              `${clientBillingAddress || "N/A"}`,
            ],
          },
          {
            width: "auto",
            text: [
              {
                text: `Invoice #: ${invoiceNumber || "N/A"}\n`,
                style: "subheaderRight",
              },
              {
                text: `Date: ${
                  invoiceDate
                    ? new Date(invoiceDate).toLocaleDateString()
                    : "N/A"
                }\n`,
                style: "textRight",
              },
              {
                text: `Due Date: ${
                  dueDate ? new Date(dueDate).toLocaleDateString() : "N/A"
                }\n`,
                style: "textRight",
              },
            ],
            alignment: "right",
          },
        ],
        margin: [0, 20, 0, 30], // Margin below this section
      },

      // Services Table
      {
        text: "Services / Items",
        style: "subheader",
        margin: [0, 0, 0, 5], // Margin below subheader
      },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto", "auto", "auto"],
          body: servicesTableBody,
        },
        layout: "lightHorizontalLines", // or 'headerLineOnly', 'noBorders' etc.
        margin: [0, 0, 0, 30], // Margin below table
      },

      // Totals Section
      {
        columns: [
          { width: "*", text: "" }, // Spacer
          {
            width: "auto",
            table: {
              body: [
                [
                  {
                    text: "Subtotal:",
                    style: "totalsLabel",
                    alignment: "right",
                  },
                  {
                    text: ` ${
                      subtotal !== undefined
                        ? parseFloat(subtotal).toFixed(2)
                        : "0.00"
                    }`,
                    style: "totalsValue",
                    alignment: "right",
                  },
                ],
                [
                  {
                    text: "Tax (%):",
                    style: "totalsLabel",
                    alignment: "right",
                  },
                  {
                    text: ` ${
                      taxPercentage !== undefined
                        ? parseFloat(taxPercentage).toFixed(2)
                        : "0.00"
                    }`,
                    style: "totalsValue",
                    alignment: "right",
                  },
                ],
                [
                  {
                    text: "Grand Total:",
                    style: "totalsLabelBold",
                    alignment: "right",
                  },
                  {
                    text: ` ${
                      grandTotal !== undefined
                        ? parseFloat(grandTotal).toFixed(2)
                        : "0.00"
                    }`,
                    style: "totalsValueBold",
                    alignment: "right",
                  },
                ],
              ],
            },
            layout: "noBorders",
          },
        ],
        margin: [0, 0, 0, 30], // Margin after totals
      },

      // Additional Notes
      additionalNotes
        ? {
            text: "Additional Notes",
            style: "subheader",
            margin: [0, 10, 0, 5],
          }
        : {},
      additionalNotes
        ? {
            text: additionalNotes,
            style: "notesText",
            margin: [0, 0, 0, 30],
          }
        : {},
    ],
    footer: function (currentPage, pageCount) {
      return {
        text: `Page ${currentPage.toString()} of ${pageCount}`,
        alignment: "center",
        style: "footer",
      };
    },
    styles: {
      header: {
        fontSize: 20,
        bold: true,
        margin: [0, 0, 0, 10], // [left, top, right, bottom]
      },
      invoiceTitle: {
        fontSize: 28,
        bold: true,
      },
      subheader: {
        fontSize: 14,
        bold: true,
        margin: [0, 10, 0, 5],
      },
      subheaderRight: {
        fontSize: 12,
        bold: true,
        margin: [0, 0, 0, 2],
      },
      textRight: {
        fontSize: 10,
        margin: [0, 0, 0, 2],
      },
      tableHeader: {
        bold: true,
        fontSize: 10,
        color: "black",
      },
      totalsLabel: {
        bold: false,
        fontSize: 10,
        margin: [0, 2, 5, 2], // Add some margin to right of label
      },
      totalsValue: {
        bold: false,
        fontSize: 10,
        margin: [0, 2, 0, 2],
      },
      totalsLabelBold: {
        bold: true,
        fontSize: 11,
        margin: [0, 5, 5, 5],
      },
      totalsValueBold: {
        bold: true,
        fontSize: 11,
        margin: [0, 5, 0, 5],
      },
      notesText: {
        fontSize: 9,
        italics: true,
      },
      footer: {
        fontSize: 8,
        margin: [0, 10, 0, 0],
      },
    },
    defaultStyle: {
      font: "Roboto",
      fontSize: 10,
    },
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

module.exports = { generateInvoicePdfBuffer };
