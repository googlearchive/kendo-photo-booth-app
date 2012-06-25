define([
  'mylibs/utils/utils'
  'mylibs/stamp/colors'
  'text!mylibs/stamp/views/stamp.html'
  'libs/webgl/glfx'
], (utils, pallet, stamp) ->
	
	'use strict'

	###		Stamp

	This module handles drawing and stamping onto an image in a modal window

	###

	# object level vars
	$window = {}
	$activeBrush = null
	canvas = {}
	drawSafe = {}
	stampX = 0
	stampY = 0
	texture = {}
	bufferTexture = {}
	stampTexture = {}
	pixelsBetweenStamps = 0
	callback = {}

	# create a view model for the button events in the ui
	viewModel = kendo.observable {

		# called when color circle is clicked
		draw: (e) ->

			# if there is currently an active brush, remove
			# its selection
			if $activeBrush
				$activeBrush.removeClass("selected")

			# set the active brush to the element we clicked on
			$activeBrush = $(e.target).addClass("selected")
			
			# get the rbga values off of the data attributes
			r = $activeBrush.data "r"
			g = $activeBrush.data "g"
			b = $activeBrush.data "b"
			a = $activeBrush.data "a"

			# update the brush to the new color
			updateBrush(r, g, b, a)

		# fired on yep click
		yep: ->

			# execute the passed in callaback and pass in the data url
			# off of this canvas.
			callback canvas.toDataURL()
			
			# close the window. we're done here.
			$window.close()

		# fired on nope click
		nope: ->

			# bail. close the window.
			$window.close()

	}

	# constant render loop that updates the canvas allowing us to draw
	render = ->

		# create a texture from the 'safe' canvas created on init
		thisTexture = canvas.texture(drawSafe)
		
		# draw the previously created texture to the canvas
		canvas.draw thisTexture

		# we are blending too canvases together here. The original, and 
		# the one we are drawing on
		canvas.matrixWarp [ -1, 0, 0, 1 ], false, true
		canvas.blend bufferTexture, 1

		# update the canvas
		canvas.update()

		# LOOP!
		utils.getAnimationFrame()(render)

	# creates a new brush texture
	updateBrush = (red, green, blue, alpha) ->
		
		# return a new texture modifying the pixels to 
		# make it the right color
		stampTexture = canvas.texture(createBlobBrush(
			r: red 
			g: green
			b: blue 
			a: alpha
			radius: 5
			fuzziness: 1
		))

		# this determines how far we drag before we drag before
		# drawing starts
		# TODO: this is static and not awesome
		pixelsBetweenStamps = 5 / 4

	# update the current stamp
	updateStamp = (image) ->

		# create a new texture composed of the current image
		stampTexture = canvas.texture(createBlobStamp(image))

	# draw the image onto a canvas and return that
	createBlobStamp = (image) ->
		stamp = document.createElement("canvas")
		w = stamp.width = image.width
		h = stamp.height = image.height
		c = stamp.getContext("2d")
		stamp.drawImage image, 0, 0, image.width, image.height

		stamp

	# creates a new canvas and returns it as the brush
	createBlobBrush = (options) ->

		# create a new canvas
		brush = document.createElement("canvas")
		
		# set the width/height based on the specified radius
		w = brush.width = options.radius * 2
		h = brush.height = options.radius * 2
		
		# get the context
		c = brush.getContext("2d")

		# create some empty image data
		data = c.createImageData(w, h)
		
		# loop through all pixels and color them the specified color
		x = 0

		while x < w
			y = 0

			while y < h
				i = (x + y * w) * 4
				dx = (x - options.radius + 0.5) / options.radius
				dy = (y - options.radius + 0.5) / options.radius
				length = Math.sqrt(dx * dx + dy * dy)
				factor = Math.max(0, Math.min(1, (1 - length) / (options.fuzziness + 0.00001)))
				data.data[i + 0] = options.r
				data.data[i + 1] = options.g
				data.data[i + 2] = options.b
				data.data[i + 3] = Math.max(0, Math.min(255, Math.round(options.a * factor)))
				y++
			x++

		# brush is created, draw the image data back to the canvas
		c.putImageData data, 0, 0

		# return brush
		brush	

	setupMouse = ->

		isDragging = false
		stampX = 0
		stampY = 0

		# setup mouse events on this canvas
		canvas.addEventListener 'mousedown', (e) ->
			x = e.offsetX
			y = e.offsetY
			canvas.swapContentsWith(bufferTexture)
			canvas.stamp([[ x, y, 1, 1, 0, 1 ]], stampTexture)
			canvas.swapContentsWith(bufferTexture)
			isDragging = true
			stampX = x
			stampY = y
			e.preventDefault()
		, false

		# attach a mouse move event to the document
		canvas.addEventListener "mousemove", ((e) ->
			return  unless isDragging
			x = e.offsetX
			y = e.offsetY
			stamps = []
			loop
				dx = x - stampX
				dy = y - stampY
				length = Math.sqrt(dx * dx + dy * dy)
				break  if length < pixelsBetweenStamps
				stampX += dx * pixelsBetweenStamps / length
				stampY += dy * pixelsBetweenStamps / length
				stamps.push [ stampX, stampY, 1, 1, 0, 1 ]
			if stamps.length > 0
				canvas.swapContentsWith bufferTexture
				canvas.stamp stamps, stampTexture
				canvas.swapContentsWith bufferTexture
			), false

		# attach a mouse up to the hold window as we might drag
		# outside the canvas and release
		document.addEventListener "mouseup", ((e) ->
				isDragging = false
		), false

	# anything under here is public
	pub = 

		init: ->

			# create a new template based on the passed in DOM fragment
			template = kendo.template(stamp)

			# pass in the colors array and wrap the returned string in jQuery
			$content = $(template(pallet))

			# create a canvas for drawing to
			drawSafe = document.createElement("canvas")

			# setup the mouse on the canvas
			canvas = fx.canvas()

			# append the canvas to the HTML
			$content.find(".canvas").append(canvas)

			# setup the modal window
			$window = $content.kendoWindow
				visible: false
				modal: true
				title: ""
				open: ->
					$.publish("/app/pause")
				close: ->
					$.publish("/app/resume")
				animation: 
					open:
						effects: "slideIn:up fadeIn"
						duration: 500
					close:
						effects: "slide:up fadeOut"
						duration: 500
			.data("kendoWindow").center()

			# bind the view model
			kendo.bind($content, viewModel)

			# listen to events
			$.subscribe "/stamp/show", (src, saveFunction) ->

				# set the callback equal to the one we passed in
				callback = saveFunction

				# create another image for drawing too. this is to 
				# avoid cross-domain contamination issues in the sandbox
				oldImage = new Image()
				oldImage.src = src

				# set the safe canvas equal to the size of the image
				drawSafe.width = oldImage.width
				drawSafe.height = oldImage.height

				# draw the passed in image to the safe canvas
				ctx = drawSafe.getContext("2d")
				ctx.drawImage(oldImage, 0, 0, oldImage.width, oldImage.height)

				# create a new texture from the safe canvas
				texture = canvas.texture(drawSafe)

				# create the buffer texture. this is swapped in and out to create
				# the stamps and drawing
				bufferTexture = canvas.texture(texture.width(), texture.height())
				bufferTexture.clear()
			
				# give the brush a default value of black
				updateBrush(255, 255, 255, 255)

				# find the default color and set it as the active brush
				$activeBrush = $content.find(".default")

				# attach the mouse events
				setupMouse()
				
				# start drawing
				render()

				# open the kendo ui window
				$window.open()
		

)