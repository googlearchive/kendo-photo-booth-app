(function() {

  define(['mylibs/camera/camera', 'mylibs/photobooth/photobooth', 'mylibs/controls/controls', 'mylibs/customize/customize', 'mylibs/share/share', 'text!intro.html', 'mylibs/pictures/pictures', 'mylibs/preview/preview', 'mylibs/preview/selectPreview', 'mylibs/postman/postman', 'mylibs/stamp/stamp', 'mylibs/modal/modal', 'mylibs/assets/assets'], function(camera, photobooth, controls, customize, share, intro, pictures, preview, selectPreview, postman, stamp, modal, assets) {
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
