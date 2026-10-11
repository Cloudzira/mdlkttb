pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

let pdfDoc = null,
    pageNum = parseInt(localStorage.getItem('saved_page')) || 1,
    pageRendering = false,
    pageNumPending = null,
    scale = 1.2,
    canvas = document.getElementById('pdf-canvas'),
    ctx = canvas.getContext('2d');

const app = {
  init: function() {
    // Proteksi anti klik kanan & shortcut
    document.addEventListener('contextmenu', e => e.preventDefault());
    document.addEventListener('keydown', e => {
      if ((e.ctrlKey && ['s','p','u'].includes(e.key)) || e.key === 'F12') {
        e.preventDefault();
        alert("Fitur ini dinonaktifkan untuk keamanan dokumen.");
      }
    });

    setTimeout(() => {
      const user = localStorage.getItem('is_logged_in');
      if (user) {
        document.getElementById('watermark-title').textContent = `Reader - ${user}`;
        this.showScreen('toc-screen');
      } else {
        this.showScreen('login-screen');
      }
    }, 1000);

    document.getElementById('login-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('username').value;
      localStorage.setItem('is_logged_in', name);
      document.getElementById('watermark-title').textContent = `Reader - ${name}`;
      this.showScreen('toc-screen');
    });

    document.getElementById('page-num').addEventListener('change', (e) => {
      let num = parseInt(e.target.value);
      if (num >= 1 && num <= pdfDoc.numPages) {
        pageNum = num;
        this.queueRenderPage(pageNum);
      }
    });

    // Swipe gesture support
    let startX = 0;
    const container = document.getElementById('pdf-viewer-container');
    container.addEventListener('touchstart', e => startX = e.changedTouches[0].screenX);
    container.addEventListener('touchend', e => {
      let endX = e.changedTouches[0].screenX;
      if (endX < startX - 50) this.nextPage();
      if (endX > startX + 50) this.prevPage();
    });

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(err => console.log('SW error:', err));
    }
  },

  showScreen: function(id) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (id === 'reader-screen' && !pdfDoc) this.loadAndDecryptPDF();
  },

  openReader: function() { this.showScreen('reader-screen'); },
  showToc: function() { this.showScreen('toc-screen'); },

  // Fungsi Dekripsi Aman di Sisi Klien menggunakan Web Crypto API
  loadAndDecryptPDF: async function() {
    try {
      // 1. Ambil file terenkripsi dari server
      const response = await fetch('buku.enc');
      if (!response.ok) throw new Error("Gagal mengunduh file dokumen.");
      const encryptedBuffer = await response.arrayBuffer();

      // 2. Ekstrak IV (16 byte pertama) dan Data Terenkripsi sisanya
      const iv = encryptedBuffer.slice(0, 16);
      const dataCipher = encryptedBuffer.slice(16);

      // 3. Kunci Rahasia yang sama dengan saat enkripsi di Node.js
      const passphrase = "KurniapediaSecretPass2026";
      const enc = new TextEncoder();
      
      // Turunkan kunci menggunakan PBKDF2 (menyesuaikan scrypt/salt di tahap enkripsi)
      const keyMaterial = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(passphrase),
        { name: "PBKDF2" },
        false,
        ["deriveKey"]
      );

      const cryptoKey = await window.crypto.subtle.deriveKey(
        {
          name: "PBKDF2",
          salt: enc.encode("salt"),
          iterations: 100000,
          hash: "SHA-256"
        },
        keyMaterial,
        { name: "AES-CBC", length: 256 },
        false,
        ["decrypt"]
      );

      // 4. Proses Dekripsi File di dalam RAM Browser
      const decryptedBuffer = await window.crypto.subtle.decrypt(
        { name: "AES-CBC", iv: iv },
        cryptoKey,
        dataCipher
      );

      // 5. Muat hasil dekripsi ke PDF.js
      pdfjsLib.getDocument({ data: decryptedBuffer }).promise.then(pdfDoc_ => {
        pdfDoc = pdfDoc_;
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        this.renderPage(pageNum);
      }).catch(err => {
        alert("Format dokumen tidak valid setelah dekripsi.");
        console.error(err);
      });

    } catch (err) {
      alert("Gagal memuat dokumen aman. Periksa koneksi atau kunci dekripsi.");
      console.error(err);
    }
  },

  renderPage: function(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(page => {
      let viewport = page.getViewport({ scale: scale });
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      page.render({ canvasContext: ctx, viewport: viewport }).promise.then(() => {
        pageRendering = false;
        if (pageNumPending !== null) {
          this.renderPage(pageNumPending);
          pageNumPending = null;
        }
      });
    });
    document.getElementById('page-num').value = num;
  },

  queueRenderPage: function(num) {
    if (pageRendering) pageNumPending = num;
    else this.renderPage(num);
  },

  prevPage: function() { if (pageNum > 1) { pageNum--; this.queueRenderPage(pageNum); } },
  nextPage: function() { if (pageNum < pdfDoc.numPages) { pageNum++; this.queueRenderPage(pageNum); } },
  goToPage: function(num) { pageNum = num; this.openReader(); if (pdfDoc) this.queueRenderPage(pageNum); },
  zoomIn: function() { scale += 0.2; this.queueRenderPage(pageNum); },
  zoomOut: function() { if (scale > 0.6) { scale -= 0.2; this.queueRenderPage(pageNum); } },
  saveBookmark: function() {
    localStorage.setItem('saved_page', pageNum);
    alert(`Halaman ${pageNum} berhasil disimpan!`);
  },
  toggleFullscreen: function() {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else if (document.exitFullscreen) document.exitFullscreen();
  }
};

document.addEventListener('DOMContentLoaded', () => app.init());
