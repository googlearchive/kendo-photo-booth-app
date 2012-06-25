define([
], () ->
	
	canvas = document.createElement("canvas")
	ctx = canvas.getContext("2d")

	toDataURL = (image) ->

		canvas.width = image.width
		canvas.height = image.height

		ctx.drawImage image, 0, 0, image.width, image.height

		canvas.toDataURL image

	toBlob = (dataURL) ->

		if dataURL.split(',')[0].indexOf('base64') >= 0
			byteString = atob(dataURL.split(','))

		mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0]
		
		ab = new ArrayBuffer(byteString.length, 'binary')
		
		ia = new Uint8Array(ab)

		for bytes in byteString
			ia[_i] = byteString.charCodeAt(_i)

		blobBuilder = new Blob()

		blobBuilder.append(ab);

		# return the blob
		blobBuilder.getBlob mimeString

	pub = 
	
		init: ->
	
			Image.prototype.toDataURL = ->

				toDataURL = (image) ->

			Image.prototype.toBlob = ->

				dataURL = toDataURL(this)

				toBlob(dataURL)

		toBlob: (dataURL) ->

			toBlob(dataURL)


		getAnimationFrame: -> 
	    
	        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || 
	        window.mozRequestAnimationFrame || window.oRequestAnimationFrame || 
	        window.msRequestAnimationFrame || (callback, element) ->
	          return window.setTimeout(callback, 1000 / 60)

)