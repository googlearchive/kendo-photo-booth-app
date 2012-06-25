(function() {

  define(['text!mylibs/share/views/share.html'], function(html) {
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
