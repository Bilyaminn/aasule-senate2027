const canvas = document.getElementById('poster');
const ctx = canvas.getContext('2d');

let GREEN = '#176A49';
let RED = '#C1272D';
let INK = '#17221c';
let ON_GREEN = '#fff', ON_RED = '#fff', MARK = 'rgba(20,20,20,0.5)';
let selectedTemplate = 'modern';
const templatePalettes = {
  classic: { green: '#0B6E4F', red: '#C1272D', ink: '#17221c', onGreen:'#fff', onRed:'#fff', mark:'rgba(20,20,20,0.5)' },
  modern: { green: '#176A49', red: '#C1272D', ink: '#17221c', onGreen:'#fff', onRed:'#fff', mark:'rgba(20,20,20,0.5)' },
  premium: { green: '#D9B96A', red: '#F0DCA6', ink: '#F4EEDF', onGreen:'#10251d', onRed:'#10251d', mark:'rgba(244,238,223,0.8)' }
};
document.querySelectorAll('.template-option').forEach(button => {
  button.addEventListener('click', () => {
    selectedTemplate = button.dataset.template;
    const palette = templatePalettes[selectedTemplate];
    GREEN = palette.green; RED = palette.red; INK = palette.ink; ON_GREEN = palette.onGreen; ON_RED = palette.onRed; MARK = palette.mark;
    document.querySelectorAll('.template-option').forEach(option => {
      const active = option === button;
      option.classList.toggle('active', active);
      option.setAttribute('aria-pressed', String(active));
    });
    const labels = {classic:'Classic selected', modern:'Modern selected', premium:'Premium selected'};
    const status = document.getElementById('templateStatus');
    if (status) status.textContent = labels[selectedTemplate];
    draw();
  });
});

let userImg = null, thumbUrl = '';
const CROP_BOX = 300;
let userBaseScale = 1, userZoom = 1, userCX = 0, userCY = 0;
const cropCanvas = document.getElementById('cropCanvas');
const cropCtx = cropCanvas.getContext('2d');
const photoInput = document.getElementById('userPhoto');
const photoStatus = document.getElementById('userHint');
const exportStatus = document.getElementById('exportStatus');
const MAX_PHOTO_BYTES = 12 * 1024 * 1024;
let candImg = new Image();
candImg.src = "candidate.webp";
candImg.onload = draw;
candImg.onerror = () => { candImg.onerror = null; candImg.src = "candidate.jpg"; };

let logoImg = new Image();
logoImg.src = "candidate-logo.png";
logoImg.onload = draw;

photoInput.addEventListener('change', (e)=>{
  const file = e.target.files && e.target.files[0];
  if(!file) return;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)){
    photoStatus.textContent = 'Please choose a JPG, PNG or WebP image.';
    photoInput.value = '';
    return;
  }
  if(file.size > MAX_PHOTO_BYTES){
    photoStatus.textContent = 'That image is larger than 12 MB. Choose a smaller photo.';
    photoInput.value = '';
    return;
  }
  const objectUrl = URL.createObjectURL(file);
  const img = new Image();
  img.onerror = () => { URL.revokeObjectURL(objectUrl); photoStatus.textContent = 'This image could not be opened. Try a different file.'; photoInput.value = ''; };
  img.onload = ()=>{
    if (img.naturalWidth * img.naturalHeight > 40000000) {
      URL.revokeObjectURL(objectUrl);
      photoStatus.textContent = 'This image has very large dimensions. Please choose a smaller photo.';
      photoInput.value = '';
      return;
    }
    if (thumbUrl) URL.revokeObjectURL(thumbUrl);
    thumbUrl = objectUrl;
    userImg = img;
    userBaseScale = Math.max(CROP_BOX/img.width, CROP_BOX/img.height);
    userZoom = 1;
    userCX = img.width/2;
    userCY = img.height/2;
    const thumb = document.getElementById('userThumb');
    thumb.src = objectUrl;
    thumb.style.display = 'block';
    photoStatus.textContent = 'Photo ready. Drag to reposition or adjust the zoom.';
    document.getElementById('cropField').style.display = 'block';
    document.getElementById('zoomRange').value = 1;
    renderCropPreview();
    draw();
  };
  img.src = objectUrl;
});

