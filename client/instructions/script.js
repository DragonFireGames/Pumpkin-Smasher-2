
function createSprite(id, length, frameRate, callback) {
  var oldimg = document.getElementById(id);
  var src = oldimg.src;
  
  var canvas = document.createElement('canvas');
  canvas.id = id;
  var ctx = canvas.getContext("2d");
  var img = new Image();
  canvas.imageReference = img;
  img.onload = function() {
    img.width /= length;
    var scale = img.height/img.width;
    canvas.width = oldimg.width;
    canvas.height = oldimg.style.height ? oldimg.height : oldimg.width * scale;
    var frame = 0;
    setInterval(()=>{
      frame++;
      frame %= length;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = false;
      if (callback) callback(frame, canvas, ctx, img);
      else ctx.drawImage(img, frame * img.width, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
    },1000/frameRate);
  };
  img.src = src;

  for (prop in oldimg.style) {
    canvas.style[prop] = oldimg.style[prop];
  }
  oldimg.replaceWith(canvas);

  return {canvas, img};
}

// Monsters
createSprite("monster", 8, 12);
createSprite("ghost", 8, 12);
createSprite("nuke", 12, 12);
createSprite("rusher", 14, 12);
createSprite("wizard", 14, 12, (frame, canvas, ctx, img) => {
  frame += 6;
  frame %= 14;
  ctx.drawImage(img, frame * img.width, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
});
createSprite("brute", 8, 12, (frame, canvas, ctx, img) => {
  frame += 3;
  frame %= 8;
  
  const buffer = document.createElement('canvas');
  buffer.width = img.width * 8;
  buffer.height = img.height;
  const btx = buffer.getContext('2d');
      
  // First draw your image to the buffer
  btx.drawImage(img, 0, 0);
      
  // Now we'll multiply a rectangle of your chosen color
  btx.fillStyle = '#FF0000';
  btx.globalCompositeOperation = 'multiply';
  btx.fillRect(0, 0, buffer.width, buffer.height);
      
  // Finally, fix masking issues you'll probably incur and optional globalAlpha
  btx.globalAlpha = 0.5;
  btx.globalCompositeOperation = 'destination-in';
  btx.drawImage(img, 0, 0);

  ctx.drawImage(img, frame * img.width, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
  ctx.drawImage(buffer, frame * img.width, 0, img.width, img.height, 0, 0, canvas.width, canvas.height);
});

// Colorful
createSprite("colorful", 7, 12);

window.onkeydown = (e) => {
  if (e.key == "Escape") window.top.postMessage('esc');//location.href = location.origin;
}