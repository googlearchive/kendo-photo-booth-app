
(function() {

  define('mylibs/photobooth/photobooth',[], function() {
    /* Photostrip
    
    	Handles creation of photostrips by stitching separate photos together
    */
    var canvas, createStrip, images, pub;
    images = [];
    canvas = {};
    createStrip = function(counter, images, ctx, width, height) {
      var image;
      image = new Image();
      image.src = images[counter];
      image.width = width;
      image.height = height;
      return image.onload = function() {
        var src, y;
        y = (counter * height) + ((counter * 20) + 20);
        ctx.drawImage(image, 20, y, image.width, image.height);
        if (counter === images.length - 1) {
          src = canvas.toDataURL();
          return $.publish("/pictures/create", [
            {
              image: src,
              name: null,
              strip: true,
              save: true
            }
          ]);
        } else {
          return createStrip(++counter, images, ctx, width, height);
        }
      };
    };
    return pub = {
      init: function(width, height) {
        canvas = $("<canvas style=color:fff></canvas>")[0];
        return $.subscribe("/photobooth/create", function(images) {
          var counter, ctx, img;
          counter = 0;
          canvas.width = width + 40;
          canvas.height = (height * images.length) + (images.length * 20) + 20;
          ctx = canvas.getContext("2d");
          ctx.fillStyle = "rgb(255,255,255)";
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          return img = createStrip(counter, images, ctx, width, height);
        });
      }
    };
  });

}).call(this);

(function() {

  define('mylibs/controls/controls',[], function() {
    var pub;
    return pub = {
      init: function(controlsId) {
        var $buttons, $controls;
        $controls = $("#" + controlsId);
        $buttons = $controls.find("button");
        $controls.on("click", "button", function() {
          return $.publish($(this).data("event"));
        });
        $controls.on("change", "input", function(e) {
          return $.publish("/polaroid/change", [e]);
        });
        return $.subscribe("/controls/enable", function(enabled) {
          if (enabled) {
            return $buttons.removeAttr("disabled");
          } else {
            return $buttons.attr("disabled", "disabled");
          }
        });
      }
    };
  });

}).call(this);

/*
 * glfx.js
 * http://evanw.github.com/glfx.js/
 *
 * Copyright 2011 Evan Wallace
 * Released under the MIT license
 */
var fx = (function() {
var exports = {};

// src/core/canvas.js
var gl;
var targetTextureType;

function log() {
    if (console && console.log) console.log.apply(console, arguments);
}

function clamp(lo, value, hi) {
    return Math.max(lo, Math.min(value, hi));
}

function wrapTexture(texture) {
    return {
        _: texture,
        loadContentsOf: function(element) { this._.loadContentsOf(element); },
        clear: function() { this._.clear(); },
        width: function() { return this._.width; },
        height: function() { return this._.height; },
        destroy: function() { this._.destroy(); }
    };
}

function texture(element) {
    if (arguments.length == 2) {
        return wrapTexture(new Texture(arguments[0], arguments[1], gl.RGBA, targetTextureType));
    }
    return wrapTexture(Texture.fromElement(element));
}

function initialize(width, height) {
    if (this._.texture) this._.texture.destroy();
    if (this._.spareTexture) this._.spareTexture.destroy();
    this.width = width;
    this.height = height;
    this._.texture = new Texture(width, height, gl.RGBA, targetTextureType);
    this._.spareTexture = new Texture(width, height, gl.RGBA, targetTextureType);
    this._.extraTexture = this._.extraTexture || new Texture(0, 0, gl.RGBA, targetTextureType);
    this._.flippedShader = this._.flippedShader || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            gl_FragColor = texture2D(texture, vec2(texCoord.x, 1.0 - texCoord.y));\
        }\
    ');
    this._.isInitialized = true;
}

/*
   Draw a texture to the canvas, with an optional width and height to scale to.
   If no width and height are given then the original texture width and height
   are used.
*/
function draw(texture, width, height) {
    if (!this._.isInitialized || texture._.width != this.width || texture._.height != this.height) {
        initialize.call(this, width ? width : texture._.width, height ? height : texture._.height);
    }

    texture._.use();
    this._.texture.drawTo(function() {
        Shader.getDefaultShader().drawRect();
    });

    return this;
}

function update() {
    this._.texture.use();
    this._.flippedShader.drawRect();
    return this;
}

function simpleShader(shader, uniforms, textureIn, textureOut) {
    (textureIn || this._.texture).use();
    this._.spareTexture.drawTo(function() {
        shader.uniforms(uniforms).drawRect();
    });
    this._.spareTexture.swapWith(textureOut || this._.texture);
}

function replace(node) {
    node.parentNode.insertBefore(this, node);
    node.parentNode.removeChild(node);
    return this;
}

function contents() {
    var texture = new Texture(this._.texture.width, this._.texture.height, gl.RGBA, targetTextureType);
    this._.texture.use();
    texture.drawTo(function() {
        Shader.getDefaultShader().drawRect();
    });
    return wrapTexture(texture);
}

function swapContentsWith(texture) {
    this._.texture.swapWith(texture._ || texture);
}

/*
   Get a Uint8 array of pixel values: [r, g, b, a, r, g, b, a, ...]
   Length of the array will be width * height * 4.
*/
function getPixelArray() {
    var w = this._.texture.width;
    var h = this._.texture.height;
    var array = new Uint8Array(w * h * 4);
    this._.texture.drawTo(function() {
        gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, array);
    });
    return array;
}

// Fix broken toDataURL() methods on some implementations
function toDataURL(mimeType) {
    var w = this._.texture.width;
    var h = this._.texture.height;
    var array = getPixelArray.call(this);
    var canvas2d = document.createElement('canvas');
    var c = canvas2d.getContext('2d');
    canvas2d.width = w;
    canvas2d.height = h;
    var data = c.createImageData(w, h);
    for (var i = 0; i < array.length; i++) {
        data.data[i] = array[i];
    }
    c.putImageData(data, 0, 0);
    return canvas2d.toDataURL(mimeType);
}

function wrap(func) {
    return function() {
        // Make sure that we're using the correct global WebGL context
        gl = this._.gl;

        // Now that the context has been switched, we can call the wrapped function
        return func.apply(this, arguments);
    };
}

exports.canvas = function() {
    var canvas = document.createElement('canvas');
    var errorText = 'Unknown';
    function contextCreationError(e) {
        canvas.removeEventListener('webglcontextcreationerror', contextCreationError, false);
        if (e.statusMessage) errorText = e.statusMessage;
    }
    canvas.addEventListener('webglcontextcreationerror', contextCreationError, false);
    try {
        gl = canvas.getContext('experimental-webgl');
    } catch (e) {
        gl = null;
    }
    if (!gl) {
        throw new Error('This browser does not support WebGL, reason: ' + errorText);
    }
    gl.generation = 0;
    canvas.addEventListener('webglcontextlost', function(e) {
        e.preventDefault();
        log('context lost');
    }, false);
    canvas.addEventListener('webglcontextrestored', function() {
        gl.generation++;
        log('context restored');
    }, false);
    canvas._ = {
        gl: gl,
        isInitialized: false,
        texture: null,
        spareTexture: null,
        flippedShader: null
    };

    // Go for floating point buffer textures if we can, it'll make the bokeh filter look a lot better
    targetTextureType = gl.getExtension('OES_texture_float') ? gl.FLOAT : gl.UNSIGNED_BYTE;

    // Core methods
    canvas.texture = wrap(texture);
    canvas.draw = wrap(draw);
    canvas.update = wrap(update);
    canvas.replace = wrap(replace);
    canvas.contents = wrap(contents);
    canvas.getPixelArray = wrap(getPixelArray);
    canvas.toDataURL = wrap(toDataURL);
    canvas.swapContentsWith = wrap(swapContentsWith);

    // Filter methods
    canvas.brightnessContrast = wrap(brightnessContrast);
    canvas.hexagonalPixelate = wrap(hexagonalPixelate);
    canvas.hueSaturation = wrap(hueSaturation);
    canvas.colorHalftone = wrap(colorHalftone);
    canvas.triangleBlur = wrap(triangleBlur);
    canvas.kaleidoscope = wrap(kaleidoscope);
    canvas.unsharpMask = wrap(unsharpMask);
    canvas.perspective = wrap(perspective);
    canvas.matrixWarp = wrap(matrixWarp);
    canvas.bulgePinch = wrap(bulgePinch);
    canvas.quadRotate = wrap(quadRotate);
    canvas.chromeLogo = wrap(chromeLogo);
    canvas.hopePoster = wrap(hopePoster);
    canvas.mirrorTube = wrap(mirrorTube);
    canvas.tiltShift = wrap(tiltShift);
    canvas.dotScreen = wrap(dotScreen);
    canvas.blockhead = wrap(blockhead);
    canvas.quadColor = wrap(quadColor);
    canvas.photocopy = wrap(photocopy);
    canvas.edgeWork = wrap(edgeWork);
    canvas.lensBlur = wrap(lensBlur);
    canvas.zoomBlur = wrap(zoomBlur);
    canvas.pixelate = wrap(pixelate);
    canvas.wetTable = wrap(wetTable);
    canvas.oldFilm = wrap(oldFilm);
    canvas.denoise = wrap(denoise);
    canvas.curves = wrap(curves);
    canvas.mirror = wrap(mirror);
    canvas.invert = wrap(invert);
    canvas.swirl = wrap(swirl);
    canvas.noise = wrap(noise);
    canvas.blend = wrap(blend);
    canvas.ink = wrap(ink);
    canvas.vhs = wrap(vhs);
    canvas.vignette = wrap(vignette);
    canvas.vibrance = wrap(vibrance);
    canvas.sepia = wrap(sepia);
    canvas.timeStrips = wrap(timeStrips);
    canvas.stamp = wrap(stamp);

    return canvas;
};
exports.splineInterpolate = splineInterpolate;

// src/core/matrix.js
// from javax.media.jai.PerspectiveTransform

function getSquareToQuad(x0, y0, x1, y1, x2, y2, x3, y3) {
    var dx1 = x1 - x2;
    var dy1 = y1 - y2;
    var dx2 = x3 - x2;
    var dy2 = y3 - y2;
    var dx3 = x0 - x1 + x2 - x3;
    var dy3 = y0 - y1 + y2 - y3;
    var det = dx1*dy2 - dx2*dy1;
    var a = (dx3*dy2 - dx2*dy3) / det;
    var b = (dx1*dy3 - dx3*dy1) / det;
    return [
        x1 - x0 + a*x1, y1 - y0 + a*y1, a,
        x3 - x0 + b*x3, y3 - y0 + b*y3, b,
        x0, y0, 1
    ];
}

function getInverse(m) {
    var a = m[0], b = m[1], c = m[2];
    var d = m[3], e = m[4], f = m[5];
    var g = m[6], h = m[7], i = m[8];
    var det = a*e*i - a*f*h - b*d*i + b*f*g + c*d*h - c*e*g;
    return [
        (e*i - f*h) / det, (c*h - b*i) / det, (b*f - c*e) / det,
        (f*g - d*i) / det, (a*i - c*g) / det, (c*d - a*f) / det,
        (d*h - e*g) / det, (b*g - a*h) / det, (a*e - b*d) / det
    ];
}

function multiply(a, b) {
    return [
        a[0]*b[0] + a[1]*b[3] + a[2]*b[6],
        a[0]*b[1] + a[1]*b[4] + a[2]*b[7],
        a[0]*b[2] + a[1]*b[5] + a[2]*b[8],
        a[3]*b[0] + a[4]*b[3] + a[5]*b[6],
        a[3]*b[1] + a[4]*b[4] + a[5]*b[7],
        a[3]*b[2] + a[4]*b[5] + a[5]*b[8],
        a[6]*b[0] + a[7]*b[3] + a[8]*b[6],
        a[6]*b[1] + a[7]*b[4] + a[8]*b[7],
        a[6]*b[2] + a[7]*b[5] + a[8]*b[8]
    ];
}

// src/core/shader.js
var Shader = (function() {
    function isArray(obj) {
        return Object.prototype.toString.call(obj) == '[object Array]';
    }

    function isNumber(obj) {
        return Object.prototype.toString.call(obj) == '[object Number]';
    }

    function compileSource(type, source) {
        var shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            throw 'compile error: ' + gl.getShaderInfoLog(shader);
        }
        return shader;
    }

    var defaultVertexSource = '\
    attribute vec2 vertex;\
    attribute vec2 _texCoord;\
    varying vec2 texCoord;\
    void main() {\
        texCoord = _texCoord;\
        gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);\
    }';

    var defaultFragmentSource = '\
    uniform sampler2D texture;\
    varying vec2 texCoord;\
    void main() {\
        gl_FragColor = texture2D(texture, texCoord);\
    }';

    function Shader(vertexSource, fragmentSource) {
        // Needed to restore contents if the WebGL context is lost
        // 
        // Context generation is needed because the webglcontextlost event is
        // fired after the context is lost, not before, leading to the following
        // sequence of events:
        // 
        // 1) Browser loses context
        // 2) Code uses glfx.js to render an effect
        // 3) We call gl.isShader(this.id) and it returns false
        // 4) We try to recreate the shader and fail
        // 5) We receive webglcontextlost (too late to be useful)
        // 
        // To avoid the failure above, we record the "generation" of the contex
        // that increases once every time it is restored and only attempt to
        // recreate the shader once per generation. This way we will wait until
        // we get a webglcontextrestored event before recreating the shader.
        this.contextGeneration = gl.generation;
        this.vertexSource = vertexSource;
        this.fragmentSource = fragmentSource;
        this.uniformValues = {};
        this.textureValues = {};

        this.uniformLocations = {};
        this.vertexAttribute = null;
        this.texCoordAttribute = null;
        this.program = gl.createProgram();
        vertexSource = vertexSource || defaultVertexSource;
        fragmentSource = fragmentSource || defaultFragmentSource;
        fragmentSource = 'precision highp float;' + fragmentSource; // annoying requirement is annoying
        gl.attachShader(this.program, compileSource(gl.VERTEX_SHADER, vertexSource));
        gl.attachShader(this.program, compileSource(gl.FRAGMENT_SHADER, fragmentSource));
        gl.linkProgram(this.program);
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            throw new Error('link error: ' + gl.getProgramInfoLog(this.program));
        }
    }

    Shader.prototype.recreateIfContextWasLost = function() {
        if (this.program && !gl.isProgram(this.program) && gl.generation > this.contextGeneration) {
            Shader.call(this, this.vertexSource, this.fragmentSource);
            this.uniforms(this.uniformValues);
            this.textures(this.textureValues);
            this.contextGeneration = gl.generation;
            log('recreated shader');
        }
    };

    Shader.prototype.destroy = function() {
        gl.deleteProgram(this.program);
        this.program = null;
    };

    Shader.prototype.uniforms = function(uniforms) {
        this.recreateIfContextWasLost();
        gl.useProgram(this.program);
        for (var name in uniforms) {
            if (!uniforms.hasOwnProperty(name)) continue;
            var location = this.uniformLocations[name] || (this.uniformLocations[name] = gl.getUniformLocation(this.program, name));
            if (location === null) continue; // will be null if the uniform isn't used in the shader
            var value = uniforms[name];
            if (isArray(value)) {
                switch (value.length) {
                    case 1: gl.uniform1fv(location, new Float32Array(value)); break;
                    case 2: gl.uniform2fv(location, new Float32Array(value)); break;
                    case 3: gl.uniform3fv(location, new Float32Array(value)); break;
                    case 4: gl.uniform4fv(location, new Float32Array(value)); break;
                    case 9: gl.uniformMatrix3fv(location, false, new Float32Array(value)); break;
                    case 16: gl.uniformMatrix4fv(location, false, new Float32Array(value)); break;
                    default: throw 'dont\'t know how to load uniform "' + name + '" of length ' + value.length;
                }
            } else if (isNumber(value)) {
                gl.uniform1f(location, value);
            } else {
                throw 'attempted to set uniform "' + name + '" to invalid value ' + (value || 'undefined').toString();
            }
            this.uniformValues[name] = value;
        }
        // allow chaining
        return this;
    };

    // textures are uniforms too but for some reason can't be specified by gl.uniform1f,
    // even though floating point numbers represent the integers 0 through 7 exactly
    Shader.prototype.textures = function(textures) {
        this.recreateIfContextWasLost();
        gl.useProgram(this.program);
        for (var name in textures) {
            if (!textures.hasOwnProperty(name)) continue;
            var location = this.uniformLocations[name] || (this.uniformLocations[name] = gl.getUniformLocation(this.program, name));
            if (location === null) continue; // will be null if the uniform isn't used in the shader
            var value = textures[name];
            gl.uniform1i(location, value);
            this.textureValues[name] = value;
        }
        // allow chaining
        return this;
    };

    Shader.prototype.drawRect = function(left, top, right, bottom, cropToRect) {
        this.recreateIfContextWasLost();
        var undefined;
        var viewport = gl.getParameter(gl.VIEWPORT);
        top = top !== undefined ? (top - viewport[1]) / viewport[3] : 0;
        left = left !== undefined ? (left - viewport[0]) / viewport[2] : 0;
        right = right !== undefined ? (right - viewport[0]) / viewport[2] : 1;
        bottom = bottom !== undefined ? (bottom - viewport[1]) / viewport[3] : 1;
        if (gl.vertexBuffer == null || !gl.isBuffer(gl.vertexBuffer)) {
            gl.vertexBuffer = gl.createBuffer();
        }
        var vertices = [ left, top, left, bottom, right, top, right, bottom ];
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        if (gl.texCoordBuffer == null || !gl.isBuffer(gl.texCoordBuffer)) {
            gl.texCoordBuffer = gl.createBuffer();
        }
        var coords = cropToRect ? vertices : [ 0, 0, 0, 1, 1, 0, 1, 1 ];
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
        if (this.vertexAttribute == null) {
            this.vertexAttribute = gl.getAttribLocation(this.program, 'vertex');
            gl.enableVertexAttribArray(this.vertexAttribute);
        }
        if (this.texCoordAttribute == null) {
            this.texCoordAttribute = gl.getAttribLocation(this.program, '_texCoord');
            gl.enableVertexAttribArray(this.texCoordAttribute);
        }
        gl.useProgram(this.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.vertexBuffer);
        gl.vertexAttribPointer(this.vertexAttribute, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
        gl.vertexAttribPointer(this.texCoordAttribute, 2, gl.FLOAT, false, 0, 0);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };

    Shader.getDefaultShader = function() {
        gl.defaultShader = gl.defaultShader || new Shader();
        return gl.defaultShader;
    };

    return Shader;
})();

// src/core/spline.js
// from SplineInterpolator.cs in the Paint.NET source code

function SplineInterpolator(points) {
    var n = points.length;
    this.xa = [];
    this.ya = [];
    this.u = [];
    this.y2 = [];

    points.sort(function(a, b) {
        return a[0] - b[0];
    });
    for (var i = 0; i < n; i++) {
        this.xa.push(points[i][0]);
        this.ya.push(points[i][1]);
    }

    this.u[0] = 0;
    this.y2[0] = 0;

    for (var i = 1; i < n - 1; ++i) {
        // This is the decomposition loop of the tridiagonal algorithm. 
        // y2 and u are used for temporary storage of the decomposed factors.
        var wx = this.xa[i + 1] - this.xa[i - 1];
        var sig = (this.xa[i] - this.xa[i - 1]) / wx;
        var p = sig * this.y2[i - 1] + 2.0;

        this.y2[i] = (sig - 1.0) / p;

        var ddydx = 
            (this.ya[i + 1] - this.ya[i]) / (this.xa[i + 1] - this.xa[i]) - 
            (this.ya[i] - this.ya[i - 1]) / (this.xa[i] - this.xa[i - 1]);

        this.u[i] = (6.0 * ddydx / wx - sig * this.u[i - 1]) / p;
    }

    this.y2[n - 1] = 0;

    // This is the backsubstitution loop of the tridiagonal algorithm
    for (var i = n - 2; i >= 0; --i) {
        this.y2[i] = this.y2[i] * this.y2[i + 1] + this.u[i];
    }
}

SplineInterpolator.prototype.interpolate = function(x) {
    var n = this.ya.length;
    var klo = 0;
    var khi = n - 1;

    // We will find the right place in the table by means of
    // bisection. This is optimal if sequential calls to this
    // routine are at random values of x. If sequential calls
    // are in order, and closely spaced, one would do better
    // to store previous values of klo and khi.
    while (khi - klo > 1) {
        var k = (khi + klo) >> 1;

        if (this.xa[k] > x) {
            khi = k; 
        } else {
            klo = k;
        }
    }

    var h = this.xa[khi] - this.xa[klo];
    var a = (this.xa[khi] - x) / h;
    var b = (x - this.xa[klo]) / h;

    // Cubic spline polynomial is now evaluated.
    return a * this.ya[klo] + b * this.ya[khi] + 
        ((a * a * a - a) * this.y2[klo] + (b * b * b - b) * this.y2[khi]) * (h * h) / 6.0;
};

// src/core/texture.js
var Texture = (function() {
    Texture.fromElement = function(element) {
        var texture = new Texture(0, 0, gl.RGBA, gl.UNSIGNED_BYTE);
        texture.loadContentsOf(element);
        return texture;
    };

    function Texture(width, height, format, type) {
        this.id = gl.createTexture();
        this.width = width;
        this.height = height;
        this.format = format;
        this.type = type;

        // Needed to restore contents if the WebGL context is lost. Note that
        // this only works for textures that were created from the CPU. Data
        // that was rendered on the GPU is unfortunately lost forever when the
        // WebGL context is lost.
        // 
        // Context generation is needed because the webglcontextlost event is
        // fired after the context is lost, not before, leading to the following
        // sequence of events:
        // 
        // 1) Browser loses context
        // 2) Code uses glfx.js to render an effect
        // 3) We call gl.isTexture(this.id) and it returns false
        // 4) We try to recreate the texture and fail
        // 5) We receive webglcontextlost (too late to be useful)
        // 
        // To avoid the failure above, we record the "generation" of the contex
        // that increases once every time it is restored and only attempt to
        // recreate the texture once per generation. This way we will wait until
        // we get a webglcontextrestored event before recreating the texture.
        this.contextGeneration = gl.generation;
        this.contents = null;

        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        if (width && height) gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
    }

    Texture.prototype.recreateIfContextWasLost = function() {
        if (this.id && !gl.isTexture(this.id) && gl.generation > this.contextGeneration) {
            var contents = this.contents;
            Texture.call(this, this.width, this.height, this.format, this.type);
            if (contents instanceof Node) this.loadContentsOf(contents);
            else if (contents) this.initFromBytes(this.width, this.height, contents);
            this.contents = contents;
            this.contextGeneration = gl.generation;
            function findWebGLEnum(value) {
                for (var name in gl) { if (gl[name] == value) return name; }
                return '???';
            }
            log('recreated texture { width: ' + this.width + ', height: ' + this.height +
                ', format: ' + findWebGLEnum(this.format) + ', type: ' + findWebGLEnum(this.type) +
                ', contents: ' + (contents === null ? 'null' : contents.constructor ? contents.constructor.name : '???') + ' }');
        }
    };

    Texture.prototype.loadContentsOf = function(element) {
        this.width = element.width || element.videoWidth;
        this.height = element.height || element.videoHeight;
        this.contents = element;
        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.texImage2D(gl.TEXTURE_2D, 0, this.format, this.format, this.type, element);
    };

    Texture.prototype.initFromBytes = function(width, height, data) {
        this.width = width;
        this.height = height;
        this.format = gl.RGBA;
        this.type = gl.UNSIGNED_BYTE;
        this.contents = data;
        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, this.type, new Uint8Array(data));
    };

    Texture.prototype.destroy = function() {
        gl.deleteTexture(this.id);
        this.id = null;
    };

    Texture.prototype.use = function(unit) {
        this.recreateIfContextWasLost();
        gl.activeTexture(gl.TEXTURE0 + (unit || 0));
        gl.bindTexture(gl.TEXTURE_2D, this.id);
    };

    Texture.prototype.unuse = function(unit) {
        gl.activeTexture(gl.TEXTURE0 + (unit || 0));
        gl.bindTexture(gl.TEXTURE_2D, null);
    };

    Texture.prototype.ensureFormat = function(width, height, format, type) {
        // allow passing an existing texture instead of individual arguments
        if (arguments.length == 1) {
            var texture = arguments[0];
            width = texture.width;
            height = texture.height;
            format = texture.format;
            type = texture.type;
        }

        // change the format only if required
        if (width != this.width || height != this.height || format != this.format || type != this.type) {
            this.width = width;
            this.height = height;
            this.format = format;
            this.type = type;
            this.contents = null;
            gl.bindTexture(gl.TEXTURE_2D, this.id);
            gl.texImage2D(gl.TEXTURE_2D, 0, this.format, width, height, 0, this.format, this.type, null);
        }
    };

    Texture.prototype.drawTo = function(callback) {
        // start rendering to this texture
        this.recreateIfContextWasLost();
        if (!gl.framebuffer || !gl.isFramebuffer(gl.framebuffer)) gl.framebuffer = gl.createFramebuffer();
        gl.bindFramebuffer(gl.FRAMEBUFFER, gl.framebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.id, 0);
        gl.viewport(0, 0, this.width, this.height);

        // do the drawing
        callback();

        // stop rendering to this texture
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        this.contents = null;
    };

    Texture.prototype.clear = function() {
        this.drawTo(function() {
            gl.clearColor(0, 0, 0, 0);
            gl.clear(gl.COLOR_BUFFER_BIT);
        });
    };

    var canvas = null;

    function getCanvas(texture) {
        if (canvas == null) canvas = document.createElement('canvas');
        canvas.width = texture.width;
        canvas.height = texture.height;
        var c = canvas.getContext('2d');
        c.clearRect(0, 0, canvas.width, canvas.height);
        return c;
    }

    Texture.prototype.fillUsingCanvas = function(callback) {
        callback(getCanvas(this));
        this.format = gl.RGBA;
        this.type = gl.UNSIGNED_BYTE;
        gl.bindTexture(gl.TEXTURE_2D, this.id);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
        this.contents = null;
        return this;
    };

    Texture.prototype.toImage = function(image) {
        this.use();
        Shader.getDefaultShader().drawRect();
        var size = this.width * this.height * 4;
        var pixels = new Uint8Array(size);
        var c = getCanvas(this);
        var data = c.createImageData(this.width, this.height);
        gl.readPixels(0, 0, this.width, this.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        for (var i = 0; i < size; i++) {
            data.data[i] = pixels[i];
        }
        c.putImageData(data, 0, 0);
        image.src = canvas.toDataURL();
    };

    Texture.prototype.swapWith = function(other) {
        var temp;
        temp = other.id; other.id = this.id; this.id = temp;
        temp = other.width; other.width = this.width; this.width = temp;
        temp = other.height; other.height = this.height; this.height = temp;
        temp = other.format; other.format = this.format; this.format = temp;
        temp = this.contents; other.contents = this.contents; this.contents = temp;
    };

    return Texture;
})();

// src/filters/adjust/brightnesscontrast.js
/**
 * @filter           Brightness / Contrast
 * @description      Provides additive brightness and multiplicative contrast control.
 * @param brightness -1 to 1 (-1 is solid black, 0 is no change, and 1 is solid white)
 * @param contrast   -1 to 1 (-1 is solid gray, 0 is no change, and 1 is maximum contrast)
 */
function brightnessContrast(brightness, contrast) {
    gl.brightnessContrast = gl.brightnessContrast || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float brightness;\
        uniform float contrast;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            color.rgb += brightness;\
            if (contrast > 0.0) {\
                color.rgb = (color.rgb - 0.5) / (1.0 - contrast) + 0.5;\
            } else {\
                color.rgb = (color.rgb - 0.5) * (1.0 + contrast) + 0.5;\
            }\
            gl_FragColor = color;\
        }\
    ');

    simpleShader.call(this, gl.brightnessContrast, {
        brightness: clamp(-1, brightness, 1),
        contrast: clamp(-1, contrast, 1)
    });

    return this;
}

// src/filters/adjust/curves.js
function splineInterpolate(points) {
    var interpolator = new SplineInterpolator(points);
    var array = [];
    for (var i = 0; i < 256; i++) {
        array.push(clamp(0, Math.floor(interpolator.interpolate(i / 255) * 256), 255));
    }
    return array;
}

/**
 * @filter      Curves
 * @description A powerful mapping tool that transforms the colors in the image
 *              by an arbitrary function. The function is interpolated between
 *              a set of 2D points using splines. The curves filter can take
 *              either one or three arguments which will apply the mapping to
 *              either luminance or RGB values, respectively.
 * @param red   A list of points that define the function for the red channel.
 *              Each point is a list of two values: the value before the mapping
 *              and the value after the mapping, both in the range 0 to 1. For
 *              example, [[0,1], [1,0]] would invert the red channel while
 *              [[0,0], [1,1]] would leave the red channel unchanged. If green
 *              and blue are omitted then this argument also applies to the
 *              green and blue channels.
 * @param green (optional) A list of points that define the function for the green
 *              channel (just like for red).
 * @param blue  (optional) A list of points that define the function for the blue
 *              channel (just like for red).
 */
function curves(red, green, blue) {
    // Create the ramp texture
    red = splineInterpolate(red);
    if (arguments.length == 1) {
        green = blue = red;
    } else {
        green = splineInterpolate(green);
        blue = splineInterpolate(blue);
    }
    var array = [];
    for (var i = 0; i < 256; i++) {
        array.splice(array.length, 0, red[i], green[i], blue[i], 255);
    }
    this._.extraTexture.initFromBytes(256, 1, array);
    this._.extraTexture.use(1);

    gl.curves = gl.curves || new Shader(null, '\
        uniform sampler2D texture;\
        uniform sampler2D map;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            color.r = texture2D(map, vec2(color.r)).r;\
            color.g = texture2D(map, vec2(color.g)).g;\
            color.b = texture2D(map, vec2(color.b)).b;\
            gl_FragColor = color;\
        }\
    ');

    gl.curves.textures({
        map: 1
    });
    simpleShader.call(this, gl.curves, {});

    return this;
}

// src/filters/adjust/denoise.js
/**
 * @filter         Denoise
 * @description    Smooths over grainy noise in dark images using an 9x9 box filter
 *                 weighted by color intensity, similar to a bilateral filter.
 * @param exponent The exponent of the color intensity difference, should be greater
 *                 than zero. A value of zero just gives an 9x9 box blur and high values
 *                 give the original image, but ideal values are usually around 10-20.
 */
function denoise(exponent) {
    // Do a 9x9 bilateral box filter
    gl.denoise = gl.denoise || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float exponent;\
        uniform float strength;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec4 center = texture2D(texture, texCoord);\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            for (float x = -4.0; x <= 4.0; x += 1.0) {\
                for (float y = -4.0; y <= 4.0; y += 1.0) {\
                    vec4 sample = texture2D(texture, texCoord + vec2(x, y) / texSize);\
                    float weight = 1.0 - abs(dot(sample.rgb - center.rgb, vec3(0.25)));\
                    weight = pow(weight, exponent);\
                    color += sample * weight;\
                    total += weight;\
                }\
            }\
            gl_FragColor = color / total;\
        }\
    ');

    // Perform two iterations for stronger results
    for (var i = 0; i < 2; i++) {
        simpleShader.call(this, gl.denoise, {
            exponent: Math.max(0, exponent),
            texSize: [this.width, this.height]
        });
    }

    return this;
}

// src/filters/adjust/huesaturation.js
/**
 * @filter           Hue / Saturation
 * @description      Provides rotational hue and multiplicative saturation control. RGB color space
 *                   can be imagined as a cube where the axes are the red, green, and blue color
 *                   values. Hue changing works by rotating the color vector around the grayscale
 *                   line, which is the straight line from black (0, 0, 0) to white (1, 1, 1).
 *                   Saturation is implemented by scaling all color channel values either toward
 *                   or away from the average color channel value.
 * @param hue        -1 to 1 (-1 is 180 degree rotation in the negative direction, 0 is no change,
 *                   and 1 is 180 degree rotation in the positive direction)
 * @param saturation -1 to 1 (-1 is solid gray, 0 is no change, and 1 is maximum contrast)
 */
function hueSaturation(hue, saturation) {
    gl.hueSaturation = gl.hueSaturation || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float hue;\
        uniform float saturation;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            \
            /* hue adjustment, wolfram alpha: RotationTransform[angle, {1, 1, 1}][{x, y, z}] */\
            float angle = hue * 3.14159265;\
            float s = sin(angle), c = cos(angle);\
            vec3 weights = (vec3(2.0 * c, -sqrt(3.0) * s - c, sqrt(3.0) * s - c) + 1.0) / 3.0;\
            float len = length(color.rgb);\
            color.rgb = vec3(\
                dot(color.rgb, weights.xyz),\
                dot(color.rgb, weights.zxy),\
                dot(color.rgb, weights.yzx)\
            );\
            \
            /* saturation adjustment */\
            float average = (color.r + color.g + color.b) / 3.0;\
            if (saturation > 0.0) {\
                color.rgb += (average - color.rgb) * (1.0 - 1.0 / (1.001 - saturation));\
            } else {\
                color.rgb += (average - color.rgb) * (-saturation);\
            }\
            \
            gl_FragColor = color;\
        }\
    ');

    simpleShader.call(this, gl.hueSaturation, {
        hue: clamp(-1, hue, 1),
        saturation: clamp(-1, saturation, 1)
    });

    return this;
}

// src/filters/adjust/noise.js
/**
 * @filter         Noise
 * @description    Adds black and white noise to the image.
 * @param amount   0 to 1 (0 for no effect, 1 for maximum noise)
 */
function noise(amount) {
    gl.noise = gl.noise || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float amount;\
        varying vec2 texCoord;\
        float rand(vec2 co) {\
            return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);\
        }\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            \
            float diff = (rand(texCoord) - 0.5) * amount;\
            color.r += diff;\
            color.g += diff;\
            color.b += diff;\
            \
            gl_FragColor = color;\
        }\
    ');

    simpleShader.call(this, gl.noise, {
        amount: clamp(0, amount, 1)
    });

    return this;
}

// src/filters/adjust/sepia.js
/**
 * @filter         Sepia
 * @description    Gives the image a reddish-brown monochrome tint that imitates an old photograph.
 * @param amount   0 to 1 (0 for no effect, 1 for full sepia coloring)
 */
function sepia(amount) {
    gl.sepia = gl.sepia || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float amount;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            float r = color.r;\
            float g = color.g;\
            float b = color.b;\
            \
            color.r = min(1.0, (r * (1.0 - (0.607 * amount))) + (g * (0.769 * amount)) + (b * (0.189 * amount)));\
            color.g = min(1.0, (r * 0.349 * amount) + (g * (1.0 - (0.314 * amount))) + (b * 0.168 * amount));\
            color.b = min(1.0, (r * 0.272 * amount) + (g * 0.534 * amount) + (b * (1.0 - (0.869 * amount))));\
            \
            gl_FragColor = color;\
        }\
    ');

    simpleShader.call(this, gl.sepia, {
        amount: clamp(0, amount, 1)
    });

    return this;
}

// src/filters/adjust/unsharpmask.js
/**
 * @filter         Unsharp Mask
 * @description    A form of image sharpening that amplifies high-frequencies in the image. It
 *                 is implemented by scaling pixels away from the average of their neighbors.
 * @param radius   The blur radius that calculates the average of the neighboring pixels.
 * @param strength A scale factor where 0 is no effect and higher values cause a stronger effect.
 */
function unsharpMask(radius, strength) {
    gl.unsharpMask = gl.unsharpMask || new Shader(null, '\
        uniform sampler2D blurredTexture;\
        uniform sampler2D originalTexture;\
        uniform float strength;\
        uniform float threshold;\
        varying vec2 texCoord;\
        void main() {\
            vec4 blurred = texture2D(blurredTexture, texCoord);\
            vec4 original = texture2D(originalTexture, texCoord);\
            gl_FragColor = mix(blurred, original, 1.0 + strength);\
        }\
    ');

    // Store a copy of the current texture in the second texture unit
    this._.extraTexture.ensureFormat(this._.texture);
    this._.texture.use();
    this._.extraTexture.drawTo(function() {
        Shader.getDefaultShader().drawRect();
    });

    // Blur the current texture, then use the stored texture to detect edges
    this._.extraTexture.use(1);
    this.triangleBlur(radius);
    gl.unsharpMask.textures({
        originalTexture: 1
    });
    simpleShader.call(this, gl.unsharpMask, {
        strength: strength
    });
    this._.extraTexture.unuse(1);

    return this;
}

// src/filters/adjust/vibrance.js
/**
 * @filter       Vibrance
 * @description  Modifies the saturation of desaturated colors, leaving saturated colors unmodified.
 * @param amount -1 to 1 (-1 is minimum vibrance, 0 is no change, and 1 is maximum vibrance)
 */
function vibrance(amount) {
    gl.vibrance = gl.vibrance || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float amount;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            float average = (color.r + color.g + color.b) / 3.0;\
            float mx = max(color.r, max(color.g, color.b));\
            float amt = (mx - average) * (-amount * 3.0);\
            color.rgb = mix(color.rgb, vec3(mx), amt);\
            gl_FragColor = color;\
        }\
    ');

    simpleShader.call(this, gl.vibrance, {
        amount: clamp(-1, amount, 1)
    });

    return this;
}

// src/filters/adjust/vignette.js
/**
 * @filter         Vignette
 * @description    Adds a simulated lens edge darkening effect.
 * @param size     0 to 1 (0 for center of frame, 1 for edge of frame)
 * @param amount   0 to 1 (0 for no effect, 1 for maximum lens darkening)
 */
function vignette(size, amount) {
    gl.vignette = gl.vignette || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float size;\
        uniform float amount;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            \
            float dist = distance(texCoord, vec2(0.5, 0.5));\
            color.rgb *= smoothstep(0.8, size * 0.799, dist * (amount + size));\
            \
            gl_FragColor = color;\
        }\
    ');

    simpleShader.call(this, gl.vignette, {
        size: clamp(0, size, 1),
        amount: clamp(0, amount, 1)
    });

    return this;
}

// src/filters/blur/lensblur.js
/**
 * @filter           Lens Blur
 * @description      Imitates a camera capturing the image out of focus by using a blur that generates
 *                   the large shapes known as bokeh. The polygonal shape of real bokeh is due to the
 *                   blades of the aperture diaphragm when it isn't fully open. This blur renders
 *                   bokeh from a 6-bladed diaphragm because the computation is more efficient. It
 *                   can be separated into three rhombi, each of which is just a skewed box blur.
 *                   This filter makes use of the floating point texture WebGL extension to implement
 *                   the brightness parameter, so there will be severe visual artifacts if brightness
 *                   is non-zero and the floating point texture extension is not available. The
 *                   idea was from John White's SIGGRAPH 2011 talk but this effect has an additional
 *                   brightness parameter that fakes what would otherwise come from a HDR source.
 * @param radius     the radius of the hexagonal disk convolved with the image
 * @param brightness -1 to 1 (the brightness of the bokeh, negative values will create dark bokeh)
 * @param angle      the rotation of the bokeh in radians
 */
function lensBlur(radius, brightness, angle) {
    // All averaging is done on values raised to a power to make more obvious bokeh
    // (we will raise the average to the inverse power at the end to compensate).
    // Without this the image looks almost like a normal blurred image. This hack is
    // obviously not realistic, but to accurately simulate this we would need a high
    // dynamic range source photograph which we don't have.
    gl.lensBlurPrePass = gl.lensBlurPrePass || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float power;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            color = pow(color, vec4(power));\
            gl_FragColor = vec4(color);\
        }\
    ');

    var common = '\
        uniform sampler2D texture0;\
        uniform sampler2D texture1;\
        uniform vec2 delta0;\
        uniform vec2 delta1;\
        uniform float power;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        vec4 sample(vec2 delta) {\
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(delta, 151.7182), 0.0);\
            \
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            for (float t = 0.0; t <= 30.0; t++) {\
                float percent = (t + offset) / 30.0;\
                color += texture2D(texture0, texCoord + delta * percent);\
                total += 1.0;\
            }\
            return color / total;\
        }\
    ';

    gl.lensBlur0 = gl.lensBlur0 || new Shader(null, common + '\
        void main() {\
            gl_FragColor = sample(delta0);\
        }\
    ');
    gl.lensBlur1 = gl.lensBlur1 || new Shader(null, common + '\
        void main() {\
            gl_FragColor = (sample(delta0) + sample(delta1)) * 0.5;\
        }\
    ');
    gl.lensBlur2 = gl.lensBlur2 || new Shader(null, common + '\
        void main() {\
            vec4 color = (sample(delta0) + 2.0 * texture2D(texture1, texCoord)) / 3.0;\
            gl_FragColor = pow(color, vec4(power));\
        }\
    ').textures({ texture1: 1 });

    // Generate
    var dir = [];
    for (var i = 0; i < 3; i++) {
        var a = angle + i * Math.PI * 2 / 3;
        dir.push([radius * Math.sin(a) / this.width, radius * Math.cos(a) / this.height]);
    }
    var power = Math.pow(10, clamp(-1, brightness, 1));

    // Remap the texture values, which will help make the bokeh effect
    simpleShader.call(this, gl.lensBlurPrePass, {
        power: power
    });

    // Blur two rhombi in parallel into extraTexture
    this._.extraTexture.ensureFormat(this._.texture);
    simpleShader.call(this, gl.lensBlur0, {
        delta0: dir[0]
    }, this._.texture, this._.extraTexture);
    simpleShader.call(this, gl.lensBlur1, {
        delta0: dir[1],
        delta1: dir[2]
    }, this._.extraTexture, this._.extraTexture);

    // Blur the last rhombus and combine with extraTexture
    simpleShader.call(this, gl.lensBlur0, {
        delta0: dir[1]
    });
    this._.extraTexture.use(1);
    simpleShader.call(this, gl.lensBlur2, {
        power: 1 / power,
        delta0: dir[2]
    });

    return this;
}

// src/filters/blur/pixelate.js
/**
 * @filter        Pixelate
 * @description   Renders the image at a lower resolution using square tiles. Tile colors
 *                are nearest-neighbor sampled from the centers of the tiles.
 * @param centerX The x coordinate of the pattern center.
 * @param centerY The y coordinate of the pattern center.
 * @param scale   The width of an individual tile, in pixels.
 */
function pixelate(centerX, centerY, scale) {
    gl.pixelate = gl.pixelate || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
        uniform float scale;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec2 tex = (texCoord * texSize - center) / scale;\
            vec2 choice = floor(tex) + 0.5;\
            choice *= scale / texSize;\
            gl_FragColor = texture2D(texture, choice + center / texSize);\
        }\
    ');

    simpleShader.call(this, gl.pixelate, {
        center: [centerX, centerY],
        scale: scale,
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/blur/tiltshift.js
/**
 * @filter               Tilt Shift
 * @description          Simulates the shallow depth of field normally encountered in close-up
 *                       photography, which makes the scene seem much smaller than it actually
 *                       is. This filter assumes the scene is relatively planar, in which case
 *                       the part of the scene that is completely in focus can be described by
 *                       a line (the intersection of the focal plane and the scene). An example
 *                       of a planar scene might be looking at a road from above at a downward
 *                       angle. The image is then blurred with a blur radius that starts at zero
 *                       on the line and increases further from the line.
 * @param startX         The x coordinate of the start of the line segment.
 * @param startY         The y coordinate of the start of the line segment.
 * @param endX           The x coordinate of the end of the line segment.
 * @param endY           The y coordinate of the end of the line segment.
 * @param blurRadius     The maximum radius of the pyramid blur.
 * @param gradientRadius The distance from the line at which the maximum blur radius is reached.
 */
function tiltShift(startX, startY, endX, endY, blurRadius, gradientRadius) {
    gl.tiltShift = gl.tiltShift || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float blurRadius;\
        uniform float gradientRadius;\
        uniform vec2 start;\
        uniform vec2 end;\
        uniform vec2 delta;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        void main() {\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            vec2 normal = normalize(vec2(start.y - end.y, end.x - start.x));\
            float radius = smoothstep(0.0, 1.0, abs(dot(texCoord * texSize - start, normal)) / gradientRadius) * blurRadius;\
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                vec4 sample = texture2D(texture, texCoord + delta / texSize * percent * radius);\
                \
                /* switch to pre-multiplied alpha to correctly blur transparent images */\
                sample.rgb *= sample.a;\
                \
                color += sample * weight;\
                total += weight;\
            }\
            \
            gl_FragColor = color / total;\
            \
            /* switch back from pre-multiplied alpha */\
            gl_FragColor.rgb /= gl_FragColor.a + 0.00001;\
        }\
    ');

    var dx = endX - startX;
    var dy = endY - startY;
    var d = Math.sqrt(dx * dx + dy * dy);
    simpleShader.call(this, gl.tiltShift, {
        blurRadius: blurRadius,
        gradientRadius: gradientRadius,
        start: [startX, startY],
        end: [endX, endY],
        delta: [dx / d, dy / d],
        texSize: [this.width, this.height]
    });
    simpleShader.call(this, gl.tiltShift, {
        blurRadius: blurRadius,
        gradientRadius: gradientRadius,
        start: [startX, startY],
        end: [endX, endY],
        delta: [-dy / d, dx / d],
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/blur/triangleblur.js
/**
 * @filter       Triangle Blur
 * @description  This is the most basic blur filter, which convolves the image with a
 *               pyramid filter. The pyramid filter is separable and is applied as two
 *               perpendicular triangle filters.
 * @param radius The radius of the pyramid convolved with the image.
 */
function triangleBlur(radius) {
    gl.triangleBlur = gl.triangleBlur || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        void main() {\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                vec4 sample = texture2D(texture, texCoord + delta * percent);\
                \
                /* switch to pre-multiplied alpha to correctly blur transparent images */\
                sample.rgb *= sample.a;\
                \
                color += sample * weight;\
                total += weight;\
            }\
            \
            gl_FragColor = color / total;\
            \
            /* switch back from pre-multiplied alpha */\
            gl_FragColor.rgb /= gl_FragColor.a + 0.00001;\
        }\
    ');

    simpleShader.call(this, gl.triangleBlur, {
        delta: [radius / this.width, 0]
    });
    simpleShader.call(this, gl.triangleBlur, {
        delta: [0, radius / this.height]
    });

    return this;
}

// src/filters/blur/zoomblur.js
/**
 * @filter          Zoom Blur
 * @description     Blurs the image away from a certain point, which looks like radial motion blur.
 * @param centerX   The x coordinate of the blur origin.
 * @param centerY   The y coordinate of the blur origin.
 * @param strength  The strength of the blur. Values in the range 0 to 1 are usually sufficient,
 *                  where 0 doesn't change the image and 1 creates a highly blurred image.
 * @param minRadius The radius inside which this filter has no effect.
 */
function zoomBlur(centerX, centerY, strength, minRadius) {
    gl.zoomBlur = gl.zoomBlur || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
        uniform float minRadius;\
        uniform float strength;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        void main() {\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            vec2 toCenter = center - texCoord * texSize;\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = 0.0; t <= 40.0; t++) {\
                float percent = (t + offset) / 40.0;\
                float weight = percent - percent * percent;\
                percent *= 1.0 - 1.0 / (1.0 + 0.5 * (max(length(toCenter), minRadius) - minRadius) / (minRadius + 0.00001));\
                vec4 sample = texture2D(texture, texCoord + toCenter * percent * strength / texSize);\
                \
                /* switch to pre-multiplied alpha to correctly blur transparent images */\
                sample.rgb *= sample.a;\
                \
                color += sample * weight;\
                total += weight;\
            }\
            \
            gl_FragColor = color / total;\
            \
            /* switch back from pre-multiplied alpha */\
            gl_FragColor.rgb /= gl_FragColor.a + 0.00001;\
        }\
    ');

    simpleShader.call(this, gl.zoomBlur, {
        center: [centerX, centerY],
        minRadius: minRadius,
        strength: strength,
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/fun/colorhalftone.js
/**
 * @filter        Color Halftone
 * @description   Simulates a CMYK halftone rendering of the image by multiplying pixel values
 *                with a four rotated 2D sine wave patterns, one each for cyan, magenta, yellow,
 *                and black.
 * @param centerX The x coordinate of the pattern origin.
 * @param centerY The y coordinate of the pattern origin.
 * @param angle   The rotation of the pattern in radians.
 * @param size    The diameter of a dot in pixels.
 */
function colorHalftone(centerX, centerY, angle, size) {
    gl.colorHalftone = gl.colorHalftone || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
        uniform float angle;\
        uniform float scale;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        \
        float pattern(float angle) {\
            float s = sin(angle), c = cos(angle);\
            vec2 tex = texCoord * texSize - center;\
            vec2 point = vec2(\
                c * tex.x - s * tex.y,\
                s * tex.x + c * tex.y\
            ) * scale;\
            return (sin(point.x) * sin(point.y)) * 4.0;\
        }\
        \
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            vec3 cmy = 1.0 - color.rgb;\
            float k = min(cmy.x, min(cmy.y, cmy.z));\
            cmy = (cmy - k) / (1.0 - k);\
            cmy = clamp(cmy * 10.0 - 3.0 + vec3(pattern(angle + 0.26179), pattern(angle + 1.30899), pattern(angle)), 0.0, 1.0);\
            k = clamp(k * 10.0 - 5.0 + pattern(angle + 0.78539), 0.0, 1.0);\
            gl_FragColor = vec4(1.0 - cmy - k, color.a);\
        }\
    ');

    simpleShader.call(this, gl.colorHalftone, {
        center: [centerX, centerY],
        angle: angle,
        scale: Math.PI / size,
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/fun/dotscreen.js
/**
 * @filter        Dot Screen
 * @description   Simulates a black and white halftone rendering of the image by multiplying
 *                pixel values with a rotated 2D sine wave pattern.
 * @param centerX The x coordinate of the pattern origin.
 * @param centerY The y coordinate of the pattern origin.
 * @param angle   The rotation of the pattern in radians.
 * @param size    The diameter of a dot in pixels.
 */
function dotScreen(centerX, centerY, angle, size) {
    gl.dotScreen = gl.dotScreen || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
        uniform float angle;\
        uniform float scale;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        \
        float pattern() {\
            float s = sin(angle), c = cos(angle);\
            vec2 tex = texCoord * texSize - center;\
            vec2 point = vec2(\
                c * tex.x - s * tex.y,\
                s * tex.x + c * tex.y\
            ) * scale;\
            return (sin(point.x) * sin(point.y)) * 4.0;\
        }\
        \
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            float average = (color.r + color.g + color.b) / 3.0;\
            gl_FragColor = vec4(vec3(average * 10.0 - 5.0 + pattern()), color.a);\
        }\
    ');

    simpleShader.call(this, gl.dotScreen, {
        center: [centerX, centerY],
        angle: angle,
        scale: Math.PI / size,
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/fun/edgework.js
/**
 * @filter       Edge Work
 * @description  Picks out different frequencies in the image by subtracting two
 *               copies of the image blurred with different radii.
 * @param radius The radius of the effect in pixels.
 */
function edgeWork(radius) {
    gl.edgeWork1 = gl.edgeWork1 || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        void main() {\
            vec2 color = vec2(0.0);\
            vec2 total = vec2(0.0);\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                vec3 sample = texture2D(texture, texCoord + delta * percent).rgb;\
                float average = (sample.r + sample.g + sample.b) / 3.0;\
                color.x += average * weight;\
                total.x += weight;\
                if (abs(t) < 15.0) {\
                    weight = weight * 2.0 - 1.0;\
                    color.y += average * weight;\
                    total.y += weight;\
                }\
            }\
            gl_FragColor = vec4(color / total, 0.0, 1.0);\
        }\
    ');
    gl.edgeWork2 = gl.edgeWork2 || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        void main() {\
            vec2 color = vec2(0.0);\
            vec2 total = vec2(0.0);\
            \
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            for (float t = -30.0; t <= 30.0; t++) {\
                float percent = (t + offset - 0.5) / 30.0;\
                float weight = 1.0 - abs(percent);\
                vec2 sample = texture2D(texture, texCoord + delta * percent).xy;\
                color.x += sample.x * weight;\
                total.x += weight;\
                if (abs(t) < 15.0) {\
                    weight = weight * 2.0 - 1.0;\
                    color.y += sample.y * weight;\
                    total.y += weight;\
                }\
            }\
            float c = clamp(10000.0 * (color.y / total.y - color.x / total.x) + 0.5, 0.0, 1.0);\
            gl_FragColor = vec4(c, c, c, 1.0);\
        }\
    ');

    simpleShader.call(this, gl.edgeWork1, {
        delta: [radius / this.width, 0]
    });
    simpleShader.call(this, gl.edgeWork2, {
        delta: [0, radius / this.height]
    });

    return this;
}

// src/filters/fun/hexagonalpixelate.js
/**
 * @filter        Hexagonal Pixelate
 * @description   Renders the image using a pattern of hexagonal tiles. Tile colors
 *                are nearest-neighbor sampled from the centers of the tiles.
 * @param centerX The x coordinate of the pattern center.
 * @param centerY The y coordinate of the pattern center.
 * @param scale   The width of an individual tile, in pixels.
 */
function hexagonalPixelate(centerX, centerY, scale) {
    gl.hexagonalPixelate = gl.hexagonalPixelate || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
        uniform float scale;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec2 tex = (texCoord * texSize - center) / scale;\
            tex.y /= 0.866025404;\
            tex.x -= tex.y * 0.5;\
            \
            vec2 a;\
            if (tex.x + tex.y - floor(tex.x) - floor(tex.y) < 1.0) a = vec2(floor(tex.x), floor(tex.y));\
            else a = vec2(ceil(tex.x), ceil(tex.y));\
            vec2 b = vec2(ceil(tex.x), floor(tex.y));\
            vec2 c = vec2(floor(tex.x), ceil(tex.y));\
            \
            vec3 TEX = vec3(tex.x, tex.y, 1.0 - tex.x - tex.y);\
            vec3 A = vec3(a.x, a.y, 1.0 - a.x - a.y);\
            vec3 B = vec3(b.x, b.y, 1.0 - b.x - b.y);\
            vec3 C = vec3(c.x, c.y, 1.0 - c.x - c.y);\
            \
            float alen = length(TEX - A);\
            float blen = length(TEX - B);\
            float clen = length(TEX - C);\
            \
            vec2 choice;\
            if (alen < blen) {\
                if (alen < clen) choice = a;\
                else choice = c;\
            } else {\
                if (blen < clen) choice = b;\
                else choice = c;\
            }\
            \
            choice.x += choice.y * 0.5;\
            choice.y *= 0.866025404;\
            choice *= scale / texSize;\
            gl_FragColor = texture2D(texture, choice + center / texSize);\
        }\
    ');

    simpleShader.call(this, gl.hexagonalPixelate, {
        center: [centerX, centerY],
        scale: scale,
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/fun/hopeposter.js
/**
 * @filter           Hope Poster
 * @description      Posterize the image using the colors in the famous Obama "hope" poster.
 */
function hopePoster(centerX, centerY, angle, radius, isInfinite) {
    gl.hopePoster = gl.hopePoster || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        \
        void main() {\
            vec2 dx = vec2(1.0 / texSize.x, 0.0);\
            vec2 dy = vec2(0.0, 1.0 / texSize.y);\
            vec4 color = texture2D(texture, texCoord);\
            float bigTotal = 0.0;\
            float smallTotal = 0.0;\
            vec3 bigAverage = vec3(0.0);\
            vec3 smallAverage = vec3(0.0);\
            for (float x = -2.0; x <= 2.0; x += 1.0) {\
                for (float y = -2.0; y <= 2.0; y += 1.0) {\
                    vec3 sample = texture2D(texture, texCoord + dx * x + dy * y).rgb;\
                    bigAverage += sample;\
                    bigTotal += 1.0;\
                    if (abs(x) + abs(y) < 2.0) {\
                        smallAverage += sample;\
                        smallTotal += 1.0;\
                    }\
                }\
            }\
            vec3 edges = max(vec3(0.0), bigAverage / bigTotal - smallAverage / smallTotal);\
            float edge = dot(edges, edges) * 10000.0;\
            edge = edge * 100.0 - 50.0;\
            \
            float gray = (color.r + color.g + color.b) / 3.0;\
            if (gray < 0.3 || edge > 0.5) color.rgb = vec3(0.0, 0.2, 0.3);\
            else if (gray < 0.35) color.rgb = vec3(0.85, 0.1, 0.13);\
            else if (gray < 0.5 || gray < 0.55 && fract(gl_FragCoord.y * 0.5) < 0.5) color.rgb = vec3(0.45, 0.59, 0.62);\
            else color.rgb = vec3(0.98, 0.9, 0.64);\
            \
            gl_FragColor = color;\
        }\
    ');

    triangleBlur.call(this, 3);
    simpleShader.call(this, gl.hopePoster, {
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/fun/ink.js
/**
 * @filter         Ink
 * @description    Simulates outlining the image in ink by darkening edges stronger than a
 *                 certain threshold. The edge detection value is the difference of two
 *                 copies of the image, each blurred using a blur of a different radius.
 * @param strength The multiplicative scale of the ink edges. Values in the range 0 to 1
 *                 are usually sufficient, where 0 doesn't change the image and 1 adds lots
 *                 of black edges. Negative strength values will create white ink edges
 *                 instead of black ones.
 */
function ink(strength) {
    gl.ink = gl.ink || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float strength;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec2 dx = vec2(1.0 / texSize.x, 0.0);\
            vec2 dy = vec2(0.0, 1.0 / texSize.y);\
            vec4 color = texture2D(texture, texCoord);\
            float bigTotal = 0.0;\
            float smallTotal = 0.0;\
            vec3 bigAverage = vec3(0.0);\
            vec3 smallAverage = vec3(0.0);\
            for (float x = -2.0; x <= 2.0; x += 1.0) {\
                for (float y = -2.0; y <= 2.0; y += 1.0) {\
                    vec3 sample = texture2D(texture, texCoord + dx * x + dy * y).rgb;\
                    bigAverage += sample;\
                    bigTotal += 1.0;\
                    if (abs(x) + abs(y) < 2.0) {\
                        smallAverage += sample;\
                        smallTotal += 1.0;\
                    }\
                }\
            }\
            vec3 edge = max(vec3(0.0), bigAverage / bigTotal - smallAverage / smallTotal);\
            gl_FragColor = vec4(clamp(color.rgb - dot(edge, edge) * strength * 100000.0, 0.0, 1.0), color.a);\
        }\
    ');

    simpleShader.call(this, gl.ink, {
        strength: strength * strength * strength * strength * strength,
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/fun/invert.js
/**
 * @filter         Invert
 * @description    Inverts all color channels.
 */
function invert() {
    gl.invert = gl.invert || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            gl_FragColor = vec4(1.0 - color.rgb, color.a);\
        }\
    ');

    simpleShader.call(this, gl.invert);

    return this;
}

// src/filters/other/blend.js
/**
 * @filter        Blend
 * @description   Linearly interpolates between the current texture and the
 *                provided texture.
 * @param texture The other texture to blend with.
 * @param alpha   Specifies how much of each image to include. 0 means none of
 *                the provided texture and 1 means all of the provided texture.
 */
function blend(texture, alpha) {
    gl.blend = gl.blend || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float alpha;\
        varying vec2 texCoord;\
        void main() {\
            gl_FragColor = texture2D(texture, texCoord) * vec4(vec3(1.0), alpha);\
        }\
    ');

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
    simpleShader.call(this, gl.blend, { alpha: alpha }, texture._ || texture);
    gl.disable(gl.BLEND);

    return this;
}

// src/filters/other/common.js
function warpShader(uniforms, warp) {
    return new Shader(null, uniforms + '\
    uniform sampler2D texture;\
    uniform vec2 texSize;\
    varying vec2 texCoord;\
    void main() {\
        vec2 coord = texCoord * texSize;\
        ' + warp + '\
        gl_FragColor = texture2D(texture, coord / texSize);\
        vec2 clampedCoord = clamp(coord, vec2(0.0), texSize);\
        if (coord != clampedCoord) {\
            /* fade to transparent if we are outside the image */\
            gl_FragColor.a *= max(0.0, 1.0 - length(coord - clampedCoord));\
        }\
    }');
}

// returns a random number between 0 and 1
var randomShaderFunc = '\
    float random(vec3 scale, float seed) {\
        /* use the fragment position for a different seed per-pixel */\
        return fract(sin(dot(gl_FragCoord.xyz + seed, scale)) * 43758.5453 + seed);\
    }\
';

// src/filters/other/stamp.js
/**
 * @filter          Stamp
 * @description     Stamps an image on top of the current canvas contents in
 *                  potentially multiple positions. This call renders a batch
 *                  of sprites in a single call instead of only one stamp for
 *                  performance reasons.
 * @param positions An array of arrays where each inner array represents one
 *                  stamp and has the format [centerX, centerY, scaleX, scaleY,
 *                  rotation, alpha]. The rotation is in radians and the
 *                  alpha is from 0 to 1.
 * @param texture   A texture containing the image to be stamped.
 */
function stamp(positions, texture) {
    if (positions.length == 0) return;

    gl.stamp = gl.stamp || new Shader('\
        attribute vec2 vertex;\
        attribute vec3 _texCoord;\
        varying vec3 texCoord;\
        void main() {\
            texCoord = _texCoord;\
            gl_Position = vec4(vertex * 2.0 - 1.0, 0.0, 1.0);\
        }\
    ', '\
        uniform sampler2D texture;\
        uniform vec2 texSize;\
        varying vec3 texCoord;\
        void main() {\
            gl_FragColor = texture2D(texture, texCoord.xy) * vec4(vec3(1.0), texCoord.z);\
        }\
    ');

    var canvas = this;
    texture = texture._ || texture;
    gl.stamp.uniforms({ texSize: [this.width, this.height] });
    this._.spareTexture.drawTo(function() {
        // Copy the current texture into spareTexture first
        canvas._.texture.use();
        Shader.getDefaultShader().drawRect();

        // Generate the geometry
        var vertices = [], coords = [], indices = [];
        var w = texture.width, h = texture.height;
        for (var i = 0; i < positions.length; i++) {
            var pos = positions[i];
            if (pos.length != 6) throw new Error('each stamp must be [centerX, centerY, scaleX, scaleY, rotation, alpha]');
            var centerX = pos[0], centerY = pos[1], scaleX = pos[2], scaleY = pos[3], rotation = pos[4], alpha = pos[5];
            var s = Math.sin(rotation), c = Math.cos(rotation);
            for (var j = 0; j < 4; j++) {
                var x = j % 2, y = j / 2 | 0;
                coords.splice(coords.length, 0, x, y, alpha);
                x = (x - 0.5) * w * scaleX;
                y = (y - 0.5) * h * scaleY;
                vertices.splice(vertices.length, 0,
                    (centerX + x * c + y * s) / canvas.width,
                    (centerY + y * c - x * s) / canvas.height);
            }
            var i4 = i * 4;
            indices.splice(indices.length, 0, i4, i4 + 1, i4 + 2, i4 + 1, i4 + 2, i4 + 3);
        }

        // Bind the vertices
        if (gl.vertexBuffer == null || !gl.isBuffer(gl.vertexBuffer)) gl.vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
        if (gl.stamp.vertexAttribute == null) {
            gl.stamp.vertexAttribute = gl.getAttribLocation(gl.stamp.program, 'vertex');
            gl.enableVertexAttribArray(gl.stamp.vertexAttribute);
        }

        // Bind the texture coordinates (and alpha)
        if (gl.texCoordBuffer == null || !gl.isBuffer(gl.texCoordBuffer)) gl.texCoordBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(coords), gl.STATIC_DRAW);
        if (gl.stamp.texCoordAttribute == null) {
            gl.stamp.texCoordAttribute = gl.getAttribLocation(gl.stamp.program, '_texCoord');
            gl.enableVertexAttribArray(gl.stamp.texCoordAttribute);
        }

        // Bind the texture coordinates (and alpha)
        if (gl.indexBuffer == null || !gl.isBuffer(gl.indexBuffer)) gl.indexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.indexBuffer);
        gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

        // Draw the stamps
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
        texture.use();
        gl.useProgram(gl.stamp.program);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.vertexBuffer);
        gl.vertexAttribPointer(gl.stamp.vertexAttribute, 2, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ARRAY_BUFFER, gl.texCoordBuffer);
        gl.vertexAttribPointer(gl.stamp.texCoordAttribute, 3, gl.FLOAT, false, 0, 0);
        gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, gl.indexBuffer);
        gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
        gl.disable(gl.BLEND);
    });
    this._.spareTexture.swapWith(this._.texture);

    return this;
}

// src/filters/video/chromelogo.js
/**
 * @filter           Chrome Logo
 * @description      Overlays the logo of the Chrome browser.
 * @param centerX    The x coordinate of the logo.
 * @param centerY    The y coordinate of the logo.
 * @param frame      The frame number of the swirling animation.
 * @param blueRadius The radius of the blue center.
 */
function chromeLogo(centerX, centerY, frame, blueRadius) {
    gl.chromeLogo = gl.chromeLogo || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float frame;\
        uniform float blueRadius;\
        uniform vec2 center;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        ' + randomShaderFunc + '\
        \
        const float twopi = 6.283185307179586;\
        \
        vec3 colorAt(vec2 coord, float twist) {\
            float radius = length(coord);\
            float offset = radius * 0.005;\
            float angle = fract((atan(coord.y, coord.x) - offset) / twopi + twist) * 3.0;\
            const vec3 red = vec3(1.0, 0.25, 0.0);\
            const vec3 green = vec3(0.5, 0.75, 0.25);\
            const vec3 yellow = vec3(1.0, 1.0, 0.25);\
            const vec3 blue = vec3(0.35, 0.6, 0.85);\
            vec3 color;\
            float t = 1.0 / (1.0 + exp(-100.0 * (fract(angle) - 0.5)));\
            if (angle < 1.0) color = mix(red, yellow, t);\
            else if (angle < 2.0) color = mix(yellow, green, t);\
            else color = mix(green, red, t);\
            color = mix(color, blue, 1.0 / (1.0 + exp(-50.0 * (1.0 - radius / blueRadius))));\
            return color;\
        }\
        \
        vec4 bulgySample(vec2 coord) {\
            float bulge = 1.5 * length(coord) / blueRadius;\
            return texture2D(texture, (coord / (1.0 + 5.0 / (exp(-bulge) + exp(bulge))) + center) / texSize);\
        }\
        \
        void main() {\
            /* randomize the lookup values to hide the fixed number of samples */\
            float offset = random(vec3(12.9898, 78.233, 151.7182), 0.0);\
            \
            vec2 coord = texCoord * texSize - center;\
            float twist = 2.0 * (fract(frame * 0.005 + 0.5) - 0.5);\
            float reset = twist * twist;\
            reset *= reset * reset;\
            reset *= reset * reset;\
            reset *= reset * reset;\
            float sign = (twist > 0.0 ? 1.0 : -1.0);\
            float radius = length(coord);\
            vec2 tangent = vec2(-coord.y, coord.x) / radius;\
            vec4 color = vec4(0.0);\
            float total = 0.0;\
            for (float t = 0.0; t <= 20.0; t++) {\
                float percent = (t + offset) / 20.0;\
                float weight = percent - percent * percent;\
                float angle = (percent - 0.5) * 0.25 / (1.0 + exp(-10.0 * (radius / blueRadius - 1.075)));\
                angle -= twopi * twist / (1.0 + exp(-50.0 * (radius / blueRadius - 1.075)));\
                float s = sin(angle), c = cos(angle);\
                vec4 sample = bulgySample(vec2(dot(vec2(c, s), coord), dot(vec2(-s, c), coord)));\
                \
                /* switch to pre-multiplied alpha to correctly blur transparent images */\
                sample.rgb *= sample.a;\
                \
                color += sample * weight;\
                total += weight;\
            }\
            \
            color /= total;\
            gl_FragColor = vec4(colorAt(coord, twist) * dot(vec3(0.2989, 0.5870, 0.1140), 0.25 + 0.75 * color.rgb), color.a);\
            \
            /* switch back from pre-multiplied alpha */\
            gl_FragColor.rgb /= gl_FragColor.a + 0.00001;\
        }\
    ');

    simpleShader.call(this, gl.chromeLogo, {
        center: [centerX, centerY],
        frame: frame,
        blueRadius: blueRadius,
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/video/oldfilm.js
/**
 * @filter      Old Film
 * @description Makes the image look like it was projected through an old projector.
 * @param frame The frame number of the animation (the random seed).
 */
function oldFilm(frame) {
    gl.oldFilm = gl.oldFilm || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float frame;\
        varying vec2 texCoord;\
        \
        float random(float scale, float seed) {\
            return fract(sin(seed * scale) * 43758.5453 + seed * 234.45574);\
        }\
        \
        void main() {\
            /* Base color */\
            vec2 offset = (vec2(random(34.534, frame), random(78678.45, frame)) - 0.5) * 0.001;\
            offset.y += 0.1 * pow(0.5 - 0.5 * cos(frame) * cos(frame * 3.178236) * cos(frame * 2.718672), 20.0);\
            vec4 color = texture2D(texture, texCoord + offset);\
            \
            /* Sepia */\
            color.rgb = vec3(\
                dot(color.rgb, vec3(0.393, 0.769, 0.189)),\
                dot(color.rgb, vec3(0.349, 0.686, 0.168)),\
                dot(color.rgb, vec3(0.272, 0.534, 0.131))\
            );\
            \
            /* Vignette */\
            offset = (vec2(random(345.34, frame), random(8204.86, frame)) - 0.5) * 0.01;\
            vec2 darken = abs(texCoord + offset - 0.5) * (2.25 + 0.02 * cos(frame * 0.3));\
            darken = max(vec2(0.0), 1.0 - pow(darken, vec2(5.0)));\
            color.rgb = mix(vec3(0.1), color.rgb, length(darken.x * darken.y));\
            \
            /* Brightness */\
            color.rgb *= 0.75 + 0.25 * cos(frame * 0.1 + cos(frame * 0.4)) * cos(frame / 26.0);\
            \
            /* Lines */\
            float x = (texCoord.x + offset.x) * 100.0;\
            color.rgb *= 1.0 - pow((0.5 - 0.5 * cos(0.025 * frame + 5.0 * x)) * (0.5 - 0.5 * cos(x) * cos(x * 3.178236) * cos(x * 2.718672) * cos(x * 5.728309)), 20.0);\
            \
            /* Specks */\
            vec2 center = vec2(random(6461.345, frame), random(234.2423, frame)) * 2.0;\
            float angle = random(13467.33, frame) * 6.283185307179586;\
            float s = sin(angle), c = cos(angle);\
            vec2 delta = texCoord - center;\
            delta = vec2(dot(vec2(c, s), delta), dot(vec2(-s, c), delta));\
            float shape = 0.9 * random(456.6575, frame);\
            delta.x /= 1.0 - shape;\
            float scale = 200.0 + 200.0 * random(765343.875, frame);\
            float t = scale * length(delta) - 2.0;\
            color.rgb *= smoothstep(0.0, 1.0, t);\
            \
            gl_FragColor = color;\
        }\
    ');

    simpleShader.call(this, gl.oldFilm, {
        frame: frame,
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/video/photocopy.js
/**
 * @filter       Photocopy
 * @description  Makes the image look like it was printed by a photocopier.
 * @param cutoff The brightness threshold for the black/white boundary (0 to 1).
 * @param frame  The frame number of the animation (the random seed).
 */
function photocopy(cutoff, frame) {
    gl.photocopy = gl.photocopy || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float frame;\
        uniform float cutoff;\
        varying vec2 texCoord;\
        \
        float random(float scale, float seed) {\
            return fract(sin(seed * scale) * 43758.5453 + seed * 234.45574);\
        }\
        \
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            \
            /* Drum lines */\
            float y = texCoord.y * 300.0;\
            color.rgb *= 1.0 + 0.1 * sin(y) * sin(y * 1.1) + 0.1 * sin(y * 2.317) * sin(y * 1.3648) + 0.1 * sin(y * 0.3673) * sin(y * 0.7836);\
            \
            /* Brightness */\
            color.rgb *= 1.0 + 0.05 * cos(frame * 0.1 + cos(frame * 0.4)) * cos(frame / 26.0);\
            \
            /* Black and white with high contrast */\
            float gray = (color.r + color.g + color.b) / 3.0;\
            color.rgb = vec3(smoothstep(0.0, 1.0, gray * 6.0 - cutoff * 7.0 + 1.0));\
            \
            gl_FragColor = color;\
        }\
    ');

    simpleShader.call(this, gl.photocopy, {
        frame: frame,
        cutoff: clamp(0, cutoff, 1),
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/video/quadcolor.js
/**
 * @filter       Quad Color
 * @description  Renders the image four times, each with a different color.
 * @param color1 An array with three values (0 to 1) for the top-left corner.
 * @param color2 An array with three values (0 to 1) for the top-right corner.
 * @param color3 An array with three values (0 to 1) for the bottom-left corner.
 * @param color4 An array with three values (0 to 1) for the bottom-right corner.
 */
function quadColor(color1, color2, color3, color4) {
    gl.quadColor = gl.quadColor || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec3 color1;\
        uniform vec3 color2;\
        uniform vec3 color3;\
        uniform vec3 color4;\
        varying vec2 texCoord;\
        \
        void main() {\
            vec4 color = texture2D(texture, fract(texCoord * 2.0));\
            color.rgb = vec3((color.r + color.g + color.b) / 3.0);\
            if (texCoord.y < 0.5) {\
                if (texCoord.x < 0.5) color.rgb *= color1;\
                else color.rgb *= color2;\
            } else {\
                if (texCoord.x < 0.5) color.rgb *= color3;\
                else color.rgb *= color4;\
            }\
            gl_FragColor = vec4(color);\
        }\
    ');

    simpleShader.call(this, gl.quadColor, {
        color1: color1,
        color2: color2,
        color3: color3,
        color4: color4
    });

    return this;
}

// src/filters/video/quadrotate.js
/**
 * @filter       Quad Rotate
 * @description  Renders the image four times, each with a configurable orientation.
 * @param quad1  The q
 * @param color2 An array with three values (0 to 1) for the top-right corner.
 * @param color3 An array with three values (0 to 1) for the bottom-left corner.
 * @param color4 An array with three values (0 to 1) for the bottom-right corner.
 */
function quadRotate(dir1, dir2, dir3, dir4) {
    gl.quadRotate = gl.quadRotate || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec4 angles;\
        varying vec2 texCoord;\
        \
        void main() {\
            vec2 coord = fract(texCoord * 2.0) - 0.5;\
            vec2 a = vec2(texCoord.x < 0.5, texCoord.y < 0.5), b = 1.0 - a;\
            float angle = dot(angles, vec4(a.x * a.y, b.x * a.y, a.x * b.y, b.x * b.y));\
            float s = sin(angle), c = cos(angle);\
            coord = vec2(dot(vec2(c, s), coord), dot(vec2(-s, c), coord));\
            gl_FragColor = vec4(texture2D(texture, coord + 0.5));\
        }\
    ');

    simpleShader.call(this, gl.quadRotate, {
        angles: [
            dir1 * Math.PI * 0.5,
            dir2 * Math.PI * 0.5,
            dir3 * Math.PI * 0.5,
            dir4 * Math.PI * 0.5
        ]
    });

    return this;
}

// src/filters/video/timestrips.js
/**
 * @filter         Time Strips
 * @description    Displays many horizontal slices of a video, each from a different frame.
 * @param textures An array containing a circular buffer of frames from a video.
 * @param frame    The index of the first texture in the circular buffer.
 */
function timeStrips(textures, frame) {
    gl.timeStrips = gl.timeStrips || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            gl_FragColor = texture2D(texture, texCoord);\
        }\
    ');

    var w = this.width, h = this.height;
    this._.spareTexture.drawTo(function() {
        for (var i = 0; i < textures.length; i++) {
            var texture = textures[(i + frame) % textures.length];
            (texture._ || texture).use();
            gl.timeStrips.drawRect(0, h * i / textures.length, w, h * (i + 1) / textures.length, true);
        }
    });
    this._.spareTexture.swapWith(this._.texture);

    return this;
}

// src/filters/video/vhs.js
/**
 * @filter      VHS
 * @description Makes the image look like it was captured on VHS.
 * @param frame The frame number of the animation (the random seed).
 */
function vhs(frame) {
    gl.vhs = gl.vhs || new Shader(null, '\
        uniform sampler2D texture;\
        uniform float frame;\
        varying vec2 texCoord;\
        \
        float random(float scale, float seed) {\
            return fract(sin(seed * scale) * 43758.5453 + seed * 234.45574);\
        }\
        \
        void main() {\
            /* RGB to YCbCr */\
            vec4 color = texture2D(texture, texCoord);\
            vec3 rgb = color.rgb * 256.0;\
            vec3 ycbcr = vec3(\
                dot(vec3(0.299, 0.587, 0.114), rgb),\
                128.0 + dot(vec3(-0.1687, -0.3313, 0.5), rgb),\
                128.0 + dot(vec3(0.5, -0.4187, -0.0813), rgb)\
            );\
            \
            /* Color dimming */\
            ycbcr = mix(vec3(128.0), ycbcr, vec3(0.75, 0.5, 0.5));\
            \
            /* Scan lines */\
            float y = texCoord.y + frame * 0.005;\
            ycbcr.x *= 1.0 + 0.075 * sin(y * 300.0 + frame * 11.0) * sin(y * 70.0) * sin(y * 10.0);\
            \
            /* Phosphor pattern */\
            ycbcr.x *= 1.0 + 0.25 * sin(dot(vec2(3.0, 1.0), gl_FragCoord.xy));\
            \
            /* YCbCr to RGB */\
            rgb = vec3(\
                ycbcr.x + 1.402 * (ycbcr.z - 128.0),\
                ycbcr.x - 0.34414 * (ycbcr.y - 128.0) - 0.71414 * (ycbcr.z - 128.0),\
                ycbcr.x + 1.772 * (ycbcr.y - 128.0)\
            );\
            gl_FragColor = vec4(rgb / 256.0, color.a);\
        }\
    ');

    // VHS is low resolution and runs a sharpening filter
    triangleBlur.call(this, 5);
    unsharpMask.call(this, 5, 10);

    simpleShader.call(this, gl.vhs, {
        frame: frame,
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/video/wettable.js
/**
 * @filter         Wet Table
 * @description    Uses the scene to generate an image of a wet table.
 */
function wetTable() {
    gl.wetTableGrayscale = gl.wetTableGrayscale || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            float gray = dot(vec3(0.2989, 0.5870, 0.1140), color.rgb);\
            gl_FragColor = vec4(gray);\
        }\
    ');

    gl.wetTableThreshold = gl.wetTableThreshold || new Shader(null, '\
        uniform sampler2D texture;\
        varying vec2 texCoord;\
        void main() {\
            vec4 color = texture2D(texture, texCoord);\
            gl_FragColor = vec4(float(fract(color.r * 4.0) > 0.5));\
        }\
    ');

    gl.wetTableBlur = gl.wetTableBlur || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 delta;\
        varying vec2 texCoord;\
        void main() {\
            vec4 centerSample = texture2D(texture, texCoord);\
            float color = centerSample.r;\
            float total = 1.0;\
            for (float t = 1.5; t < 11.5; t += 2.0) {\
                float weight = 2.0 * exp(-t * t * 0.02);\
                color += texture2D(texture, texCoord + delta * t).r * weight;\
                color += texture2D(texture, texCoord - delta * t).r * weight;\
                total += 2.0 * weight;\
            }\
            gl_FragColor = vec4(color / total, centerSample.g, 0.0, 1.0);\
        }\
    ');

    gl.wetTable = gl.wetTable || new Shader(null, '\
        uniform sampler2D texture;\
        uniform sampler2D envMap;\
        varying vec2 texCoord;\
        \
        void main() {\
            vec2 delta = texCoord / gl_FragCoord.xy;\
            vec4 data = texture2D(texture, texCoord);\
            vec4 xneg = texture2D(texture, texCoord - vec2(delta.x, 0.0));\
            vec4 xpos = texture2D(texture, texCoord + vec2(delta.x, 0.0));\
            vec4 yneg = texture2D(texture, texCoord - vec2(0.0, delta.y));\
            vec4 ypos = texture2D(texture, texCoord + vec2(0.0, delta.y));\
            float isOutside = clamp(15.0 * (data.r - 0.5), 0.0, 1.0);\
            float depth = 0.3;\
            vec3 normal = normalize(cross(vec3(depth, 0.0, xpos.r - xneg.r), vec3(0.0, depth, ypos.r - yneg.r)));\
            \
            float shadow = texture2D(texture, texCoord - vec2(0, delta.y * 5.0)).r;\
            vec2 coord = gl_FragCoord.xy * 0.02;\
            vec3 ray = refract(vec3(0.0, 0.0, -1.0), normal, 1.65);\
            coord += ray.xy / ray.z * (data.r - 0.5) * (1.0 - isOutside);\
            float pattern = (float(fract(coord.x) > 0.5) + float(fract(coord.y) > 0.5)) * 0.5;\
            vec3 outsideColor = mix(vec3(0.75, 0.25, 0.25), vec3(0.85), pattern);\
            \
            ray = reflect(vec3(0.0, 0.0, -1.0), normal);\
            vec2 roof = ray.xz / (ray.y + 0.00001);\
            float dist = min(min(length(roof - vec2(-2.0, 1.0)), length(roof - vec2(0.5, 1.0))),\
                             min(length(roof - vec2(1.0, 2.0)), length(roof - vec2(-1.0, 1.0))));\
            float light = 1.0 / (0.1 + 10.0 * dist);\
            vec3 insideColor = outsideColor * (0.25 + 0.85 * ray.z) + light;\
            insideColor += 0.125 - 0.125 / (1.0 + exp(-30.0 * (ray.x * 0.25 + ray.y + 0.5)));\
            insideColor += pow(max(0.0, ray.y), 10.0) * 0.5 - max(0.0, -ray.y) * 0.25;\
            \
            gl_FragColor = vec4(mix(insideColor, outsideColor * (0.5 + 0.5 * pow(shadow, 0.25)), isOutside), 1.0);\
        }\
    ');

    simpleShader.call(this, gl.wetTableGrayscale);
    simpleShader.call(this, gl.wetTableBlur, { delta: [1 / this.width, 0] });
    simpleShader.call(this, gl.wetTableBlur, { delta: [0, 1 / this.height] });
    simpleShader.call(this, gl.wetTableThreshold);
    simpleShader.call(this, gl.wetTableBlur, { delta: [1 / this.width, 0] });
    simpleShader.call(this, gl.wetTableBlur, { delta: [0, 1 / this.height] });
    simpleShader.call(this, gl.wetTable);

    return this;
}

// src/filters/warp/blockhead.js
/**
 * @filter         Blockhead
 * @description    Bulges or pinches the image in a rectangle.
 * @param centerX  The x coordinate of the center of the rectangle of effect.
 * @param centerY  The y coordinate of the center of the rectangle of effect.
 * @param width    The width of the rectangle of effect.
 * @param height   The height of the rectangle of effect.
 * @param strength -1 to 1 (-1 is strong pinch, 0 is no effect, 1 is strong bulge)
 */
function blockhead(centerX, centerY, width, height, strength) {
    gl.blockhead = gl.blockhead || warpShader('\
        uniform vec2 radius;\
        uniform float strength;\
        uniform vec2 center;\
        float warp(float coord) {\
            float percent = abs(coord);\
            if (percent < 1.0) {\
                float factor = mix(1.0, smoothstep(0.0, 1.0, percent), abs(strength) * 0.75);\
                if (strength > 0.0) coord *= factor;\
                else coord /= factor;\
            }\
            return coord;\
        }\
    ', '\
        coord = (coord - center) / radius;\
        coord.x = warp(coord.x);\
        coord.y = warp(coord.y);\
        coord = coord * radius + center;\
    ');

    simpleShader.call(this, gl.blockhead, {
        radius: [width / 2, height / 2],
        strength: clamp(-1, strength, 1),
        center: [centerX, centerY],
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/warp/bulgepinch.js
/**
 * @filter         Bulge / Pinch
 * @description    Bulges or pinches the image in a circle.
 * @param centerX  The x coordinate of the center of the circle of effect.
 * @param centerY  The y coordinate of the center of the circle of effect.
 * @param radius   The radius of the circle of effect.
 * @param strength -1 to 1 (-1 is strong pinch, 0 is no effect, 1 is strong bulge)
 */
function bulgePinch(centerX, centerY, radius, strength) {
    gl.bulgePinch = gl.bulgePinch || warpShader('\
        uniform float radius;\
        uniform float strength;\
        uniform vec2 center;\
    ', '\
        coord -= center;\
        float distance = length(coord);\
        if (distance < radius) {\
            float percent = distance / radius;\
            if (strength > 0.0) {\
                coord *= mix(1.0, smoothstep(0.0, radius / distance, percent), strength * 0.75);\
            } else {\
                coord *= mix(1.0, pow(percent, 1.0 + strength * 0.75) * radius / distance, 1.0 - percent);\
            }\
        }\
        coord += center;\
    ');

    simpleShader.call(this, gl.bulgePinch, {
        radius: radius,
        strength: clamp(-1, strength, 1),
        center: [centerX, centerY],
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/warp/kaleidoscope.js
/**
 * @filter         Kaleidoscope
 * @description    Renders the image as if looked at through a kaleidoscope
 *                 (a tube with three mirrors inside arranged in a triangle).
 * @param centerX  The x coordinate of the center of the triangular pattern.
 * @param centerY  The y coordinate of the center of the triangular pattern.
 * @param size     The length of one side of a triangle.
 * @param angle    The rotation of the triangular pattern, in radians.
 */
function kaleidoscope(centerX, centerY, size, angle) {
    gl.kaleidoscope = gl.kaleidoscope || warpShader('\
        uniform float size;\
        uniform float angle;\
        uniform vec2 center;\
        bool xor(bool a, bool b) { return (int(a) + int(b)) == 1; }\
    ', '\
        float c = cos(angle);\
        float s = sin(angle);\
        \
        /* Convert to triangle coordinates */\
        coord = (coord - center) / size;\
        coord = vec2(dot(vec2(c, s), coord), dot(vec2(-s, c), coord));\
        coord.y /= 0.866025404;\
        coord.x -= coord.y * 0.5;\
        \
        /* Apply mirrored reflections */\
        coord = 3.0 * fract(coord / 3.0);\
        if (coord.x + coord.y > 3.0) coord = 3.0 - coord.yx;\
        if (coord.x + coord.y > 2.0) coord = 2.0 - coord.yx;\
        if (coord.x > 1.0) {\
            if (coord.y > 0.0) coord = vec2(2.0 - coord.x - coord.y, coord.x - 1.0);\
            else coord = vec2(2.0 - coord.x, coord.x + coord.y - 1.0);\
        }\
        else if (coord.y > 1.0) {\
            if (coord.x > 0.0) coord = vec2(coord.y - 1.0, 2.0 - coord.x - coord.y);\
            else coord = vec2(coord.x + coord.y - 1.0, 2.0 - coord.y);\
        }\
        else if (coord.x + coord.y > 1.0) coord = 1.0 - coord.yx;\
        \
        /* Convert from triangle coordinates */\
        coord.x += coord.y * 0.5;\
        coord.y *= 0.866025404;\
        coord = vec2(dot(vec2(c, -s), coord), dot(vec2(s, c), coord));\
        coord = coord * size + center;\
    ');

    simpleShader.call(this, gl.kaleidoscope, {
        size: size,
        angle: angle,
        center: [centerX, centerY],
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/warp/matrixwarp.js
/**
 * @filter                Matrix Warp
 * @description           Transforms an image by a 2x2 or 3x3 matrix. The coordinates used in
 *                        the transformation are (x, y) for a 2x2 matrix or (x, y, 1) for a
 *                        3x3 matrix, where x and y are in units of pixels.
 * @param matrix          A 2x2 or 3x3 matrix represented as either a list or a list of lists.
 *                        For example, the 3x3 matrix [[2,0,0],[0,3,0],[0,0,1]] can also be
 *                        represented as [2,0,0,0,3,0,0,0,1] or just [2,0,0,3].
 * @param inverse         A boolean value that, when true, applies the inverse transformation
 *                        instead. (optional, defaults to false)
 * @param useTextureSpace A boolean value that, when true, uses texture-space coordinates
 *                        instead of screen-space coordinates. Texture-space coordinates range
 *                        from -1 to 1 instead of 0 to width - 1 or height - 1, and are easier
 *                        to use for simple operations like flipping and rotating.
 */
function matrixWarp(matrix, inverse, useTextureSpace) {
    gl.matrixWarp = gl.matrixWarp || warpShader('\
        uniform mat3 matrix;\
        uniform float useTextureSpace;\
    ', '\
        if (useTextureSpace > 0.5) coord = coord / texSize * 2.0 - 1.0;\
        vec3 warp = matrix * vec3(coord, 1.0);\
        coord = warp.xy / warp.z;\
        if (useTextureSpace > 0.5) coord = (coord * 0.5 + 0.5) * texSize;\
    ');

    // Flatten all members of matrix into one big list
    matrix = Array.prototype.concat.apply([], matrix);

    // Extract a 3x3 matrix out of the arguments
    if (matrix.length == 4) {
        matrix = [
            matrix[0], matrix[1], 0,
            matrix[2], matrix[3], 0,
            0, 0, 1
        ];
    } else if (matrix.length != 9) {
        throw 'can only warp with 2x2 or 3x3 matrix';
    }

    simpleShader.call(this, gl.matrixWarp, {
        matrix: inverse ? getInverse(matrix) : matrix,
        texSize: [this.width, this.height],
        useTextureSpace: useTextureSpace | 0
    });

    return this;
}

// src/filters/warp/mirror.js
/**
 * @filter      Mirror
 * @description Mirrors the image about a line.
 * @param angle The angle of the line of symmetry, in radians.
 */
function mirror(angle) {
    gl.mirror = gl.mirror || warpShader('\
        uniform float angle;\
    ', '\
        coord -= texSize * 0.5;\
        vec2 dir = vec2(cos(angle), sin(angle));\
        float dist = dot(dir, coord);\
        if (dist < 0.0) coord -= dir * dist * 2.0;\
        coord += texSize * 0.5;\
    ');

    simpleShader.call(this, gl.mirror, {
        angle: angle,
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/warp/mirrortube.js
/**
 * @filter        Mirror Tube
 * @description   Mirrors everything around a circle back inside the circle.
 * @param centerX The x coordinate of the center of the circle.
 * @param centerY The y coordinate of the center of the circle.
 * @param radius  The radius of the circle.
 */
function mirrorTube(centerX, centerY, radius) {
    gl.mirrorTube = gl.mirrorTube || new Shader(null, '\
        uniform sampler2D texture;\
        uniform vec2 center;\
        uniform float radius;\
        uniform vec2 texSize;\
        varying vec2 texCoord;\
        void main() {\
            vec2 coord = texCoord * texSize - center;\
            float t = length(coord) / radius;\
            coord *= smoothstep(0.0, t, 1.0 / t);\
            gl_FragColor = texture2D(texture, (coord + center) / texSize);\
        }\
    ');

    simpleShader.call(this, gl.mirrorTube, {
        center: [centerX, centerY],
        radius: radius,
        texSize: [this.width, this.height]
    });

    return this;
}

// src/filters/warp/perspective.js
/**
 * @filter       Perspective
 * @description  Warps one quadrangle to another with a perspective transform. This can be used to
 *               make a 2D image look 3D or to recover a 2D image captured in a 3D environment.
 * @param before The x and y coordinates of four points before the transform in a flat list. This
 *               would look like [ax, ay, bx, by, cx, cy, dx, dy] for four points (ax, ay), (bx, by),
 *               (cx, cy), and (dx, dy).
 * @param after  The x and y coordinates of four points after the transform in a flat list, just
 *               like the other argument.
 */
function perspective(before, after) {
    var a = getSquareToQuad.apply(null, after);
    var b = getSquareToQuad.apply(null, before);
    var c = multiply(getInverse(a), b);
    return this.matrixWarp(c);
}

// src/filters/warp/swirl.js
/**
 * @filter        Swirl
 * @description   Warps a circular region of the image in a swirl.
 * @param centerX The x coordinate of the center of the circular region.
 * @param centerY The y coordinate of the center of the circular region.
 * @param radius  The radius of the circular region.
 * @param angle   The angle in radians that the pixels in the center of
 *                the circular region will be rotated by.
 */
function swirl(centerX, centerY, radius, angle) {
    gl.swirl = gl.swirl || warpShader('\
        uniform float radius;\
        uniform float angle;\
        uniform vec2 center;\
    ', '\
        coord -= center;\
        float distance = length(coord);\
        if (distance < radius) {\
            float percent = (radius - distance) / radius;\
            float theta = percent * percent * angle;\
            float s = sin(theta);\
            float c = cos(theta);\
            coord = vec2(\
                coord.x * c - coord.y * s,\
                coord.x * s + coord.y * c\
            );\
        }\
        coord += center;\
    ');

    simpleShader.call(this, gl.swirl, {
        radius: radius,
        center: [centerX, centerY],
        angle: angle,
        texSize: [this.width, this.height]
    });

    return this;
}

return exports;
})();

define("libs/webgl/glfx.min", function(){});

/*
 RequireJS text 1.0.6 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 Available via the MIT or new BSD license.
 see: http://github.com/jrburke/requirejs for details
*/
(function(){var k=["Msxml2.XMLHTTP","Microsoft.XMLHTTP","Msxml2.XMLHTTP.4.0"],n=/^\s*<\?xml(\s)+version=[\'\"](\d)*.(\d)*[\'\"](\s)*\?>/im,o=/<body[^>]*>\s*([\s\S]+)\s*<\/body>/im,i=typeof location!=="undefined"&&location.href,p=i&&location.protocol&&location.protocol.replace(/\:/,""),q=i&&location.hostname,r=i&&(location.port||void 0),j=[];define('text',[],function(){var g,h,l;typeof window!=="undefined"&&window.navigator&&window.document?h=function(a,c){var b=g.createXhr();b.open("GET",a,!0);b.onreadystatechange=
function(){b.readyState===4&&c(b.responseText)};b.send(null)}:typeof process!=="undefined"&&process.versions&&process.versions.node?(l=require.nodeRequire("fs"),h=function(a,c){var b=l.readFileSync(a,"utf8");b.indexOf("\ufeff")===0&&(b=b.substring(1));c(b)}):typeof Packages!=="undefined"&&(h=function(a,c){var b=new java.io.File(a),e=java.lang.System.getProperty("line.separator"),b=new java.io.BufferedReader(new java.io.InputStreamReader(new java.io.FileInputStream(b),"utf-8")),d,f,g="";try{d=new java.lang.StringBuffer;
(f=b.readLine())&&f.length()&&f.charAt(0)===65279&&(f=f.substring(1));for(d.append(f);(f=b.readLine())!==null;)d.append(e),d.append(f);g=String(d.toString())}finally{b.close()}c(g)});return g={version:"1.0.6",strip:function(a){if(a){var a=a.replace(n,""),c=a.match(o);c&&(a=c[1])}else a="";return a},jsEscape:function(a){return a.replace(/(['\\])/g,"\\$1").replace(/[\f]/g,"\\f").replace(/[\b]/g,"\\b").replace(/[\n]/g,"\\n").replace(/[\t]/g,"\\t").replace(/[\r]/g,"\\r")},createXhr:function(){var a,c,
b;if(typeof XMLHttpRequest!=="undefined")return new XMLHttpRequest;else for(c=0;c<3;c++){b=k[c];try{a=new ActiveXObject(b)}catch(e){}if(a){k=[b];break}}if(!a)throw Error("createXhr(): XMLHttpRequest not available");return a},get:h,parseName:function(a){var c=!1,b=a.indexOf("."),e=a.substring(0,b),a=a.substring(b+1,a.length),b=a.indexOf("!");b!==-1&&(c=a.substring(b+1,a.length),c=c==="strip",a=a.substring(0,b));return{moduleName:e,ext:a,strip:c}},xdRegExp:/^((\w+)\:)?\/\/([^\/\\]+)/,useXhr:function(a,
c,b,e){var d=g.xdRegExp.exec(a),f;if(!d)return!0;a=d[2];d=d[3];d=d.split(":");f=d[1];d=d[0];return(!a||a===c)&&(!d||d===b)&&(!f&&!d||f===e)},finishLoad:function(a,c,b,e,d){b=c?g.strip(b):b;d.isBuild&&(j[a]=b);e(b)},load:function(a,c,b,e){if(e.isBuild&&!e.inlineText)b();else{var d=g.parseName(a),f=d.moduleName+"."+d.ext,m=c.toUrl(f),h=e&&e.text&&e.text.useXhr||g.useXhr;!i||h(m,p,q,r)?g.get(m,function(c){g.finishLoad(a,d.strip,c,b,e)}):c([f],function(a){g.finishLoad(d.moduleName+"."+d.ext,d.strip,a,
b,e)})}},write:function(a,c,b){if(c in j){var e=g.jsEscape(j[c]);b.asModule(a+"!"+c,"define(function () { return '"+e+"';});\n")}},writeFile:function(a,c,b,e,d){var c=g.parseName(c),f=c.moduleName+"."+c.ext,h=b.toUrl(c.moduleName+"."+c.ext)+".js";g.load(f,b,function(){var b=function(a){return e(h,a)};b.asModule=function(a,b){return e.asModule(a,h,b)};g.write(a,f,b,d)},d)}}})})();

define('text!intro.html',[],function () { return '<div id="intro">\n\t<p><h1>Welcome to HTML5 Camera!</h1></p>\n\t<p>This site is an experiment with HTML5 technologies, including WebRTC, Device Orientation, Canvas, Video and others.</p>\n\t<p>In order to use this site, you will need a browser that is on the bleeding edge of HTML5.  Currently, HTML5 Camera Supports the following browsers...</p>\n\t<ul>\n\t\t<li><a href="http://www.chromium.org/getting-involved/dev-channel">Chrome Dev Channel</a></li>\n\t\t<li><a href="http://www.chromium.org/getting-involved/dev-channel">Chrome Canary</a></li>\n\t\t<li><a href="http://snapshot.opera.com/labs/camera/">Opera Labs Camera Build</a></li>\n\t</ul>\t\n\t<p>For the Chrome Builds, you will need to turn on the experimental WebRTC feature by entering <strong>chrome://flags</strong> in your address bar and then enabling <strong>Media Streaming</strong></p>\n\t<br />\n\t<p><div class="chrome-flags"><img src="stylesheets/images/chrome_flags.png" alt="Enable Media Streaming Under Chrome Flags" /></div></p>\n</div>';});

define('text!mylibs/customize/views/customize.html',[],function () { return '\n<div id="customize">\n\t<div class="row dark">\n\t\t<div class="span6">\n\t\t\t<div class="row centered no-margin">\n\t\t\t\t<div class="canvas">\n\t\t\t\t</div>\n\t\t\t\t<div class="yep-nope">\n\t\t\t\t\t<button class="button" data-bind="events: { click: yep }">Yep</button>\n\t\t\t\t\t<button class="button" data-bind="events: { click: nope }">Nope</button>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t\t<div class="span4">\n\t\t\t<h3>Brightness / Contrast</h3>\n\t\t\t<div>\n\t\t\t\t<div>Brightness<div>\n\t\t\t\t<input class="slider" data-role="slider" data-tick-placement="none" data-bind="value: effects.brightnessContrast.brightness.value, events: { slide: change, change: change }" data-small-step=".01" data-large-step=".01" min="0" max="1" />\n\t\t\t</div>\n\t\t\t<div>\n\t\t\t\t<div>Contrast</div>\n\t\t\t\t\t<input class="slider" data-role="slider" data-tick-placement="none" data-bind="value: effects.brightnessContrast.contrast.value, events: { slide: change, change: change }" max="1" min="0" data-small-step=".01" data-large-step=".01"/>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t\t<br />\n\t\t\t<h3>Vignette</h3>\n\t\t\t<div>\n\t\t\t\t<div>Corner Size</div>\n\t\t\t\t\t<input data-role="slider" data-tick-placement="none" class="slider" data-large-step=".01" data-small-step=".01" max="1" min="0" data-bind="value: effects.vignette.size.value, events: { slide: change, change: change }" />\n\t\t\t</div>\n\t\t\t<div>\t\n\t\t\t\t<div>Corner Amount</div>\n\t\t\t\t<input data-role="slider" data-tick-placement="none" class="slider" data-large-step=".01" data-small-step=".01" max="1" min="0" data-bind="value: effects.vignette.amount.value, events: { slide: change, change: change }" />\n\t\t\t</div>\n\t\t\t<br />\n\t\t\t<h3>Hue / Saturation</h3>\n\t\t\t<div>\n\t\t\t\t<div>Hue</div>\n\t\t\t\t\t<input data-role="slider" data-tick-placement="none" class="slider" data-large-step=".01" data-small-step=".01" max="1" min="0" data-bind="value: effects.hueSaturation.hue.value, events: { slide: change, change: change }" />\n\t\t\t</div>\n\t\t\t<div>\t\n\t\t\t\t<div>Saturation</div>\n\t\t\t\t<input data-role="slider" data-tick-placement="none" class="slider" data-large-step=".01" data-small-step=".01" max="1" min="0" data-bind="value: effects.hueSaturation.saturation.value, events: { slide: change, change: change }" />\n\t\t\t</div>\n\t\t\t<br />\n\t\t\t<h3>Noise</h3>\n\t\t\t<div>\n\t\t\t\t<div>Noise</div>\n\t\t\t\t\t<input data-role="slider" data-tick-placement="none" class="slider" data-large-step=".01" data-small-step=".01" max="1" min="0" data-bind="value: effects.noise.noise.value, events: { slide: change, change: change }" />\n\t\t\t</div>\n\t\t\t<!--\n\t\t\t<div>\n\t\t\t\t<div>Denoise</div>\n\t\t\t\t\t<input data-role="slider" data-tick-placement="none" class="slider" data-large-step="1" data-small-step="1" max="50" min="0" data-bind="value: effects.denoise.denoise.value, events: { slide: change, change: change }" />\n\t\t\t</div>\n\t\t-->\n\t\t</div>\n\t</div>\n</div>';});

(function() {
  var __hasProp = Object.prototype.hasOwnProperty;

  define('mylibs/customize/customize',['text!mylibs/customize/views/customize.html', 'libs/webgl/glfx.min'], function(template) {
    /*		Customize
    
    	Customize module deals with adding additional shaders to a taken image via sliders
    */
    var callback, customizeEffect, modal, oldImage, pub, texture, viewModel, webgl;
    modal = {};
    webgl = fx.canvas();
    oldImage = new Image();
    texture = {};
    callback = {};
    viewModel = kendo.observable({
      effects: {
        brightnessContrast: {
          filter: "brightnessContrast",
          brightness: {
            isParam: true,
            value: 0
          },
          contrast: {
            isParam: true,
            value: 0
          }
        },
        vignette: {
          filter: "vignette",
          size: {
            isParam: true,
            value: 0
          },
          amount: {
            isParam: true,
            value: 0
          }
        },
        hueSaturation: {
          filter: "hueSaturation",
          hue: {
            isParam: true,
            value: 0
          },
          saturation: {
            isParam: true,
            value: 0
          }
        },
        noise: {
          filter: "noise",
          noise: {
            isParam: true,
            value: 0
          }
        },
        denoise: {
          filter: "denoise",
          denoise: {
            isParam: true,
            value: 100
          }
        }
      },
      change: function() {
        var filter, filters, key, params, value, _i, _len, _ref;
        webgl.draw(texture);
        filters = [];
        _ref = viewModel.effects;
        for (key in _ref) {
          if (!__hasProp.call(_ref, key)) continue;
          value = _ref[key];
          if (viewModel.effects[key].filter) {
            filter = viewModel.effects[key];
            params = [];
            for (key in filter) {
              if (!__hasProp.call(filter, key)) continue;
              value = filter[key];
              if (filter[key].isParam) params.push(filter[key].value);
            }
            filters.push({
              name: filter.filter,
              params: params
            });
          }
        }
        for (_i = 0, _len = filters.length; _i < _len; _i++) {
          filter = filters[_i];
          webgl[filter.name].apply(webgl, filter.params);
        }
        return webgl.update();
      },
      yep: function() {
        callback(webgl.toDataURL());
        return modal.close();
      },
      nope: function() {
        return modal.close();
      },
      reset: function() {
        this.set("effects.brightnessContrast.brightness.value", 0);
        this.set("effects.brightnessContrast.contrast.value", 0);
        this.set("effects.vignette.size.value", 0);
        this.set("effects.vignette.amount.value", 0);
        this.set("effects.hueSaturation.hue.value", 0);
        this.set("effects.hueSaturation.saturation.value", 0);
        return this.set("effects.noise.noise.value", 0);
      }
    });
    customizeEffect = function(image, saveFunction) {
      viewModel.reset();
      oldImage.src = image.src;
      callback = saveFunction;
      texture = webgl.texture(oldImage);
      webgl.draw(texture).update();
      return modal.center().open();
    };
    return pub = {
      init: function() {
        var $content;
        $content = $(template);
        $.subscribe('/customize', function(sender, saveFunction) {
          return customizeEffect(sender, saveFunction);
        });
        $content.find(".canvas").append(webgl);
        modal = $content.kendoWindow({
          visible: false,
          modal: true,
          title: "",
          open: function() {
            return $.publish("/app/pause");
          },
          close: function() {
            return $.publish("/app/resume");
          },
          animation: {
            open: {
              effects: "slideIn:up fadeIn",
              duration: 500
            },
            close: {
              effects: "slide:up fadeOut",
              duration: 500
            }
          }
        }).data("kendoWindow");
        return kendo.bind($content, viewModel);
      }
    };
  });

}).call(this);

define('text!mylibs/share/views/share.html',[],function () { return '<div id="share">\n\t<div class="row dark">\n\t\t<div class="span6 brown">\n\t\t\t<div class="row centered no-margin">\n\t\t\t\t<div class="working"><h2>Sharing....</h2></div>\n\t\t\t\t<div class="actions">\n\t\t\t\t\t<button class="btn-twitter" data-bind="events: { click: tweet }"><img class="share-icon" src="images/icons/glyphicons_392_twitter.png" />Twitter</button>\n\t\t\t\t\t<button class="btn-google" data-bind="events: { click: google }"><img class="share-icon" src="images/icons/glyphicons_362_google+_alt.png" />Google+</button>\n\t\t\t\t</div>\n\t\t\t\t<div>\n\t\t\t\t\t<img id="imageToShare" width="460" data-bind="attr: { src: src }" />\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>';});

(function() {

  define('mylibs/share/share',['text!mylibs/share/views/share.html'], function(html) {
    /*		Share
    
    	Handles sharing of images
    */
    var $actions, $working, currentLink, links, modal, pub, share, viewModel;
    viewModel = kendo.observable({
      src: "images/placeholder.png",
      name: null,
      tweet: function() {
        return share(this.get("src"), "twitter");
      },
      google: function() {
        return share(this.get("src"), "google");
      }
    });
    modal = {};
    $actions = {};
    $working = {};
    links = [];
    currentLink = null;
    share = function(src, service) {
      $.publish("/postman/deliver", [
        {
          message: {
            image: src,
            link: currentLink
          }
        }, "/share/" + service
      ]);
      $actions.kendoStop(true).kendoAnimate({
        effects: "slide:down fadeOut",
        duration: 500,
        hide: true
      });
      return $working.kendoStop(true).kendoAnimate({
        effects: "slideIn:down fadeIn",
        duration: 500,
        show: true
      });
    };
    return pub = {
      init: function() {
        var $content;
        $.subscribe("/share/show", function(src, name) {
          var link, _i, _len;
          currentLink = null;
          for (_i = 0, _len = links.length; _i < _len; _i++) {
            link = links[_i];
            if (link.name === name) currentLink = link.link;
          }
          viewModel.set("src", src);
          viewModel.set("name", name);
          return modal.center().open();
        });
        $.subscribe("/share/success", function(message) {
          links.push({
            name: viewModel.name,
            link: message.link
          });
          currentLink = message.link;
          $working.kendoStop(true).kendoAnimate({
            effects: "slide:up fadeOut",
            duration: 500,
            hide: true
          });
          return $actions.kendoStop(true).kendoAnimate({
            effects: "slideIn:up fadeIn",
            duration: 500,
            show: true
          });
        });
        $content = $(html);
        $actions = $content.find(".actions");
        $working = $content.find(".working");
        modal = $content.kendoWindow({
          visible: true,
          modal: true,
          animation: {
            open: {
              effects: "slideIn:up fadeIn",
              duration: 500
            },
            close: {
              effects: "slide:up fadeOut",
              duration: 500
            }
          }
        }).data("kendoWindow");
        return kendo.bind($content, viewModel);
      }
    };
  });

}).call(this);

define('text!mylibs/pictures/views/picture.html',[],function () { return '<div class="snapshot box">\n\t<div class="wrap">\n\t\t<img class="picture" src="${ image }" width="180" />\n\t</div>\n\t<div class="actions">\n\t\t<div class="share">\n\t\t\t<a class="download pointer" rel="Download"><img src="images/icons/glyphicons_200_download.png" /></a>\n\t\t\t<a class="intent pointer" rel="Twitter"><img src="images/icons/glyphicons_326_share.png" /></a>\n\t\t\t<a class="stamp pointer" rel="Stamp"><img src="images/icons/glyphicons_092_stamp.png" /></a>\n\t\t</div>\n\t\t<div class="delete">\n\t\t\t<a class="trash pointer" rel="Trash"><img src="images/icons/glyphicons_016_bin.png" /></a>\n\t\t</div>\n\t</div>\n</div>';});

(function() {

  define('mylibs/pictures/pictures',['mylibs/share/share', 'text!mylibs/pictures/views/picture.html'], function(share, picture) {
    /*		Pictures
    
    	The pictures module handles the creation of the actual images and adding them
    	to the right-hand side of the app.  It also responds to all actions taken on images
    	by either clicking on the image itself, or on the action bar below each pic
    */
    var $container, create, pub;
    $container = {};
    create = function(message) {
      var $div, $img, callback, html, template;
      template = kendo.template(picture);
      html = template({
        image: message.image
      });
      $div = $(html);
      $img = $div.find(".picture");
      message.name = message.name || new Date().getTime() + ".png";
      callback = function() {
        $img.attr("src", arguments[0]);
        return $.publish("/postman/deliver", [
          {
            message: {
              name: message.name,
              image: arguments[0]
            }
          }, "/file/save"
        ]);
      };
      if (message.strip) {
        message.name = "p_" + message.name;
      } else {
        $img.addClass("pointer");
        $img.on("click", function() {
          return $.publish("/customize", [this, callback]);
        });
      }
      if (message.save) {
        $.publish("/postman/deliver", [
          {
            message: {
              name: message.name,
              image: message.image
            }
          }, "/file/save"
        ]);
      }
      $img.load(function() {
        return $container.masonry("reload");
      });
      $div.on("click", ".download", function() {
        return $.publish("/postman/deliver", [
          {
            message: {
              name: name,
              image: $img.attr("src")
            }
          }, "/file/download"
        ]);
      });
      $div.on("click", ".intent", function() {
        return $.publish("/share/show", [$img.attr("src"), message.name]);
      });
      $div.on("click", ".trash", function() {
        $.subscribe("/file/deleted/" + message.name, function() {
          $div.remove();
          $container.masonry("reload");
          return $.unsubscribe("file/deleted/" + message.name);
        });
        return $.publish("/postman/deliver", [
          {
            message: {
              name: message.name
            }
          }, "/file/delete"
        ]);
      });
      $div.on("click", ".stamp", function() {
        return $.publish("/stamp/show", [$img.attr("src"), callback]);
      });
      return $container.append($div);
    };
    return pub = {
      init: function(containerId) {
        $container = $("#" + containerId);
        $container.masonry({
          itemSelector: ".box"
        });
        $.subscribe("/pictures/reload", function() {
          return pub.reload();
        });
        $.subscribe("/pictures/create", function(message) {
          return create(message);
        });
        return $.subscribe("/pictures/bulk", function(message) {
          var file, _i, _len, _results;
          _results = [];
          for (_i = 0, _len = message.length; _i < _len; _i++) {
            file = message[_i];
            _results.push(create(file));
          }
          return _results;
        });
      }
    };
  });

}).call(this);

(function() {

  define('mylibs/utils/utils',[], function() {
    return {
      /*     Utils
      
      This file contains utility functions and normalizations. this used to contain more functions, but
      most have been moved into the extension
      */
      getAnimationFrame: function() {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback, element) {
          return window.setTimeout(callback, 1000 / 60);
        };
      }
    };
  });

}).call(this);

if (parallable === undefined) {
	var parallable = function (file, funct) {
		parallable.core[funct.toString()] = funct().core;
		return function () {
			var i;
			var async, worker_num, params;
			if (arguments.length > 1) {
				async = arguments[arguments.length - 2];
				worker_num = arguments[arguments.length - 1];
				params = new Array(arguments.length - 2);
				for (i = 0; i < arguments.length - 2; i++)
					params[i] = arguments[i];
			} else {
				async = arguments[0].async;
				worker_num = arguments[0].worker;
				params = arguments[0];
				delete params["async"];
				delete params["worker"];
				params = [params];
			}
			var scope = { "shared" : {} };
			var ctrl = funct.apply(scope, params);
			if (async) {
				return function (complete, error) {
					var executed = 0;
					var outputs = new Array(worker_num);
					var inputs = ctrl.pre.apply(scope, [worker_num]);
					/* sanitize scope shared because for Chrome/WebKit, worker only support JSONable data */
					for (i in scope.shared)
						/* delete function, if any */
						if (typeof scope.shared[i] == "function")
							delete scope.shared[i];
						/* delete DOM object, if any */
						else if (scope.shared[i].tagName !== undefined)
							delete scope.shared[i];
					for (i = 0; i < worker_num; i++) {
						var worker = new Worker(file);
						worker.onmessage = (function (i) {
							return function (event) {
								outputs[i] = (typeof event.data == "string") ? JSON.parse(event.data) : event.data;
								executed++;
								if (executed == worker_num)
									complete(ctrl.post.apply(scope, [outputs]));
							}
						})(i);
						var msg = { "input" : inputs[i],
									"name" : funct.toString(),
									"shared" : scope.shared,
									"id" : i,
									"worker" : params.worker_num };
						try {
							worker.postMessage(msg);
						} catch (e) {
							worker.postMessage(JSON.stringify(msg));
						}
					}
				}
			} else {
				return ctrl.post.apply(scope, [[ctrl.core.apply(scope, [ctrl.pre.apply(scope, [1])[0], 0, 1])]]);
			}
		}
	};
	parallable.core = {};
}

function get_named_arguments(params, names) {
	if (params.length > 1) {
		var new_params = {};
		for (var i = 0; i < names.length; i++)
			new_params[names[i]] = params[i];
		return new_params;
	} else if (params.length == 1) {
		return params[0];
	} else {
		return {};
	}
}

var ccv = {
	pre : function (image) {
		if (image.tagName.toLowerCase() == "img") {
			var canvas = document.createElement("canvas");
			document.body.appendChild(image);
			canvas.width = image.offsetWidth;
			canvas.style.width = image.offsetWidth.toString() + "px";
			canvas.height = image.offsetHeight;
			canvas.style.height = image.offsetHeight.toString() + "px";
			document.body.removeChild(image);
			var ctx = canvas.getContext("2d");
			ctx.drawImage(image, 0, 0);
			return canvas;
		}
		return image;
	},

	grayscale : function (canvas) {
		var ctx = canvas.getContext("2d");
		var imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
		var data = imageData.data;
		var pix1, pix2, pix = canvas.width * canvas.height * 4;
		while (pix > 0)
			data[pix -= 4] = data[pix1 = pix + 1] = data[pix2 = pix + 2] = (data[pix] * 0.3 + data[pix1] * 0.59 + data[pix2] * 0.11);
		ctx.putImageData(imageData, 0, 0);
		return canvas;
	},

	array_group : function (seq, gfunc) {
		var i, j;
		var node = new Array(seq.length);
		for (i = 0; i < seq.length; i++)
			node[i] = {"parent" : -1,
					   "element" : seq[i],
					   "rank" : 0};
		for (i = 0; i < seq.length; i++) {
			if (!node[i].element)
				continue;
			var root = i;
			while (node[root].parent != -1)
				root = node[root].parent;
			for (j = 0; j < seq.length; j++) {
				if( i != j && node[j].element && gfunc(node[i].element, node[j].element)) {
					var root2 = j;

					while (node[root2].parent != -1)
						root2 = node[root2].parent;

					if(root2 != root) {
						if(node[root].rank > node[root2].rank)
							node[root2].parent = root;
						else {
							node[root].parent = root2;
							if (node[root].rank == node[root2].rank)
							node[root2].rank++;
							root = root2;
						}

						/* compress path from node2 to the root: */
						var temp, node2 = j;
						while (node[node2].parent != -1) {
							temp = node2;
							node2 = node[node2].parent;
							node[temp].parent = root;
						}

						/* compress path from node to the root: */
						node2 = i;
						while (node[node2].parent != -1) {
							temp = node2;
							node2 = node[node2].parent;
							node[temp].parent = root;
						}
					}
				}
			}
		}
		var idx = new Array(seq.length);
		var class_idx = 0;
		for(i = 0; i < seq.length; i++) {
			j = -1;
			var node1 = i;
			if(node[node1].element) {
				while (node[node1].parent != -1)
					node1 = node[node1].parent;
				if(node[node1].rank >= 0)
					node[node1].rank = ~class_idx++;
				j = ~node[node1].rank;
			}
			idx[i] = j;
		}
		return {"index" : idx, "cat" : class_idx};
	},

	detect_objects : parallable("ccv.js", function (canvas, cascade, interval, min_neighbors) {
		if (this.shared !== undefined) {
			var params = get_named_arguments(arguments, ["canvas", "cascade", "interval", "min_neighbors"]);
			this.shared.canvas = params.canvas;
			this.shared.interval = params.interval;
			this.shared.min_neighbors = params.min_neighbors;
			this.shared.cascade = params.cascade;
			this.shared.scale = Math.pow(2, 1 / (params.interval + 1));
			this.shared.next = params.interval + 1;
			this.shared.scale_upto = Math.floor(Math.log(Math.min(params.canvas.width / params.cascade.width, params.canvas.height / params.cascade.height)) / Math.log(this.shared.scale));
			var i;
			for (i = 0; i < this.shared.cascade.stage_classifier.length; i++)
				this.shared.cascade.stage_classifier[i].orig_feature = this.shared.cascade.stage_classifier[i].feature;
		}
		function pre(worker_num) {
			var canvas = this.shared.canvas;
			var interval = this.shared.interval;
			var scale = this.shared.scale;
			var next = this.shared.next;
			var scale_upto = this.shared.scale_upto;
			var pyr = new Array((scale_upto + next * 2) * 4);
			var ret = new Array((scale_upto + next * 2) * 4);
			pyr[0] = canvas;
			ret[0] = { "width" : pyr[0].width,
					   "height" : pyr[0].height,
					   "data" : pyr[0].getContext("2d").getImageData(0, 0, pyr[0].width, pyr[0].height).data };
			var i;
			for (i = 1; i <= interval; i++) {
				pyr[i * 4] = document.createElement("canvas");
				pyr[i * 4].width = Math.floor(pyr[0].width / Math.pow(scale, i));
				pyr[i * 4].height = Math.floor(pyr[0].height / Math.pow(scale, i));
				pyr[i * 4].getContext("2d").drawImage(pyr[0], 0, 0, pyr[0].width, pyr[0].height, 0, 0, pyr[i * 4].width, pyr[i * 4].height);
				ret[i * 4] = { "width" : pyr[i * 4].width,
							   "height" : pyr[i * 4].height,
							   "data" : pyr[i * 4].getContext("2d").getImageData(0, 0, pyr[i * 4].width, pyr[i * 4].height).data };
			}
			for (i = next; i < scale_upto + next * 2; i++) {
				pyr[i * 4] = document.createElement("canvas");
				pyr[i * 4].width = Math.floor(pyr[i * 4 - next * 4].width / 2);
				pyr[i * 4].height = Math.floor(pyr[i * 4 - next * 4].height / 2);
				pyr[i * 4].getContext("2d").drawImage(pyr[i * 4 - next * 4], 0, 0, pyr[i * 4 - next * 4].width, pyr[i * 4 - next * 4].height, 0, 0, pyr[i * 4].width, pyr[i * 4].height);
				ret[i * 4] = { "width" : pyr[i * 4].width,
							   "height" : pyr[i * 4].height,
							   "data" : pyr[i * 4].getContext("2d").getImageData(0, 0, pyr[i * 4].width, pyr[i * 4].height).data };
			}
			for (i = next * 2; i < scale_upto + next * 2; i++) {
				pyr[i * 4 + 1] = document.createElement("canvas");
				pyr[i * 4 + 1].width = Math.floor(pyr[i * 4 - next * 4].width / 2);
				pyr[i * 4 + 1].height = Math.floor(pyr[i * 4 - next * 4].height / 2);
				pyr[i * 4 + 1].getContext("2d").drawImage(pyr[i * 4 - next * 4], 1, 0, pyr[i * 4 - next * 4].width - 1, pyr[i * 4 - next * 4].height, 0, 0, pyr[i * 4 + 1].width - 2, pyr[i * 4 + 1].height);
				ret[i * 4 + 1] = { "width" : pyr[i * 4 + 1].width,
								   "height" : pyr[i * 4 + 1].height,
								   "data" : pyr[i * 4 + 1].getContext("2d").getImageData(0, 0, pyr[i * 4 + 1].width, pyr[i * 4 + 1].height).data };
				pyr[i * 4 + 2] = document.createElement("canvas");
				pyr[i * 4 + 2].width = Math.floor(pyr[i * 4 - next * 4].width / 2);
				pyr[i * 4 + 2].height = Math.floor(pyr[i * 4 - next * 4].height / 2);
				pyr[i * 4 + 2].getContext("2d").drawImage(pyr[i * 4 - next * 4], 0, 1, pyr[i * 4 - next * 4].width, pyr[i * 4 - next * 4].height - 1, 0, 0, pyr[i * 4 + 2].width, pyr[i * 4 + 2].height - 2);
				ret[i * 4 + 2] = { "width" : pyr[i * 4 + 2].width,
								   "height" : pyr[i * 4 + 2].height,
								   "data" : pyr[i * 4 + 2].getContext("2d").getImageData(0, 0, pyr[i * 4 + 2].width, pyr[i * 4 + 2].height).data };
				pyr[i * 4 + 3] = document.createElement("canvas");
				pyr[i * 4 + 3].width = Math.floor(pyr[i * 4 - next * 4].width / 2);
				pyr[i * 4 + 3].height = Math.floor(pyr[i * 4 - next * 4].height / 2);
				pyr[i * 4 + 3].getContext("2d").drawImage(pyr[i * 4 - next * 4], 1, 1, pyr[i * 4 - next * 4].width - 1, pyr[i * 4 - next * 4].height - 1, 0, 0, pyr[i * 4 + 3].width - 2, pyr[i * 4 + 3].height - 2);
				ret[i * 4 + 3] = { "width" : pyr[i * 4 + 3].width,
								   "height" : pyr[i * 4 + 3].height,
								   "data" : pyr[i * 4 + 3].getContext("2d").getImageData(0, 0, pyr[i * 4 + 3].width, pyr[i * 4 + 3].height).data };
			}
			return [ret];
		};

		function core(pyr, id, worker_num) {
			var cascade = this.shared.cascade;
			var interval = this.shared.interval;
			var scale = this.shared.scale;
			var next = this.shared.next;
			var scale_upto = this.shared.scale_upto;
			var i, j, k, x, y, q;
			var scale_x = 1, scale_y = 1;
			var dx = [0, 1, 0, 1];
			var dy = [0, 0, 1, 1];
			var seq = [];
			for (i = 0; i < scale_upto; i++) {
				var qw = pyr[i * 4 + next * 8].width - Math.floor(cascade.width / 4);
				var qh = pyr[i * 4 + next * 8].height - Math.floor(cascade.height / 4);
				var step = [pyr[i * 4].width * 4, pyr[i * 4 + next * 4].width * 4, pyr[i * 4 + next * 8].width * 4];
				var paddings = [pyr[i * 4].width * 16 - qw * 16,
								pyr[i * 4 + next * 4].width * 8 - qw * 8,
								pyr[i * 4 + next * 8].width * 4 - qw * 4];
				for (j = 0; j < cascade.stage_classifier.length; j++) {
					var orig_feature = cascade.stage_classifier[j].orig_feature;
					var feature = cascade.stage_classifier[j].feature = new Array(cascade.stage_classifier[j].count);
					for (k = 0; k < cascade.stage_classifier[j].count; k++) {
						feature[k] = {"size" : orig_feature[k].size,
									  "px" : new Array(orig_feature[k].size),
									  "pz" : new Array(orig_feature[k].size),
									  "nx" : new Array(orig_feature[k].size),
									  "nz" : new Array(orig_feature[k].size)};
						for (q = 0; q < orig_feature[k].size; q++) {
							feature[k].px[q] = orig_feature[k].px[q] * 4 + orig_feature[k].py[q] * step[orig_feature[k].pz[q]];
							feature[k].pz[q] = orig_feature[k].pz[q];
							feature[k].nx[q] = orig_feature[k].nx[q] * 4 + orig_feature[k].ny[q] * step[orig_feature[k].nz[q]];
							feature[k].nz[q] = orig_feature[k].nz[q];
						}
					}
				}
				for (q = 0; q < 4; q++) {
					var u8 = [pyr[i * 4].data, pyr[i * 4 + next * 4].data, pyr[i * 4 + next * 8 + q].data];
					var u8o = [dx[q] * 8 + dy[q] * pyr[i * 4].width * 8, dx[q] * 4 + dy[q] * pyr[i * 4 + next * 4].width * 4, 0];
					for (y = 0; y < qh; y++) {
						for (x = 0; x < qw; x++) {
							var sum = 0;
							var flag = true;
							for (j = 0; j < cascade.stage_classifier.length; j++) {
								sum = 0;
								var alpha = cascade.stage_classifier[j].alpha;
								var feature = cascade.stage_classifier[j].feature;
								for (k = 0; k < cascade.stage_classifier[j].count; k++) {
									var feature_k = feature[k];
									var p, pmin = u8[feature_k.pz[0]][u8o[feature_k.pz[0]] + feature_k.px[0]];
									var n, nmax = u8[feature_k.nz[0]][u8o[feature_k.nz[0]] + feature_k.nx[0]];
									if (pmin <= nmax) {
										sum += alpha[k * 2];
									} else {
										var f, shortcut = true;
										for (f = 0; f < feature_k.size; f++) {
											if (feature_k.pz[f] >= 0) {
												p = u8[feature_k.pz[f]][u8o[feature_k.pz[f]] + feature_k.px[f]];
												if (p < pmin) {
													if (p <= nmax) {
														shortcut = false;
														break;
													}
													pmin = p;
												}
											}
											if (feature_k.nz[f] >= 0) {
												n = u8[feature_k.nz[f]][u8o[feature_k.nz[f]] + feature_k.nx[f]];
												if (n > nmax) {
													if (pmin <= n) {
														shortcut = false;
														break;
													}
													nmax = n;
												}
											}
										}
										sum += (shortcut) ? alpha[k * 2 + 1] : alpha[k * 2];
									}
								}
								if (sum < cascade.stage_classifier[j].threshold) {
									flag = false;
									break;
								}
							}
							if (flag) {
								seq.push({"x" : (x * 4 + dx[q] * 2) * scale_x,
										  "y" : (y * 4 + dy[q] * 2) * scale_y,
										  "width" : cascade.width * scale_x,
										  "height" : cascade.height * scale_y,
										  "neighbor" : 1,
										  "confidence" : sum});
							}
							u8o[0] += 16;
							u8o[1] += 8;
							u8o[2] += 4;
						}
						u8o[0] += paddings[0];
						u8o[1] += paddings[1];
						u8o[2] += paddings[2];
					}
				}
				scale_x *= scale;
				scale_y *= scale;
			}
			return seq;
		};

		function post(seq) {
			var min_neighbors = this.shared.min_neighbors;
			var cascade = this.shared.cascade;
			var interval = this.shared.interval;
			var scale = this.shared.scale;
			var next = this.shared.next;
			var scale_upto = this.shared.scale_upto;
			var i, j;
			for (i = 0; i < cascade.stage_classifier.length; i++)
				cascade.stage_classifier[i].feature = cascade.stage_classifier[i].orig_feature;
			seq = seq[0];
			if (!(min_neighbors > 0))
				return seq;
			else {
				var result = ccv.array_group(seq, function (r1, r2) {
					var distance = Math.floor(r1.width * 0.25 + 0.5);

					return r2.x <= r1.x + distance &&
						   r2.x >= r1.x - distance &&
						   r2.y <= r1.y + distance &&
						   r2.y >= r1.y - distance &&
						   r2.width <= Math.floor(r1.width * 1.5 + 0.5) &&
						   Math.floor(r2.width * 1.5 + 0.5) >= r1.width;
				});
				var ncomp = result.cat;
				var idx_seq = result.index;
				var comps = new Array(ncomp + 1);
				for (i = 0; i < comps.length; i++)
					comps[i] = {"neighbors" : 0,
								"x" : 0,
								"y" : 0,
								"width" : 0,
								"height" : 0,
								"confidence" : 0};

				// count number of neighbors
				for(i = 0; i < seq.length; i++)
				{
					var r1 = seq[i];
					var idx = idx_seq[i];

					if (comps[idx].neighbors == 0)
						comps[idx].confidence = r1.confidence;

					++comps[idx].neighbors;

					comps[idx].x += r1.x;
					comps[idx].y += r1.y;
					comps[idx].width += r1.width;
					comps[idx].height += r1.height;
					comps[idx].confidence = Math.max(comps[idx].confidence, r1.confidence);
				}

				var seq2 = [];
				// calculate average bounding box
				for(i = 0; i < ncomp; i++)
				{
					var n = comps[i].neighbors;
					if (n >= min_neighbors)
						seq2.push({"x" : (comps[i].x * 2 + n) / (2 * n),
								   "y" : (comps[i].y * 2 + n) / (2 * n),
								   "width" : (comps[i].width * 2 + n) / (2 * n),
								   "height" : (comps[i].height * 2 + n) / (2 * n),
								   "neighbors" : comps[i].neighbors,
								   "confidence" : comps[i].confidence});
				}

				var result_seq = [];
				// filter out small face rectangles inside large face rectangles
				for(i = 0; i < seq2.length; i++)
				{
					var r1 = seq2[i];
					var flag = true;
					for(j = 0; j < seq2.length; j++)
					{
						var r2 = seq2[j];
						var distance = Math.floor(r2.width * 0.25 + 0.5);

						if(i != j &&
						   r1.x >= r2.x - distance &&
						   r1.y >= r2.y - distance &&
						   r1.x + r1.width <= r2.x + r2.width + distance &&
						   r1.y + r1.height <= r2.y + r2.height + distance &&
						   (r2.neighbors > Math.max(3, r1.neighbors) || r1.neighbors < 3))
						{
							flag = false;
							break;
						}
					}

					if(flag)
						result_seq.push(r1);
				}
				return result_seq;
			}
		};
		return { "pre" : pre, "core" : core, "post" : post };
	})
}
;
define("libs/face/ccv", function(){});

var cascade = {"count" : 16, "width" : 24, "height" : 24, "stage_classifier" : [{"count":4,"threshold":-4.577530e+00,"feature":[{"size":4,"px":[3,5,8,11],"py":[2,2,6,3],"pz":[2,1,1,0],"nx":[8,4,0,0],"ny":[4,4,0,0],"nz":[1,1,-1,-1]},{"size":3,"px":[3,6,7],"py":[7,13,0],"pz":[1,0,-1],"nx":[2,3,4],"ny":[5,4,4],"nz":[2,1,1]},{"size":5,"px":[5,3,10,13,11],"py":[1,0,3,2,2],"pz":[1,2,0,0,0],"nx":[0,11,0,11,11],"ny":[0,2,3,1,1],"nz":[1,1,0,1,-1]},{"size":5,"px":[6,12,12,9,12],"py":[4,13,12,7,11],"pz":[1,0,0,1,0],"nx":[8,0,8,2,11],"ny":[4,0,8,5,1],"nz":[1,-1,-1,-1,-1]}],"alpha":[-2.879683e+00,2.879683e+00,-1.569341e+00,1.569341e+00,-1.286131e+00,1.286131e+00,-1.157626e+00,1.157626e+00]},{"count":4,"threshold":-4.339908e+00,"feature":[{"size":5,"px":[13,12,3,11,17],"py":[3,3,1,4,13],"pz":[0,0,2,0,0],"nx":[4,3,8,15,15],"ny":[4,5,4,8,8],"nz":[1,2,1,0,-1]},{"size":5,"px":[6,7,6,3,3],"py":[13,13,4,2,7],"pz":[0,0,1,2,1],"nx":[4,8,3,0,15],"ny":[4,4,4,3,8],"nz":[1,1,-1,-1,-1]},{"size":3,"px":[2,2,11],"py":[3,2,5],"pz":[2,2,0],"nx":[3,8,3],"ny":[4,4,4],"nz":[1,-1,-1]},{"size":5,"px":[15,13,9,11,7],"py":[2,1,2,1,0],"pz":[0,0,0,0,1],"nx":[23,11,23,22,23],"ny":[1,0,2,0,0],"nz":[0,1,0,0,0]}],"alpha":[-2.466029e+00,2.466029e+00,-1.839510e+00,1.839510e+00,-1.060559e+00,1.060559e+00,-1.094927e+00,1.094927e+00]},{"count":7,"threshold":-5.052474e+00,"feature":[{"size":5,"px":[17,13,3,11,10],"py":[13,2,1,4,3],"pz":[0,0,2,0,0],"nx":[4,8,8,3,7],"ny":[2,8,4,5,4],"nz":[2,0,1,2,1]},{"size":5,"px":[6,7,3,6,6],"py":[4,12,2,13,14],"pz":[1,0,2,0,0],"nx":[8,3,4,4,3],"ny":[4,4,2,0,2],"nz":[1,1,-1,-1,-1]},{"size":5,"px":[7,4,5,3,3],"py":[2,1,3,1,1],"pz":[0,1,0,1,-1],"nx":[1,0,1,1,0],"ny":[1,3,2,0,4],"nz":[0,0,0,0,0]},{"size":5,"px":[11,11,11,3,2],"py":[11,13,10,7,2],"pz":[0,0,0,1,2],"nx":[4,1,8,2,0],"ny":[4,1,12,0,4],"nz":[1,-1,-1,-1,-1]},{"size":3,"px":[9,13,1],"py":[7,19,4],"pz":[1,-1,-1],"nx":[4,7,4],"ny":[5,8,2],"nz":[2,1,2]},{"size":5,"px":[12,8,16,4,4],"py":[12,1,2,0,0],"pz":[0,1,0,2,-1],"nx":[11,22,11,23,23],"ny":[2,0,1,1,5],"nz":[1,0,1,0,0]},{"size":3,"px":[11,17,17],"py":[6,11,12],"pz":[0,0,0],"nx":[15,1,11],"ny":[9,1,1],"nz":[0,-1,-1]}],"alpha":[-2.156890e+00,2.156890e+00,-1.718246e+00,1.718246e+00,-9.651329e-01,9.651329e-01,-9.948090e-01,9.948090e-01,-8.802466e-01,8.802466e-01,-8.486741e-01,8.486741e-01,-8.141777e-01,8.141777e-01]},{"count":13,"threshold":-5.774400e+00,"feature":[{"size":5,"px":[6,10,3,12,14],"py":[5,3,1,2,2],"pz":[1,0,2,0,0],"nx":[3,4,14,8,4],"ny":[5,4,8,4,2],"nz":[2,1,0,1,2]},{"size":5,"px":[10,6,11,5,12],"py":[4,13,4,2,4],"pz":[0,0,0,1,0],"nx":[1,4,8,1,1],"ny":[2,4,4,4,3],"nz":[0,1,1,0,0]},{"size":3,"px":[18,6,12],"py":[12,4,8],"pz":[0,1,0],"nx":[7,4,8],"ny":[4,2,4],"nz":[1,-1,-1]},{"size":5,"px":[7,5,6,3,17],"py":[13,12,3,8,13],"pz":[0,0,1,1,0],"nx":[3,3,0,1,8],"ny":[4,5,5,10,4],"nz":[1,-1,-1,-1,-1]},{"size":5,"px":[16,7,16,7,7],"py":[1,1,2,0,0],"pz":[0,1,0,1,-1],"nx":[23,23,23,11,5],"ny":[2,14,1,2,1],"nz":[0,0,0,1,2]},{"size":3,"px":[9,18,16],"py":[7,14,2],"pz":[1,0,-1],"nx":[8,4,9],"ny":[10,2,4],"nz":[1,2,1]},{"size":4,"px":[3,16,1,22],"py":[7,4,5,11],"pz":[1,-1,-1,-1],"nx":[3,9,4,2],"ny":[4,9,7,5],"nz":[1,0,1,2]},{"size":5,"px":[4,7,8,8,9],"py":[0,2,2,1,1],"pz":[1,0,0,0,0],"nx":[0,0,1,0,0],"ny":[15,16,19,0,14],"nz":[0,0,0,1,0]},{"size":5,"px":[4,4,7,8,12],"py":[2,5,6,7,10],"pz":[2,2,1,1,0],"nx":[8,5,10,0,0],"ny":[4,2,5,3,14],"nz":[1,-1,-1,-1,-1]},{"size":2,"px":[11,0],"py":[13,4],"pz":[0,-1],"nx":[3,14],"ny":[4,16],"nz":[1,0]},{"size":5,"px":[17,8,18,4,4],"py":[3,1,3,0,0],"pz":[0,1,0,2,-1],"nx":[21,22,5,11,22],"ny":[0,1,0,1,2],"nz":[0,0,2,1,0]},{"size":4,"px":[7,8,2,11],"py":[13,12,2,7],"pz":[0,0,2,0],"nx":[4,0,23,3],"ny":[4,1,1,11],"nz":[1,-1,-1,-1]},{"size":5,"px":[4,18,8,9,15],"py":[4,16,7,7,23],"pz":[2,0,1,1,0],"nx":[0,1,1,1,1],"ny":[10,21,23,22,22],"nz":[1,0,0,0,-1]}],"alpha":[-1.956565e+00,1.956565e+00,-1.262438e+00,1.262438e+00,-1.056941e+00,1.056941e+00,-9.712509e-01,9.712509e-01,-8.261028e-01,8.261028e-01,-8.456506e-01,8.456506e-01,-6.652113e-01,6.652113e-01,-6.026287e-01,6.026287e-01,-6.915425e-01,6.915425e-01,-5.539286e-01,5.539286e-01,-5.515072e-01,5.515072e-01,-6.685884e-01,6.685884e-01,-4.656070e-01,4.656070e-01]},{"count":20,"threshold":-5.606853e+00,"feature":[{"size":5,"px":[17,11,6,14,9],"py":[13,4,4,3,3],"pz":[0,0,1,0,0],"nx":[14,4,8,7,8],"ny":[8,4,4,4,8],"nz":[0,1,1,1,0]},{"size":5,"px":[3,9,10,11,11],"py":[7,2,2,3,3],"pz":[1,0,0,0,-1],"nx":[3,8,4,2,5],"ny":[4,4,10,2,8],"nz":[1,1,1,2,1]},{"size":5,"px":[12,12,12,5,12],"py":[12,9,10,12,11],"pz":[0,0,0,0,0],"nx":[0,0,0,0,0],"ny":[2,1,3,0,0],"nz":[0,0,0,0,-1]},{"size":5,"px":[9,18,9,9,12],"py":[7,14,19,5,11],"pz":[1,-1,-1,-1,-1],"nx":[23,4,23,23,8],"ny":[13,5,14,16,4],"nz":[0,2,0,0,1]},{"size":5,"px":[12,12,12,6,1],"py":[13,11,12,6,5],"pz":[0,0,0,-1,-1],"nx":[4,6,8,4,9],"ny":[2,8,4,4,4],"nz":[2,1,1,1,1]},{"size":4,"px":[12,11,11,6],"py":[5,5,6,13],"pz":[0,0,0,0],"nx":[8,3,2,8],"ny":[4,4,17,2],"nz":[1,1,-1,-1]},{"size":5,"px":[3,14,12,15,13],"py":[0,2,2,2,2],"pz":[2,0,0,0,0],"nx":[22,23,22,23,7],"ny":[0,3,1,2,4],"nz":[0,0,0,0,1]},{"size":5,"px":[16,15,18,19,9],"py":[12,11,12,12,9],"pz":[0,0,0,0,1],"nx":[8,2,22,23,21],"ny":[4,1,1,2,20],"nz":[1,-1,-1,-1,-1]},{"size":3,"px":[4,7,7],"py":[0,2,2],"pz":[1,0,-1],"nx":[1,2,2],"ny":[2,0,2],"nz":[1,0,0]},{"size":3,"px":[4,11,11],"py":[6,9,8],"pz":[1,0,0],"nx":[9,2,8],"ny":[9,4,5],"nz":[0,-1,-1]},{"size":4,"px":[2,7,6,6],"py":[4,23,21,22],"pz":[2,0,0,0],"nx":[9,3,8,17],"ny":[21,2,5,1],"nz":[0,-1,-1,-1]},{"size":2,"px":[2,8],"py":[4,12],"pz":[2,0],"nx":[3,0],"ny":[4,4],"nz":[1,-1]},{"size":5,"px":[4,5,1,8,4],"py":[15,12,3,23,12],"pz":[0,0,2,0,0],"nx":[0,0,0,0,0],"ny":[23,10,22,21,11],"nz":[0,1,0,0,-1]},{"size":2,"px":[21,5],"py":[13,4],"pz":[0,2],"nx":[23,4],"ny":[23,5],"nz":[0,-1]},{"size":2,"px":[15,17],"py":[2,3],"pz":[0,0],"nx":[19,20],"ny":[2,1],"nz":[0,0]},{"size":5,"px":[12,1,8,17,4],"py":[14,2,13,6,12],"pz":[0,-1,-1,-1,-1],"nx":[8,13,15,15,7],"ny":[10,9,15,14,8],"nz":[1,0,0,0,1]},{"size":2,"px":[8,5],"py":[7,4],"pz":[1,-1],"nx":[4,13],"ny":[2,21],"nz":[2,0]},{"size":2,"px":[3,4],"py":[7,0],"pz":[1,-1],"nx":[4,2],"ny":[7,5],"nz":[1,2]},{"size":4,"px":[4,14,3,11],"py":[3,23,2,5],"pz":[2,0,2,0],"nx":[7,8,2,16],"ny":[8,0,1,15],"nz":[0,-1,-1,-1]},{"size":2,"px":[9,8],"py":[0,0],"pz":[0,0],"nx":[2,2],"ny":[3,5],"nz":[2,2]}],"alpha":[-1.957970e+00,1.957970e+00,-1.225984e+00,1.225984e+00,-8.310246e-01,8.310246e-01,-8.315741e-01,8.315741e-01,-7.973616e-01,7.973616e-01,-7.661959e-01,7.661959e-01,-6.042118e-01,6.042118e-01,-6.506833e-01,6.506833e-01,-4.808219e-01,4.808219e-01,-6.079504e-01,6.079504e-01,-5.163994e-01,5.163994e-01,-5.268142e-01,5.268142e-01,-4.935685e-01,4.935685e-01,-4.427544e-01,4.427544e-01,-4.053949e-01,4.053949e-01,-4.701274e-01,4.701274e-01,-4.387648e-01,4.387648e-01,-4.305499e-01,4.305499e-01,-4.042607e-01,4.042607e-01,-4.372088e-01,4.372088e-01]},{"count":22,"threshold":-5.679317e+00,"feature":[{"size":5,"px":[11,3,17,14,13],"py":[4,0,13,2,3],"pz":[0,2,0,0,0],"nx":[7,4,14,23,11],"ny":[8,4,8,4,0],"nz":[1,1,0,0,1]},{"size":5,"px":[7,12,6,12,12],"py":[12,8,3,10,9],"pz":[0,0,1,0,0],"nx":[4,9,8,15,15],"ny":[4,8,4,8,8],"nz":[1,0,1,0,-1]},{"size":3,"px":[4,2,10],"py":[1,4,1],"pz":[1,2,0],"nx":[2,3,8],"ny":[5,4,4],"nz":[2,1,-1]},{"size":5,"px":[3,17,6,6,16],"py":[2,12,4,14,12],"pz":[2,0,1,0,0],"nx":[8,3,7,5,15],"ny":[4,4,4,4,8],"nz":[1,1,-1,-1,-1]},{"size":5,"px":[5,6,7,4,8],"py":[3,3,3,1,3],"pz":[0,0,0,1,0],"nx":[0,0,0,0,1],"ny":[5,4,3,2,0],"nz":[0,0,0,0,0]},{"size":3,"px":[18,9,0],"py":[14,7,0],"pz":[0,1,-1],"nx":[8,14,8],"ny":[10,9,4],"nz":[1,0,1]},{"size":2,"px":[9,5],"py":[18,13],"pz":[0,0],"nx":[10,3],"ny":[16,4],"nz":[0,-1]},{"size":5,"px":[11,11,11,11,6],"py":[10,12,11,13,6],"pz":[0,0,0,0,-1],"nx":[5,21,22,22,22],"ny":[4,22,17,19,18],"nz":[2,0,0,0,0]},{"size":4,"px":[8,9,15,4],"py":[7,7,23,4],"pz":[1,1,0,2],"nx":[8,5,0,3],"ny":[4,18,4,9],"nz":[1,-1,-1,-1]},{"size":5,"px":[11,10,12,11,11],"py":[4,4,4,5,5],"pz":[0,0,0,0,-1],"nx":[4,6,8,2,8],"ny":[4,9,9,2,4],"nz":[1,1,0,2,1]},{"size":5,"px":[2,2,3,3,4],"py":[10,9,14,13,15],"pz":[1,1,0,0,0],"nx":[0,0,0,0,0],"ny":[5,9,10,19,18],"nz":[2,1,1,0,-1]},{"size":2,"px":[11,11],"py":[13,12],"pz":[0,0],"nx":[9,2],"ny":[15,2],"nz":[0,-1]},{"size":5,"px":[2,4,3,3,4],"py":[5,11,6,9,12],"pz":[1,0,1,0,0],"nx":[6,2,11,11,0],"ny":[9,1,5,20,18],"nz":[0,-1,-1,-1,-1]},{"size":5,"px":[18,9,17,19,16],"py":[2,0,2,2,1],"pz":[0,1,0,0,0],"nx":[22,23,11,23,23],"ny":[0,2,0,1,1],"nz":[0,0,1,0,-1]},{"size":5,"px":[5,5,6,7,6],"py":[17,16,15,23,22],"pz":[0,0,0,0,0],"nx":[7,6,2,5,23],"ny":[8,1,2,3,1],"nz":[0,-1,-1,-1,-1]},{"size":5,"px":[12,12,11,10,6],"py":[14,13,18,4,22],"pz":[0,-1,-1,-1,-1],"nx":[3,2,4,1,2],"ny":[19,4,23,13,16],"nz":[0,0,0,0,0]},{"size":4,"px":[11,16,11,17],"py":[7,11,8,12],"pz":[0,0,0,0],"nx":[7,14,10,4],"ny":[4,7,10,4],"nz":[1,0,-1,-1]},{"size":2,"px":[3,3],"py":[8,7],"pz":[1,1],"nx":[4,2],"ny":[10,2],"nz":[1,-1]},{"size":2,"px":[3,9],"py":[0,1],"pz":[1,0],"nx":[4,5],"ny":[1,0],"nz":[0,0]},{"size":2,"px":[14,16],"py":[3,3],"pz":[0,0],"nx":[9,14],"ny":[4,21],"nz":[1,0]},{"size":2,"px":[9,1],"py":[7,1],"pz":[1,-1],"nx":[8,9],"ny":[7,4],"nz":[1,1]},{"size":2,"px":[1,0],"py":[8,3],"pz":[0,2],"nx":[20,0],"ny":[3,3],"nz":[0,-1]}],"alpha":[-1.581077e+00,1.581077e+00,-1.389689e+00,1.389689e+00,-8.733094e-01,8.733094e-01,-8.525177e-01,8.525177e-01,-7.416304e-01,7.416304e-01,-6.609002e-01,6.609002e-01,-7.119043e-01,7.119043e-01,-6.204438e-01,6.204438e-01,-6.638519e-01,6.638519e-01,-5.518876e-01,5.518876e-01,-4.898991e-01,4.898991e-01,-5.508243e-01,5.508243e-01,-4.635525e-01,4.635525e-01,-5.163159e-01,5.163159e-01,-4.495338e-01,4.495338e-01,-4.515036e-01,4.515036e-01,-5.130473e-01,5.130473e-01,-4.694233e-01,4.694233e-01,-4.022514e-01,4.022514e-01,-4.055690e-01,4.055690e-01,-4.151817e-01,4.151817e-01,-3.352302e-01,3.352302e-01]},{"count":32,"threshold":-5.363782e+00,"feature":[{"size":5,"px":[12,9,6,8,14],"py":[4,2,13,3,3],"pz":[0,0,0,0,0],"nx":[0,15,0,9,5],"ny":[2,7,3,8,8],"nz":[0,0,0,0,1]},{"size":5,"px":[13,16,3,6,11],"py":[3,13,1,4,3],"pz":[0,0,2,1,0],"nx":[7,4,8,14,14],"ny":[4,4,4,8,8],"nz":[1,1,1,0,-1]},{"size":5,"px":[10,19,18,19,19],"py":[6,13,13,12,12],"pz":[1,0,0,0,-1],"nx":[23,5,23,23,11],"ny":[12,2,13,14,8],"nz":[0,2,0,0,1]},{"size":5,"px":[12,12,12,12,6],"py":[11,13,12,10,6],"pz":[0,0,0,0,1],"nx":[6,8,3,9,9],"ny":[8,4,4,4,4],"nz":[1,1,1,1,-1]},{"size":5,"px":[5,3,5,8,11],"py":[12,8,3,11,8],"pz":[0,1,1,0,0],"nx":[4,0,1,1,9],"ny":[4,3,4,3,4],"nz":[1,-1,-1,-1,-1]},{"size":5,"px":[13,3,12,14,12],"py":[1,0,1,2,3],"pz":[0,2,0,0,0],"nx":[7,9,8,4,4],"ny":[5,4,10,2,2],"nz":[1,1,1,2,-1]},{"size":5,"px":[18,16,12,15,8],"py":[12,23,7,11,8],"pz":[0,0,0,0,1],"nx":[8,6,10,12,4],"ny":[4,4,10,6,3],"nz":[1,-1,-1,-1,-1]},{"size":5,"px":[4,4,5,2,2],"py":[13,14,14,7,7],"pz":[0,0,0,1,-1],"nx":[0,0,0,0,1],"ny":[15,4,14,13,17],"nz":[0,2,0,0,0]},{"size":2,"px":[9,9],"py":[7,7],"pz":[1,-1],"nx":[4,7],"ny":[5,8],"nz":[2,1]},{"size":5,"px":[3,4,6,5,4],"py":[2,2,14,6,9],"pz":[1,1,0,1,1],"nx":[23,23,23,23,11],"ny":[0,3,2,1,0],"nz":[0,0,0,0,-1]},{"size":3,"px":[10,2,3],"py":[23,4,7],"pz":[0,2,1],"nx":[10,21,23],"ny":[21,9,2],"nz":[0,-1,-1]},{"size":5,"px":[20,21,21,10,12],"py":[13,12,8,8,12],"pz":[0,0,0,1,0],"nx":[8,16,3,3,11],"ny":[4,8,4,3,0],"nz":[1,-1,-1,-1,-1]},{"size":2,"px":[2,21],"py":[4,12],"pz":[2,-1],"nx":[2,3],"ny":[5,4],"nz":[2,1]},{"size":5,"px":[8,5,6,8,7],"py":[0,2,1,1,1],"pz":[0,0,0,0,0],"nx":[3,2,2,2,2],"ny":[0,0,1,2,2],"nz":[0,0,0,0,-1]},{"size":5,"px":[11,2,2,11,10],"py":[10,12,8,11,12],"pz":[0,0,0,0,0],"nx":[3,5,2,4,2],"ny":[4,1,4,2,2],"nz":[1,-1,-1,-1,-1]},{"size":4,"px":[15,16,8,17],"py":[2,1,0,2],"pz":[0,0,1,0],"nx":[19,20,0,8],"ny":[1,2,11,10],"nz":[0,0,-1,-1]},{"size":2,"px":[17,16],"py":[12,12],"pz":[0,0],"nx":[8,9],"ny":[5,1],"nz":[1,-1]},{"size":4,"px":[11,11,0,0],"py":[12,13,0,0],"pz":[0,0,-1,-1],"nx":[10,10,9,10],"ny":[10,12,13,11],"nz":[0,0,0,0]},{"size":3,"px":[11,10,8],"py":[5,2,6],"pz":[0,-1,-1],"nx":[8,12,4],"ny":[4,17,4],"nz":[1,0,1]},{"size":5,"px":[10,21,10,20,20],"py":[11,13,7,13,14],"pz":[1,0,1,0,0],"nx":[23,23,11,23,17],"ny":[23,22,11,21,21],"nz":[0,0,1,-1,-1]},{"size":2,"px":[4,7],"py":[3,9],"pz":[2,1],"nx":[9,23],"ny":[4,22],"nz":[1,-1]},{"size":4,"px":[3,2,2,5],"py":[11,5,4,20],"pz":[1,2,2,0],"nx":[4,23,11,23],"ny":[10,22,11,21],"nz":[1,-1,-1,-1]},{"size":2,"px":[7,5],"py":[13,4],"pz":[0,-1],"nx":[4,4],"ny":[8,6],"nz":[1,1]},{"size":2,"px":[2,5],"py":[4,9],"pz":[2,1],"nx":[10,10],"ny":[16,16],"nz":[0,-1]},{"size":2,"px":[4,2],"py":[6,3],"pz":[1,2],"nx":[3,0],"ny":[4,0],"nz":[1,-1]},{"size":5,"px":[7,3,12,13,6],"py":[11,5,23,23,7],"pz":[1,2,0,0,1],"nx":[1,0,0,0,0],"ny":[23,20,19,21,21],"nz":[0,0,0,0,-1]},{"size":5,"px":[0,0,0,0,0],"py":[10,9,6,13,13],"pz":[0,0,1,0,-1],"nx":[8,8,4,4,9],"ny":[4,11,5,4,5],"nz":[1,1,2,2,1]},{"size":2,"px":[9,18],"py":[8,15],"pz":[1,0],"nx":[15,4],"ny":[15,2],"nz":[0,-1]},{"size":2,"px":[5,13],"py":[6,17],"pz":[1,-1],"nx":[1,2],"ny":[2,4],"nz":[2,1]},{"size":5,"px":[19,10,20,18,18],"py":[2,0,2,2,2],"pz":[0,1,0,0,-1],"nx":[22,23,22,11,23],"ny":[1,3,0,1,2],"nz":[0,0,0,1,0]},{"size":5,"px":[4,2,2,2,6],"py":[7,2,5,4,14],"pz":[1,2,2,2,0],"nx":[16,7,9,15,23],"ny":[8,0,3,11,2],"nz":[0,-1,-1,-1,-1]},{"size":5,"px":[10,10,9,9,5],"py":[2,0,0,1,0],"pz":[0,0,0,0,1],"nx":[3,2,3,2,2],"ny":[11,3,9,5,5],"nz":[1,2,1,2,-1]}],"alpha":[-1.490426e+00,1.490426e+00,-1.214280e+00,1.214280e+00,-8.124863e-01,8.124863e-01,-7.307594e-01,7.307594e-01,-7.377259e-01,7.377259e-01,-5.982859e-01,5.982859e-01,-6.451736e-01,6.451736e-01,-6.117417e-01,6.117417e-01,-5.438949e-01,5.438949e-01,-4.563701e-01,4.563701e-01,-4.975362e-01,4.975362e-01,-4.707373e-01,4.707373e-01,-5.013868e-01,5.013868e-01,-5.139018e-01,5.139018e-01,-4.728007e-01,4.728007e-01,-4.839748e-01,4.839748e-01,-4.852528e-01,4.852528e-01,-5.768956e-01,5.768956e-01,-3.635091e-01,3.635091e-01,-4.190090e-01,4.190090e-01,-3.854715e-01,3.854715e-01,-3.409591e-01,3.409591e-01,-3.440222e-01,3.440222e-01,-3.375895e-01,3.375895e-01,-3.367032e-01,3.367032e-01,-3.708106e-01,3.708106e-01,-3.260956e-01,3.260956e-01,-3.657681e-01,3.657681e-01,-3.518800e-01,3.518800e-01,-3.845758e-01,3.845758e-01,-2.832236e-01,2.832236e-01,-2.865156e-01,2.865156e-01]},{"count":45,"threshold":-5.479836e+00,"feature":[{"size":5,"px":[15,6,17,6,9],"py":[2,13,13,4,3],"pz":[0,0,0,1,0],"nx":[3,9,4,8,14],"ny":[5,8,4,4,8],"nz":[2,0,1,1,0]},{"size":5,"px":[9,8,11,6,7],"py":[1,2,3,14,2],"pz":[0,0,0,0,0],"nx":[0,0,4,0,0],"ny":[4,2,4,1,0],"nz":[0,0,1,0,0]},{"size":5,"px":[2,2,11,11,11],"py":[2,4,10,8,6],"pz":[2,2,0,0,0],"nx":[8,4,3,23,23],"ny":[4,4,4,16,18],"nz":[1,1,-1,-1,-1]},{"size":5,"px":[18,16,17,15,9],"py":[2,2,2,2,1],"pz":[0,0,0,0,1],"nx":[22,22,21,23,23],"ny":[1,2,0,5,4],"nz":[0,0,0,0,0]},{"size":5,"px":[15,3,17,18,6],"py":[11,2,11,11,4],"pz":[0,2,0,0,1],"nx":[3,8,1,4,23],"ny":[4,4,3,9,4],"nz":[1,1,-1,-1,-1]},{"size":2,"px":[4,5],"py":[4,0],"pz":[2,-1],"nx":[7,4],"ny":[8,5],"nz":[1,2]},{"size":2,"px":[11,5],"py":[12,5],"pz":[0,-1],"nx":[4,9],"ny":[10,15],"nz":[1,0]},{"size":4,"px":[2,2,7,1],"py":[7,7,3,4],"pz":[1,-1,-1,-1],"nx":[0,2,1,2],"ny":[6,20,14,16],"nz":[1,0,0,0]},{"size":5,"px":[14,12,12,13,9],"py":[23,5,6,5,7],"pz":[0,0,0,0,1],"nx":[8,18,2,8,14],"ny":[4,9,0,12,7],"nz":[1,-1,-1,-1,-1]},{"size":5,"px":[3,10,13,11,9],"py":[0,3,2,3,2],"pz":[2,0,0,0,0],"nx":[3,11,22,22,22],"ny":[2,6,15,2,0],"nz":[2,1,0,0,0]},{"size":5,"px":[8,7,5,8,5],"py":[23,12,12,12,13],"pz":[0,0,0,0,0],"nx":[3,18,3,1,22],"ny":[4,4,4,2,0],"nz":[1,-1,-1,-1,-1]},{"size":5,"px":[22,22,22,21,22],"py":[9,11,10,14,12],"pz":[0,0,0,0,0],"nx":[23,23,11,1,22],"ny":[23,23,11,2,0],"nz":[0,-1,-1,-1,-1]},{"size":2,"px":[9,3],"py":[18,7],"pz":[0,1],"nx":[10,8],"ny":[16,19],"nz":[0,-1]},{"size":5,"px":[10,12,11,6,6],"py":[4,4,4,2,2],"pz":[0,0,0,1,-1],"nx":[3,8,7,8,4],"ny":[5,4,4,10,4],"nz":[2,1,1,0,1]},{"size":4,"px":[12,12,4,15],"py":[13,12,0,11],"pz":[0,0,-1,-1],"nx":[13,14,13,14],"ny":[9,12,10,13],"nz":[0,0,0,0]},{"size":2,"px":[4,4],"py":[3,3],"pz":[2,-1],"nx":[9,4],"ny":[4,2],"nz":[1,2]},{"size":3,"px":[9,7,0],"py":[7,5,5],"pz":[1,-1,-1],"nx":[4,15,9],"ny":[5,14,9],"nz":[2,0,1]},{"size":5,"px":[15,20,7,10,16],"py":[17,12,6,4,23],"pz":[0,0,1,1,0],"nx":[1,2,2,1,1],"ny":[3,0,1,2,2],"nz":[0,0,0,0,-1]},{"size":5,"px":[2,1,1,11,2],"py":[16,4,5,12,14],"pz":[0,1,1,0,0],"nx":[4,6,3,19,1],"ny":[4,2,5,19,2],"nz":[1,-1,-1,-1,-1]},{"size":3,"px":[15,14,14],"py":[1,1,0],"pz":[0,0,0],"nx":[4,8,4],"ny":[3,4,2],"nz":[2,1,2]},{"size":5,"px":[2,3,1,2,7],"py":[8,12,4,9,13],"pz":[1,0,2,1,0],"nx":[1,1,0,0,0],"ny":[21,20,18,17,9],"nz":[0,0,0,0,1]},{"size":5,"px":[17,15,17,16,16],"py":[12,12,22,23,12],"pz":[0,0,0,0,0],"nx":[7,3,16,1,0],"ny":[8,6,8,3,9],"nz":[0,-1,-1,-1,-1]},{"size":5,"px":[9,17,18,18,18],"py":[6,12,12,13,13],"pz":[1,0,0,0,-1],"nx":[23,23,20,11,11],"ny":[12,13,23,7,8],"nz":[0,0,0,1,1]},{"size":2,"px":[2,4],"py":[4,7],"pz":[2,1],"nx":[4,4],"ny":[10,5],"nz":[1,-1]},{"size":4,"px":[4,22,19,12],"py":[5,8,14,9],"pz":[2,0,0,0],"nx":[8,4,4,2],"ny":[4,4,1,2],"nz":[1,-1,-1,-1]},{"size":2,"px":[3,21],"py":[7,14],"pz":[1,-1],"nx":[4,2],"ny":[7,2],"nz":[1,2]},{"size":3,"px":[7,4,17],"py":[3,1,6],"pz":[0,1,-1],"nx":[3,4,5],"ny":[0,2,1],"nz":[1,0,0]},{"size":4,"px":[15,7,14,0],"py":[3,1,3,7],"pz":[0,1,0,-1],"nx":[8,18,17,18],"ny":[0,1,1,2],"nz":[1,0,0,0]},{"size":5,"px":[12,12,12,12,6],"py":[10,11,12,13,6],"pz":[0,0,0,0,-1],"nx":[8,15,15,4,8],"ny":[10,10,9,2,4],"nz":[0,0,0,2,1]},{"size":2,"px":[17,12],"py":[13,11],"pz":[0,-1],"nx":[9,8],"ny":[4,10],"nz":[1,1]},{"size":5,"px":[0,0,0,0,0],"py":[10,9,12,11,4],"pz":[0,0,0,0,1],"nx":[8,9,8,9,9],"ny":[10,4,4,5,5],"nz":[1,1,1,1,-1]},{"size":3,"px":[7,0,1],"py":[1,9,8],"pz":[0,-1,-1],"nx":[4,3,3],"ny":[7,15,16],"nz":[0,0,0]},{"size":2,"px":[4,7],"py":[15,23],"pz":[0,0],"nx":[9,18],"ny":[21,3],"nz":[0,-1]},{"size":5,"px":[17,4,19,18,8],"py":[12,3,12,17,6],"pz":[0,2,0,0,1],"nx":[23,23,11,22,16],"ny":[0,1,0,21,-1],"nz":[0,0,-1,-1,-1]},{"size":2,"px":[7,4],"py":[13,5],"pz":[0,-1],"nx":[4,2],"ny":[4,2],"nz":[1,2]},{"size":5,"px":[21,20,10,10,21],"py":[13,14,10,7,11],"pz":[0,0,1,1,0],"nx":[4,4,4,5,5],"ny":[18,17,19,20,20],"nz":[0,0,0,0,-1]},{"size":2,"px":[2,3],"py":[11,13],"pz":[1,0],"nx":[12,4],"ny":[17,17],"nz":[0,-1]},{"size":2,"px":[11,5],"py":[13,1],"pz":[0,-1],"nx":[1,2],"ny":[1,4],"nz":[2,1]},{"size":2,"px":[15,7],"py":[17,7],"pz":[0,1],"nx":[14,4],"ny":[15,3],"nz":[0,-1]},{"size":2,"px":[3,11],"py":[3,8],"pz":[2,0],"nx":[13,13],"ny":[9,8],"nz":[0,0]},{"size":2,"px":[8,3],"py":[11,2],"pz":[0,-1],"nx":[8,4],"ny":[9,5],"nz":[0,1]},{"size":3,"px":[12,6,9],"py":[9,10,11],"pz":[0,-1,-1],"nx":[2,1,5],"ny":[2,1,6],"nz":[2,2,1]},{"size":4,"px":[4,5,5,1],"py":[11,11,11,3],"pz":[1,0,1,2],"nx":[0,0,5,4],"ny":[23,22,0,0],"nz":[0,0,-1,-1]},{"size":5,"px":[15,7,17,15,16],"py":[1,0,2,2,0],"pz":[0,1,0,0,0],"nx":[7,4,7,4,8],"ny":[5,2,4,3,4],"nz":[1,2,1,2,-1]},{"size":2,"px":[6,12],"py":[11,23],"pz":[1,0],"nx":[12,4],"ny":[21,2],"nz":[0,-1]}],"alpha":[-1.535800e+00,1.535800e+00,-8.580514e-01,8.580514e-01,-8.625210e-01,8.625210e-01,-7.177500e-01,7.177500e-01,-6.832222e-01,6.832222e-01,-5.736298e-01,5.736298e-01,-5.028217e-01,5.028217e-01,-5.091788e-01,5.091788e-01,-5.791940e-01,5.791940e-01,-4.924942e-01,4.924942e-01,-5.489055e-01,5.489055e-01,-4.528190e-01,4.528190e-01,-4.748324e-01,4.748324e-01,-4.150403e-01,4.150403e-01,-4.820464e-01,4.820464e-01,-4.840212e-01,4.840212e-01,-3.941872e-01,3.941872e-01,-3.663507e-01,3.663507e-01,-3.814835e-01,3.814835e-01,-3.936426e-01,3.936426e-01,-3.049970e-01,3.049970e-01,-3.604256e-01,3.604256e-01,-3.974041e-01,3.974041e-01,-4.203486e-01,4.203486e-01,-3.174435e-01,3.174435e-01,-3.426336e-01,3.426336e-01,-4.492150e-01,4.492150e-01,-3.538784e-01,3.538784e-01,-3.679703e-01,3.679703e-01,-3.985452e-01,3.985452e-01,-2.884028e-01,2.884028e-01,-2.797264e-01,2.797264e-01,-2.664214e-01,2.664214e-01,-2.484857e-01,2.484857e-01,-2.581492e-01,2.581492e-01,-2.943778e-01,2.943778e-01,-2.315507e-01,2.315507e-01,-2.979337e-01,2.979337e-01,-2.976173e-01,2.976173e-01,-2.847965e-01,2.847965e-01,-2.814763e-01,2.814763e-01,-2.489068e-01,2.489068e-01,-2.632427e-01,2.632427e-01,-3.308292e-01,3.308292e-01,-2.790170e-01,2.790170e-01]},{"count":61,"threshold":-5.239104e+00,"feature":[{"size":5,"px":[8,8,11,15,6],"py":[3,6,5,3,4],"pz":[0,1,0,0,1],"nx":[3,9,14,8,4],"ny":[4,8,8,7,2],"nz":[1,0,0,0,2]},{"size":5,"px":[11,12,10,6,9],"py":[3,3,2,13,2],"pz":[0,0,0,0,0],"nx":[0,0,5,2,2],"ny":[13,1,8,5,2],"nz":[0,1,1,2,2]},{"size":5,"px":[11,5,11,11,4],"py":[9,13,10,11,6],"pz":[0,0,0,0,1],"nx":[4,15,9,3,3],"ny":[5,8,9,4,4],"nz":[1,0,0,1,-1]},{"size":5,"px":[15,16,8,17,17],"py":[1,2,0,2,2],"pz":[0,0,1,0,-1],"nx":[23,23,23,23,23],"ny":[4,0,2,3,1],"nz":[0,0,0,0,0]},{"size":4,"px":[9,18,17,18],"py":[7,13,13,14],"pz":[1,0,0,0],"nx":[9,7,4,8],"ny":[4,10,2,4],"nz":[1,1,2,1]},{"size":5,"px":[12,11,12,12,6],"py":[6,5,14,5,3],"pz":[0,0,0,0,1],"nx":[13,8,14,7,7],"ny":[16,4,7,4,4],"nz":[0,1,0,1,-1]},{"size":5,"px":[12,6,3,7,12],"py":[7,12,7,11,8],"pz":[0,0,1,0,0],"nx":[16,4,4,4,7],"ny":[8,4,4,4,4],"nz":[0,1,-1,-1,-1]},{"size":5,"px":[6,4,5,3,3],"py":[2,3,2,0,0],"pz":[0,0,0,1,-1],"nx":[1,0,1,0,0],"ny":[0,3,1,1,2],"nz":[0,0,0,1,0]},{"size":2,"px":[15,9],"py":[11,6],"pz":[0,1],"nx":[14,5],"ny":[9,11],"nz":[0,-1]},{"size":5,"px":[10,19,19,10,20],"py":[7,20,14,6,12],"pz":[1,0,0,1,0],"nx":[23,22,11,23,23],"ny":[21,23,9,20,20],"nz":[0,0,1,0,-1]},{"size":5,"px":[1,1,5,1,1],"py":[8,6,6,9,4],"pz":[0,1,1,0,2],"nx":[3,3,3,2,5],"ny":[4,4,2,5,4],"nz":[1,-1,-1,-1,-1]},{"size":5,"px":[13,12,3,11,11],"py":[2,2,0,1,2],"pz":[0,0,2,0,0],"nx":[3,6,8,4,3],"ny":[2,9,4,4,5],"nz":[2,1,1,1,-1]},{"size":3,"px":[12,12,6],"py":[11,12,9],"pz":[0,0,-1],"nx":[2,1,9],"ny":[6,1,14],"nz":[0,2,0]},{"size":5,"px":[6,3,17,16,16],"py":[4,2,14,23,13],"pz":[1,2,0,0,0],"nx":[8,10,21,5,1],"ny":[4,10,11,0,0],"nz":[1,-1,-1,-1,-1]},{"size":5,"px":[5,6,1,3,3],"py":[15,14,4,7,7],"pz":[0,0,2,1,-1],"nx":[1,0,0,1,1],"ny":[5,8,7,18,17],"nz":[2,1,1,0,0]},{"size":4,"px":[6,12,5,3],"py":[6,12,2,7],"pz":[1,-1,-1,-1],"nx":[14,13,13,7],"ny":[12,10,9,8],"nz":[0,0,0,1]},{"size":2,"px":[3,6],"py":[7,15],"pz":[1,0],"nx":[3,3],"ny":[4,2],"nz":[1,-1]},{"size":4,"px":[11,10,12,2],"py":[18,18,18,3],"pz":[0,0,0,2],"nx":[11,17,4,16],"ny":[16,4,4,21],"nz":[0,-1,-1,-1]},{"size":5,"px":[9,8,8,5,2],"py":[4,4,4,2,3],"pz":[0,0,-1,-1,-1],"nx":[2,2,4,4,2],"ny":[1,2,10,5,4],"nz":[2,2,1,1,2]},{"size":4,"px":[8,18,14,18],"py":[7,16,23,15],"pz":[1,0,0,0],"nx":[14,3,1,0],"ny":[21,1,9,3],"nz":[0,-1,-1,-1]},{"size":2,"px":[12,3],"py":[9,5],"pz":[0,2],"nx":[8,1],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[9,9],"py":[1,1],"pz":[1,-1],"nx":[19,20],"ny":[1,2],"nz":[0,0]},{"size":3,"px":[10,10,10],"py":[6,6,8],"pz":[1,-1,-1],"nx":[22,21,22],"ny":[13,18,12],"nz":[0,0,0]},{"size":2,"px":[2,2],"py":[4,1],"pz":[2,-1],"nx":[2,4],"ny":[5,4],"nz":[2,1]},{"size":5,"px":[21,21,21,21,21],"py":[19,17,18,15,16],"pz":[0,0,0,0,0],"nx":[11,21,6,1,21],"ny":[17,1,10,0,2],"nz":[0,-1,-1,-1,-1]},{"size":5,"px":[7,3,4,4,4],"py":[23,13,14,16,13],"pz":[0,0,0,0,0],"nx":[21,22,22,22,22],"ny":[23,21,20,19,19],"nz":[0,0,0,0,-1]},{"size":2,"px":[11,8],"py":[6,6],"pz":[0,1],"nx":[8,4],"ny":[4,2],"nz":[1,-1]},{"size":5,"px":[23,23,11,23,23],"py":[8,12,6,11,10],"pz":[0,0,1,0,0],"nx":[4,4,3,8,8],"ny":[3,8,4,4,4],"nz":[1,1,1,1,-1]},{"size":5,"px":[8,9,4,7,10],"py":[2,1,0,2,1],"pz":[0,0,1,0,0],"nx":[5,5,6,4,4],"ny":[1,0,0,2,1],"nz":[0,0,0,0,-1]},{"size":2,"px":[12,2],"py":[13,6],"pz":[0,-1],"nx":[15,9],"ny":[15,4],"nz":[0,1]},{"size":2,"px":[2,4],"py":[4,9],"pz":[2,1],"nx":[3,13],"ny":[4,1],"nz":[1,-1]},{"size":3,"px":[3,6,2],"py":[10,22,4],"pz":[1,0,2],"nx":[4,2,1],"ny":[10,4,3],"nz":[1,-1,-1]},{"size":2,"px":[1,0],"py":[9,7],"pz":[0,1],"nx":[0,0],"ny":[23,22],"nz":[0,0]},{"size":2,"px":[8,7],"py":[0,1],"pz":[0,0],"nx":[4,4],"ny":[8,8],"nz":[1,-1]},{"size":5,"px":[7,4,4,6,3],"py":[8,4,5,5,3],"pz":[1,2,2,1,2],"nx":[1,0,2,0,0],"ny":[1,0,0,2,4],"nz":[0,2,0,1,-1]},{"size":3,"px":[10,4,4],"py":[6,1,5],"pz":[1,-1,-1],"nx":[5,23,22],"ny":[4,13,7],"nz":[2,0,0]},{"size":2,"px":[2,2],"py":[6,5],"pz":[1,1],"nx":[6,0],"ny":[9,2],"nz":[0,-1]},{"size":5,"px":[0,1,1,0,0],"py":[5,18,19,16,6],"pz":[2,0,0,0,1],"nx":[5,9,4,8,8],"ny":[8,7,3,7,7],"nz":[1,0,1,0,-1]},{"size":2,"px":[13,12],"py":[23,23],"pz":[0,0],"nx":[7,6],"ny":[8,10],"nz":[0,-1]},{"size":2,"px":[14,19],"py":[12,8],"pz":[0,0],"nx":[18,5],"ny":[8,11],"nz":[0,-1]},{"size":5,"px":[2,8,6,4,4],"py":[3,23,14,6,9],"pz":[2,0,0,1,1],"nx":[0,0,0,0,1],"ny":[21,20,5,19,23],"nz":[0,0,2,0,0]},{"size":2,"px":[11,22],"py":[4,14],"pz":[0,-1],"nx":[3,8],"ny":[1,4],"nz":[2,1]},{"size":5,"px":[1,1,0,1,1],"py":[6,8,3,12,7],"pz":[1,1,2,0,1],"nx":[21,21,19,10,10],"ny":[14,16,23,9,9],"nz":[0,0,0,1,-1]},{"size":2,"px":[10,3],"py":[23,2],"pz":[0,2],"nx":[10,3],"ny":[21,5],"nz":[0,-1]},{"size":2,"px":[9,9],"py":[7,0],"pz":[1,-1],"nx":[9,9],"ny":[11,10],"nz":[1,1]},{"size":5,"px":[23,11,23,23,23],"py":[18,10,19,20,16],"pz":[0,1,0,0,0],"nx":[3,3,2,3,2],"ny":[15,16,10,17,9],"nz":[0,0,1,0,-1]},{"size":2,"px":[9,14],"py":[7,18],"pz":[1,0],"nx":[7,10],"ny":[8,8],"nz":[1,-1]},{"size":2,"px":[12,5],"py":[6,4],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[4,5],"py":[13,4],"pz":[0,-1],"nx":[4,4],"ny":[17,19],"nz":[0,0]},{"size":3,"px":[2,3,3],"py":[11,17,19],"pz":[1,0,0],"nx":[7,7,4],"ny":[8,8,5],"nz":[1,-1,-1]},{"size":2,"px":[6,6],"py":[6,5],"pz":[1,-1],"nx":[2,9],"ny":[4,12],"nz":[1,0]},{"size":5,"px":[8,8,9,2,2],"py":[18,13,12,3,3],"pz":[0,0,0,2,-1],"nx":[23,11,23,11,11],"ny":[13,6,14,7,8],"nz":[0,1,0,1,1]},{"size":2,"px":[9,11],"py":[6,13],"pz":[1,-1],"nx":[4,8],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[8,10],"py":[0,6],"pz":[1,1],"nx":[9,4],"ny":[6,7],"nz":[1,-1]},{"size":3,"px":[3,10,9],"py":[8,6,0],"pz":[1,-1,-1],"nx":[2,2,2],"ny":[15,16,9],"nz":[0,0,1]},{"size":3,"px":[14,15,0],"py":[2,2,5],"pz":[0,0,-1],"nx":[17,17,18],"ny":[0,1,2],"nz":[0,0,0]},{"size":2,"px":[11,5],"py":[14,1],"pz":[0,-1],"nx":[10,9],"ny":[12,14],"nz":[0,0]},{"size":2,"px":[8,8],"py":[7,8],"pz":[1,1],"nx":[8,4],"ny":[4,4],"nz":[1,-1]},{"size":5,"px":[0,0,0,0,0],"py":[19,18,10,5,20],"pz":[0,0,1,2,0],"nx":[4,8,2,4,4],"ny":[4,15,5,10,10],"nz":[1,0,2,1,-1]},{"size":2,"px":[7,0],"py":[13,18],"pz":[0,-1],"nx":[4,3],"ny":[4,4],"nz":[1,1]},{"size":5,"px":[23,22,22,11,22],"py":[16,13,7,6,14],"pz":[0,0,0,1,0],"nx":[13,7,15,14,14],"ny":[6,3,7,6,6],"nz":[0,1,0,0,-1]}],"alpha":[-1.428861e+00,1.428861e+00,-8.591837e-01,8.591837e-01,-7.734305e-01,7.734305e-01,-6.534460e-01,6.534460e-01,-6.262547e-01,6.262547e-01,-5.231782e-01,5.231782e-01,-4.984303e-01,4.984303e-01,-4.913187e-01,4.913187e-01,-4.852198e-01,4.852198e-01,-4.906681e-01,4.906681e-01,-4.126248e-01,4.126248e-01,-4.590814e-01,4.590814e-01,-4.653825e-01,4.653825e-01,-4.179600e-01,4.179600e-01,-4.357392e-01,4.357392e-01,-4.087982e-01,4.087982e-01,-4.594812e-01,4.594812e-01,-4.858794e-01,4.858794e-01,-3.713580e-01,3.713580e-01,-3.894534e-01,3.894534e-01,-3.127168e-01,3.127168e-01,-4.012654e-01,4.012654e-01,-3.370552e-01,3.370552e-01,-3.534712e-01,3.534712e-01,-3.843450e-01,3.843450e-01,-2.688805e-01,2.688805e-01,-3.500203e-01,3.500203e-01,-2.827120e-01,2.827120e-01,-3.742119e-01,3.742119e-01,-3.219074e-01,3.219074e-01,-2.544953e-01,2.544953e-01,-3.355513e-01,3.355513e-01,-2.672670e-01,2.672670e-01,-2.932047e-01,2.932047e-01,-2.404618e-01,2.404618e-01,-2.354372e-01,2.354372e-01,-2.657955e-01,2.657955e-01,-2.293701e-01,2.293701e-01,-2.708918e-01,2.708918e-01,-2.340181e-01,2.340181e-01,-2.464815e-01,2.464815e-01,-2.944239e-01,2.944239e-01,-2.407960e-01,2.407960e-01,-3.029642e-01,3.029642e-01,-2.684602e-01,2.684602e-01,-2.495078e-01,2.495078e-01,-2.539708e-01,2.539708e-01,-2.989293e-01,2.989293e-01,-2.391309e-01,2.391309e-01,-2.531372e-01,2.531372e-01,-2.500390e-01,2.500390e-01,-2.295077e-01,2.295077e-01,-2.526125e-01,2.526125e-01,-2.337182e-01,2.337182e-01,-1.984756e-01,1.984756e-01,-3.089996e-01,3.089996e-01,-2.589053e-01,2.589053e-01,-2.962490e-01,2.962490e-01,-2.458660e-01,2.458660e-01,-2.515206e-01,2.515206e-01,-2.637299e-01,2.637299e-01]},{"count":80,"threshold":-5.185898e+00,"feature":[{"size":5,"px":[12,17,13,10,15],"py":[9,13,3,3,2],"pz":[0,0,0,0,0],"nx":[8,14,6,9,4],"ny":[10,9,8,8,2],"nz":[1,0,1,0,2]},{"size":5,"px":[3,11,8,10,9],"py":[7,4,3,3,3],"pz":[1,0,0,0,0],"nx":[2,1,5,0,0],"ny":[2,15,8,4,13],"nz":[2,0,1,0,0]},{"size":5,"px":[11,11,11,4,17],"py":[7,9,8,6,11],"pz":[0,0,0,1,0],"nx":[8,8,8,3,0],"ny":[4,8,8,8,13],"nz":[1,0,-1,-1,-1]},{"size":5,"px":[14,15,7,16,16],"py":[3,3,1,3,3],"pz":[0,0,1,0,-1],"nx":[23,22,23,22,22],"ny":[6,2,14,3,4],"nz":[0,0,0,0,0]},{"size":4,"px":[6,4,7,15],"py":[4,2,6,17],"pz":[1,2,1,0],"nx":[3,8,3,14],"ny":[4,4,10,22],"nz":[1,1,-1,-1]},{"size":3,"px":[3,5,22],"py":[7,7,5],"pz":[1,-1,-1],"nx":[2,2,4],"ny":[5,2,7],"nz":[2,2,1]},{"size":5,"px":[7,6,5,6,3],"py":[0,1,2,2,0],"pz":[0,0,0,0,1],"nx":[0,1,1,0,1],"ny":[0,2,1,2,0],"nz":[2,0,0,1,0]},{"size":5,"px":[11,11,11,11,5],"py":[11,10,13,12,6],"pz":[0,0,0,0,-1],"nx":[15,14,5,2,8],"ny":[9,8,10,2,10],"nz":[0,0,1,2,0]},{"size":5,"px":[8,5,6,8,7],"py":[12,12,12,23,12],"pz":[0,0,0,0,0],"nx":[3,17,5,2,8],"ny":[4,0,10,2,10],"nz":[1,-1,-1,-1,-1]},{"size":5,"px":[10,10,10,19,20],"py":[8,10,9,15,13],"pz":[1,1,1,0,0],"nx":[23,11,5,23,23],"ny":[20,10,5,19,19],"nz":[0,1,2,0,-1]},{"size":5,"px":[9,13,3,10,12],"py":[2,0,0,1,1],"pz":[0,0,2,0,0],"nx":[3,3,6,7,7],"ny":[5,2,11,4,4],"nz":[2,2,1,1,-1]},{"size":2,"px":[15,7],"py":[17,6],"pz":[0,1],"nx":[14,0],"ny":[16,10],"nz":[0,-1]},{"size":5,"px":[17,15,18,12,19],"py":[22,12,13,7,15],"pz":[0,0,0,0,0],"nx":[8,15,6,1,7],"ny":[4,8,22,5,4],"nz":[1,-1,-1,-1,-1]},{"size":5,"px":[10,9,18,19,8],"py":[2,1,3,3,1],"pz":[1,1,0,0,1],"nx":[23,23,23,11,11],"ny":[0,1,2,0,1],"nz":[0,0,0,1,-1]},{"size":5,"px":[12,23,0,1,8],"py":[14,5,0,17,1],"pz":[0,-1,-1,-1,-1],"nx":[8,14,15,18,14],"ny":[10,11,14,19,10],"nz":[1,0,0,0,0]},{"size":2,"px":[4,6],"py":[6,13],"pz":[1,0],"nx":[4,12],"ny":[10,14],"nz":[1,-1]},{"size":5,"px":[5,23,11,23,13],"py":[3,10,4,11,12],"pz":[2,0,1,0,0],"nx":[7,4,9,8,8],"ny":[4,2,4,4,4],"nz":[1,2,1,1,-1]},{"size":3,"px":[9,5,11],"py":[4,2,4],"pz":[0,1,-1],"nx":[5,2,4],"ny":[0,1,2],"nz":[0,2,0]},{"size":5,"px":[5,2,2,5,8],"py":[12,4,4,6,13],"pz":[0,2,1,1,0],"nx":[3,9,4,4,8],"ny":[4,0,2,2,4],"nz":[1,-1,-1,-1,-1]},{"size":3,"px":[9,5,22],"py":[7,4,20],"pz":[1,-1,-1],"nx":[8,19,4],"ny":[4,18,5],"nz":[1,0,2]},{"size":5,"px":[2,3,3,3,3],"py":[10,16,15,14,13],"pz":[1,0,0,0,0],"nx":[0,0,0,1,0],"ny":[10,20,5,23,21],"nz":[1,0,2,0,0]},{"size":2,"px":[12,11],"py":[4,18],"pz":[0,0],"nx":[11,23],"ny":[17,13],"nz":[0,-1]},{"size":2,"px":[17,8],"py":[16,7],"pz":[0,1],"nx":[8,3],"ny":[4,6],"nz":[1,-1]},{"size":5,"px":[13,5,14,12,3],"py":[4,7,4,5,3],"pz":[0,1,0,0,1],"nx":[21,20,21,21,21],"ny":[2,0,4,3,3],"nz":[0,0,0,0,-1]},{"size":4,"px":[20,20,20,10],"py":[21,19,20,8],"pz":[0,0,0,1],"nx":[8,11,0,2],"ny":[10,8,1,3],"nz":[1,-1,-1,-1]},{"size":4,"px":[6,7,12,8],"py":[12,12,8,11],"pz":[0,0,0,0],"nx":[9,5,5,18],"ny":[9,2,0,20],"nz":[0,-1,-1,-1]},{"size":3,"px":[11,5,9],"py":[0,0,0],"pz":[0,1,0],"nx":[2,6,3],"ny":[3,7,4],"nz":[2,0,1]},{"size":5,"px":[18,18,9,17,17],"py":[15,14,7,14,14],"pz":[0,0,1,0,-1],"nx":[21,21,21,22,20],"ny":[15,21,17,14,23],"nz":[0,0,0,0,0]},{"size":5,"px":[9,12,12,7,4],"py":[4,11,12,6,5],"pz":[1,0,0,1,2],"nx":[16,11,9,6,20],"ny":[8,4,11,10,23],"nz":[0,-1,-1,-1,-1]},{"size":5,"px":[12,11,10,11,11],"py":[23,4,4,5,23],"pz":[0,0,0,0,0],"nx":[11,11,7,3,20],"ny":[21,21,11,1,23],"nz":[0,-1,-1,-1,-1]},{"size":2,"px":[12,1],"py":[12,3],"pz":[0,-1],"nx":[10,10],"ny":[3,2],"nz":[1,1]},{"size":5,"px":[9,4,15,9,9],"py":[8,4,23,7,7],"pz":[1,2,0,1,-1],"nx":[5,3,3,3,2],"ny":[23,19,17,18,15],"nz":[0,0,0,0,0]},{"size":2,"px":[2,0],"py":[16,3],"pz":[0,2],"nx":[9,4],"ny":[15,2],"nz":[0,-1]},{"size":2,"px":[2,3],"py":[3,7],"pz":[2,1],"nx":[3,8],"ny":[4,10],"nz":[1,-1]},{"size":3,"px":[9,4,3],"py":[18,0,14],"pz":[0,-1,-1],"nx":[3,5,2],"ny":[5,8,5],"nz":[2,1,2]},{"size":3,"px":[1,1,10],"py":[2,1,7],"pz":[1,-1,-1],"nx":[0,0,0],"ny":[3,5,1],"nz":[0,0,1]},{"size":4,"px":[11,11,5,2],"py":[12,13,7,3],"pz":[0,0,-1,-1],"nx":[5,10,10,9],"ny":[6,9,10,13],"nz":[1,0,0,0]},{"size":2,"px":[4,8],"py":[3,6],"pz":[2,1],"nx":[9,1],"ny":[4,3],"nz":[1,-1]},{"size":5,"px":[0,0,1,1,0],"py":[4,10,12,13,5],"pz":[1,0,0,0,1],"nx":[4,4,8,7,7],"ny":[3,2,10,4,4],"nz":[2,2,1,1,-1]},{"size":3,"px":[3,4,3],"py":[1,1,2],"pz":[1,-1,-1],"nx":[4,5,3],"ny":[1,0,2],"nz":[0,0,0]},{"size":2,"px":[9,2],"py":[6,4],"pz":[1,-1],"nx":[8,4],"ny":[6,2],"nz":[1,2]},{"size":5,"px":[12,13,15,16,7],"py":[1,1,2,2,1],"pz":[0,0,0,0,1],"nx":[4,4,4,3,7],"ny":[2,2,4,2,4],"nz":[2,-1,-1,-1,-1]},{"size":5,"px":[9,3,2,11,5],"py":[23,7,4,10,6],"pz":[0,1,2,0,1],"nx":[21,20,11,21,21],"ny":[21,23,8,20,20],"nz":[0,0,1,0,-1]},{"size":4,"px":[12,6,13,12],"py":[7,3,5,6],"pz":[0,1,0,0],"nx":[3,0,5,10],"ny":[4,6,5,1],"nz":[1,-1,-1,-1]},{"size":2,"px":[10,4],"py":[4,0],"pz":[0,-1],"nx":[12,11],"ny":[2,1],"nz":[0,0]},{"size":4,"px":[2,3,22,5],"py":[6,1,18,5],"pz":[1,-1,-1,-1],"nx":[0,0,0,3],"ny":[14,3,12,18],"nz":[0,2,0,0]},{"size":3,"px":[10,20,21],"py":[10,18,15],"pz":[1,0,0],"nx":[15,1,2],"ny":[7,0,8],"nz":[0,-1,-1]},{"size":5,"px":[0,0,0,0,0],"py":[4,7,13,4,6],"pz":[1,1,0,2,1],"nx":[5,9,8,4,4],"ny":[3,7,7,3,3],"nz":[1,0,0,1,-1]},{"size":3,"px":[13,12,14],"py":[2,2,2],"pz":[0,0,0],"nx":[4,4,4],"ny":[2,2,5],"nz":[2,-1,-1]},{"size":5,"px":[5,4,6,2,12],"py":[7,9,7,4,10],"pz":[0,1,0,2,0],"nx":[6,1,2,5,2],"ny":[9,2,4,13,4],"nz":[0,-1,-1,-1,-1]},{"size":2,"px":[11,1],"py":[12,5],"pz":[0,-1],"nx":[1,0],"ny":[7,2],"nz":[0,2]},{"size":5,"px":[8,8,1,16,6],"py":[6,6,4,8,11],"pz":[1,-1,-1,-1,-1],"nx":[13,5,4,4,13],"ny":[12,1,2,5,11],"nz":[0,2,2,2,0]},{"size":2,"px":[5,6],"py":[4,14],"pz":[1,0],"nx":[9,5],"ny":[7,1],"nz":[0,-1]},{"size":2,"px":[2,6],"py":[4,14],"pz":[2,0],"nx":[9,2],"ny":[15,1],"nz":[0,-1]},{"size":5,"px":[10,19,20,10,9],"py":[1,2,3,0,0],"pz":[1,0,0,1,-1],"nx":[11,23,23,11,23],"ny":[0,3,1,1,2],"nz":[1,0,0,1,0]},{"size":2,"px":[2,9],"py":[3,12],"pz":[2,0],"nx":[2,6],"ny":[4,6],"nz":[1,-1]},{"size":5,"px":[0,0,0,0,0],"py":[4,10,11,9,9],"pz":[1,0,0,0,-1],"nx":[16,2,17,8,4],"ny":[10,2,9,4,4],"nz":[0,2,0,1,1]},{"size":2,"px":[12,0],"py":[5,4],"pz":[0,-1],"nx":[7,8],"ny":[4,8],"nz":[1,1]},{"size":2,"px":[21,21],"py":[9,10],"pz":[0,0],"nx":[11,8],"ny":[18,8],"nz":[0,-1]},{"size":2,"px":[14,7],"py":[23,9],"pz":[0,1],"nx":[7,13],"ny":[10,4],"nz":[1,-1]},{"size":5,"px":[12,12,12,6,2],"py":[11,13,12,6,4],"pz":[0,0,0,-1,-1],"nx":[0,0,0,0,0],"ny":[14,13,6,12,11],"nz":[0,0,1,0,0]},{"size":2,"px":[8,9],"py":[6,11],"pz":[1,-1],"nx":[15,15],"ny":[11,10],"nz":[0,0]},{"size":4,"px":[4,6,7,2],"py":[8,4,23,7],"pz":[1,-1,-1,-1],"nx":[4,20,19,17],"ny":[0,3,1,1],"nz":[2,0,0,0]},{"size":2,"px":[7,0],"py":[6,0],"pz":[1,-1],"nx":[7,4],"ny":[8,2],"nz":[1,2]},{"size":2,"px":[10,0],"py":[7,0],"pz":[1,-1],"nx":[15,15],"ny":[15,14],"nz":[0,0]},{"size":5,"px":[6,2,5,2,4],"py":[23,7,21,8,16],"pz":[0,1,0,1,0],"nx":[18,2,10,0,11],"ny":[9,3,23,5,3],"nz":[0,-1,-1,-1,-1]},{"size":5,"px":[9,9,8,10,4],"py":[0,2,2,1,1],"pz":[0,0,0,0,1],"nx":[4,3,2,2,5],"ny":[7,3,4,2,17],"nz":[0,1,2,2,0]},{"size":2,"px":[10,7],"py":[5,6],"pz":[1,-1],"nx":[11,11],"ny":[6,5],"nz":[1,1]},{"size":5,"px":[11,11,5,6,11],"py":[8,10,5,5,9],"pz":[0,0,1,1,0],"nx":[13,16,11,14,4],"ny":[9,13,11,20,23],"nz":[0,-1,-1,-1,-1]},{"size":2,"px":[7,14],"py":[14,22],"pz":[0,-1],"nx":[3,4],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[4,11],"py":[4,5],"pz":[2,-1],"nx":[2,4],"ny":[5,7],"nz":[2,1]},{"size":2,"px":[1,0],"py":[0,0],"pz":[0,1],"nx":[0,4],"ny":[0,2],"nz":[0,-1]},{"size":5,"px":[11,11,11,4,9],"py":[5,5,2,9,23],"pz":[0,-1,-1,-1,-1],"nx":[11,12,10,9,5],"ny":[2,2,2,2,1],"nz":[0,0,0,0,1]},{"size":3,"px":[16,14,15],"py":[1,1,0],"pz":[0,0,0],"nx":[4,7,4],"ny":[2,4,4],"nz":[2,1,-1]},{"size":2,"px":[5,0],"py":[14,5],"pz":[0,-1],"nx":[2,4],"ny":[5,17],"nz":[2,0]},{"size":5,"px":[18,7,16,19,4],"py":[13,6,23,13,3],"pz":[0,1,0,0,2],"nx":[5,2,3,4,4],"ny":[1,1,4,1,3],"nz":[0,1,0,0,0]},{"size":2,"px":[8,8],"py":[7,6],"pz":[1,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[2,1],"py":[10,4],"pz":[1,2],"nx":[4,4],"ny":[3,3],"nz":[2,-1]},{"size":2,"px":[10,5],"py":[19,1],"pz":[0,-1],"nx":[4,12],"ny":[10,17],"nz":[1,0]},{"size":5,"px":[12,6,2,4,11],"py":[14,4,2,1,5],"pz":[0,-1,-1,-1,-1],"nx":[3,4,3,4,3],"ny":[13,17,14,16,15],"nz":[0,0,0,0,0]}],"alpha":[-1.368326e+00,1.368326e+00,-7.706897e-01,7.706897e-01,-8.378147e-01,8.378147e-01,-6.120624e-01,6.120624e-01,-5.139189e-01,5.139189e-01,-4.759130e-01,4.759130e-01,-5.161374e-01,5.161374e-01,-5.407743e-01,5.407743e-01,-4.216105e-01,4.216105e-01,-4.418693e-01,4.418693e-01,-4.435335e-01,4.435335e-01,-4.052076e-01,4.052076e-01,-4.293050e-01,4.293050e-01,-3.431154e-01,3.431154e-01,-4.231203e-01,4.231203e-01,-3.917100e-01,3.917100e-01,-3.623450e-01,3.623450e-01,-3.202670e-01,3.202670e-01,-3.331602e-01,3.331602e-01,-3.552034e-01,3.552034e-01,-3.784556e-01,3.784556e-01,-3.295428e-01,3.295428e-01,-3.587038e-01,3.587038e-01,-2.861332e-01,2.861332e-01,-3.403258e-01,3.403258e-01,-3.989002e-01,3.989002e-01,-2.631159e-01,2.631159e-01,-3.272156e-01,3.272156e-01,-2.816567e-01,2.816567e-01,-3.125926e-01,3.125926e-01,-3.146982e-01,3.146982e-01,-2.521825e-01,2.521825e-01,-2.434554e-01,2.434554e-01,-3.435378e-01,3.435378e-01,-3.161172e-01,3.161172e-01,-2.805027e-01,2.805027e-01,-3.303579e-01,3.303579e-01,-2.725089e-01,2.725089e-01,-2.575051e-01,2.575051e-01,-3.210646e-01,3.210646e-01,-2.986997e-01,2.986997e-01,-2.408925e-01,2.408925e-01,-2.456291e-01,2.456291e-01,-2.836550e-01,2.836550e-01,-2.469860e-01,2.469860e-01,-2.915900e-01,2.915900e-01,-2.513559e-01,2.513559e-01,-2.433728e-01,2.433728e-01,-2.377905e-01,2.377905e-01,-2.089327e-01,2.089327e-01,-1.978434e-01,1.978434e-01,-3.017699e-01,3.017699e-01,-2.339661e-01,2.339661e-01,-1.932560e-01,1.932560e-01,-2.278285e-01,2.278285e-01,-2.438200e-01,2.438200e-01,-2.216769e-01,2.216769e-01,-1.941995e-01,1.941995e-01,-2.129081e-01,2.129081e-01,-2.270319e-01,2.270319e-01,-2.393942e-01,2.393942e-01,-2.132518e-01,2.132518e-01,-1.867741e-01,1.867741e-01,-2.394237e-01,2.394237e-01,-2.005917e-01,2.005917e-01,-2.445217e-01,2.445217e-01,-2.229078e-01,2.229078e-01,-2.342967e-01,2.342967e-01,-2.481784e-01,2.481784e-01,-2.735603e-01,2.735603e-01,-2.187604e-01,2.187604e-01,-1.677239e-01,1.677239e-01,-2.248867e-01,2.248867e-01,-2.505358e-01,2.505358e-01,-1.867706e-01,1.867706e-01,-1.904305e-01,1.904305e-01,-1.939881e-01,1.939881e-01,-2.249474e-01,2.249474e-01,-1.762483e-01,1.762483e-01,-2.299974e-01,2.299974e-01]},{"count":115,"threshold":-5.151920e+00,"feature":[{"size":5,"px":[7,14,7,10,6],"py":[3,3,12,4,4],"pz":[0,0,0,0,1],"nx":[14,3,14,9,3],"ny":[7,4,8,8,5],"nz":[0,1,0,0,2]},{"size":5,"px":[13,18,16,17,15],"py":[1,13,1,2,0],"pz":[0,0,0,0,0],"nx":[23,23,8,11,22],"ny":[3,4,4,8,0],"nz":[0,0,1,1,0]},{"size":5,"px":[16,6,6,7,12],"py":[12,13,4,12,5],"pz":[0,0,1,0,0],"nx":[0,0,8,4,0],"ny":[0,2,4,4,2],"nz":[0,0,1,1,-1]},{"size":3,"px":[12,13,7],"py":[13,18,6],"pz":[0,0,1],"nx":[13,5,6],"ny":[16,3,8],"nz":[0,-1,-1]},{"size":5,"px":[10,12,9,13,11],"py":[3,3,3,3,3],"pz":[0,0,0,0,0],"nx":[3,4,15,4,4],"ny":[2,5,10,4,4],"nz":[2,1,0,1,-1]},{"size":5,"px":[12,12,12,3,12],"py":[7,9,8,3,10],"pz":[0,0,0,2,0],"nx":[4,8,15,9,9],"ny":[4,4,8,8,8],"nz":[1,1,0,0,-1]},{"size":5,"px":[6,3,4,4,2],"py":[22,12,13,14,7],"pz":[0,0,0,0,1],"nx":[2,0,1,1,1],"ny":[23,5,22,21,21],"nz":[0,2,0,0,-1]},{"size":2,"px":[3,3],"py":[8,8],"pz":[1,-1],"nx":[3,4],"ny":[4,10],"nz":[1,1]},{"size":5,"px":[11,11,11,11,0],"py":[10,12,11,13,2],"pz":[0,0,0,-1,-1],"nx":[8,13,13,13,13],"ny":[10,8,9,11,10],"nz":[1,0,0,0,0]},{"size":5,"px":[16,16,15,17,18],"py":[12,23,11,12,12],"pz":[0,0,0,0,0],"nx":[8,8,9,3,13],"ny":[4,4,12,3,10],"nz":[1,-1,-1,-1,-1]},{"size":4,"px":[17,16,6,5],"py":[14,13,4,5],"pz":[0,0,-1,-1],"nx":[8,15,4,7],"ny":[10,14,4,8],"nz":[1,0,2,1]},{"size":5,"px":[20,10,20,21,19],"py":[14,7,13,12,22],"pz":[0,1,0,0,0],"nx":[22,23,11,23,23],"ny":[23,22,11,21,20],"nz":[0,0,1,0,-1]},{"size":4,"px":[12,13,1,18],"py":[14,23,3,5],"pz":[0,-1,-1,-1],"nx":[2,10,5,9],"ny":[2,9,8,14],"nz":[2,0,1,0]},{"size":5,"px":[10,4,7,9,8],"py":[1,0,2,0,1],"pz":[0,1,0,0,0],"nx":[2,3,5,3,3],"ny":[2,4,8,3,3],"nz":[2,1,1,1,-1]},{"size":4,"px":[11,2,2,11],"py":[6,4,5,7],"pz":[0,2,2,0],"nx":[3,0,5,3],"ny":[4,9,8,3],"nz":[1,-1,-1,-1]},{"size":5,"px":[12,10,9,12,12],"py":[11,2,1,10,10],"pz":[0,1,1,0,-1],"nx":[22,11,5,22,23],"ny":[1,1,0,0,3],"nz":[0,1,2,0,0]},{"size":4,"px":[5,10,7,11],"py":[14,3,0,4],"pz":[0,-1,-1,-1],"nx":[4,4,4,4],"ny":[17,18,15,16],"nz":[0,0,0,0]},{"size":5,"px":[2,2,3,2,2],"py":[16,12,20,15,17],"pz":[0,0,0,0,0],"nx":[12,8,4,15,15],"ny":[17,4,4,8,8],"nz":[0,1,1,0,-1]},{"size":5,"px":[12,12,1,6,12],"py":[11,10,3,6,10],"pz":[0,0,-1,-1,-1],"nx":[0,0,1,0,2],"ny":[4,0,2,1,0],"nz":[0,2,0,1,0]},{"size":5,"px":[21,20,21,21,14],"py":[9,16,11,8,12],"pz":[0,0,0,0,0],"nx":[17,6,15,0,2],"ny":[8,23,13,2,0],"nz":[0,-1,-1,-1,-1]},{"size":4,"px":[6,9,9,5],"py":[14,18,23,14],"pz":[0,0,0,0],"nx":[9,5,5,12],"ny":[21,5,3,1],"nz":[0,-1,-1,-1]},{"size":2,"px":[12,13],"py":[4,4],"pz":[0,0],"nx":[4,3],"ny":[4,1],"nz":[1,2]},{"size":5,"px":[7,8,11,4,10],"py":[3,3,2,1,2],"pz":[0,0,0,1,0],"nx":[19,20,19,20,20],"ny":[0,3,1,2,2],"nz":[0,0,0,0,-1]},{"size":2,"px":[9,1],"py":[7,4],"pz":[1,-1],"nx":[4,7],"ny":[5,9],"nz":[2,1]},{"size":5,"px":[11,10,1,5,1],"py":[10,12,6,6,5],"pz":[0,0,1,1,1],"nx":[16,3,2,4,4],"ny":[10,4,2,4,4],"nz":[0,1,2,1,-1]},{"size":2,"px":[15,0],"py":[17,0],"pz":[0,-1],"nx":[7,4],"ny":[8,5],"nz":[1,2]},{"size":5,"px":[8,10,9,9,9],"py":[2,2,2,1,1],"pz":[0,0,0,0,-1],"nx":[4,2,3,3,2],"ny":[0,3,2,1,4],"nz":[0,0,0,0,0]},{"size":4,"px":[11,15,17,16],"py":[8,10,11,11],"pz":[0,0,0,0],"nx":[14,1,1,2],"ny":[9,5,7,0],"nz":[0,-1,-1,-1]},{"size":3,"px":[3,5,9],"py":[8,6,12],"pz":[0,1,0],"nx":[3,4,18],"ny":[4,2,22],"nz":[1,-1,-1]},{"size":5,"px":[6,1,7,3,3],"py":[13,4,13,7,7],"pz":[0,2,0,1,-1],"nx":[0,0,0,0,0],"ny":[16,15,8,13,14],"nz":[0,0,1,0,0]},{"size":2,"px":[5,16],"py":[13,10],"pz":[0,-1],"nx":[3,4],"ny":[4,5],"nz":[1,1]},{"size":5,"px":[5,23,11,23,23],"py":[5,12,4,16,15],"pz":[2,0,1,0,0],"nx":[3,2,4,5,5],"ny":[4,2,4,11,11],"nz":[1,2,1,1,-1]},{"size":4,"px":[10,10,3,23],"py":[7,7,3,16],"pz":[1,-1,-1,-1],"nx":[5,23,11,22],"ny":[4,13,7,16],"nz":[2,0,1,0]},{"size":5,"px":[15,14,13,15,16],"py":[1,0,0,0,1],"pz":[0,0,0,0,0],"nx":[4,9,8,8,8],"ny":[2,4,9,4,4],"nz":[2,1,1,1,-1]},{"size":2,"px":[10,4],"py":[5,5],"pz":[0,-1],"nx":[3,15],"ny":[1,8],"nz":[2,0]},{"size":2,"px":[6,12],"py":[6,9],"pz":[1,0],"nx":[10,10],"ny":[10,10],"nz":[0,-1]},{"size":5,"px":[1,0,0,0,0],"py":[5,4,11,9,12],"pz":[0,1,0,0,0],"nx":[9,8,2,4,7],"ny":[7,7,2,4,7],"nz":[0,0,2,1,0]},{"size":2,"px":[4,8],"py":[4,7],"pz":[2,1],"nx":[9,8],"ny":[4,7],"nz":[1,-1]},{"size":2,"px":[5,6],"py":[4,1],"pz":[2,-1],"nx":[8,6],"ny":[7,3],"nz":[1,1]},{"size":5,"px":[8,5,7,6,11],"py":[12,5,13,13,22],"pz":[0,1,0,0,0],"nx":[23,23,23,22,22],"ny":[20,19,21,23,23],"nz":[0,0,0,0,-1]},{"size":2,"px":[3,17],"py":[6,9],"pz":[1,-1],"nx":[3,3],"ny":[10,9],"nz":[1,1]},{"size":2,"px":[14,11],"py":[23,5],"pz":[0,0],"nx":[7,3],"ny":[10,20],"nz":[1,-1]},{"size":2,"px":[3,4],"py":[8,8],"pz":[1,1],"nx":[9,4],"ny":[15,4],"nz":[0,-1]},{"size":2,"px":[2,4],"py":[4,7],"pz":[2,1],"nx":[2,4],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[23,11],"py":[21,10],"pz":[0,1],"nx":[2,3],"ny":[11,14],"nz":[1,0]},{"size":4,"px":[11,11,11,3],"py":[13,12,11,4],"pz":[0,0,0,-1],"nx":[14,13,13,6],"ny":[13,11,10,5],"nz":[0,0,0,1]},{"size":2,"px":[4,7],"py":[3,6],"pz":[2,1],"nx":[9,19],"ny":[4,14],"nz":[1,-1]},{"size":3,"px":[10,5,7],"py":[5,0,6],"pz":[1,-1,-1],"nx":[10,21,5],"ny":[0,5,3],"nz":[1,0,2]},{"size":2,"px":[16,13],"py":[3,15],"pz":[0,-1],"nx":[17,7],"ny":[23,8],"nz":[0,1]},{"size":3,"px":[4,2,2],"py":[15,7,19],"pz":[0,1,-1],"nx":[2,8,4],"ny":[5,14,9],"nz":[2,0,1]},{"size":3,"px":[8,3,6],"py":[10,2,4],"pz":[0,2,1],"nx":[3,8,4],"ny":[4,14,9],"nz":[1,-1,-1]},{"size":2,"px":[14,3],"py":[18,3],"pz":[0,-1],"nx":[12,14],"ny":[17,9],"nz":[0,0]},{"size":3,"px":[7,1,10],"py":[14,10,10],"pz":[0,-1,-1],"nx":[9,6,2],"ny":[13,18,2],"nz":[0,0,2]},{"size":2,"px":[11,8],"py":[13,11],"pz":[0,-1],"nx":[2,4],"ny":[7,18],"nz":[1,0]},{"size":2,"px":[5,4],"py":[21,17],"pz":[0,0],"nx":[9,3],"ny":[5,1],"nz":[1,-1]},{"size":2,"px":[6,6],"py":[4,0],"pz":[0,-1],"nx":[4,3],"ny":[2,0],"nz":[0,1]},{"size":2,"px":[2,1],"py":[1,5],"pz":[0,-1],"nx":[0,1],"ny":[1,0],"nz":[1,0]},{"size":2,"px":[18,1],"py":[13,5],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":5,"px":[0,0,0,0,1],"py":[4,3,2,12,15],"pz":[1,1,2,0,0],"nx":[5,9,4,8,8],"ny":[3,6,3,6,6],"nz":[1,0,1,0,-1]},{"size":2,"px":[2,5],"py":[0,2],"pz":[1,-1],"nx":[2,1],"ny":[0,1],"nz":[0,1]},{"size":4,"px":[7,15,4,20],"py":[8,23,4,8],"pz":[1,0,2,0],"nx":[6,0,3,4],"ny":[9,2,13,6],"nz":[0,-1,-1,-1]},{"size":4,"px":[11,11,10,20],"py":[10,9,11,8],"pz":[0,0,0,-1],"nx":[21,20,21,21],"ny":[18,23,19,17],"nz":[0,0,0,0]},{"size":2,"px":[3,8],"py":[7,5],"pz":[1,-1],"nx":[3,4],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[5,11],"py":[3,4],"pz":[2,1],"nx":[8,7],"ny":[5,12],"nz":[1,0]},{"size":2,"px":[4,1],"py":[1,3],"pz":[1,-1],"nx":[3,6],"ny":[0,0],"nz":[1,0]},{"size":2,"px":[19,9],"py":[16,8],"pz":[0,1],"nx":[14,6],"ny":[15,1],"nz":[0,-1]},{"size":2,"px":[12,6],"py":[13,5],"pz":[0,-1],"nx":[5,5],"ny":[1,2],"nz":[2,2]},{"size":5,"px":[16,14,4,15,12],"py":[1,1,1,2,1],"pz":[0,0,2,0,0],"nx":[6,4,3,2,10],"ny":[22,8,2,1,7],"nz":[0,1,1,2,0]},{"size":5,"px":[6,8,6,5,5],"py":[1,0,0,1,0],"pz":[0,0,0,0,0],"nx":[4,4,4,4,8],"ny":[4,3,2,5,10],"nz":[2,2,2,2,1]},{"size":2,"px":[9,8],"py":[17,0],"pz":[0,-1],"nx":[2,5],"ny":[5,8],"nz":[2,1]},{"size":2,"px":[8,0],"py":[7,3],"pz":[1,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[10,21],"py":[11,20],"pz":[1,0],"nx":[11,4],"ny":[17,1],"nz":[0,-1]},{"size":5,"px":[5,10,4,17,10],"py":[3,6,3,11,5],"pz":[1,0,1,0,0],"nx":[21,20,9,19,10],"ny":[4,3,0,2,1],"nz":[0,0,1,0,-1]},{"size":2,"px":[23,23],"py":[10,10],"pz":[0,-1],"nx":[23,23],"ny":[21,22],"nz":[0,0]},{"size":5,"px":[9,20,19,20,20],"py":[0,3,1,2,2],"pz":[1,0,0,0,-1],"nx":[11,23,11,23,5],"ny":[1,2,0,1,0],"nz":[1,0,1,0,2]},{"size":3,"px":[6,8,7],"py":[4,10,11],"pz":[1,0,0],"nx":[8,3,4],"ny":[9,4,4],"nz":[0,-1,-1]},{"size":4,"px":[13,13,10,4],"py":[14,23,1,5],"pz":[0,-1,-1,-1],"nx":[15,14,8,8],"ny":[13,12,8,9],"nz":[0,0,1,1]},{"size":2,"px":[11,9],"py":[5,8],"pz":[0,-1],"nx":[7,8],"ny":[7,4],"nz":[0,1]},{"size":5,"px":[4,8,4,7,7],"py":[2,3,3,11,11],"pz":[2,1,2,1,-1],"nx":[0,0,1,0,0],"ny":[4,6,15,3,2],"nz":[1,1,0,2,2]},{"size":2,"px":[6,1],"py":[12,1],"pz":[0,-1],"nx":[1,10],"ny":[2,11],"nz":[2,0]},{"size":5,"px":[0,0,2,3,7],"py":[0,1,4,3,11],"pz":[0,-1,-1,-1,-1],"nx":[9,11,9,6,12],"ny":[2,1,1,0,2],"nz":[0,0,0,1,0]},{"size":2,"px":[10,11],"py":[4,4],"pz":[0,0],"nx":[8,4],"ny":[4,2],"nz":[1,-1]},{"size":5,"px":[1,1,1,1,1],"py":[15,10,19,16,18],"pz":[0,1,0,0,0],"nx":[4,5,3,5,6],"ny":[4,19,9,18,19],"nz":[1,0,1,0,-1]},{"size":5,"px":[12,12,12,12,20],"py":[11,12,13,13,18],"pz":[0,0,0,-1,-1],"nx":[0,0,0,0,0],"ny":[4,2,7,6,12],"nz":[1,2,1,1,0]},{"size":2,"px":[0,0],"py":[9,11],"pz":[0,0],"nx":[10,4],"ny":[5,3],"nz":[1,-1]},{"size":2,"px":[11,8],"py":[9,6],"pz":[0,1],"nx":[13,13],"ny":[10,10],"nz":[0,-1]},{"size":2,"px":[6,3],"py":[5,3],"pz":[1,2],"nx":[3,3],"ny":[5,5],"nz":[2,-1]},{"size":2,"px":[19,9],"py":[10,6],"pz":[0,1],"nx":[4,1],"ny":[2,2],"nz":[2,-1]},{"size":2,"px":[14,4],"py":[19,12],"pz":[0,-1],"nx":[14,8],"ny":[17,10],"nz":[0,1]},{"size":4,"px":[4,2,13,2],"py":[12,6,9,3],"pz":[0,1,-1,-1],"nx":[1,0,1,0],"ny":[16,14,11,15],"nz":[0,0,1,0]},{"size":2,"px":[3,3],"py":[8,7],"pz":[1,1],"nx":[4,4],"ny":[4,8],"nz":[1,-1]},{"size":5,"px":[9,11,12,6,10],"py":[2,1,2,1,2],"pz":[0,0,0,1,0],"nx":[4,6,4,6,2],"ny":[4,0,9,1,8],"nz":[0,0,1,0,1]},{"size":5,"px":[4,4,7,2,2],"py":[19,20,23,8,9],"pz":[0,0,0,1,1],"nx":[7,0,5,6,2],"ny":[10,5,4,1,8],"nz":[1,-1,-1,-1,-1]},{"size":5,"px":[18,18,17,18,18],"py":[15,16,14,20,17],"pz":[0,0,0,0,0],"nx":[15,2,2,5,2],"ny":[8,0,2,9,4],"nz":[0,-1,-1,-1,-1]},{"size":4,"px":[13,13,13,18],"py":[11,12,12,20],"pz":[0,0,-1,-1],"nx":[1,3,10,10],"ny":[1,6,12,11],"nz":[2,0,0,0]},{"size":2,"px":[8,9],"py":[0,1],"pz":[1,1],"nx":[19,4],"ny":[2,2],"nz":[0,-1]},{"size":2,"px":[6,3],"py":[4,2],"pz":[1,2],"nx":[8,4],"ny":[4,0],"nz":[1,-1]},{"size":5,"px":[23,11,22,13,13],"py":[8,3,3,12,12],"pz":[0,1,0,0,-1],"nx":[15,7,14,13,8],"ny":[7,3,6,6,3],"nz":[0,1,0,0,1]},{"size":3,"px":[9,11,19],"py":[7,3,0],"pz":[1,-1,-1],"nx":[23,23,11],"ny":[16,12,7],"nz":[0,0,1]},{"size":2,"px":[15,8],"py":[23,7],"pz":[0,-1],"nx":[4,3],"ny":[5,4],"nz":[2,2]},{"size":2,"px":[4,10],"py":[6,13],"pz":[1,-1],"nx":[2,3],"ny":[4,10],"nz":[2,1]},{"size":2,"px":[4,1],"py":[11,2],"pz":[1,2],"nx":[9,2],"ny":[5,2],"nz":[1,-1]},{"size":2,"px":[22,22],"py":[22,21],"pz":[0,0],"nx":[3,0],"ny":[5,3],"nz":[1,-1]},{"size":2,"px":[20,10],"py":[12,6],"pz":[0,1],"nx":[20,10],"ny":[23,11],"nz":[0,-1]},{"size":4,"px":[10,3,3,4],"py":[5,3,4,9],"pz":[0,-1,-1,-1],"nx":[14,4,3,11],"ny":[2,1,1,3],"nz":[0,2,2,0]},{"size":3,"px":[15,15,3],"py":[1,1,4],"pz":[0,-1,-1],"nx":[7,4,4],"ny":[8,2,3],"nz":[1,2,2]},{"size":3,"px":[0,0,0],"py":[3,4,6],"pz":[2,2,1],"nx":[0,21,4],"ny":[23,14,3],"nz":[0,-1,-1]},{"size":5,"px":[4,4,5,3,4],"py":[9,11,8,4,8],"pz":[1,1,1,2,1],"nx":[21,21,10,19,19],"ny":[3,4,1,0,0],"nz":[0,0,1,0,-1]},{"size":4,"px":[21,20,20,21],"py":[18,21,20,17],"pz":[0,0,0,0],"nx":[8,1,4,2],"ny":[10,0,2,4],"nz":[1,-1,-1,-1]},{"size":2,"px":[3,6],"py":[7,14],"pz":[1,0],"nx":[3,5],"ny":[4,5],"nz":[1,-1]},{"size":3,"px":[12,0,23],"py":[20,2,13],"pz":[0,-1,-1],"nx":[12,2,9],"ny":[19,2,7],"nz":[0,2,0]},{"size":2,"px":[0,6],"py":[22,11],"pz":[0,-1],"nx":[20,18],"ny":[12,23],"nz":[0,0]},{"size":5,"px":[9,15,15,16,8],"py":[2,1,2,2,1],"pz":[1,0,0,0,1],"nx":[1,1,1,1,1],"ny":[16,10,17,18,18],"nz":[0,1,0,0,-1]},{"size":5,"px":[10,5,3,5,8],"py":[14,2,1,4,1],"pz":[0,-1,-1,-1,-1],"nx":[23,23,23,23,23],"ny":[18,15,16,14,17],"nz":[0,0,0,0,0]},{"size":5,"px":[2,2,2,3,2],"py":[16,17,15,20,11],"pz":[0,0,0,0,1],"nx":[8,22,2,1,23],"ny":[20,11,5,0,17],"nz":[0,-1,-1,-1,-1]}],"alpha":[-1.299972e+00,1.299972e+00,-7.630804e-01,7.630804e-01,-5.530378e-01,5.530378e-01,-5.444703e-01,5.444703e-01,-5.207701e-01,5.207701e-01,-5.035143e-01,5.035143e-01,-4.514416e-01,4.514416e-01,-4.897723e-01,4.897723e-01,-5.006264e-01,5.006264e-01,-4.626049e-01,4.626049e-01,-4.375402e-01,4.375402e-01,-3.742565e-01,3.742565e-01,-3.873996e-01,3.873996e-01,-3.715484e-01,3.715484e-01,-3.562480e-01,3.562480e-01,-3.216189e-01,3.216189e-01,-3.983409e-01,3.983409e-01,-3.191891e-01,3.191891e-01,-3.242173e-01,3.242173e-01,-3.528040e-01,3.528040e-01,-3.562318e-01,3.562318e-01,-3.592398e-01,3.592398e-01,-2.557584e-01,2.557584e-01,-2.747951e-01,2.747951e-01,-2.747554e-01,2.747554e-01,-2.980481e-01,2.980481e-01,-2.887670e-01,2.887670e-01,-3.895318e-01,3.895318e-01,-2.786896e-01,2.786896e-01,-2.763841e-01,2.763841e-01,-2.704816e-01,2.704816e-01,-2.075489e-01,2.075489e-01,-3.104773e-01,3.104773e-01,-2.580337e-01,2.580337e-01,-2.448334e-01,2.448334e-01,-3.054279e-01,3.054279e-01,-2.335804e-01,2.335804e-01,-2.972322e-01,2.972322e-01,-2.270521e-01,2.270521e-01,-2.134621e-01,2.134621e-01,-2.261655e-01,2.261655e-01,-2.091024e-01,2.091024e-01,-2.478928e-01,2.478928e-01,-2.468972e-01,2.468972e-01,-1.919746e-01,1.919746e-01,-2.756623e-01,2.756623e-01,-2.629717e-01,2.629717e-01,-2.198653e-01,2.198653e-01,-2.174434e-01,2.174434e-01,-2.193626e-01,2.193626e-01,-1.956262e-01,1.956262e-01,-1.720459e-01,1.720459e-01,-1.781067e-01,1.781067e-01,-1.773484e-01,1.773484e-01,-1.793871e-01,1.793871e-01,-1.973396e-01,1.973396e-01,-2.397262e-01,2.397262e-01,-2.164685e-01,2.164685e-01,-2.214348e-01,2.214348e-01,-2.265941e-01,2.265941e-01,-2.075436e-01,2.075436e-01,-2.244070e-01,2.244070e-01,-2.291992e-01,2.291992e-01,-2.223506e-01,2.223506e-01,-1.639398e-01,1.639398e-01,-1.732374e-01,1.732374e-01,-1.808631e-01,1.808631e-01,-1.860962e-01,1.860962e-01,-1.781604e-01,1.781604e-01,-2.108322e-01,2.108322e-01,-2.386390e-01,2.386390e-01,-1.942083e-01,1.942083e-01,-1.949161e-01,1.949161e-01,-1.953729e-01,1.953729e-01,-2.317591e-01,2.317591e-01,-2.335136e-01,2.335136e-01,-2.282835e-01,2.282835e-01,-2.148716e-01,2.148716e-01,-1.588127e-01,1.588127e-01,-1.566765e-01,1.566765e-01,-1.644839e-01,1.644839e-01,-2.386947e-01,2.386947e-01,-1.704126e-01,1.704126e-01,-2.213945e-01,2.213945e-01,-1.740398e-01,1.740398e-01,-2.451678e-01,2.451678e-01,-2.120524e-01,2.120524e-01,-1.886646e-01,1.886646e-01,-2.824447e-01,2.824447e-01,-1.900364e-01,1.900364e-01,-2.179183e-01,2.179183e-01,-2.257696e-01,2.257696e-01,-2.023404e-01,2.023404e-01,-1.886901e-01,1.886901e-01,-1.850663e-01,1.850663e-01,-2.035414e-01,2.035414e-01,-1.930174e-01,1.930174e-01,-1.898282e-01,1.898282e-01,-1.666640e-01,1.666640e-01,-1.646143e-01,1.646143e-01,-1.543475e-01,1.543475e-01,-1.366289e-01,1.366289e-01,-1.636837e-01,1.636837e-01,-2.547716e-01,2.547716e-01,-1.281869e-01,1.281869e-01,-1.509159e-01,1.509159e-01,-1.447827e-01,1.447827e-01,-1.626126e-01,1.626126e-01,-2.387014e-01,2.387014e-01,-2.571160e-01,2.571160e-01,-1.719175e-01,1.719175e-01,-1.646742e-01,1.646742e-01,-1.717041e-01,1.717041e-01,-2.039217e-01,2.039217e-01,-1.796907e-01,1.796907e-01]},{"count":153,"threshold":-4.971032e+00,"feature":[{"size":5,"px":[14,13,18,10,16],"py":[2,2,13,3,12],"pz":[0,0,0,0,0],"nx":[21,7,14,23,23],"ny":[16,7,8,3,13],"nz":[0,1,0,0,0]},{"size":5,"px":[12,12,12,15,14],"py":[9,10,11,3,3],"pz":[0,0,0,0,0],"nx":[9,9,8,14,3],"ny":[9,8,5,9,5],"nz":[0,0,1,0,2]},{"size":5,"px":[5,11,7,6,8],"py":[12,8,12,12,11],"pz":[0,0,0,0,0],"nx":[8,4,3,9,9],"ny":[4,4,4,9,9],"nz":[1,1,1,0,-1]},{"size":5,"px":[9,8,4,10,6],"py":[2,2,1,3,13],"pz":[0,0,1,0,0],"nx":[1,1,5,1,1],"ny":[2,3,8,4,16],"nz":[0,0,1,0,0]},{"size":5,"px":[3,16,6,17,15],"py":[2,17,4,12,12],"pz":[2,0,1,0,0],"nx":[4,8,15,1,1],"ny":[4,4,8,16,16],"nz":[1,1,-1,-1,-1]},{"size":4,"px":[18,15,8,17],"py":[12,23,6,12],"pz":[0,0,1,0],"nx":[15,4,10,5],"ny":[21,8,14,3],"nz":[0,-1,-1,-1]},{"size":5,"px":[18,17,9,19,19],"py":[3,1,0,3,3],"pz":[0,0,1,0,-1],"nx":[22,11,23,23,23],"ny":[0,1,2,3,4],"nz":[0,1,0,0,0]},{"size":4,"px":[9,5,5,10],"py":[18,15,14,18],"pz":[0,0,0,0],"nx":[10,11,2,0],"ny":[16,7,12,7],"nz":[0,-1,-1,-1]},{"size":2,"px":[2,12],"py":[4,6],"pz":[2,0],"nx":[3,12],"ny":[4,19],"nz":[1,-1]},{"size":5,"px":[3,4,5,2,2],"py":[3,3,3,1,1],"pz":[0,0,0,1,-1],"nx":[0,0,1,0,0],"ny":[3,4,0,1,2],"nz":[0,0,0,1,0]},{"size":5,"px":[12,12,12,8,10],"py":[13,12,12,1,18],"pz":[0,0,-1,-1,-1],"nx":[13,8,7,14,9],"ny":[10,10,7,13,4],"nz":[0,1,1,0,1]},{"size":5,"px":[15,4,12,14,12],"py":[12,3,9,10,8],"pz":[0,2,0,0,0],"nx":[14,7,11,2,9],"ny":[8,4,7,5,4],"nz":[0,1,-1,-1,-1]},{"size":3,"px":[3,9,7],"py":[7,23,15],"pz":[1,-1,-1],"nx":[4,4,2],"ny":[9,7,5],"nz":[1,1,2]},{"size":3,"px":[5,17,5],"py":[3,23,4],"pz":[2,0,2],"nx":[23,2,4],"ny":[23,16,4],"nz":[0,-1,-1]},{"size":5,"px":[4,9,9,10,8],"py":[1,0,1,0,2],"pz":[1,0,0,0,0],"nx":[2,5,4,2,2],"ny":[2,19,11,4,1],"nz":[2,0,1,2,2]},{"size":5,"px":[8,3,8,4,7],"py":[23,9,13,8,16],"pz":[0,1,0,1,0],"nx":[8,2,5,3,2],"ny":[8,15,1,1,1],"nz":[0,-1,-1,-1,-1]},{"size":2,"px":[11,5],"py":[14,5],"pz":[0,-1],"nx":[1,9],"ny":[3,13],"nz":[2,0]},{"size":5,"px":[5,8,1,8,6],"py":[12,12,3,23,12],"pz":[0,0,2,0,0],"nx":[1,1,2,1,1],"ny":[22,21,23,20,20],"nz":[0,0,0,0,-1]},{"size":5,"px":[14,21,19,21,20],"py":[13,8,20,10,7],"pz":[0,0,0,0,0],"nx":[16,0,14,23,1],"ny":[8,1,23,10,20],"nz":[0,-1,-1,-1,-1]},{"size":5,"px":[15,16,13,14,14],"py":[3,3,3,3,3],"pz":[0,0,0,0,-1],"nx":[18,19,18,9,17],"ny":[2,2,1,1,0],"nz":[0,0,0,1,0]},{"size":2,"px":[17,9],"py":[14,4],"pz":[0,-1],"nx":[9,18],"ny":[4,18],"nz":[1,0]},{"size":2,"px":[21,20],"py":[17,21],"pz":[0,0],"nx":[12,3],"ny":[17,10],"nz":[0,-1]},{"size":2,"px":[2,1],"py":[10,4],"pz":[1,2],"nx":[4,1],"ny":[10,5],"nz":[1,-1]},{"size":5,"px":[7,8,4,9,9],"py":[2,2,0,2,2],"pz":[0,0,1,0,-1],"nx":[5,5,4,6,3],"ny":[0,1,2,0,0],"nz":[0,0,0,0,1]},{"size":2,"px":[2,5],"py":[3,5],"pz":[2,-1],"nx":[3,2],"ny":[4,2],"nz":[1,2]},{"size":5,"px":[0,0,0,0,0],"py":[0,1,3,4,4],"pz":[2,2,1,1,-1],"nx":[20,20,19,20,19],"ny":[21,20,23,19,22],"nz":[0,0,0,0,0]},{"size":2,"px":[9,18],"py":[8,16],"pz":[1,0],"nx":[14,6],"ny":[15,16],"nz":[0,-1]},{"size":3,"px":[3,4,7],"py":[3,3,9],"pz":[2,2,1],"nx":[8,9,7],"ny":[4,11,4],"nz":[1,-1,-1]},{"size":5,"px":[6,14,4,7,7],"py":[4,23,3,6,6],"pz":[1,0,2,1,-1],"nx":[2,0,2,1,3],"ny":[20,4,21,10,23],"nz":[0,2,0,1,0]},{"size":5,"px":[2,4,8,9,10],"py":[3,8,13,23,23],"pz":[2,1,0,0,0],"nx":[10,4,0,3,3],"ny":[21,3,0,3,23],"nz":[0,-1,-1,-1,-1]},{"size":3,"px":[11,10,11],"py":[6,5,5],"pz":[0,0,0],"nx":[14,6,1],"ny":[7,9,5],"nz":[0,1,-1]},{"size":5,"px":[11,11,11,11,6],"py":[11,12,10,13,6],"pz":[0,0,0,0,1],"nx":[9,13,13,13,4],"ny":[4,9,10,11,2],"nz":[1,0,0,0,-1]},{"size":2,"px":[2,4],"py":[3,6],"pz":[2,1],"nx":[3,11],"ny":[4,7],"nz":[1,-1]},{"size":2,"px":[1,2],"py":[4,11],"pz":[2,0],"nx":[8,8],"ny":[15,15],"nz":[0,-1]},{"size":5,"px":[12,12,13,12,12],"py":[10,11,13,12,12],"pz":[0,0,0,0,-1],"nx":[0,0,0,1,0],"ny":[13,2,12,5,14],"nz":[0,2,0,0,0]},{"size":5,"px":[0,0,0,1,1],"py":[4,3,11,15,13],"pz":[1,2,0,0,0],"nx":[2,3,3,1,0],"ny":[2,4,4,5,14],"nz":[2,1,-1,-1,-1]},{"size":2,"px":[4,11],"py":[12,10],"pz":[0,-1],"nx":[1,2],"ny":[2,4],"nz":[2,1]},{"size":5,"px":[18,8,9,9,9],"py":[15,7,8,10,7],"pz":[0,1,1,1,1],"nx":[22,23,21,22,11],"ny":[20,16,23,19,9],"nz":[0,0,0,0,1]},{"size":5,"px":[14,12,13,14,15],"py":[1,0,0,0,1],"pz":[0,0,0,0,0],"nx":[4,9,4,7,7],"ny":[2,3,1,8,8],"nz":[2,1,2,1,-1]},{"size":2,"px":[13,9],"py":[14,19],"pz":[0,-1],"nx":[6,10],"ny":[0,2],"nz":[1,0]},{"size":2,"px":[13,12],"py":[4,4],"pz":[0,0],"nx":[3,3],"ny":[1,1],"nz":[2,-1]},{"size":3,"px":[14,5,5],"py":[18,3,4],"pz":[0,-1,-1],"nx":[8,7,8],"ny":[4,8,10],"nz":[1,1,1]},{"size":2,"px":[8,18],"py":[6,11],"pz":[1,0],"nx":[9,1],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[16,11],"py":[9,7],"pz":[0,0],"nx":[7,7],"ny":[4,4],"nz":[1,-1]},{"size":5,"px":[23,11,23,11,23],"py":[13,4,12,7,10],"pz":[0,1,0,1,0],"nx":[7,4,8,15,15],"ny":[9,2,4,8,8],"nz":[0,2,1,0,-1]},{"size":2,"px":[6,3],"py":[1,0],"pz":[0,1],"nx":[4,1],"ny":[1,2],"nz":[0,-1]},{"size":2,"px":[5,5],"py":[7,6],"pz":[0,1],"nx":[6,4],"ny":[9,11],"nz":[0,-1]},{"size":4,"px":[5,6,5,5],"py":[8,6,11,6],"pz":[1,1,1,0],"nx":[23,0,4,5],"ny":[0,2,2,1],"nz":[0,-1,-1,-1]},{"size":2,"px":[18,4],"py":[13,3],"pz":[0,-1],"nx":[15,4],"ny":[11,2],"nz":[0,2]},{"size":2,"px":[4,0],"py":[8,0],"pz":[1,-1],"nx":[9,2],"ny":[15,5],"nz":[0,2]},{"size":5,"px":[15,15,16,14,14],"py":[0,1,1,0,0],"pz":[0,0,0,0,-1],"nx":[4,4,8,8,15],"ny":[4,5,4,11,23],"nz":[2,2,1,1,0]},{"size":4,"px":[12,11,3,14],"py":[14,22,1,0],"pz":[0,-1,-1,-1],"nx":[8,15,7,16],"ny":[2,3,1,3],"nz":[1,0,1,0]},{"size":2,"px":[5,12],"py":[6,17],"pz":[1,-1],"nx":[2,1],"ny":[4,2],"nz":[1,2]},{"size":5,"px":[13,12,12,7,7],"py":[5,6,5,14,14],"pz":[0,0,0,0,-1],"nx":[10,3,10,1,10],"ny":[13,8,11,3,10],"nz":[0,0,0,1,0]},{"size":2,"px":[4,4],"py":[15,0],"pz":[0,-1],"nx":[4,4],"ny":[16,17],"nz":[0,0]},{"size":5,"px":[1,4,2,1,2],"py":[4,0,1,1,0],"pz":[1,1,1,2,1],"nx":[4,9,1,5,1],"ny":[3,4,4,5,5],"nz":[1,-1,-1,-1,-1]},{"size":2,"px":[10,3],"py":[3,1],"pz":[0,2],"nx":[8,8],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[16,0],"py":[21,0],"pz":[0,-1],"nx":[6,8],"ny":[8,4],"nz":[1,1]},{"size":2,"px":[7,11],"py":[4,18],"pz":[0,-1],"nx":[5,7],"ny":[0,2],"nz":[2,0]},{"size":2,"px":[9,7],"py":[0,3],"pz":[1,-1],"nx":[20,10],"ny":[0,1],"nz":[0,1]},{"size":4,"px":[10,4,1,5],"py":[0,6,8,4],"pz":[1,-1,-1,-1],"nx":[6,15,4,14],"ny":[3,5,1,5],"nz":[1,0,2,0]},{"size":2,"px":[4,4],"py":[3,4],"pz":[2,2],"nx":[9,2],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[8,4],"py":[3,4],"pz":[0,-1],"nx":[8,6],"ny":[2,1],"nz":[0,0]},{"size":2,"px":[2,0],"py":[6,3],"pz":[1,2],"nx":[0,7],"ny":[7,8],"nz":[1,-1]},{"size":2,"px":[10,0],"py":[7,3],"pz":[1,-1],"nx":[15,4],"ny":[14,4],"nz":[0,2]},{"size":4,"px":[3,1,2,2],"py":[20,7,18,17],"pz":[0,1,0,0],"nx":[9,5,5,4],"ny":[5,4,18,4],"nz":[1,-1,-1,-1]},{"size":2,"px":[5,4],"py":[3,1],"pz":[2,-1],"nx":[23,23],"ny":[14,13],"nz":[0,0]},{"size":2,"px":[12,4],"py":[6,1],"pz":[0,-1],"nx":[8,4],"ny":[4,4],"nz":[1,1]},{"size":5,"px":[22,22,11,11,11],"py":[12,13,4,6,6],"pz":[0,0,1,1,-1],"nx":[4,4,4,4,3],"ny":[16,15,18,14,11],"nz":[0,0,0,0,1]},{"size":2,"px":[4,10],"py":[0,1],"pz":[1,0],"nx":[2,2],"ny":[2,2],"nz":[2,-1]},{"size":2,"px":[15,6],"py":[4,4],"pz":[0,-1],"nx":[15,4],"ny":[2,1],"nz":[0,2]},{"size":2,"px":[11,2],"py":[10,20],"pz":[0,-1],"nx":[4,9],"ny":[1,2],"nz":[2,1]},{"size":2,"px":[4,19],"py":[3,8],"pz":[2,0],"nx":[8,21],"ny":[4,20],"nz":[1,-1]},{"size":5,"px":[4,6,7,6,2],"py":[6,15,13,14,3],"pz":[1,0,0,0,-1],"nx":[21,22,19,21,10],"ny":[6,12,0,3,2],"nz":[0,0,0,0,1]},{"size":5,"px":[8,12,15,14,13],"py":[0,0,0,0,0],"pz":[1,0,0,0,0],"nx":[4,3,1,3,4],"ny":[19,16,3,15,4],"nz":[0,0,2,0,1]},{"size":2,"px":[3,3],"py":[2,3],"pz":[2,2],"nx":[8,4],"ny":[4,1],"nz":[1,-1]},{"size":4,"px":[0,0,0,5],"py":[10,9,11,21],"pz":[1,1,-1,-1],"nx":[12,4,3,11],"ny":[3,1,1,3],"nz":[0,2,2,0]},{"size":2,"px":[3,1],"py":[0,0],"pz":[1,2],"nx":[1,4],"ny":[2,1],"nz":[1,-1]},{"size":5,"px":[2,5,1,0,1],"py":[14,23,7,5,9],"pz":[0,0,1,1,1],"nx":[0,0,7,9,11],"ny":[23,22,4,9,3],"nz":[0,-1,-1,-1,-1]},{"size":2,"px":[8,9],"py":[7,1],"pz":[1,-1],"nx":[8,8],"ny":[8,9],"nz":[1,1]},{"size":2,"px":[11,9],"py":[11,3],"pz":[1,-1],"nx":[3,2],"ny":[14,10],"nz":[0,1]},{"size":4,"px":[2,4,5,4],"py":[8,20,22,16],"pz":[1,0,0,0],"nx":[8,2,11,3],"ny":[7,4,15,4],"nz":[0,-1,-1,-1]},{"size":3,"px":[1,2,3],"py":[2,1,0],"pz":[0,0,0],"nx":[0,0,15],"ny":[1,0,11],"nz":[0,0,-1]},{"size":2,"px":[12,22],"py":[6,7],"pz":[0,-1],"nx":[4,8],"ny":[2,4],"nz":[2,1]},{"size":3,"px":[13,0,5],"py":[19,10,2],"pz":[0,-1,-1],"nx":[3,4,6],"ny":[5,5,9],"nz":[2,2,1]},{"size":2,"px":[8,15],"py":[8,22],"pz":[1,0],"nx":[7,4],"ny":[10,7],"nz":[1,-1]},{"size":2,"px":[10,10],"py":[7,6],"pz":[1,1],"nx":[10,1],"ny":[9,0],"nz":[1,-1]},{"size":2,"px":[9,11],"py":[4,3],"pz":[0,-1],"nx":[5,9],"ny":[0,1],"nz":[1,0]},{"size":5,"px":[14,13,14,12,15],"py":[1,2,2,2,2],"pz":[0,0,0,0,0],"nx":[4,8,4,7,4],"ny":[2,4,3,4,4],"nz":[2,1,2,1,-1]},{"size":3,"px":[13,8,2],"py":[14,5,8],"pz":[0,-1,-1],"nx":[6,8,9],"ny":[3,2,2],"nz":[0,0,0]},{"size":3,"px":[3,6,8],"py":[7,4,12],"pz":[1,1,0],"nx":[3,8,9],"ny":[5,2,2],"nz":[1,-1,-1]},{"size":2,"px":[13,4],"py":[16,3],"pz":[0,2],"nx":[13,7],"ny":[15,5],"nz":[0,-1]},{"size":2,"px":[3,0],"py":[7,9],"pz":[1,-1],"nx":[2,8],"ny":[2,4],"nz":[2,1]},{"size":5,"px":[3,6,8,7,7],"py":[0,1,0,0,0],"pz":[1,0,0,0,-1],"nx":[7,9,4,3,4],"ny":[9,7,4,2,2],"nz":[1,1,1,2,2]},{"size":3,"px":[3,4,16],"py":[4,4,6],"pz":[1,2,0],"nx":[2,2,2],"ny":[0,0,1],"nz":[0,-1,-1]},{"size":2,"px":[0,0],"py":[1,0],"pz":[2,2],"nx":[5,5],"ny":[2,2],"nz":[1,-1]},{"size":2,"px":[9,3],"py":[7,20],"pz":[1,-1],"nx":[4,8],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[8,21],"py":[10,18],"pz":[0,-1],"nx":[9,4],"ny":[10,4],"nz":[0,1]},{"size":2,"px":[6,13],"py":[6,23],"pz":[1,-1],"nx":[10,10],"ny":[11,12],"nz":[0,0]},{"size":5,"px":[10,9,5,10,10],"py":[9,13,6,10,10],"pz":[0,0,1,0,-1],"nx":[21,21,21,10,21],"ny":[18,20,19,11,17],"nz":[0,0,0,1,0]},{"size":2,"px":[8,8],"py":[7,6],"pz":[1,1],"nx":[8,1],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[11,4],"py":[14,7],"pz":[0,-1],"nx":[13,13],"ny":[13,11],"nz":[0,0]},{"size":2,"px":[4,4],"py":[4,5],"pz":[2,2],"nx":[12,5],"ny":[16,2],"nz":[0,-1]},{"size":3,"px":[1,3,20],"py":[3,9,2],"pz":[2,-1,-1],"nx":[0,0,0],"ny":[7,4,13],"nz":[1,2,0]},{"size":2,"px":[0,0],"py":[4,2],"pz":[1,2],"nx":[1,0],"ny":[4,4],"nz":[1,-1]},{"size":3,"px":[8,9,11],"py":[2,1,2],"pz":[0,0,0],"nx":[2,2,0],"ny":[2,2,13],"nz":[2,-1,-1]},{"size":2,"px":[1,10],"py":[23,5],"pz":[0,-1],"nx":[3,6],"ny":[1,1],"nz":[2,1]},{"size":4,"px":[13,6,3,4],"py":[8,6,4,2],"pz":[0,-1,-1,-1],"nx":[1,1,1,4],"ny":[9,7,8,20],"nz":[1,1,1,0]},{"size":5,"px":[11,4,4,10,3],"py":[9,16,13,12,7],"pz":[0,0,0,0,0],"nx":[7,11,3,17,4],"ny":[8,11,9,0,4],"nz":[0,-1,-1,-1,-1]},{"size":2,"px":[6,6],"py":[6,8],"pz":[1,-1],"nx":[0,0],"ny":[1,2],"nz":[2,2]},{"size":2,"px":[10,5],"py":[7,2],"pz":[0,-1],"nx":[4,13],"ny":[5,9],"nz":[2,0]},{"size":2,"px":[10,5],"py":[8,2],"pz":[1,-1],"nx":[16,4],"ny":[14,5],"nz":[0,2]},{"size":2,"px":[1,1],"py":[16,15],"pz":[0,0],"nx":[1,20],"ny":[23,1],"nz":[0,-1]},{"size":2,"px":[2,3],"py":[4,7],"pz":[2,1],"nx":[2,3],"ny":[5,4],"nz":[2,-1]},{"size":2,"px":[19,8],"py":[5,4],"pz":[0,-1],"nx":[10,10],"ny":[1,3],"nz":[1,1]},{"size":2,"px":[21,21],"py":[18,16],"pz":[0,0],"nx":[10,3],"ny":[17,5],"nz":[0,-1]},{"size":2,"px":[9,2],"py":[23,4],"pz":[0,2],"nx":[5,11],"ny":[3,7],"nz":[2,1]},{"size":2,"px":[7,0],"py":[3,2],"pz":[0,-1],"nx":[3,6],"ny":[1,1],"nz":[1,0]},{"size":4,"px":[5,9,8,9],"py":[8,12,13,18],"pz":[0,0,0,0],"nx":[6,5,2,5],"ny":[8,4,7,11],"nz":[0,-1,-1,-1]},{"size":2,"px":[7,2],"py":[0,0],"pz":[0,2],"nx":[5,5],"ny":[3,4],"nz":[1,-1]},{"size":2,"px":[11,11],"py":[12,13],"pz":[0,0],"nx":[9,1],"ny":[14,3],"nz":[0,-1]},{"size":5,"px":[8,16,9,4,15],"py":[11,13,8,4,12],"pz":[1,0,1,2,0],"nx":[3,3,3,3,4],"ny":[4,2,1,3,0],"nz":[0,0,0,0,0]},{"size":2,"px":[9,5],"py":[7,6],"pz":[1,-1],"nx":[19,8],"ny":[17,11],"nz":[0,1]},{"size":5,"px":[14,15,12,13,13],"py":[2,2,2,2,2],"pz":[0,0,0,0,-1],"nx":[20,9,19,20,4],"ny":[14,2,5,15,1],"nz":[0,1,0,0,2]},{"size":2,"px":[18,8],"py":[20,7],"pz":[0,1],"nx":[4,9],"ny":[2,2],"nz":[2,-1]},{"size":2,"px":[6,3],"py":[11,5],"pz":[1,2],"nx":[13,19],"ny":[20,20],"nz":[0,-1]},{"size":3,"px":[12,11,3],"py":[20,20,5],"pz":[0,0,-1],"nx":[11,12,6],"ny":[21,21,10],"nz":[0,0,1]},{"size":2,"px":[3,6],"py":[7,14],"pz":[1,0],"nx":[3,13],"ny":[4,8],"nz":[1,-1]},{"size":2,"px":[0,0],"py":[5,9],"pz":[2,1],"nx":[2,11],"ny":[8,6],"nz":[1,-1]},{"size":2,"px":[2,2],"py":[5,5],"pz":[1,-1],"nx":[0,0],"ny":[6,3],"nz":[1,2]},{"size":2,"px":[11,23],"py":[5,9],"pz":[1,0],"nx":[8,2],"ny":[11,0],"nz":[0,-1]},{"size":2,"px":[11,23],"py":[12,9],"pz":[0,-1],"nx":[11,22],"ny":[10,21],"nz":[1,0]},{"size":2,"px":[12,12],"py":[7,7],"pz":[0,-1],"nx":[5,4],"ny":[7,10],"nz":[1,1]},{"size":2,"px":[9,8],"py":[18,1],"pz":[0,-1],"nx":[5,4],"ny":[8,10],"nz":[1,1]},{"size":2,"px":[16,17],"py":[11,11],"pz":[0,0],"nx":[15,2],"ny":[9,4],"nz":[0,-1]},{"size":2,"px":[0,1],"py":[3,0],"pz":[2,-1],"nx":[9,10],"ny":[6,5],"nz":[1,1]},{"size":2,"px":[13,13],"py":[20,21],"pz":[0,-1],"nx":[2,2],"ny":[6,5],"nz":[1,1]},{"size":5,"px":[20,20,4,18,19],"py":[17,16,5,22,20],"pz":[0,0,2,0,0],"nx":[8,11,5,6,2],"ny":[10,15,11,10,1],"nz":[1,-1,-1,-1,-1]},{"size":2,"px":[11,11],"py":[4,4],"pz":[0,-1],"nx":[8,4],"ny":[4,4],"nz":[1,1]},{"size":3,"px":[6,5,6],"py":[8,10,10],"pz":[1,1,1],"nx":[11,8,22],"ny":[19,2,15],"nz":[0,-1,-1]},{"size":3,"px":[5,2,13],"py":[7,10,10],"pz":[1,-1,-1],"nx":[11,11,23],"ny":[8,9,14],"nz":[1,1,0]},{"size":5,"px":[3,6,1,5,10],"py":[7,14,1,9,2],"pz":[1,-1,-1,-1,-1],"nx":[11,0,1,5,1],"ny":[14,12,18,5,19],"nz":[0,0,0,1,0]},{"size":3,"px":[21,21,10],"py":[16,17,10],"pz":[0,0,1],"nx":[5,5,1],"ny":[9,9,18],"nz":[1,-1,-1]},{"size":2,"px":[6,21],"py":[6,17],"pz":[1,-1],"nx":[20,10],"ny":[7,4],"nz":[0,1]},{"size":2,"px":[10,11],"py":[0,0],"pz":[1,-1],"nx":[6,13],"ny":[2,4],"nz":[1,0]},{"size":4,"px":[4,4,7,9],"py":[3,4,10,3],"pz":[2,2,1,1],"nx":[21,2,15,5],"ny":[0,0,0,2],"nz":[0,-1,-1,-1]},{"size":3,"px":[11,11,11],"py":[7,6,9],"pz":[1,1,1],"nx":[23,4,9],"ny":[23,5,6],"nz":[0,-1,-1]},{"size":2,"px":[14,15],"py":[1,1],"pz":[0,0],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":5,"px":[11,23,11,23,23],"py":[11,22,10,21,20],"pz":[1,0,1,0,0],"nx":[10,9,19,10,10],"ny":[10,11,20,9,9],"nz":[1,1,0,1,-1]},{"size":2,"px":[7,23],"py":[13,22],"pz":[0,-1],"nx":[8,4],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[12,1],"py":[19,0],"pz":[0,-1],"nx":[11,12],"ny":[22,17],"nz":[0,0]},{"size":2,"px":[10,8],"py":[4,3],"pz":[1,-1],"nx":[5,23],"ny":[2,7],"nz":[2,0]},{"size":2,"px":[9,10],"py":[6,20],"pz":[1,-1],"nx":[8,8],"ny":[4,6],"nz":[1,1]}],"alpha":[-1.135386e+00,1.135386e+00,-9.090800e-01,9.090800e-01,-5.913780e-01,5.913780e-01,-5.556534e-01,5.556534e-01,-5.084150e-01,5.084150e-01,-4.464489e-01,4.464489e-01,-4.463241e-01,4.463241e-01,-4.985226e-01,4.985226e-01,-4.424638e-01,4.424638e-01,-4.300093e-01,4.300093e-01,-4.231341e-01,4.231341e-01,-4.087428e-01,4.087428e-01,-3.374480e-01,3.374480e-01,-3.230151e-01,3.230151e-01,-3.084427e-01,3.084427e-01,-3.235494e-01,3.235494e-01,-2.589281e-01,2.589281e-01,-2.970292e-01,2.970292e-01,-2.957065e-01,2.957065e-01,-3.997619e-01,3.997619e-01,-3.535901e-01,3.535901e-01,-2.725396e-01,2.725396e-01,-2.649725e-01,2.649725e-01,-3.103888e-01,3.103888e-01,-3.117775e-01,3.117775e-01,-2.589620e-01,2.589620e-01,-2.689202e-01,2.689202e-01,-2.127024e-01,2.127024e-01,-2.436322e-01,2.436322e-01,-3.120574e-01,3.120574e-01,-2.786010e-01,2.786010e-01,-2.649072e-01,2.649072e-01,-2.766509e-01,2.766509e-01,-2.367237e-01,2.367237e-01,-2.658049e-01,2.658049e-01,-2.103463e-01,2.103463e-01,-1.911522e-01,1.911522e-01,-2.535425e-01,2.535425e-01,-2.434696e-01,2.434696e-01,-2.180788e-01,2.180788e-01,-2.496873e-01,2.496873e-01,-2.700969e-01,2.700969e-01,-2.565479e-01,2.565479e-01,-2.737741e-01,2.737741e-01,-1.675507e-01,1.675507e-01,-2.551417e-01,2.551417e-01,-2.067648e-01,2.067648e-01,-1.636834e-01,1.636834e-01,-2.129306e-01,2.129306e-01,-1.656758e-01,1.656758e-01,-1.919369e-01,1.919369e-01,-2.031763e-01,2.031763e-01,-2.062327e-01,2.062327e-01,-2.577950e-01,2.577950e-01,-2.951823e-01,2.951823e-01,-2.023160e-01,2.023160e-01,-2.022234e-01,2.022234e-01,-2.132906e-01,2.132906e-01,-1.653278e-01,1.653278e-01,-1.648474e-01,1.648474e-01,-1.593352e-01,1.593352e-01,-1.735650e-01,1.735650e-01,-1.688778e-01,1.688778e-01,-1.519705e-01,1.519705e-01,-1.812202e-01,1.812202e-01,-1.967481e-01,1.967481e-01,-1.852954e-01,1.852954e-01,-2.317780e-01,2.317780e-01,-2.036251e-01,2.036251e-01,-1.609324e-01,1.609324e-01,-2.160205e-01,2.160205e-01,-2.026190e-01,2.026190e-01,-1.854761e-01,1.854761e-01,-1.832038e-01,1.832038e-01,-2.001141e-01,2.001141e-01,-1.418333e-01,1.418333e-01,-1.704773e-01,1.704773e-01,-1.586261e-01,1.586261e-01,-1.587582e-01,1.587582e-01,-1.899489e-01,1.899489e-01,-1.477160e-01,1.477160e-01,-2.260467e-01,2.260467e-01,-2.393598e-01,2.393598e-01,-1.582373e-01,1.582373e-01,-1.702498e-01,1.702498e-01,-1.737398e-01,1.737398e-01,-1.462529e-01,1.462529e-01,-1.396517e-01,1.396517e-01,-1.629625e-01,1.629625e-01,-1.446933e-01,1.446933e-01,-1.811657e-01,1.811657e-01,-1.336427e-01,1.336427e-01,-1.924813e-01,1.924813e-01,-1.457520e-01,1.457520e-01,-1.600259e-01,1.600259e-01,-1.297000e-01,1.297000e-01,-2.076199e-01,2.076199e-01,-1.510060e-01,1.510060e-01,-1.914568e-01,1.914568e-01,-2.138162e-01,2.138162e-01,-1.856916e-01,1.856916e-01,-1.843047e-01,1.843047e-01,-1.526846e-01,1.526846e-01,-1.328320e-01,1.328320e-01,-1.751311e-01,1.751311e-01,-1.643908e-01,1.643908e-01,-1.482706e-01,1.482706e-01,-1.622298e-01,1.622298e-01,-1.884979e-01,1.884979e-01,-1.633604e-01,1.633604e-01,-1.554166e-01,1.554166e-01,-1.405332e-01,1.405332e-01,-1.772398e-01,1.772398e-01,-1.410008e-01,1.410008e-01,-1.362301e-01,1.362301e-01,-1.709087e-01,1.709087e-01,-1.584613e-01,1.584613e-01,-1.188814e-01,1.188814e-01,-1.423888e-01,1.423888e-01,-1.345565e-01,1.345565e-01,-1.835986e-01,1.835986e-01,-1.445329e-01,1.445329e-01,-1.385826e-01,1.385826e-01,-1.558917e-01,1.558917e-01,-1.476053e-01,1.476053e-01,-1.370722e-01,1.370722e-01,-2.362666e-01,2.362666e-01,-2.907774e-01,2.907774e-01,-1.656360e-01,1.656360e-01,-1.644407e-01,1.644407e-01,-1.443394e-01,1.443394e-01,-1.438823e-01,1.438823e-01,-1.476964e-01,1.476964e-01,-1.956593e-01,1.956593e-01,-2.417519e-01,2.417519e-01,-1.659315e-01,1.659315e-01,-1.466254e-01,1.466254e-01,-2.034909e-01,2.034909e-01,-2.128771e-01,2.128771e-01,-1.665429e-01,1.665429e-01,-1.387131e-01,1.387131e-01,-1.298823e-01,1.298823e-01,-1.329495e-01,1.329495e-01,-1.769587e-01,1.769587e-01,-1.366530e-01,1.366530e-01,-1.254359e-01,1.254359e-01,-1.673022e-01,1.673022e-01,-1.602519e-01,1.602519e-01,-1.897245e-01,1.897245e-01,-1.893579e-01,1.893579e-01,-1.579350e-01,1.579350e-01,-1.472589e-01,1.472589e-01,-1.614193e-01,1.614193e-01]},{"count":203,"threshold":-4.769677e+00,"feature":[{"size":5,"px":[12,5,14,9,7],"py":[9,13,3,1,3],"pz":[0,0,0,0,0],"nx":[1,0,5,14,9],"ny":[5,3,8,8,9],"nz":[2,0,1,0,0]},{"size":5,"px":[14,13,11,17,12],"py":[2,2,4,13,3],"pz":[0,0,0,0,0],"nx":[7,22,8,23,22],"ny":[8,15,11,12,3],"nz":[1,0,1,0,0]},{"size":5,"px":[9,11,11,11,16],"py":[4,8,7,9,12],"pz":[0,0,0,0,0],"nx":[4,8,14,9,9],"ny":[4,4,8,8,8],"nz":[1,1,0,0,-1]},{"size":5,"px":[6,12,12,8,3],"py":[11,7,8,10,2],"pz":[0,0,0,0,2],"nx":[8,4,4,4,0],"ny":[4,4,4,11,0],"nz":[1,1,-1,-1,-1]},{"size":5,"px":[19,17,18,9,9],"py":[3,2,3,1,1],"pz":[0,0,0,1,-1],"nx":[21,21,10,22,22],"ny":[1,2,0,4,3],"nz":[0,0,1,0,0]},{"size":2,"px":[4,7],"py":[4,6],"pz":[2,1],"nx":[8,7],"ny":[4,10],"nz":[1,1]},{"size":5,"px":[14,17,17,13,12],"py":[18,15,16,18,18],"pz":[0,0,0,0,0],"nx":[13,19,5,20,6],"ny":[16,4,1,19,0],"nz":[0,-1,-1,-1,-1]},{"size":5,"px":[6,7,4,5,5],"py":[15,23,6,12,16],"pz":[0,0,1,0,0],"nx":[3,14,14,6,6],"ny":[4,11,11,9,0],"nz":[1,-1,-1,-1,-1]},{"size":5,"px":[16,9,6,3,11],"py":[2,2,5,3,2],"pz":[0,0,1,2,0],"nx":[3,4,2,5,5],"ny":[4,11,2,8,8],"nz":[1,1,2,1,-1]},{"size":5,"px":[6,1,5,3,3],"py":[14,4,15,7,7],"pz":[0,2,0,1,-1],"nx":[0,0,1,1,1],"ny":[7,8,18,17,5],"nz":[1,1,0,0,2]},{"size":5,"px":[12,12,9,5,3],"py":[14,14,0,3,7],"pz":[0,-1,-1,-1,-1],"nx":[7,7,14,8,13],"ny":[7,8,13,10,10],"nz":[1,1,0,1,0]},{"size":2,"px":[3,4],"py":[7,9],"pz":[1,-1],"nx":[2,4],"ny":[5,4],"nz":[2,1]},{"size":3,"px":[10,21,17],"py":[7,11,23],"pz":[1,0,0],"nx":[21,9,3],"ny":[23,5,5],"nz":[0,-1,-1]},{"size":5,"px":[8,11,9,10,11],"py":[2,0,1,1,2],"pz":[0,0,0,0,0],"nx":[4,5,6,4,3],"ny":[8,4,18,7,4],"nz":[1,1,0,1,-1]},{"size":5,"px":[20,22,3,19,10],"py":[20,9,4,22,3],"pz":[0,0,2,0,1],"nx":[8,20,8,3,2],"ny":[4,3,6,4,3],"nz":[1,-1,-1,-1,-1]},{"size":2,"px":[4,4],"py":[8,7],"pz":[1,1],"nx":[9,2],"ny":[15,5],"nz":[0,-1]},{"size":2,"px":[11,13],"py":[13,4],"pz":[0,-1],"nx":[20,21],"ny":[1,4],"nz":[0,0]},{"size":5,"px":[1,2,7,6,8],"py":[0,2,3,3,3],"pz":[2,1,0,0,0],"nx":[1,2,1,1,1],"ny":[0,0,4,3,3],"nz":[1,0,0,0,-1]},{"size":2,"px":[3,10],"py":[9,11],"pz":[0,0],"nx":[6,3],"ny":[9,2],"nz":[0,-1]},{"size":5,"px":[12,12,12,12,6],"py":[10,11,13,12,6],"pz":[0,0,0,0,-1],"nx":[10,2,1,10,10],"ny":[10,4,2,11,9],"nz":[0,1,2,0,0]},{"size":5,"px":[16,18,11,17,15],"py":[11,12,8,12,11],"pz":[0,0,0,0,0],"nx":[14,0,19,0,10],"ny":[9,3,14,8,9],"nz":[0,-1,-1,-1,-1]},{"size":4,"px":[5,9,5,8],"py":[21,18,20,23],"pz":[0,0,0,0],"nx":[8,4,3,1],"ny":[20,3,4,3],"nz":[0,-1,-1,-1]},{"size":2,"px":[2,3],"py":[3,2],"pz":[2,2],"nx":[3,12],"ny":[4,23],"nz":[1,-1]},{"size":5,"px":[0,1,1,1,1],"py":[2,16,14,13,12],"pz":[2,0,0,0,0],"nx":[8,4,9,4,7],"ny":[9,3,4,2,9],"nz":[1,2,1,2,1]},{"size":2,"px":[4,9],"py":[3,7],"pz":[2,-1],"nx":[4,9],"ny":[2,4],"nz":[2,1]},{"size":5,"px":[15,16,17,15,8],"py":[3,3,3,18,1],"pz":[0,0,0,0,1],"nx":[1,2,2,1,3],"ny":[5,3,2,6,0],"nz":[0,0,0,0,0]},{"size":2,"px":[4,17],"py":[4,14],"pz":[2,0],"nx":[15,7],"ny":[15,10],"nz":[0,-1]},{"size":3,"px":[14,12,3],"py":[3,13,3],"pz":[0,-1,-1],"nx":[4,17,4],"ny":[3,19,4],"nz":[2,0,2]},{"size":4,"px":[4,5,12,2],"py":[9,6,19,4],"pz":[1,1,0,2],"nx":[12,17,4,4],"ny":[18,19,4,4],"nz":[0,-1,-1,-1]},{"size":5,"px":[10,19,20,20,19],"py":[7,14,13,14,13],"pz":[1,0,0,0,-1],"nx":[11,23,23,23,23],"ny":[9,15,13,16,14],"nz":[1,0,0,0,0]},{"size":4,"px":[0,0,0,2],"py":[5,6,5,14],"pz":[1,1,2,0],"nx":[0,3,3,17],"ny":[23,5,5,9],"nz":[0,-1,-1,-1]},{"size":2,"px":[15,4],"py":[23,5],"pz":[0,2],"nx":[9,3],"ny":[4,4],"nz":[1,-1]},{"size":4,"px":[6,5,10,12],"py":[3,3,23,23],"pz":[1,1,0,0],"nx":[11,1,1,4],"ny":[21,3,5,5],"nz":[0,-1,-1,-1]},{"size":2,"px":[5,2],"py":[9,4],"pz":[1,2],"nx":[4,9],"ny":[4,2],"nz":[1,-1]},{"size":5,"px":[23,23,23,23,23],"py":[14,9,13,11,12],"pz":[0,0,0,0,0],"nx":[6,13,7,8,8],"ny":[9,6,3,3,3],"nz":[1,0,1,1,-1]},{"size":2,"px":[10,3],"py":[4,5],"pz":[0,-1],"nx":[3,8],"ny":[1,3],"nz":[2,1]},{"size":2,"px":[3,12],"py":[4,18],"pz":[2,0],"nx":[12,0],"ny":[16,3],"nz":[0,-1]},{"size":2,"px":[16,2],"py":[4,4],"pz":[0,-1],"nx":[16,4],"ny":[1,0],"nz":[0,2]},{"size":2,"px":[3,4],"py":[7,1],"pz":[1,-1],"nx":[5,3],"ny":[19,9],"nz":[0,1]},{"size":4,"px":[20,19,20,21],"py":[2,0,1,3],"pz":[0,0,0,0],"nx":[11,5,23,11],"ny":[0,0,1,1],"nz":[1,2,0,1]},{"size":2,"px":[12,13],"py":[7,5],"pz":[0,0],"nx":[8,5],"ny":[3,5],"nz":[1,-1]},{"size":5,"px":[22,21,22,22,22],"py":[20,22,18,19,16],"pz":[0,0,0,0,0],"nx":[2,3,3,15,15],"ny":[4,5,4,7,7],"nz":[1,2,1,0,-1]},{"size":3,"px":[15,14,14],"py":[1,1,1],"pz":[0,0,-1],"nx":[17,18,16],"ny":[1,2,1],"nz":[0,0,0]},{"size":4,"px":[17,16,16,15],"py":[2,1,0,0],"pz":[0,0,0,0],"nx":[7,4,2,11],"ny":[11,2,1,4],"nz":[1,2,-1,-1]},{"size":4,"px":[18,0,0,0],"py":[14,6,5,4],"pz":[0,-1,-1,-1],"nx":[19,19,19,19],"ny":[16,19,17,18],"nz":[0,0,0,0]},{"size":4,"px":[11,5,5,0],"py":[14,1,4,4],"pz":[0,-1,-1,-1],"nx":[11,8,2,15],"ny":[17,14,1,9],"nz":[0,0,2,0]},{"size":2,"px":[4,5],"py":[19,21],"pz":[0,0],"nx":[10,2],"ny":[15,4],"nz":[0,-1]},{"size":2,"px":[6,4],"py":[4,6],"pz":[1,1],"nx":[3,3],"ny":[4,5],"nz":[1,-1]},{"size":2,"px":[2,7],"py":[1,13],"pz":[2,0],"nx":[7,2],"ny":[1,4],"nz":[1,-1]},{"size":4,"px":[15,10,4,7],"py":[23,3,1,7],"pz":[0,1,2,1],"nx":[0,4,1,1],"ny":[0,2,0,-1900147915],"nz":[0,-1,-1,-1]},{"size":2,"px":[7,2],"py":[12,11],"pz":[0,-1],"nx":[2,4],"ny":[2,5],"nz":[2,1]},{"size":5,"px":[0,0,0,1,0],"py":[9,4,3,2,6],"pz":[0,1,2,1,1],"nx":[9,4,2,16,16],"ny":[7,4,2,8,8],"nz":[0,1,2,0,-1]},{"size":5,"px":[18,4,9,4,4],"py":[12,5,6,3,4],"pz":[0,2,1,2,-1],"nx":[4,3,3,2,3],"ny":[23,19,21,16,18],"nz":[0,0,0,0,0]},{"size":2,"px":[6,6],"py":[14,13],"pz":[0,0],"nx":[3,10],"ny":[4,7],"nz":[1,-1]},{"size":5,"px":[3,4,4,2,2],"py":[8,11,7,4,4],"pz":[1,1,1,2,-1],"nx":[20,18,19,20,19],"ny":[4,0,2,3,1],"nz":[0,0,0,0,0]},{"size":5,"px":[17,12,14,8,16],"py":[2,0,0,0,0],"pz":[0,0,0,1,0],"nx":[3,15,3,2,2],"ny":[2,9,7,2,2],"nz":[2,0,1,2,-1]},{"size":5,"px":[11,10,11,11,11],"py":[10,12,11,12,12],"pz":[0,0,0,0,-1],"nx":[13,13,20,10,13],"ny":[9,11,8,4,10],"nz":[0,0,0,1,0]},{"size":2,"px":[8,16],"py":[7,13],"pz":[1,0],"nx":[8,13],"ny":[4,11],"nz":[1,-1]},{"size":2,"px":[6,7],"py":[20,3],"pz":[0,-1],"nx":[3,4],"ny":[10,10],"nz":[1,1]},{"size":3,"px":[13,10,17],"py":[9,3,5],"pz":[0,-1,-1],"nx":[1,3,1],"ny":[5,16,6],"nz":[2,0,1]},{"size":2,"px":[0,0],"py":[5,5],"pz":[2,-1],"nx":[8,3],"ny":[14,10],"nz":[0,1]},{"size":4,"px":[11,9,12,10],"py":[2,2,2,2],"pz":[0,0,0,0],"nx":[4,4,4,10],"ny":[5,5,0,16],"nz":[1,-1,-1,-1]},{"size":3,"px":[7,9,12],"py":[2,2,2],"pz":[1,-1,-1],"nx":[4,7,2],"ny":[3,1,0],"nz":[0,0,2]},{"size":2,"px":[2,4],"py":[3,12],"pz":[2,0],"nx":[7,4],"ny":[6,5],"nz":[1,2]},{"size":4,"px":[12,12,6,3],"py":[12,11,21,7],"pz":[0,0,-1,-1],"nx":[1,0,0,0],"ny":[13,3,6,5],"nz":[0,2,1,1]},{"size":3,"px":[3,1,3],"py":[21,8,18],"pz":[0,1,0],"nx":[11,20,0],"ny":[17,17,6],"nz":[0,-1,-1]},{"size":2,"px":[2,8],"py":[3,12],"pz":[2,0],"nx":[2,20],"ny":[4,17],"nz":[1,-1]},{"size":5,"px":[2,3,4,3,2],"py":[10,14,14,15,13],"pz":[1,0,0,0,0],"nx":[0,0,1,0,0],"ny":[21,20,23,19,19],"nz":[0,0,0,0,-1]},{"size":2,"px":[2,15],"py":[7,4],"pz":[1,-1],"nx":[3,8],"ny":[4,14],"nz":[1,0]},{"size":5,"px":[19,14,12,15,4],"py":[8,12,10,16,2],"pz":[0,0,0,0,2],"nx":[8,0,12,4,0],"ny":[4,1,12,2,19],"nz":[1,-1,-1,-1,-1]},{"size":2,"px":[18,9],"py":[15,3],"pz":[0,-1],"nx":[8,15],"ny":[9,14],"nz":[1,0]},{"size":5,"px":[4,2,3,4,9],"py":[9,4,3,8,23],"pz":[1,2,1,1,0],"nx":[11,23,23,11,11],"ny":[0,2,3,1,1],"nz":[1,0,0,1,-1]},{"size":2,"px":[6,7],"py":[1,1],"pz":[0,0],"nx":[3,4],"ny":[10,5],"nz":[1,-1]},{"size":4,"px":[11,9,8,5],"py":[12,15,13,3],"pz":[0,-1,-1,-1],"nx":[3,12,14,13],"ny":[0,3,3,3],"nz":[2,0,0,0]},{"size":2,"px":[11,11],"py":[6,5],"pz":[0,0],"nx":[8,11],"ny":[4,20],"nz":[1,-1]},{"size":5,"px":[21,20,21,21,21],"py":[18,21,17,19,19],"pz":[0,0,0,0,-1],"nx":[2,5,4,4,5],"ny":[5,12,11,10,10],"nz":[1,0,0,0,0]},{"size":5,"px":[1,1,1,1,1],"py":[10,11,7,9,8],"pz":[0,0,0,0,0],"nx":[11,23,23,23,23],"ny":[10,20,21,19,19],"nz":[1,0,0,0,-1]},{"size":5,"px":[7,8,7,3,1],"py":[14,13,13,2,2],"pz":[0,0,-1,-1,-1],"nx":[1,10,2,2,10],"ny":[2,13,4,16,12],"nz":[2,0,1,0,0]},{"size":2,"px":[17,18],"py":[12,12],"pz":[0,0],"nx":[8,8],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[17,0],"py":[5,20],"pz":[0,-1],"nx":[4,9],"ny":[0,2],"nz":[2,1]},{"size":5,"px":[22,22,22,11,23],"py":[16,15,14,6,13],"pz":[0,0,0,1,0],"nx":[16,15,7,9,9],"ny":[15,8,4,10,10],"nz":[0,0,1,1,-1]},{"size":2,"px":[13,3],"py":[3,1],"pz":[0,2],"nx":[8,3],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[5,6],"py":[4,1],"pz":[1,-1],"nx":[6,3],"ny":[4,2],"nz":[1,2]},{"size":3,"px":[4,2,6],"py":[6,3,4],"pz":[1,2,1],"nx":[10,0,4],"ny":[9,4,3],"nz":[0,-1,-1]},{"size":4,"px":[2,8,4,10],"py":[4,23,7,23],"pz":[2,0,1,0],"nx":[9,4,11,9],"ny":[21,5,16,0],"nz":[0,-1,-1,-1]},{"size":2,"px":[6,3],"py":[13,0],"pz":[0,-1],"nx":[8,2],"ny":[11,2],"nz":[0,2]},{"size":2,"px":[3,3],"py":[1,4],"pz":[1,-1],"nx":[3,5],"ny":[0,1],"nz":[1,0]},{"size":2,"px":[7,2],"py":[0,0],"pz":[0,2],"nx":[2,10],"ny":[1,6],"nz":[2,0]},{"size":2,"px":[10,2],"py":[7,0],"pz":[1,-1],"nx":[21,5],"ny":[15,4],"nz":[0,2]},{"size":2,"px":[1,1],"py":[10,9],"pz":[0,0],"nx":[0,3],"ny":[13,11],"nz":[0,-1]},{"size":2,"px":[11,9],"py":[13,0],"pz":[0,-1],"nx":[3,3],"ny":[4,3],"nz":[1,1]},{"size":5,"px":[14,13,13,14,14],"py":[12,10,11,13,13],"pz":[0,0,0,0,-1],"nx":[9,8,4,5,7],"ny":[4,4,2,2,4],"nz":[0,0,1,1,0]},{"size":3,"px":[2,4,1],"py":[2,0,0],"pz":[0,0,1],"nx":[0,7,4],"ny":[0,3,2],"nz":[1,-1,-1]},{"size":2,"px":[11,4],"py":[5,0],"pz":[0,-1],"nx":[8,6],"ny":[4,9],"nz":[1,1]},{"size":3,"px":[0,0,0],"py":[20,2,4],"pz":[0,-1,-1],"nx":[12,3,10],"ny":[3,1,3],"nz":[0,2,0]},{"size":5,"px":[5,11,10,13,13],"py":[0,0,0,2,2],"pz":[1,0,0,0,-1],"nx":[4,5,5,4,5],"ny":[14,0,2,6,1],"nz":[0,0,0,0,0]},{"size":2,"px":[2,4],"py":[3,6],"pz":[2,1],"nx":[3,11],"ny":[4,1],"nz":[1,-1]},{"size":2,"px":[14,-1715597992],"py":[19,9],"pz":[0,-1],"nx":[7,14],"ny":[10,17],"nz":[1,0]},{"size":2,"px":[11,1],"py":[9,0],"pz":[0,-1],"nx":[1,12],"ny":[2,10],"nz":[2,0]},{"size":2,"px":[17,9],"py":[13,17],"pz":[0,-1],"nx":[8,4],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[0,7],"py":[1,9],"pz":[1,-1],"nx":[18,4],"ny":[14,2],"nz":[0,2]},{"size":2,"px":[14,7],"py":[23,9],"pz":[0,-1],"nx":[4,8],"ny":[5,10],"nz":[2,1]},{"size":2,"px":[8,7],"py":[17,9],"pz":[0,-1],"nx":[3,2],"ny":[0,3],"nz":[0,0]},{"size":2,"px":[13,4],"py":[20,1],"pz":[0,-1],"nx":[5,3],"ny":[21,17],"nz":[0,0]},{"size":3,"px":[0,0,1],"py":[3,6,15],"pz":[2,1,0],"nx":[10,8,3],"ny":[6,4,2],"nz":[0,-1,-1]},{"size":2,"px":[8,8],"py":[18,8],"pz":[0,-1],"nx":[5,4],"ny":[8,10],"nz":[1,1]},{"size":2,"px":[6,5],"py":[2,2],"pz":[1,1],"nx":[8,9],"ny":[4,3],"nz":[1,-1]},{"size":2,"px":[6,3],"py":[11,5],"pz":[1,2],"nx":[13,3],"ny":[19,2],"nz":[0,-1]},{"size":2,"px":[4,6],"py":[1,11],"pz":[2,-1],"nx":[3,2],"ny":[1,0],"nz":[1,2]},{"size":2,"px":[9,4],"py":[10,5],"pz":[1,2],"nx":[8,4],"ny":[10,4],"nz":[1,-1]},{"size":2,"px":[12,12],"py":[11,20],"pz":[0,-1],"nx":[0,0],"ny":[6,10],"nz":[1,0]},{"size":2,"px":[7,12],"py":[2,20],"pz":[0,-1],"nx":[2,2],"ny":[2,3],"nz":[2,2]},{"size":2,"px":[0,15],"py":[5,21],"pz":[1,-1],"nx":[10,9],"ny":[3,3],"nz":[0,1]},{"size":2,"px":[15,9],"py":[1,0],"pz":[0,1],"nx":[19,3],"ny":[0,3],"nz":[0,-1]},{"size":2,"px":[21,5],"py":[13,5],"pz":[0,2],"nx":[23,6],"ny":[23,5],"nz":[0,-1]},{"size":2,"px":[5,8],"py":[3,1],"pz":[2,-1],"nx":[9,9],"ny":[6,5],"nz":[1,1]},{"size":2,"px":[2,2],"py":[7,7],"pz":[1,-1],"nx":[5,3],"ny":[23,17],"nz":[0,0]},{"size":2,"px":[11,3],"py":[6,4],"pz":[0,-1],"nx":[2,4],"ny":[2,4],"nz":[2,1]},{"size":3,"px":[14,0,17],"py":[20,3,21],"pz":[0,-1,-1],"nx":[11,11,11],"ny":[7,9,10],"nz":[1,1,1]},{"size":5,"px":[11,11,23,23,12],"py":[10,11,21,20,12],"pz":[1,1,0,0,0],"nx":[8,3,6,7,7],"ny":[4,5,11,11,11],"nz":[1,2,1,1,-1]},{"size":2,"px":[11,11],"py":[11,10],"pz":[0,0],"nx":[9,3],"ny":[2,5],"nz":[1,-1]},{"size":2,"px":[12,14],"py":[19,19],"pz":[0,0],"nx":[12,13],"ny":[18,17],"nz":[0,-1]},{"size":5,"px":[13,14,12,15,14],"py":[0,0,1,1,1],"pz":[0,0,0,0,0],"nx":[4,8,4,7,7],"ny":[3,4,2,5,5],"nz":[2,1,2,1,-1]},{"size":2,"px":[17,5],"py":[10,2],"pz":[0,-1],"nx":[4,9],"ny":[2,3],"nz":[2,1]},{"size":2,"px":[18,10],"py":[6,10],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":5,"px":[8,18,8,4,16],"py":[6,12,9,4,13],"pz":[1,0,1,2,0],"nx":[3,4,3,5,5],"ny":[0,2,3,1,1],"nz":[1,0,0,0,-1]},{"size":2,"px":[3,6],"py":[2,4],"pz":[2,1],"nx":[8,0],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[0,0],"py":[4,5],"pz":[2,-1],"nx":[4,2],"ny":[14,7],"nz":[0,1]},{"size":4,"px":[3,4,4,3],"py":[11,12,12,2],"pz":[0,0,-1,-1],"nx":[1,2,1,2],"ny":[11,14,12,16],"nz":[0,0,0,0]},{"size":2,"px":[6,0],"py":[11,0],"pz":[0,-1],"nx":[3,4],"ny":[4,5],"nz":[1,1]},{"size":2,"px":[3,2],"py":[21,11],"pz":[0,1],"nx":[3,2],"ny":[10,0],"nz":[1,-1]},{"size":3,"px":[10,3,13],"py":[2,0,2],"pz":[0,2,0],"nx":[7,16,1],"ny":[10,4,1],"nz":[0,-1,-1]},{"size":2,"px":[6,12],"py":[2,5],"pz":[1,0],"nx":[6,18],"ny":[1,19],"nz":[1,-1]},{"size":2,"px":[3,16],"py":[0,16],"pz":[1,-1],"nx":[11,2],"ny":[5,1],"nz":[0,2]},{"size":2,"px":[11,10],"py":[13,1],"pz":[0,-1],"nx":[1,1],"ny":[22,21],"nz":[0,0]},{"size":2,"px":[11,10],"py":[18,18],"pz":[0,0],"nx":[5,8],"ny":[9,0],"nz":[1,-1]},{"size":2,"px":[3,2],"py":[20,18],"pz":[0,0],"nx":[8,3],"ny":[5,1],"nz":[1,-1]},{"size":2,"px":[14,2],"py":[17,1],"pz":[0,-1],"nx":[14,13],"ny":[15,15],"nz":[0,0]},{"size":2,"px":[3,4],"py":[2,3],"pz":[2,2],"nx":[8,3],"ny":[4,0],"nz":[1,-1]},{"size":5,"px":[8,18,18,8,7],"py":[6,11,11,7,9],"pz":[1,0,-1,-1,-1],"nx":[5,13,5,11,5],"ny":[3,11,0,8,2],"nz":[2,0,2,1,2]},{"size":5,"px":[12,0,5,4,7],"py":[15,0,4,0,9],"pz":[0,-1,-1,-1,-1],"nx":[8,7,4,16,6],"ny":[17,12,9,10,12],"nz":[0,0,1,0,0]},{"size":2,"px":[6,7],"py":[14,1],"pz":[0,-1],"nx":[5,4],"ny":[9,4],"nz":[1,1]},{"size":4,"px":[8,0,22,4],"py":[4,4,23,0],"pz":[0,-1,-1,-1],"nx":[2,4,2,5],"ny":[0,1,2,9],"nz":[2,1,2,1]},{"size":5,"px":[9,9,10,10,8],"py":[0,1,1,2,0],"pz":[1,1,1,1,1],"nx":[4,16,16,16,6],"ny":[2,11,11,11,12],"nz":[2,0,-1,-1,-1]},{"size":2,"px":[6,6],"py":[6,5],"pz":[1,1],"nx":[0,4],"ny":[3,2],"nz":[1,-1]},{"size":3,"px":[10,3,4],"py":[5,9,8],"pz":[1,-1,-1],"nx":[11,23,23],"ny":[7,12,11],"nz":[1,0,0]},{"size":3,"px":[13,12,7],"py":[19,19,10],"pz":[0,0,1],"nx":[13,5,19],"ny":[20,15,22],"nz":[0,-1,-1]},{"size":2,"px":[12,12],"py":[12,13],"pz":[0,0],"nx":[9,10],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[0,12],"py":[1,13],"pz":[2,-1],"nx":[2,7],"ny":[2,13],"nz":[2,0]},{"size":2,"px":[10,10],"py":[8,9],"pz":[1,1],"nx":[19,7],"ny":[23,13],"nz":[0,-1]},{"size":4,"px":[8,7,23,15],"py":[11,12,4,21],"pz":[0,0,-1,-1],"nx":[2,5,1,10],"ny":[6,6,2,13],"nz":[0,1,1,0]},{"size":2,"px":[10,9],"py":[3,3],"pz":[0,0],"nx":[2,3],"ny":[2,4],"nz":[2,-1]},{"size":2,"px":[5,2],"py":[3,4],"pz":[2,-1],"nx":[3,6],"ny":[1,2],"nz":[2,1]},{"size":2,"px":[7,11],"py":[20,16],"pz":[0,-1],"nx":[2,4],"ny":[5,20],"nz":[2,0]},{"size":2,"px":[9,7],"py":[7,5],"pz":[1,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[4,2],"py":[11,3],"pz":[1,2],"nx":[5,5],"ny":[3,5],"nz":[2,-1]},{"size":2,"px":[11,3],"py":[11,5],"pz":[1,-1],"nx":[4,1],"ny":[12,3],"nz":[0,2]},{"size":2,"px":[9,11],"py":[6,4],"pz":[1,-1],"nx":[10,20],"ny":[9,18],"nz":[1,0]},{"size":5,"px":[2,2,2,2,1],"py":[15,13,16,14,7],"pz":[0,0,0,0,1],"nx":[15,8,9,8,4],"ny":[11,6,5,5,4],"nz":[0,1,1,1,-1]},{"size":2,"px":[12,2],"py":[5,5],"pz":[0,-1],"nx":[3,2],"ny":[7,2],"nz":[1,2]},{"size":2,"px":[5,11],"py":[1,3],"pz":[2,1],"nx":[10,10],"ny":[3,3],"nz":[1,-1]},{"size":2,"px":[17,11],"py":[13,18],"pz":[0,-1],"nx":[6,9],"ny":[9,4],"nz":[1,1]},{"size":5,"px":[5,1,2,5,6],"py":[14,4,9,15,23],"pz":[0,2,1,0,0],"nx":[4,9,18,16,17],"ny":[0,1,1,0,0],"nz":[2,1,0,0,0]},{"size":2,"px":[16,17],"py":[0,0],"pz":[0,0],"nx":[23,23],"ny":[5,4],"nz":[0,-1]},{"size":2,"px":[13,8],"py":[20,6],"pz":[0,-1],"nx":[5,6],"ny":[12,10],"nz":[0,1]},{"size":2,"px":[6,15],"py":[15,0],"pz":[0,-1],"nx":[6,3],"ny":[16,4],"nz":[0,1]},{"size":2,"px":[18,20],"py":[7,8],"pz":[0,0],"nx":[18,11],"ny":[9,14],"nz":[0,-1]},{"size":2,"px":[9,4],"py":[12,6],"pz":[0,1],"nx":[3,15],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[0,0],"py":[5,2],"pz":[1,2],"nx":[5,5],"ny":[2,2],"nz":[1,-1]},{"size":2,"px":[5,20],"py":[1,20],"pz":[1,-1],"nx":[15,17],"ny":[1,2],"nz":[0,0]},{"size":2,"px":[7,2],"py":[16,4],"pz":[0,2],"nx":[4,0],"ny":[10,6],"nz":[1,-1]},{"size":2,"px":[3,8],"py":[5,0],"pz":[1,-1],"nx":[1,1],"ny":[10,18],"nz":[1,0]},{"size":2,"px":[22,0],"py":[3,0],"pz":[0,-1],"nx":[23,11],"ny":[4,1],"nz":[0,1]},{"size":3,"px":[19,10,20],"py":[21,8,18],"pz":[0,1,0],"nx":[3,6,20],"ny":[5,11,14],"nz":[2,-1,-1]},{"size":4,"px":[2,1,6,5],"py":[7,4,23,22],"pz":[1,2,0,0],"nx":[9,19,20,4],"ny":[8,11,9,2],"nz":[0,-1,-1,-1]},{"size":2,"px":[3,6],"py":[2,11],"pz":[2,1],"nx":[12,10],"ny":[21,9],"nz":[0,-1]},{"size":4,"px":[6,0,2,2],"py":[6,1,4,1],"pz":[1,-1,-1,-1],"nx":[0,0,0,0],"ny":[5,8,9,4],"nz":[1,0,0,1]},{"size":5,"px":[3,13,6,11,9],"py":[0,3,1,1,2],"pz":[2,0,1,0,0],"nx":[7,20,16,4,7],"ny":[7,2,19,2,6],"nz":[1,0,0,2,1]},{"size":4,"px":[7,5,2,6],"py":[7,7,4,11],"pz":[0,0,2,1],"nx":[7,1,21,0],"ny":[8,4,11,3],"nz":[0,-1,-1,-1]},{"size":2,"px":[2,2],"py":[3,2],"pz":[2,2],"nx":[8,9],"ny":[3,11],"nz":[1,-1]},{"size":2,"px":[7,13],"py":[3,5],"pz":[1,0],"nx":[4,3],"ny":[2,2],"nz":[1,-1]},{"size":4,"px":[3,12,13,11],"py":[0,1,1,1],"pz":[2,0,0,0],"nx":[8,9,13,0],"ny":[4,1,16,3],"nz":[1,-1,-1,-1]},{"size":2,"px":[10,1],"py":[4,14],"pz":[0,-1],"nx":[5,10],"ny":[1,2],"nz":[1,0]},{"size":2,"px":[11,12],"py":[21,21],"pz":[0,0],"nx":[10,11],"ny":[19,19],"nz":[0,0]},{"size":2,"px":[8,12],"py":[6,21],"pz":[1,-1],"nx":[4,8],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[11,7],"py":[19,0],"pz":[0,-1],"nx":[6,5],"ny":[9,11],"nz":[1,1]},{"size":5,"px":[11,11,11,10,10],"py":[10,12,11,13,13],"pz":[0,0,0,0,-1],"nx":[7,13,6,12,7],"ny":[10,6,3,6,11],"nz":[0,0,1,0,0]},{"size":2,"px":[12,11],"py":[6,12],"pz":[0,-1],"nx":[4,8],"ny":[4,4],"nz":[1,1]},{"size":5,"px":[16,15,16,15,17],"py":[1,0,0,1,1],"pz":[0,0,0,0,0],"nx":[13,7,6,12,12],"ny":[5,4,3,6,6],"nz":[0,1,1,0,-1]},{"size":2,"px":[2,3],"py":[1,3],"pz":[2,1],"nx":[1,5],"ny":[1,3],"nz":[2,-1]},{"size":2,"px":[6,3],"py":[13,6],"pz":[0,1],"nx":[4,9],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[0,3],"py":[4,3],"pz":[1,-1],"nx":[4,8],"ny":[3,6],"nz":[2,1]},{"size":2,"px":[6,3],"py":[2,1],"pz":[0,1],"nx":[5,5],"ny":[7,21],"nz":[1,-1]},{"size":2,"px":[8,4],"py":[0,0],"pz":[1,-1],"nx":[19,17],"ny":[1,0],"nz":[0,0]},{"size":4,"px":[8,11,5,0],"py":[6,1,1,22],"pz":[1,-1,-1,-1],"nx":[0,10,10,1],"ny":[6,12,13,4],"nz":[1,0,0,1]},{"size":2,"px":[8,17],"py":[6,13],"pz":[1,0],"nx":[14,17],"ny":[9,3],"nz":[0,-1]},{"size":2,"px":[5,8],"py":[0,4],"pz":[2,-1],"nx":[9,8],"ny":[1,1],"nz":[0,0]},{"size":2,"px":[11,14],"py":[13,9],"pz":[0,-1],"nx":[23,23],"ny":[21,19],"nz":[0,0]},{"size":2,"px":[10,9],"py":[9,3],"pz":[0,-1],"nx":[6,3],"ny":[2,1],"nz":[1,2]},{"size":2,"px":[11,1],"py":[4,4],"pz":[0,-1],"nx":[2,4],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[5,9],"py":[3,3],"pz":[2,-1],"nx":[17,9],"ny":[12,5],"nz":[0,1]},{"size":2,"px":[9,7],"py":[18,16],"pz":[0,-1],"nx":[5,2],"ny":[9,5],"nz":[1,2]},{"size":2,"px":[3,6],"py":[0,1],"pz":[1,-1],"nx":[4,5],"ny":[1,0],"nz":[0,0]}],"alpha":[-1.149973e+00,1.149973e+00,-6.844773e-01,6.844773e-01,-6.635048e-01,6.635048e-01,-4.888349e-01,4.888349e-01,-4.267976e-01,4.267976e-01,-4.258100e-01,4.258100e-01,-4.815853e-01,4.815853e-01,-4.091859e-01,4.091859e-01,-3.137414e-01,3.137414e-01,-3.339860e-01,3.339860e-01,-3.891196e-01,3.891196e-01,-4.167691e-01,4.167691e-01,-3.186609e-01,3.186609e-01,-2.957171e-01,2.957171e-01,-3.210062e-01,3.210062e-01,-2.725684e-01,2.725684e-01,-2.452176e-01,2.452176e-01,-2.812662e-01,2.812662e-01,-3.029622e-01,3.029622e-01,-3.293745e-01,3.293745e-01,-3.441536e-01,3.441536e-01,-2.946918e-01,2.946918e-01,-2.890545e-01,2.890545e-01,-1.949205e-01,1.949205e-01,-2.176102e-01,2.176102e-01,-2.595190e-01,2.595190e-01,-2.690931e-01,2.690931e-01,-2.130294e-01,2.130294e-01,-2.316308e-01,2.316308e-01,-2.798562e-01,2.798562e-01,-2.146988e-01,2.146988e-01,-2.332089e-01,2.332089e-01,-2.470614e-01,2.470614e-01,-2.204300e-01,2.204300e-01,-2.272045e-01,2.272045e-01,-2.583686e-01,2.583686e-01,-2.072299e-01,2.072299e-01,-1.834971e-01,1.834971e-01,-2.332656e-01,2.332656e-01,-3.271297e-01,3.271297e-01,-2.401937e-01,2.401937e-01,-2.006316e-01,2.006316e-01,-2.401947e-01,2.401947e-01,-2.475346e-01,2.475346e-01,-2.579532e-01,2.579532e-01,-2.466235e-01,2.466235e-01,-1.787582e-01,1.787582e-01,-2.036892e-01,2.036892e-01,-1.665028e-01,1.665028e-01,-1.576510e-01,1.576510e-01,-2.036997e-01,2.036997e-01,-2.040734e-01,2.040734e-01,-1.792532e-01,1.792532e-01,-2.174767e-01,2.174767e-01,-1.876948e-01,1.876948e-01,-1.883137e-01,1.883137e-01,-1.923872e-01,1.923872e-01,-2.620218e-01,2.620218e-01,-1.659873e-01,1.659873e-01,-1.475948e-01,1.475948e-01,-1.731607e-01,1.731607e-01,-2.059256e-01,2.059256e-01,-1.586309e-01,1.586309e-01,-1.607668e-01,1.607668e-01,-1.975101e-01,1.975101e-01,-2.130745e-01,2.130745e-01,-1.898872e-01,1.898872e-01,-2.052598e-01,2.052598e-01,-1.599397e-01,1.599397e-01,-1.770134e-01,1.770134e-01,-1.888249e-01,1.888249e-01,-1.515406e-01,1.515406e-01,-1.907771e-01,1.907771e-01,-1.698406e-01,1.698406e-01,-2.079535e-01,2.079535e-01,-1.966967e-01,1.966967e-01,-1.631391e-01,1.631391e-01,-2.158666e-01,2.158666e-01,-2.891774e-01,2.891774e-01,-1.581556e-01,1.581556e-01,-1.475359e-01,1.475359e-01,-1.806169e-01,1.806169e-01,-1.782238e-01,1.782238e-01,-1.660440e-01,1.660440e-01,-1.576919e-01,1.576919e-01,-1.741775e-01,1.741775e-01,-1.427265e-01,1.427265e-01,-1.695880e-01,1.695880e-01,-1.486712e-01,1.486712e-01,-1.533565e-01,1.533565e-01,-1.601464e-01,1.601464e-01,-1.978414e-01,1.978414e-01,-1.746566e-01,1.746566e-01,-1.794736e-01,1.794736e-01,-1.896567e-01,1.896567e-01,-1.666197e-01,1.666197e-01,-1.969351e-01,1.969351e-01,-2.321735e-01,2.321735e-01,-1.592485e-01,1.592485e-01,-1.671464e-01,1.671464e-01,-1.688885e-01,1.688885e-01,-1.868042e-01,1.868042e-01,-1.301138e-01,1.301138e-01,-1.330094e-01,1.330094e-01,-1.268423e-01,1.268423e-01,-1.820868e-01,1.820868e-01,-1.881020e-01,1.881020e-01,-1.580814e-01,1.580814e-01,-1.302653e-01,1.302653e-01,-1.787262e-01,1.787262e-01,-1.658453e-01,1.658453e-01,-1.240772e-01,1.240772e-01,-1.315621e-01,1.315621e-01,-1.756341e-01,1.756341e-01,-1.429438e-01,1.429438e-01,-1.351775e-01,1.351775e-01,-2.035692e-01,2.035692e-01,-1.267670e-01,1.267670e-01,-1.288470e-01,1.288470e-01,-1.393648e-01,1.393648e-01,-1.755962e-01,1.755962e-01,-1.308445e-01,1.308445e-01,-1.703894e-01,1.703894e-01,-1.461334e-01,1.461334e-01,-1.368683e-01,1.368683e-01,-1.244085e-01,1.244085e-01,-1.718163e-01,1.718163e-01,-1.415624e-01,1.415624e-01,-1.752024e-01,1.752024e-01,-1.666463e-01,1.666463e-01,-1.407325e-01,1.407325e-01,-1.258317e-01,1.258317e-01,-1.416511e-01,1.416511e-01,-1.420816e-01,1.420816e-01,-1.562547e-01,1.562547e-01,-1.542952e-01,1.542952e-01,-1.158829e-01,1.158829e-01,-1.392875e-01,1.392875e-01,-1.610095e-01,1.610095e-01,-1.546440e-01,1.546440e-01,-1.416235e-01,1.416235e-01,-2.028817e-01,2.028817e-01,-1.106779e-01,1.106779e-01,-9.231660e-02,9.231660e-02,-1.164460e-01,1.164460e-01,-1.701578e-01,1.701578e-01,-1.277995e-01,1.277995e-01,-1.946177e-01,1.946177e-01,-1.394509e-01,1.394509e-01,-1.370145e-01,1.370145e-01,-1.446031e-01,1.446031e-01,-1.665215e-01,1.665215e-01,-1.435822e-01,1.435822e-01,-1.559354e-01,1.559354e-01,-1.591860e-01,1.591860e-01,-1.193338e-01,1.193338e-01,-1.236954e-01,1.236954e-01,-1.209139e-01,1.209139e-01,-1.267385e-01,1.267385e-01,-1.232397e-01,1.232397e-01,-1.299632e-01,1.299632e-01,-1.302020e-01,1.302020e-01,-1.202975e-01,1.202975e-01,-1.525378e-01,1.525378e-01,-1.123073e-01,1.123073e-01,-1.605678e-01,1.605678e-01,-1.406867e-01,1.406867e-01,-1.354273e-01,1.354273e-01,-1.393192e-01,1.393192e-01,-1.278263e-01,1.278263e-01,-1.172073e-01,1.172073e-01,-1.153493e-01,1.153493e-01,-1.356318e-01,1.356318e-01,-1.316614e-01,1.316614e-01,-1.374489e-01,1.374489e-01,-1.018254e-01,1.018254e-01,-1.473336e-01,1.473336e-01,-1.289687e-01,1.289687e-01,-1.299183e-01,1.299183e-01,-1.178391e-01,1.178391e-01,-1.619059e-01,1.619059e-01,-1.842569e-01,1.842569e-01,-1.829095e-01,1.829095e-01,-1.939918e-01,1.939918e-01,-1.395362e-01,1.395362e-01,-1.774673e-01,1.774673e-01,-1.688216e-01,1.688216e-01,-1.671747e-01,1.671747e-01,-1.850178e-01,1.850178e-01,-1.106695e-01,1.106695e-01,-1.258323e-01,1.258323e-01,-1.246819e-01,1.246819e-01,-9.892193e-02,9.892193e-02,-1.399638e-01,1.399638e-01,-1.228375e-01,1.228375e-01,-1.756236e-01,1.756236e-01,-1.360307e-01,1.360307e-01,-1.266574e-01,1.266574e-01,-1.372135e-01,1.372135e-01,-1.175947e-01,1.175947e-01,-1.330075e-01,1.330075e-01,-1.396152e-01,1.396152e-01,-2.088443e-01,2.088443e-01]},{"count":301,"threshold":-4.887516e+00,"feature":[{"size":5,"px":[8,11,8,14,10],"py":[6,9,3,3,4],"pz":[1,0,0,0,0],"nx":[8,7,19,7,13],"ny":[11,8,8,5,8],"nz":[1,1,0,1,0]},{"size":5,"px":[14,3,13,12,12],"py":[4,6,4,4,8],"pz":[0,1,0,0,0],"nx":[2,5,2,10,10],"ny":[2,8,5,8,8],"nz":[2,1,2,0,-1]},{"size":5,"px":[6,5,3,7,7],"py":[2,3,1,2,2],"pz":[0,0,1,0,-1],"nx":[2,2,1,2,1],"ny":[3,1,2,2,2],"nz":[0,0,2,0,1]},{"size":5,"px":[3,3,6,12,8],"py":[4,2,4,10,17],"pz":[2,2,1,0,0],"nx":[4,8,8,2,1],"ny":[4,4,4,2,2],"nz":[1,1,-1,-1,-1]},{"size":5,"px":[18,19,17,9,16],"py":[1,2,2,0,2],"pz":[0,0,0,1,0],"nx":[23,23,22,22,22],"ny":[4,3,1,0,2],"nz":[0,0,0,0,0]},{"size":3,"px":[15,4,14],"py":[23,4,18],"pz":[0,2,0],"nx":[7,0,5],"ny":[10,4,9],"nz":[1,-1,-1]},{"size":5,"px":[11,11,16,11,17],"py":[8,6,11,7,11],"pz":[0,0,0,0,0],"nx":[8,4,14,14,1],"ny":[4,4,8,8,5],"nz":[1,1,0,-1,-1]},{"size":5,"px":[12,12,12,12,12],"py":[13,10,11,12,12],"pz":[0,0,0,0,-1],"nx":[4,4,1,2,9],"ny":[8,10,2,4,15],"nz":[0,1,2,1,0]},{"size":2,"px":[19,0],"py":[14,17],"pz":[0,-1],"nx":[20,19],"ny":[15,22],"nz":[0,0]},{"size":5,"px":[3,3,1,3,5],"py":[13,15,6,14,22],"pz":[0,0,1,0,0],"nx":[0,0,1,0,0],"ny":[11,21,23,5,5],"nz":[1,0,0,2,-1]},{"size":5,"px":[4,2,10,4,3],"py":[19,4,13,16,13],"pz":[0,1,0,0,0],"nx":[3,20,7,4,0],"ny":[4,19,5,1,5],"nz":[1,-1,-1,-1,-1]},{"size":2,"px":[11,5],"py":[4,4],"pz":[0,-1],"nx":[15,3],"ny":[15,1],"nz":[0,2]},{"size":4,"px":[17,17,12,11],"py":[14,15,18,18],"pz":[0,0,0,0],"nx":[11,4,1,0],"ny":[17,20,8,5],"nz":[0,-1,-1,-1]},{"size":5,"px":[6,2,1,2,11],"py":[14,4,1,1,18],"pz":[0,-1,-1,-1,-1],"nx":[5,5,3,5,2],"ny":[18,17,7,9,2],"nz":[0,0,1,1,2]},{"size":5,"px":[20,19,20,15,20],"py":[17,20,12,12,8],"pz":[0,0,0,0,0],"nx":[17,0,5,2,2],"ny":[8,4,9,2,2],"nz":[0,-1,-1,-1,-1]},{"size":2,"px":[6,8],"py":[7,11],"pz":[1,-1],"nx":[7,8],"ny":[7,10],"nz":[1,1]},{"size":5,"px":[15,16,14,8,8],"py":[2,2,2,0,0],"pz":[0,0,0,1,-1],"nx":[20,11,21,18,19],"ny":[3,6,5,1,2],"nz":[0,1,0,0,0]},{"size":4,"px":[17,18,9,8],"py":[23,21,7,8],"pz":[0,0,1,1],"nx":[8,17,10,18],"ny":[4,12,2,1],"nz":[1,-1,-1,-1]},{"size":5,"px":[2,2,9,4,8],"py":[7,3,12,12,23],"pz":[1,1,0,0,0],"nx":[0,0,0,0,0],"ny":[3,1,2,4,4],"nz":[0,0,0,0,-1]},{"size":3,"px":[7,8,5],"py":[22,23,9],"pz":[0,0,1],"nx":[9,4,2],"ny":[21,4,0],"nz":[0,-1,-1]},{"size":2,"px":[3,3],"py":[7,7],"pz":[1,-1],"nx":[3,2],"ny":[4,2],"nz":[1,2]},{"size":5,"px":[15,11,10,3,17],"py":[0,1,2,3,1],"pz":[0,0,0,2,0],"nx":[5,8,4,3,3],"ny":[9,4,7,10,10],"nz":[1,1,1,1,-1]},{"size":3,"px":[22,11,22],"py":[12,5,14],"pz":[0,1,0],"nx":[23,23,3],"ny":[22,23,8],"nz":[0,0,-1]},{"size":2,"px":[3,11],"py":[7,5],"pz":[1,-1],"nx":[8,2],"ny":[14,5],"nz":[0,2]},{"size":4,"px":[17,16,2,4],"py":[14,13,5,0],"pz":[0,0,-1,-1],"nx":[8,9,15,8],"ny":[8,9,14,7],"nz":[1,1,0,1]},{"size":2,"px":[5,16],"py":[6,13],"pz":[1,-1],"nx":[2,1],"ny":[4,2],"nz":[1,2]},{"size":5,"px":[1,0,1,2,1],"py":[15,2,16,19,12],"pz":[0,2,0,0,0],"nx":[8,7,4,9,9],"ny":[5,11,4,5,5],"nz":[1,1,1,1,-1]},{"size":2,"px":[8,7],"py":[11,12],"pz":[0,0],"nx":[9,1],"ny":[10,16],"nz":[0,-1]},{"size":2,"px":[15,13],"py":[17,10],"pz":[0,-1],"nx":[7,4],"ny":[8,4],"nz":[1,2]},{"size":5,"px":[11,10,7,8,9],"py":[0,0,1,1,1],"pz":[0,0,0,0,0],"nx":[4,5,4,5,6],"ny":[1,0,2,1,0],"nz":[0,0,0,0,-1]},{"size":2,"px":[2,2],"py":[4,3],"pz":[2,2],"nx":[3,21],"ny":[4,20],"nz":[1,-1]},{"size":5,"px":[10,11,5,2,11],"py":[12,10,6,11,11],"pz":[0,0,1,0,0],"nx":[4,15,16,7,7],"ny":[5,10,11,10,10],"nz":[1,0,0,0,-1]},{"size":5,"px":[13,14,1,11,11],"py":[2,2,3,2,2],"pz":[0,0,2,0,-1],"nx":[3,0,0,1,0],"ny":[23,15,14,9,8],"nz":[0,0,0,1,1]},{"size":2,"px":[17,2],"py":[13,5],"pz":[0,-1],"nx":[4,9],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[10,5],"py":[4,1],"pz":[0,-1],"nx":[11,3],"ny":[3,0],"nz":[0,2]},{"size":2,"px":[5,3],"py":[3,3],"pz":[2,-1],"nx":[11,23],"ny":[8,14],"nz":[1,0]},{"size":3,"px":[22,22,22],"py":[16,18,9],"pz":[0,0,0],"nx":[13,2,0],"ny":[17,3,5],"nz":[0,-1,-1]},{"size":5,"px":[13,10,13,14,11],"py":[2,2,1,2,1],"pz":[0,0,0,0,0],"nx":[3,3,8,6,6],"ny":[2,5,4,11,11],"nz":[2,2,1,1,-1]},{"size":3,"px":[12,1,1],"py":[14,0,1],"pz":[0,-1,-1],"nx":[8,15,7],"ny":[1,2,0],"nz":[1,0,1]},{"size":2,"px":[4,5],"py":[20,23],"pz":[0,0],"nx":[3,3],"ny":[10,2],"nz":[1,-1]},{"size":2,"px":[2,4],"py":[7,2],"pz":[1,-1],"nx":[4,3],"ny":[23,16],"nz":[0,0]},{"size":3,"px":[3,3,6],"py":[5,2,4],"pz":[2,2,1],"nx":[3,1,2],"ny":[5,17,0],"nz":[1,-1,-1]},{"size":2,"px":[14,8],"py":[17,6],"pz":[0,1],"nx":[13,10],"ny":[16,9],"nz":[0,-1]},{"size":5,"px":[15,7,14,13,14],"py":[1,0,0,0,1],"pz":[0,1,0,0,0],"nx":[4,4,4,8,8],"ny":[5,3,2,10,10],"nz":[2,2,2,1,-1]},{"size":5,"px":[8,9,4,5,4],"py":[13,12,9,5,7],"pz":[0,0,1,1,1],"nx":[22,21,22,22,22],"ny":[4,0,3,2,2],"nz":[0,0,0,0,-1]},{"size":2,"px":[17,17],"py":[16,13],"pz":[0,0],"nx":[14,21],"ny":[8,0],"nz":[0,-1]},{"size":2,"px":[16,10],"py":[4,9],"pz":[0,-1],"nx":[16,10],"ny":[3,3],"nz":[0,1]},{"size":5,"px":[1,1,0,1,0],"py":[17,16,7,15,8],"pz":[0,0,1,0,0],"nx":[4,3,8,9,7],"ny":[3,3,6,6,6],"nz":[1,1,0,0,-1]},{"size":2,"px":[3,3],"py":[2,3],"pz":[2,2],"nx":[8,3],"ny":[4,3],"nz":[1,-1]},{"size":2,"px":[10,2],"py":[17,4],"pz":[0,2],"nx":[10,12],"ny":[15,14],"nz":[0,-1]},{"size":2,"px":[11,11],"py":[14,12],"pz":[0,0],"nx":[9,10],"ny":[13,11],"nz":[0,0]},{"size":2,"px":[12,13],"py":[5,5],"pz":[0,0],"nx":[3,4],"ny":[4,1],"nz":[1,-1]},{"size":5,"px":[7,10,8,11,11],"py":[13,2,12,2,2],"pz":[0,0,0,0,-1],"nx":[10,1,1,10,1],"ny":[12,5,3,13,1],"nz":[0,1,1,0,2]},{"size":2,"px":[6,10],"py":[4,2],"pz":[1,-1],"nx":[4,6],"ny":[4,9],"nz":[1,1]},{"size":2,"px":[20,20],"py":[21,22],"pz":[0,0],"nx":[15,8],"ny":[5,5],"nz":[0,-1]},{"size":2,"px":[4,3],"py":[3,3],"pz":[2,2],"nx":[9,17],"ny":[4,15],"nz":[1,-1]},{"size":3,"px":[2,2,4],"py":[3,3,7],"pz":[2,-1,-1],"nx":[7,4,4],"ny":[6,5,4],"nz":[1,2,2]},{"size":5,"px":[8,9,16,17,17],"py":[1,2,1,1,1],"pz":[1,1,0,0,-1],"nx":[2,2,4,2,4],"ny":[16,14,22,15,21],"nz":[0,0,0,0,0]},{"size":2,"px":[9,9],"py":[18,0],"pz":[0,-1],"nx":[2,5],"ny":[5,8],"nz":[2,1]},{"size":2,"px":[7,8],"py":[11,11],"pz":[0,0],"nx":[15,5],"ny":[8,8],"nz":[0,-1]},{"size":2,"px":[0,3],"py":[4,3],"pz":[2,-1],"nx":[1,6],"ny":[4,14],"nz":[2,0]},{"size":2,"px":[6,12],"py":[7,11],"pz":[1,-1],"nx":[0,0],"ny":[7,12],"nz":[1,0]},{"size":2,"px":[3,7],"py":[10,22],"pz":[1,0],"nx":[4,3],"ny":[10,0],"nz":[1,-1]},{"size":2,"px":[5,19],"py":[4,21],"pz":[2,-1],"nx":[11,11],"ny":[8,9],"nz":[1,1]},{"size":2,"px":[3,3],"py":[8,7],"pz":[1,1],"nx":[4,20],"ny":[4,5],"nz":[1,-1]},{"size":5,"px":[11,23,23,23,23],"py":[7,13,19,20,21],"pz":[1,0,0,0,0],"nx":[4,3,2,8,8],"ny":[11,5,5,23,23],"nz":[1,1,2,0,-1]},{"size":2,"px":[4,1],"py":[0,2],"pz":[0,0],"nx":[0,6],"ny":[0,11],"nz":[0,-1]},{"size":2,"px":[11,8],"py":[12,1],"pz":[0,-1],"nx":[23,23],"ny":[13,12],"nz":[0,0]},{"size":5,"px":[23,11,23,11,11],"py":[13,7,12,5,6],"pz":[0,1,0,1,1],"nx":[6,3,8,7,7],"ny":[12,4,4,11,11],"nz":[0,1,1,0,-1]},{"size":2,"px":[20,5],"py":[15,5],"pz":[0,-1],"nx":[10,10],"ny":[11,10],"nz":[1,1]},{"size":2,"px":[11,4],"py":[19,8],"pz":[0,1],"nx":[11,19],"ny":[18,2],"nz":[0,-1]},{"size":2,"px":[14,6],"py":[3,4],"pz":[0,-1],"nx":[8,15],"ny":[1,0],"nz":[1,0]},{"size":4,"px":[14,5,13,12],"py":[23,3,23,23],"pz":[0,1,0,0],"nx":[12,0,1,4],"ny":[21,3,2,4],"nz":[0,-1,-1,-1]},{"size":2,"px":[19,5],"py":[12,2],"pz":[0,-1],"nx":[4,7],"ny":[3,5],"nz":[2,1]},{"size":2,"px":[0,8],"py":[5,3],"pz":[2,-1],"nx":[5,22],"ny":[3,11],"nz":[2,0]},{"size":2,"px":[2,6],"py":[3,12],"pz":[2,0],"nx":[3,5],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[5,5],"py":[0,6],"pz":[2,-1],"nx":[14,6],"ny":[4,2],"nz":[0,1]},{"size":2,"px":[16,11],"py":[1,0],"pz":[0,-1],"nx":[4,8],"ny":[4,10],"nz":[2,1]},{"size":2,"px":[9,4],"py":[4,3],"pz":[1,1],"nx":[5,8],"ny":[0,10],"nz":[2,-1]},{"size":2,"px":[16,1],"py":[22,1],"pz":[0,-1],"nx":[2,2],"ny":[4,2],"nz":[2,2]},{"size":2,"px":[12,2],"py":[11,2],"pz":[0,-1],"nx":[5,5],"ny":[1,0],"nz":[2,2]},{"size":2,"px":[11,11],"py":[4,3],"pz":[1,1],"nx":[7,5],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[9,2],"py":[22,3],"pz":[0,2],"nx":[4,9],"ny":[10,11],"nz":[1,-1]},{"size":2,"px":[2,4],"py":[8,10],"pz":[1,-1],"nx":[5,3],"ny":[23,18],"nz":[0,0]},{"size":2,"px":[12,6],"py":[21,9],"pz":[0,-1],"nx":[11,23],"ny":[6,10],"nz":[1,0]},{"size":2,"px":[9,9],"py":[8,7],"pz":[1,1],"nx":[18,8],"ny":[18,6],"nz":[0,-1]},{"size":2,"px":[13,3],"py":[19,0],"pz":[0,-1],"nx":[6,5],"ny":[9,11],"nz":[1,1]},{"size":5,"px":[2,10,9,7,8],"py":[0,1,0,1,0],"pz":[2,0,0,0,0],"nx":[3,4,6,8,8],"ny":[2,4,9,4,4],"nz":[2,1,1,1,-1]},{"size":2,"px":[8,4],"py":[6,3],"pz":[1,2],"nx":[9,4],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[0,4],"py":[23,3],"pz":[0,-1],"nx":[12,9],"ny":[2,2],"nz":[0,0]},{"size":2,"px":[4,2],"py":[10,3],"pz":[1,2],"nx":[0,2],"ny":[23,5],"nz":[0,-1]},{"size":2,"px":[12,14],"py":[18,0],"pz":[0,-1],"nx":[12,8],"ny":[16,10],"nz":[0,1]},{"size":4,"px":[10,18,7,5],"py":[14,8,0,3],"pz":[0,-1,-1,-1],"nx":[8,6,8,5],"ny":[11,12,5,5],"nz":[0,0,1,1]},{"size":2,"px":[6,5],"py":[2,2],"pz":[1,1],"nx":[8,8],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[12,10],"py":[20,20],"pz":[0,0],"nx":[11,10],"ny":[19,19],"nz":[0,0]},{"size":2,"px":[17,10],"py":[16,20],"pz":[0,-1],"nx":[8,7],"ny":[4,8],"nz":[1,1]},{"size":3,"px":[2,1,3],"py":[20,4,21],"pz":[0,2,0],"nx":[3,4,0],"ny":[10,1,0],"nz":[1,-1,-1]},{"size":5,"px":[6,7,3,6,6],"py":[15,14,7,16,19],"pz":[0,0,1,0,0],"nx":[0,0,0,0,0],"ny":[18,19,16,17,17],"nz":[0,0,0,0,-1]},{"size":2,"px":[8,16],"py":[6,12],"pz":[1,0],"nx":[8,15],"ny":[4,10],"nz":[1,-1]},{"size":5,"px":[0,0,0,0,0],"py":[1,3,2,0,4],"pz":[2,2,2,2,1],"nx":[13,8,14,4,7],"ny":[23,6,23,3,9],"nz":[0,1,0,2,-1]},{"size":2,"px":[3,6],"py":[3,5],"pz":[2,1],"nx":[10,8],"ny":[11,6],"nz":[0,-1]},{"size":2,"px":[11,10],"py":[4,4],"pz":[0,0],"nx":[8,5],"ny":[4,9],"nz":[1,-1]},{"size":5,"px":[15,18,9,16,4],"py":[12,13,6,23,3],"pz":[0,0,1,0,2],"nx":[6,3,6,2,7],"ny":[2,3,0,1,0],"nz":[0,0,0,1,0]},{"size":2,"px":[4,18],"py":[12,13],"pz":[0,-1],"nx":[2,8],"ny":[3,4],"nz":[2,1]},{"size":2,"px":[4,2],"py":[10,4],"pz":[1,2],"nx":[3,3],"ny":[5,0],"nz":[2,-1]},{"size":2,"px":[9,19],"py":[7,8],"pz":[1,0],"nx":[8,3],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[6,0],"py":[6,0],"pz":[0,-1],"nx":[0,0],"ny":[7,2],"nz":[1,2]},{"size":2,"px":[8,8],"py":[0,0],"pz":[1,-1],"nx":[17,18],"ny":[0,2],"nz":[0,0]},{"size":4,"px":[13,4,4,1],"py":[14,7,3,5],"pz":[0,-1,-1,-1],"nx":[3,16,3,7],"ny":[1,15,5,13],"nz":[2,0,2,0]},{"size":2,"px":[4,9],"py":[6,11],"pz":[1,0],"nx":[3,23],"ny":[4,8],"nz":[1,-1]},{"size":5,"px":[9,17,4,16,16],"py":[2,3,1,3,3],"pz":[1,0,2,0,-1],"nx":[2,3,3,2,3],"ny":[1,7,2,3,3],"nz":[2,1,1,1,1]},{"size":2,"px":[10,5],"py":[22,9],"pz":[0,1],"nx":[10,3],"ny":[21,2],"nz":[0,-1]},{"size":2,"px":[11,11],"py":[6,3],"pz":[0,-1],"nx":[8,5],"ny":[4,3],"nz":[1,1]},{"size":2,"px":[10,5],"py":[8,3],"pz":[0,-1],"nx":[14,5],"ny":[14,2],"nz":[0,2]},{"size":2,"px":[7,8],"py":[3,2],"pz":[0,-1],"nx":[8,2],"ny":[18,2],"nz":[0,2]},{"size":2,"px":[1,1],"py":[19,11],"pz":[0,1],"nx":[9,4],"ny":[5,1],"nz":[0,-1]},{"size":2,"px":[2,4],"py":[3,6],"pz":[2,1],"nx":[3,3],"ny":[4,4],"nz":[1,-1]},{"size":5,"px":[7,15,13,14,4],"py":[6,12,9,11,4],"pz":[1,0,0,0,2],"nx":[7,3,8,4,5],"ny":[0,3,0,2,1],"nz":[0,0,0,0,0]},{"size":5,"px":[10,13,7,8,9],"py":[0,1,1,0,1],"pz":[0,0,0,0,0],"nx":[7,4,4,4,8],"ny":[8,3,4,2,4],"nz":[1,2,2,2,1]},{"size":2,"px":[6,1],"py":[6,0],"pz":[1,-1],"nx":[11,7],"ny":[3,2],"nz":[0,1]},{"size":2,"px":[13,0],"py":[13,2],"pz":[0,-1],"nx":[0,1],"ny":[13,16],"nz":[0,0]},{"size":2,"px":[8,17],"py":[6,13],"pz":[1,0],"nx":[8,1],"ny":[4,16],"nz":[1,-1]},{"size":5,"px":[12,11,3,6,17],"py":[4,4,1,2,14],"pz":[0,0,2,1,0],"nx":[6,23,23,6,23],"ny":[5,7,6,6,14],"nz":[1,0,0,1,0]},{"size":2,"px":[5,22],"py":[4,17],"pz":[2,-1],"nx":[4,8],"ny":[5,7],"nz":[2,1]},{"size":2,"px":[15,14],"py":[1,1],"pz":[0,0],"nx":[4,7],"ny":[2,4],"nz":[2,-1]},{"size":2,"px":[15,17],"py":[12,7],"pz":[0,-1],"nx":[14,10],"ny":[11,4],"nz":[0,1]},{"size":4,"px":[10,2,9,15],"py":[5,11,1,13],"pz":[0,-1,-1,-1],"nx":[11,3,3,13],"ny":[1,1,0,1],"nz":[0,2,2,0]},{"size":2,"px":[7,21],"py":[15,22],"pz":[0,-1],"nx":[4,9],"ny":[8,14],"nz":[1,0]},{"size":2,"px":[6,5],"py":[21,2],"pz":[0,-1],"nx":[3,5],"ny":[11,21],"nz":[1,0]},{"size":2,"px":[17,7],"py":[2,0],"pz":[0,-1],"nx":[4,8],"ny":[5,11],"nz":[2,1]},{"size":2,"px":[11,8],"py":[10,4],"pz":[0,-1],"nx":[13,12],"ny":[3,3],"nz":[0,0]},{"size":2,"px":[6,5],"py":[2,2],"pz":[1,1],"nx":[7,1],"ny":[8,2],"nz":[0,-1]},{"size":5,"px":[0,0,1,0,0],"py":[12,4,14,0,2],"pz":[0,1,0,2,2],"nx":[9,5,8,4,4],"ny":[6,3,6,3,3],"nz":[0,1,0,1,-1]},{"size":5,"px":[8,0,0,3,2],"py":[6,5,0,8,2],"pz":[1,-1,-1,-1,-1],"nx":[23,7,22,11,4],"ny":[12,6,14,4,3],"nz":[0,1,0,1,2]},{"size":4,"px":[12,12,4,8],"py":[12,11,3,10],"pz":[0,0,-1,-1],"nx":[0,0,0,0],"ny":[2,1,0,3],"nz":[1,2,2,1]},{"size":2,"px":[10,6],"py":[7,6],"pz":[1,-1],"nx":[16,4],"ny":[12,2],"nz":[0,2]},{"size":5,"px":[2,1,3,3,3],"py":[14,8,20,21,21],"pz":[0,1,0,0,-1],"nx":[20,10,21,21,21],"ny":[23,11,21,23,20],"nz":[0,1,0,0,0]},{"size":2,"px":[6,13],"py":[2,4],"pz":[1,0],"nx":[7,21],"ny":[8,0],"nz":[0,-1]},{"size":2,"px":[12,3],"py":[17,4],"pz":[0,2],"nx":[11,10],"ny":[15,7],"nz":[0,-1]},{"size":4,"px":[11,0,19,2],"py":[15,2,23,10],"pz":[0,-1,-1,-1],"nx":[6,8,16,2],"ny":[13,11,10,2],"nz":[0,0,0,2]},{"size":2,"px":[6,3],"py":[14,7],"pz":[0,1],"nx":[3,1],"ny":[4,1],"nz":[1,-1]},{"size":4,"px":[12,17,5,10],"py":[19,15,14,3],"pz":[0,-1,-1,-1],"nx":[4,12,6,12],"ny":[4,18,9,22],"nz":[1,0,1,0]},{"size":2,"px":[8,3],"py":[13,5],"pz":[0,-1],"nx":[3,4],"ny":[4,9],"nz":[1,1]},{"size":5,"px":[6,5,4,5,3],"py":[2,1,2,2,0],"pz":[0,0,0,0,1],"nx":[7,4,9,18,18],"ny":[4,4,7,14,14],"nz":[1,1,1,0,-1]},{"size":4,"px":[8,3,20,1],"py":[6,3,18,0],"pz":[1,-1,-1,-1],"nx":[13,11,5,22],"ny":[12,6,2,17],"nz":[0,1,2,0]},{"size":2,"px":[6,3],"py":[6,3],"pz":[1,2],"nx":[8,5],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[21,7],"py":[14,7],"pz":[0,1],"nx":[16,11],"ny":[14,6],"nz":[0,-1]},{"size":2,"px":[10,4],"py":[3,1],"pz":[0,-1],"nx":[9,5],"ny":[0,0],"nz":[0,1]},{"size":2,"px":[4,10],"py":[5,8],"pz":[2,1],"nx":[5,14],"ny":[9,7],"nz":[1,-1]},{"size":2,"px":[9,2],"py":[23,4],"pz":[0,2],"nx":[2,2],"ny":[5,5],"nz":[2,-1]},{"size":5,"px":[10,9,11,10,10],"py":[2,2,1,1,1],"pz":[0,0,0,0,-1],"nx":[2,3,2,4,5],"ny":[4,10,2,4,3],"nz":[2,1,1,0,0]},{"size":2,"px":[11,4],"py":[13,4],"pz":[0,-1],"nx":[8,4],"ny":[4,1],"nz":[1,2]},{"size":2,"px":[17,5],"py":[15,1],"pz":[0,-1],"nx":[20,19],"ny":[14,14],"nz":[0,0]},{"size":2,"px":[2,2],"py":[20,18],"pz":[0,0],"nx":[2,1],"ny":[23,5],"nz":[0,-1]},{"size":2,"px":[10,1],"py":[18,3],"pz":[0,2],"nx":[11,3],"ny":[16,5],"nz":[0,-1]},{"size":2,"px":[3,8],"py":[6,10],"pz":[1,0],"nx":[9,0],"ny":[9,3],"nz":[0,-1]},{"size":2,"px":[20,10],"py":[21,7],"pz":[0,1],"nx":[7,2],"ny":[3,5],"nz":[1,-1]},{"size":2,"px":[10,6],"py":[4,7],"pz":[1,-1],"nx":[23,5],"ny":[9,2],"nz":[0,2]},{"size":5,"px":[2,4,5,3,4],"py":[0,1,1,2,2],"pz":[1,0,0,0,0],"nx":[1,0,1,1,1],"ny":[2,1,0,1,1],"nz":[0,1,0,0,-1]},{"size":2,"px":[8,16],"py":[7,13],"pz":[1,0],"nx":[8,3],"ny":[4,16],"nz":[1,-1]},{"size":2,"px":[17,15],"py":[7,19],"pz":[0,-1],"nx":[4,8],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[4,3],"py":[11,5],"pz":[1,2],"nx":[7,8],"ny":[9,4],"nz":[1,-1]},{"size":2,"px":[23,11],"py":[9,6],"pz":[0,1],"nx":[22,22],"ny":[23,23],"nz":[0,-1]},{"size":2,"px":[23,23],"py":[21,20],"pz":[0,0],"nx":[2,2],"ny":[5,4],"nz":[1,-1]},{"size":2,"px":[17,4],"py":[12,2],"pz":[0,-1],"nx":[9,8],"ny":[4,5],"nz":[1,1]},{"size":2,"px":[6,14],"py":[2,4],"pz":[1,0],"nx":[7,18],"ny":[1,1],"nz":[1,-1]},{"size":2,"px":[20,22],"py":[1,2],"pz":[0,0],"nx":[23,23],"ny":[1,1],"nz":[0,-1]},{"size":2,"px":[0,1],"py":[9,10],"pz":[1,1],"nx":[8,0],"ny":[15,0],"nz":[0,-1]},{"size":3,"px":[11,11,6],"py":[10,11,11],"pz":[0,0,-1],"nx":[23,23,23],"ny":[19,21,20],"nz":[0,0,0]},{"size":5,"px":[23,23,23,6,6],"py":[21,22,22,3,6],"pz":[0,0,-1,-1,-1],"nx":[8,8,8,17,4],"ny":[7,10,8,16,5],"nz":[1,1,1,0,2]},{"size":2,"px":[10,23],"py":[1,22],"pz":[0,-1],"nx":[7,2],"ny":[11,2],"nz":[0,2]},{"size":2,"px":[7,14],"py":[3,10],"pz":[1,-1],"nx":[5,3],"ny":[2,1],"nz":[0,1]},{"size":2,"px":[5,3],"py":[13,7],"pz":[0,1],"nx":[4,10],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[10,0],"py":[15,6],"pz":[0,-1],"nx":[3,6],"ny":[1,2],"nz":[2,1]},{"size":2,"px":[13,4],"py":[18,17],"pz":[0,-1],"nx":[7,6],"ny":[10,7],"nz":[1,1]},{"size":2,"px":[12,11],"py":[3,8],"pz":[0,-1],"nx":[7,8],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[17,4],"py":[5,7],"pz":[0,1],"nx":[17,10],"ny":[4,0],"nz":[0,-1]},{"size":5,"px":[16,8,16,15,15],"py":[0,0,1,0,1],"pz":[0,1,0,0,0],"nx":[7,4,7,4,4],"ny":[7,5,8,1,1],"nz":[1,2,1,2,-1]},{"size":2,"px":[13,11],"py":[5,6],"pz":[0,-1],"nx":[4,5],"ny":[2,2],"nz":[1,1]},{"size":2,"px":[3,6],"py":[3,6],"pz":[2,1],"nx":[8,4],"ny":[4,3],"nz":[1,-1]},{"size":2,"px":[10,16],"py":[8,10],"pz":[0,0],"nx":[7,2],"ny":[3,3],"nz":[1,-1]},{"size":2,"px":[6,8],"py":[4,11],"pz":[1,0],"nx":[10,1],"ny":[9,20],"nz":[0,-1]},{"size":2,"px":[5,1],"py":[4,2],"pz":[2,-1],"nx":[23,23],"ny":[15,16],"nz":[0,0]},{"size":5,"px":[9,8,2,4,9],"py":[1,1,0,1,2],"pz":[0,0,2,1,0],"nx":[8,3,8,4,4],"ny":[6,2,4,2,2],"nz":[1,2,1,2,-1]},{"size":2,"px":[13,6],"py":[10,5],"pz":[0,-1],"nx":[13,7],"ny":[6,3],"nz":[0,1]},{"size":2,"px":[11,5],"py":[10,5],"pz":[1,2],"nx":[10,8],"ny":[10,9],"nz":[1,-1]},{"size":2,"px":[7,4],"py":[6,3],"pz":[1,2],"nx":[9,14],"ny":[4,9],"nz":[1,-1]},{"size":3,"px":[5,2,15],"py":[3,1,22],"pz":[1,-1,-1],"nx":[15,9,4],"ny":[0,1,0],"nz":[0,1,2]},{"size":2,"px":[10,19],"py":[9,21],"pz":[1,0],"nx":[2,17],"ny":[5,14],"nz":[2,-1]},{"size":3,"px":[16,2,1],"py":[2,10,4],"pz":[0,-1,-1],"nx":[4,4,9],"ny":[3,2,6],"nz":[2,2,1]},{"size":2,"px":[10,2],"py":[6,10],"pz":[1,-1],"nx":[21,22],"ny":[16,12],"nz":[0,0]},{"size":2,"px":[7,16],"py":[4,23],"pz":[0,-1],"nx":[7,3],"ny":[3,3],"nz":[0,1]},{"size":2,"px":[1,1],"py":[13,14],"pz":[0,0],"nx":[1,2],"ny":[18,3],"nz":[0,-1]},{"size":2,"px":[18,5],"py":[13,4],"pz":[0,-1],"nx":[4,13],"ny":[2,11],"nz":[2,0]},{"size":2,"px":[18,17],"py":[3,3],"pz":[0,0],"nx":[19,19],"ny":[1,1],"nz":[0,-1]},{"size":2,"px":[9,5],"py":[0,5],"pz":[1,-1],"nx":[12,3],"ny":[5,1],"nz":[0,2]},{"size":2,"px":[5,3],"py":[2,1],"pz":[1,2],"nx":[18,4],"ny":[4,1],"nz":[0,-1]},{"size":5,"px":[13,13,2,10,15],"py":[11,12,13,17,23],"pz":[0,-1,-1,-1,-1],"nx":[12,13,4,3,8],"ny":[4,4,1,0,3],"nz":[0,0,2,2,1]},{"size":2,"px":[9,3],"py":[2,2],"pz":[0,-1],"nx":[4,2],"ny":[7,2],"nz":[1,2]},{"size":2,"px":[13,4],"py":[5,1],"pz":[0,-1],"nx":[18,4],"ny":[12,2],"nz":[0,2]},{"size":2,"px":[19,4],"py":[11,1],"pz":[0,-1],"nx":[4,7],"ny":[2,2],"nz":[2,1]},{"size":2,"px":[4,2],"py":[6,3],"pz":[1,2],"nx":[3,2],"ny":[4,5],"nz":[1,-1]},{"size":2,"px":[4,0],"py":[7,7],"pz":[0,-1],"nx":[4,9],"ny":[0,2],"nz":[2,1]},{"size":2,"px":[4,9],"py":[0,2],"pz":[2,1],"nx":[6,4],"ny":[3,4],"nz":[0,-1]},{"size":2,"px":[4,2],"py":[9,4],"pz":[1,2],"nx":[13,5],"ny":[18,2],"nz":[0,-1]},{"size":3,"px":[5,23,23],"py":[2,8,7],"pz":[2,0,0],"nx":[10,12,1],"ny":[4,1,0],"nz":[1,-1,-1]},{"size":2,"px":[13,0],"py":[3,3],"pz":[0,-1],"nx":[4,4],"ny":[2,3],"nz":[2,2]},{"size":2,"px":[6,5],"py":[10,5],"pz":[0,-1],"nx":[0,0],"ny":[4,11],"nz":[1,0]},{"size":2,"px":[11,2],"py":[14,11],"pz":[0,-1],"nx":[10,11],"ny":[4,13],"nz":[1,0]},{"size":2,"px":[5,6],"py":[21,23],"pz":[0,0],"nx":[7,0],"ny":[21,3],"nz":[0,-1]},{"size":2,"px":[8,4],"py":[6,3],"pz":[1,2],"nx":[8,5],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[7,6],"py":[8,8],"pz":[0,0],"nx":[6,14],"ny":[9,15],"nz":[0,-1]},{"size":2,"px":[16,6],"py":[4,8],"pz":[0,-1],"nx":[16,8],"ny":[0,1],"nz":[0,1]},{"size":4,"px":[3,6,0,9],"py":[0,8,5,23],"pz":[1,-1,-1,-1],"nx":[12,2,6,10],"ny":[5,0,3,5],"nz":[0,2,1,0]},{"size":2,"px":[3,6],"py":[7,13],"pz":[1,0],"nx":[3,9],"ny":[4,9],"nz":[1,-1]},{"size":2,"px":[2,5],"py":[8,23],"pz":[1,0],"nx":[8,9],"ny":[15,0],"nz":[0,-1]},{"size":2,"px":[13,18],"py":[8,0],"pz":[0,-1],"nx":[1,1],"ny":[9,8],"nz":[1,1]},{"size":2,"px":[2,7],"py":[4,21],"pz":[2,0],"nx":[13,11],"ny":[8,9],"nz":[0,-1]},{"size":2,"px":[5,4],"py":[8,8],"pz":[0,0],"nx":[6,1],"ny":[8,5],"nz":[0,-1]},{"size":2,"px":[7,3],"py":[20,7],"pz":[0,-1],"nx":[4,3],"ny":[10,4],"nz":[1,1]},{"size":2,"px":[9,9],"py":[8,7],"pz":[1,-1],"nx":[1,2],"ny":[4,9],"nz":[2,1]},{"size":2,"px":[5,10],"py":[5,13],"pz":[1,-1],"nx":[3,6],"ny":[1,2],"nz":[2,1]},{"size":2,"px":[12,5],"py":[6,3],"pz":[0,-1],"nx":[8,4],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[10,10],"py":[4,4],"pz":[1,-1],"nx":[5,11],"ny":[2,5],"nz":[2,1]},{"size":5,"px":[11,23,11,23,11],"py":[4,9,5,10,6],"pz":[1,0,1,0,1],"nx":[7,14,13,7,3],"ny":[9,5,6,4,4],"nz":[0,0,0,1,-1]},{"size":2,"px":[8,5],"py":[0,0],"pz":[1,-1],"nx":[9,20],"ny":[1,4],"nz":[1,0]},{"size":2,"px":[19,20],"py":[0,3],"pz":[0,0],"nx":[4,6],"ny":[11,3],"nz":[1,-1]},{"size":4,"px":[13,5,20,5],"py":[14,3,23,4],"pz":[0,-1,-1,-1],"nx":[8,15,7,16],"ny":[8,14,6,15],"nz":[1,0,1,0]},{"size":2,"px":[10,20],"py":[5,17],"pz":[0,-1],"nx":[7,3],"ny":[10,1],"nz":[0,2]},{"size":3,"px":[1,12,7],"py":[3,7,10],"pz":[2,0,0],"nx":[2,2,3],"ny":[3,2,2],"nz":[1,-1,-1]},{"size":3,"px":[10,5,7],"py":[7,10,10],"pz":[1,-1,-1],"nx":[10,10,18],"ny":[10,9,23],"nz":[1,1,0]},{"size":3,"px":[14,14,4],"py":[3,3,4],"pz":[0,-1,-1],"nx":[4,4,8],"ny":[3,2,6],"nz":[2,2,1]},{"size":2,"px":[4,12],"py":[4,17],"pz":[2,0],"nx":[13,1],"ny":[15,4],"nz":[0,-1]},{"size":2,"px":[10,20],"py":[9,22],"pz":[0,-1],"nx":[9,4],"ny":[2,0],"nz":[1,2]},{"size":2,"px":[11,2],"py":[3,6],"pz":[0,-1],"nx":[2,4],"ny":[2,4],"nz":[2,1]},{"size":3,"px":[15,10,1],"py":[12,2,3],"pz":[0,-1,-1],"nx":[7,5,10],"ny":[2,1,1],"nz":[0,1,0]},{"size":5,"px":[9,11,10,12,12],"py":[0,0,0,0,0],"pz":[0,0,0,0,-1],"nx":[8,4,16,5,10],"ny":[4,4,10,3,6],"nz":[1,1,0,1,0]},{"size":2,"px":[0,10],"py":[3,5],"pz":[2,-1],"nx":[3,6],"ny":[0,1],"nz":[2,1]},{"size":5,"px":[7,8,7,2,12],"py":[14,13,13,16,0],"pz":[0,0,-1,-1,-1],"nx":[10,1,10,1,1],"ny":[13,2,12,4,9],"nz":[0,2,0,1,0]},{"size":3,"px":[6,14,13],"py":[1,2,1],"pz":[1,0,0],"nx":[8,21,10],"ny":[4,23,12],"nz":[1,-1,-1]},{"size":2,"px":[19,19],"py":[22,21],"pz":[0,0],"nx":[20,1],"ny":[22,5],"nz":[0,-1]},{"size":2,"px":[13,12],"py":[19,22],"pz":[0,-1],"nx":[2,3],"ny":[0,1],"nz":[2,1]},{"size":4,"px":[11,9,21,4],"py":[13,3,19,5],"pz":[0,-1,-1,-1],"nx":[9,9,9,5],"ny":[13,14,12,6],"nz":[0,0,0,1]},{"size":4,"px":[11,12,13,14],"py":[22,22,22,22],"pz":[0,0,0,0],"nx":[13,2,4,5],"ny":[20,0,0,6],"nz":[0,-1,-1,-1]},{"size":2,"px":[4,2],"py":[6,3],"pz":[1,2],"nx":[3,1],"ny":[4,3],"nz":[1,-1]},{"size":2,"px":[0,0],"py":[0,1],"pz":[2,2],"nx":[9,4],"ny":[6,5],"nz":[1,-1]},{"size":2,"px":[17,0],"py":[10,1],"pz":[0,-1],"nx":[9,4],"ny":[3,2],"nz":[1,2]},{"size":2,"px":[10,4],"py":[3,1],"pz":[1,2],"nx":[12,18],"ny":[17,4],"nz":[0,-1]},{"size":3,"px":[2,3,4],"py":[4,3,9],"pz":[2,2,1],"nx":[0,3,17],"ny":[0,1,18],"nz":[0,-1,-1]},{"size":2,"px":[7,3],"py":[12,6],"pz":[0,1],"nx":[5,1],"ny":[11,1],"nz":[1,-1]},{"size":2,"px":[10,17],"py":[20,6],"pz":[0,-1],"nx":[5,2],"ny":[9,5],"nz":[1,2]},{"size":2,"px":[8,11],"py":[18,2],"pz":[0,-1],"nx":[5,4],"ny":[9,9],"nz":[1,1]},{"size":2,"px":[16,15],"py":[2,2],"pz":[0,0],"nx":[17,12],"ny":[2,2],"nz":[0,-1]},{"size":2,"px":[18,4],"py":[5,5],"pz":[0,-1],"nx":[7,5],"ny":[23,19],"nz":[0,0]},{"size":2,"px":[12,13],"py":[23,23],"pz":[0,0],"nx":[7,11],"ny":[10,20],"nz":[1,-1]},{"size":2,"px":[5,10],"py":[3,18],"pz":[2,-1],"nx":[9,9],"ny":[5,6],"nz":[1,1]},{"size":2,"px":[5,10],"py":[2,4],"pz":[1,0],"nx":[4,23],"ny":[4,20],"nz":[1,-1]},{"size":2,"px":[2,3],"py":[8,1],"pz":[1,-1],"nx":[15,12],"ny":[2,1],"nz":[0,0]},{"size":2,"px":[4,7],"py":[3,10],"pz":[2,1],"nx":[10,1],"ny":[20,4],"nz":[0,-1]},{"size":2,"px":[11,11],"py":[10,11],"pz":[0,0],"nx":[22,3],"ny":[5,4],"nz":[0,-1]},{"size":5,"px":[8,17,17,9,18],"py":[0,1,0,1,0],"pz":[1,0,0,1,0],"nx":[11,8,9,4,4],"ny":[23,4,6,2,2],"nz":[0,1,0,2,-1]},{"size":2,"px":[5,5],"py":[4,4],"pz":[1,-1],"nx":[13,4],"ny":[9,2],"nz":[0,2]},{"size":5,"px":[9,4,8,7,7],"py":[3,1,3,3,3],"pz":[0,1,0,0,-1],"nx":[4,2,5,3,2],"ny":[1,15,1,4,13],"nz":[0,0,0,0,0]},{"size":2,"px":[17,7],"py":[13,7],"pz":[0,-1],"nx":[4,8],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[1,2],"py":[1,12],"pz":[2,0],"nx":[9,21],"ny":[5,4],"nz":[0,-1]},{"size":2,"px":[12,0],"py":[14,1],"pz":[0,-1],"nx":[1,1],"ny":[19,10],"nz":[0,1]},{"size":2,"px":[16,1],"py":[5,9],"pz":[0,-1],"nx":[16,15],"ny":[3,3],"nz":[0,0]},{"size":2,"px":[4,8],"py":[3,6],"pz":[2,1],"nx":[8,4],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[11,6],"py":[17,15],"pz":[0,0],"nx":[11,0],"ny":[16,4],"nz":[0,-1]},{"size":4,"px":[12,11,0,3],"py":[16,8,7,1],"pz":[0,-1,-1,-1],"nx":[10,5,10,5],"ny":[11,9,10,8],"nz":[0,1,0,1]},{"size":2,"px":[3,6],"py":[7,13],"pz":[1,0],"nx":[4,14],"ny":[4,16],"nz":[1,-1]},{"size":2,"px":[7,17],"py":[6,13],"pz":[0,-1],"nx":[4,8],"ny":[4,9],"nz":[2,1]},{"size":2,"px":[15,11],"py":[3,2],"pz":[0,-1],"nx":[4,15],"ny":[1,2],"nz":[2,0]},{"size":2,"px":[10,11],"py":[18,4],"pz":[0,-1],"nx":[5,5],"ny":[8,9],"nz":[1,1]},{"size":2,"px":[8,4],"py":[7,4],"pz":[1,2],"nx":[4,3],"ny":[5,7],"nz":[2,-1]},{"size":2,"px":[12,4],"py":[15,4],"pz":[0,-1],"nx":[11,8],"ny":[14,19],"nz":[0,0]},{"size":2,"px":[18,13],"py":[13,20],"pz":[0,0],"nx":[13,4],"ny":[18,2],"nz":[0,-1]},{"size":2,"px":[12,4],"py":[6,3],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":5,"px":[21,5,11,5,10],"py":[1,1,3,0,0],"pz":[0,2,1,2,1],"nx":[7,14,15,4,8],"ny":[3,6,11,3,4],"nz":[1,-1,-1,-1,-1]},{"size":2,"px":[10,6],"py":[15,10],"pz":[0,-1],"nx":[21,22],"ny":[14,12],"nz":[0,0]},{"size":2,"px":[18,0],"py":[20,0],"pz":[0,-1],"nx":[2,3],"ny":[2,4],"nz":[2,1]},{"size":5,"px":[12,6,13,11,7],"py":[1,1,1,2,1],"pz":[0,1,0,0,1],"nx":[7,6,8,5,5],"ny":[4,15,4,16,16],"nz":[1,0,1,0,-1]},{"size":3,"px":[22,21,21],"py":[14,15,17],"pz":[0,0,0],"nx":[5,9,4],"ny":[0,5,0],"nz":[2,-1,-1]},{"size":2,"px":[10,2],"py":[14,1],"pz":[0,-1],"nx":[23,11],"ny":[16,8],"nz":[0,1]},{"size":4,"px":[21,21,0,18],"py":[14,15,5,4],"pz":[0,0,-1,-1],"nx":[8,8,9,4],"ny":[7,8,10,5],"nz":[1,1,1,2]},{"size":2,"px":[15,5],"py":[18,1],"pz":[0,-1],"nx":[23,23],"ny":[16,18],"nz":[0,0]},{"size":2,"px":[15,14],"py":[1,1],"pz":[0,0],"nx":[4,4],"ny":[2,3],"nz":[2,-1]},{"size":2,"px":[2,6],"py":[6,5],"pz":[1,-1],"nx":[14,11],"ny":[1,1],"nz":[0,0]},{"size":2,"px":[3,17],"py":[2,8],"pz":[2,0],"nx":[8,3],"ny":[4,9],"nz":[1,-1]},{"size":2,"px":[17,8],"py":[13,10],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[0,0],"py":[8,3],"pz":[0,1],"nx":[1,11],"ny":[4,7],"nz":[1,-1]},{"size":2,"px":[6,8],"py":[5,0],"pz":[1,-1],"nx":[0,0],"ny":[3,1],"nz":[1,2]},{"size":2,"px":[0,0],"py":[5,3],"pz":[1,2],"nx":[1,18],"ny":[5,7],"nz":[1,-1]},{"size":2,"px":[7,3],"py":[6,6],"pz":[0,1],"nx":[7,12],"ny":[5,20],"nz":[0,-1]},{"size":2,"px":[8,1],"py":[0,5],"pz":[0,-1],"nx":[4,2],"ny":[9,3],"nz":[1,2]},{"size":2,"px":[0,0],"py":[10,11],"pz":[0,0],"nx":[0,5],"ny":[5,9],"nz":[0,-1]},{"size":2,"px":[8,1],"py":[23,4],"pz":[0,2],"nx":[0,0],"ny":[13,2],"nz":[0,-1]},{"size":2,"px":[4,1],"py":[6,4],"pz":[0,-1],"nx":[4,4],"ny":[4,5],"nz":[2,2]},{"size":2,"px":[7,6],"py":[6,5],"pz":[1,1],"nx":[3,9],"ny":[4,16],"nz":[1,-1]},{"size":2,"px":[5,3],"py":[9,13],"pz":[0,-1],"nx":[4,10],"ny":[3,7],"nz":[1,0]},{"size":5,"px":[13,9,6,10,10],"py":[2,2,1,2,2],"pz":[0,0,1,0,-1],"nx":[7,5,6,5,6],"ny":[0,2,2,1,1],"nz":[0,0,0,0,0]}],"alpha":[-1.119615e+00,1.119615e+00,-8.169953e-01,8.169953e-01,-5.291213e-01,5.291213e-01,-4.904488e-01,4.904488e-01,-4.930982e-01,4.930982e-01,-4.106179e-01,4.106179e-01,-4.246842e-01,4.246842e-01,-3.802383e-01,3.802383e-01,-3.364358e-01,3.364358e-01,-3.214186e-01,3.214186e-01,-3.210798e-01,3.210798e-01,-2.993167e-01,2.993167e-01,-3.426336e-01,3.426336e-01,-3.199184e-01,3.199184e-01,-3.061071e-01,3.061071e-01,-2.758972e-01,2.758972e-01,-3.075590e-01,3.075590e-01,-3.009565e-01,3.009565e-01,-2.015739e-01,2.015739e-01,-2.603266e-01,2.603266e-01,-2.772993e-01,2.772993e-01,-2.184913e-01,2.184913e-01,-2.306681e-01,2.306681e-01,-1.983223e-01,1.983223e-01,-2.194760e-01,2.194760e-01,-2.528421e-01,2.528421e-01,-2.436416e-01,2.436416e-01,-3.032886e-01,3.032886e-01,-2.556071e-01,2.556071e-01,-2.562170e-01,2.562170e-01,-1.930298e-01,1.930298e-01,-2.735898e-01,2.735898e-01,-1.814703e-01,1.814703e-01,-2.054824e-01,2.054824e-01,-1.986146e-01,1.986146e-01,-1.769226e-01,1.769226e-01,-1.775257e-01,1.775257e-01,-2.167927e-01,2.167927e-01,-1.823633e-01,1.823633e-01,-1.584280e-01,1.584280e-01,-1.778321e-01,1.778321e-01,-1.826777e-01,1.826777e-01,-1.979903e-01,1.979903e-01,-1.898326e-01,1.898326e-01,-1.835506e-01,1.835506e-01,-1.967860e-01,1.967860e-01,-1.871528e-01,1.871528e-01,-1.772414e-01,1.772414e-01,-1.985514e-01,1.985514e-01,-2.144078e-01,2.144078e-01,-2.742303e-01,2.742303e-01,-2.240550e-01,2.240550e-01,-2.132534e-01,2.132534e-01,-1.552127e-01,1.552127e-01,-1.568276e-01,1.568276e-01,-1.630086e-01,1.630086e-01,-1.458232e-01,1.458232e-01,-1.559541e-01,1.559541e-01,-1.720131e-01,1.720131e-01,-1.708434e-01,1.708434e-01,-1.624431e-01,1.624431e-01,-1.814161e-01,1.814161e-01,-1.552639e-01,1.552639e-01,-1.242354e-01,1.242354e-01,-1.552139e-01,1.552139e-01,-1.694359e-01,1.694359e-01,-1.801481e-01,1.801481e-01,-1.387182e-01,1.387182e-01,-1.409679e-01,1.409679e-01,-1.486724e-01,1.486724e-01,-1.779553e-01,1.779553e-01,-1.524595e-01,1.524595e-01,-1.788086e-01,1.788086e-01,-1.671479e-01,1.671479e-01,-1.376197e-01,1.376197e-01,-1.511808e-01,1.511808e-01,-1.524632e-01,1.524632e-01,-1.198986e-01,1.198986e-01,-1.382641e-01,1.382641e-01,-1.148901e-01,1.148901e-01,-1.131803e-01,1.131803e-01,-1.273508e-01,1.273508e-01,-1.405125e-01,1.405125e-01,-1.322132e-01,1.322132e-01,-1.386966e-01,1.386966e-01,-1.275621e-01,1.275621e-01,-1.180573e-01,1.180573e-01,-1.238803e-01,1.238803e-01,-1.428389e-01,1.428389e-01,-1.694437e-01,1.694437e-01,-1.290855e-01,1.290855e-01,-1.520260e-01,1.520260e-01,-1.398282e-01,1.398282e-01,-1.890736e-01,1.890736e-01,-2.280428e-01,2.280428e-01,-1.325099e-01,1.325099e-01,-1.342873e-01,1.342873e-01,-1.463841e-01,1.463841e-01,-1.983567e-01,1.983567e-01,-1.585711e-01,1.585711e-01,-1.260154e-01,1.260154e-01,-1.426774e-01,1.426774e-01,-1.554278e-01,1.554278e-01,-1.361201e-01,1.361201e-01,-1.181856e-01,1.181856e-01,-1.255941e-01,1.255941e-01,-1.113275e-01,1.113275e-01,-1.506576e-01,1.506576e-01,-1.202859e-01,1.202859e-01,-2.159751e-01,2.159751e-01,-1.443150e-01,1.443150e-01,-1.379194e-01,1.379194e-01,-1.805758e-01,1.805758e-01,-1.465612e-01,1.465612e-01,-1.328856e-01,1.328856e-01,-1.532173e-01,1.532173e-01,-1.590635e-01,1.590635e-01,-1.462229e-01,1.462229e-01,-1.350012e-01,1.350012e-01,-1.195634e-01,1.195634e-01,-1.173221e-01,1.173221e-01,-1.192867e-01,1.192867e-01,-1.595013e-01,1.595013e-01,-1.209751e-01,1.209751e-01,-1.571290e-01,1.571290e-01,-1.527274e-01,1.527274e-01,-1.373708e-01,1.373708e-01,-1.318313e-01,1.318313e-01,-1.273391e-01,1.273391e-01,-1.271365e-01,1.271365e-01,-1.528693e-01,1.528693e-01,-1.590476e-01,1.590476e-01,-1.581911e-01,1.581911e-01,-1.183023e-01,1.183023e-01,-1.559822e-01,1.559822e-01,-1.214999e-01,1.214999e-01,-1.283378e-01,1.283378e-01,-1.542583e-01,1.542583e-01,-1.336377e-01,1.336377e-01,-1.800416e-01,1.800416e-01,-1.710931e-01,1.710931e-01,-1.621737e-01,1.621737e-01,-1.239002e-01,1.239002e-01,-1.432928e-01,1.432928e-01,-1.392447e-01,1.392447e-01,-1.383938e-01,1.383938e-01,-1.357633e-01,1.357633e-01,-1.175842e-01,1.175842e-01,-1.085318e-01,1.085318e-01,-1.148885e-01,1.148885e-01,-1.320396e-01,1.320396e-01,-1.351204e-01,1.351204e-01,-1.581518e-01,1.581518e-01,-1.459574e-01,1.459574e-01,-1.180068e-01,1.180068e-01,-1.464196e-01,1.464196e-01,-1.179543e-01,1.179543e-01,-1.004204e-01,1.004204e-01,-1.294660e-01,1.294660e-01,-1.534244e-01,1.534244e-01,-1.378970e-01,1.378970e-01,-1.226545e-01,1.226545e-01,-1.281182e-01,1.281182e-01,-1.201471e-01,1.201471e-01,-1.448701e-01,1.448701e-01,-1.290980e-01,1.290980e-01,-1.388764e-01,1.388764e-01,-9.605773e-02,9.605773e-02,-1.411021e-01,1.411021e-01,-1.295693e-01,1.295693e-01,-1.371739e-01,1.371739e-01,-1.167579e-01,1.167579e-01,-1.400486e-01,1.400486e-01,-1.214224e-01,1.214224e-01,-1.287835e-01,1.287835e-01,-1.197646e-01,1.197646e-01,-1.192358e-01,1.192358e-01,-1.218651e-01,1.218651e-01,-1.564816e-01,1.564816e-01,-1.172391e-01,1.172391e-01,-1.342268e-01,1.342268e-01,-1.492471e-01,1.492471e-01,-1.157299e-01,1.157299e-01,-1.046703e-01,1.046703e-01,-1.255571e-01,1.255571e-01,-1.100135e-01,1.100135e-01,-1.501592e-01,1.501592e-01,-1.155712e-01,1.155712e-01,-1.145563e-01,1.145563e-01,-1.013425e-01,1.013425e-01,-1.145783e-01,1.145783e-01,-1.328031e-01,1.328031e-01,-1.077413e-01,1.077413e-01,-1.064996e-01,1.064996e-01,-1.191170e-01,1.191170e-01,-1.213217e-01,1.213217e-01,-1.260969e-01,1.260969e-01,-1.156494e-01,1.156494e-01,-1.268126e-01,1.268126e-01,-1.070999e-01,1.070999e-01,-1.112365e-01,1.112365e-01,-1.243916e-01,1.243916e-01,-1.283152e-01,1.283152e-01,-1.166925e-01,1.166925e-01,-8.997633e-02,8.997633e-02,-1.583840e-01,1.583840e-01,-1.211178e-01,1.211178e-01,-1.090830e-01,1.090830e-01,-1.030818e-01,1.030818e-01,-1.440600e-01,1.440600e-01,-1.458713e-01,1.458713e-01,-1.559082e-01,1.559082e-01,-1.058868e-01,1.058868e-01,-1.010130e-01,1.010130e-01,-1.642301e-01,1.642301e-01,-1.236850e-01,1.236850e-01,-1.467589e-01,1.467589e-01,-1.109359e-01,1.109359e-01,-1.673655e-01,1.673655e-01,-1.239984e-01,1.239984e-01,-1.039509e-01,1.039509e-01,-1.089378e-01,1.089378e-01,-1.545085e-01,1.545085e-01,-1.200862e-01,1.200862e-01,-1.105608e-01,1.105608e-01,-1.235262e-01,1.235262e-01,-8.496153e-02,8.496153e-02,-1.181372e-01,1.181372e-01,-1.139467e-01,1.139467e-01,-1.189317e-01,1.189317e-01,-1.266519e-01,1.266519e-01,-9.470736e-02,9.470736e-02,-1.336735e-01,1.336735e-01,-8.726601e-02,8.726601e-02,-1.304782e-01,1.304782e-01,-1.186529e-01,1.186529e-01,-1.355944e-01,1.355944e-01,-9.568801e-02,9.568801e-02,-1.282618e-01,1.282618e-01,-1.625632e-01,1.625632e-01,-1.167652e-01,1.167652e-01,-1.001301e-01,1.001301e-01,-1.292419e-01,1.292419e-01,-1.904213e-01,1.904213e-01,-1.511542e-01,1.511542e-01,-9.814394e-02,9.814394e-02,-1.171564e-01,1.171564e-01,-9.806486e-02,9.806486e-02,-9.217615e-02,9.217615e-02,-8.505645e-02,8.505645e-02,-1.573637e-01,1.573637e-01,-1.419174e-01,1.419174e-01,-1.298601e-01,1.298601e-01,-1.120613e-01,1.120613e-01,-1.158363e-01,1.158363e-01,-1.090957e-01,1.090957e-01,-1.204516e-01,1.204516e-01,-1.139852e-01,1.139852e-01,-9.642479e-02,9.642479e-02,-1.410872e-01,1.410872e-01,-1.142779e-01,1.142779e-01,-1.043991e-01,1.043991e-01,-9.736463e-02,9.736463e-02,-1.451046e-01,1.451046e-01,-1.205668e-01,1.205668e-01,-9.881445e-02,9.881445e-02,-1.612822e-01,1.612822e-01,-1.175681e-01,1.175681e-01,-1.522528e-01,1.522528e-01,-1.617520e-01,1.617520e-01,-1.582938e-01,1.582938e-01,-1.208202e-01,1.208202e-01,-1.016003e-01,1.016003e-01,-1.232059e-01,1.232059e-01,-9.583025e-02,9.583025e-02,-1.013990e-01,1.013990e-01,-1.178752e-01,1.178752e-01,-1.215972e-01,1.215972e-01,-1.294932e-01,1.294932e-01,-1.158270e-01,1.158270e-01,-1.008645e-01,1.008645e-01,-9.699190e-02,9.699190e-02,-1.022144e-01,1.022144e-01,-9.878768e-02,9.878768e-02,-1.339052e-01,1.339052e-01,-9.279961e-02,9.279961e-02,-1.047606e-01,1.047606e-01,-1.141163e-01,1.141163e-01,-1.267600e-01,1.267600e-01,-1.252763e-01,1.252763e-01,-9.775003e-02,9.775003e-02,-9.169116e-02,9.169116e-02,-1.006496e-01,1.006496e-01,-9.493293e-02,9.493293e-02,-1.213694e-01,1.213694e-01,-1.109243e-01,1.109243e-01,-1.115973e-01,1.115973e-01,-7.979327e-02,7.979327e-02,-9.220953e-02,9.220953e-02,-1.028913e-01,1.028913e-01,-1.253510e-01,1.253510e-01]},{"count":391,"threshold":-4.665692e+00,"feature":[{"size":5,"px":[14,9,11,17,12],"py":[2,3,9,13,3],"pz":[0,0,0,0,0],"nx":[21,8,7,20,13],"ny":[16,10,7,7,9],"nz":[0,1,1,0,0]},{"size":5,"px":[12,10,6,11,13],"py":[9,3,13,3,4],"pz":[0,0,0,0,0],"nx":[10,4,5,10,2],"ny":[9,10,8,8,2],"nz":[0,1,1,0,2]},{"size":5,"px":[6,9,7,8,8],"py":[3,3,3,3,3],"pz":[0,0,0,0,-1],"nx":[0,0,0,4,9],"ny":[4,2,3,10,8],"nz":[0,0,0,1,0]},{"size":5,"px":[6,2,16,6,8],"py":[16,2,11,4,11],"pz":[0,2,0,1,0],"nx":[3,8,4,1,1],"ny":[4,4,4,5,13],"nz":[1,1,-1,-1,-1]},{"size":3,"px":[16,13,9],"py":[23,18,10],"pz":[0,0,1],"nx":[14,15,8],"ny":[21,22,3],"nz":[0,-1,-1]},{"size":5,"px":[9,16,19,17,17],"py":[1,2,3,2,2],"pz":[1,0,0,0,-1],"nx":[23,23,23,23,23],"ny":[6,2,1,3,5],"nz":[0,0,0,0,0]},{"size":5,"px":[12,12,12,12,12],"py":[10,11,12,13,13],"pz":[0,0,0,0,-1],"nx":[4,8,14,4,6],"ny":[2,4,7,4,8],"nz":[2,1,0,1,1]},{"size":5,"px":[1,2,3,6,4],"py":[6,10,12,23,13],"pz":[1,1,0,0,0],"nx":[2,0,0,1,1],"ny":[23,5,10,21,21],"nz":[0,2,1,0,-1]},{"size":5,"px":[12,16,12,4,12],"py":[6,17,7,2,8],"pz":[0,0,0,2,0],"nx":[8,8,12,0,6],"ny":[4,4,16,0,8],"nz":[1,-1,-1,-1,-1]},{"size":2,"px":[9,2],"py":[18,4],"pz":[0,-1],"nx":[4,9],"ny":[10,16],"nz":[1,0]},{"size":5,"px":[9,9,2,0,12],"py":[6,6,21,4,8],"pz":[1,-1,-1,-1,-1],"nx":[8,4,9,7,7],"ny":[10,2,4,5,8],"nz":[1,2,1,1,1]},{"size":5,"px":[10,10,10,18,19],"py":[10,8,7,14,14],"pz":[1,1,1,0,0],"nx":[21,23,22,22,11],"ny":[23,19,21,22,10],"nz":[0,0,0,0,-1]},{"size":5,"px":[12,3,15,4,19],"py":[14,0,5,5,14],"pz":[0,-1,-1,-1,-1],"nx":[12,17,15,3,8],"ny":[18,18,14,2,10],"nz":[0,0,0,2,0]},{"size":5,"px":[8,11,3,11,4],"py":[23,7,9,8,8],"pz":[0,0,1,0,1],"nx":[8,0,10,0,8],"ny":[8,2,8,4,10],"nz":[0,-1,-1,-1,-1]},{"size":5,"px":[10,11,12,8,4],"py":[3,0,0,1,1],"pz":[0,0,0,0,1],"nx":[2,3,4,3,3],"ny":[14,5,0,1,2],"nz":[0,0,0,0,0]},{"size":2,"px":[3,11],"py":[7,0],"pz":[1,-1],"nx":[5,2],"ny":[9,5],"nz":[1,2]},{"size":5,"px":[7,1,0,10,1],"py":[0,0,2,12,6],"pz":[0,2,2,0,1],"nx":[4,6,2,8,8],"ny":[4,11,2,4,4],"nz":[1,1,2,1,-1]},{"size":2,"px":[4,15],"py":[4,12],"pz":[2,0],"nx":[4,6],"ny":[5,11],"nz":[2,-1]},{"size":5,"px":[9,4,16,14,14],"py":[8,4,23,18,18],"pz":[1,2,0,0,-1],"nx":[0,2,1,1,0],"ny":[2,0,3,2,3],"nz":[1,0,0,0,1]},{"size":5,"px":[17,7,7,18,19],"py":[7,11,8,7,7],"pz":[0,1,1,0,0],"nx":[17,5,8,2,0],"ny":[8,0,7,5,3],"nz":[0,-1,-1,-1,-1]},{"size":2,"px":[5,14],"py":[12,3],"pz":[0,-1],"nx":[4,3],"ny":[5,4],"nz":[1,1]},{"size":5,"px":[10,8,16,11,11],"py":[5,6,12,4,4],"pz":[0,1,0,0,-1],"nx":[14,13,5,9,5],"ny":[13,10,1,4,2],"nz":[0,0,2,1,2]},{"size":5,"px":[15,14,16,8,8],"py":[2,2,2,0,0],"pz":[0,0,0,1,-1],"nx":[9,18,19,18,17],"ny":[0,0,2,1,0],"nz":[1,0,0,0,0]},{"size":2,"px":[17,15],"py":[12,11],"pz":[0,0],"nx":[14,4],"ny":[9,15],"nz":[0,-1]},{"size":3,"px":[5,11,11],"py":[3,4,5],"pz":[2,1,1],"nx":[14,3,18],"ny":[6,5,0],"nz":[0,1,-1]},{"size":5,"px":[16,14,17,15,9],"py":[2,2,2,2,1],"pz":[0,0,0,0,1],"nx":[21,20,11,21,21],"ny":[2,0,7,3,3],"nz":[0,0,1,0,-1]},{"size":5,"px":[2,1,1,1,5],"py":[12,9,7,3,6],"pz":[0,0,1,1,1],"nx":[4,8,3,4,17],"ny":[4,4,0,8,0],"nz":[1,-1,-1,-1,-1]},{"size":2,"px":[8,4],"py":[6,3],"pz":[1,2],"nx":[9,2],"ny":[4,17],"nz":[1,-1]},{"size":2,"px":[8,5],"py":[16,9],"pz":[0,1],"nx":[10,17],"ny":[16,8],"nz":[0,-1]},{"size":4,"px":[11,5,9,15],"py":[14,9,11,5],"pz":[0,-1,-1,-1],"nx":[10,1,9,4],"ny":[9,2,13,7],"nz":[0,2,0,1]},{"size":5,"px":[2,5,10,7,10],"py":[7,12,2,13,3],"pz":[1,-1,-1,-1,-1],"nx":[5,2,3,3,2],"ny":[23,15,17,16,14],"nz":[0,0,0,0,0]},{"size":2,"px":[11,7],"py":[8,10],"pz":[0,-1],"nx":[7,14],"ny":[5,8],"nz":[1,0]},{"size":2,"px":[9,16],"py":[7,23],"pz":[1,0],"nx":[4,4],"ny":[2,1],"nz":[2,-1]},{"size":5,"px":[16,14,18,4,17],"py":[0,0,4,0,1],"pz":[0,0,0,2,0],"nx":[8,8,16,9,9],"ny":[5,4,11,7,7],"nz":[1,1,0,0,-1]},{"size":5,"px":[12,13,7,8,4],"py":[9,12,6,11,5],"pz":[0,0,1,1,2],"nx":[23,23,16,9,9],"ny":[0,1,11,7,7],"nz":[0,-1,-1,-1,-1]},{"size":3,"px":[6,7,2],"py":[21,23,4],"pz":[0,0,2],"nx":[4,1,16],"ny":[10,5,11],"nz":[1,-1,-1]},{"size":2,"px":[2,2],"py":[3,4],"pz":[2,2],"nx":[3,1],"ny":[4,5],"nz":[1,-1]},{"size":5,"px":[1,2,1,0,1],"py":[7,13,12,4,13],"pz":[0,0,0,2,0],"nx":[18,9,9,19,19],"ny":[23,5,11,19,19],"nz":[0,1,1,0,-1]},{"size":3,"px":[4,10,12],"py":[6,2,5],"pz":[1,-1,-1],"nx":[10,0,0],"ny":[12,1,3],"nz":[0,2,2]},{"size":2,"px":[2,4],"py":[3,6],"pz":[2,1],"nx":[3,0],"ny":[4,3],"nz":[1,-1]},{"size":5,"px":[19,17,10,14,18],"py":[2,1,7,0,1],"pz":[0,0,1,0,0],"nx":[3,3,3,7,5],"ny":[9,10,7,23,18],"nz":[1,1,1,0,0]},{"size":2,"px":[10,10],"py":[8,7],"pz":[1,1],"nx":[14,4],"ny":[15,6],"nz":[0,-1]},{"size":2,"px":[7,15],"py":[1,3],"pz":[1,0],"nx":[16,19],"ny":[1,3],"nz":[0,-1]},{"size":5,"px":[11,11,1,2,11],"py":[11,12,1,13,12],"pz":[0,0,-1,-1,-1],"nx":[12,17,8,16,8],"ny":[7,12,11,16,6],"nz":[0,0,0,0,1]},{"size":5,"px":[13,11,10,12,5],"py":[0,0,0,0,0],"pz":[0,0,0,0,1],"nx":[8,4,3,4,4],"ny":[4,5,2,4,4],"nz":[1,1,2,1,-1]},{"size":5,"px":[6,1,3,2,3],"py":[13,3,3,4,10],"pz":[0,2,1,1,1],"nx":[0,1,0,0,0],"ny":[2,0,5,4,4],"nz":[0,0,0,0,-1]},{"size":2,"px":[15,1],"py":[4,3],"pz":[0,-1],"nx":[16,15],"ny":[2,2],"nz":[0,0]},{"size":2,"px":[3,7],"py":[7,13],"pz":[1,0],"nx":[3,0],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[14,15],"py":[18,14],"pz":[0,-1],"nx":[4,14],"ny":[4,16],"nz":[1,0]},{"size":2,"px":[4,6],"py":[3,4],"pz":[2,1],"nx":[9,5],"ny":[14,2],"nz":[0,-1]},{"size":2,"px":[16,6],"py":[1,5],"pz":[0,-1],"nx":[4,9],"ny":[0,4],"nz":[2,1]},{"size":2,"px":[9,0],"py":[4,2],"pz":[0,-1],"nx":[5,3],"ny":[1,0],"nz":[1,2]},{"size":5,"px":[1,1,1,0,0],"py":[16,15,17,6,9],"pz":[0,0,0,1,0],"nx":[9,5,4,9,8],"ny":[7,3,3,6,7],"nz":[0,1,1,0,-1]},{"size":2,"px":[9,1],"py":[8,15],"pz":[1,-1],"nx":[9,8],"ny":[9,4],"nz":[1,1]},{"size":2,"px":[20,19],"py":[19,22],"pz":[0,0],"nx":[7,0],"ny":[3,0],"nz":[1,-1]},{"size":5,"px":[8,4,2,5,5],"py":[12,6,3,5,5],"pz":[0,1,2,1,-1],"nx":[22,21,20,21,22],"ny":[17,20,22,19,16],"nz":[0,0,0,0,0]},{"size":2,"px":[6,12],"py":[2,6],"pz":[1,0],"nx":[8,3],"ny":[3,2],"nz":[1,-1]},{"size":2,"px":[11,11],"py":[9,4],"pz":[1,1],"nx":[12,4],"ny":[17,5],"nz":[0,-1]},{"size":3,"px":[0,1,0],"py":[5,13,3],"pz":[2,0,2],"nx":[0,4,11],"ny":[23,5,1],"nz":[0,-1,-1]},{"size":2,"px":[10,5],"py":[6,3],"pz":[0,1],"nx":[4,4],"ny":[3,0],"nz":[1,-1]},{"size":2,"px":[6,5],"py":[7,3],"pz":[0,-1],"nx":[0,1],"ny":[4,10],"nz":[2,1]},{"size":5,"px":[12,13,12,12,12],"py":[12,13,11,10,10],"pz":[0,0,0,0,-1],"nx":[10,8,8,16,15],"ny":[7,4,10,11,10],"nz":[0,1,0,0,0]},{"size":2,"px":[4,8],"py":[3,6],"pz":[2,1],"nx":[4,2],"ny":[5,5],"nz":[2,-1]},{"size":2,"px":[9,17],"py":[17,7],"pz":[0,-1],"nx":[5,2],"ny":[9,4],"nz":[1,2]},{"size":2,"px":[4,4],"py":[3,5],"pz":[2,2],"nx":[12,8],"ny":[16,2],"nz":[0,-1]},{"size":2,"px":[1,1],"py":[2,0],"pz":[1,1],"nx":[0,4],"ny":[0,1],"nz":[2,-1]},{"size":2,"px":[11,1],"py":[5,0],"pz":[0,-1],"nx":[2,3],"ny":[2,4],"nz":[2,1]},{"size":4,"px":[0,6,4,22],"py":[23,2,4,12],"pz":[0,-1,-1,-1],"nx":[7,6,8,5],"ny":[1,1,2,1],"nz":[1,1,1,1]},{"size":2,"px":[4,10],"py":[0,9],"pz":[1,-1],"nx":[2,4],"ny":[3,10],"nz":[2,1]},{"size":2,"px":[11,8],"py":[15,13],"pz":[0,-1],"nx":[23,11],"ny":[13,5],"nz":[0,1]},{"size":2,"px":[18,4],"py":[5,4],"pz":[0,-1],"nx":[18,20],"ny":[4,7],"nz":[0,0]},{"size":5,"px":[21,20,20,10,20],"py":[17,22,19,10,21],"pz":[0,0,0,1,0],"nx":[5,5,3,14,7],"ny":[9,9,0,8,4],"nz":[0,-1,-1,-1,-1]},{"size":5,"px":[3,7,13,7,3],"py":[6,12,3,0,3],"pz":[1,-1,-1,-1,-1],"nx":[1,5,0,0,2],"ny":[16,6,13,5,4],"nz":[0,1,0,1,0]},{"size":2,"px":[7,4],"py":[6,3],"pz":[1,2],"nx":[9,5],"ny":[4,6],"nz":[1,-1]},{"size":3,"px":[14,9,13],"py":[19,22,8],"pz":[0,-1,-1],"nx":[13,4,4],"ny":[17,2,5],"nz":[0,2,2]},{"size":2,"px":[16,4],"py":[9,3],"pz":[0,2],"nx":[7,4],"ny":[4,5],"nz":[1,-1]},{"size":4,"px":[10,2,4,2],"py":[23,4,8,3],"pz":[0,2,1,2],"nx":[14,0,4,11],"ny":[19,3,5,3],"nz":[0,-1,-1,-1]},{"size":5,"px":[9,10,8,7,11],"py":[2,2,2,2,2],"pz":[0,0,0,0,0],"nx":[6,5,3,4,4],"ny":[0,1,0,2,2],"nz":[0,0,1,0,-1]},{"size":2,"px":[6,4],"py":[13,6],"pz":[0,-1],"nx":[15,4],"ny":[8,4],"nz":[0,1]},{"size":2,"px":[0,8],"py":[1,2],"pz":[2,-1],"nx":[5,4],"ny":[2,2],"nz":[1,1]},{"size":5,"px":[16,13,14,15,15],"py":[1,0,0,0,0],"pz":[0,0,0,0,-1],"nx":[4,9,4,18,8],"ny":[5,9,4,18,11],"nz":[2,1,2,0,1]},{"size":2,"px":[5,6],"py":[2,6],"pz":[2,1],"nx":[22,9],"ny":[23,9],"nz":[0,-1]},{"size":2,"px":[19,19],"py":[5,5],"pz":[0,-1],"nx":[21,22],"ny":[2,4],"nz":[0,0]},{"size":2,"px":[2,5],"py":[8,6],"pz":[0,1],"nx":[3,4],"ny":[4,9],"nz":[1,-1]},{"size":2,"px":[18,14],"py":[13,17],"pz":[0,0],"nx":[14,4],"ny":[16,3],"nz":[0,-1]},{"size":2,"px":[6,6],"py":[6,3],"pz":[1,-1],"nx":[1,0],"ny":[2,2],"nz":[1,2]},{"size":2,"px":[23,21],"py":[21,14],"pz":[0,-1],"nx":[7,5],"ny":[0,0],"nz":[0,1]},{"size":2,"px":[15,10],"py":[23,7],"pz":[0,-1],"nx":[9,4],"ny":[4,5],"nz":[1,2]},{"size":2,"px":[4,18],"py":[3,8],"pz":[2,0],"nx":[8,4],"ny":[4,5],"nz":[1,-1]},{"size":2,"px":[13,7],"py":[2,11],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":5,"px":[2,3,5,6,1],"py":[7,14,2,2,4],"pz":[1,0,0,0,2],"nx":[8,4,4,7,7],"ny":[7,5,4,9,9],"nz":[1,2,2,1,-1]},{"size":2,"px":[5,3],"py":[6,3],"pz":[1,-1],"nx":[1,2],"ny":[2,4],"nz":[2,1]},{"size":5,"px":[7,20,4,10,10],"py":[9,16,4,10,8],"pz":[1,0,2,1,1],"nx":[4,2,3,5,3],"ny":[11,5,6,12,5],"nz":[0,1,1,0,-1]},{"size":2,"px":[6,11],"py":[4,18],"pz":[1,-1],"nx":[8,6],"ny":[4,9],"nz":[1,1]},{"size":2,"px":[2,8],"py":[5,23],"pz":[2,0],"nx":[9,4],"ny":[0,2],"nz":[1,-1]},{"size":5,"px":[3,1,2,2,2],"py":[12,6,12,11,11],"pz":[0,1,0,0,-1],"nx":[0,0,0,0,0],"ny":[13,12,11,14,7],"nz":[0,0,0,0,1]},{"size":2,"px":[3,6],"py":[1,2],"pz":[2,1],"nx":[8,4],"ny":[4,14],"nz":[1,-1]},{"size":5,"px":[11,23,23,22,22],"py":[8,12,6,13,14],"pz":[1,0,0,0,0],"nx":[13,8,7,6,6],"ny":[6,3,3,9,9],"nz":[0,1,1,0,-1]},{"size":4,"px":[9,23,23,22],"py":[7,12,6,13],"pz":[1,-1,-1,-1],"nx":[11,23,23,23],"ny":[6,13,17,10],"nz":[1,0,0,0]},{"size":5,"px":[0,0,0,0,0],"py":[19,5,9,16,10],"pz":[0,2,1,0,1],"nx":[5,2,1,2,2],"ny":[18,10,5,9,9],"nz":[0,1,2,1,-1]},{"size":2,"px":[11,5],"py":[10,4],"pz":[1,2],"nx":[23,14],"ny":[23,3],"nz":[0,-1]},{"size":2,"px":[2,4],"py":[3,6],"pz":[2,1],"nx":[3,1],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[8,10],"py":[4,8],"pz":[0,-1],"nx":[8,8],"ny":[2,3],"nz":[0,0]},{"size":3,"px":[7,10,11],"py":[1,6,13],"pz":[0,-1,-1],"nx":[4,4,2],"ny":[3,8,2],"nz":[1,1,2]},{"size":2,"px":[8,4],"py":[8,2],"pz":[1,2],"nx":[10,5],"ny":[10,0],"nz":[0,-1]},{"size":2,"px":[7,16],"py":[20,21],"pz":[0,-1],"nx":[2,4],"ny":[5,10],"nz":[2,1]},{"size":2,"px":[3,10],"py":[7,8],"pz":[1,-1],"nx":[7,4],"ny":[20,7],"nz":[0,1]},{"size":5,"px":[11,11,11,11,11],"py":[10,12,13,11,11],"pz":[0,0,0,0,-1],"nx":[11,12,16,3,8],"ny":[6,6,10,1,8],"nz":[0,0,0,2,0]},{"size":2,"px":[12,6],"py":[4,2],"pz":[0,1],"nx":[7,7],"ny":[8,1],"nz":[0,-1]},{"size":5,"px":[23,23,23,23,23],"py":[22,20,21,19,19],"pz":[0,0,0,0,-1],"nx":[4,6,3,4,3],"ny":[19,23,15,20,16],"nz":[0,0,0,0,0]},{"size":3,"px":[8,4,14],"py":[12,3,8],"pz":[0,-1,-1],"nx":[4,2,10],"ny":[10,3,13],"nz":[1,2,0]},{"size":2,"px":[11,18],"py":[13,23],"pz":[0,-1],"nx":[5,5],"ny":[1,2],"nz":[2,2]},{"size":3,"px":[11,2,10],"py":[17,4,17],"pz":[0,2,0],"nx":[11,0,22],"ny":[15,2,4],"nz":[0,-1,-1]},{"size":3,"px":[11,3,0],"py":[15,4,8],"pz":[0,-1,-1],"nx":[14,11,4],"ny":[9,17,7],"nz":[0,0,1]},{"size":2,"px":[17,16],"py":[2,1],"pz":[0,0],"nx":[9,11],"ny":[4,6],"nz":[1,-1]},{"size":2,"px":[3,4],"py":[21,23],"pz":[0,0],"nx":[4,0],"ny":[3,3],"nz":[1,-1]},{"size":2,"px":[18,2],"py":[20,0],"pz":[0,-1],"nx":[4,9],"ny":[5,10],"nz":[2,1]},{"size":2,"px":[9,1],"py":[19,3],"pz":[0,-1],"nx":[0,0],"ny":[9,21],"nz":[1,0]},{"size":2,"px":[19,19],"py":[21,22],"pz":[0,0],"nx":[19,0],"ny":[23,0],"nz":[0,-1]},{"size":4,"px":[11,2,3,2],"py":[6,6,9,4],"pz":[0,-1,-1,-1],"nx":[4,9,19,19],"ny":[5,10,17,18],"nz":[2,1,0,0]},{"size":2,"px":[2,4],"py":[4,8],"pz":[2,1],"nx":[4,9],"ny":[10,10],"nz":[1,-1]},{"size":2,"px":[23,22],"py":[8,12],"pz":[0,-1],"nx":[7,4],"ny":[11,2],"nz":[0,2]},{"size":2,"px":[12,1],"py":[5,2],"pz":[0,-1],"nx":[9,11],"ny":[2,1],"nz":[0,0]},{"size":2,"px":[4,4],"py":[2,2],"pz":[0,-1],"nx":[3,2],"ny":[1,2],"nz":[0,0]},{"size":2,"px":[17,9],"py":[13,7],"pz":[0,1],"nx":[9,5],"ny":[4,0],"nz":[1,-1]},{"size":4,"px":[0,0,9,13],"py":[3,3,7,3],"pz":[2,-1,-1,-1],"nx":[2,4,4,11],"ny":[1,2,8,5],"nz":[2,1,1,0]},{"size":5,"px":[3,6,5,6,6],"py":[0,0,2,1,1],"pz":[1,0,0,0,-1],"nx":[2,2,2,1,1],"ny":[21,19,20,16,17],"nz":[0,0,0,0,0]},{"size":2,"px":[13,3],"py":[22,10],"pz":[0,-1],"nx":[7,4],"ny":[10,5],"nz":[1,2]},{"size":2,"px":[3,2],"py":[7,3],"pz":[1,2],"nx":[8,4],"ny":[4,5],"nz":[1,-1]},{"size":5,"px":[17,8,15,7,15],"py":[13,6,16,5,12],"pz":[0,1,0,1,0],"nx":[5,4,6,3,4],"ny":[1,2,1,0,3],"nz":[0,0,0,1,-1]},{"size":5,"px":[12,9,11,12,10],"py":[0,1,2,2,0],"pz":[0,0,0,0,0],"nx":[8,16,7,4,4],"ny":[9,23,9,3,2],"nz":[1,0,1,2,-1]},{"size":2,"px":[4,11],"py":[1,4],"pz":[2,-1],"nx":[8,7],"ny":[4,4],"nz":[0,0]},{"size":4,"px":[7,4,5,8],"py":[13,2,1,3],"pz":[0,-1,-1,-1],"nx":[9,4,9,9],"ny":[9,5,10,11],"nz":[0,1,0,0]},{"size":2,"px":[10,11],"py":[10,11],"pz":[0,-1],"nx":[2,6],"ny":[2,2],"nz":[2,1]},{"size":2,"px":[21,3],"py":[11,2],"pz":[0,-1],"nx":[22,22],"ny":[20,18],"nz":[0,0]},{"size":2,"px":[7,6],"py":[1,2],"pz":[0,0],"nx":[5,10],"ny":[1,0],"nz":[0,-1]},{"size":2,"px":[21,3],"py":[18,1],"pz":[0,-1],"nx":[16,15],"ny":[4,4],"nz":[0,0]},{"size":2,"px":[12,7],"py":[4,1],"pz":[0,-1],"nx":[4,8],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[13,11],"py":[23,17],"pz":[0,0],"nx":[11,21],"ny":[16,0],"nz":[0,-1]},{"size":2,"px":[1,2],"py":[0,6],"pz":[1,-1],"nx":[16,16],"ny":[9,11],"nz":[0,0]},{"size":2,"px":[12,13],"py":[20,20],"pz":[0,0],"nx":[11,3],"ny":[21,7],"nz":[0,-1]},{"size":3,"px":[19,20,9],"py":[21,18,11],"pz":[0,0,1],"nx":[17,4,11],"ny":[19,2,0],"nz":[0,-1,-1]},{"size":2,"px":[12,5],"py":[5,2],"pz":[0,1],"nx":[7,9],"ny":[7,8],"nz":[0,-1]},{"size":5,"px":[8,4,4,8,4],"py":[4,4,5,10,3],"pz":[1,1,2,0,2],"nx":[11,22,11,23,23],"ny":[0,0,1,3,3],"nz":[1,0,1,0,-1]},{"size":2,"px":[8,14],"py":[10,23],"pz":[1,0],"nx":[7,2],"ny":[10,9],"nz":[1,-1]},{"size":2,"px":[5,14],"py":[6,23],"pz":[1,-1],"nx":[1,2],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[11,2],"py":[19,3],"pz":[0,-1],"nx":[10,12],"ny":[18,18],"nz":[0,0]},{"size":2,"px":[12,3],"py":[4,1],"pz":[0,2],"nx":[6,6],"ny":[11,11],"nz":[1,-1]},{"size":5,"px":[0,0,0,0,0],"py":[18,10,20,19,19],"pz":[0,1,0,0,-1],"nx":[11,10,14,12,13],"ny":[2,2,2,2,2],"nz":[0,0,0,0,0]},{"size":3,"px":[12,2,9],"py":[14,5,10],"pz":[0,-1,-1],"nx":[11,10,5],"ny":[10,13,5],"nz":[0,0,1]},{"size":2,"px":[2,3],"py":[3,7],"pz":[2,1],"nx":[3,10],"ny":[4,13],"nz":[1,-1]},{"size":2,"px":[9,3],"py":[21,7],"pz":[0,-1],"nx":[10,21],"ny":[7,15],"nz":[1,0]},{"size":2,"px":[21,10],"py":[16,8],"pz":[0,1],"nx":[8,2],"ny":[10,8],"nz":[1,-1]},{"size":2,"px":[8,8],"py":[6,7],"pz":[1,-1],"nx":[12,11],"ny":[11,7],"nz":[0,1]},{"size":2,"px":[3,11],"py":[4,20],"pz":[2,0],"nx":[11,10],"ny":[19,1],"nz":[0,-1]},{"size":2,"px":[17,5],"py":[13,3],"pz":[0,-1],"nx":[7,8],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[7,1],"py":[23,3],"pz":[0,2],"nx":[14,6],"ny":[12,9],"nz":[0,-1]},{"size":2,"px":[12,5],"py":[11,2],"pz":[0,-1],"nx":[11,7],"ny":[3,1],"nz":[0,1]},{"size":2,"px":[9,6],"py":[2,17],"pz":[0,-1],"nx":[4,6],"ny":[4,12],"nz":[1,0]},{"size":2,"px":[14,19],"py":[5,6],"pz":[0,-1],"nx":[9,3],"ny":[9,1],"nz":[0,2]},{"size":5,"px":[12,13,13,13,12],"py":[9,11,12,13,10],"pz":[0,0,0,0,0],"nx":[2,4,4,4,4],"ny":[7,18,17,14,14],"nz":[1,0,0,0,-1]},{"size":2,"px":[10,10],"py":[6,6],"pz":[1,-1],"nx":[20,18],"ny":[18,23],"nz":[0,0]},{"size":2,"px":[5,6],"py":[4,14],"pz":[1,-1],"nx":[9,4],"ny":[2,1],"nz":[1,2]},{"size":2,"px":[11,9],"py":[4,18],"pz":[0,-1],"nx":[4,8],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[15,0],"py":[18,4],"pz":[0,-1],"nx":[3,4],"ny":[5,4],"nz":[2,2]},{"size":4,"px":[7,3,6,6],"py":[8,4,6,5],"pz":[1,2,1,1],"nx":[10,4,13,0],"ny":[10,4,9,22],"nz":[0,-1,-1,-1]},{"size":2,"px":[10,8],"py":[18,11],"pz":[0,-1],"nx":[5,4],"ny":[8,10],"nz":[1,1]},{"size":4,"px":[17,2,10,2],"py":[14,1,10,3],"pz":[0,-1,-1,-1],"nx":[8,8,17,8],"ny":[4,5,12,6],"nz":[1,1,0,1]},{"size":5,"px":[9,11,9,4,10],"py":[1,1,0,0,1],"pz":[0,0,0,1,0],"nx":[8,4,7,15,15],"ny":[7,2,4,17,17],"nz":[1,2,1,0,-1]},{"size":2,"px":[4,3],"py":[11,8],"pz":[0,-1],"nx":[2,2],"ny":[1,2],"nz":[2,2]},{"size":2,"px":[11,3],"py":[13,8],"pz":[0,-1],"nx":[1,1],"ny":[5,2],"nz":[1,2]},{"size":2,"px":[6,2],"py":[8,3],"pz":[0,2],"nx":[3,1],"ny":[5,2],"nz":[1,-1]},{"size":5,"px":[10,5,7,8,6],"py":[9,7,7,7,7],"pz":[0,0,0,0,0],"nx":[7,3,0,2,15],"ny":[8,0,1,18,17],"nz":[0,-1,-1,-1,-1]},{"size":2,"px":[17,8],"py":[12,6],"pz":[0,1],"nx":[8,8],"ny":[4,4],"nz":[1,-1]},{"size":5,"px":[3,11,8,10,12],"py":[0,2,10,2,3],"pz":[2,0,0,0,0],"nx":[3,2,10,2,2],"ny":[6,4,11,3,3],"nz":[0,1,0,1,-1]},{"size":2,"px":[3,6],"py":[2,4],"pz":[2,1],"nx":[8,19],"ny":[4,16],"nz":[1,-1]},{"size":2,"px":[2,2],"py":[1,1],"pz":[2,-1],"nx":[7,17],"ny":[1,2],"nz":[1,0]},{"size":5,"px":[16,15,14,13,7],"py":[0,0,0,0,0],"pz":[0,0,0,0,-1],"nx":[6,4,8,3,11],"ny":[3,4,4,1,6],"nz":[1,1,1,2,0]},{"size":2,"px":[11,1],"py":[8,5],"pz":[0,-1],"nx":[13,4],"ny":[10,2],"nz":[0,2]},{"size":2,"px":[4,9],"py":[0,2],"pz":[2,1],"nx":[4,11],"ny":[0,2],"nz":[0,-1]},{"size":2,"px":[15,15],"py":[2,2],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[8,17],"py":[9,22],"pz":[1,0],"nx":[8,20],"ny":[10,2],"nz":[1,-1]},{"size":2,"px":[10,10],"py":[14,22],"pz":[0,-1],"nx":[3,11],"ny":[3,3],"nz":[1,0]},{"size":2,"px":[4,2],"py":[1,0],"pz":[1,2],"nx":[5,8],"ny":[3,9],"nz":[0,-1]},{"size":2,"px":[2,3],"py":[4,8],"pz":[2,1],"nx":[9,5],"ny":[15,19],"nz":[0,-1]},{"size":2,"px":[5,2],"py":[1,1],"pz":[0,1],"nx":[10,10],"ny":[6,6],"nz":[0,-1]},{"size":2,"px":[17,6],"py":[10,2],"pz":[0,-1],"nx":[4,8],"ny":[2,4],"nz":[2,1]},{"size":3,"px":[13,7,3],"py":[5,2,6],"pz":[0,1,-1],"nx":[17,16,17],"ny":[1,1,2],"nz":[0,0,0]},{"size":2,"px":[11,10],"py":[3,3],"pz":[0,0],"nx":[8,4],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[4,8],"py":[0,8],"pz":[2,-1],"nx":[3,4],"ny":[0,0],"nz":[1,1]},{"size":5,"px":[9,2,4,1,2],"py":[13,3,9,2,5],"pz":[0,2,1,2,2],"nx":[9,5,10,4,10],"ny":[5,1,3,0,0],"nz":[1,-1,-1,-1,-1]},{"size":2,"px":[6,12],"py":[5,9],"pz":[1,0],"nx":[0,2],"ny":[23,9],"nz":[0,-1]},{"size":2,"px":[22,11],"py":[21,8],"pz":[0,1],"nx":[10,0],"ny":[17,2],"nz":[0,-1]},{"size":2,"px":[3,1],"py":[22,9],"pz":[0,1],"nx":[22,5],"ny":[11,2],"nz":[0,2]},{"size":2,"px":[4,2],"py":[6,3],"pz":[1,2],"nx":[5,6],"ny":[10,9],"nz":[1,-1]},{"size":4,"px":[7,3,17,7],"py":[8,2,10,11],"pz":[0,2,0,1],"nx":[6,10,5,23],"ny":[9,21,1,23],"nz":[0,-1,-1,-1]},{"size":2,"px":[8,3],"py":[7,2],"pz":[1,2],"nx":[8,9],"ny":[4,9],"nz":[1,-1]},{"size":2,"px":[9,5],"py":[14,6],"pz":[0,1],"nx":[8,8],"ny":[13,13],"nz":[0,-1]},{"size":3,"px":[11,6,8],"py":[20,3,20],"pz":[0,-1,-1],"nx":[5,3,12],"ny":[9,5,18],"nz":[1,2,0]},{"size":2,"px":[3,9],"py":[1,3],"pz":[1,0],"nx":[2,8],"ny":[5,8],"nz":[0,-1]},{"size":2,"px":[15,9],"py":[21,3],"pz":[0,-1],"nx":[3,4],"ny":[5,5],"nz":[2,2]},{"size":2,"px":[2,9],"py":[7,11],"pz":[1,-1],"nx":[2,2],"ny":[8,9],"nz":[1,1]},{"size":4,"px":[3,4,3,1],"py":[14,21,19,6],"pz":[0,0,0,1],"nx":[10,16,4,5],"ny":[8,1,7,6],"nz":[0,-1,-1,-1]},{"size":4,"px":[10,4,3,1],"py":[5,21,19,6],"pz":[1,-1,-1,-1],"nx":[21,10,5,11],"ny":[4,2,3,4],"nz":[0,1,2,1]},{"size":2,"px":[4,17],"py":[3,8],"pz":[2,0],"nx":[17,2],"ny":[9,22],"nz":[0,-1]},{"size":2,"px":[17,12],"py":[14,20],"pz":[0,-1],"nx":[7,8],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[10,12],"py":[9,20],"pz":[0,-1],"nx":[11,23],"ny":[8,18],"nz":[1,0]},{"size":2,"px":[5,11],"py":[4,7],"pz":[2,1],"nx":[8,15],"ny":[7,5],"nz":[1,-1]},{"size":2,"px":[11,15],"py":[13,8],"pz":[0,-1],"nx":[11,11],"ny":[6,7],"nz":[1,1]},{"size":2,"px":[6,15],"py":[14,8],"pz":[0,-1],"nx":[4,4],"ny":[12,13],"nz":[0,0]},{"size":2,"px":[5,5],"py":[0,1],"pz":[2,2],"nx":[15,4],"ny":[5,5],"nz":[0,-1]},{"size":2,"px":[16,17],"py":[2,2],"pz":[0,0],"nx":[20,8],"ny":[3,7],"nz":[0,-1]},{"size":3,"px":[6,3,2],"py":[10,6,1],"pz":[0,-1,-1],"nx":[4,3,2],"ny":[3,4,2],"nz":[1,1,2]},{"size":2,"px":[10,6],"py":[4,6],"pz":[0,-1],"nx":[6,13],"ny":[0,1],"nz":[1,0]},{"size":2,"px":[10,10],"py":[8,7],"pz":[1,1],"nx":[8,2],"ny":[7,2],"nz":[1,-1]},{"size":2,"px":[7,1],"py":[12,4],"pz":[0,-1],"nx":[3,4],"ny":[5,5],"nz":[1,1]},{"size":2,"px":[11,15],"py":[15,14],"pz":[0,-1],"nx":[3,11],"ny":[4,13],"nz":[1,0]},{"size":5,"px":[13,9,11,14,12],"py":[0,2,0,0,2],"pz":[0,0,0,0,0],"nx":[5,4,4,3,4],"ny":[4,4,18,7,17],"nz":[1,1,0,1,0]},{"size":3,"px":[13,12,11],"py":[22,22,22],"pz":[0,0,0],"nx":[11,12,13],"ny":[20,20,20],"nz":[0,0,0]},{"size":2,"px":[6,13],"py":[2,4],"pz":[1,0],"nx":[7,6],"ny":[8,9],"nz":[0,-1]},{"size":2,"px":[0,0],"py":[23,4],"pz":[0,-1],"nx":[5,9],"ny":[1,1],"nz":[1,0]},{"size":2,"px":[14,14],"py":[19,19],"pz":[0,-1],"nx":[11,11],"ny":[10,9],"nz":[1,1]},{"size":2,"px":[23,23],"py":[11,9],"pz":[0,0],"nx":[23,23],"ny":[0,11],"nz":[0,-1]},{"size":2,"px":[23,3],"py":[23,5],"pz":[0,-1],"nx":[4,1],"ny":[23,10],"nz":[0,1]},{"size":2,"px":[9,1],"py":[7,4],"pz":[1,-1],"nx":[19,10],"ny":[20,9],"nz":[0,1]},{"size":2,"px":[16,1],"py":[9,4],"pz":[0,-1],"nx":[7,8],"ny":[3,3],"nz":[1,1]},{"size":2,"px":[7,6],"py":[13,13],"pz":[0,0],"nx":[4,5],"ny":[4,11],"nz":[1,-1]},{"size":5,"px":[19,20,20,10,10],"py":[0,0,2,0,1],"pz":[0,0,0,1,1],"nx":[7,7,15,4,4],"ny":[4,13,7,4,4],"nz":[1,0,0,1,-1]},{"size":2,"px":[12,23],"py":[6,5],"pz":[0,-1],"nx":[18,18],"ny":[17,16],"nz":[0,0]},{"size":2,"px":[6,3],"py":[9,2],"pz":[1,2],"nx":[14,18],"ny":[9,1],"nz":[0,-1]},{"size":2,"px":[9,13],"py":[16,5],"pz":[0,-1],"nx":[5,4],"ny":[7,9],"nz":[1,1]},{"size":2,"px":[10,10],"py":[8,10],"pz":[1,1],"nx":[4,1],"ny":[5,3],"nz":[2,-1]},{"size":2,"px":[12,11],"py":[13,4],"pz":[0,-1],"nx":[0,0],"ny":[14,15],"nz":[0,0]},{"size":2,"px":[2,1],"py":[20,17],"pz":[0,0],"nx":[12,12],"ny":[22,2],"nz":[0,-1]},{"size":2,"px":[2,3],"py":[6,7],"pz":[1,-1],"nx":[21,21],"ny":[13,12],"nz":[0,0]},{"size":2,"px":[3,10],"py":[4,23],"pz":[2,0],"nx":[10,2],"ny":[21,5],"nz":[0,-1]},{"size":2,"px":[6,12],"py":[3,6],"pz":[1,0],"nx":[11,0],"ny":[17,1],"nz":[0,-1]},{"size":2,"px":[11,4],"py":[21,9],"pz":[0,-1],"nx":[2,3],"ny":[18,22],"nz":[0,0]},{"size":2,"px":[13,5],"py":[18,9],"pz":[0,-1],"nx":[6,7],"ny":[8,9],"nz":[1,1]},{"size":2,"px":[21,4],"py":[16,3],"pz":[0,-1],"nx":[23,23],"ny":[16,15],"nz":[0,0]},{"size":2,"px":[2,0],"py":[7,4],"pz":[1,-1],"nx":[3,8],"ny":[7,4],"nz":[1,1]},{"size":2,"px":[15,16],"py":[11,12],"pz":[0,0],"nx":[8,5],"ny":[4,5],"nz":[1,-1]},{"size":2,"px":[0,0],"py":[7,5],"pz":[0,0],"nx":[17,17],"ny":[11,10],"nz":[0,-1]},{"size":5,"px":[8,13,12,3,3],"py":[6,23,23,3,3],"pz":[1,0,0,2,-1],"nx":[0,1,0,0,0],"ny":[2,13,4,5,6],"nz":[2,0,1,1,1]},{"size":2,"px":[0,1],"py":[7,8],"pz":[1,-1],"nx":[0,0],"ny":[1,0],"nz":[2,2]},{"size":2,"px":[2,12],"py":[1,7],"pz":[1,-1],"nx":[0,0],"ny":[12,14],"nz":[0,0]},{"size":2,"px":[5,1],"py":[7,4],"pz":[1,2],"nx":[8,0],"ny":[15,14],"nz":[0,-1]},{"size":2,"px":[7,4],"py":[14,8],"pz":[0,-1],"nx":[2,4],"ny":[1,4],"nz":[2,1]},{"size":2,"px":[5,3],"py":[3,1],"pz":[2,-1],"nx":[9,9],"ny":[5,6],"nz":[1,1]},{"size":2,"px":[4,5],"py":[2,3],"pz":[1,-1],"nx":[11,12],"ny":[23,23],"nz":[0,0]},{"size":2,"px":[10,5],"py":[7,0],"pz":[1,-1],"nx":[22,22],"ny":[19,18],"nz":[0,0]},{"size":3,"px":[10,2,9],"py":[20,9,4],"pz":[0,-1,-1],"nx":[1,10,11],"ny":[2,11,9],"nz":[2,0,0]},{"size":2,"px":[4,8],"py":[3,6],"pz":[2,1],"nx":[9,3],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[17,6],"py":[7,16],"pz":[0,-1],"nx":[17,17],"ny":[9,6],"nz":[0,0]},{"size":3,"px":[8,1,9],"py":[6,3,4],"pz":[1,-1,-1],"nx":[2,9,2],"ny":[5,13,3],"nz":[2,0,2]},{"size":4,"px":[10,10,9,2],"py":[12,11,2,10],"pz":[0,0,-1,-1],"nx":[6,11,3,13],"ny":[2,4,1,4],"nz":[1,0,2,0]},{"size":2,"px":[3,3],"py":[7,1],"pz":[1,-1],"nx":[4,3],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[0,0],"py":[4,8],"pz":[2,1],"nx":[4,4],"ny":[15,5],"nz":[0,-1]},{"size":2,"px":[5,0],"py":[4,8],"pz":[1,-1],"nx":[13,13],"ny":[9,10],"nz":[0,0]},{"size":2,"px":[6,3],"py":[2,1],"pz":[1,2],"nx":[8,17],"ny":[4,12],"nz":[1,-1]},{"size":2,"px":[15,16],"py":[11,6],"pz":[0,0],"nx":[16,17],"ny":[5,12],"nz":[0,-1]},{"size":2,"px":[13,11],"py":[9,7],"pz":[0,-1],"nx":[0,1],"ny":[9,20],"nz":[1,0]},{"size":3,"px":[16,11,20],"py":[4,7,23],"pz":[0,-1,-1],"nx":[8,9,4],"ny":[4,6,4],"nz":[1,1,2]},{"size":2,"px":[1,1],"py":[18,17],"pz":[0,0],"nx":[9,6],"ny":[7,11],"nz":[0,-1]},{"size":3,"px":[4,4,19],"py":[3,2,9],"pz":[2,2,0],"nx":[2,14,11],"ny":[5,3,9],"nz":[1,-1,-1]},{"size":2,"px":[11,19],"py":[13,9],"pz":[0,-1],"nx":[11,11],"ny":[4,5],"nz":[1,1]},{"size":2,"px":[13,7],"py":[19,2],"pz":[0,-1],"nx":[3,5],"ny":[6,12],"nz":[1,0]},{"size":4,"px":[9,4,4,2],"py":[13,9,8,4],"pz":[0,1,1,2],"nx":[13,0,0,14],"ny":[18,11,6,1],"nz":[0,-1,-1,-1]},{"size":2,"px":[11,15],"py":[8,10],"pz":[0,0],"nx":[14,11],"ny":[9,2],"nz":[0,-1]},{"size":2,"px":[3,2],"py":[8,5],"pz":[1,2],"nx":[4,4],"ny":[10,10],"nz":[1,-1]},{"size":4,"px":[4,6,16,14],"py":[1,1,1,7],"pz":[2,1,0,0],"nx":[10,1,1,2],"ny":[8,5,10,3],"nz":[0,-1,-1,-1]},{"size":4,"px":[2,3,1,2],"py":[3,1,0,2],"pz":[0,0,1,0],"nx":[0,0,0,0],"ny":[1,1,2,0],"nz":[0,1,0,1]},{"size":2,"px":[8,8],"py":[6,7],"pz":[1,1],"nx":[8,0],"ny":[4,1],"nz":[1,-1]},{"size":2,"px":[0,0],"py":[3,0],"pz":[0,1],"nx":[2,2],"ny":[1,16],"nz":[1,-1]},{"size":2,"px":[6,6],"py":[19,18],"pz":[0,0],"nx":[2,10],"ny":[5,8],"nz":[2,-1]},{"size":2,"px":[8,5],"py":[21,11],"pz":[0,-1],"nx":[3,2],"ny":[11,5],"nz":[1,2]},{"size":2,"px":[4,9],"py":[4,7],"pz":[2,1],"nx":[8,7],"ny":[10,4],"nz":[1,-1]},{"size":5,"px":[4,18,19,16,19],"py":[3,12,12,23,13],"pz":[2,0,0,0,0],"nx":[2,8,3,2,2],"ny":[4,23,10,5,5],"nz":[2,0,1,2,-1]},{"size":2,"px":[4,8],"py":[6,11],"pz":[1,0],"nx":[8,3],"ny":[4,7],"nz":[1,-1]},{"size":2,"px":[3,12],"py":[4,13],"pz":[2,0],"nx":[10,5],"ny":[15,21],"nz":[0,-1]},{"size":2,"px":[2,9],"py":[4,23],"pz":[2,0],"nx":[19,4],"ny":[9,3],"nz":[0,2]},{"size":2,"px":[3,6],"py":[8,15],"pz":[1,0],"nx":[6,1],"ny":[18,5],"nz":[0,-1]},{"size":2,"px":[9,0],"py":[20,3],"pz":[0,-1],"nx":[2,10],"ny":[5,17],"nz":[2,0]},{"size":3,"px":[10,6,3],"py":[2,7,3],"pz":[0,-1,-1],"nx":[5,4,2],"ny":[9,7,2],"nz":[1,1,2]},{"size":2,"px":[14,6],"py":[12,7],"pz":[0,-1],"nx":[2,10],"ny":[0,1],"nz":[2,0]},{"size":3,"px":[10,5,1],"py":[15,5,4],"pz":[0,-1,-1],"nx":[9,4,18],"ny":[2,0,4],"nz":[1,2,0]},{"size":2,"px":[17,2],"py":[12,6],"pz":[0,-1],"nx":[8,16],"ny":[4,11],"nz":[1,0]},{"size":3,"px":[7,13,4],"py":[0,0,1],"pz":[1,0,-1],"nx":[18,4,4],"ny":[13,2,3],"nz":[0,2,2]},{"size":2,"px":[1,11],"py":[10,6],"pz":[0,-1],"nx":[0,1],"ny":[15,17],"nz":[0,0]},{"size":3,"px":[9,12,8],"py":[8,17,11],"pz":[1,0,1],"nx":[12,0,20],"ny":[16,9,13],"nz":[0,-1,-1]},{"size":2,"px":[11,4],"py":[5,8],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[16,3],"py":[9,8],"pz":[0,-1],"nx":[4,8],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[6,3],"py":[11,5],"pz":[1,2],"nx":[11,5],"ny":[21,5],"nz":[0,-1]},{"size":2,"px":[11,13],"py":[1,1],"pz":[0,0],"nx":[4,4],"ny":[5,5],"nz":[1,-1]},{"size":2,"px":[14,4],"py":[4,3],"pz":[0,-1],"nx":[12,10],"ny":[2,2],"nz":[0,0]},{"size":2,"px":[3,6],"py":[2,4],"pz":[2,1],"nx":[9,7],"ny":[9,7],"nz":[0,-1]},{"size":3,"px":[5,6,6],"py":[4,4,4],"pz":[1,-1,-1],"nx":[13,8,7],"ny":[8,3,4],"nz":[0,1,1]},{"size":2,"px":[5,5],"py":[2,11],"pz":[1,1],"nx":[10,11],"ny":[22,22],"nz":[0,0]},{"size":2,"px":[16,9],"py":[13,7],"pz":[0,1],"nx":[8,14],"ny":[4,12],"nz":[1,-1]},{"size":2,"px":[13,5],"py":[13,3],"pz":[0,2],"nx":[16,22],"ny":[13,6],"nz":[0,-1]},{"size":4,"px":[4,4,3,4],"py":[4,3,4,5],"pz":[2,2,2,2],"nx":[21,5,17,7],"ny":[0,2,5,23],"nz":[0,-1,-1,-1]},{"size":2,"px":[4,16],"py":[0,1],"pz":[2,0],"nx":[15,1],"ny":[23,10],"nz":[0,-1]},{"size":2,"px":[4,6],"py":[11,2],"pz":[0,-1],"nx":[15,6],"ny":[2,1],"nz":[0,1]},{"size":2,"px":[6,3],"py":[2,1],"pz":[1,2],"nx":[8,8],"ny":[4,4],"nz":[1,-1]},{"size":3,"px":[13,14,5],"py":[9,15,2],"pz":[0,-1,-1],"nx":[11,1,11],"ny":[10,3,11],"nz":[0,1,0]},{"size":2,"px":[5,1],"py":[6,2],"pz":[1,-1],"nx":[1,1],"ny":[2,5],"nz":[2,1]},{"size":2,"px":[11,5],"py":[1,0],"pz":[1,2],"nx":[10,4],"ny":[2,3],"nz":[1,-1]},{"size":2,"px":[11,11],"py":[8,9],"pz":[1,1],"nx":[23,4],"ny":[23,2],"nz":[0,-1]},{"size":2,"px":[5,2],"py":[10,2],"pz":[0,-1],"nx":[18,10],"ny":[0,1],"nz":[0,1]},{"size":2,"px":[20,4],"py":[7,3],"pz":[0,2],"nx":[8,4],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[10,4],"py":[5,4],"pz":[1,-1],"nx":[11,11],"ny":[5,6],"nz":[1,1]},{"size":3,"px":[14,15,16],"py":[0,0,1],"pz":[0,0,0],"nx":[8,5,15],"ny":[7,2,10],"nz":[1,-1,-1]},{"size":2,"px":[2,2],"py":[1,1],"pz":[2,-1],"nx":[17,18],"ny":[2,2],"nz":[0,0]},{"size":2,"px":[13,8],"py":[15,7],"pz":[0,-1],"nx":[9,4],"ny":[5,2],"nz":[0,1]},{"size":2,"px":[4,0],"py":[6,17],"pz":[1,-1],"nx":[3,2],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[14,8],"py":[17,9],"pz":[0,-1],"nx":[7,6],"ny":[8,8],"nz":[1,1]},{"size":2,"px":[10,4],"py":[7,1],"pz":[1,-1],"nx":[15,6],"ny":[14,4],"nz":[0,1]},{"size":2,"px":[3,12],"py":[8,19],"pz":[1,0],"nx":[13,10],"ny":[17,9],"nz":[0,-1]},{"size":2,"px":[7,12],"py":[2,4],"pz":[1,0],"nx":[6,11],"ny":[3,2],"nz":[0,-1]},{"size":4,"px":[2,1,6,1],"py":[10,3,23,8],"pz":[1,2,0,1],"nx":[17,10,23,0],"ny":[9,2,20,3],"nz":[0,-1,-1,-1]},{"size":2,"px":[9,9],"py":[2,8],"pz":[0,-1],"nx":[2,2],"ny":[4,2],"nz":[2,2]},{"size":2,"px":[3,16],"py":[1,6],"pz":[2,0],"nx":[8,4],"ny":[2,5],"nz":[1,-1]},{"size":2,"px":[3,6],"py":[1,2],"pz":[2,1],"nx":[8,8],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[5,6],"py":[3,0],"pz":[2,-1],"nx":[9,5],"ny":[2,1],"nz":[0,1]},{"size":2,"px":[3,16],"py":[5,23],"pz":[1,-1],"nx":[0,0],"ny":[6,3],"nz":[1,2]},{"size":4,"px":[0,0,0,0],"py":[3,2,12,5],"pz":[2,2,0,1],"nx":[2,3,2,13],"ny":[5,5,2,19],"nz":[1,-1,-1,-1]},{"size":2,"px":[11,11],"py":[10,11],"pz":[0,0],"nx":[5,5],"ny":[1,1],"nz":[2,-1]},{"size":2,"px":[5,2],"py":[0,4],"pz":[2,-1],"nx":[2,2],"ny":[10,8],"nz":[1,1]},{"size":4,"px":[16,2,8,4],"py":[14,0,11,5],"pz":[0,-1,-1,-1],"nx":[18,14,7,7],"ny":[13,14,8,6],"nz":[0,0,1,1]},{"size":2,"px":[8,9],"py":[2,2],"pz":[0,0],"nx":[5,14],"ny":[4,14],"nz":[1,-1]},{"size":2,"px":[3,5],"py":[11,20],"pz":[1,0],"nx":[11,4],"ny":[0,2],"nz":[0,-1]},{"size":2,"px":[2,2],"py":[3,4],"pz":[2,2],"nx":[3,4],"ny":[4,2],"nz":[1,-1]},{"size":3,"px":[10,4,3],"py":[5,5,3],"pz":[0,-1,-1],"nx":[11,3,10],"ny":[2,0,2],"nz":[0,2,0]},{"size":2,"px":[15,15],"py":[1,1],"pz":[0,-1],"nx":[7,4],"ny":[5,2],"nz":[1,2]},{"size":4,"px":[9,5,2,6],"py":[22,8,4,19],"pz":[0,1,2,0],"nx":[9,5,0,3],"ny":[20,5,22,4],"nz":[0,-1,-1,-1]},{"size":3,"px":[1,4,10],"py":[3,9,12],"pz":[2,1,0],"nx":[0,10,0],"ny":[0,5,0],"nz":[0,-1,-1]},{"size":2,"px":[1,6],"py":[0,7],"pz":[0,-1],"nx":[20,19],"ny":[14,14],"nz":[0,0]},{"size":2,"px":[13,4],"py":[14,15],"pz":[0,-1],"nx":[2,1],"ny":[5,7],"nz":[0,0]},{"size":2,"px":[17,7],"py":[9,11],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[17,9],"py":[12,6],"pz":[0,1],"nx":[15,10],"ny":[9,8],"nz":[0,-1]},{"size":2,"px":[0,0],"py":[0,1],"pz":[2,2],"nx":[9,7],"ny":[6,17],"nz":[1,-1]},{"size":3,"px":[3,3,15],"py":[3,4,6],"pz":[2,1,0],"nx":[0,2,22],"ny":[5,8,9],"nz":[0,-1,-1]},{"size":4,"px":[15,15,15,1],"py":[12,6,6,1],"pz":[0,-1,-1,-1],"nx":[4,7,13,4],"ny":[4,7,12,2],"nz":[2,1,0,2]},{"size":2,"px":[3,15],"py":[12,6],"pz":[0,-1],"nx":[9,1],"ny":[14,2],"nz":[0,2]},{"size":2,"px":[12,12],"py":[11,12],"pz":[0,0],"nx":[9,5],"ny":[4,4],"nz":[1,-1]},{"size":3,"px":[23,6,7],"py":[23,3,4],"pz":[0,-1,-1],"nx":[19,16,17],"ny":[17,14,15],"nz":[0,0,0]},{"size":2,"px":[9,5],"py":[2,7],"pz":[1,-1],"nx":[11,23],"ny":[10,18],"nz":[1,0]},{"size":3,"px":[0,0,0],"py":[4,9,2],"pz":[1,0,2],"nx":[2,0,0],"ny":[9,2,1],"nz":[0,-1,-1]},{"size":2,"px":[12,0],"py":[11,9],"pz":[0,-1],"nx":[1,0],"ny":[18,5],"nz":[0,2]},{"size":2,"px":[5,4],"py":[10,6],"pz":[0,1],"nx":[10,6],"ny":[10,18],"nz":[0,-1]},{"size":2,"px":[13,12],"py":[13,13],"pz":[0,-1],"nx":[5,11],"ny":[1,3],"nz":[2,1]},{"size":2,"px":[10,19],"py":[5,22],"pz":[1,-1],"nx":[4,12],"ny":[1,5],"nz":[2,0]},{"size":2,"px":[8,6],"py":[0,0],"pz":[0,0],"nx":[3,12],"ny":[0,3],"nz":[0,-1]},{"size":2,"px":[9,6],"py":[7,0],"pz":[1,-1],"nx":[12,12],"ny":[10,11],"nz":[0,0]},{"size":4,"px":[3,1,3,2],"py":[20,9,21,19],"pz":[0,1,0,0],"nx":[20,20,5,12],"ny":[10,15,2,10],"nz":[0,-1,-1,-1]},{"size":2,"px":[2,4],"py":[3,6],"pz":[2,1],"nx":[3,1],"ny":[4,6],"nz":[1,-1]},{"size":3,"px":[5,11,11],"py":[1,3,4],"pz":[2,1,1],"nx":[3,3,7],"ny":[5,5,0],"nz":[1,-1,-1]},{"size":3,"px":[8,6,7],"py":[10,5,6],"pz":[1,1,1],"nx":[23,3,7],"ny":[0,5,0],"nz":[0,-1,-1]},{"size":2,"px":[2,7],"py":[2,14],"pz":[1,-1],"nx":[7,3],"ny":[12,4],"nz":[0,1]},{"size":2,"px":[5,3],"py":[6,3],"pz":[1,2],"nx":[13,3],"ny":[12,4],"nz":[0,-1]},{"size":2,"px":[11,18],"py":[11,4],"pz":[0,-1],"nx":[23,11],"ny":[19,10],"nz":[0,1]},{"size":2,"px":[7,2],"py":[12,3],"pz":[0,-1],"nx":[8,4],"ny":[11,5],"nz":[0,1]},{"size":2,"px":[11,11],"py":[0,11],"pz":[1,-1],"nx":[3,3],"ny":[19,18],"nz":[0,0]},{"size":2,"px":[11,1],"py":[11,11],"pz":[1,-1],"nx":[13,15],"ny":[6,5],"nz":[0,0]},{"size":2,"px":[8,8],"py":[9,9],"pz":[0,-1],"nx":[5,11],"ny":[1,3],"nz":[2,1]},{"size":4,"px":[6,4,8,3],"py":[6,2,4,3],"pz":[0,2,1,2],"nx":[7,0,15,8],"ny":[8,8,16,7],"nz":[0,-1,-1,-1]},{"size":2,"px":[4,3],"py":[22,20],"pz":[0,0],"nx":[2,8],"ny":[5,4],"nz":[2,-1]},{"size":2,"px":[12,6],"py":[11,0],"pz":[0,-1],"nx":[0,0],"ny":[3,1],"nz":[1,2]},{"size":2,"px":[0,0],"py":[12,7],"pz":[0,1],"nx":[3,1],"ny":[23,9],"nz":[0,-1]},{"size":2,"px":[7,0],"py":[11,5],"pz":[1,-1],"nx":[0,0],"ny":[2,3],"nz":[2,2]},{"size":2,"px":[8,8],"py":[10,10],"pz":[0,-1],"nx":[4,3],"ny":[5,4],"nz":[2,2]},{"size":2,"px":[13,3],"py":[2,4],"pz":[0,-1],"nx":[4,3],"ny":[3,5],"nz":[2,2]},{"size":2,"px":[1,1],"py":[23,22],"pz":[0,0],"nx":[9,0],"ny":[7,3],"nz":[0,-1]},{"size":2,"px":[1,0],"py":[16,15],"pz":[0,0],"nx":[0,14],"ny":[23,12],"nz":[0,-1]},{"size":2,"px":[13,8],"py":[22,0],"pz":[0,-1],"nx":[5,3],"ny":[0,1],"nz":[1,1]},{"size":2,"px":[13,13],"py":[7,7],"pz":[0,-1],"nx":[3,2],"ny":[17,10],"nz":[0,1]},{"size":2,"px":[20,20],"py":[15,16],"pz":[0,0],"nx":[7,3],"ny":[9,17],"nz":[1,-1]},{"size":5,"px":[10,12,11,13,11],"py":[2,2,1,2,2],"pz":[0,0,0,0,0],"nx":[10,18,21,21,19],"ny":[3,1,13,11,2],"nz":[1,0,0,0,0]},{"size":2,"px":[16,3],"py":[6,1],"pz":[0,2],"nx":[15,18],"ny":[8,1],"nz":[0,-1]},{"size":2,"px":[19,3],"py":[8,1],"pz":[0,-1],"nx":[9,8],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[10,3],"py":[15,18],"pz":[0,-1],"nx":[3,3],"ny":[0,1],"nz":[2,2]},{"size":2,"px":[3,3],"py":[2,3],"pz":[2,2],"nx":[7,3],"ny":[11,1],"nz":[1,-1]},{"size":2,"px":[11,10],"py":[17,9],"pz":[0,-1],"nx":[11,10],"ny":[15,15],"nz":[0,0]},{"size":2,"px":[5,10],"py":[2,4],"pz":[1,0],"nx":[8,8],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[9,10],"py":[3,4],"pz":[0,-1],"nx":[9,10],"ny":[2,1],"nz":[0,0]},{"size":2,"px":[23,11],"py":[13,10],"pz":[0,1],"nx":[14,7],"ny":[5,14],"nz":[0,-1]},{"size":2,"px":[4,4],"py":[5,4],"pz":[2,2],"nx":[9,8],"ny":[3,3],"nz":[1,-1]},{"size":3,"px":[12,4,15],"py":[5,4,7],"pz":[0,-1,-1],"nx":[3,4,2],"ny":[7,11,5],"nz":[1,1,2]},{"size":2,"px":[11,4],"py":[15,4],"pz":[0,-1],"nx":[5,9],"ny":[7,15],"nz":[1,0]},{"size":2,"px":[9,7],"py":[0,1],"pz":[1,-1],"nx":[11,11],"ny":[8,7],"nz":[1,1]},{"size":5,"px":[1,1,1,1,1],"py":[11,12,10,9,9],"pz":[0,0,0,0,-1],"nx":[4,5,8,16,11],"ny":[4,3,8,8,6],"nz":[1,1,0,0,0]}],"alpha":[-1.059083e+00,1.059083e+00,-7.846122e-01,7.846122e-01,-4.451160e-01,4.451160e-01,-4.483277e-01,4.483277e-01,-3.905999e-01,3.905999e-01,-3.789250e-01,3.789250e-01,-3.874610e-01,3.874610e-01,-3.110541e-01,3.110541e-01,-3.565056e-01,3.565056e-01,-3.812617e-01,3.812617e-01,-3.325142e-01,3.325142e-01,-2.787282e-01,2.787282e-01,-3.238869e-01,3.238869e-01,-2.993499e-01,2.993499e-01,-2.807737e-01,2.807737e-01,-2.855285e-01,2.855285e-01,-2.277550e-01,2.277550e-01,-2.031261e-01,2.031261e-01,-2.071574e-01,2.071574e-01,-2.534142e-01,2.534142e-01,-2.266871e-01,2.266871e-01,-2.229078e-01,2.229078e-01,-2.716325e-01,2.716325e-01,-3.046938e-01,3.046938e-01,-2.271601e-01,2.271601e-01,-1.987651e-01,1.987651e-01,-1.953664e-01,1.953664e-01,-2.178737e-01,2.178737e-01,-2.285148e-01,2.285148e-01,-1.891073e-01,1.891073e-01,-2.926469e-01,2.926469e-01,-2.094783e-01,2.094783e-01,-1.478037e-01,1.478037e-01,-1.707579e-01,1.707579e-01,-1.464390e-01,1.464390e-01,-2.462321e-01,2.462321e-01,-2.319978e-01,2.319978e-01,-1.781651e-01,1.781651e-01,-1.471349e-01,1.471349e-01,-1.953006e-01,1.953006e-01,-2.145108e-01,2.145108e-01,-1.567881e-01,1.567881e-01,-2.024617e-01,2.024617e-01,-1.883198e-01,1.883198e-01,-1.996976e-01,1.996976e-01,-1.292330e-01,1.292330e-01,-2.142242e-01,2.142242e-01,-2.473748e-01,2.473748e-01,-1.880902e-01,1.880902e-01,-1.874572e-01,1.874572e-01,-1.495984e-01,1.495984e-01,-1.608525e-01,1.608525e-01,-1.698402e-01,1.698402e-01,-1.898871e-01,1.898871e-01,-1.350238e-01,1.350238e-01,-1.727032e-01,1.727032e-01,-1.593352e-01,1.593352e-01,-1.476968e-01,1.476968e-01,-1.428431e-01,1.428431e-01,-1.766261e-01,1.766261e-01,-1.453226e-01,1.453226e-01,-1.929885e-01,1.929885e-01,-1.337582e-01,1.337582e-01,-1.629078e-01,1.629078e-01,-9.973085e-02,9.973085e-02,-1.172760e-01,1.172760e-01,-1.399242e-01,1.399242e-01,-1.613189e-01,1.613189e-01,-1.145695e-01,1.145695e-01,-1.191093e-01,1.191093e-01,-1.225900e-01,1.225900e-01,-1.641114e-01,1.641114e-01,-1.419878e-01,1.419878e-01,-2.183465e-01,2.183465e-01,-1.566968e-01,1.566968e-01,-1.288216e-01,1.288216e-01,-1.422831e-01,1.422831e-01,-2.000107e-01,2.000107e-01,-1.817265e-01,1.817265e-01,-1.793796e-01,1.793796e-01,-1.428926e-01,1.428926e-01,-1.182032e-01,1.182032e-01,-1.150421e-01,1.150421e-01,-1.336584e-01,1.336584e-01,-1.656178e-01,1.656178e-01,-1.386549e-01,1.386549e-01,-1.387461e-01,1.387461e-01,-1.313023e-01,1.313023e-01,-1.360391e-01,1.360391e-01,-1.305505e-01,1.305505e-01,-1.323399e-01,1.323399e-01,-1.502891e-01,1.502891e-01,-1.488859e-01,1.488859e-01,-1.126628e-01,1.126628e-01,-1.233623e-01,1.233623e-01,-1.702106e-01,1.702106e-01,-1.629639e-01,1.629639e-01,-1.337706e-01,1.337706e-01,-1.290384e-01,1.290384e-01,-1.165519e-01,1.165519e-01,-1.412778e-01,1.412778e-01,-1.470204e-01,1.470204e-01,-2.213780e-01,2.213780e-01,-1.472619e-01,1.472619e-01,-1.357071e-01,1.357071e-01,-1.416513e-01,1.416513e-01,-1.050208e-01,1.050208e-01,-1.480033e-01,1.480033e-01,-1.899871e-01,1.899871e-01,-1.466249e-01,1.466249e-01,-1.076952e-01,1.076952e-01,-1.035096e-01,1.035096e-01,-1.566970e-01,1.566970e-01,-1.364115e-01,1.364115e-01,-1.512889e-01,1.512889e-01,-1.252851e-01,1.252851e-01,-1.206300e-01,1.206300e-01,-1.059134e-01,1.059134e-01,-1.140398e-01,1.140398e-01,-1.359912e-01,1.359912e-01,-1.231201e-01,1.231201e-01,-1.231867e-01,1.231867e-01,-9.789923e-02,9.789923e-02,-1.590213e-01,1.590213e-01,-1.002206e-01,1.002206e-01,-1.518339e-01,1.518339e-01,-1.055203e-01,1.055203e-01,-1.012579e-01,1.012579e-01,-1.094956e-01,1.094956e-01,-1.429592e-01,1.429592e-01,-1.108838e-01,1.108838e-01,-1.116475e-01,1.116475e-01,-1.735371e-01,1.735371e-01,-1.067758e-01,1.067758e-01,-1.290406e-01,1.290406e-01,-1.156822e-01,1.156822e-01,-9.668217e-02,9.668217e-02,-1.170053e-01,1.170053e-01,-1.252092e-01,1.252092e-01,-1.135158e-01,1.135158e-01,-1.105896e-01,1.105896e-01,-1.038175e-01,1.038175e-01,-1.210459e-01,1.210459e-01,-1.078878e-01,1.078878e-01,-1.050808e-01,1.050808e-01,-1.428227e-01,1.428227e-01,-1.664600e-01,1.664600e-01,-1.013508e-01,1.013508e-01,-1.206930e-01,1.206930e-01,-1.088972e-01,1.088972e-01,-1.381026e-01,1.381026e-01,-1.109115e-01,1.109115e-01,-7.921549e-02,7.921549e-02,-1.057832e-01,1.057832e-01,-9.385827e-02,9.385827e-02,-1.486035e-01,1.486035e-01,-1.247401e-01,1.247401e-01,-9.451327e-02,9.451327e-02,-1.272805e-01,1.272805e-01,-9.616206e-02,9.616206e-02,-9.051084e-02,9.051084e-02,-1.138458e-01,1.138458e-01,-1.047581e-01,1.047581e-01,-1.382394e-01,1.382394e-01,-1.122203e-01,1.122203e-01,-1.052936e-01,1.052936e-01,-1.239318e-01,1.239318e-01,-1.241439e-01,1.241439e-01,-1.259012e-01,1.259012e-01,-1.211701e-01,1.211701e-01,-1.344131e-01,1.344131e-01,-1.127778e-01,1.127778e-01,-1.609745e-01,1.609745e-01,-1.901382e-01,1.901382e-01,-1.618962e-01,1.618962e-01,-1.230398e-01,1.230398e-01,-1.319311e-01,1.319311e-01,-1.431410e-01,1.431410e-01,-1.143306e-01,1.143306e-01,-9.390938e-02,9.390938e-02,-1.154161e-01,1.154161e-01,-1.141205e-01,1.141205e-01,-1.098048e-01,1.098048e-01,-8.870072e-02,8.870072e-02,-1.122444e-01,1.122444e-01,-1.114147e-01,1.114147e-01,-1.185710e-01,1.185710e-01,-1.107775e-01,1.107775e-01,-1.259167e-01,1.259167e-01,-1.105176e-01,1.105176e-01,-1.020691e-01,1.020691e-01,-9.607863e-02,9.607863e-02,-9.573700e-02,9.573700e-02,-1.054349e-01,1.054349e-01,-1.137856e-01,1.137856e-01,-1.192043e-01,1.192043e-01,-1.113264e-01,1.113264e-01,-1.093137e-01,1.093137e-01,-1.010919e-01,1.010919e-01,-9.625901e-02,9.625901e-02,-9.338459e-02,9.338459e-02,-1.142944e-01,1.142944e-01,-1.038877e-01,1.038877e-01,-9.772862e-02,9.772862e-02,-1.375298e-01,1.375298e-01,-1.394776e-01,1.394776e-01,-9.454765e-02,9.454765e-02,-1.203246e-01,1.203246e-01,-8.684943e-02,8.684943e-02,-1.135622e-01,1.135622e-01,-1.058181e-01,1.058181e-01,-1.082152e-01,1.082152e-01,-1.411355e-01,1.411355e-01,-9.978846e-02,9.978846e-02,-1.057874e-01,1.057874e-01,-1.415366e-01,1.415366e-01,-9.981014e-02,9.981014e-02,-9.261151e-02,9.261151e-02,-1.737173e-01,1.737173e-01,-1.580335e-01,1.580335e-01,-9.594668e-02,9.594668e-02,-9.336013e-02,9.336013e-02,-1.102373e-01,1.102373e-01,-8.546557e-02,8.546557e-02,-9.945057e-02,9.945057e-02,-1.146358e-01,1.146358e-01,-1.324734e-01,1.324734e-01,-1.422296e-01,1.422296e-01,-9.937990e-02,9.937990e-02,-8.381049e-02,8.381049e-02,-1.270714e-01,1.270714e-01,-1.091738e-01,1.091738e-01,-1.314881e-01,1.314881e-01,-1.085159e-01,1.085159e-01,-9.247554e-02,9.247554e-02,-8.121645e-02,8.121645e-02,-1.059589e-01,1.059589e-01,-8.307793e-02,8.307793e-02,-1.033103e-01,1.033103e-01,-1.056706e-01,1.056706e-01,-1.032803e-01,1.032803e-01,-1.266840e-01,1.266840e-01,-9.341601e-02,9.341601e-02,-7.683570e-02,7.683570e-02,-1.030530e-01,1.030530e-01,-1.051872e-01,1.051872e-01,-9.114946e-02,9.114946e-02,-1.329341e-01,1.329341e-01,-9.270830e-02,9.270830e-02,-1.141750e-01,1.141750e-01,-9.889318e-02,9.889318e-02,-8.856485e-02,8.856485e-02,-1.054210e-01,1.054210e-01,-1.092704e-01,1.092704e-01,-8.729085e-02,8.729085e-02,-1.141057e-01,1.141057e-01,-1.530774e-01,1.530774e-01,-8.129720e-02,8.129720e-02,-1.143335e-01,1.143335e-01,-1.175777e-01,1.175777e-01,-1.371729e-01,1.371729e-01,-1.394356e-01,1.394356e-01,-1.016308e-01,1.016308e-01,-1.125547e-01,1.125547e-01,-9.672600e-02,9.672600e-02,-1.036631e-01,1.036631e-01,-8.702514e-02,8.702514e-02,-1.264807e-01,1.264807e-01,-1.465688e-01,1.465688e-01,-8.781464e-02,8.781464e-02,-8.552605e-02,8.552605e-02,-1.145072e-01,1.145072e-01,-1.378489e-01,1.378489e-01,-1.013312e-01,1.013312e-01,-1.020083e-01,1.020083e-01,-1.015816e-01,1.015816e-01,-8.407101e-02,8.407101e-02,-8.296485e-02,8.296485e-02,-8.033655e-02,8.033655e-02,-9.003615e-02,9.003615e-02,-7.504954e-02,7.504954e-02,-1.224941e-01,1.224941e-01,-9.347814e-02,9.347814e-02,-9.555575e-02,9.555575e-02,-9.810025e-02,9.810025e-02,-1.237068e-01,1.237068e-01,-1.283586e-01,1.283586e-01,-1.082763e-01,1.082763e-01,-1.018145e-01,1.018145e-01,-1.175161e-01,1.175161e-01,-1.252279e-01,1.252279e-01,-1.370559e-01,1.370559e-01,-9.941339e-02,9.941339e-02,-8.506938e-02,8.506938e-02,-1.260902e-01,1.260902e-01,-1.014152e-01,1.014152e-01,-9.728694e-02,9.728694e-02,-9.374910e-02,9.374910e-02,-9.587429e-02,9.587429e-02,-9.516036e-02,9.516036e-02,-7.375173e-02,7.375173e-02,-9.332487e-02,9.332487e-02,-9.020733e-02,9.020733e-02,-1.133381e-01,1.133381e-01,-1.542180e-01,1.542180e-01,-9.692168e-02,9.692168e-02,-7.960904e-02,7.960904e-02,-8.947089e-02,8.947089e-02,-7.830286e-02,7.830286e-02,-9.900050e-02,9.900050e-02,-1.041293e-01,1.041293e-01,-9.572501e-02,9.572501e-02,-8.230575e-02,8.230575e-02,-9.194901e-02,9.194901e-02,-1.076971e-01,1.076971e-01,-1.027782e-01,1.027782e-01,-1.028538e-01,1.028538e-01,-1.013992e-01,1.013992e-01,-9.087585e-02,9.087585e-02,-1.100706e-01,1.100706e-01,-1.094934e-01,1.094934e-01,-1.107879e-01,1.107879e-01,-1.026915e-01,1.026915e-01,-1.017572e-01,1.017572e-01,-7.984776e-02,7.984776e-02,-9.015413e-02,9.015413e-02,-1.299870e-01,1.299870e-01,-9.164982e-02,9.164982e-02,-1.062788e-01,1.062788e-01,-1.160203e-01,1.160203e-01,-8.858603e-02,8.858603e-02,-9.762964e-02,9.762964e-02,-1.070694e-01,1.070694e-01,-9.549046e-02,9.549046e-02,-1.533034e-01,1.533034e-01,-8.663316e-02,8.663316e-02,-9.303018e-02,9.303018e-02,-9.853582e-02,9.853582e-02,-9.733371e-02,9.733371e-02,-1.048555e-01,1.048555e-01,-9.056041e-02,9.056041e-02,-7.552283e-02,7.552283e-02,-8.780631e-02,8.780631e-02,-1.123953e-01,1.123953e-01,-1.452948e-01,1.452948e-01,-1.156423e-01,1.156423e-01,-8.701142e-02,8.701142e-02,-9.713334e-02,9.713334e-02,-9.970888e-02,9.970888e-02,-8.614129e-02,8.614129e-02,-7.459861e-02,7.459861e-02,-9.253517e-02,9.253517e-02,-9.570092e-02,9.570092e-02,-9.485535e-02,9.485535e-02,-1.148365e-01,1.148365e-01,-1.063193e-01,1.063193e-01,-9.986686e-02,9.986686e-02,-7.523412e-02,7.523412e-02,-1.005881e-01,1.005881e-01,-8.249716e-02,8.249716e-02,-1.055866e-01,1.055866e-01,-1.343050e-01,1.343050e-01,-1.371056e-01,1.371056e-01,-9.604689e-02,9.604689e-02,-1.224268e-01,1.224268e-01,-9.211478e-02,9.211478e-02,-1.108371e-01,1.108371e-01,-1.100547e-01,1.100547e-01,-8.938970e-02,8.938970e-02,-8.655951e-02,8.655951e-02,-7.085816e-02,7.085816e-02,-8.101028e-02,8.101028e-02,-8.338046e-02,8.338046e-02,-8.309588e-02,8.309588e-02,-9.090584e-02,9.090584e-02,-8.124564e-02,8.124564e-02,-9.367843e-02,9.367843e-02,-1.011747e-01,1.011747e-01,-9.885045e-02,9.885045e-02,-8.944266e-02,8.944266e-02,-8.453859e-02,8.453859e-02,-8.308847e-02,8.308847e-02,-1.367280e-01,1.367280e-01,-1.295144e-01,1.295144e-01,-1.063965e-01,1.063965e-01,-7.752328e-02,7.752328e-02,-9.681524e-02,9.681524e-02,-7.862345e-02,7.862345e-02,-8.767746e-02,8.767746e-02,-9.198041e-02,9.198041e-02,-9.686489e-02,9.686489e-02]},{"count":564,"threshold":-4.517456e+00,"feature":[{"size":5,"px":[15,9,8,12,11],"py":[3,6,3,0,8],"pz":[0,1,0,0,0],"nx":[6,14,9,22,23],"ny":[8,7,8,17,3],"nz":[1,0,0,0,0]},{"size":5,"px":[12,13,11,14,12],"py":[9,4,4,4,5],"pz":[0,0,0,0,0],"nx":[4,6,10,4,15],"ny":[3,8,7,10,9],"nz":[1,1,0,1,0]},{"size":5,"px":[7,5,6,8,8],"py":[2,13,2,1,1],"pz":[0,0,0,0,-1],"nx":[3,0,4,1,0],"ny":[4,3,10,3,13],"nz":[1,1,1,0,0]},{"size":5,"px":[11,2,2,11,16],"py":[9,4,2,7,11],"pz":[0,2,2,0,0],"nx":[8,4,1,14,0],"ny":[4,4,16,5,13],"nz":[1,1,-1,-1,-1]},{"size":2,"px":[14,14],"py":[18,18],"pz":[0,-1],"nx":[8,13],"ny":[10,16],"nz":[1,0]},{"size":5,"px":[15,17,16,8,18],"py":[1,2,1,0,2],"pz":[0,0,0,1,0],"nx":[21,22,22,22,22],"ny":[1,5,3,4,2],"nz":[0,0,0,0,-1]},{"size":2,"px":[15,4],"py":[23,3],"pz":[0,2],"nx":[7,3],"ny":[10,6],"nz":[1,-1]},{"size":5,"px":[3,6,4,3,11],"py":[10,11,8,3,8],"pz":[1,0,1,1,0],"nx":[3,5,6,3,0],"ny":[4,9,9,9,0],"nz":[1,-1,-1,-1,-1]},{"size":3,"px":[11,11,2],"py":[11,13,16],"pz":[0,0,-1],"nx":[10,10,9],"ny":[10,11,14],"nz":[0,0,0]},{"size":2,"px":[8,4],"py":[12,6],"pz":[0,1],"nx":[4,5],"ny":[11,11],"nz":[1,-1]},{"size":5,"px":[10,11,13,3,12],"py":[3,4,3,0,1],"pz":[0,0,0,2,0],"nx":[14,18,20,19,15],"ny":[13,1,15,2,18],"nz":[0,0,0,0,0]},{"size":5,"px":[20,14,10,12,12],"py":[12,12,4,10,11],"pz":[0,0,1,0,0],"nx":[9,2,9,9,9],"ny":[4,12,5,9,14],"nz":[1,-1,-1,-1,-1]},{"size":5,"px":[3,3,3,4,2],"py":[15,16,14,21,12],"pz":[0,0,0,0,0],"nx":[0,0,0,0,0],"ny":[20,10,5,21,21],"nz":[0,1,2,0,-1]},{"size":2,"px":[18,8],"py":[16,7],"pz":[0,1],"nx":[14,0],"ny":[8,10],"nz":[0,-1]},{"size":4,"px":[12,4,16,1],"py":[14,3,8,3],"pz":[0,-1,-1,-1],"nx":[14,10,20,13],"ny":[13,5,16,9],"nz":[0,1,0,0]},{"size":5,"px":[3,8,2,3,3],"py":[7,2,1,2,4],"pz":[1,-1,-1,-1,-1],"nx":[1,9,2,1,1],"ny":[3,14,9,7,2],"nz":[1,0,1,1,1]},{"size":5,"px":[4,1,3,2,3],"py":[2,1,2,4,3],"pz":[0,1,0,0,0],"nx":[0,0,0,0,0],"ny":[3,1,2,0,0],"nz":[0,1,0,2,-1]},{"size":4,"px":[4,8,7,9],"py":[6,11,11,10],"pz":[1,0,0,0],"nx":[3,10,2,20],"ny":[4,4,4,8],"nz":[1,-1,-1,-1]},{"size":2,"px":[1,8],"py":[3,11],"pz":[2,-1],"nx":[8,2],"ny":[15,5],"nz":[0,2]},{"size":2,"px":[17,0],"py":[13,10],"pz":[0,-1],"nx":[14,14],"ny":[11,10],"nz":[0,0]},{"size":5,"px":[22,22,22,5,22],"py":[16,18,17,2,15],"pz":[0,0,0,2,0],"nx":[8,4,15,6,6],"ny":[4,2,7,11,11],"nz":[1,2,0,1,-1]},{"size":5,"px":[16,9,8,17,15],"py":[12,6,6,22,12],"pz":[0,1,1,0,0],"nx":[11,23,23,23,22],"ny":[11,23,22,21,23],"nz":[1,0,0,0,-1]},{"size":5,"px":[5,2,4,4,9],"py":[22,3,15,20,18],"pz":[0,2,0,0,0],"nx":[9,4,23,7,22],"ny":[8,4,22,19,23],"nz":[0,-1,-1,-1,-1]},{"size":5,"px":[8,6,9,7,3],"py":[3,3,3,3,1],"pz":[0,0,0,0,1],"nx":[5,5,4,4,4],"ny":[0,1,1,2,0],"nz":[0,0,0,0,-1]},{"size":2,"px":[2,3],"py":[3,3],"pz":[2,2],"nx":[3,6],"ny":[4,6],"nz":[1,-1]},{"size":5,"px":[1,1,0,1,0],"py":[17,15,6,16,10],"pz":[0,0,1,0,0],"nx":[4,4,7,4,8],"ny":[2,5,9,4,4],"nz":[2,2,1,2,-1]},{"size":5,"px":[12,12,12,13,13],"py":[10,9,11,13,13],"pz":[0,0,0,0,-1],"nx":[4,3,3,5,3],"ny":[21,18,17,23,16],"nz":[0,0,0,0,0]},{"size":4,"px":[5,6,5,9],"py":[13,7,9,23],"pz":[0,0,1,0],"nx":[6,15,7,5],"ny":[9,20,7,23],"nz":[0,-1,-1,-1]},{"size":2,"px":[6,3],"py":[4,2],"pz":[1,2],"nx":[8,23],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[9,7],"py":[18,0],"pz":[0,0],"nx":[5,7],"ny":[8,10],"nz":[1,1]},{"size":2,"px":[4,6],"py":[11,16],"pz":[1,0],"nx":[10,9],"ny":[16,7],"nz":[0,-1]},{"size":4,"px":[11,11,11,11],"py":[11,10,12,13],"pz":[0,0,0,0],"nx":[13,13,13,9],"ny":[11,9,10,4],"nz":[0,0,0,1]},{"size":4,"px":[12,6,7,6],"py":[7,11,8,4],"pz":[0,1,1,1],"nx":[10,0,19,7],"ny":[21,3,12,11],"nz":[0,-1,-1,-1]},{"size":2,"px":[4,4],"py":[3,4],"pz":[2,2],"nx":[9,1],"ny":[4,7],"nz":[1,-1]},{"size":2,"px":[19,19],"py":[21,20],"pz":[0,0],"nx":[7,7],"ny":[3,13],"nz":[1,-1]},{"size":5,"px":[12,9,13,11,5],"py":[0,2,2,0,0],"pz":[0,0,0,0,1],"nx":[6,4,5,5,5],"ny":[1,3,5,2,6],"nz":[0,0,1,0,1]},{"size":5,"px":[4,3,2,5,7],"py":[11,3,3,7,17],"pz":[1,2,2,0,0],"nx":[23,5,11,5,5],"ny":[0,4,10,2,6],"nz":[0,-1,-1,-1,-1]},{"size":2,"px":[20,17],"py":[12,3],"pz":[0,-1],"nx":[20,19],"ny":[21,23],"nz":[0,0]},{"size":2,"px":[2,1],"py":[12,8],"pz":[0,0],"nx":[2,8],"ny":[2,16],"nz":[2,-1]},{"size":2,"px":[16,5],"py":[4,5],"pz":[0,-1],"nx":[7,8],"ny":[9,1],"nz":[1,1]},{"size":2,"px":[2,2],"py":[0,1],"pz":[1,1],"nx":[1,8],"ny":[5,1],"nz":[0,-1]},{"size":2,"px":[1,1],"py":[12,10],"pz":[0,1],"nx":[2,20],"ny":[23,9],"nz":[0,-1]},{"size":4,"px":[11,0,0,2],"py":[14,3,9,22],"pz":[0,-1,-1,-1],"nx":[13,14,7,3],"ny":[6,7,11,1],"nz":[0,0,0,2]},{"size":2,"px":[14,0],"py":[2,3],"pz":[0,-1],"nx":[4,4],"ny":[4,3],"nz":[2,2]},{"size":2,"px":[23,11],"py":[18,11],"pz":[0,1],"nx":[3,2],"ny":[1,21],"nz":[1,-1]},{"size":2,"px":[9,9],"py":[17,14],"pz":[0,-1],"nx":[4,5],"ny":[10,8],"nz":[1,1]},{"size":2,"px":[9,18],"py":[7,14],"pz":[1,0],"nx":[18,9],"ny":[17,8],"nz":[0,-1]},{"size":2,"px":[2,8],"py":[4,22],"pz":[2,0],"nx":[4,3],"ny":[10,1],"nz":[1,-1]},{"size":2,"px":[5,22],"py":[4,9],"pz":[2,-1],"nx":[11,23],"ny":[8,14],"nz":[1,0]},{"size":3,"px":[23,5,5],"py":[8,2,1],"pz":[0,2,2],"nx":[10,10,2],"ny":[4,4,2],"nz":[1,-1,-1]},{"size":2,"px":[11,11],"py":[14,23],"pz":[0,-1],"nx":[3,11],"ny":[4,13],"nz":[1,0]},{"size":2,"px":[3,2],"py":[7,0],"pz":[1,-1],"nx":[4,3],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[12,1],"py":[19,13],"pz":[0,-1],"nx":[9,12],"ny":[10,18],"nz":[1,0]},{"size":2,"px":[10,10],"py":[11,10],"pz":[1,1],"nx":[4,1],"ny":[5,11],"nz":[2,-1]},{"size":5,"px":[9,12,4,8,8],"py":[3,5,2,9,8],"pz":[1,0,2,1,1],"nx":[23,23,23,23,23],"ny":[3,4,6,5,5],"nz":[0,0,0,0,-1]},{"size":2,"px":[2,4],"py":[3,6],"pz":[2,1],"nx":[3,9],"ny":[4,6],"nz":[1,-1]},{"size":5,"px":[13,13,13,7,7],"py":[11,10,9,6,6],"pz":[0,0,0,1,-1],"nx":[5,5,15,5,2],"ny":[5,15,9,9,1],"nz":[0,0,0,1,2]},{"size":2,"px":[19,7],"py":[21,7],"pz":[0,1],"nx":[14,10],"ny":[15,4],"nz":[0,-1]},{"size":2,"px":[5,5],"py":[3,4],"pz":[2,2],"nx":[21,0],"ny":[23,5],"nz":[0,-1]},{"size":2,"px":[2,0],"py":[0,0],"pz":[1,-1],"nx":[3,2],"ny":[1,2],"nz":[0,0]},{"size":2,"px":[9,0],"py":[4,0],"pz":[0,-1],"nx":[5,12],"ny":[0,1],"nz":[1,0]},{"size":5,"px":[14,16,12,15,13],"py":[0,1,0,0,0],"pz":[0,0,0,0,0],"nx":[4,8,8,4,9],"ny":[2,3,4,1,3],"nz":[2,1,1,2,-1]},{"size":3,"px":[4,17,2],"py":[11,14,1],"pz":[1,-1,-1],"nx":[9,8,17],"ny":[1,4,0],"nz":[1,1,0]},{"size":2,"px":[18,9],"py":[17,7],"pz":[0,1],"nx":[8,4],"ny":[4,7],"nz":[1,-1]},{"size":2,"px":[0,0],"py":[3,0],"pz":[1,2],"nx":[10,11],"ny":[6,5],"nz":[1,-1]},{"size":5,"px":[21,21,21,21,20],"py":[17,16,19,18,21],"pz":[0,0,0,0,0],"nx":[0,0,0,0,0],"ny":[4,9,11,6,6],"nz":[1,0,0,1,-1]},{"size":2,"px":[12,0],"py":[7,1],"pz":[0,-1],"nx":[8,11],"ny":[4,17],"nz":[1,0]},{"size":4,"px":[13,0,0,0],"py":[15,0,0,0],"pz":[0,-1,-1,-1],"nx":[3,7,4,6],"ny":[2,7,5,9],"nz":[2,1,2,1]},{"size":2,"px":[2,9],"py":[3,12],"pz":[2,0],"nx":[2,0],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[10,3],"py":[6,1],"pz":[1,-1],"nx":[20,21],"ny":[19,14],"nz":[0,0]},{"size":5,"px":[5,22,22,11,22],"py":[1,4,3,3,2],"pz":[2,0,0,1,-1],"nx":[7,13,14,8,15],"ny":[3,6,6,3,7],"nz":[1,0,0,1,0]},{"size":2,"px":[12,19],"py":[5,15],"pz":[0,-1],"nx":[16,4],"ny":[8,2],"nz":[0,2]},{"size":2,"px":[1,0],"py":[11,9],"pz":[1,1],"nx":[5,0],"ny":[3,3],"nz":[1,-1]},{"size":4,"px":[8,3,4,2],"py":[6,7,5,3],"pz":[1,-1,-1,-1],"nx":[13,14,11,11],"ny":[11,13,3,5],"nz":[0,0,1,1]},{"size":2,"px":[11,11],"py":[5,6],"pz":[0,0],"nx":[8,4],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[5,9],"py":[6,17],"pz":[1,0],"nx":[9,4],"ny":[15,11],"nz":[0,-1]},{"size":3,"px":[6,3,6],"py":[6,3,5],"pz":[1,2,1],"nx":[11,10,4],"ny":[8,11,5],"nz":[0,0,-1]},{"size":2,"px":[8,16],"py":[0,1],"pz":[1,-1],"nx":[19,17],"ny":[1,0],"nz":[0,0]},{"size":2,"px":[21,20],"py":[4,1],"pz":[0,0],"nx":[11,5],"ny":[0,0],"nz":[1,2]},{"size":2,"px":[8,4],"py":[6,3],"pz":[1,2],"nx":[8,9],"ny":[4,10],"nz":[1,-1]},{"size":2,"px":[10,1],"py":[0,0],"pz":[1,-1],"nx":[13,12],"ny":[6,5],"nz":[0,0]},{"size":2,"px":[5,4],"py":[3,11],"pz":[1,-1],"nx":[3,17],"ny":[1,3],"nz":[2,0]},{"size":2,"px":[12,13],"py":[4,4],"pz":[0,0],"nx":[3,3],"ny":[1,1],"nz":[2,-1]},{"size":2,"px":[3,18],"py":[2,7],"pz":[2,0],"nx":[8,1],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[16,6],"py":[8,2],"pz":[0,1],"nx":[8,9],"ny":[4,19],"nz":[1,-1]},{"size":3,"px":[12,3,14],"py":[13,3,15],"pz":[0,-1,-1],"nx":[0,1,0],"ny":[16,18,15],"nz":[0,0,0]},{"size":2,"px":[3,1],"py":[3,4],"pz":[2,-1],"nx":[7,14],"ny":[10,14],"nz":[1,0]},{"size":2,"px":[9,16],"py":[6,10],"pz":[1,0],"nx":[8,8],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[7,11],"py":[4,4],"pz":[0,0],"nx":[7,23],"ny":[3,11],"nz":[0,-1]},{"size":5,"px":[2,4,3,4,4],"py":[1,2,0,1,1],"pz":[1,0,1,0,-1],"nx":[11,9,4,9,5],"ny":[6,5,3,6,3],"nz":[0,0,1,0,1]},{"size":2,"px":[6,0],"py":[14,1],"pz":[0,-1],"nx":[2,5],"ny":[2,9],"nz":[2,1]},{"size":2,"px":[6,7],"py":[7,12],"pz":[0,0],"nx":[3,22],"ny":[3,16],"nz":[1,-1]},{"size":2,"px":[10,4],"py":[1,1],"pz":[0,1],"nx":[2,6],"ny":[2,21],"nz":[2,-1]},{"size":2,"px":[13,1],"py":[11,6],"pz":[0,-1],"nx":[12,6],"ny":[5,2],"nz":[0,1]},{"size":5,"px":[10,5,11,10,10],"py":[4,3,4,6,5],"pz":[0,1,0,0,0],"nx":[4,7,13,8,4],"ny":[2,8,9,4,4],"nz":[2,1,0,1,-1]},{"size":4,"px":[7,8,7,8],"py":[11,3,4,7],"pz":[1,1,1,1],"nx":[0,7,3,8],"ny":[0,12,2,4],"nz":[0,-1,-1,-1]},{"size":2,"px":[0,0],"py":[4,7],"pz":[2,1],"nx":[10,1],"ny":[7,0],"nz":[0,-1]},{"size":2,"px":[11,5],"py":[19,5],"pz":[0,-1],"nx":[11,5],"ny":[17,10],"nz":[0,1]},{"size":2,"px":[11,12],"py":[4,4],"pz":[0,0],"nx":[7,5],"ny":[8,3],"nz":[0,-1]},{"size":3,"px":[4,8,4],"py":[2,9,4],"pz":[2,1,2],"nx":[3,19,3],"ny":[1,16,5],"nz":[1,-1,-1]},{"size":2,"px":[3,7],"py":[0,1],"pz":[1,0],"nx":[2,3],"ny":[15,2],"nz":[0,-1]},{"size":2,"px":[0,4],"py":[2,0],"pz":[2,-1],"nx":[9,16],"ny":[5,11],"nz":[1,0]},{"size":2,"px":[14,15],"py":[23,16],"pz":[0,0],"nx":[13,3],"ny":[15,1],"nz":[0,-1]},{"size":2,"px":[4,3],"py":[0,1],"pz":[1,-1],"nx":[3,7],"ny":[0,0],"nz":[1,0]},{"size":2,"px":[7,6],"py":[12,12],"pz":[0,0],"nx":[4,8],"ny":[5,4],"nz":[1,-1]},{"size":5,"px":[4,1,2,4,5],"py":[1,0,0,0,6],"pz":[0,2,1,0,1],"nx":[4,8,7,8,6],"ny":[4,10,11,4,4],"nz":[1,0,0,1,1]},{"size":2,"px":[12,12],"py":[15,8],"pz":[0,-1],"nx":[7,15],"ny":[16,14],"nz":[0,0]},{"size":2,"px":[4,8],"py":[3,6],"pz":[2,1],"nx":[4,6],"ny":[2,8],"nz":[2,-1]},{"size":2,"px":[14,4],"py":[19,23],"pz":[0,-1],"nx":[7,14],"ny":[11,18],"nz":[1,0]},{"size":2,"px":[4,2],"py":[7,4],"pz":[1,2],"nx":[2,22],"ny":[5,19],"nz":[2,-1]},{"size":2,"px":[8,15],"py":[7,17],"pz":[1,0],"nx":[14,4],"ny":[15,5],"nz":[0,2]},{"size":2,"px":[10,11],"py":[9,8],"pz":[1,-1],"nx":[23,5],"ny":[19,4],"nz":[0,2]},{"size":2,"px":[11,1],"py":[7,9],"pz":[0,-1],"nx":[4,4],"ny":[4,5],"nz":[1,1]},{"size":2,"px":[14,7],"py":[6,9],"pz":[0,0],"nx":[4,11],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[5,4],"py":[0,5],"pz":[0,-1],"nx":[2,2],"ny":[0,4],"nz":[1,0]},{"size":2,"px":[10,22],"py":[5,20],"pz":[0,-1],"nx":[3,4],"ny":[1,2],"nz":[2,2]},{"size":3,"px":[23,11,11],"py":[17,9,8],"pz":[0,1,1],"nx":[13,8,8],"ny":[5,3,3],"nz":[0,1,-1]},{"size":2,"px":[18,9],"py":[0,21],"pz":[0,-1],"nx":[10,10],"ny":[2,1],"nz":[1,1]},{"size":5,"px":[11,10,11,11,11],"py":[11,13,10,12,12],"pz":[0,0,0,0,-1],"nx":[11,13,12,3,8],"ny":[5,5,5,1,10],"nz":[0,0,0,2,0]},{"size":2,"px":[7,8],"py":[11,11],"pz":[0,0],"nx":[9,16],"ny":[9,19],"nz":[0,-1]},{"size":2,"px":[9,18],"py":[23,7],"pz":[0,-1],"nx":[21,21],"ny":[7,13],"nz":[0,0]},{"size":2,"px":[8,8],"py":[7,8],"pz":[1,1],"nx":[5,21],"ny":[9,13],"nz":[1,-1]},{"size":2,"px":[17,8],"py":[22,8],"pz":[0,-1],"nx":[4,8],"ny":[5,10],"nz":[2,1]},{"size":5,"px":[2,5,8,8,4],"py":[3,9,13,23,7],"pz":[2,1,0,0,1],"nx":[9,17,18,19,20],"ny":[0,0,0,2,3],"nz":[1,0,0,0,0]},{"size":3,"px":[16,15,2],"py":[3,3,13],"pz":[0,0,-1],"nx":[4,8,4],"ny":[3,6,2],"nz":[2,1,2]},{"size":2,"px":[4,7],"py":[3,7],"pz":[2,1],"nx":[15,1],"ny":[15,0],"nz":[0,-1]},{"size":2,"px":[3,6],"py":[2,3],"pz":[2,1],"nx":[3,18],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[2,4],"py":[2,4],"pz":[2,1],"nx":[3,0],"ny":[5,0],"nz":[1,-1]},{"size":2,"px":[10,0],"py":[10,0],"pz":[0,-1],"nx":[9,4],"ny":[2,0],"nz":[1,2]},{"size":2,"px":[2,0],"py":[8,3],"pz":[1,-1],"nx":[4,8],"ny":[4,14],"nz":[1,0]},{"size":2,"px":[13,18],"py":[14,14],"pz":[0,-1],"nx":[1,1],"ny":[15,13],"nz":[0,0]},{"size":3,"px":[3,2,2],"py":[17,10,15],"pz":[0,1,0],"nx":[13,2,7],"ny":[19,11,0],"nz":[0,-1,-1]},{"size":2,"px":[4,17],"py":[0,2],"pz":[2,0],"nx":[8,5],"ny":[11,3],"nz":[1,-1]},{"size":2,"px":[15,21],"py":[5,4],"pz":[0,-1],"nx":[15,10],"ny":[3,0],"nz":[0,1]},{"size":2,"px":[7,3],"py":[13,8],"pz":[0,-1],"nx":[8,4],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[7,22],"py":[3,4],"pz":[1,-1],"nx":[4,2],"ny":[2,3],"nz":[1,1]},{"size":4,"px":[6,2,6,5],"py":[21,10,22,20],"pz":[0,1,0,0],"nx":[2,3,4,4],"ny":[11,21,23,23],"nz":[1,0,0,-1]},{"size":2,"px":[7,2],"py":[6,8],"pz":[1,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":4,"px":[11,11,5,11],"py":[6,5,2,4],"pz":[1,1,2,1],"nx":[13,7,8,3],"ny":[7,3,5,2],"nz":[0,1,-1,-1]},{"size":2,"px":[3,3],"py":[7,8],"pz":[1,0],"nx":[3,11],"ny":[4,2],"nz":[1,-1]},{"size":3,"px":[16,1,5],"py":[3,3,11],"pz":[0,-1,-1],"nx":[16,4,8],"ny":[2,0,1],"nz":[0,2,1]},{"size":2,"px":[10,0],"py":[8,1],"pz":[0,-1],"nx":[19,18],"ny":[20,23],"nz":[0,0]},{"size":2,"px":[17,4],"py":[10,4],"pz":[0,-1],"nx":[4,14],"ny":[2,9],"nz":[2,0]},{"size":5,"px":[11,12,9,10,11],"py":[2,3,2,2,3],"pz":[0,0,0,0,0],"nx":[6,4,2,2,2],"ny":[18,9,3,2,2],"nz":[0,1,2,2,-1]},{"size":2,"px":[0,1],"py":[6,16],"pz":[1,0],"nx":[8,16],"ny":[5,16],"nz":[0,-1]},{"size":2,"px":[3,3],"py":[2,3],"pz":[2,2],"nx":[8,17],"ny":[4,9],"nz":[1,-1]},{"size":3,"px":[2,5,2],"py":[5,6,4],"pz":[1,-1,-1],"nx":[0,0,0],"ny":[3,5,6],"nz":[2,1,1]},{"size":5,"px":[0,0,0,0,0],"py":[6,15,16,13,14],"pz":[1,0,0,0,0],"nx":[4,5,8,6,8],"ny":[4,16,8,15,4],"nz":[1,0,0,0,-1]},{"size":2,"px":[4,2],"py":[6,3],"pz":[1,2],"nx":[3,5],"ny":[4,16],"nz":[1,-1]},{"size":5,"px":[21,19,21,21,21],"py":[17,23,18,19,20],"pz":[0,0,0,0,0],"nx":[5,2,3,6,6],"ny":[12,5,5,12,12],"nz":[0,1,1,0,-1]},{"size":2,"px":[5,2],"py":[11,1],"pz":[1,-1],"nx":[5,11],"ny":[3,5],"nz":[2,1]},{"size":2,"px":[10,5],"py":[5,3],"pz":[0,1],"nx":[6,15],"ny":[11,5],"nz":[1,-1]},{"size":2,"px":[6,2],"py":[4,2],"pz":[1,-1],"nx":[4,3],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[10,6],"py":[20,6],"pz":[0,-1],"nx":[5,10],"ny":[11,17],"nz":[1,0]},{"size":4,"px":[8,4,7,11],"py":[7,4,5,8],"pz":[1,2,1,0],"nx":[13,10,5,21],"ny":[9,3,5,4],"nz":[0,-1,-1,-1]},{"size":2,"px":[7,13],"py":[10,7],"pz":[0,0],"nx":[10,8],"ny":[9,18],"nz":[0,-1]},{"size":2,"px":[3,3],"py":[1,0],"pz":[2,2],"nx":[8,5],"ny":[4,2],"nz":[1,-1]},{"size":5,"px":[5,2,5,8,4],"py":[8,4,14,23,7],"pz":[1,2,0,0,1],"nx":[18,4,16,17,17],"ny":[1,0,0,1,1],"nz":[0,2,0,0,-1]},{"size":2,"px":[6,2],"py":[2,4],"pz":[1,-1],"nx":[8,8],"ny":[4,3],"nz":[1,1]},{"size":2,"px":[6,1],"py":[8,15],"pz":[0,-1],"nx":[8,3],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[10,1],"py":[7,2],"pz":[1,-1],"nx":[6,6],"ny":[9,4],"nz":[1,1]},{"size":2,"px":[4,1],"py":[6,2],"pz":[1,-1],"nx":[1,10],"ny":[16,12],"nz":[0,0]},{"size":2,"px":[8,4],"py":[7,2],"pz":[1,-1],"nx":[8,9],"ny":[8,10],"nz":[1,1]},{"size":5,"px":[4,8,7,6,6],"py":[0,0,0,1,1],"pz":[1,0,0,0,-1],"nx":[11,5,8,4,10],"ny":[5,3,4,4,5],"nz":[0,1,1,1,0]},{"size":2,"px":[5,6],"py":[8,5],"pz":[0,0],"nx":[6,6],"ny":[8,3],"nz":[0,-1]},{"size":2,"px":[18,5],"py":[19,5],"pz":[0,-1],"nx":[4,21],"ny":[5,19],"nz":[2,0]},{"size":2,"px":[9,5],"py":[13,6],"pz":[0,1],"nx":[2,2],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[10,4],"py":[17,6],"pz":[0,1],"nx":[10,2],"ny":[15,4],"nz":[0,-1]},{"size":3,"px":[13,13,19],"py":[11,12,8],"pz":[0,0,-1],"nx":[12,3,8],"ny":[4,1,4],"nz":[0,2,1]},{"size":3,"px":[11,7,4],"py":[5,2,1],"pz":[0,-1,-1],"nx":[9,2,4],"ny":[11,3,6],"nz":[0,2,1]},{"size":2,"px":[10,7],"py":[15,2],"pz":[0,-1],"nx":[4,4],"ny":[0,1],"nz":[2,2]},{"size":5,"px":[8,9,16,18,18],"py":[0,1,1,1,1],"pz":[1,1,0,0,-1],"nx":[5,5,6,4,4],"ny":[21,20,23,17,18],"nz":[0,0,0,0,0]},{"size":2,"px":[6,7],"py":[1,1],"pz":[1,1],"nx":[20,19],"ny":[2,1],"nz":[0,0]},{"size":2,"px":[2,2],"py":[10,11],"pz":[1,1],"nx":[3,3],"ny":[10,10],"nz":[1,-1]},{"size":2,"px":[9,5],"py":[23,1],"pz":[0,-1],"nx":[4,3],"ny":[10,4],"nz":[1,1]},{"size":2,"px":[1,10],"py":[4,7],"pz":[2,-1],"nx":[4,3],"ny":[23,21],"nz":[0,0]},{"size":2,"px":[10,21],"py":[11,18],"pz":[1,0],"nx":[10,4],"ny":[18,1],"nz":[0,-1]},{"size":2,"px":[11,23],"py":[11,15],"pz":[0,-1],"nx":[11,11],"ny":[7,9],"nz":[1,1]},{"size":2,"px":[10,1],"py":[7,7],"pz":[1,-1],"nx":[15,4],"ny":[14,4],"nz":[0,2]},{"size":2,"px":[1,2],"py":[9,20],"pz":[1,0],"nx":[21,3],"ny":[12,20],"nz":[0,-1]},{"size":2,"px":[7,4],"py":[0,0],"pz":[1,2],"nx":[4,2],"ny":[0,19],"nz":[0,-1]},{"size":2,"px":[2,4],"py":[3,6],"pz":[2,1],"nx":[3,0],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[5,1],"py":[5,0],"pz":[1,-1],"nx":[12,10],"ny":[11,4],"nz":[0,1]},{"size":2,"px":[11,12],"py":[11,14],"pz":[1,-1],"nx":[18,16],"ny":[21,15],"nz":[0,0]},{"size":2,"px":[3,18],"py":[1,5],"pz":[2,-1],"nx":[4,8],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[9,10],"py":[18,7],"pz":[0,-1],"nx":[3,6],"ny":[0,0],"nz":[2,1]},{"size":2,"px":[19,2],"py":[1,4],"pz":[0,-1],"nx":[22,22],"ny":[13,15],"nz":[0,0]},{"size":3,"px":[13,15,20],"py":[14,21,10],"pz":[0,-1,-1],"nx":[15,7,7],"ny":[13,6,8],"nz":[0,1,1]},{"size":2,"px":[9,9],"py":[6,7],"pz":[1,1],"nx":[8,7],"ny":[4,8],"nz":[1,-1]},{"size":2,"px":[0,0],"py":[5,3],"pz":[1,2],"nx":[5,10],"ny":[2,9],"nz":[1,-1]},{"size":2,"px":[14,11],"py":[7,16],"pz":[0,-1],"nx":[1,0],"ny":[17,4],"nz":[0,2]},{"size":2,"px":[14,18],"py":[17,18],"pz":[0,-1],"nx":[8,14],"ny":[10,16],"nz":[1,0]},{"size":2,"px":[6,11],"py":[13,11],"pz":[0,-1],"nx":[8,9],"ny":[12,9],"nz":[0,0]},{"size":2,"px":[8,9],"py":[2,2],"pz":[0,0],"nx":[3,3],"ny":[2,2],"nz":[2,-1]},{"size":3,"px":[21,21,21],"py":[14,16,15],"pz":[0,0,0],"nx":[14,12,0],"ny":[5,12,6],"nz":[0,-1,-1]},{"size":2,"px":[4,21],"py":[6,15],"pz":[1,-1],"nx":[5,1],"ny":[6,5],"nz":[1,1]},{"size":2,"px":[6,3],"py":[2,1],"pz":[1,2],"nx":[8,0],"ny":[4,20],"nz":[1,-1]},{"size":2,"px":[13,2],"py":[9,1],"pz":[0,-1],"nx":[3,5],"ny":[1,2],"nz":[2,1]},{"size":2,"px":[16,1],"py":[5,4],"pz":[0,-1],"nx":[17,8],"ny":[3,2],"nz":[0,1]},{"size":2,"px":[9,2],"py":[7,1],"pz":[1,-1],"nx":[20,20],"ny":[17,16],"nz":[0,0]},{"size":2,"px":[5,7],"py":[3,6],"pz":[2,-1],"nx":[9,9],"ny":[6,5],"nz":[1,1]},{"size":2,"px":[11,17],"py":[4,1],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[15,2],"py":[11,0],"pz":[0,-1],"nx":[5,14],"ny":[1,12],"nz":[2,0]},{"size":2,"px":[22,19],"py":[3,0],"pz":[0,-1],"nx":[9,4],"ny":[6,4],"nz":[1,1]},{"size":2,"px":[1,22],"py":[3,21],"pz":[0,-1],"nx":[0,0],"ny":[1,0],"nz":[2,2]},{"size":2,"px":[11,11],"py":[11,12],"pz":[0,0],"nx":[1,2],"ny":[1,4],"nz":[2,-1]},{"size":2,"px":[18,3],"py":[8,1],"pz":[0,2],"nx":[13,1],"ny":[8,5],"nz":[0,-1]},{"size":2,"px":[13,6],"py":[21,3],"pz":[0,-1],"nx":[11,11],"ny":[6,5],"nz":[1,1]},{"size":2,"px":[15,14],"py":[4,4],"pz":[0,0],"nx":[17,1],"ny":[12,5],"nz":[0,-1]},{"size":2,"px":[11,3],"py":[12,1],"pz":[0,-1],"nx":[1,2],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[3,2],"py":[7,3],"pz":[0,1],"nx":[16,2],"ny":[3,5],"nz":[0,-1]},{"size":2,"px":[10,5],"py":[7,20],"pz":[1,-1],"nx":[9,8],"ny":[4,6],"nz":[1,1]},{"size":2,"px":[19,2],"py":[10,2],"pz":[0,-1],"nx":[9,4],"ny":[3,1],"nz":[1,2]},{"size":2,"px":[14,9],"py":[0,23],"pz":[0,-1],"nx":[4,4],"ny":[3,2],"nz":[2,2]},{"size":2,"px":[6,9],"py":[4,10],"pz":[1,0],"nx":[10,9],"ny":[9,0],"nz":[0,-1]},{"size":4,"px":[6,9,10,8],"py":[20,23,18,23],"pz":[0,0,0,0],"nx":[9,22,1,2],"ny":[21,14,2,5],"nz":[0,-1,-1,-1]},{"size":2,"px":[17,18],"py":[13,6],"pz":[0,-1],"nx":[6,7],"ny":[9,11],"nz":[1,1]},{"size":5,"px":[18,19,20,19,20],"py":[15,19,16,20,17],"pz":[0,0,0,0,0],"nx":[11,22,23,23,23],"ny":[10,22,20,19,19],"nz":[1,0,0,0,-1]},{"size":2,"px":[10,10],"py":[1,0],"pz":[1,1],"nx":[21,11],"ny":[0,4],"nz":[0,-1]},{"size":2,"px":[11,0],"py":[9,3],"pz":[0,-1],"nx":[9,4],"ny":[2,1],"nz":[1,2]},{"size":2,"px":[14,23],"py":[2,18],"pz":[0,-1],"nx":[15,18],"ny":[1,2],"nz":[0,0]},{"size":2,"px":[9,3],"py":[0,0],"pz":[1,-1],"nx":[3,12],"ny":[1,5],"nz":[2,0]},{"size":2,"px":[8,8],"py":[7,8],"pz":[1,1],"nx":[8,8],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[1,0],"py":[1,3],"pz":[2,-1],"nx":[7,19],"ny":[9,15],"nz":[1,0]},{"size":3,"px":[16,6,4],"py":[21,5,4],"pz":[0,-1,-1],"nx":[4,19,8],"ny":[5,21,11],"nz":[2,0,1]},{"size":2,"px":[5,5],"py":[6,6],"pz":[1,-1],"nx":[10,10],"ny":[10,12],"nz":[0,0]},{"size":2,"px":[6,11],"py":[2,5],"pz":[1,0],"nx":[3,4],"ny":[4,7],"nz":[1,-1]},{"size":3,"px":[8,6,2],"py":[4,10,2],"pz":[1,1,2],"nx":[2,18,5],"ny":[0,11,5],"nz":[0,-1,-1]},{"size":2,"px":[11,7],"py":[9,7],"pz":[0,-1],"nx":[12,3],"ny":[9,5],"nz":[0,1]},{"size":2,"px":[14,13],"py":[20,20],"pz":[0,0],"nx":[13,3],"ny":[21,5],"nz":[0,-1]},{"size":2,"px":[13,7],"py":[5,3],"pz":[0,-1],"nx":[3,4],"ny":[1,4],"nz":[2,1]},{"size":2,"px":[6,2],"py":[21,5],"pz":[0,-1],"nx":[2,3],"ny":[5,10],"nz":[2,1]},{"size":2,"px":[23,5],"py":[6,0],"pz":[0,2],"nx":[21,4],"ny":[6,1],"nz":[0,-1]},{"size":2,"px":[9,9],"py":[7,6],"pz":[1,1],"nx":[8,2],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[22,11],"py":[20,9],"pz":[0,1],"nx":[8,8],"ny":[10,10],"nz":[1,-1]},{"size":2,"px":[8,16],"py":[21,12],"pz":[0,-1],"nx":[2,7],"ny":[5,23],"nz":[2,0]},{"size":5,"px":[0,1,1,1,1],"py":[3,1,9,4,7],"pz":[2,2,1,1,1],"nx":[11,22,22,23,23],"ny":[10,21,22,19,20],"nz":[1,0,0,0,-1]},{"size":2,"px":[17,5],"py":[12,4],"pz":[0,-1],"nx":[8,8],"ny":[4,5],"nz":[1,1]},{"size":2,"px":[16,4],"py":[7,10],"pz":[0,-1],"nx":[9,15],"ny":[4,6],"nz":[1,0]},{"size":2,"px":[3,6],"py":[3,5],"pz":[2,1],"nx":[11,12],"ny":[11,23],"nz":[0,-1]},{"size":2,"px":[5,2],"py":[14,7],"pz":[0,1],"nx":[4,17],"ny":[18,16],"nz":[0,-1]},{"size":3,"px":[10,1,1],"py":[12,5,4],"pz":[0,-1,-1],"nx":[7,11,5],"ny":[1,2,1],"nz":[1,0,1]},{"size":2,"px":[7,6],"py":[3,9],"pz":[0,-1],"nx":[2,2],"ny":[2,3],"nz":[2,2]},{"size":2,"px":[13,6],"py":[22,9],"pz":[0,-1],"nx":[8,4],"ny":[4,3],"nz":[1,2]},{"size":5,"px":[12,9,10,11,11],"py":[0,0,0,0,0],"pz":[0,0,0,0,-1],"nx":[16,5,10,4,8],"ny":[10,3,6,4,4],"nz":[0,1,0,1,1]},{"size":2,"px":[18,19],"py":[23,20],"pz":[0,0],"nx":[8,5],"ny":[11,3],"nz":[1,-1]},{"size":2,"px":[8,3],"py":[7,2],"pz":[1,2],"nx":[8,4],"ny":[4,3],"nz":[1,-1]},{"size":5,"px":[8,14,8,7,4],"py":[6,12,8,6,3],"pz":[1,0,1,1,2],"nx":[2,6,6,7,7],"ny":[0,1,2,0,0],"nz":[2,0,0,0,-1]},{"size":3,"px":[1,2,3],"py":[15,18,21],"pz":[0,0,0],"nx":[19,5,18],"ny":[23,5,8],"nz":[0,-1,-1]},{"size":2,"px":[6,2],"py":[6,1],"pz":[1,-1],"nx":[0,0],"ny":[12,4],"nz":[0,1]},{"size":2,"px":[3,5],"py":[5,11],"pz":[2,1],"nx":[14,5],"ny":[19,5],"nz":[0,-1]},{"size":2,"px":[10,4],"py":[4,4],"pz":[1,-1],"nx":[11,5],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[18,4],"py":[6,4],"pz":[0,-1],"nx":[4,8],"ny":[5,4],"nz":[1,1]},{"size":2,"px":[6,12],"py":[2,4],"pz":[1,0],"nx":[8,8],"ny":[3,4],"nz":[1,-1]},{"size":2,"px":[1,0],"py":[1,1],"pz":[1,2],"nx":[7,2],"ny":[4,7],"nz":[0,-1]},{"size":2,"px":[8,0],"py":[20,0],"pz":[0,-1],"nx":[4,5],"ny":[10,11],"nz":[1,1]},{"size":2,"px":[6,14],"py":[5,2],"pz":[1,-1],"nx":[0,0],"ny":[0,2],"nz":[1,0]},{"size":2,"px":[5,15],"py":[4,7],"pz":[1,-1],"nx":[4,7],"ny":[1,2],"nz":[2,1]},{"size":2,"px":[7,5],"py":[2,1],"pz":[0,1],"nx":[3,1],"ny":[4,1],"nz":[1,-1]},{"size":2,"px":[8,9],"py":[4,2],"pz":[0,-1],"nx":[11,9],"ny":[1,3],"nz":[0,0]},{"size":2,"px":[6,3],"py":[2,4],"pz":[1,-1],"nx":[4,8],"ny":[4,4],"nz":[1,1]},{"size":2,"px":[3,7],"py":[3,7],"pz":[2,1],"nx":[6,8],"ny":[14,4],"nz":[0,-1]},{"size":2,"px":[3,0],"py":[21,3],"pz":[0,2],"nx":[20,8],"ny":[10,4],"nz":[0,-1]},{"size":2,"px":[6,3],"py":[5,8],"pz":[0,-1],"nx":[4,3],"ny":[4,2],"nz":[0,1]},{"size":2,"px":[3,6],"py":[7,13],"pz":[1,0],"nx":[3,2],"ny":[4,3],"nz":[1,-1]},{"size":2,"px":[16,10],"py":[9,7],"pz":[0,1],"nx":[7,9],"ny":[3,10],"nz":[1,-1]},{"size":2,"px":[13,10],"py":[6,7],"pz":[0,-1],"nx":[8,17],"ny":[4,12],"nz":[1,0]},{"size":2,"px":[5,10],"py":[4,10],"pz":[2,1],"nx":[5,4],"ny":[9,2],"nz":[1,-1]},{"size":4,"px":[15,3,5,0],"py":[12,4,2,3],"pz":[0,-1,-1,-1],"nx":[13,7,5,7],"ny":[12,6,0,7],"nz":[0,1,2,1]},{"size":4,"px":[2,3,16,17],"py":[3,4,6,6],"pz":[2,1,0,0],"nx":[16,16,8,16],"ny":[8,3,10,13],"nz":[0,-1,-1,-1]},{"size":2,"px":[16,8],"py":[1,4],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[9,14],"py":[6,2],"pz":[1,-1],"nx":[8,8],"ny":[6,4],"nz":[1,1]},{"size":2,"px":[8,4],"py":[10,4],"pz":[1,2],"nx":[10,0],"ny":[5,7],"nz":[1,-1]},{"size":2,"px":[9,10],"py":[4,4],"pz":[0,0],"nx":[9,7],"ny":[3,5],"nz":[0,-1]},{"size":5,"px":[11,10,13,6,12],"py":[2,2,2,1,2],"pz":[0,0,0,1,0],"nx":[4,18,18,13,13],"ny":[2,18,19,7,7],"nz":[2,0,0,0,-1]},{"size":4,"px":[13,13,13,2],"py":[13,12,11,3],"pz":[0,0,0,-1],"nx":[4,6,8,11],"ny":[2,2,4,4],"nz":[2,1,1,0]},{"size":2,"px":[4,7],"py":[6,13],"pz":[1,0],"nx":[8,10],"ny":[4,22],"nz":[1,-1]},{"size":2,"px":[0,7],"py":[4,17],"pz":[1,-1],"nx":[0,1],"ny":[5,21],"nz":[2,0]},{"size":2,"px":[12,13],"py":[22,22],"pz":[0,0],"nx":[2,2],"ny":[13,13],"nz":[0,-1]},{"size":3,"px":[4,4,3],"py":[22,23,19],"pz":[0,0,0],"nx":[8,12,3],"ny":[22,15,2],"nz":[0,-1,-1]},{"size":2,"px":[10,12],"py":[3,13],"pz":[0,-1],"nx":[15,2],"ny":[10,2],"nz":[0,2]},{"size":2,"px":[1,1],"py":[3,3],"pz":[2,-1],"nx":[8,4],"ny":[0,0],"nz":[1,2]},{"size":2,"px":[6,12],"py":[6,18],"pz":[1,0],"nx":[12,19],"ny":[17,16],"nz":[0,-1]},{"size":2,"px":[10,5],"py":[2,1],"pz":[0,1],"nx":[5,4],"ny":[4,17],"nz":[0,-1]},{"size":3,"px":[3,12,11],"py":[5,23,23],"pz":[2,0,0],"nx":[12,4,4],"ny":[21,17,1],"nz":[0,-1,-1]},{"size":2,"px":[12,0],"py":[21,5],"pz":[0,-1],"nx":[0,0],"ny":[7,9],"nz":[1,1]},{"size":2,"px":[17,17],"py":[12,11],"pz":[0,0],"nx":[8,11],"ny":[4,11],"nz":[1,-1]},{"size":2,"px":[11,0],"py":[22,1],"pz":[0,-1],"nx":[4,6],"ny":[1,0],"nz":[1,1]},{"size":2,"px":[11,11],"py":[9,5],"pz":[1,1],"nx":[23,11],"ny":[23,20],"nz":[0,-1]},{"size":5,"px":[4,12,11,9,8],"py":[0,1,1,0,1],"pz":[1,0,0,0,0],"nx":[4,17,8,7,7],"ny":[2,13,4,4,4],"nz":[2,0,1,1,-1]},{"size":2,"px":[11,13],"py":[12,12],"pz":[0,-1],"nx":[1,1],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[23,4],"py":[23,2],"pz":[0,-1],"nx":[5,2],"ny":[23,6],"nz":[0,1]},{"size":3,"px":[8,16,0],"py":[5,15,6],"pz":[1,-1,-1],"nx":[23,23,11],"ny":[18,17,8],"nz":[0,0,1]},{"size":2,"px":[1,16],"py":[4,15],"pz":[2,-1],"nx":[2,2],"ny":[3,2],"nz":[2,2]},{"size":2,"px":[3,8],"py":[7,9],"pz":[1,-1],"nx":[4,2],"ny":[10,5],"nz":[1,2]},{"size":3,"px":[22,1,9],"py":[23,2,3],"pz":[0,-1,-1],"nx":[2,2,5],"ny":[5,4,19],"nz":[2,2,0]},{"size":2,"px":[2,20],"py":[5,15],"pz":[1,-1],"nx":[2,1],"ny":[1,2],"nz":[2,2]},{"size":2,"px":[4,8],"py":[1,19],"pz":[1,-1],"nx":[2,2],"ny":[5,4],"nz":[2,2]},{"size":2,"px":[9,10],"py":[21,0],"pz":[0,-1],"nx":[6,5],"ny":[1,1],"nz":[1,1]},{"size":2,"px":[4,8],"py":[3,6],"pz":[2,1],"nx":[9,2],"ny":[4,1],"nz":[1,-1]},{"size":3,"px":[17,3,10],"py":[8,0,2],"pz":[0,2,0],"nx":[13,2,6],"ny":[15,5,1],"nz":[0,-1,-1]},{"size":2,"px":[9,6],"py":[20,21],"pz":[0,-1],"nx":[4,2],"ny":[10,5],"nz":[1,2]},{"size":2,"px":[3,7],"py":[0,1],"pz":[2,1],"nx":[7,20],"ny":[1,19],"nz":[0,-1]},{"size":2,"px":[4,5],"py":[0,1],"pz":[1,0],"nx":[3,2],"ny":[4,2],"nz":[0,-1]},{"size":2,"px":[2,7],"py":[4,19],"pz":[2,0],"nx":[5,2],"ny":[10,2],"nz":[1,-1]},{"size":5,"px":[3,3,4,7,7],"py":[1,0,0,0,1],"pz":[1,1,1,0,0],"nx":[5,4,10,8,8],"ny":[3,3,5,4,4],"nz":[1,1,0,1,-1]},{"size":2,"px":[1,5],"py":[0,3],"pz":[1,-1],"nx":[1,0],"ny":[0,1],"nz":[0,1]},{"size":2,"px":[10,0],"py":[5,5],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[0,9],"py":[0,4],"pz":[2,-1],"nx":[13,10],"ny":[0,0],"nz":[0,0]},{"size":2,"px":[13,4],"py":[14,5],"pz":[0,-1],"nx":[4,2],"ny":[0,0],"nz":[0,1]},{"size":2,"px":[17,4],"py":[13,3],"pz":[0,-1],"nx":[4,2],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[1,0],"py":[6,2],"pz":[1,-1],"nx":[1,6],"ny":[2,12],"nz":[2,0]},{"size":2,"px":[12,4],"py":[6,0],"pz":[0,-1],"nx":[3,3],"ny":[8,9],"nz":[1,1]},{"size":2,"px":[1,5],"py":[1,5],"pz":[1,-1],"nx":[17,17],"ny":[13,7],"nz":[0,0]},{"size":2,"px":[7,3],"py":[12,6],"pz":[0,1],"nx":[3,4],"ny":[4,11],"nz":[1,-1]},{"size":2,"px":[6,17],"py":[2,8],"pz":[1,0],"nx":[3,3],"ny":[1,2],"nz":[1,-1]},{"size":3,"px":[13,6,6],"py":[22,11,10],"pz":[0,1,1],"nx":[13,12,11],"ny":[20,20,20],"nz":[0,0,0]},{"size":2,"px":[4,2],"py":[6,3],"pz":[1,2],"nx":[3,12],"ny":[4,20],"nz":[1,-1]},{"size":2,"px":[5,2],"py":[1,1],"pz":[1,-1],"nx":[13,6],"ny":[0,0],"nz":[0,1]},{"size":2,"px":[2,8],"py":[3,9],"pz":[2,0],"nx":[8,16],"ny":[5,17],"nz":[0,-1]},{"size":2,"px":[16,15],"py":[1,1],"pz":[0,0],"nx":[7,11],"ny":[8,0],"nz":[1,-1]},{"size":2,"px":[11,18],"py":[21,23],"pz":[0,-1],"nx":[1,1],"ny":[4,3],"nz":[1,2]},{"size":2,"px":[1,5],"py":[0,2],"pz":[1,-1],"nx":[15,11],"ny":[8,7],"nz":[0,0]},{"size":2,"px":[5,4],"py":[7,8],"pz":[1,-1],"nx":[9,10],"ny":[13,11],"nz":[0,0]},{"size":2,"px":[7,4],"py":[10,4],"pz":[1,2],"nx":[22,4],"ny":[0,2],"nz":[0,-1]},{"size":2,"px":[11,3],"py":[3,1],"pz":[0,2],"nx":[8,0],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[5,21],"py":[11,22],"pz":[0,-1],"nx":[10,11],"ny":[11,9],"nz":[0,0]},{"size":2,"px":[5,5],"py":[0,1],"pz":[2,2],"nx":[2,21],"ny":[6,14],"nz":[0,-1]},{"size":3,"px":[10,10,1],"py":[11,0,5],"pz":[0,-1,-1],"nx":[6,12,5],"ny":[2,5,2],"nz":[1,0,1]},{"size":2,"px":[9,10],"py":[5,6],"pz":[0,0],"nx":[12,19],"ny":[23,5],"nz":[0,-1]},{"size":2,"px":[11,5],"py":[9,6],"pz":[0,1],"nx":[21,0],"ny":[23,0],"nz":[0,-1]},{"size":2,"px":[13,12],"py":[19,15],"pz":[0,0],"nx":[13,0],"ny":[17,0],"nz":[0,-1]},{"size":2,"px":[14,0],"py":[17,3],"pz":[0,-1],"nx":[7,16],"ny":[8,19],"nz":[1,0]},{"size":2,"px":[3,6],"py":[2,4],"pz":[2,1],"nx":[8,1],"ny":[4,4],"nz":[1,-1]},{"size":2,"px":[13,10],"py":[23,20],"pz":[0,-1],"nx":[4,7],"ny":[5,10],"nz":[2,1]},{"size":2,"px":[16,9],"py":[22,5],"pz":[0,-1],"nx":[4,2],"ny":[10,3],"nz":[1,2]},{"size":4,"px":[3,1,1,5],"py":[4,2,1,2],"pz":[0,2,2,1],"nx":[13,5,8,0],"ny":[22,2,9,2],"nz":[0,-1,-1,-1]},{"size":2,"px":[9,9],"py":[0,0],"pz":[1,-1],"nx":[19,20],"ny":[1,2],"nz":[0,0]},{"size":2,"px":[7,22],"py":[6,8],"pz":[1,0],"nx":[4,4],"ny":[2,4],"nz":[2,-1]},{"size":2,"px":[3,6],"py":[4,4],"pz":[2,1],"nx":[10,20],"ny":[10,6],"nz":[0,-1]},{"size":2,"px":[6,12],"py":[6,15],"pz":[1,-1],"nx":[0,0],"ny":[2,5],"nz":[2,1]},{"size":2,"px":[2,7],"py":[4,10],"pz":[2,-1],"nx":[3,6],"ny":[4,8],"nz":[2,1]},{"size":3,"px":[11,11,4],"py":[0,5,7],"pz":[1,-1,-1],"nx":[6,12,12],"ny":[1,1,2],"nz":[1,0,0]},{"size":2,"px":[11,17],"py":[4,18],"pz":[0,-1],"nx":[8,2],"ny":[10,2],"nz":[0,2]},{"size":2,"px":[17,17],"py":[10,18],"pz":[0,-1],"nx":[8,8],"ny":[2,3],"nz":[1,1]},{"size":2,"px":[9,9],"py":[7,7],"pz":[1,-1],"nx":[7,4],"ny":[6,3],"nz":[1,2]},{"size":2,"px":[18,21],"py":[0,0],"pz":[0,-1],"nx":[11,6],"ny":[5,3],"nz":[0,1]},{"size":2,"px":[5,2],"py":[8,4],"pz":[0,2],"nx":[5,8],"ny":[9,16],"nz":[0,-1]},{"size":2,"px":[12,2],"py":[5,4],"pz":[0,-1],"nx":[4,15],"ny":[4,8],"nz":[1,0]},{"size":2,"px":[1,1],"py":[4,6],"pz":[1,1],"nx":[11,3],"ny":[7,9],"nz":[0,-1]},{"size":2,"px":[2,1],"py":[3,3],"pz":[2,2],"nx":[2,2],"ny":[15,16],"nz":[0,0]},{"size":2,"px":[17,18],"py":[5,5],"pz":[0,0],"nx":[9,21],"ny":[2,10],"nz":[1,-1]},{"size":2,"px":[6,3],"py":[14,7],"pz":[0,1],"nx":[3,4],"ny":[4,5],"nz":[1,-1]},{"size":2,"px":[0,3],"py":[3,1],"pz":[1,-1],"nx":[19,10],"ny":[12,4],"nz":[0,1]},{"size":2,"px":[6,16],"py":[3,8],"pz":[1,0],"nx":[8,10],"ny":[20,4],"nz":[0,-1]},{"size":3,"px":[5,5,2],"py":[21,8,4],"pz":[0,1,2],"nx":[10,6,3],"ny":[15,2,1],"nz":[0,-1,-1]},{"size":2,"px":[11,10],"py":[10,12],"pz":[0,0],"nx":[11,11],"ny":[2,1],"nz":[1,-1]},{"size":2,"px":[10,10],"py":[3,2],"pz":[1,1],"nx":[8,11],"ny":[3,5],"nz":[1,-1]},{"size":2,"px":[13,3],"py":[5,8],"pz":[0,-1],"nx":[12,3],"ny":[3,1],"nz":[0,2]},{"size":2,"px":[13,7],"py":[2,1],"pz":[0,1],"nx":[5,5],"ny":[1,1],"nz":[0,-1]},{"size":2,"px":[11,10],"py":[10,8],"pz":[0,-1],"nx":[14,16],"ny":[10,15],"nz":[0,0]},{"size":2,"px":[2,10],"py":[7,8],"pz":[1,-1],"nx":[2,6],"ny":[5,6],"nz":[2,1]},{"size":2,"px":[10,10],"py":[1,8],"pz":[0,-1],"nx":[2,2],"ny":[3,2],"nz":[2,2]},{"size":2,"px":[4,0],"py":[5,2],"pz":[1,-1],"nx":[1,2],"ny":[2,3],"nz":[2,1]},{"size":2,"px":[1,12],"py":[1,9],"pz":[2,-1],"nx":[16,17],"ny":[3,3],"nz":[0,0]},{"size":2,"px":[12,6],"py":[5,8],"pz":[0,-1],"nx":[3,4],"ny":[7,4],"nz":[1,1]},{"size":2,"px":[14,3],"py":[11,5],"pz":[0,-1],"nx":[11,4],"ny":[0,0],"nz":[0,1]},{"size":2,"px":[6,10],"py":[6,6],"pz":[1,-1],"nx":[0,0],"ny":[1,0],"nz":[2,2]},{"size":2,"px":[3,7],"py":[0,7],"pz":[1,-1],"nx":[15,13],"ny":[8,4],"nz":[0,0]},{"size":2,"px":[18,1],"py":[15,0],"pz":[0,-1],"nx":[18,18],"ny":[18,17],"nz":[0,0]},{"size":2,"px":[5,2],"py":[4,4],"pz":[0,-1],"nx":[4,18],"ny":[4,15],"nz":[1,0]},{"size":3,"px":[3,14,13],"py":[2,7,8],"pz":[2,0,0],"nx":[10,0,2],"ny":[8,3,2],"nz":[0,-1,-1]},{"size":2,"px":[16,0],"py":[14,3],"pz":[0,-1],"nx":[18,3],"ny":[12,5],"nz":[0,2]},{"size":2,"px":[5,3],"py":[8,3],"pz":[1,2],"nx":[13,4],"ny":[10,4],"nz":[0,-1]},{"size":2,"px":[3,6],"py":[1,2],"pz":[2,1],"nx":[8,1],"ny":[4,20],"nz":[1,-1]},{"size":2,"px":[10,10],"py":[8,3],"pz":[1,-1],"nx":[12,7],"ny":[2,1],"nz":[0,1]},{"size":2,"px":[17,3],"py":[9,2],"pz":[0,2],"nx":[7,6],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[12,1],"py":[2,1],"pz":[0,-1],"nx":[4,4],"ny":[2,3],"nz":[2,2]},{"size":2,"px":[22,5],"py":[15,3],"pz":[0,2],"nx":[16,17],"ny":[14,2],"nz":[0,-1]},{"size":2,"px":[8,11],"py":[19,13],"pz":[0,-1],"nx":[0,0],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[8,11],"py":[8,1],"pz":[1,-1],"nx":[3,3],"ny":[2,5],"nz":[1,2]},{"size":3,"px":[3,8,0],"py":[7,7,5],"pz":[1,-1,-1],"nx":[11,5,1],"ny":[11,7,5],"nz":[0,1,1]},{"size":2,"px":[12,6],"py":[12,6],"pz":[0,1],"nx":[9,0],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[16,12],"py":[7,1],"pz":[0,-1],"nx":[16,7],"ny":[6,4],"nz":[0,1]},{"size":2,"px":[13,5],"py":[14,0],"pz":[0,-1],"nx":[13,10],"ny":[0,0],"nz":[0,0]},{"size":5,"px":[11,12,13,12,7],"py":[0,1,0,0,0],"pz":[0,0,0,0,1],"nx":[13,16,14,4,4],"ny":[18,23,18,5,5],"nz":[0,0,0,2,-1]},{"size":2,"px":[14,5],"py":[12,4],"pz":[0,-1],"nx":[7,7],"ny":[8,2],"nz":[1,1]},{"size":2,"px":[19,3],"py":[2,5],"pz":[0,-1],"nx":[11,23],"ny":[7,13],"nz":[1,0]},{"size":2,"px":[0,0],"py":[19,20],"pz":[0,0],"nx":[9,4],"ny":[5,2],"nz":[0,-1]},{"size":2,"px":[15,4],"py":[12,3],"pz":[0,2],"nx":[9,5],"ny":[4,5],"nz":[1,-1]},{"size":4,"px":[8,0,1,21],"py":[6,0,7,16],"pz":[1,-1,-1,-1],"nx":[11,6,11,5],"ny":[8,6,4,3],"nz":[1,1,1,2]},{"size":2,"px":[11,11],"py":[7,5],"pz":[0,-1],"nx":[9,10],"ny":[6,7],"nz":[0,0]},{"size":2,"px":[2,4],"py":[1,2],"pz":[2,1],"nx":[16,6],"ny":[0,1],"nz":[0,-1]},{"size":2,"px":[0,0],"py":[5,3],"pz":[1,2],"nx":[1,21],"ny":[23,8],"nz":[0,-1]},{"size":2,"px":[10,0],"py":[7,0],"pz":[0,-1],"nx":[4,13],"ny":[4,10],"nz":[1,0]},{"size":2,"px":[11,4],"py":[0,4],"pz":[1,-1],"nx":[4,2],"ny":[16,8],"nz":[0,1]},{"size":2,"px":[5,3],"py":[12,6],"pz":[0,1],"nx":[3,3],"ny":[4,2],"nz":[1,-1]},{"size":2,"px":[10,0],"py":[19,11],"pz":[0,-1],"nx":[9,5],"ny":[21,9],"nz":[0,1]},{"size":2,"px":[0,0],"py":[17,9],"pz":[0,1],"nx":[0,5],"ny":[0,9],"nz":[2,-1]},{"size":2,"px":[4,5],"py":[2,4],"pz":[0,-1],"nx":[4,4],"ny":[5,6],"nz":[1,1]},{"size":2,"px":[8,4],"py":[1,0],"pz":[1,2],"nx":[4,3],"ny":[3,6],"nz":[0,-1]},{"size":2,"px":[11,0],"py":[7,2],"pz":[1,-1],"nx":[5,5],"ny":[1,0],"nz":[2,2]},{"size":2,"px":[13,0],"py":[17,2],"pz":[0,-1],"nx":[3,6],"ny":[5,8],"nz":[2,1]},{"size":2,"px":[2,1],"py":[0,5],"pz":[2,-1],"nx":[4,9],"ny":[2,7],"nz":[2,1]},{"size":2,"px":[12,5],"py":[13,8],"pz":[0,-1],"nx":[23,11],"ny":[13,7],"nz":[0,1]},{"size":2,"px":[0,0],"py":[0,2],"pz":[1,0],"nx":[3,6],"ny":[11,18],"nz":[0,-1]},{"size":2,"px":[4,3],"py":[6,5],"pz":[0,-1],"nx":[1,1],"ny":[1,3],"nz":[2,1]},{"size":4,"px":[3,6,3,6],"py":[3,6,2,5],"pz":[2,1,2,1],"nx":[0,4,1,1],"ny":[0,22,17,0],"nz":[0,-1,-1,-1]},{"size":2,"px":[8,4],"py":[6,3],"pz":[1,2],"nx":[9,15],"ny":[4,8],"nz":[1,-1]},{"size":2,"px":[8,18],"py":[7,8],"pz":[1,0],"nx":[8,5],"ny":[4,0],"nz":[1,-1]},{"size":2,"px":[0,0],"py":[4,5],"pz":[1,-1],"nx":[5,6],"ny":[0,0],"nz":[1,1]},{"size":2,"px":[13,18],"py":[23,19],"pz":[0,0],"nx":[7,13],"ny":[10,20],"nz":[1,-1]},{"size":2,"px":[10,6],"py":[2,0],"pz":[0,1],"nx":[4,1],"ny":[5,1],"nz":[1,-1]},{"size":2,"px":[1,1],"py":[5,4],"pz":[2,2],"nx":[0,20],"ny":[4,4],"nz":[2,-1]},{"size":2,"px":[5,5],"py":[1,0],"pz":[2,2],"nx":[12,6],"ny":[18,11],"nz":[0,-1]},{"size":5,"px":[2,1,3,1,5],"py":[3,3,7,4,9],"pz":[2,2,1,2,1],"nx":[9,3,8,16,10],"ny":[5,3,10,6,7],"nz":[1,-1,-1,-1,-1]},{"size":2,"px":[4,1],"py":[12,3],"pz":[0,-1],"nx":[10,1],"ny":[11,2],"nz":[0,2]},{"size":2,"px":[19,0],"py":[10,7],"pz":[0,-1],"nx":[14,7],"ny":[6,3],"nz":[0,1]},{"size":2,"px":[7,4],"py":[2,1],"pz":[1,2],"nx":[6,0],"ny":[2,18],"nz":[0,-1]},{"size":2,"px":[14,8],"py":[3,0],"pz":[0,1],"nx":[17,1],"ny":[1,4],"nz":[0,-1]},{"size":2,"px":[18,19],"py":[1,17],"pz":[0,-1],"nx":[5,11],"ny":[2,5],"nz":[2,1]},{"size":5,"px":[12,12,12,6,12],"py":[10,11,12,6,9],"pz":[0,0,0,1,0],"nx":[13,3,12,6,6],"ny":[4,1,4,2,2],"nz":[0,2,0,1,-1]},{"size":2,"px":[11,10],"py":[3,3],"pz":[0,0],"nx":[4,9],"ny":[4,17],"nz":[1,-1]},{"size":2,"px":[11,0],"py":[13,5],"pz":[0,2],"nx":[8,18],"ny":[15,15],"nz":[0,-1]},{"size":2,"px":[3,4],"py":[6,5],"pz":[1,1],"nx":[0,0],"ny":[9,4],"nz":[1,-1]},{"size":2,"px":[0,0],"py":[1,0],"pz":[2,2],"nx":[2,15],"ny":[2,1],"nz":[2,-1]},{"size":3,"px":[2,4,2],"py":[4,9,5],"pz":[2,1,2],"nx":[2,5,14],"ny":[0,1,4],"nz":[0,-1,-1]},{"size":2,"px":[11,12],"py":[20,20],"pz":[0,0],"nx":[6,10],"ny":[9,19],"nz":[1,-1]},{"size":2,"px":[7,0],"py":[16,8],"pz":[0,-1],"nx":[2,3],"ny":[2,4],"nz":[2,1]},{"size":5,"px":[16,17,15,16,15],"py":[1,1,1,0,0],"pz":[0,0,0,0,0],"nx":[8,8,4,12,12],"ny":[8,7,2,23,23],"nz":[1,1,2,0,-1]},{"size":2,"px":[2,4],"py":[6,12],"pz":[1,-1],"nx":[8,13],"ny":[1,1],"nz":[1,0]},{"size":2,"px":[9,2],"py":[3,2],"pz":[0,-1],"nx":[3,4],"ny":[6,5],"nz":[1,1]},{"size":2,"px":[10,8],"py":[6,1],"pz":[1,-1],"nx":[11,8],"ny":[2,2],"nz":[0,0]},{"size":2,"px":[9,3],"py":[7,0],"pz":[1,-1],"nx":[19,19],"ny":[18,16],"nz":[0,0]},{"size":2,"px":[3,2],"py":[1,1],"pz":[2,2],"nx":[22,11],"ny":[4,0],"nz":[0,-1]},{"size":2,"px":[10,10],"py":[9,8],"pz":[1,1],"nx":[4,4],"ny":[10,2],"nz":[1,-1]},{"size":2,"px":[0,1],"py":[0,5],"pz":[0,-1],"nx":[10,8],"ny":[2,2],"nz":[0,0]},{"size":2,"px":[3,3],"py":[8,7],"pz":[1,1],"nx":[8,2],"ny":[8,3],"nz":[0,-1]},{"size":2,"px":[13,5],"py":[21,3],"pz":[0,-1],"nx":[13,3],"ny":[20,5],"nz":[0,2]},{"size":2,"px":[12,5],"py":[11,2],"pz":[0,-1],"nx":[1,0],"ny":[19,9],"nz":[0,1]},{"size":2,"px":[7,10],"py":[9,10],"pz":[1,1],"nx":[8,4],"ny":[10,2],"nz":[1,-1]},{"size":2,"px":[0,0],"py":[5,9],"pz":[2,1],"nx":[2,11],"ny":[9,19],"nz":[1,-1]},{"size":2,"px":[3,5],"py":[1,2],"pz":[2,1],"nx":[8,23],"ny":[4,9],"nz":[1,-1]},{"size":2,"px":[3,4],"py":[2,4],"pz":[2,1],"nx":[5,9],"ny":[2,5],"nz":[2,-1]},{"size":2,"px":[11,11],"py":[2,3],"pz":[1,1],"nx":[19,9],"ny":[6,5],"nz":[0,-1]},{"size":2,"px":[9,4],"py":[5,10],"pz":[1,-1],"nx":[10,22],"ny":[0,16],"nz":[1,0]},{"size":3,"px":[19,9,19],"py":[3,1,2],"pz":[0,1,0],"nx":[6,3,6],"ny":[10,3,0],"nz":[1,-1,-1]},{"size":2,"px":[8,3],"py":[10,3],"pz":[1,2],"nx":[23,14],"ny":[3,18],"nz":[0,-1]},{"size":2,"px":[11,11],"py":[19,0],"pz":[0,-1],"nx":[4,16],"ny":[4,11],"nz":[1,0]},{"size":2,"px":[22,23],"py":[3,22],"pz":[0,-1],"nx":[9,3],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[7,2],"py":[12,4],"pz":[0,-1],"nx":[8,4],"ny":[10,5],"nz":[0,1]},{"size":2,"px":[12,13],"py":[5,13],"pz":[0,-1],"nx":[11,3],"ny":[2,0],"nz":[0,2]},{"size":2,"px":[3,17],"py":[0,16],"pz":[1,-1],"nx":[12,12],"ny":[5,6],"nz":[0,0]},{"size":2,"px":[4,3],"py":[1,0],"pz":[2,2],"nx":[4,3],"ny":[0,3],"nz":[0,-1]},{"size":2,"px":[10,3],"py":[12,0],"pz":[0,-1],"nx":[12,12],"ny":[13,12],"nz":[0,0]},{"size":2,"px":[13,4],"py":[11,14],"pz":[0,-1],"nx":[0,0],"ny":[4,6],"nz":[1,0]},{"size":2,"px":[8,7],"py":[7,8],"pz":[1,1],"nx":[3,0],"ny":[5,21],"nz":[2,-1]},{"size":2,"px":[1,3],"py":[4,14],"pz":[2,0],"nx":[8,8],"ny":[7,7],"nz":[1,-1]},{"size":2,"px":[13,11],"py":[20,7],"pz":[0,-1],"nx":[21,21],"ny":[20,18],"nz":[0,0]},{"size":2,"px":[2,1],"py":[11,0],"pz":[0,-1],"nx":[2,2],"ny":[15,14],"nz":[0,0]},{"size":2,"px":[10,1],"py":[8,0],"pz":[1,-1],"nx":[8,4],"ny":[7,4],"nz":[1,2]},{"size":2,"px":[17,6],"py":[13,1],"pz":[0,-1],"nx":[4,8],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[7,15],"py":[1,3],"pz":[1,0],"nx":[15,5],"ny":[1,8],"nz":[0,-1]},{"size":2,"px":[16,1],"py":[20,10],"pz":[0,-1],"nx":[6,8],"ny":[11,10],"nz":[1,1]},{"size":2,"px":[7,14],"py":[0,0],"pz":[1,0],"nx":[7,8],"ny":[7,3],"nz":[1,-1]},{"size":2,"px":[12,5],"py":[17,4],"pz":[0,-1],"nx":[12,5],"ny":[16,10],"nz":[0,1]},{"size":2,"px":[13,3],"py":[15,0],"pz":[0,-1],"nx":[12,7],"ny":[17,8],"nz":[0,1]},{"size":2,"px":[7,1],"py":[14,1],"pz":[0,-1],"nx":[4,6],"ny":[6,12],"nz":[1,0]},{"size":2,"px":[8,7],"py":[0,0],"pz":[0,0],"nx":[6,20],"ny":[5,5],"nz":[0,-1]},{"size":2,"px":[10,2],"py":[22,5],"pz":[0,-1],"nx":[4,8],"ny":[4,9],"nz":[2,1]},{"size":4,"px":[8,2,2,9],"py":[6,5,3,11],"pz":[1,-1,-1,-1],"nx":[2,7,4,3],"ny":[2,1,0,2],"nz":[2,0,1,2]},{"size":2,"px":[12,6],"py":[12,6],"pz":[0,1],"nx":[8,2],"ny":[4,1],"nz":[1,-1]},{"size":2,"px":[13,11],"py":[19,8],"pz":[0,-1],"nx":[13,13],"ny":[20,17],"nz":[0,0]},{"size":2,"px":[11,19],"py":[5,14],"pz":[0,-1],"nx":[3,4],"ny":[8,4],"nz":[1,1]},{"size":2,"px":[10,0],"py":[8,6],"pz":[1,-1],"nx":[21,21],"ny":[16,15],"nz":[0,0]},{"size":2,"px":[1,12],"py":[7,6],"pz":[1,-1],"nx":[2,7],"ny":[5,14],"nz":[2,0]},{"size":2,"px":[2,9],"py":[7,5],"pz":[1,-1],"nx":[2,5],"ny":[5,9],"nz":[2,1]},{"size":2,"px":[12,5],"py":[15,6],"pz":[0,-1],"nx":[3,12],"ny":[0,2],"nz":[2,0]},{"size":2,"px":[23,22],"py":[23,1],"pz":[0,-1],"nx":[0,0],"ny":[2,3],"nz":[2,2]},{"size":2,"px":[3,6],"py":[1,2],"pz":[2,1],"nx":[8,0],"ny":[4,3],"nz":[1,-1]},{"size":2,"px":[5,1],"py":[9,1],"pz":[0,-1],"nx":[4,2],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[0,1],"py":[0,0],"pz":[2,0],"nx":[2,3],"ny":[9,10],"nz":[0,-1]},{"size":2,"px":[6,0],"py":[16,14],"pz":[0,-1],"nx":[6,3],"ny":[23,14],"nz":[0,0]},{"size":2,"px":[3,3],"py":[2,3],"pz":[2,1],"nx":[13,3],"ny":[19,14],"nz":[0,-1]},{"size":2,"px":[11,5],"py":[8,18],"pz":[0,-1],"nx":[4,7],"ny":[1,2],"nz":[2,1]},{"size":2,"px":[4,4],"py":[5,6],"pz":[1,1],"nx":[2,2],"ny":[5,3],"nz":[2,-1]},{"size":2,"px":[7,3],"py":[13,7],"pz":[0,1],"nx":[4,3],"ny":[4,1],"nz":[1,-1]},{"size":2,"px":[0,0],"py":[5,6],"pz":[1,0],"nx":[2,1],"ny":[5,1],"nz":[1,-1]},{"size":2,"px":[7,14],"py":[3,5],"pz":[1,0],"nx":[5,0],"ny":[16,7],"nz":[0,-1]},{"size":2,"px":[11,2],"py":[18,5],"pz":[0,2],"nx":[11,4],"ny":[16,4],"nz":[0,-1]},{"size":2,"px":[6,16],"py":[19,20],"pz":[0,-1],"nx":[3,2],"ny":[10,5],"nz":[1,2]},{"size":2,"px":[5,3],"py":[3,1],"pz":[0,1],"nx":[1,3],"ny":[4,8],"nz":[0,-1]},{"size":2,"px":[12,6],"py":[13,6],"pz":[0,1],"nx":[10,1],"ny":[12,2],"nz":[0,-1]},{"size":2,"px":[8,3],"py":[6,2],"pz":[1,-1],"nx":[4,8],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[9,3],"py":[21,2],"pz":[0,-1],"nx":[8,4],"ny":[1,0],"nz":[1,2]},{"size":2,"px":[8,4],"py":[1,0],"pz":[1,-1],"nx":[8,6],"ny":[4,2],"nz":[1,1]},{"size":2,"px":[2,7],"py":[1,6],"pz":[2,-1],"nx":[7,9],"ny":[6,4],"nz":[1,1]},{"size":2,"px":[6,3],"py":[8,3],"pz":[1,2],"nx":[10,5],"ny":[19,11],"nz":[0,-1]},{"size":2,"px":[2,2],"py":[3,4],"pz":[2,2],"nx":[3,6],"ny":[4,6],"nz":[1,-1]},{"size":2,"px":[3,11],"py":[5,20],"pz":[2,0],"nx":[11,5],"ny":[21,8],"nz":[0,-1]},{"size":3,"px":[5,9,5],"py":[4,7,5],"pz":[2,0,2],"nx":[23,10,4],"ny":[23,3,22],"nz":[0,-1,-1]},{"size":4,"px":[11,9,7,1],"py":[13,8,11,10],"pz":[0,-1,-1,-1],"nx":[8,2,11,12],"ny":[4,2,4,4],"nz":[1,2,0,0]},{"size":2,"px":[0,0],"py":[7,6],"pz":[1,1],"nx":[0,4],"ny":[1,0],"nz":[2,-1]},{"size":2,"px":[19,20],"py":[0,1],"pz":[0,0],"nx":[21,1],"ny":[0,2],"nz":[0,-1]},{"size":2,"px":[8,5],"py":[11,0],"pz":[0,-1],"nx":[11,0],"ny":[12,1],"nz":[0,2]},{"size":2,"px":[11,11],"py":[1,1],"pz":[0,-1],"nx":[4,7],"ny":[5,4],"nz":[1,1]},{"size":2,"px":[5,12],"py":[4,23],"pz":[2,-1],"nx":[13,15],"ny":[5,4],"nz":[0,0]},{"size":2,"px":[12,20],"py":[4,16],"pz":[0,-1],"nx":[9,4],"ny":[2,1],"nz":[0,1]},{"size":2,"px":[12,13],"py":[2,2],"pz":[0,0],"nx":[4,16],"ny":[2,11],"nz":[2,0]},{"size":2,"px":[19,14],"py":[10,17],"pz":[0,-1],"nx":[3,8],"ny":[0,2],"nz":[2,0]},{"size":2,"px":[8,12],"py":[1,2],"pz":[1,0],"nx":[19,10],"ny":[3,1],"nz":[0,-1]},{"size":4,"px":[17,2,3,10],"py":[8,6,2,12],"pz":[0,1,2,0],"nx":[17,9,12,2],"ny":[9,22,13,5],"nz":[0,-1,-1,-1]},{"size":2,"px":[20,10],"py":[15,7],"pz":[0,1],"nx":[13,9],"ny":[7,3],"nz":[0,-1]},{"size":2,"px":[0,0],"py":[1,0],"pz":[2,2],"nx":[10,3],"ny":[9,2],"nz":[1,-1]},{"size":2,"px":[4,3],"py":[1,0],"pz":[2,2],"nx":[0,22],"ny":[14,6],"nz":[0,-1]},{"size":2,"px":[16,3],"py":[4,0],"pz":[0,2],"nx":[16,3],"ny":[2,0],"nz":[0,-1]},{"size":2,"px":[8,16],"py":[6,12],"pz":[1,0],"nx":[8,12],"ny":[4,7],"nz":[1,-1]},{"size":2,"px":[5,11],"py":[0,5],"pz":[2,1],"nx":[10,1],"ny":[5,5],"nz":[1,-1]},{"size":2,"px":[7,4],"py":[5,5],"pz":[0,-1],"nx":[3,6],"ny":[2,3],"nz":[1,0]},{"size":2,"px":[11,11],"py":[11,12],"pz":[0,0],"nx":[23,7],"ny":[20,2],"nz":[0,-1]},{"size":2,"px":[16,8],"py":[12,5],"pz":[0,1],"nx":[8,2],"ny":[2,1],"nz":[1,-1]},{"size":3,"px":[6,11,11],"py":[11,23,20],"pz":[1,0,0],"nx":[11,3,22],"ny":[21,3,16],"nz":[0,-1,-1]},{"size":2,"px":[17,15],"py":[3,2],"pz":[0,-1],"nx":[4,4],"ny":[3,2],"nz":[2,2]},{"size":2,"px":[21,21],"py":[11,10],"pz":[0,0],"nx":[11,3],"ny":[6,2],"nz":[1,-1]},{"size":2,"px":[23,21],"py":[22,10],"pz":[0,-1],"nx":[20,10],"ny":[18,10],"nz":[0,1]},{"size":2,"px":[4,2],"py":[6,3],"pz":[1,2],"nx":[3,2],"ny":[4,3],"nz":[1,-1]},{"size":2,"px":[16,0],"py":[18,11],"pz":[0,-1],"nx":[8,7],"ny":[4,4],"nz":[0,0]},{"size":2,"px":[6,21],"py":[3,16],"pz":[0,-1],"nx":[1,8],"ny":[2,14],"nz":[2,0]},{"size":2,"px":[8,1],"py":[3,0],"pz":[0,-1],"nx":[11,11],"ny":[2,1],"nz":[0,0]},{"size":3,"px":[11,11,11],"py":[9,10,8],"pz":[1,1,1],"nx":[23,1,0],"ny":[23,9,11],"nz":[0,-1,-1]},{"size":2,"px":[6,3],"py":[2,1],"pz":[1,2],"nx":[7,1],"ny":[8,2],"nz":[0,-1]},{"size":2,"px":[10,17],"py":[17,19],"pz":[0,-1],"nx":[10,4],"ny":[16,9],"nz":[0,1]},{"size":2,"px":[3,6],"py":[7,1],"pz":[1,-1],"nx":[11,0],"ny":[11,8],"nz":[0,1]},{"size":2,"px":[10,5],"py":[11,4],"pz":[1,2],"nx":[5,5],"ny":[0,0],"nz":[2,-1]},{"size":2,"px":[3,6],"py":[3,6],"pz":[2,1],"nx":[8,0],"ny":[4,16],"nz":[1,-1]},{"size":2,"px":[14,1],"py":[20,2],"pz":[0,-1],"nx":[7,7],"ny":[11,9],"nz":[1,1]},{"size":3,"px":[11,13,4],"py":[16,21,3],"pz":[0,0,2],"nx":[14,16,5],"ny":[20,14,9],"nz":[0,-1,-1]},{"size":2,"px":[7,0],"py":[1,1],"pz":[1,-1],"nx":[4,7],"ny":[2,4],"nz":[2,1]},{"size":2,"px":[23,11],"py":[9,4],"pz":[0,1],"nx":[11,3],"ny":[1,3],"nz":[0,-1]},{"size":2,"px":[11,13],"py":[23,23],"pz":[0,0],"nx":[13,13],"ny":[20,20],"nz":[0,-1]},{"size":2,"px":[10,8],"py":[5,11],"pz":[0,-1],"nx":[20,19],"ny":[18,20],"nz":[0,0]},{"size":2,"px":[19,5],"py":[22,4],"pz":[0,-1],"nx":[2,9],"ny":[3,17],"nz":[1,0]},{"size":2,"px":[15,2],"py":[13,7],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":2,"px":[14,13],"py":[17,2],"pz":[0,-1],"nx":[15,13],"ny":[19,15],"nz":[0,0]},{"size":2,"px":[12,23],"py":[8,22],"pz":[0,-1],"nx":[7,10],"ny":[5,9],"nz":[1,0]},{"size":2,"px":[2,6],"py":[21,10],"pz":[0,-1],"nx":[3,4],"ny":[3,3],"nz":[1,1]},{"size":2,"px":[15,11],"py":[5,0],"pz":[0,-1],"nx":[3,4],"ny":[17,16],"nz":[0,0]},{"size":2,"px":[3,1],"py":[18,8],"pz":[0,1],"nx":[14,4],"ny":[17,7],"nz":[0,-1]},{"size":2,"px":[15,3],"py":[18,3],"pz":[0,2],"nx":[1,22],"ny":[0,1],"nz":[0,-1]},{"size":2,"px":[13,3],"py":[9,3],"pz":[0,-1],"nx":[0,1],"ny":[9,20],"nz":[1,0]},{"size":2,"px":[1,1],"py":[1,0],"pz":[2,2],"nx":[9,23],"ny":[10,12],"nz":[1,-1]},{"size":4,"px":[9,0,9,1],"py":[8,0,0,10],"pz":[1,-1,-1,-1],"nx":[23,7,5,23],"ny":[20,7,5,19],"nz":[0,1,2,0]},{"size":2,"px":[18,18],"py":[12,12],"pz":[0,-1],"nx":[8,4],"ny":[4,2],"nz":[1,2]},{"size":3,"px":[0,4,1],"py":[3,5,3],"pz":[1,-1,-1],"nx":[16,11,8],"ny":[8,5,6],"nz":[0,0,0]},{"size":5,"px":[9,10,14,11,11],"py":[0,0,0,0,0],"pz":[0,0,0,0,-1],"nx":[8,3,4,6,2],"ny":[22,9,5,4,0],"nz":[0,1,0,0,2]},{"size":2,"px":[6,5],"py":[2,2],"pz":[1,1],"nx":[7,3],"ny":[8,7],"nz":[0,-1]},{"size":2,"px":[11,5],"py":[15,2],"pz":[0,-1],"nx":[3,10],"ny":[0,1],"nz":[2,0]},{"size":2,"px":[0,11],"py":[11,12],"pz":[1,-1],"nx":[22,22],"ny":[14,13],"nz":[0,0]},{"size":2,"px":[2,2],"py":[15,14],"pz":[0,0],"nx":[1,2],"ny":[11,8],"nz":[1,-1]},{"size":2,"px":[11,6],"py":[0,7],"pz":[1,-1],"nx":[19,5],"ny":[3,0],"nz":[0,2]},{"size":2,"px":[2,3],"py":[3,7],"pz":[2,1],"nx":[1,5],"ny":[5,0],"nz":[1,-1]},{"size":2,"px":[10,14],"py":[4,5],"pz":[0,-1],"nx":[4,18],"ny":[2,12],"nz":[2,0]},{"size":2,"px":[19,10],"py":[12,2],"pz":[0,-1],"nx":[13,4],"ny":[10,2],"nz":[0,2]},{"size":2,"px":[6,1],"py":[21,6],"pz":[0,-1],"nx":[6,5],"ny":[0,0],"nz":[1,1]}],"alpha":[-1.044179e+00,1.044179e+00,-6.003138e-01,6.003138e-01,-4.091282e-01,4.091282e-01,-4.590148e-01,4.590148e-01,-4.294004e-01,4.294004e-01,-3.360846e-01,3.360846e-01,-3.054186e-01,3.054186e-01,-2.901743e-01,2.901743e-01,-3.522417e-01,3.522417e-01,-3.195838e-01,3.195838e-01,-2.957309e-01,2.957309e-01,-2.876727e-01,2.876727e-01,-2.637460e-01,2.637460e-01,-2.607900e-01,2.607900e-01,-2.455714e-01,2.455714e-01,-2.749847e-01,2.749847e-01,-2.314217e-01,2.314217e-01,-2.540871e-01,2.540871e-01,-2.143416e-01,2.143416e-01,-2.565697e-01,2.565697e-01,-1.901272e-01,1.901272e-01,-2.259981e-01,2.259981e-01,-2.012333e-01,2.012333e-01,-2.448460e-01,2.448460e-01,-2.192845e-01,2.192845e-01,-2.005951e-01,2.005951e-01,-2.259000e-01,2.259000e-01,-1.955758e-01,1.955758e-01,-2.235332e-01,2.235332e-01,-1.704490e-01,1.704490e-01,-1.584628e-01,1.584628e-01,-2.167710e-01,2.167710e-01,-1.592909e-01,1.592909e-01,-1.967292e-01,1.967292e-01,-1.432268e-01,1.432268e-01,-2.039949e-01,2.039949e-01,-1.404068e-01,1.404068e-01,-1.788201e-01,1.788201e-01,-1.498714e-01,1.498714e-01,-1.282541e-01,1.282541e-01,-1.630182e-01,1.630182e-01,-1.398111e-01,1.398111e-01,-1.464143e-01,1.464143e-01,-1.281712e-01,1.281712e-01,-1.417014e-01,1.417014e-01,-1.779164e-01,1.779164e-01,-2.067174e-01,2.067174e-01,-1.344947e-01,1.344947e-01,-1.357351e-01,1.357351e-01,-1.683191e-01,1.683191e-01,-1.821768e-01,1.821768e-01,-2.158307e-01,2.158307e-01,-1.812857e-01,1.812857e-01,-1.635445e-01,1.635445e-01,-1.474934e-01,1.474934e-01,-1.771993e-01,1.771993e-01,-1.517620e-01,1.517620e-01,-1.283184e-01,1.283184e-01,-1.862675e-01,1.862675e-01,-1.420491e-01,1.420491e-01,-1.232165e-01,1.232165e-01,-1.472696e-01,1.472696e-01,-1.192156e-01,1.192156e-01,-1.602034e-01,1.602034e-01,-1.321473e-01,1.321473e-01,-1.358101e-01,1.358101e-01,-1.295821e-01,1.295821e-01,-1.289102e-01,1.289102e-01,-1.232520e-01,1.232520e-01,-1.332227e-01,1.332227e-01,-1.358887e-01,1.358887e-01,-1.179559e-01,1.179559e-01,-1.263694e-01,1.263694e-01,-1.444876e-01,1.444876e-01,-1.933141e-01,1.933141e-01,-1.917886e-01,1.917886e-01,-1.199760e-01,1.199760e-01,-1.359937e-01,1.359937e-01,-1.690073e-01,1.690073e-01,-1.894222e-01,1.894222e-01,-1.699422e-01,1.699422e-01,-1.340361e-01,1.340361e-01,-1.840622e-01,1.840622e-01,-1.277397e-01,1.277397e-01,-1.381610e-01,1.381610e-01,-1.282241e-01,1.282241e-01,-1.211334e-01,1.211334e-01,-1.264628e-01,1.264628e-01,-1.373010e-01,1.373010e-01,-1.363356e-01,1.363356e-01,-1.562568e-01,1.562568e-01,-1.268735e-01,1.268735e-01,-1.037859e-01,1.037859e-01,-1.394322e-01,1.394322e-01,-1.449225e-01,1.449225e-01,-1.109657e-01,1.109657e-01,-1.086931e-01,1.086931e-01,-1.379135e-01,1.379135e-01,-1.881974e-01,1.881974e-01,-1.304956e-01,1.304956e-01,-9.921777e-02,9.921777e-02,-1.398624e-01,1.398624e-01,-1.216469e-01,1.216469e-01,-1.272741e-01,1.272741e-01,-1.878236e-01,1.878236e-01,-1.336894e-01,1.336894e-01,-1.256289e-01,1.256289e-01,-1.247231e-01,1.247231e-01,-1.853400e-01,1.853400e-01,-1.087805e-01,1.087805e-01,-1.205676e-01,1.205676e-01,-1.023182e-01,1.023182e-01,-1.268422e-01,1.268422e-01,-1.422900e-01,1.422900e-01,-1.098174e-01,1.098174e-01,-1.317018e-01,1.317018e-01,-1.378142e-01,1.378142e-01,-1.274550e-01,1.274550e-01,-1.142944e-01,1.142944e-01,-1.713488e-01,1.713488e-01,-1.103035e-01,1.103035e-01,-1.045221e-01,1.045221e-01,-1.293015e-01,1.293015e-01,-9.763183e-02,9.763183e-02,-1.387213e-01,1.387213e-01,-9.031167e-02,9.031167e-02,-1.283052e-01,1.283052e-01,-1.133462e-01,1.133462e-01,-9.370681e-02,9.370681e-02,-1.079269e-01,1.079269e-01,-1.331913e-01,1.331913e-01,-8.969902e-02,8.969902e-02,-1.044560e-01,1.044560e-01,-9.387466e-02,9.387466e-02,-1.208988e-01,1.208988e-01,-1.252011e-01,1.252011e-01,-1.401277e-01,1.401277e-01,-1.461381e-01,1.461381e-01,-1.323763e-01,1.323763e-01,-9.923889e-02,9.923889e-02,-1.142899e-01,1.142899e-01,-9.110853e-02,9.110853e-02,-1.106607e-01,1.106607e-01,-1.253140e-01,1.253140e-01,-9.657895e-02,9.657895e-02,-1.030010e-01,1.030010e-01,-1.348857e-01,1.348857e-01,-1.237793e-01,1.237793e-01,-1.296943e-01,1.296943e-01,-1.323385e-01,1.323385e-01,-8.331554e-02,8.331554e-02,-8.417589e-02,8.417589e-02,-1.104431e-01,1.104431e-01,-1.170710e-01,1.170710e-01,-1.391725e-01,1.391725e-01,-1.485189e-01,1.485189e-01,-1.840393e-01,1.840393e-01,-1.238250e-01,1.238250e-01,-1.095287e-01,1.095287e-01,-1.177869e-01,1.177869e-01,-1.036409e-01,1.036409e-01,-9.802581e-02,9.802581e-02,-9.364054e-02,9.364054e-02,-9.936022e-02,9.936022e-02,-1.117201e-01,1.117201e-01,-1.081300e-01,1.081300e-01,-1.331861e-01,1.331861e-01,-1.192122e-01,1.192122e-01,-9.889761e-02,9.889761e-02,-1.173456e-01,1.173456e-01,-1.032917e-01,1.032917e-01,-9.268551e-02,9.268551e-02,-1.178563e-01,1.178563e-01,-1.215065e-01,1.215065e-01,-1.060437e-01,1.060437e-01,-1.010044e-01,1.010044e-01,-1.021683e-01,1.021683e-01,-9.974968e-02,9.974968e-02,-1.161528e-01,1.161528e-01,-8.686721e-02,8.686721e-02,-8.145259e-02,8.145259e-02,-9.937060e-02,9.937060e-02,-1.170885e-01,1.170885e-01,-7.693779e-02,7.693779e-02,-9.047233e-02,9.047233e-02,-9.168442e-02,9.168442e-02,-1.054105e-01,1.054105e-01,-9.036177e-02,9.036177e-02,-1.251949e-01,1.251949e-01,-9.523847e-02,9.523847e-02,-1.038930e-01,1.038930e-01,-1.433660e-01,1.433660e-01,-1.489830e-01,1.489830e-01,-8.393174e-02,8.393174e-02,-8.888026e-02,8.888026e-02,-9.347861e-02,9.347861e-02,-1.044838e-01,1.044838e-01,-1.102144e-01,1.102144e-01,-1.383415e-01,1.383415e-01,-1.466476e-01,1.466476e-01,-1.129741e-01,1.129741e-01,-1.310915e-01,1.310915e-01,-1.070648e-01,1.070648e-01,-7.559007e-02,7.559007e-02,-8.812082e-02,8.812082e-02,-1.234272e-01,1.234272e-01,-1.088022e-01,1.088022e-01,-8.388703e-02,8.388703e-02,-7.179593e-02,7.179593e-02,-1.008961e-01,1.008961e-01,-9.030070e-02,9.030070e-02,-8.581345e-02,8.581345e-02,-9.023431e-02,9.023431e-02,-9.807321e-02,9.807321e-02,-9.621402e-02,9.621402e-02,-1.730195e-01,1.730195e-01,-8.984631e-02,8.984631e-02,-9.556661e-02,9.556661e-02,-1.047576e-01,1.047576e-01,-7.854313e-02,7.854313e-02,-8.682118e-02,8.682118e-02,-1.159761e-01,1.159761e-01,-1.339540e-01,1.339540e-01,-1.003048e-01,1.003048e-01,-9.747544e-02,9.747544e-02,-9.501058e-02,9.501058e-02,-1.321566e-01,1.321566e-01,-9.194706e-02,9.194706e-02,-9.359276e-02,9.359276e-02,-1.015916e-01,1.015916e-01,-1.174192e-01,1.174192e-01,-1.039931e-01,1.039931e-01,-9.746733e-02,9.746733e-02,-1.286120e-01,1.286120e-01,-1.044899e-01,1.044899e-01,-1.066385e-01,1.066385e-01,-8.368626e-02,8.368626e-02,-1.271919e-01,1.271919e-01,-1.055946e-01,1.055946e-01,-8.272876e-02,8.272876e-02,-1.370564e-01,1.370564e-01,-8.539379e-02,8.539379e-02,-1.100343e-01,1.100343e-01,-8.102170e-02,8.102170e-02,-1.028728e-01,1.028728e-01,-1.305065e-01,1.305065e-01,-1.059506e-01,1.059506e-01,-1.264646e-01,1.264646e-01,-8.383843e-02,8.383843e-02,-9.357698e-02,9.357698e-02,-7.474400e-02,7.474400e-02,-7.814045e-02,7.814045e-02,-8.600970e-02,8.600970e-02,-1.206090e-01,1.206090e-01,-9.986512e-02,9.986512e-02,-8.516476e-02,8.516476e-02,-7.198783e-02,7.198783e-02,-7.838409e-02,7.838409e-02,-1.005142e-01,1.005142e-01,-9.951857e-02,9.951857e-02,-7.253998e-02,7.253998e-02,-9.913739e-02,9.913739e-02,-7.500360e-02,7.500360e-02,-9.258090e-02,9.258090e-02,-1.400287e-01,1.400287e-01,-1.044404e-01,1.044404e-01,-7.404339e-02,7.404339e-02,-7.256833e-02,7.256833e-02,-1.006995e-01,1.006995e-01,-1.426043e-01,1.426043e-01,-1.036529e-01,1.036529e-01,-1.208443e-01,1.208443e-01,-1.074245e-01,1.074245e-01,-1.141448e-01,1.141448e-01,-1.015809e-01,1.015809e-01,-1.028822e-01,1.028822e-01,-1.055682e-01,1.055682e-01,-9.468699e-02,9.468699e-02,-1.010098e-01,1.010098e-01,-1.205054e-01,1.205054e-01,-8.392956e-02,8.392956e-02,-8.052297e-02,8.052297e-02,-9.576507e-02,9.576507e-02,-9.515692e-02,9.515692e-02,-1.564745e-01,1.564745e-01,-7.357238e-02,7.357238e-02,-1.129262e-01,1.129262e-01,-1.013265e-01,1.013265e-01,-8.760761e-02,8.760761e-02,-8.714771e-02,8.714771e-02,-9.605039e-02,9.605039e-02,-9.064677e-02,9.064677e-02,-8.243857e-02,8.243857e-02,-8.495858e-02,8.495858e-02,-8.350249e-02,8.350249e-02,-7.423234e-02,7.423234e-02,-7.930799e-02,7.930799e-02,-6.620023e-02,6.620023e-02,-7.311919e-02,7.311919e-02,-1.237938e-01,1.237938e-01,-1.086814e-01,1.086814e-01,-6.379798e-02,6.379798e-02,-7.526021e-02,7.526021e-02,-8.297097e-02,8.297097e-02,-8.186337e-02,8.186337e-02,-7.627362e-02,7.627362e-02,-1.061638e-01,1.061638e-01,-8.328494e-02,8.328494e-02,-1.040895e-01,1.040895e-01,-7.649056e-02,7.649056e-02,-7.299058e-02,7.299058e-02,-9.195198e-02,9.195198e-02,-7.990880e-02,7.990880e-02,-7.429346e-02,7.429346e-02,-9.991702e-02,9.991702e-02,-9.755385e-02,9.755385e-02,-1.344138e-01,1.344138e-01,-1.707917e-01,1.707917e-01,-8.325450e-02,8.325450e-02,-8.137793e-02,8.137793e-02,-8.308659e-02,8.308659e-02,-7.440414e-02,7.440414e-02,-7.012744e-02,7.012744e-02,-8.122943e-02,8.122943e-02,-8.845462e-02,8.845462e-02,-8.803450e-02,8.803450e-02,-9.653392e-02,9.653392e-02,-8.795691e-02,8.795691e-02,-1.119045e-01,1.119045e-01,-1.068308e-01,1.068308e-01,-8.406359e-02,8.406359e-02,-1.220414e-01,1.220414e-01,-1.024235e-01,1.024235e-01,-1.252897e-01,1.252897e-01,-1.121234e-01,1.121234e-01,-9.054150e-02,9.054150e-02,-8.974435e-02,8.974435e-02,-1.351578e-01,1.351578e-01,-1.106442e-01,1.106442e-01,-8.093913e-02,8.093913e-02,-9.800762e-02,9.800762e-02,-7.012823e-02,7.012823e-02,-7.434949e-02,7.434949e-02,-8.684816e-02,8.684816e-02,-8.916388e-02,8.916388e-02,-8.773159e-02,8.773159e-02,-7.709608e-02,7.709608e-02,-7.230518e-02,7.230518e-02,-9.662156e-02,9.662156e-02,-7.957632e-02,7.957632e-02,-7.628441e-02,7.628441e-02,-8.050202e-02,8.050202e-02,-1.290593e-01,1.290593e-01,-9.246182e-02,9.246182e-02,-9.703662e-02,9.703662e-02,-7.866445e-02,7.866445e-02,-1.064783e-01,1.064783e-01,-1.012339e-01,1.012339e-01,-6.828389e-02,6.828389e-02,-1.005039e-01,1.005039e-01,-7.559687e-02,7.559687e-02,-6.359878e-02,6.359878e-02,-8.387002e-02,8.387002e-02,-7.851323e-02,7.851323e-02,-8.878569e-02,8.878569e-02,-7.767654e-02,7.767654e-02,-8.033338e-02,8.033338e-02,-9.142797e-02,9.142797e-02,-8.590585e-02,8.590585e-02,-1.052318e-01,1.052318e-01,-8.760062e-02,8.760062e-02,-9.222192e-02,9.222192e-02,-7.548828e-02,7.548828e-02,-8.003344e-02,8.003344e-02,-1.177076e-01,1.177076e-01,-1.064964e-01,1.064964e-01,-8.655553e-02,8.655553e-02,-9.418112e-02,9.418112e-02,-7.248163e-02,7.248163e-02,-7.120974e-02,7.120974e-02,-6.393114e-02,6.393114e-02,-7.997487e-02,7.997487e-02,-1.220941e-01,1.220941e-01,-9.892518e-02,9.892518e-02,-8.270271e-02,8.270271e-02,-1.069400e-01,1.069400e-01,-5.860771e-02,5.860771e-02,-9.126600e-02,9.126600e-02,-6.212559e-02,6.212559e-02,-9.397538e-02,9.397538e-02,-8.070447e-02,8.070447e-02,-8.415587e-02,8.415587e-02,-8.564455e-02,8.564455e-02,-7.791811e-02,7.791811e-02,-6.642259e-02,6.642259e-02,-8.266167e-02,8.266167e-02,-1.134986e-01,1.134986e-01,-1.045267e-01,1.045267e-01,-7.122085e-02,7.122085e-02,-7.979415e-02,7.979415e-02,-7.922347e-02,7.922347e-02,-9.003421e-02,9.003421e-02,-8.796449e-02,8.796449e-02,-7.933279e-02,7.933279e-02,-8.307947e-02,8.307947e-02,-8.946349e-02,8.946349e-02,-7.643384e-02,7.643384e-02,-7.818534e-02,7.818534e-02,-7.990991e-02,7.990991e-02,-9.885664e-02,9.885664e-02,-8.071329e-02,8.071329e-02,-6.952112e-02,6.952112e-02,-6.429706e-02,6.429706e-02,-6.307229e-02,6.307229e-02,-8.100137e-02,8.100137e-02,-7.693623e-02,7.693623e-02,-6.906625e-02,6.906625e-02,-7.390462e-02,7.390462e-02,-6.487217e-02,6.487217e-02,-1.233681e-01,1.233681e-01,-6.979273e-02,6.979273e-02,-8.358669e-02,8.358669e-02,-1.095420e-01,1.095420e-01,-8.519717e-02,8.519717e-02,-7.599857e-02,7.599857e-02,-6.042816e-02,6.042816e-02,-6.546304e-02,6.546304e-02,-1.016245e-01,1.016245e-01,-8.308787e-02,8.308787e-02,-7.385708e-02,7.385708e-02,-6.751630e-02,6.751630e-02,-9.036695e-02,9.036695e-02,-9.371335e-02,9.371335e-02,-1.116088e-01,1.116088e-01,-5.693741e-02,5.693741e-02,-6.383983e-02,6.383983e-02,-5.389843e-02,5.389843e-02,-8.383191e-02,8.383191e-02,-7.820822e-02,7.820822e-02,-7.067557e-02,7.067557e-02,-7.971948e-02,7.971948e-02,-7.360668e-02,7.360668e-02,-7.008027e-02,7.008027e-02,-8.013378e-02,8.013378e-02,-8.331605e-02,8.331605e-02,-7.145702e-02,7.145702e-02,-7.863940e-02,7.863940e-02,-6.992679e-02,6.992679e-02,-5.716495e-02,5.716495e-02,-5.306006e-02,5.306006e-02,-8.855639e-02,8.855639e-02,-7.656397e-02,7.656397e-02,-6.939272e-02,6.939272e-02,-7.523742e-02,7.523742e-02,-8.472299e-02,8.472299e-02,-8.114341e-02,8.114341e-02,-6.795517e-02,6.795517e-02,-7.890130e-02,7.890130e-02,-7.488741e-02,7.488741e-02,-9.281972e-02,9.281972e-02,-9.325498e-02,9.325498e-02,-1.401587e-01,1.401587e-01,-1.176284e-01,1.176284e-01,-8.867597e-02,8.867597e-02,-8.124232e-02,8.124232e-02,-9.441235e-02,9.441235e-02,-8.029452e-02,8.029452e-02,-8.581848e-02,8.581848e-02,-1.029819e-01,1.029819e-01,-9.569118e-02,9.569118e-02,-7.690893e-02,7.690893e-02,-9.018228e-02,9.018228e-02,-1.049209e-01,1.049209e-01,-8.969413e-02,8.969413e-02,-8.651891e-02,8.651891e-02,-8.613331e-02,8.613331e-02,-7.120468e-02,7.120468e-02,-8.743959e-02,8.743959e-02,-7.607158e-02,7.607158e-02,-1.015547e-01,1.015547e-01,-8.090879e-02,8.090879e-02,-7.114079e-02,7.114079e-02,-8.744835e-02,8.744835e-02,-6.074904e-02,6.074904e-02,-6.919871e-02,6.919871e-02,-7.607774e-02,7.607774e-02,-9.444600e-02,9.444600e-02,-7.833429e-02,7.833429e-02,-6.817555e-02,6.817555e-02,-8.997390e-02,8.997390e-02,-9.845223e-02,9.845223e-02,-7.894180e-02,7.894180e-02,-7.921373e-02,7.921373e-02,-7.448032e-02,7.448032e-02,-1.178165e-01,1.178165e-01,-8.216686e-02,8.216686e-02,-8.103286e-02,8.103286e-02,-6.981470e-02,6.981470e-02,-8.709008e-02,8.709008e-02,-8.336259e-02,8.336259e-02,-6.213589e-02,6.213589e-02,-7.068045e-02,7.068045e-02,-6.915676e-02,6.915676e-02,-7.103416e-02,7.103416e-02,-6.523849e-02,6.523849e-02,-7.634760e-02,7.634760e-02,-7.263038e-02,7.263038e-02,-7.164396e-02,7.164396e-02,-8.745559e-02,8.745559e-02,-6.960181e-02,6.960181e-02,-8.500098e-02,8.500098e-02,-6.523260e-02,6.523260e-02,-7.319714e-02,7.319714e-02,-6.268125e-02,6.268125e-02,-7.083135e-02,7.083135e-02,-7.984517e-02,7.984517e-02,-1.256265e-01,1.256265e-01,-1.065412e-01,1.065412e-01,-8.524323e-02,8.524323e-02,-9.291364e-02,9.291364e-02,-7.936567e-02,7.936567e-02,-8.607723e-02,8.607723e-02,-7.583416e-02,7.583416e-02,-7.931928e-02,7.931928e-02,-7.408357e-02,7.408357e-02,-1.034404e-01,1.034404e-01,-1.012127e-01,1.012127e-01,-7.916689e-02,7.916689e-02,-8.753651e-02,8.753651e-02,-6.090366e-02,6.090366e-02,-7.500103e-02,7.500103e-02,-1.228709e-01,1.228709e-01,-6.318201e-02,6.318201e-02,-7.585420e-02,7.585420e-02,-7.089090e-02,7.089090e-02,-1.053542e-01,1.053542e-01,-8.549521e-02,8.549521e-02,-7.906308e-02,7.906308e-02,-6.338780e-02,6.338780e-02,-8.417910e-02,8.417910e-02,-7.115511e-02,7.115511e-02,-7.693949e-02,7.693949e-02,-7.446749e-02,7.446749e-02,-1.037929e-01,1.037929e-01,-7.991005e-02,7.991005e-02,-7.119439e-02,7.119439e-02,-7.071340e-02,7.071340e-02,-8.587362e-02,8.587362e-02,-7.001236e-02,7.001236e-02,-7.567115e-02,7.567115e-02,-7.118930e-02,7.118930e-02,-6.844895e-02,6.844895e-02,-1.035118e-01,1.035118e-01,-8.156618e-02,8.156618e-02,-7.449593e-02,7.449593e-02,-8.154360e-02,8.154360e-02,-9.110878e-02,9.110878e-02,-6.222534e-02,6.222534e-02,-1.033841e-01,1.033841e-01,-6.811687e-02,6.811687e-02,-6.828443e-02,6.828443e-02,-5.769408e-02,5.769408e-02,-5.917684e-02,5.917684e-02,-8.358868e-02,8.358868e-02]}]};
define("libs/face/face", function(){});

define('text!mylibs/preview/views/selectPreview.html',[],function () { return '<div style="width: ${ width }px; " class="preview">\n\t<a></a>\n\t<div><b>${ name }</b></div>\n</div>';});

(function() {

  define('mylibs/postman/postman',[], function() {
    /*		The Postman!
    
    	The postman is a super simple combination of pub/sub and post message. 
    
    	outgoing: the postman simply listens for the /postman/deliver message and dispatches whatever 
    	its contents are as the body of the 'message' object. The address is used by the receiver 
    	to determine who should respond to the message.
    
    	incoming: the postman listens to the post message event on the window and 
    	dispatches the event with the address specified
    */
    var pub;
    return pub = {
      init: function() {
        window.onmessage = function(event) {
          return $.publish(event.data.address, [event.data.message]);
        };
        return $.subscribe("/postman/deliver", function(message, address) {
          message.address = address;
          return window.top.webkitPostMessage(message, "*");
        });
      }
    };
  });

}).call(this);

(function() {

  define('mylibs/stamp/colors',[], function() {
    /*		Colors
    
    	The colors class keeps a collection of 'colors' in an 
    	array. These colors are used to compose the pallet, and specify the
    	values needed by the drawing core to know what color to use
    */
    var Color;
    Color = function(red, green, blue, alpha, cssClass) {
      return {
        r: red,
        g: green,
        b: blue,
        a: alpha,
        css: function() {
          return "rgba(" + this.r + "," + this.g + "," + this.b + "," + this.a + ")";
        },
        "class": function() {
          return cssClass;
        }
      };
    };
    return [new Color(255, 255, 255, 255, "default selected"), new Color(0, 0, 0, 255), new Color(255, 0, 0, 255), new Color(255, 192, 0, 255), new Color(255, 255, 0, 255), new Color(146, 208, 80, 255), new Color(0, 176, 80, 255), new Color(0, 176, 240, 255), new Color(0, 112, 192, 255), new Color(0, 32, 96, 255), new Color(112, 48, 160, 255), new Color(227, 227, 227, 255), new Color(196, 196, 196, 255), new Color(168, 168, 168, 255), new Color(138, 138, 138, 255), new Color(110, 110, 110, 255), new Color(82, 82, 82, 255), new Color(54, 54, 54, 255)];
  });

}).call(this);

define('text!mylibs/stamp/views/stamp.html',[],function () { return '\n<div id="customize">\n\t<div class="row dark">\n\t\t<div class="span6">\n\t\t\t<div class="row centered no-margin">\n\t\t\t\t<div class="canvas"></div>\n\t\t\t\t<div class="yep-nope">\n\t\t\t\t\t<button class="button" data-bind="events: { click: yep }">Yep</button>\n\t\t\t\t\t<button class="button" data-bind="events: { click: nope }">Nope</button>\n\t\t\t\t</div>\n\t\t\t</div>\n\t\t</div>\n\t\t<div class="span4">\n\t\t\t<h3>Brushes</h3>\n\t\t\t<div class="pallet">\n\t\t\t\t# for (var i = 0; i < data.length; i++) { #\n\t\t\t\t\t<div class="pallet-item"><span data-r="${ data[i].r }" data-g="${ data[i].g }" data-b="${ data[i].b }" data-a = "${ data[i].a }" style="background-color: ${ data[i].css() }" data-bind="events: { click: draw }" class="${ data[i].class() }"></span></div>\n\t\t\t\t# } #\n\t\t\t</div>\n\t\t</div>\n\t</div>\n</div>';});

(function() {

  define('mylibs/modal/modal',[], function() {
    var $window, pub;
    $window = {};
    return pub = {
      init: function() {
        return $window = $("<div id='modal'></div>").kendoWindow({
          visible: false,
          modal: true,
          title: "",
          open: function() {
            return $.publish("/app/pause");
          },
          close: function() {
            return $.publish("/app/resume");
          },
          animation: {
            open: {
              effects: "slideIn:up fadeIn",
              duration: 500
            },
            close: {
              effects: "slide:up fadeOut",
              duration: 500
            }
          }
        }).data("kendoWindow").center();
      },
      content: function(content) {
        return $window.content(content);
      },
      show: function() {
        return $window.center().open();
      },
      close: function() {
        return $window.close();
      }
    };
  });

}).call(this);

(function() {

  define('mylibs/assets/assets',[], function() {
    /*		Asset Pipline		
    
    	The asset pipeline recieves base 64 encoded images from the extension and exposes them 
    	locally as images. This is because the sandbox treats any local resources as tainted 
    	and won't allow reading them from a canvas as image data
    */
    var assets, pub;
    assets = {};
    return pub = {
      images: assets,
      init: function() {
        return $.subscribe("/assets/add", function(message) {
          var img;
          img = new Image;
          img.src = message.image;
          return assets[message.name] = img;
        });
      }
    };
  });

}).call(this);

(function() {

  define('libs/webgl/effects',['mylibs/assets/assets', 'libs/face/ccv', 'libs/face/face'], function(assets) {
    var draw, face, faceCore, ghostBuffer, pub, timeStripsBuffer, trackFace, trackHead;
    face = {
      backCanvas: document.createElement("canvas"),
      comp: [],
      lastCanvas: {},
      backCtx: {}
    };
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
      var comp;
      if (face.lastCanvas !== canvas) {
        face.ctx = canvas.getContext("2d");
        face.ccv = null;
      }
      face.ctx.drawImage(video, 0, 0, video.width, video.height);
      face.backCtx.drawImage(video, 0, 0, face.backCanvas.width, face.backCanvas.height);
      if (!pub.isPreview) {
        return comp = ccv.detect_objects({
          canvas: face.backCanvas,
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
        face.backCanvas.width = 200;
        face.backCtx = face.backCanvas.getContext("2d");
        return $.subscribe("/effects/props", function(message) {
          return face.props[message.name].src = message.image;
        });
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
          name: "Bulge",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.bulgePinch(canvas.width / 2, canvas.height / 2, (canvas.width / 2) / 2, .65);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Pinch",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.bulgePinch(canvas.width / 2, canvas.height / 2, (canvas.width / 2) / 2, -.65);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Swirl",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.swirl(canvas.width / 2, canvas.height / 2, (canvas.width / 2) / 2, 3);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Zoom Blur",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.zoomBlur(canvas.width / 2, canvas.height / 2, 2, canvas.height / 5);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Blockhead",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.blockhead(canvas.width / 2, canvas.height / 2, 200, 300, 1);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Mirror Left",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.mirror(0);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Mirror Pinch (Evil)",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              canvas.bulgePinch(canvas.width / 2, canvas.height / 2, (canvas.width / 2) / 2, -.65);
              return canvas.mirror(0);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Mirror Top",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.mirror(Math.PI * .5);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Mirror Bottom",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.mirror(Math.PI * 1.5);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Mirror Tube",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.mirrorTube(canvas.width / 2, canvas.height / 2, canvas.height / 4);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Quad",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.quadRotate(0, 0, 0, 0);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Quad Color",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.quadColor([1, .2, .1], [0, .8, 0], [.25, .5, 1], [.8, .8, .8]);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Comix",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              canvas.quadRotate(0, 0, 0, 0);
              canvas.denoise(50);
              return canvas.ink(.5);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "I Dont' Know",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              canvas.quadRotate(0, 1, 3, 2);
              return canvas.quadRotate(2, 3, 1, 0);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Sketch Book",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              canvas.edgeWork(2);
              return canvas.sepia();
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Color Half Tone",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.colorHalftone(canvas.width / 2, canvas.height / 2, .30, 3);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Pixelate",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.pixelate(canvas.width / 2, canvas.height / 2, 10);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Hope Poster",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.hopePoster();
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Photocopy",
          kind: "webgl",
          filter: function(canvas, element, frame) {
            var effect;
            effect = function() {
              return canvas.photocopy(.5, frame);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Old Film",
          kind: "webgl",
          filter: function(canvas, element, frame) {
            var effect;
            effect = function() {
              return canvas.oldFilm(frame);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "VHS",
          kind: "webgl",
          filter: function(canvas, element, frame) {
            var effect;
            effect = function() {
              return canvas.vhs(frame);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Time Strips",
          kind: "webgl",
          filter: function(canvas, element, frame) {
            var effect;
            effect = function() {
              var createBuffers;
              createBuffers = function(length) {
                var _results;
                _results = [];
                while (timeStripsBuffer.length < length) {
                  _results.push(timeStripsBuffer.push(canvas.texture(element)));
                }
                return _results;
              };
              createBuffers(32);
              timeStripsBuffer[frame++ % timeStripsBuffer.length].loadContentsOf(element);
              canvas.timeStrips(timeStripsBuffer, frame);
              return canvas.matrixWarp([-1, 0, 0, 1], false, true);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Your Ghost",
          kind: "webgl",
          filter: function(canvas, element, frame) {
            var effect;
            effect = function() {
              var createBuffers;
              createBuffers = function(length) {
                var _results;
                _results = [];
                while (ghostBuffer.length < length) {
                  _results.push(ghostBuffer.push(canvas.texture(element)));
                }
                return _results;
              };
              createBuffers(32);
              ghostBuffer[frame++ % ghostBuffer.length].loadContentsOf(element);
              canvas.matrixWarp([1, 0, 0, 1], false, true);
              canvas.blend(ghostBuffer[frame % ghostBuffer.length], .5);
              return canvas.matrixWarp([-1, 0, 0, 1], false, true);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Chromed",
          kind: "webgl",
          filter: function(canvas, element, frame) {
            var effect;
            effect = function() {
              return canvas.chromeLogo(canvas.width / 2, canvas.height / 2, frame, canvas.height / 2.5);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Kaleidoscope",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.kaleidoscope(canvas.width / 2, canvas.height / 2, 200, 0);
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "Inverted",
          kind: "webgl",
          filter: function(canvas, element) {
            var effect;
            effect = function() {
              return canvas.invert();
            };
            return draw(canvas, element, effect);
          }
        }, {
          name: "In Disguise",
          kind: "face",
          filter: function(canvas, video) {
            return trackFace(video, canvas, assets.images.glasses, 0, 0, 1, 1);
          }
        }, {
          name: "Horns",
          kind: "face",
          filter: function(canvas, video) {
            return trackHead(video, canvas, assets.images.horns, 0, 25, 0, 0);
          }
        }, {
          name: "Hipsterizer",
          kind: "face",
          filter: function(canvas, video) {
            return trackFace(video, canvas, assets.images.hipster, 0, 0, 1, 2.2);
          }
        }
      ]
    };
  });

}).call(this);

(function() {

  define('mylibs/preview/preview',['mylibs/utils/utils', 'libs/webgl/effects', 'libs/webgl/glfx.min'], function(utils, effects) {
    /*     Preview
    
    Shows the large video with selected effect giving the user the chance to take 
    a snapshot or a photostrip
    */
    var $container, canvas, click, ctx, currentCanvas, draw, frame, height, paused, preview, pub, webgl, width;
    $container = {};
    canvas = {};
    ctx = {};
    webgl = {};
    paused = true;
    preview = {};
    width = 460;
    height = 340;
    frame = 0;
    currentCanvas = {};
    click = document.createElement("audio");
    draw = function() {
      if (!paused) {
        ctx.drawImage(window.HTML5CAMERA.canvas, 0, 0, width, height);
        frame++;
        if (preview.kind === "face") {
          preview.filter(canvas, window.HTML5CAMERA.canvas);
        } else {
          preview.filter(webgl, canvas, frame);
        }
      }
      return utils.getAnimationFrame()(draw);
    };
    return pub = {
      init: function(container) {
        var $footer, $header, $mask, $preview;
        click.src = "sounds/click.mp3";
        click.buffer = "auto";
        canvas = document.createElement("canvas");
        ctx = canvas.getContext("2d");
        $container = $("#" + container);
        $header = $container.find(".header");
        $preview = $container.find(".body");
        $mask = $container.find(".mask");
        $footer = $container.find(".footer");
        webgl = fx.canvas();
        $preview.append(canvas);
        $preview.append(webgl);
        $.subscribe("/preview/show", function(e) {
          effects.isPreview = false;
          effects.clearBuffer();
          $.extend(preview, e);
          if (preview.kind === "face") {
            $(webgl).hide();
            $(canvas).show();
            currentCanvas = canvas;
          } else {
            $(webgl).show();
            $(canvas).hide();
            currentCanvas = webgl;
          }
          paused = false;
          canvas.width = width;
          canvas.height = height;
          $header.kendoStop(true).kendoAnimate({
            effects: "fadeIn",
            show: true,
            duration: 500
          });
          $preview.kendoStop(true).kendoAnimate({
            effects: "zoomIn fadeIn",
            show: true,
            duration: 500
          });
          return $footer.kendoStop(true).kendoAnimate({
            effects: "slideIn:up fadeIn",
            show: true,
            duration: 500,
            complete: function() {
              return $("footer").kendoStop(true).kendoAnimate({
                effects: "fadeIn",
                show: true,
                duration: 200
              });
            }
          });
        });
        $container.find("#effects").click(function() {
          paused = true;
          $("footer").kendoStop(true).kendoAnimate({
            effects: "fadeOut",
            hide: true,
            duration: 200
          });
          $header.kendoStop(true).kendoAnimate({
            effects: "fadeOut",
            hide: true,
            duration: 500
          });
          $preview.kendoStop(true).kendoAnimate({
            effects: "zoomOut fadeOut",
            hide: true,
            duration: 500
          });
          $footer.kendoStop(true).kendoAnimate({
            effects: "slide:down fadeOut",
            hide: true,
            duration: 500
          });
          return $.publish("/selectPreview/show");
        });
        $.subscribe("/preview/snapshot", function() {
          var callback;
          $.publish("/controls/enable", [false]);
          callback = function() {
            click.play();
            return $mask.fadeIn(50, function() {
              $mask.fadeOut(900);
              $.publish("/pictures/create", [
                {
                  image: currentCanvas.toDataURL(),
                  name: null,
                  photoStrip: false,
                  save: true
                }
              ]);
              return $.publish("/controls/enable", [true]);
            });
          };
          return $.publish("/camera/countdown", [3, callback]);
        });
        $.subscribe("/preview/photobooth", function() {
          var callback, images, photoNumber;
          $.publish("/controls/enable", [false]);
          images = [];
          photoNumber = 4;
          callback = function() {
            click.play();
            --photoNumber;
            return $mask.fadeIn(50, function() {
              return $mask.fadeOut(900, function() {
                images.push(currentCanvas.toDataURL());
                if (photoNumber > 0) {
                  return $.publish("/camera/countdown", [3, callback]);
                } else {
                  $.publish("/photobooth/create", [images]);
                  return $.publish("/controls/enable", [true]);
                }
              });
            });
          };
          return $.publish("/camera/countdown", [3, callback]);
        });
        return draw();
      }
    };
  });

}).call(this);

(function() {

  define('mylibs/preview/selectPreview',['libs/webgl/effects', 'mylibs/utils/utils', 'text!mylibs/preview/views/selectPreview.html'], function(effects, utils, template) {
    /*     Select Preview
    
    Select preview shows pages of 6 live previews using webgl effects
    */
    var $container, canvas, ctx, direction, draw, frame, height, pageAnimation, paused, previews, pub, webgl, width;
    paused = false;
    canvas = {};
    ctx = {};
    previews = [];
    $container = {};
    webgl = fx.canvas();
    frame = 0;
    width = 200;
    height = 150;
    direction = "left";
    pageAnimation = function() {
      return {
        pageOut: "slide:" + direction + " fadeOut",
        pageIn: "slideIn:" + direction + " fadeIn"
      };
    };
    draw = function() {
      var preview, _i, _len;
      if (!paused) {
        ctx.drawImage(window.HTML5CAMERA.canvas, 0, 0, width, height);
        for (_i = 0, _len = previews.length; _i < _len; _i++) {
          preview = previews[_i];
          frame++;
          if (preview.kind === "face") {
            preview.filter(preview.canvas, canvas);
          } else {
            preview.filter(preview.canvas, canvas, frame);
          }
        }
      }
      return utils.getAnimationFrame()(draw);
    };
    return pub = {
      draw: function() {
        return draw();
      },
      init: function(containerId) {
        var $buttons, $currentPage, $nextPage, ds;
        effects.init();
        canvas = document.createElement("canvas");
        ctx = canvas.getContext("2d");
        $.subscribe("/selectPreview/show", function() {
          canvas.width = width;
          canvas.height = height;
          return $container.kendoStop(true).kendoAnimate({
            effects: "zoomIn fadeIn",
            show: true,
            duration: 500,
            complete: function() {
              $("footer").kendoStop(true).kendoAnimate({
                effects: "fadeIn",
                show: true,
                duration: 200
              });
              paused = false;
              return effects.isPreview = true;
            }
          });
        });
        $container = $("#" + containerId);
        $buttons = $container.find("button");
        canvas.width = width;
        canvas.height = height;
        $currentPage = {};
        $nextPage = {};
        ds = new kendo.data.DataSource({
          data: effects.data,
          pageSize: 6,
          change: function() {
            var item, _i, _len, _ref, _results;
            $currentPage = $container.find(".current-page");
            $nextPage = $container.find(".next-page");
            paused = true;
            previews = [];
            _ref = this.view();
            _results = [];
            for (_i = 0, _len = _ref.length; _i < _len; _i++) {
              item = _ref[_i];
              _results.push((function() {
                var $content, $template, content, preview;
                $template = kendo.template(template);
                preview = {};
                $.extend(preview, item);
                if (item.kind === "face") {
                  preview.canvas = document.createElement("canvas");
                  preview.canvas.width = 200;
                  preview.canvas.height = 150;
                } else {
                  preview.canvas = fx.canvas();
                }
                content = $template({
                  name: preview.name,
                  width: width,
                  height: height
                });
                $content = $(content);
                previews.push(preview);
                $content.find("a").append(preview.canvas).click(function() {
                  paused = true;
                  $("footer").kendoStop(true).kendoAnimate({
                    effects: "fadeOut",
                    hide: true,
                    duration: 200
                  });
                  $container.kendoStop(true).kendoAnimate({
                    effects: "zoomOut fadeOut",
                    hide: true,
                    duration: 500
                  });
                  return $.publish("/preview/show", [preview]);
                });
                $nextPage.append($content);
                $currentPage.kendoStop(true).kendoAnimate({
                  effects: "" + (pageAnimation().pageOut),
                  duration: 500,
                  hide: true,
                  complete: function() {
                    $currentPage.removeClass("current-page").addClass("next-page");
                    return $currentPage.find(".preview").remove();
                  }
                });
                return $nextPage.kendoStop(true).kendoAnimate({
                  effects: "" + (pageAnimation().pageIn),
                  duration: 500,
                  show: true,
                  complete: function() {
                    $nextPage.removeClass("next-page").addClass("current-page");
                    effects.clearBuffer();
                    paused = false;
                    return $buttons.removeAttr("disabled");
                  }
                });
              })());
            }
            return _results;
          }
        });
        /* Pager Actions
        */
        $container.on("click", ".more", function() {
          $buttons.attr("disabled", "disabled");
          paused = true;
          direction = "left";
          if (ds.page() < ds.totalPages()) {
            return ds.page(ds.page() + 1);
          } else {
            return ds.page(1);
          }
        });
        $container.on("click", ".back", function() {
          $buttons.attr("disabled", "disabled");
          paused = true;
          direction = "right";
          if (ds.page() === 1) {
            return ds.page(ds.totalPages());
          } else {
            return ds.page(ds.page() - 1);
          }
        });
        return ds.read();
      }
    };
  });

}).call(this);

(function() {

  define('mylibs/camera/camera',['mylibs/preview/selectPreview', 'mylibs/preview/preview'], function(selectPreview, preview) {
    /*     Camera
    
    The camera module takes care of getting the users media and drawing it to a canvas.
    It also handles the coutdown that is intitiated
    */
    var $counter, beep, canvas, countdown, ctx, paused, pub, turnOn, utils;
    $counter = {};
    utils = {};
    canvas = {};
    ctx = {};
    beep = document.createElement("audio");
    paused = false;
    turnOn = function(callback, testing) {
      window.HTML5CAMERA.canvas = canvas;
      $.subscribe("/camera/update", function(message) {
        var imgData, videoData;
        imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        videoData = new Uint8ClampedArray(message.image);
        imgData.data.set(videoData);
        return ctx.putImageData(imgData, 0, 0);
      });
      return callback();
    };
    countdown = function(num, callback) {
      var counters, index;
      beep.play();
      counters = $counter.find("span");
      index = counters.length - num;
      return $(counters[index]).css("opacity", "1").animate({
        opacity: .1
      }, 1000, function() {
        if (num > 1) {
          num--;
          return countdown(num, callback);
        } else {
          return callback();
        }
      });
    };
    return pub = {
      init: function(counter, callback) {
        $counter = $("#" + counter);
        beep.src = "sounds/beep.mp3";
        beep.buffer = "auto";
        canvas = document.createElement("canvas");
        canvas.width = 460;
        canvas.height = 340;
        ctx = canvas.getContext("2d");
        turnOn(callback, true);
        return $.subscribe("/camera/countdown", function(num, hollaback) {
          return countdown(num, hollaback);
        });
      }
    };
  });

}).call(this);

/*
 RequireJS order 1.0.5 Copyright (c) 2010-2011, The Dojo Foundation All Rights Reserved.
 Available via the MIT or new BSD license.
 see: http://github.com/jrburke/requirejs for details
*/
(function(){function k(a){var b=a.currentTarget||a.srcElement,c;if(a.type==="load"||l.test(b.readyState)){a=b.getAttribute("data-requiremodule");j[a]=!0;for(a=0;c=g[a];a++)if(j[c.name])c.req([c.name],c.onLoad);else break;a>0&&g.splice(0,a);setTimeout(function(){b.parentNode.removeChild(b)},15)}}function m(a){var b,c;a.setAttribute("data-orderloaded","loaded");for(a=0;c=h[a];a++)if((b=i[c])&&b.getAttribute("data-orderloaded")==="loaded")delete i[c],require.addScriptToDom(b);else break;a>0&&h.splice(0,
a)}var f=typeof document!=="undefined"&&typeof window!=="undefined"&&document.createElement("script"),n=f&&(f.async||window.opera&&Object.prototype.toString.call(window.opera)==="[object Opera]"||"MozAppearance"in document.documentElement.style),o=f&&f.readyState==="uninitialized",l=/^(complete|loaded)$/,g=[],j={},i={},h=[],f=null;define('order',{version:"1.0.5",load:function(a,b,c,e){var d;b.nameToUrl?(d=b.nameToUrl(a,null),require.s.skipAsync[d]=!0,n||e.isBuild?b([a],c):o?(e=require.s.contexts._,!e.urlFetched[d]&&
!e.loaded[a]&&(e.urlFetched[d]=!0,require.resourcesReady(!1),e.scriptCount+=1,d=require.attach(d,e,a,null,null,m),i[a]=d,h.push(a)),b([a],c)):b.specified(a)?b([a],c):(g.push({name:a,req:b,onLoad:c}),require.attach(d,null,a,k,"script/cache"))):b([a],c)}})})();

/*	

	jQuery pub/sub plugin by Peter Higgins (dante@dojotoolkit.org)

	Loosely based on Dojo publish/subscribe API, limited in scope. Rewritten blindly.

	Original is (c) Dojo Foundation 2004-2010. Released under either AFL or new BSD, see:
	http://dojofoundation.org/license for more information.

*/	

;(function(d){

	// the topic/subscription hash
	var cache = {};

	d.publish = function(/* String */topic, /* Array? */args){
		// summary: 
		//		Publish some data on a named topic.
		// topic: String
		//		The channel to publish on
		// args: Array?
		//		The data to publish. Each array item is converted into an ordered
		//		arguments on the subscribed functions. 
		//
		// example:
		//		Publish stuff on '/some/topic'. Anything subscribed will be called
		//		with a function signature like: function(a,b,c){ ... }
		//
		//	|		$.publish("/some/topic", ["a","b","c"]);
		cache[topic] && d.each(cache[topic], function(){
			this.apply(d, args || []);
		});
	};

	d.subscribe = function(/* String */topic, /* Function */callback){
		// summary:
		//		Register a callback on a named topic.
		// topic: String
		//		The channel to subscribe to
		// callback: Function
		//		The handler event. Anytime something is $.publish'ed on a 
		//		subscribed channel, the callback will be called with the
		//		published array as ordered arguments.
		//
		// returns: Array
		//		A handle which can be used to unsubscribe this particular subscription.
		//	
		// example:
		//	|	$.subscribe("/some/topic", function(a, b, c){ /* handle data */ });
		//
		if(!cache[topic]){
			cache[topic] = [];
		}
		cache[topic].push(callback);
		return [topic, callback]; // Array
	};

	d.unsubscribe = function(/* Array */handle){
		// summary:
		//		Disconnect a subscribed function for a topic.
		// handle: Array
		//		The return value from a $.subscribe call.
		// example:
		//	|	var handle = $.subscribe("/something", function(){});
		//	|	$.unsubscribe(handle);

		var t = handle[0];
		cache[t] && d.each(cache[t], function(idx){
			if(this == handle[1]){
				cache[t].splice(idx, 1);
			}
		});
	};

})(jQuery);

define("libs/jquery/pubsub", function(){});

!function(a){a(function(){"use strict",a.support.transition=function(){var b=document.body||document.documentElement,c=b.style,d=c.transition!==undefined||c.WebkitTransition!==undefined||c.MozTransition!==undefined||c.MsTransition!==undefined||c.OTransition!==undefined;return d&&{end:function(){var b="TransitionEnd";return a.browser.webkit?b="webkitTransitionEnd":a.browser.mozilla?b="transitionend":a.browser.opera&&(b="oTransitionEnd"),b}()}}()})}(window.jQuery),!function(a){var b='[data-dismiss="alert"]',c=function(c){a(c).on("click",b,this.close)};c.prototype={constructor:c,close:function(b){function f(){e.remove(),e.trigger("closed")}var c=a(this),d=c.attr("data-target"),e;d||(d=c.attr("href"),d=d&&d.replace(/.*(?=#[^\s]*$)/,"")),e=a(d),e.trigger("close"),b&&b.preventDefault(),e.length||(e=c.hasClass("alert")?c:c.parent()),e.removeClass("in"),a.support.transition&&e.hasClass("fade")?e.on(a.support.transition.end,f):f()}},a.fn.alert=function(b){return this.each(function(){var d=a(this),e=d.data("alert");e||d.data("alert",e=new c(this)),typeof b=="string"&&e[b].call(d)})},a.fn.alert.Constructor=c,a(function(){a("body").on("click.alert.data-api",b,c.prototype.close)})}(window.jQuery),!function(a){var b=function(b,c){this.$element=a(b),this.options=a.extend({},a.fn.button.defaults,c)};b.prototype={constructor:b,setState:function(a){var b="disabled",c=this.$element,d=c.data(),e=c.is("input")?"val":"html";a+="Text",d.resetText||c.data("resetText",c[e]()),c[e](d[a]||this.options[a]),setTimeout(function(){a=="loadingText"?c.addClass(b).attr(b,b):c.removeClass(b).removeAttr(b)},0)},toggle:function(){var a=this.$element.parent('[data-toggle="buttons-radio"]');a&&a.find(".active").removeClass("active"),this.$element.toggleClass("active")}},a.fn.button=function(c){return this.each(function(){var d=a(this),e=d.data("button"),f=typeof c=="object"&&c;e||d.data("button",e=new b(this,f)),c=="toggle"?e.toggle():c&&e.setState(c)})},a.fn.button.defaults={loadingText:"loading..."},a.fn.button.Constructor=b,a(function(){a("body").on("click.button.data-api","[data-toggle^=button]",function(b){a(b.target).button("toggle")})})}(window.jQuery),!function(a){var b=function(b,c){this.$element=a(b),this.options=a.extend({},a.fn.carousel.defaults,c),this.options.slide&&this.slide(this.options.slide)};b.prototype={cycle:function(){return this.interval=setInterval(a.proxy(this.next,this),this.options.interval),this},to:function(b){var c=this.$element.find(".active"),d=c.parent().children(),e=d.index(c),f=this;if(b>d.length-1||b<0)return;return this.sliding?this.$element.one("slid",function(){f.to(b)}):e==b?this.pause().cycle():this.slide(b>e?"next":"prev",a(d[b]))},pause:function(){return clearInterval(this.interval),this},next:function(){if(this.sliding)return;return this.slide("next")},prev:function(){if(this.sliding)return;return this.slide("prev")},slide:function(b,c){var d=this.$element.find(".active"),e=c||d[b](),f=this.interval,g=b=="next"?"left":"right",h=b=="next"?"first":"last",i=this;return this.sliding=!0,f&&this.pause(),e=e.length?e:this.$element.find(".item")[h](),!a.support.transition&&this.$element.hasClass("slide")?(this.$element.trigger("slide"),d.removeClass("active"),e.addClass("active"),this.sliding=!1,this.$element.trigger("slid")):(e.addClass(b),e[0].offsetWidth,d.addClass(g),e.addClass(g),this.$element.trigger("slide"),this.$element.one(a.support.transition.end,function(){e.removeClass([b,g].join(" ")).addClass("active"),d.removeClass(["active",g].join(" ")),i.sliding=!1,setTimeout(function(){i.$element.trigger("slid")},0)})),f&&this.cycle(),this}},a.fn.carousel=function(c){return this.each(function(){var d=a(this),e=d.data("carousel"),f=typeof c=="object"&&c;e||d.data("carousel",e=new b(this,f)),typeof c=="number"?e.to(c):typeof c=="string"||(c=f.slide)?e[c]():e.cycle()})},a.fn.carousel.defaults={interval:5e3},a.fn.carousel.Constructor=b,a(function(){a("body").on("click.carousel.data-api","[data-slide]",function(b){var c=a(this),d,e=a(c.attr("data-target")||(d=c.attr("href"))&&d.replace(/.*(?=#[^\s]+$)/,"")),f=!e.data("modal")&&a.extend({},e.data(),c.data());e.carousel(f),b.preventDefault()})})}(window.jQuery),!function(a){var b=function(b,c){this.$element=a(b),this.options=a.extend({},a.fn.collapse.defaults,c),this.options.parent&&(this.$parent=a(this.options.parent)),this.options.toggle&&this.toggle()};b.prototype={constructor:b,dimension:function(){var a=this.$element.hasClass("width");return a?"width":"height"},show:function(){var b=this.dimension(),c=a.camelCase(["scroll",b].join("-")),d=this.$parent&&this.$parent.find(".in"),e;d&&d.length&&(e=d.data("collapse"),d.collapse("hide"),e||d.data("collapse",null)),this.$element[b](0),this.transition("addClass","show","shown"),this.$element[b](this.$element[0][c])},hide:function(){var a=this.dimension();this.reset(this.$element[a]()),this.transition("removeClass","hide","hidden"),this.$element[a](0)},reset:function(a){var b=this.dimension();this.$element.removeClass("collapse")[b](a||"auto")[0].offsetWidth,this.$element.addClass("collapse")},transition:function(b,c,d){var e=this,f=function(){c=="show"&&e.reset(),e.$element.trigger(d)};this.$element.trigger(c)[b]("in"),a.support.transition&&this.$element.hasClass("collapse")?this.$element.one(a.support.transition.end,f):f()},toggle:function(){this[this.$element.hasClass("in")?"hide":"show"]()}},a.fn.collapse=function(c){return this.each(function(){var d=a(this),e=d.data("collapse"),f=typeof c=="object"&&c;e||d.data("collapse",e=new b(this,f)),typeof c=="string"&&e[c]()})},a.fn.collapse.defaults={toggle:!0},a.fn.collapse.Constructor=b,a(function(){a("body").on("click.collapse.data-api","[data-toggle=collapse]",function(b){var c=a(this),d,e=c.attr("data-target")||b.preventDefault()||(d=c.attr("href"))&&d.replace(/.*(?=#[^\s]+$)/,""),f=a(e).data("collapse")?"toggle":c.data();a(e).collapse(f)})})}(window.jQuery),!function(a){function d(){a(b).parent().removeClass("open")}var b='[data-toggle="dropdown"]',c=function(b){var c=a(b).on("click.dropdown.data-api",this.toggle);a("html").on("click.dropdown.data-api",function(){c.parent().removeClass("open")})};c.prototype={constructor:c,toggle:function(b){var c=a(this),e=c.attr("data-target"),f,g;return e||(e=c.attr("href"),e=e&&e.replace(/.*(?=#[^\s]*$)/,"")),f=a(e),f.length||(f=c.parent()),g=f.hasClass("open"),d(),!g&&f.toggleClass("open"),!1}},a.fn.dropdown=function(b){return this.each(function(){var d=a(this),e=d.data("dropdown");e||d.data("dropdown",e=new c(this)),typeof b=="string"&&e[b].call(d)})},a.fn.dropdown.Constructor=c,a(function(){a("html").on("click.dropdown.data-api",d),a("body").on("click.dropdown.data-api",b,c.prototype.toggle)})}(window.jQuery),!function(a){function c(){var b=this,c=setTimeout(function(){b.$element.off(a.support.transition.end),d.call(b)},500);this.$element.one(a.support.transition.end,function(){clearTimeout(c),d.call(b)})}function d(a){this.$element.hide().trigger("hidden"),e.call(this)}function e(b){var c=this,d=this.$element.hasClass("fade")?"fade":"";if(this.isShown&&this.options.backdrop){var e=a.support.transition&&d;this.$backdrop=a('<div class="modal-backdrop '+d+'" />').appendTo(document.body),this.options.backdrop!="static"&&this.$backdrop.click(a.proxy(this.hide,this)),e&&this.$backdrop[0].offsetWidth,this.$backdrop.addClass("in"),e?this.$backdrop.one(a.support.transition.end,b):b()}else!this.isShown&&this.$backdrop?(this.$backdrop.removeClass("in"),a.support.transition&&this.$element.hasClass("fade")?this.$backdrop.one(a.support.transition.end,a.proxy(f,this)):f.call(this)):b&&b()}function f(){this.$backdrop.remove(),this.$backdrop=null}function g(){var b=this;this.isShown&&this.options.keyboard?a(document).on("keyup.dismiss.modal",function(a){a.which==27&&b.hide()}):this.isShown||a(document).off("keyup.dismiss.modal")}var b=function(b,c){this.options=a.extend({},a.fn.modal.defaults,c),this.$element=a(b).delegate('[data-dismiss="modal"]',"click.dismiss.modal",a.proxy(this.hide,this))};b.prototype={constructor:b,toggle:function(){return this[this.isShown?"hide":"show"]()},show:function(){var b=this;if(this.isShown)return;a("body").addClass("modal-open"),this.isShown=!0,this.$element.trigger("show"),g.call(this),e.call(this,function(){var c=a.support.transition&&b.$element.hasClass("fade");!b.$element.parent().length&&b.$element.appendTo(document.body),b.$element.show(),c&&b.$element[0].offsetWidth,b.$element.addClass("in"),c?b.$element.one(a.support.transition.end,function(){b.$element.trigger("shown")}):b.$element.trigger("shown")})},hide:function(b){b&&b.preventDefault();if(!this.isShown)return;var e=this;this.isShown=!1,a("body").removeClass("modal-open"),g.call(this),this.$element.trigger("hide").removeClass("in"),a.support.transition&&this.$element.hasClass("fade")?c.call(this):d.call(this)}},a.fn.modal=function(c){return this.each(function(){var d=a(this),e=d.data("modal"),f=typeof c=="object"&&c;e||d.data("modal",e=new b(this,f)),typeof c=="string"?e[c]():e.show()})},a.fn.modal.defaults={backdrop:!0,keyboard:!0},a.fn.modal.Constructor=b,a(function(){a("body").on("click.modal.data-api",'[data-toggle="modal"]',function(b){var c=a(this),d,e=a(c.attr("data-target")||(d=c.attr("href"))&&d.replace(/.*(?=#[^\s]+$)/,"")),f=e.data("modal")?"toggle":a.extend({},e.data(),c.data());b.preventDefault(),e.modal(f)})})}(window.jQuery),!function(a){var b=function(a,b){this.init("tooltip",a,b)};b.prototype={constructor:b,init:function(b,c,d){var e,f;this.type=b,this.$element=a(c),this.options=this.getOptions(d),this.enabled=!0,this.options.trigger!="manual"&&(e=this.options.trigger=="hover"?"mouseenter":"focus",f=this.options.trigger=="hover"?"mouseleave":"blur",this.$element.on(e,this.options.selector,a.proxy(this.enter,this)),this.$element.on(f,this.options.selector,a.proxy(this.leave,this))),this.options.selector?this._options=a.extend({},this.options,{trigger:"manual",selector:""}):this.fixTitle()},getOptions:function(b){return b=a.extend({},a.fn[this.type].defaults,b,this.$element.data()),b.delay&&typeof b.delay=="number"&&(b.delay={show:b.delay,hide:b.delay}),b},enter:function(b){var c=a(b.currentTarget)[this.type](this._options).data(this.type);!c.options.delay||!c.options.delay.show?c.show():(c.hoverState="in",setTimeout(function(){c.hoverState=="in"&&c.show()},c.options.delay.show))},leave:function(b){var c=a(b.currentTarget)[this.type](this._options).data(this.type);!c.options.delay||!c.options.delay.hide?c.hide():(c.hoverState="out",setTimeout(function(){c.hoverState=="out"&&c.hide()},c.options.delay.hide))},show:function(){var a,b,c,d,e,f,g;if(this.hasContent()&&this.enabled){a=this.tip(),this.setContent(),this.options.animation&&a.addClass("fade"),f=typeof this.options.placement=="function"?this.options.placement.call(this,a[0],this.$element[0]):this.options.placement,b=/in/.test(f),a.remove().css({top:0,left:0,display:"block"}).appendTo(b?this.$element:document.body),c=this.getPosition(b),d=a[0].offsetWidth,e=a[0].offsetHeight;switch(b?f.split(" ")[1]:f){case"bottom":g={top:c.top+c.height,left:c.left+c.width/2-d/2};break;case"top":g={top:c.top-e,left:c.left+c.width/2-d/2};break;case"left":g={top:c.top+c.height/2-e/2,left:c.left-d};break;case"right":g={top:c.top+c.height/2-e/2,left:c.left+c.width}}a.css(g).addClass(f).addClass("in")}},setContent:function(){var a=this.tip();a.find(".tooltip-inner").html(this.getTitle()),a.removeClass("fade in top bottom left right")},hide:function(){function d(){var b=setTimeout(function(){c.off(a.support.transition.end).remove()},500);c.one(a.support.transition.end,function(){clearTimeout(b),c.remove()})}var b=this,c=this.tip();c.removeClass("in"),a.support.transition&&this.$tip.hasClass("fade")?d():c.remove()},fixTitle:function(){var a=this.$element;(a.attr("title")||typeof a.attr("data-original-title")!="string")&&a.attr("data-original-title",a.attr("title")||"").removeAttr("title")},hasContent:function(){return this.getTitle()},getPosition:function(b){return a.extend({},b?{top:0,left:0}:this.$element.offset(),{width:this.$element[0].offsetWidth,height:this.$element[0].offsetHeight})},getTitle:function(){var a,b=this.$element,c=this.options;return a=b.attr("data-original-title")||(typeof c.title=="function"?c.title.call(b[0]):c.title),a=a.toString().replace(/(^\s*|\s*$)/,""),a},tip:function(){return this.$tip=this.$tip||a(this.options.template)},validate:function(){this.$element[0].parentNode||(this.hide(),this.$element=null,this.options=null)},enable:function(){this.enabled=!0},disable:function(){this.enabled=!1},toggleEnabled:function(){this.enabled=!this.enabled},toggle:function(){this[this.tip().hasClass("in")?"hide":"show"]()}},a.fn.tooltip=function(c){return this.each(function(){var d=a(this),e=d.data("tooltip"),f=typeof c=="object"&&c;e||d.data("tooltip",e=new b(this,f)),typeof c=="string"&&e[c]()})},a.fn.tooltip.Constructor=b,a.fn.tooltip.defaults={animation:!0,delay:0,selector:!1,placement:"top",trigger:"hover",title:"",template:'<div class="tooltip"><div class="tooltip-arrow"></div><div class="tooltip-inner"></div></div>'}}(window.jQuery),!function(a){var b=function(a,b){this.init("popover",a,b)};b.prototype=a.extend({},a.fn.tooltip.Constructor.prototype,{constructor:b,setContent:function(){var b=this.tip(),c=this.getTitle(),d=this.getContent();b.find(".popover-title")[a.type(c)=="object"?"append":"html"](c),b.find(".popover-content > *")[a.type(d)=="object"?"append":"html"](d),b.removeClass("fade top bottom left right in")},hasContent:function(){return this.getTitle()||this.getContent()},getContent:function(){var a,b=this.$element,c=this.options;return a=b.attr("data-content")||(typeof c.content=="function"?c.content.call(b[0]):c.content),a=a.toString().replace(/(^\s*|\s*$)/,""),a},tip:function(){return this.$tip||(this.$tip=a(this.options.template)),this.$tip}}),a.fn.popover=function(c){return this.each(function(){var d=a(this),e=d.data("popover"),f=typeof c=="object"&&c;e||d.data("popover",e=new b(this,f)),typeof c=="string"&&e[c]()})},a.fn.popover.Constructor=b,a.fn.popover.defaults=a.extend({},a.fn.tooltip.defaults,{placement:"right",content:"",template:'<div class="popover"><div class="arrow"></div><div class="popover-inner"><h3 class="popover-title"></h3><div class="popover-content"><p></p></div></div></div>'})}(window.jQuery),!function(a){function b(b,c){var d=a.proxy(this.process,this),e=a(b).is("body")?a(window):a(b),f;this.options=a.extend({},a.fn.scrollspy.defaults,c),this.$scrollElement=e.on("scroll.scroll.data-api",d),this.selector=(this.options.target||(f=a(b).attr("href"))&&f.replace(/.*(?=#[^\s]+$)/,"")||"")+" .nav li > a",this.$body=a("body").on("click.scroll.data-api",this.selector,d),this.refresh(),this.process()}"use strict",b.prototype={constructor:b,refresh:function(){this.targets=this.$body.find(this.selector).map(function(){var b=a(this).attr("href");return/^#\w/.test(b)&&a(b).length?b:null}),this.offsets=a.map(this.targets,function(b){return a(b).position().top})},process:function(){var a=this.$scrollElement.scrollTop()+this.options.offset,b=this.offsets,c=this.targets,d=this.activeTarget,e;for(e=b.length;e--;)d!=c[e]&&a>=b[e]&&(!b[e+1]||a<=b[e+1])&&this.activate(c[e])},activate:function(a){var b;this.activeTarget=a,this.$body.find(this.selector).parent(".active").removeClass("active"),b=this.$body.find(this.selector+'[href="'+a+'"]').parent("li").addClass("active"),b.parent(".dropdown-menu")&&b.closest("li.dropdown").addClass("active")}},a.fn.scrollspy=function(c){return this.each(function(){var d=a(this),e=d.data("scrollspy"),f=typeof c=="object"&&c;e||d.data("scrollspy",e=new b(this,f)),typeof c=="string"&&e[c]()})},a.fn.scrollspy.Constructor=b,a.fn.scrollspy.defaults={offset:10},a(function(){a('[data-spy="scroll"]').each(function(){var b=a(this);b.scrollspy(b.data())})})}(window.jQuery),!function(a){var b=function(b){this.element=a(b)};b.prototype={constructor:b,show:function(){var b=this.element,c=b.closest("ul:not(.dropdown-menu)"),d=b.attr("data-target"),e,f;d||(d=b.attr("href"),d=d&&d.replace(/.*(?=#[^\s]*$)/,""));if(b.parent("li").hasClass("active"))return;e=c.find(".active a").last()[0],b.trigger({type:"show",relatedTarget:e}),f=a(d),this.activate(b.parent("li"),c),this.activate(f,f.parent(),function(){b.trigger({type:"shown",relatedTarget:e})})},activate:function(b,c,d){function g(){e.removeClass("active").find("> .dropdown-menu > .active").removeClass("active"),b.addClass("active"),f?(b[0].offsetWidth,b.addClass("in")):b.removeClass("fade"),b.parent(".dropdown-menu")&&b.closest("li.dropdown").addClass("active"),d&&d()}var e=c.find("> .active"),f=d&&a.support.transition&&e.hasClass("fade");f?e.one(a.support.transition.end,g):g(),e.removeClass("in")}},a.fn.tab=function(c){return this.each(function(){var d=a(this),e=d.data("tab");e||d.data("tab",e=new b(this)),typeof c=="string"&&e[c]()})},a.fn.tab.Constructor=b,a(function(){a("body").on("click.tab.data-api",'[data-toggle="tab"], [data-toggle="pill"]',function(b){b.preventDefault(),a(this).tab("show")})})}(window.jQuery),!function(a){var b=function(b,c){this.$element=a(b),this.options=a.extend({},a.fn.typeahead.defaults,c),this.matcher=this.options.matcher||this.matcher,this.sorter=this.options.sorter||this.sorter,this.highlighter=this.options.highlighter||this.highlighter,this.$menu=a(this.options.menu).appendTo("body"),this.source=this.options.source,this.shown=!1,this.listen()};b.prototype={constructor:b,select:function(){var a=this.$menu.find(".active").attr("data-value");return this.$element.val(a),this.hide()},show:function(){var b=a.extend({},this.$element.offset(),{height:this.$element[0].offsetHeight});return this.$menu.css({top:b.top+b.height,left:b.left}),this.$menu.show(),this.shown=!0,this},hide:function(){return this.$menu.hide(),this.shown=!1,this},lookup:function(b){var c=this,d,e;return this.query=this.$element.val(),this.query?(d=a.grep(this.source,function(a){if(c.matcher(a))return a}),d=this.sorter(d),d.length?this.render(d.slice(0,this.options.items)).show():this.shown?this.hide():this):this.shown?this.hide():this},matcher:function(a){return~a.toLowerCase().indexOf(this.query.toLowerCase())},sorter:function(a){var b=[],c=[],d=[],e;while(e=a.shift())e.toLowerCase().indexOf(this.query.toLowerCase())?~e.indexOf(this.query)?c.push(e):d.push(e):b.push(e);return b.concat(c,d)},highlighter:function(a){return a.replace(new RegExp("("+this.query+")","ig"),function(a,b){return"<strong>"+b+"</strong>"})},render:function(b){var c=this;return b=a(b).map(function(b,d){return b=a(c.options.item).attr("data-value",d),b.find("a").html(c.highlighter(d)),b[0]}),b.first().addClass("active"),this.$menu.html(b),this},next:function(b){var c=this.$menu.find(".active").removeClass("active"),d=c.next();d.length||(d=a(this.$menu.find("li")[0])),d.addClass("active")},prev:function(a){var b=this.$menu.find(".active").removeClass("active"),c=b.prev();c.length||(c=this.$menu.find("li").last()),c.addClass("active")},listen:function(){this.$element.on("blur",a.proxy(this.blur,this)).on("keypress",a.proxy(this.keypress,this)).on("keyup",a.proxy(this.keyup,this)),(a.browser.webkit||a.browser.msie)&&this.$element.on("keydown",a.proxy(this.keypress,this)),this.$menu.on("click",a.proxy(this.click,this)).on("mouseenter","li",a.proxy(this.mouseenter,this))},keyup:function(a){a.stopPropagation(),a.preventDefault();switch(a.keyCode){case 40:case 38:break;case 9:case 13:if(!this.shown)return;this.select();break;case 27:this.hide();break;default:this.lookup()}},keypress:function(a){a.stopPropagation();if(!this.shown)return;switch(a.keyCode){case 9:case 13:case 27:a.preventDefault();break;case 38:a.preventDefault(),this.prev();break;case 40:a.preventDefault(),this.next()}},blur:function(a){var b=this;a.stopPropagation(),a.preventDefault(),setTimeout(function(){b.hide()},150)},click:function(a){a.stopPropagation(),a.preventDefault(),this.select()},mouseenter:function(b){this.$menu.find(".active").removeClass("active"),a(b.currentTarget).addClass("active")}},a.fn.typeahead=function(c){return this.each(function(){var d=a(this),e=d.data("typeahead"),f=typeof c=="object"&&c;e||d.data("typeahead",e=new b(this,f)),typeof c=="string"&&e[c]()})},a.fn.typeahead.defaults={source:[],items:8,menu:'<ul class="typeahead dropdown-menu"></ul>',item:'<li><a href="#"></a></li>'},a.fn.typeahead.Constructor=b,a(function(){a("body").on("focus.typeahead.data-api",'[data-provide="typeahead"]',function(b){var c=a(this);if(c.data("typeahead"))return;b.preventDefault(),c.typeahead(c.data())})})}(window.jQuery);
define("libs/jquery/bootstrap.min", function(){});

/**
 * jQuery Masonry v2.1.04
 * A dynamic layout plugin for jQuery
 * The flip-side of CSS Floats
 * http://masonry.desandro.com
 *
 * Licensed under the MIT license.
 * Copyright 2012 David DeSandro
 */
(function(a,b,c){var d=b.event,e;d.special.smartresize={setup:function(){b(this).bind("resize",d.special.smartresize.handler)},teardown:function(){b(this).unbind("resize",d.special.smartresize.handler)},handler:function(a,c){var d=this,f=arguments;a.type="smartresize",e&&clearTimeout(e),e=setTimeout(function(){b.event.handle.apply(d,f)},c==="execAsap"?0:100)}},b.fn.smartresize=function(a){return a?this.bind("smartresize",a):this.trigger("smartresize",["execAsap"])},b.Mason=function(a,c){this.element=b(c),this._create(a),this._init()},b.Mason.settings={isResizable:!0,isAnimated:!1,animationOptions:{queue:!1,duration:500},gutterWidth:0,isRTL:!1,isFitWidth:!1,containerStyle:{position:"relative"}},b.Mason.prototype={_filterFindBricks:function(a){var b=this.options.itemSelector;return b?a.filter(b).add(a.find(b)):a},_getBricks:function(a){var b=this._filterFindBricks(a).css({position:"absolute"}).addClass("masonry-brick");return b},_create:function(c){this.options=b.extend(!0,{},b.Mason.settings,c),this.styleQueue=[];var d=this.element[0].style;this.originalStyle={height:d.height||""};var e=this.options.containerStyle;for(var f in e)this.originalStyle[f]=d[f]||"";this.element.css(e),this.horizontalDirection=this.options.isRTL?"right":"left",this.offset={x:parseInt(this.element.css("padding-"+this.horizontalDirection),10),y:parseInt(this.element.css("padding-top"),10)},this.isFluid=this.options.columnWidth&&typeof this.options.columnWidth=="function";var g=this;setTimeout(function(){g.element.addClass("masonry")},0),this.options.isResizable&&b(a).bind("smartresize.masonry",function(){g.resize()}),this.reloadItems()},_init:function(a){this._getColumns(),this._reLayout(a)},option:function(a,c){b.isPlainObject(a)&&(this.options=b.extend(!0,this.options,a))},layout:function(a,b){for(var c=0,d=a.length;c<d;c++)this._placeBrick(a[c]);var e={};e.height=Math.max.apply(Math,this.colYs);if(this.options.isFitWidth){var f=0;c=this.cols;while(--c){if(this.colYs[c]!==0)break;f++}e.width=(this.cols-f)*this.columnWidth-this.options.gutterWidth}this.styleQueue.push({$el:this.element,style:e});var g=this.isLaidOut?this.options.isAnimated?"animate":"css":"css",h=this.options.animationOptions,i;for(c=0,d=this.styleQueue.length;c<d;c++)i=this.styleQueue[c],i.$el[g](i.style,h);this.styleQueue=[],b&&b.call(a),this.isLaidOut=!0},_getColumns:function(){var a=this.options.isFitWidth?this.element.parent():this.element,b=a.width();this.columnWidth=this.isFluid?this.options.columnWidth(b):this.options.columnWidth||this.$bricks.outerWidth(!0)||b,this.columnWidth+=this.options.gutterWidth,this.cols=Math.floor((b+this.options.gutterWidth)/this.columnWidth),this.cols=Math.max(this.cols,1)},_placeBrick:function(a){var c=b(a),d,e,f,g,h;d=Math.ceil(c.outerWidth(!0)/(this.columnWidth+this.options.gutterWidth)),d=Math.min(d,this.cols);if(d===1)f=this.colYs;else{e=this.cols+1-d,f=[];for(h=0;h<e;h++)g=this.colYs.slice(h,h+d),f[h]=Math.max.apply(Math,g)}var i=Math.min.apply(Math,f),j=0;for(var k=0,l=f.length;k<l;k++)if(f[k]===i){j=k;break}var m={top:i+this.offset.y};m[this.horizontalDirection]=this.columnWidth*j+this.offset.x,this.styleQueue.push({$el:c,style:m});var n=i+c.outerHeight(!0),o=this.cols+1-l;for(k=0;k<o;k++)this.colYs[j+k]=n},resize:function(){var a=this.cols;this._getColumns(),(this.isFluid||this.cols!==a)&&this._reLayout()},_reLayout:function(a){var b=this.cols;this.colYs=[];while(b--)this.colYs.push(0);this.layout(this.$bricks,a)},reloadItems:function(){this.$bricks=this._getBricks(this.element.children())},reload:function(a){this.reloadItems(),this._init(a)},appended:function(a,b,c){if(b){this._filterFindBricks(a).css({top:this.element.height()});var d=this;setTimeout(function(){d._appended(a,c)},1)}else this._appended(a,c)},_appended:function(a,b){var c=this._getBricks(a);this.$bricks=this.$bricks.add(c),this.layout(c,b)},remove:function(a){this.$bricks=this.$bricks.not(a),a.remove()},destroy:function(){this.$bricks.removeClass("masonry-brick").each(function(){this.style.position="",this.style.top="",this.style.left=""});var c=this.element[0].style;for(var d in this.originalStyle)c[d]=this.originalStyle[d];this.element.unbind(".masonry").removeClass("masonry").removeData("masonry"),b(a).unbind(".masonry")}},b.fn.imagesLoaded=function(a){function h(){a.call(c,d)}function i(a){var c=a.target;c.src!==f&&b.inArray(c,g)===-1&&(g.push(c),--e<=0&&(setTimeout(h),d.unbind(".imagesLoaded",i)))}var c=this,d=c.find("img").add(c.filter("img")),e=d.length,f="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==",g=[];return e||h(),d.bind("load.imagesLoaded error.imagesLoaded",i).each(function(){var a=this.src;this.src=f,this.src=a}),c};var f=function(b){a.console&&a.console.error(b)};b.fn.masonry=function(a){if(typeof a=="string"){var c=Array.prototype.slice.call(arguments,1);this.each(function(){var d=b.data(this,"masonry");if(!d){f("cannot call methods on masonry prior to initialization; attempted to call method '"+a+"'");return}if(!b.isFunction(d[a])||a.charAt(0)==="_"){f("no such method '"+a+"' for masonry instance");return}d[a].apply(d,c)})}else this.each(function(){var c=b.data(this,"masonry");c?(c.option(a||{}),c._init()):b.data(this,"masonry",new b.Mason(a,this))});return this}})(window,jQuery);
define("libs/jquery/jquery.masonry.min", function(){});

(function() {

  define('libs/jquery/plugins',['order!libs/jquery/pubsub', 'order!libs/jquery/bootstrap.min', 'order!libs/jquery/jquery.masonry.min'], function() {});

}).call(this);

(function() {

  define('libs/webgl/glfx',['order!libs/webgl/glfx.min', 'order!libs/webgl/effects'], function() {
    return fx;
  });

}).call(this);

(function() {

  define('mylibs/stamp/stamp',['mylibs/utils/utils', 'mylibs/stamp/colors', 'text!mylibs/stamp/views/stamp.html', 'libs/webgl/glfx'], function(utils, pallet, stamp) {
    
    /*		Stamp
    
    	This module handles drawing and stamping onto an image in a modal window
    */
    var $activeBrush, $window, bufferTexture, callback, canvas, createBlobBrush, createBlobStamp, drawSafe, pixelsBetweenStamps, pub, render, setupMouse, stampTexture, stampX, stampY, texture, updateBrush, updateStamp, viewModel;
    $window = {};
    $activeBrush = null;
    canvas = {};
    drawSafe = {};
    stampX = 0;
    stampY = 0;
    texture = {};
    bufferTexture = {};
    stampTexture = {};
    pixelsBetweenStamps = 0;
    callback = {};
    viewModel = kendo.observable({
      draw: function(e) {
        var a, b, g, r;
        if ($activeBrush) $activeBrush.removeClass("selected");
        $activeBrush = $(e.target).addClass("selected");
        r = $activeBrush.data("r");
        g = $activeBrush.data("g");
        b = $activeBrush.data("b");
        a = $activeBrush.data("a");
        return updateBrush(r, g, b, a);
      },
      yep: function() {
        callback(canvas.toDataURL());
        return $window.close();
      },
      nope: function() {
        return $window.close();
      }
    });
    render = function() {
      var thisTexture;
      thisTexture = canvas.texture(drawSafe);
      canvas.draw(thisTexture);
      canvas.matrixWarp([-1, 0, 0, 1], false, true);
      canvas.blend(bufferTexture, 1);
      canvas.update();
      return utils.getAnimationFrame()(render);
    };
    updateBrush = function(red, green, blue, alpha) {
      stampTexture = canvas.texture(createBlobBrush({
        r: red,
        g: green,
        b: blue,
        a: alpha,
        radius: 5,
        fuzziness: 1
      }));
      return pixelsBetweenStamps = 5 / 4;
    };
    updateStamp = function(image) {
      return stampTexture = canvas.texture(createBlobStamp(image));
    };
    createBlobStamp = function(image) {
      var c, h, w;
      stamp = document.createElement("canvas");
      w = stamp.width = image.width;
      h = stamp.height = image.height;
      c = stamp.getContext("2d");
      stamp.drawImage(image, 0, 0, image.width, image.height);
      return stamp;
    };
    createBlobBrush = function(options) {
      var brush, c, data, dx, dy, factor, h, i, length, w, x, y;
      brush = document.createElement("canvas");
      w = brush.width = options.radius * 2;
      h = brush.height = options.radius * 2;
      c = brush.getContext("2d");
      data = c.createImageData(w, h);
      x = 0;
      while (x < w) {
        y = 0;
        while (y < h) {
          i = (x + y * w) * 4;
          dx = (x - options.radius + 0.5) / options.radius;
          dy = (y - options.radius + 0.5) / options.radius;
          length = Math.sqrt(dx * dx + dy * dy);
          factor = Math.max(0, Math.min(1, (1 - length) / (options.fuzziness + 0.00001)));
          data.data[i + 0] = options.r;
          data.data[i + 1] = options.g;
          data.data[i + 2] = options.b;
          data.data[i + 3] = Math.max(0, Math.min(255, Math.round(options.a * factor)));
          y++;
        }
        x++;
      }
      c.putImageData(data, 0, 0);
      return brush;
    };
    setupMouse = function() {
      var isDragging;
      isDragging = false;
      stampX = 0;
      stampY = 0;
      canvas.addEventListener('mousedown', function(e) {
        var x, y;
        x = e.offsetX;
        y = e.offsetY;
        canvas.swapContentsWith(bufferTexture);
        canvas.stamp([[x, y, 1, 1, 0, 1]], stampTexture);
        canvas.swapContentsWith(bufferTexture);
        isDragging = true;
        stampX = x;
        stampY = y;
        return e.preventDefault();
      }, false);
      canvas.addEventListener("mousemove", (function(e) {
        var dx, dy, length, stamps, x, y;
        if (!isDragging) return;
        x = e.offsetX;
        y = e.offsetY;
        stamps = [];
        while (true) {
          dx = x - stampX;
          dy = y - stampY;
          length = Math.sqrt(dx * dx + dy * dy);
          if (length < pixelsBetweenStamps) break;
          stampX += dx * pixelsBetweenStamps / length;
          stampY += dy * pixelsBetweenStamps / length;
          stamps.push([stampX, stampY, 1, 1, 0, 1]);
        }
        if (stamps.length > 0) {
          canvas.swapContentsWith(bufferTexture);
          canvas.stamp(stamps, stampTexture);
          return canvas.swapContentsWith(bufferTexture);
        }
      }), false);
      return document.addEventListener("mouseup", (function(e) {
        return isDragging = false;
      }), false);
    };
    return pub = {
      init: function() {
        var $content, template;
        template = kendo.template(stamp);
        $content = $(template(pallet));
        drawSafe = document.createElement("canvas");
        canvas = fx.canvas();
        $content.find(".canvas").append(canvas);
        $window = $content.kendoWindow({
          visible: false,
          modal: true,
          title: "",
          open: function() {
            return $.publish("/app/pause");
          },
          close: function() {
            return $.publish("/app/resume");
          },
          animation: {
            open: {
              effects: "slideIn:up fadeIn",
              duration: 500
            },
            close: {
              effects: "slide:up fadeOut",
              duration: 500
            }
          }
        }).data("kendoWindow").center();
        kendo.bind($content, viewModel);
        return $.subscribe("/stamp/show", function(src, saveFunction) {
          var ctx, oldImage;
          callback = saveFunction;
          oldImage = new Image();
          oldImage.src = src;
          drawSafe.width = oldImage.width;
          drawSafe.height = oldImage.height;
          ctx = drawSafe.getContext("2d");
          ctx.drawImage(oldImage, 0, 0, oldImage.width, oldImage.height);
          texture = canvas.texture(drawSafe);
          bufferTexture = canvas.texture(texture.width(), texture.height());
          bufferTexture.clear();
          updateBrush(255, 255, 255, 255);
          $activeBrush = $content.find(".default");
          setupMouse();
          render();
          return $window.open();
        });
      }
    };
  });

}).call(this);

(function() {

  define('app',['mylibs/camera/camera', 'mylibs/photobooth/photobooth', 'mylibs/controls/controls', 'mylibs/customize/customize', 'mylibs/share/share', 'text!intro.html', 'mylibs/pictures/pictures', 'mylibs/preview/preview', 'mylibs/preview/selectPreview', 'mylibs/postman/postman', 'mylibs/stamp/stamp', 'mylibs/modal/modal', 'mylibs/assets/assets'], function(camera, photobooth, controls, customize, share, intro, pictures, preview, selectPreview, postman, stamp, modal, assets) {
    var pub;
    return pub = {
      init: function() {
        postman.init();
        assets.init();
        modal.init();
        $.subscribe('/camera/unsupported', function() {
          return $('#pictures').append(intro);
        });
        return camera.init("countdown", function() {
          preview.init("camera");
          selectPreview.init("previews");
          selectPreview.draw();
          photobooth.init(460, 340);
          controls.init("controls");
          customize.init();
          stamp.init();
          share.init();
          pictures.init("pictures");
          return $.publish("/postman/deliver", [
            {
              message: ""
            }, "/app/ready"
          ]);
        });
      }
    };
  });

}).call(this);

(function() {

  require(['app', 'order!libs/jquery/plugins'], function(app) {
    return app.init();
  });

}).call(this);

define("main", function(){});
