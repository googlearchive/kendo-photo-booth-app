# Filename: main.js

require([

  # Load our app module and pass it to our definition function
  'app'
  'order!libs/jquery/plugins'

], (app) ->
	app.init()
)