(function() {

  define(['libs/face/ccv', 'libs/face/face'], function($, kendo) {
    var draw, face, faceCore, ghostBuffer, pub, safeCanvas, safeCtx, timeStripsBuffer, trackFace, trackHead;
    face = {
      props: {
        glasses: new Image(),
        horns: new Image(),
        hipster: new Image(),
        sombraro: new Image()
      },
      backCanvas: document.createElement("canvas"),
      comp: [],
      lastCanvas: {},
      backCtx: {}
    };
    safeCanvas = document.createElement("canvas");
    safeCtx = safeCanvas.getContext("2d");
    timeStripsBuffer = [];
    ghostBuffer = [];
    draw = function(canvas, element, effect) {
      var texture;
      texture = canvas.texture(element);
      canvas.draw(texture);
      effect();
      canvas.update();
      return texture.destroy();
    };
    faceCore = function(video, canvas, prop, callback) {
      var backCanvas, backCtx, comp;
      backCanvas = backCanvas || document.createElement("canvas");
      backCanvas.width = 200;
      backCtx = backCtx || backCanvas.getContext("2d");
      if (face.lastCanvas !== canvas) face.ctx = canvas.getContext("2d");
      face.ctx.drawImage(video, 0, 0, video.width, video.height);
      backCtx.drawImage(video, 0, 0, backCanvas.width, backCanvas.height);
      if (!pub.isPreview) {
        return comp = ccv.detect_objects({
          canvas: backCanvas,
          cascade: cascade,
          interval: 4,
          min_neighbors: 1
        });
      } else {
        return [
          {
            x: video.width * .375,
            y: video.height * .375,
            width: video.width / 4,
            height: video.height / 4
          }
        ];
      }
    };
    trackFace = function(video, canvas, prop, xoffset, yoffset, xscaler, yscaler) {
      var aspectHeight, aspectWidth, comp, i, _i, _len, _ref, _results;
      aspectWidth = video.width / face.backCanvas.width;
      face.backCanvasheight = (video.height / video.width) * face.backCanvas.width;
      aspectHeight = video.height / face.backCanvas.height;
      comp = faceCore(video, canvas, prop);
      if (comp.length) face.comp = comp;
      _ref = face.comp;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        i = _ref[_i];
        _results.push(face.ctx.drawImage(prop, (i.x * aspectWidth) - (xoffset * aspectWidth), (i.y * aspectHeight) - (yoffset * aspectHeight), (i.width * aspectWidth) * xscaler, (i.height * aspectWidth) * yscaler));
      }
      return _results;
    };
    trackHead = function(video, canvas, prop, xOffset, yOffset, width, height) {
      var aspectHeight, aspectWidth, comp, i, _i, _len, _ref, _results;
      aspectWidth = video.width / face.backCanvas.width;
      face.backCanvasheight = (video.height / video.width) * face.backCanvas.width;
      aspectHeight = video.height / face.backCanvas.height;
      comp = faceCore(video, canvas, prop);
      if (comp.length) face.comp = comp;
      _ref = face.comp;
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        i = _ref[_i];
        _results.push(face.ctx.drawImage(prop, i.x * aspectWidth - (xOffset * aspectWidth), (i.y * aspectHeight) - (yOffset * aspectHeight), (i.width * aspectWidth) + (width * aspectWidth), (i.height * aspectHeight) + (height * aspectHeight)));
      }
      return _results;
    };
    return pub = {
      isPreview: true,
      clearBuffer: function() {
        timeStripsBuffer = [];
        return ghostBuffer = [];
      },
      init: function() {
        face.props.glasses.src = "images/glasses.png";
        face.props.horns.src = "images/horns.png";
        face.props.hipster.src = "images/hipster.png";
        return face.props.sombraro.src = "images/sombraro.png";
      },
      data: [
        {
          name: "Normal",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas;
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "In Disguise",
          kind: "face",
          filter: function(canvas, video) {
            var aspectHeight, aspectWidth, comp, i, _i, _len, _ref, _results;
            face.ctx = canvas.getContext("2d");
            face.backCtx = face.backCanvas.getContext("2d");
            face.backCtx.drawImage(video, 0, 0, 200, 150);
            face.ctx.drawImage(video, 0, 0, video.width, video.height);
            aspectWidth = video.width / face.backCanvas.width;
            face.backCanvasheight = (video.height / video.width) * face.backCanvas.width;
            aspectHeight = video.height / face.backCanvas.height;
            if (!pub.isPreview) {
              comp = ccv.detect_objects({
                canvas: face.backCanvas,
                cascade: cascade,
                interval: 4,
                min_neighbors: 1
              });
              if (comp.length > 0) face.comp = comp;
              _ref = face.comp;
              _results = [];
              for (_i = 0, _len = _ref.length; _i < _len; _i++) {
                i = _ref[_i];
                console.log(comp.length);
                _results.push(face.ctx.drawImage(face.props.glasses, (i.x * aspectWidth) - (0 * aspectWidth), (i.y * aspectHeight) - (0 * aspectHeight), (i.width * aspectWidth) * 1, (i.height * aspectWidth) * 1));
              }
              return _results;
            }
          }
        }
      ]
    };
  });

}).call(this);
