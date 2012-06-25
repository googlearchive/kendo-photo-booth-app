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

	# object level vars
	recipient = {}

 	# anything under this is public
	pub =

		init: (r) ->

			# set the recipient window
			recipient = r

			# listen for the window message event
			window.onmessage = (event) ->

				# receive the command to save a file
				$.publish event.data.address, [ event.data.message ]

			# subscribe to the send event
			$.subscribe "/postman/deliver", (message, address, block) ->
			
				# add an address to the message
				message.address = address

				# deliver to recipient
				recipient.webkitPostMessage message, "*", block
)