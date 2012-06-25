define([
  'mylibs/share/share'
  'text!mylibs/pictures/views/picture.html'
], (share, picture) ->
	
	###		Pictures

	The pictures module handles the creation of the actual images and adding them
	to the right-hand side of the app.  It also responds to all actions taken on images
	by either clicking on the image itself, or on the action bar below each pic

	###

	# object level vars

	$container = {}

	# the main function that creates the image and handles all the events
	create = (message) ->
		
		# get the template
		template = kendo.template(picture)

		# inject the new picture source onto the template
		html = template({ image: message.image })

		# wrap the html in jQuery so we can search it and stuff. easily.
		$div = $(html)

		# get the image element from the template
		$img = $div.find(".picture")

		# assign the picture a unique file name based on the current timestamp
		message.name = message.name || new Date().getTime() + ".png"

		# this is the generic callback used by the customize and stamp windows
		callback = ->
			$img.attr "src", arguments[0] 
			$.publish "/postman/deliver", [{ message: { name: message.name, image: arguments[0] } }, "/file/save"]

		# photostrips cannot be customzized. to tell the difference, prefix the
		# file name with a p_		
		if message.strip
			message.name = "p_" + message.name
		# the image can be customized by clicking on it
		else
			# this callback is used to set the img source from the customize window
			# give the image a pointer mouse and attach a click event
			$img.addClass("pointer")
			$img.on("click", -> $.publish("/customize", [ this, callback ]) )

		# save if a save is requested
		if message.save
			$.publish "/postman/deliver", [{ message: { name: message.name, image: message.image } }, "/file/save"]

		# when the image fully loads, we need to rebuild the pinterest sytle
		# layout by calling reload on the masonry plugin
		$img.load ->
			$container.masonry("reload")

		##### these are the actions for the action bar below each image

		# add the source to the download link
		$div.on("click", ".download", ->
        	$.publish "/postman/deliver", [{ message: { name: name, image: $img.attr("src") } }, "/file/download"]
		)	

		$div.on("click", ".intent", ->
			#intent = new WebKitIntent("http://webintents.org/share", "image/*", $img.attr("src"))
    		# window.navigator.startActivity(intent, (data) ->)
    		$.publish "/share/show", [ $img.attr("src"), message.name ]
    		
    		# $.subscribe "/pictures/share/imgur", (message) ->
    		# 	share.closeStatus()
			
		)

		# delete the image from the files system and UI
		$div.on "click", ".trash", ->
			# respond to the event that the image has been removed
			# from the file system
			$.subscribe "/file/deleted/#{message.name}", ->

				# remove the object from the UI
				$div.remove()
				
				# re-arrange all the images
				$container.masonry "reload"
				
				# unsubcribe from this event as the object is deleted. forevermore.
				$.unsubscribe "file/deleted/#{message.name}"
			
			# dispatch the command to delete the image
			$.publish "/postman/deliver", [ { message: { name: message.name } }, "/file/delete" ]

		# open the stamping window
		$div.on "click", ".stamp", ->
			$.publish "/stamp/show", [ $img.attr("src"), callback ]

		##### end action bar events

		# all done. append the template to the container
		$container.append($div)

		

	pub = 
		
		init: (containerId) ->
			
			# the id of the container comes in from the initializer. grab
			# it from the DOM
			$container = $("##{containerId}")

			# initialize the jquery masonry layout plugin
			$container.masonry({ itemSelector: ".box" })

			# subscribe to events
			$.subscribe "/pictures/reload", ->
				pub.reload()

			$.subscribe "/pictures/create", (message) ->
				create(message)

			$.subscribe "/pictures/bulk", (message) ->
				for file in message
					create(file)
	
)