const removePhotoButton = document.getElementById('removePhoto');
removePhotoButton?.addEventListener('click', () => {
  userImg = null;
  userBaseScale = 1; userZoom = 1; userCX = 0; userCY = 0;
  photoInput.value = '';
  const thumb = document.getElementById('userThumb');
  thumb.removeAttribute('src');
  if (thumbUrl) { URL.revokeObjectURL(thumbUrl); thumbUrl = ''; }
  thumb.style.display = 'none';
  document.getElementById('cropField').style.display = 'none';
  photoStatus.textContent = 'Tap to upload your photo';
  renderCropPreview();
  draw();
});


// draws the current crop window (defined by userCX/userCY/zoom) into any target context/box
function drawUserPhotoInto(targetCtx, x, y, size){
  if(!userImg){
    targetCtx.fillStyle = '#e4e1d6';
    targetCtx.fillRect(x, y, size, size);
    targetCtx.fillStyle = 'rgba(20,20,20,0.45)';
    targetCtx.font = '600 18px "Space Grotesk", sans-serif';
    targetCtx.textAlign = 'center';
    targetCtx.fillText('Your photo', x+size/2, y+size/2);
    targetCtx.textAlign = 'left';
    return;
  }
  const effScale = userBaseScale * userZoom;
  const windowSize = CROP_BOX / effScale;
  let sx = userCX - windowSize/2;
  let sy = userCY - windowSize/2;
  sx = Math.max(0, Math.min(sx, userImg.width - windowSize));
  sy = Math.max(0, Math.min(sy, userImg.height - windowSize));
  targetCtx.drawImage(userImg, sx, sy, windowSize, windowSize, x, y, size, size);
}

function renderCropPreview(){
  cropCtx.clearRect(0,0,CROP_BOX,CROP_BOX);
  drawUserPhotoInto(cropCtx, 0, 0, CROP_BOX);
}

// drag to reposition
let dragging = false, lastX = 0, lastY = 0;
cropCanvas.addEventListener('pointerdown', (e)=>{
  if(!userImg) return;
  dragging = true;
  lastX = e.clientX; lastY = e.clientY;
  cropCanvas.setPointerCapture(e.pointerId);
});
cropCanvas.addEventListener('pointermove', (e)=>{
  if(!dragging || !userImg) return;
  const rect = cropCanvas.getBoundingClientRect();
  const pxRatio = CROP_BOX / rect.width;
  const dx = (e.clientX - lastX) * pxRatio;
  const dy = (e.clientY - lastY) * pxRatio;
  lastX = e.clientX; lastY = e.clientY;
  const effScale = userBaseScale * userZoom;
  userCX -= dx / effScale;
  userCY -= dy / effScale;
  const windowSize = CROP_BOX / effScale;
  userCX = Math.max(windowSize/2, Math.min(userCX, userImg.width - windowSize/2));
  userCY = Math.max(windowSize/2, Math.min(userCY, userImg.height - windowSize/2));
  renderCropPreview();
  draw();
});
window.addEventListener('pointerup', ()=>{ dragging = false; });
window.addEventListener('pointercancel', ()=>{ dragging = false; });

document.getElementById('zoomRange').addEventListener('input', (e)=>{
  if(!userImg) return;
  userZoom = parseFloat(e.target.value);
  const effScale = userBaseScale * userZoom;
  const windowSize = CROP_BOX / effScale;
  userCX = Math.max(windowSize/2, Math.min(userCX, userImg.width - windowSize/2));
  userCY = Math.max(windowSize/2, Math.min(userCY, userImg.height - windowSize/2));
  renderCropPreview();
  draw();
});

