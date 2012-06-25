(function() {

  define([], function() {
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
