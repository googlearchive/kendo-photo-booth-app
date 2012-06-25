# Filename: main.js

require([

  # Load our app module and pass it to our definition function
  'order!libs/jquery/jquery'
  'app',

], ($, app) ->
	app.init()
)