define([
], () ->
	
	pub = 
		
		init: ( controlsId ) ->
			
			# get the container from the DOM
			$controls = $("##{controlsId}")

			# get a reference to all buttons in this module
			$buttons = $controls.find "button"
		
			# listen for the button click events
			$controls.on("click", "button", ->
				$.publish($(this).data("event"))
			)
			
			$controls.on("change", "input", (e) -> 
                # listen for the polaroid check change
                $.publish( "/polaroid/change", [e] )
			)

			# listen for the disable/enable message
			$.subscribe "/controls/enable", (enabled) ->

				# if the enable boolean is passed in, enable the buttons
				if (enabled) 
					$buttons.removeAttr("disabled")
				else 
					$buttons.attr "disabled", "disabled"
)