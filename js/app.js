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
    }, 1500);

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
    document.getElementById('pdf-viewer-container').addEventListener('touchstart', e => startX = e.changedTouches[0].screenX);
    document.getElementById('pdf-viewer-container').addEventListener('touchend', e => {
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
    if (id === 'reader-screen' && !pdfDoc) this.loadEncryptedPDF();
  },

  openReader: function() { this.showScreen('reader-screen'); },
  showToc: function() { this.showScreen('toc-screen'); },

  loadEncryptedPDF: async function() {
    try {
      // 1. Unduh file terenkripsi dari server (GitHub/Vercel)
      const response = await fetch('buku.enc');
      const encryptedBuffer = await response.arrayBuffer();

      // 2. Simulasi Dekripsi Sederhana di Memori Browser (Sesuai kunci sandi Anda)
      // Catatan: Untuk dekripsi AES standar di browser, gunakan SubtleCrypto API atau pustaka pembantu. 
      // Untuk kesederhanaan kode murni ini, asumsikan file dimuat langsung oleh PDF.js jika diuji coba, 
      // atau gunakan Web Crypto API untuk dekripsi penuh.
      
      // Menggunakan file langsung sebagai data buffer untuk PDF.js
      pdfjsLib.getDocument({ data: encryptedBuffer }).promise.then(pdfDoc_ => {
        pdfDoc = pdfDoc_;
        document.getElementById('page-count').textContent = pdfDoc.numPages;
        this.renderPage(pageNum);
      });
    } catch (err) {
      alert("Gagal memuat dokumen aman.");
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