function drawCoverImage(img, x, y, w, h, focusY){
  focusY = focusY===undefined ? 0.5 : focusY;
  const imgRatio = img.width / img.height;
  const boxRatio = w / h;
  let sx, sy, sw, sh;
  if(imgRatio > boxRatio){
    sh = img.height; sw = sh * boxRatio; sx = (img.width - sw)/2; sy = 0;
  } else {
    sw = img.width; sh = sw / boxRatio; sx = 0; sy = (img.height - sh) * focusY;
  }
  ctx.drawImage(img, sx, sy, sw, sh, x, y, w, h);
}

function fitFont(text, weight, family, maxWidth, startSize, minSize){
  let size = startSize;
  while(size > minSize){
    ctx.font = weight + ' ' + size + 'px "' + family + '"';
    if(ctx.measureText(text).width <= maxWidth) break;
    size -= 2;
  }
  return size;
}

function drawLogo(cx, cy, d){
  if(!(logoImg && logoImg.complete && logoImg.naturalWidth)) return;
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, d/2, 0, Math.PI*2);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(logoImg, cx-d/2, cy-d/2, d, d);
  ctx.restore();
}

let _raf=0;
function draw(){ cancelAnimationFrame(_raf); _raf=requestAnimationFrame(render); }
function render(){
  const W = canvas.width, H = canvas.height;
  const x0 = 650;

  // ===== template-specific art direction =====
  const bg = ctx.createLinearGradient(0,0,W,H);
  if (selectedTemplate === 'premium') {
    bg.addColorStop(0, '#142a20'); bg.addColorStop(1, '#07150f');
  } else if (selectedTemplate === 'classic') {
    bg.addColorStop(0, '#fffdf7'); bg.addColorStop(1, '#eee5d7');
  } else {
    bg.addColorStop(0, '#F8F2EA'); bg.addColorStop(1, '#F1E6E0');
  }
  ctx.fillStyle = bg; ctx.fillRect(0,0,W,H);
  const glow = ctx.createRadialGradient(W*0.82,H*0.22,40, W*0.82,H*0.22,620);
  glow.addColorStop(0, selectedTemplate === 'premium' ? 'rgba(199,164,91,0.24)' :
    (selectedTemplate === 'classic' ? 'rgba(193,39,45,0.17)' : 'rgba(193,39,45,0.32)'));
  glow.addColorStop(1, 'rgba(193,39,45,0)');
  ctx.fillStyle = glow; ctx.fillRect(0,0,W,H);
  if (selectedTemplate === 'classic') {
    ctx.strokeStyle = 'rgba(11,110,79,.65)'; ctx.lineWidth = 5; ctx.strokeRect(18,18,W-36,H-36);
    ctx.strokeStyle = 'rgba(193,39,45,.55)'; ctx.lineWidth = 2; ctx.strokeRect(30,30,W-60,H-60);
  } else if (selectedTemplate === 'premium') {
    ctx.strokeStyle = 'rgba(199,164,91,.78)'; ctx.lineWidth = 3; ctx.strokeRect(24,24,W-48,H-48);
    ctx.strokeStyle = 'rgba(199,164,91,.28)'; ctx.lineWidth = 1; ctx.strokeRect(38,38,W-76,H-76);
    ctx.fillStyle = '#C7A45B'; ctx.fillRect(24,24,210,7);
  } else {
    ctx.fillStyle = RED; ctx.fillRect(0,0,W,12); ctx.fillStyle = GREEN; ctx.fillRect(0,12,260,5);
  }
  // faint dot grid, filling the lower-left column
  ctx.fillStyle = selectedTemplate === 'premium' ? 'rgba(244,238,223,0.10)' :
    (selectedTemplate === 'classic' ? 'rgba(20,20,20,0.055)' : 'rgba(20,20,20,0.08)');
  for(let yy=880; yy<H-20; yy+=22){
    for(let xx=0; xx<350; xx+=22){
      ctx.beginPath(); ctx.arc(xx,yy,1.6,0,Math.PI*2); ctx.fill();
    }
  }

  // ===== right side: candidate photo, full bleed, feathered into the cream =====
  const photoX = 0;
  ctx.save();
  ctx.beginPath();
  ctx.rect(photoX, 0, 630, H);
  ctx.clip();
  // red stage-light backdrop behind him
  const stage = ctx.createLinearGradient(0,0,0,H);
  if (selectedTemplate === 'premium') {
    stage.addColorStop(0, '#6f5730'); stage.addColorStop(1, '#17251d');
  } else if (selectedTemplate === 'classic') {
    stage.addColorStop(0, '#0B6E4F'); stage.addColorStop(1, '#073c2c');
  } else {
    stage.addColorStop(0, '#c22a2f'); stage.addColorStop(1, '#5c1216');
  }
  ctx.fillStyle = stage;
  ctx.fillRect(photoX,0,630,H);
  if(candImg && candImg.complete && candImg.naturalWidth){
    drawCoverImage(candImg, photoX, 0, 630, H, 0.02);
  }
  ctx.restore();

  // ===== tagline above the candidate's head =====
  const fade = ctx.createLinearGradient(0,0,0,230);
  fade.addColorStop(0,'rgba(10,28,21,0.82)');
  fade.addColorStop(1,'rgba(10,28,21,0)');
  ctx.fillStyle = fade;
  ctx.fillRect(0,0,630,230);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#fff';
  const tagSize = Math.min(fitFont('MODERN NASARAWA','900','Archivo Black',560,46,26),46);
  ctx.font = '900 ' + Math.round(tagSize*0.62) + 'px "Archivo Black", sans-serif';
  ctx.fillText('THE ARCHITECT OF', 315, 62);
  ctx.font = '900 ' + tagSize + 'px "Archivo Black", sans-serif';
  ctx.fillText('MODERN NASARAWA', 315, 62 + tagSize + 6);
  ctx.fillStyle = RED;
  ctx.fillRect(315-40, 62 + tagSize + 22, 80, 5);
  ctx.textAlign = 'left';

  // ===== left content column =====
  let cy = 90;

  ctx.textAlign = 'left';
  ctx.fillStyle = INK;
  ctx.font = '900 30px "Archivo Black", sans-serif';
  ctx.fillText("LET'S WIN", x0, cy);
  const lw = ctx.measureText("LET'S WIN").width;
  ctx.strokeStyle = 'rgba(20,20,20,0.4)';
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0+lw+18, cy-9); ctx.lineTo(x0+300, cy-9); ctx.stroke();

  cy += 86;
  const togetherSize = fitFont('TOGETHER', 'italic 900', 'Archivo Black', 410, 84, 44);
  ctx.font = 'italic 900 ' + togetherSize + 'px "Archivo Black", sans-serif';
  ctx.fillStyle = GREEN;
  ctx.fillText('TOGETHER', x0, cy);

  cy += 54;
  ctx.strokeStyle = RED;
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x0, cy-14); ctx.lineTo(x0+46, cy-14); ctx.stroke();
  // "2027" ribbon tag — a parallelogram
  const tagX = x0+60, tagY = cy-38, tagW = 150, tagH = 46, tagSkew = 14;
  ctx.beginPath();
  ctx.moveTo(tagX+tagSkew, tagY);
  ctx.lineTo(tagX+tagW, tagY);
  ctx.lineTo(tagX+tagW-tagSkew, tagY+tagH);
  ctx.lineTo(tagX, tagY+tagH);
  ctx.closePath();
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.fillStyle = ON_RED;
  ctx.font = '900 26px "Archivo Black", sans-serif';
  ctx.fillText('2027', tagX+26, tagY+32);
  ctx.strokeStyle = GREEN;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(tagX+tagW+16, tagY+6); ctx.lineTo(tagX+tagW+2, tagY+tagH-6); ctx.stroke();

  cy += 70;
  // location pin
  ctx.save();
  ctx.translate(x0+9, cy-12);
  ctx.beginPath();
  ctx.moveTo(0,-16); ctx.bezierCurveTo(9,-16,15,-9,15,-1); ctx.bezierCurveTo(15,9,0,20,0,20);
  ctx.bezierCurveTo(0,20,-15,9,-15,-1); ctx.bezierCurveTo(-15,-9,-9,-16,0,-16);
  ctx.closePath();
  ctx.fillStyle = RED;
  ctx.fill();
  ctx.beginPath(); ctx.arc(0,-1,5,0,Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  ctx.restore();
  ctx.fillStyle = INK;
  ctx.font = '800 19px "Space Grotesk", sans-serif';
  ctx.fillText('NASARAWA', x0+32, cy-4);
  ctx.fillText('NORTH', x0+32, cy+20);

  const eside = 300;
  const esx = x0, esy = cy+52;
  const radius = 24;

  function roundedRectPath(x, y, w, h, r){
    ctx.beginPath();
    ctx.moveTo(x+r, y);
    ctx.arcTo(x+w, y, x+w, y+h, r);
    ctx.arcTo(x+w, y+h, x, y+h, r);
    ctx.arcTo(x, y+h, x, y, r);
    ctx.arcTo(x, y, x+w, y, r);
    ctx.closePath();
  }

  ctx.save();
  ctx.fillStyle = '#fff';
  roundedRectPath(esx-8, esy-8, eside+16, eside+16, radius+8);
  ctx.fill();
  ctx.restore();

  ctx.save();
  roundedRectPath(esx, esy, eside, eside, radius);
  ctx.clip();
  drawUserPhotoInto(ctx, esx, esy, eside);
  ctx.restore();

  ctx.strokeStyle = GREEN; ctx.lineWidth = 7;
  roundedRectPath(esx, esy, eside, eside, radius);
  ctx.stroke();

  cy = esy + eside + 34;

  ctx.font = '800 20px "Space Grotesk", sans-serif';
  const pillText = 'MY VOTE IS FOR';
  const pillTextW = ctx.measureText(pillText).width;
  const pillPad = 22, pillH = 46, pillR = 23;
  const pillW = pillTextW + pillPad*2 + 34;
  const pillX = x0, pillY = cy-34;
  ctx.beginPath();
  ctx.moveTo(pillX+pillR, pillY);
  ctx.arcTo(pillX+pillW, pillY, pillX+pillW, pillY+pillH, pillR);
  ctx.arcTo(pillX+pillW, pillY+pillH, pillX, pillY+pillH, pillR);
  ctx.arcTo(pillX, pillY+pillH, pillX, pillY, pillR);
  ctx.arcTo(pillX, pillY, pillX+pillW, pillY, pillR);
  ctx.closePath();
  ctx.fillStyle = GREEN;
  ctx.fill();
  ctx.beginPath(); ctx.arc(pillX+28, pillY+pillH/2, 13, 0, Math.PI*2); ctx.fillStyle='#fff'; ctx.fill();
  ctx.strokeStyle = GREEN; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(pillX+22,pillY+pillH/2); ctx.lineTo(pillX+27,pillY+pillH/2+5); ctx.lineTo(pillX+35,pillY+pillH/2-6); ctx.stroke();
  ctx.fillStyle = ON_GREEN;
  ctx.fillText(pillText, pillX+48, pillY+pillH/2+7);

  cy += 60;
  ctx.fillStyle = RED;
  ctx.font = '800 26px "Archivo Black", sans-serif';
  ctx.fillText('ENGR.', x0, cy);

  cy += 44;
  const nameSize1 = fitFont('ABDULLAHI', '900', 'Archivo Black', 410, 42, 23);
  ctx.font = '900 ' + nameSize1 + 'px "Archivo Black", sans-serif';
  ctx.fillStyle = GREEN;
  ctx.fillText('ABDULLAHI', x0, cy);

  cy += 50;
  const nameSize2 = fitFont('ALHAJI', '900', 'Archivo Black', 410, 42, 23);
  ctx.font = '900 ' + nameSize2 + 'px "Archivo Black", sans-serif';
  ctx.fillStyle = GREEN;
  ctx.fillText('ALHAJI', x0, cy);

  cy += 100;
  const suleSize = fitFont('SULE', '900', 'Archivo Black', 420, 104, 56);
  ctx.font = '900 ' + suleSize + 'px "Archivo Black", sans-serif';
  ctx.fillStyle = RED;
  ctx.fillText('SULE', x0, cy);

  cy += 48;
  ctx.font = '600 30px "Caveat", cursive';
  ctx.fillStyle = RED;
  ctx.fillText('for', x0+30, cy);
  ctx.strokeStyle = 'rgba(20,20,20,0.35)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, cy-10); ctx.lineTo(x0+22, cy-10); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(x0+65, cy-10); ctx.lineTo(x0+140, cy-10); ctx.stroke();

  cy += 42;
  ctx.font = '900 40px "Archivo Black", sans-serif';
  ctx.fillStyle = GREEN;
  ctx.fillText('SENATE', x0, cy);

  cy += 62;
  ctx.font = '700 21px "Space Grotesk", sans-serif';
  ctx.fillStyle = INK;
  ctx.fillText('NASARAWA NORTH', x0, cy);

  cy += 14;
  ctx.strokeStyle = RED; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(x0, cy); ctx.lineTo(x0+230, cy); ctx.stroke();
  ctx.strokeStyle = GREEN;
  ctx.beginPath(); ctx.moveTo(x0, cy+6); ctx.lineTo(x0+230, cy+6); ctx.stroke();

  const apcY = cy+170;
  drawLogo(x0+34, apcY, 66);
  ctx.strokeStyle = 'rgba(20,20,20,0.25)'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(x0+34, apcY, 33, 0, Math.PI*2); ctx.stroke();
  ctx.font = '900 24px "Archivo Black", sans-serif';
  ctx.fillStyle = INK;
  ctx.fillText('VOTE ', x0+78, apcY+8);
  const voteW = ctx.measureText('VOTE ').width;
  ctx.fillStyle = RED;
  ctx.fillText('APC', x0+78+voteW, apcY+8);

  // ===== fixed watermark: bottom of the right-hand column so it never sits on the photo =====
  if (selectedTemplate === 'premium') {
    ctx.strokeStyle = 'rgba(199,164,91,.6)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x0, H-74); ctx.lineTo(W-60, H-74); ctx.stroke();
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = MARK;
  ctx.font = '600 16px "Space Grotesk", sans-serif';
  ctx.fillText('Crafted by Bilyaminu', x0 + (W - x0 - 40) / 2, H-48);
  ctx.textAlign = 'left';
}

document.getElementById('downloadBtn').addEventListener('click', ()=>{
  if(exportStatus) exportStatus.textContent = 'Preparing your high-resolution poster…';
  const filename = 'sule-2027-poster.png';
  try{
    if(canvas.toBlob){
      canvas.toBlob((blob)=>{
        if(!blob){ fallbackDownload(); return; }
        const url = URL.createObjectURL(blob);
        try{
          const link = document.createElement('a');
          link.download = filename;
          link.href = url;
          link.style.display = 'none';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
        } catch(e){
          window.open(url, '_blank');
        }
        setTimeout(()=>URL.revokeObjectURL(url), 6000);
        if(exportStatus) exportStatus.textContent = 'Your poster is ready. The PNG download should begin shortly.';
      }, 'image/png');
    } else {
      fallbackDownload();
    }
  } catch(err){
    fallbackDownload();
  }

  function fallbackDownload(){
    try{
      const dataUrl = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = filename;
      link.href = dataUrl;
      link.click();
      if(exportStatus) exportStatus.textContent = 'Your poster is ready. The PNG download should begin shortly.';
    } catch(e){
      if(exportStatus) exportStatus.textContent = 'The poster could not be exported. Please try again in another browser.';
      const w = window.open('', '_blank');
      if(w){
        if(exportStatus) exportStatus.textContent = 'Your browser opened the poster in a new tab. Save the image from there.';
        w.document.write('<title>Your poster</title><body style="margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;"><img src="'+canvas.toDataURL('image/png')+'" style="max-width:100%;height:auto;"></body>');
      }
    }
  }
});

if(document.fonts && document.fonts.load){
  Promise.all([
    '900 30px "Archivo Black"','italic 900 30px "Archivo Black"',
    '700 16px "Space Grotesk"','800 16px "Space Grotesk"','600 30px "Caveat"'
  ].map(f=>document.fonts.load(f,'Aa'))).then(draw).catch(draw);
}
draw();