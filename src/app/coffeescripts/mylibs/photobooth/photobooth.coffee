define([
], () ->

	### Photostrip

	Handles creation of photostrips by stitching separate photos together

	###

	# object level vars

	images = []
	canvas = {}

	# creates a photostrip by drawing a series of images to a long canvas
	createStrip = (counter, images, ctx, width, height) ->

	    image = new Image()
	    image.src = images[counter]
	    image.width = width
	    image.height = height

	    image.onload = ->

	    	# drawing the image to the long canvas. the x position is always
	    	# the same, but the y moves down as images are added. this calculation
	    	# determines the y accounting for margins
	        y = (counter * height) + ((counter * 20) + 20)
	        ctx.drawImage(image, 20, y, image.width, image.height)

	        if counter == images.length - 1

	            # # get the image data from the canvas
	            # imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
	            
	            # ctx.putImageData(imgData, 0, 0)

	            # save the image as a data url
	            src = canvas.toDataURL()

	            # all the images have been stitched. add the picture to the right-hand container
	            $.publish "/pictures/create",  [ { image: src , name: null, strip: true, save: true } ]

	        else

	        	# recursive call to create the next image in the set
	            createStrip(++counter, images, ctx, width, height)
				
	# everything under tbhis is public
	pub = 
		
		# constructor that is called when the module is intialized in app.js
		init: ( width, height ) ->
			
			# create a canvas for stitching the images together. make
			# it's background white.
			canvas = $("<canvas style=color:fff></canvas>")[0]
			
			# subscribe to the photobooth event
			$.subscribe "/photobooth/create", (images) ->

				counter = 0

				# set the size of the canvas. this is based on how many images
				# are in the images array - or rather how many photos we have
				# specified will be in a photostrip
				canvas.width = width + 40
				canvas.height = (height * images.length) + (images.length * 20) + 20 

				ctx = canvas.getContext("2d")

				ctx.fillStyle = "rgb(255,255,255)"
				ctx.fillRect(0, 0, canvas.width, canvas.height) 

				# for each image in our collection, add it to a canvas and then export the image
				img = createStrip(counter, images, ctx, width, height)
                            
                        

)
