(function() {

  define([], function() {
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
