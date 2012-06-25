define([
	
], () ->

	###		Notify

	shows the chrome notification window, and takes care of closing it if it isn't 
	marked as sticky

	###

	# anything under this is public
	pub =

		init: ->

			# subscribe to the show message
			$.subscribe "/notify/show", (title, body, sticky) ->					

				# close callback for timeout
				close = ->
					notification.close()

				# create the notification
				notification = webkitNotifications.createNotification 'icon_16.png', title, body

				# if it isn't sticky, wait 3 seconds and then close it
				if not sticky
					setTimeout close, 3000

				# show the notification
				notification.show()

)
