define([
  'mylibs/utils/utils'
], (utils) ->
	
	###		Assets

	The assets object defines the pipeline that sends images down to the
	application. this is because the sandbox treats local resources as suspect.
	this way, the sandbox will trust these images and let us draw and read them from canvas's

	###

	'use strict'

	# array of assets that gets sent down to the application
	assets = [
		{
			name: "glasses"
			src: "chrome/images/glasses.png"
		},
		{
			name: "horns"
			src: "chrome/images/horns.png"
		},
		{
			name: "hipster"
			src: "chrome/images/hipster.png"
		},
		{
			name: "google"
			src: "chrome/images/glasses.png"
		}
	]

	# anything under here is public
	pub = 

		init: ->
		
			# this library converts assets to image data since the app inside the sandbox
			# cannot use local images on a canvas
			for asset in assets 
				
				# wrap this sucker in a closure because it's stepping all over itself
				do (asset) ->

					# create a new image
					img = new Image()

					# set the image src to the local asset
					img.src = asset.src

					# send the image data down in a post message
					img.onload = ->
						$.publish "/postman/deliver", [ { message: { name: asset.name, image: img.toDataURL() } }, "/assets/add" ]
)