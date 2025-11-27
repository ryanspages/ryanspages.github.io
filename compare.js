// Wrap URL with a CORS proxy
function proxy(url) {
  return "https://api.allorigins.win/raw?url=" + encodeURIComponent(url);
}

// Extract text from a PDF URL
async function extractTextFromPDFUrl(url) {
  const loadingTask = pdfjsLib.getDocument(url);
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

// Light cleanup to help the diff algorithm
function normalizeText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/Page \d+/gi, "")
    .trim();
}

document.getElementById("compare").onclick = async () => {
  const rawA = document.getElementById("urlA").value.trim();
  const rawB = document.getElementById("urlB").value.trim();

  if (!rawA || !rawB) {
    alert("Please enter both PDF URLs.");
    return;
  }

  document.getElementById("results").innerHTML = "Processing PDFs…";

  try {
    const urlA = proxy(rawA);
    const urlB = proxy(rawB);

    const [textA, textB] = await Promise.all([
      extractTextFromPDFUrl(urlA),
      extractTextFromPDFUrl(urlB)
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
      "Error loading or processing the PDFs.";
  }
};
