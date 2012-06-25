define([
], () ->
	
	###		Intents

	Invokes and responds to web intents

	NOT CURRENTLY IMPLEMENTED

	###

	pub = 

		init: ->
	
			$.subscribe "/intents/share", (message) ->

				# bring up the pick window
				intent = new window.WebKitIntent("http://webintents.org/share", "image/*", message.image)
				window.navigator.webkitStartActivity(intent, (data) ->)

)