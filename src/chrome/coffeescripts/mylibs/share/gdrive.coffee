define([
], () ->

	GDRIVE_API = "https://www.googleapis.com/drive/v1/files"

	accessToken = ""

	pub = 
		
		init: ->

			# authorize the user to GDrive
			token = chrome.experimental.identity.getAuthToken (token) ->
				accessToken = token

				console.log accessToken

				formdata = new FormData()

				formdata.append("title", "HTML5")
				formdata.append("mimeType", "application/vnd.google-app.folder")

				# check to see if the right folder is present
				$.ajax 
					url: GDRIVE_API,
					beforeSend: (xhr) ->
						xhr.setRequestHeader("Authorization", "Bearer #{accessToken}")
						xhr.setRequestHeader("Content-Type", "application/json")
					type: "POST",
					data: {
						"title": "HTML5",
						"mimeType": "application/vnd/google-app.folder"
					}

			
)