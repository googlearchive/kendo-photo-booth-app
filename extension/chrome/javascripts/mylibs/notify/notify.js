(function() {

  define([], function() {
    /*		Notify
    
    	shows the chrome notification window, and takes care of closing it if it isn't 
    	marked as sticky
    */
    var pub;
    return pub = {
      init: function() {
        return $.subscribe("/notify/show", function(title, body, sticky) {
          var close, notification;
          close = function() {
            return notification.close();
          };
          notification = webkitNotifications.createNotification('icon_16.png', title, body);
          if (!sticky) setTimeout(close, 3000);
          return notification.show();
        });
      }
    };
  });

}).call(this);
