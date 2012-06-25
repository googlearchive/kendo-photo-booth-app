define([
], () ->
	
	$window = {}

	pub = 
	
		init: ->
			
			$window = $("<div id='modal'></div>").kendoWindow
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

		content: (content) ->

			$window.content(content)

		show: ->

			$window.center().open()

		close: ->

			$window.close()
)