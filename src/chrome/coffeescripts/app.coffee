define([
	'mylibs/postman/postman'
	'mylibs/utils/utils'
	'mylibs/file/file'
	'mylibs/intents/intents'
	'mylibs/share/share'
	'mylibs/notify/notify'
	'mylibs/assets/assets'
], (postman, utils, file, intents, share, notify, assets) ->
	
	'use strict'

	iframe = iframe = document.getElementById("iframe")
	canvas = document.getElementById("canvas")	
	ctx = canvas.getContext("2d")

	draw = -> 
		utils.getAnimationFrame()(draw)
		update()

	update = ->

		ctx.drawImage(video, 0, 0, video.width, video.height)
		img = ctx.getImageData(0, 0, canvas.width, canvas.height)
		buffer = img.data.buffer

		$.publish "/postman/deliver", [{ message: { image: img.data.buffer } }, "/camera/update", [ buffer ]]

	hollaback = (stream) ->

		e = window.URL || window.webkitURL
		video = document.getElementById("video")
		video.src = if e then e.createObjectURL(stream) else stream
		video.play()

		draw()

	errback = ->
		console.log("Couldn't Get The Video");

	pub = 
		init: ->

			#initialize notifications
			notify.init()

			# initialize sharing
			share.init()

			# initialize utils
			utils.init()

			# intialize intents
			intents.init()

			# get the files
			file.init()

			# cue up the postman!
			postman.init(iframe.contentWindow)

			# get the currently saved files
			$.publish "/file/read", []

			# send embeded assets down to the app
			assets.init()

			# start the camera
			navigator.webkitGetUserMedia { video: true }, hollaback, errback
)