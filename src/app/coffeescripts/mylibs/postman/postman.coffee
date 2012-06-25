define([

], () ->

	###		The Postman!

	The postman is a super simple combination of pub/sub and post message. 

	outgoing: the postman simply listens for the /postman/deliver message and dispatches whatever 
	its contents are as the body of the 'message' object. The address is used by the receiver 
	to determine who should respond to the message.

	incoming: the postman listens to the post message event on the window and 
	dispatches the event with the address specified

	###

	# anything under this is public
	pub =

		init: () ->

			# attach an event listener to the window for post messages
			window.onmessage = (event) ->

				# receive the command to save a file
				$.publish event.data.address, [event.data.message]


			# subscribe to the send event
			$.subscribe "/postman/deliver", (message, address) ->
			
				# add the address on to the message object
				message.address = address

				# send the message as a post message to the extension outside
				# of the sandbox
				window.top.webkitPostMessage message, "*"
)