define([
  #'mylibs/utils/utils'
  'mylibs/share/gdrive'
  'mylibs/share/imgur'
  'mylibs/share/resumableupload'
  'mylibs/share/util'
  'mylibs/share/gdocs'
], (gdrive, imgur) ->

	pub = 

		init: ->

			# gdrive.init()

			# subscribe to imgur share event
			$.subscribe "/share/twitter", (message) ->
				callback = ->
					link = arguments[0]
					window.open "https://twitter.com/intent/tweet?url=#{link}&hashtags=h5c"
					$.publish("/postman/deliver", [{ message: { success: true, link: link } }, "/share/success" ] )
				if not message.link
					imgur.upload message.image, callback
				else
					callback(message.link)

			$.subscribe "/share/google", (message) ->
				callback = ->
					link = arguments[0]
					window.open "https://plus.google.com/share?url=#{link}"
					$.publish("/postman/deliver", [{ message: { success: true, link: link } }, "/share/success" ] )
				if not message.link
					imgur.upload message.image, callback
				else
					callback(message.link)

			gdocs = new GDocs()

			# getDocs = ->

			# 	console.log gdocs.accessToken

			# 	$.ajax 
			# 		url: gdocs.DOCLIST_FEED
			# 		headers: {
			# 			"Authorization": "Bearer #{gdocs.accessToken}"
			# 			"GData-Version": "3.0"
			# 		},
			# 		type: "GET"
			# 		data: {"alt": "json"}
					
			# 		success: (data) ->

			# 			console.log(data)

			# 		error: ->

			gdocs.auth ->
				console.log(gdocs.accessToken)
			#  	$.ajax 
			#  		url: "https://www.googleapis.com/drive/v1/files"
			#  		type: "POST"
			#  		headers: {
			# 			"Authorization": "Bearer #{gdocs.accessToken}"
			#  		},
			#  		contentType: 'application/json'
			#  		processData: false
			 		# data: JSON.stringify { "title": "Silver Rings", "mimeType": "application/vnd.google-app.folder" }
				

)