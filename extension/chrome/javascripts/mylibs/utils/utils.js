(function() {

  define(['mylibs/utils/BlobBuilder.min'], function() {
    var canvas, ctx, pub, toBlob, toDataURL;
    canvas = document.createElement("canvas");
    ctx = canvas.getContext("2d");
    toDataURL = function(image, format) {
      canvas.width = image.width;
      canvas.height = image.height;
      ctx.drawImage(image, 0, 0, image.width, image.height);
      if (format) {
        return canvas.toDataURL(format)(image);
      } else {
        return canvas.toDataURL(image);
      }
    };
    toBlob = function(dataURL) {
      var ab, blobBuilder, byteString, bytes, ia, mimeString, _i, _len;
      if (dataURL.split(',')[0].indexOf('base64') >= 0) {
        byteString = atob(dataURL.split(',')[1]);
      } else {
        byteString = unescape(dataURL.split(',')[1]);
      }
      mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
      ab = new ArrayBuffer(byteString.length, 'binary');
      ia = new Uint8Array(ab);
      for (_i = 0, _len = byteString.length; _i < _len; _i++) {
        bytes = byteString[_i];
        ia[_i] = byteString.charCodeAt(_i);
      }
      blobBuilder = new BlobBuilder();
      blobBuilder.append(ab);
      return blobBuilder.getBlob(mimeString);
    };
    return pub = {
      init: function() {
        Image.prototype.toDataURL = function(format) {
          return toDataURL(this, format);
        };
        return Image.prototype.toBlob = function() {
          var dataURL;
          dataURL = toDataURL(this);
          return toBlob(dataURL);
        };
      },
      toBlob: function(dataURL) {
        return toBlob(dataURL);
      },
      getAnimationFrame: function() {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback, element) {
          return window.setTimeout(callback, 1000 / 60);
        };
      }
    };
  });

}).call(this);
