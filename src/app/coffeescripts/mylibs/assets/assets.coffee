define([
], () ->

	###		Asset Pipline		

	The asset pipeline recieves base 64 encoded images from the extension and exposes them 
	locally as images. This is because the sandbox treats any local resources as tainted 
	and won't allow reading them from a canvas as image data

	### 

	# The assets variable holds the array of images
	assets = {}

	# anything off of pub is public
	pub = 

		# the images property exposes the collection of images on the assets object
		# use as 'assets.images.<image-name>'
		images:
			assets
	
		# the constructor function that is called when the assets object is created
		init: ->
		
			# subscribe to the '/assets/add' event which is coming in from the extension
			# each time it sends a new encoded image down
			$.subscribe "/assets/add", (message) ->

				# create a new image and assign it's source
				img = new Image
				img.src = message.image

				# add the image to the assets object as the value where the key
				# is the name of the image
				assets[message.name] = img
)