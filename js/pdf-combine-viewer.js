
import * as pdfjsLib from "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.mjs";
import { PDFDocument } from "https://cdn.jsdelivr.net/npm/pdf-lib@1.17.1/+esm";


pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/build/pdf.worker.mjs";

async function initCombinedPdfViewer(viewer) {
  const pdfUrls = viewer.dataset.pdfs
    .split(",")
    .map(url => url.trim())
    .filter(Boolean);

  const pagesBox = viewer.querySelector(".pdf-pages");
  const status = viewer.querySelector(".pdf-status");
  const zoomIn = viewer.querySelector(".pdf-zoom-in");
  const zoomOut = viewer.querySelector(".pdf-zoom-out");
  const downloadBtn = viewer.querySelector(".pdf-download");

  let scale = 1.2;
  let docs = [];





async function downloadCombinedPdf() {
  try {
    status.textContent = "正在合并 PDF...";

    const mergedPdf = await PDFDocument.create();

    for (const url of pdfUrls) {
      const res = await fetch(url);

      if (!res.ok) {
        throw new Error(`无法下载：${url}`);
      }

      const bytes = await res.arrayBuffer();
      const srcPdf = await PDFDocument.load(bytes);

      const pageIndexes = srcPdf.getPageIndices();
      const copiedPages = await mergedPdf.copyPages(srcPdf, pageIndexes);

      copiedPages.forEach(page => {
        mergedPdf.addPage(page);
      });
    }

    const mergedBytes = await mergedPdf.save();

    const blob = new Blob([mergedBytes], {
      type: "application/pdf"
    });

    const blobUrl = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = "combined.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(blobUrl);

    status.textContent = "合并下载完成";
  } catch (err) {
    console.error(err);
    status.textContent = "下载失败：" + err.message;
  }
}




  async function loadAllPdfs() {
    docs = [];

    for (const url of pdfUrls) {
      const pdf = await pdfjsLib.getDocument(url).promise;
      docs.push(pdf);
    }
  }

  function countTotalPages() {
    return docs.reduce((sum, pdf) => sum + pdf.numPages, 0);
  }

  async function renderAllPages() {
    pagesBox.innerHTML = "";

    const totalPages = countTotalPages();
    let globalPageNumber = 0;

    status.textContent = "正在渲染...";

    for (const pdf of docs) {
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        globalPageNumber++;

        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale });

        const ratio = window.devicePixelRatio || 1;

        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");

        canvas.width = Math.floor(viewport.width * ratio);
        canvas.height = Math.floor(viewport.height * ratio);
        canvas.style.width = Math.floor(viewport.width) + "px";
        canvas.style.height = Math.floor(viewport.height) + "px";
        canvas.className = "pdf-page";

        const pageWrap = document.createElement("div");
        pageWrap.className = "pdf-page-wrap";

        const pageLabel = document.createElement("div");
        pageLabel.className = "pdf-page-label";
        pageLabel.textContent = `第 ${globalPageNumber} 页`;

        pageWrap.appendChild(canvas);
        pageWrap.appendChild(pageLabel);
        pagesBox.appendChild(pageWrap);

        await page.render({
          canvasContext: ctx,
          viewport,
          transform: ratio !== 1 ? [ratio, 0, 0, ratio, 0, 0] : null
        }).promise;

        status.textContent = `已加载 ${globalPageNumber} / ${totalPages} 页`;
      }
    }

    status.textContent = `共 ${totalPages} 页，缩放 ${Math.round(scale * 100)}%`;
  }

  zoomIn.addEventListener("click", async () => {
    scale = Math.min(scale + 0.2, 3);
    await renderAllPages();
  });

  zoomOut.addEventListener("click", async () => {
    scale = Math.max(scale - 0.2, 0.6);
    await renderAllPages();
  });


downloadBtn.addEventListener("click", downloadCombinedPdf);

  try {
    status.textContent = "正在加载 PDF...";
    await loadAllPdfs();
    await renderAllPages();
  } catch (err) {
    console.error(err);
    status.textContent = "PDF 加载失败：" + err.message;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  document
    .querySelectorAll(".combined-pdf-viewer")
    .forEach(initCombinedPdfViewer);
});