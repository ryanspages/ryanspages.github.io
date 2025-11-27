async function extractTextFromPDFUrl(url) {
  const loadingTask = pdfjsLib.getDocument(url);
  const pdf = await loadingTask.promise;

  let fullText = "";

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const strings = content.items.map(item => item.str);
    fullText += strings.join(" ") + "\n";
  }

  return normalizeText(fullText);
}

// Light cleanup to improve diff quality
function normalizeText(text) {
  return text
    .replace(/\s+/g, " ")
    .replace(/Page \d+/gi, "")
    .trim();
}

document.getElementById("compare").onclick = async () => {
  const urlA = document.getElementById("urlA").value.trim();
  const urlB = document.getElementById("urlB").value.trim();

  if (!urlA || !urlB) {
    alert("Please enter both PDF URLs.");
    return;
  }

  document.getElementById("results").innerHTML = "Processing…";

  try {
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
