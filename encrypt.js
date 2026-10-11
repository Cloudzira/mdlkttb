const fs = require('fs');
const crypto = require('crypto');

// Konfigurasi Kunci Enkripsi (Ganti dengan kata sandi rahasia Anda)
const SECRET_KEY = crypto.scryptSync('KurniapediaSecretPass2026', 'salt', 32);
const IV = crypto.randomBytes(16);

function encryptFile() {
  const inputBuffer = fs.readFileSync('buku-asli.pdf');
  const cipher = crypto.createCipheriv('aes-256-cbc', SECRET_KEY, IV);
  const encrypted = Buffer.concat([IV, cipher.update(inputBuffer), cipher.final()]);
  
  fs.writeFileSync('buku.enc', encrypted);
  console.log('SUKSES! File berhasil dienkripsi menjadi buku.enc');
}

encryptFile();
