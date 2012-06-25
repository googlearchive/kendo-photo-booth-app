(function() {

	var iframe = document.getElementById("iframe");

	var canvas = document.getElementById("canvas");
	var ctx = canvas.getContext("2d");

	var test = document.createElement("canvas");
	var testCtx = test.getContext("2d");

	var getAnimationFrame = function() {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame || function(callback, element) {
          return window.setTimeout(callback, 1000 / 60);
        };
    }

	navigator.webkitGetUserMedia({ video: true }, hollaback, errback);

	function hollaback(stream) {

		var e = window.URL || window.webkitURL;
		var video = document.getElementById("video");
		video.src = e ? e.createObjectURL(stream) : stream;
		video.play();

		draw();
	}

	function draw() {
		getAnimationFrame()(draw)
		update()
	}

	function update() {

		ctx.drawImage(video, 0, 0, video.width, video.height)

		var img = ctx.getImageData(0, 0, canvas.width, canvas.height);

		var buffer = img.data.buffer;
		
		iframe.contentWindow.webkitPostMessage(img.data, "*");
	}

	function errback() {
		console.log("Couldn't Get The Video");
	} 

})();
