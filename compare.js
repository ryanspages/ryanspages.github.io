// Extract text from a PDF file (File object)
async function extractTextFromPDFFile(file) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
  const pdf = await loadingTask.promise;

  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(" ") + "\n";
  }

  return normalizeText(fullText);
}

// Light cleanup to improve diff results
function normalizeText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/Page \d+/gi, "")
    .trim();
}

document.getElementById("compare").onclick = async () => {
  const fileA = document.getElementById("fileA").files[0];
  const fileB = document.getElementById("fileB").files[0];

  if (!fileA || !fileB) {
    alert("Please select both PDF files.");
    return;
  }

  document.getElementById("results").innerHTML = "Processing PDFs…";

  try {
    const [textA, textB] = await Promise.all([
      extractTextFromPDFFile(fileA),
      extractTextFromPDFFile(fileB)
    ]);

    const diff = Diff.diffWords(textA, textB);

    const html = diff.map(part => {
      if (part.added) return `<span class="added">${part.value}</span>`;
      if (part.removed) return `<span class="removed">${part.value}</span>`;
      return part.value;
    }).join("");

    document.getElementById("results").innerHTML = html;

  } catch (err) {
    console.error(err);
    document.getElementById("results").innerHTML =
      "Error processing the PDFs.";
  }
};
