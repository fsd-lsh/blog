import QRCode from 'qrcode';

function renderQr() {
  const target = document.getElementById('post-qrcode-target');
  if (!target || target.querySelector('canvas')) return;
  const url = target.getAttribute('data-url');
  if (!url) return;
  const canvas = document.createElement('canvas');
  QRCode.toCanvas(canvas, url, { width: 150 }, (err) => {
    if (!err) target.appendChild(canvas);
  });
}

document.addEventListener('DOMContentLoaded', renderQr);
document.getElementById('post-qrcode-btn')?.addEventListener('click', () => {
  setTimeout(renderQr, 100);
});
