define([
  'text!mylibs/customize/views/customize.html'
  'libs/webgl/glfx.min'
], (template) ->
	
	###		Customize

	Customize module deals with adding additional shaders to a taken image via sliders

	###

	# object level vars

	modal = {}
	webgl = fx.canvas()
	oldImage = new Image()
	texture = {}
	callback = {}

	# create a view model which will bind sliders to effects and allow responding to events as sliders are moved
	# check the customize.html for binding markup for MVVM
	viewModel = kendo.observable
		
		effects:

			brightnessContrast:
				filter: "brightnessContrast"
				brightness:
					isParam: true
					value: 0
			
				contrast: 
					isParam: true
					value: 0

			vignette:
				filter: "vignette"
				size:
					isParam: true
					value: 0

				amount:
					isParam: true
					value: 0

			hueSaturation:
				filter: "hueSaturation"
				hue:
					isParam: true
					value: 0
				saturation: 
					isParam: true
					value: 0

			noise:
				filter: "noise"
				noise:
					isParam: true
					value: 0

			denoise:
				filter: "denoise"
				denoise:
					isParam: true
					value: 100
						
		# when a slider value is changed - either by sliding or clicking the left/right buttons,
		# this event is fired
		change: ->

			# draw the texture
			webgl.draw(texture)

			# create an array of filters to apply
			filters = []	

			# looop through the above filters in the view model. if they hold a value, add the filter
			# to the filters array so it can be applied.
			for own key, value of viewModel.effects
				if (viewModel.effects[key].filter)

					filter = viewModel.effects[key]
					params = []

					for own key, value of filter
						if filter[key].isParam
							params.push(filter[key].value)

					filters.push({ name: filter.filter, params: params })

			# apply each filter with a value
			for filter in filters
				webgl[filter.name].apply(webgl, filter.params)
			
			# update the canvas (renders the image with all the filters applied)
			webgl.update()

		# fired on 'yep' button click
		yep: ->

			# execute the callback passed in when this window was opened
			callback(webgl.toDataURL())

			# close this window
			modal.close()

		# fired on 'nope' button click
		nope: ->

			# just close the window
			modal.close()

		# resets all slider values to nothing
		reset: ->

			this.set "effects.brightnessContrast.brightness.value", 0
			this.set "effects.brightnessContrast.contrast.value", 0
			this.set "effects.vignette.size.value", 0
			this.set "effects.vignette.amount.value", 0
			this.set "effects.hueSaturation.hue.value", 0
			this.set "effects.hueSaturation.saturation.value", 0
			this.set "effects.noise.noise.value", 0

	# the event is called when the window is opened below
	customizeEffect = (image, saveFunction) ->

		# reset all the sliders to nothing
		viewModel.reset()

		# keep track of the image because we don't want to overwrite the current
		# one until the user has accepted changes
		oldImage.src = image.src

		# the save function comes from the caller. this is the callback
		# that will be executed when the 'yep' button is clicked
		callback = saveFunction

		# create a texture from the canvas
		texture = webgl.texture(oldImage)

		# draw the canvas to the webgl canvas
		webgl.draw(texture).update()

		# open the window and center it
		modal.center().open()

	# anything off the pub variable is public
	pub = 
		
		# constructor that is called when this object is intialized
		init: ->
			
			# wrap the module DOM fragement in a jQuery object
			$content = $(template)

			# subscribe to events
			$.subscribe('/customize', ( sender, saveFunction ) ->
				customizeEffect sender, saveFunction
			)

			# find the canvas div in the DOM fragment and append
			# a webgl canvas
			$content.find(".canvas").append(webgl)

			# create the modal window
			modal = $content.kendoWindow
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
			.data("kendoWindow")

			# bind the template DOM fragement to the view model with Kendo UI MVVM
			kendo.bind($content, viewModel)

)
