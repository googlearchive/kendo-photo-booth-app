define([
  'text!mylibs/share/views/share.html'
], (html) ->

	###		Share

	Handles sharing of images

	###

	# object level vars

	# create a view model for setting image source and button click events
	viewModel = kendo.observable
		
		# the image source
		src: "images/placeholder.png"
		
		# the image name
		name: null

		# called when the tweet button is clicked
		tweet: ->

			share this.get("src"), "twitter"

		# called when the google+ button is clicked
		google: ->

			share this.get("src"), "google"
			

	modal = {}
	$actions = {}
	$working = {}
	links = []
	currentLink = null

	share = (src, service) ->

		# tell the post man to deliver the message to share passing in the currentLink
		# if one exists. 
		$.publish "/postman/deliver", [ { message: { image: src, link: currentLink } }, "/share/#{service}" ]
		
		# fade out the share buttons and fade in the sharing... bar
		$actions.kendoStop(true).kendoAnimate { effects: "slide:down fadeOut", duration: 500, hide: true }
		$working.kendoStop(true).kendoAnimate { effects: "slideIn:down fadeIn", duration: 500, show: true }

	# anything under here is public
	pub = 

		init: ->

			# listen for the /share/show event
    		$.subscribe "/share/show", (src, name) ->
	
				# set the current link to null
    			currentLink = null

    			# search through the links list for a matching link for this image name
    			for link in links

    				# if we find one
    				if link.name == name

    					# set the currentLink equal so we don't create an unecessary image link
    					# when we already have one
    					currentLink = link.link

    			# set the src and name properties on the view model
	    		viewModel.set "src", src
	    		viewModel.set "name", name

	    		# open the modal window
	    		modal.center().open()

	    	# listen for the success event that comes back from the extension after it successfully
	    	# creates a sharing link and opens a window to the appropriate service
	    	$.subscribe "/share/success", (message) ->

	    		# add the link we just got back for this image to the array of links
	    		links.push name: viewModel.name, link: message.link

	    		# make the current link equal to the link we just got back
	    		currentLink = message.link
	    		
	    		# slide the sharing buttons back in
	    		$working.kendoStop(true).kendoAnimate { effects: "slide:up fadeOut", duration: 500, hide: true }
	    		$actions.kendoStop(true).kendoAnimate { effects: "slideIn:up fadeIn", duration: 500, show: true }


	    	# get the HTML fragment for this ui and wrap it in jquery
    		$content = $(html)

    		# get a reference to the actions and working divs so we can 
    		# show and hide them
    		$actions = $content.find(".actions")
    		$working = $content.find(".working")

    		# create a new kendo window, but don't show it. just store the 
    		# reference
    		modal = $content.kendoWindow 
    			visible: true
    			modal: true 
    			animation: 
    				open: 
    					effects: "slideIn:up fadeIn"
    					duration: 500
    				close:
    					effects: "slide:up fadeOut"
    					duration: 500
    		.data("kendoWindow")

    		# bind the view model
    		kendo.bind $content, viewModel

            
)
