define([
  'mylibs/utils/utils'
  'libs/webgl/effects'
  'libs/webgl/glfx.min'
], (utils, effects) ->
    
    ###     Preview

    Shows the large video with selected effect giving the user the chance to take 
    a snapshot or a photostrip

    ###

    # object level vars

    $container = {}
    canvas = {}
    ctx = {}
    webgl = {}
    paused = true
    preview = {}
    width = 460
    height = 340
    frame = 0
    currentCanvas = {}
    click = document.createElement("audio")
    
    # the draw loop. called at the current framerate
    draw = ->
        
        # if we are paused, don't do anything. this is to save
        # processing cycles when possible. WebGL is hard on the GPU.
        if not paused
            
            # draw the image from the global canvas element to the local canvas
            ctx.drawImage(window.HTML5CAMERA.canvas, 0, 0, width, height)
            
            # increment the current frame integer (this is for effects that have 
            # animation like 'old movie' or 'vhs'. most effects simply ignore this value.
            frame++

            # if this is a face detection effect, we're not using webgl, so we need a standard
            # canvas, not a webgl one.
            if preview.kind == "face"

                # we need to pass in a reference to the original unadulturated
                # feed to avoid cross-origin problems
                preview.filter(canvas, window.HTML5CAMERA.canvas)

            else

                # apply the glfx filter
                preview.filter(webgl, canvas, frame)

        # LOOP!
        utils.getAnimationFrame()(draw)
        
    # everything under this is public
    pub =
        
        init: (container) ->

            # initialize the sounds so they are ready to play
            click.src = "sounds/click.mp3"
            click.buffer = "auto"
            
            # create a blank canvas which will hold a copy of the global canvas. we
            # don't want to alter the global canvas in any way, so we're going to alter
            # this one instead.
            canvas = document.createElement("canvas")
            ctx = canvas.getContext("2d")

            # the container is passed in from whatever module inits this one
            $container = $("##{container}")
            
            # find the DOM elements we are going to be animating during transitions
            $header = $container.find(".header")
            $preview = $container.find(".body")
            $mask = $container.find(".mask")
            $footer = $container.find(".footer")

            # create a new webgl canvas
            webgl = fx.canvas()

            # append both the webgl canvas and the regular one. we may need them both.
            $preview.append(canvas)
            $preview.append(webgl)
            
            # subscribe to the show message
            $.subscribe("/preview/show", (e) ->
                
                # tell the effects that we aren't in preview mode anymore. this causes
                # the face tracking to kick in. it's static in 'select preview' mode.
                effects.isPreview = false

                # clear the buffers for effects that use a texture buffer (timestrips and ghost)
                effects.clearBuffer()

                # create a new preview object based on the one passed into 
                # this event
                $.extend(preview, e)

                # if this is face tracking, we need to hide the webgl canvas
                if preview.kind == "face"
                    $(webgl).hide()
                    $(canvas).show()
                    currentCanvas = canvas
                # otherwise show the webgl and hide the regular. cache a reference to whatever
                # canvas is the one we are using.
                else
                    $(webgl).show()
                    $(canvas).hide()
                    currentCanvas = webgl

                # unpause so we start to draw
                paused = false
                
                # resize the canvas to the specified width/height (object level vars)
                canvas.width =  width
                canvas.height = height
                
                # move the view into place with some nice fade and slide transitions
                $header.kendoStop(true).kendoAnimate({ effects: "fadeIn", show: true, duration: 500 })
                $preview.kendoStop(true).kendoAnimate({ effects: "zoomIn fadeIn", show: true, duration: 500})
                $footer.kendoStop(true).kendoAnimate({ effects: "slideIn:up fadeIn", show: true, duration: 500, complete: ->
                    $("footer").kendoStop(true).kendoAnimate({ effects: "fadeIn", show: true, duration: 200 })
                })
            )
            
            # attach a click event to the button which takes you back to the select an effect mode
            $container.find("#effects").click(->
                
                # we're leaving preview mode, so we don't need to draw anymore
                paused = true

                # transition the view out
                $("footer").kendoStop(true).kendoAnimate({ effects: "fadeOut", hide: true, duration: 200 })
                $header.kendoStop(true).kendoAnimate({ effects: "fadeOut", hide: true, duration: 500 })
                $preview.kendoStop(true).kendoAnimate({ effects: "zoomOut fadeOut", hide: true, duration: 500 })
                $footer.kendoStop(true).kendoAnimate({ effects: "slide:down fadeOut", hide: true, duration: 500 })
                
                # show the select previews ui
                $.publish("/selectPreview/show")
                
            )
            
            # listen for the snapshot event
            $.subscribe "/preview/snapshot", ->
                
                # disable the controls so people don't click twice before the app is done 
                # taking an image
                $.publish "/controls/enable", [ false ]

                # this callback executes the flash effect and actually gets the image
                # off the canvas
                callback = ->
                    
                    click.play()

                    $mask.fadeIn 50, -> 
                        $mask.fadeOut 900
                        $.publish "/pictures/create", [ { image: currentCanvas.toDataURL() , name: null, photoStrip: false, save: true } ]
                        $.publish "/controls/enable", [ true ]

                # tell the camera to countdown
                $.publish("/camera/countdown", [3, callback])

            # listen for the photobooth button click
            $.subscribe "/preview/photobooth", ->

                # disabled controls
                $.publish "/controls/enable", [ false ]

                # create an array of images that will comprise the strip
                images = []

                # this is the number of photos that will be in the strip
                photoNumber = 4

                # this callback executes after the camera countdown
                callback = ->

                    click.play()

                    # decrement the number of photos we still need to take
                    --photoNumber

                    # do the flash effect on the canvas
                    $mask.fadeIn 50, -> 
                        $mask.fadeOut 900, ->

                            # grab the current image from the canvas and push it onto
                            # the images array
                            images.push currentCanvas.toDataURL()

                            # if we still have more photos to take
                            if photoNumber > 0

                                # tell the camera to countdown again
                                $.publish "/camera/countdown", [3, callback]

                            else

                                # otherwise publish the event that creates the photostrip
                                # passing in an array of images that it will use.
                                $.publish("/photobooth/create", [images])

                                # enable controls
                                $.publish "/controls/enable", [ true ]

                # tell the camera to countdown for the first image
                $.publish "/camera/countdown", [3, callback]
                        
            # start drawing the video/effect
            draw()
    
)
