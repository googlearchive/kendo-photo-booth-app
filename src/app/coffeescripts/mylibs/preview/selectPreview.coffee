define([
  'libs/webgl/effects'
  'mylibs/utils/utils'
  'text!mylibs/preview/views/selectPreview.html'
], (effects, utils, template) ->
    
    ###     Select Preview

    Select preview shows pages of 6 live previews using webgl effects

    ###

    # object level vars

    paused = false
    canvas = {}
    ctx = {}
    previews = []
    $container = {}
    webgl = fx.canvas()
    frame = 0
    width = 200
    height = 150
    direction = "left"

    # define the animations. we slide different directions depending on if we are going forward or back.
    pageAnimation = () ->

        pageOut: "slide:#{direction} fadeOut"
        pageIn: "slideIn:#{direction} fadeIn"
        
    # the main draw loop which renders the live video effects      
    draw = ->

        if not paused

            # get the 2d canvas context and draw the image
            # this happens at the curent framerate
            ctx.drawImage(window.HTML5CAMERA.canvas, 0, 0, width, height)
            
            # for each of the preview objects, create a texture of the 
            # 2d canvas and then apply the webgl effect. these are live
            # previews
            for preview in previews

                # increment the curent frame counter. this is used for animated effects
                # like old movie and vhs. most effects simply ignore this
                frame++

                # if this is a face tracking effect, we need to pass in a regular canvas
                # instead of a webgl one
                if preview.kind == "face"

                    preview.filter(preview.canvas, canvas)

                # otherwise pass in the webgl canvas, the canvas that contains the 
                # video drawn from the application canvas and the current frame.
                else
           
                    preview.filter(preview.canvas, canvas, frame)

        # LOOP!
        utils.getAnimationFrame()(draw)
    
    # anything under here is public
    pub = 
        
        # makes the internal draw function publicly accessible
        draw: ->
            
            draw()
            
        
        init: (containerId) ->
            
            # initialize effects
            effects.init()

            # create an internal canvas that contains a copy of the video. we can't
            # modify the original video feed so we'll modify a copy instead.
            canvas = document.createElement("canvas")
            ctx = canvas.getContext("2d")

            # listen for the show event which shows this piece of the ui
            $.subscribe("/selectPreview/show", ->
                
                # set the canvas width and height (object level vars). this is done
                # again here because the 'preview' ui changes the size and we need to change
                # it back
                canvas.width = width
                canvas.height = height

                # show this ui with some transitions
                $container.kendoStop(true).kendoAnimate({ effects: "zoomIn fadeIn", show: true, duration: 500, complete: ->
                    $("footer").kendoStop(true).kendoAnimate({ effects: "fadeIn", show: true, duration: 200 })
                    
                    # when the transitions finish, unpause
                    paused = false
                    
                    # we're back in 'select a preview' mode
                    effects.isPreview = true
                })
            )
            
            # the container for this DOM fragment is passed in by the module
            # which calls it's init. grab it from the DOM and cache it.
            $container = $("##{containerId}")

            # get a reference to the more and back buttons
            $buttons = $container.find("button")

            # set the canvas width and height (object level vars)
            canvas.width = width   
            canvas.height = height
            
            # get back the presets and create a custom object
            # that we can use to dynamically create canvas objects
            # and effects

            # create objects which will cache the DOM elements for the current page
            # and the next page of effects
            $currentPage = {};
            $nextPage= {};

            # create a new kendo data source
            ds = new kendo.data.DataSource
                    
                # set the data equal to the array of effects from the effects
                # object
                data: effects.data
                
                # we want it in chunks of six
                pageSize: 6
                
                # when the data source changes, this event will fire
                change: ->

                    # set the $currentPage and $nextPage objects. these swap each
                    # time page changes so we need to get them again
                    $currentPage = $container.find(".current-page")
                    $nextPage = $container.find(".next-page")

                    # pause. we are changing pages so stop drawing.
                    paused = true

                    # create an array of previews for the current page
                    previews = []

                    for item in this.view()

                        # this is wrapped in a closure so that it doesn't step on itself during
                        # the async loop
                        do ->

                            # get the template for the current preview
                            $template = kendo.template(template)

                            # create a preview object which extends the current item in the dataset
                            preview = {}
                            $.extend(preview, item)

                            # if this is a face tracking effect, we need to create a regular canvas
                            # object and set its size
                            if item.kind == "face"
                                preview.canvas = document.createElement "canvas"
                                preview.canvas.width = 200
                                preview.canvas.height = 150
                            # otherise, create a webgl canvas
                            else
                                preview.canvas = fx.canvas()               

                            # run the DOM template through a kendo ui template
                            content = $template({ name: preview.name, width: width, height: height })

                            # wrap the template output in jQuery
                            $content = $(content)

                            # push the current effect onto the array
                            previews.push(preview)
                        
                            # clicking on a canvas will cause it to go into full preview mode with the selected effect
                            $content.find("a").append(preview.canvas).click(->

                                # pause as we transition out of this state of the ui
                                paused = true

                                # animate the this ui out
                                $("footer").kendoStop(true).kendoAnimate({ effects: "fadeOut", hide: true, duration: 200 })
                                $container.kendoStop(true).kendoAnimate({ effects: "zoomOut fadeOut", hide: true, duration: 500 })
                                
                                # bring in the full preview ui by dispatching the event
                                $.publish "/preview/show", [preview]
                            )
                
                            # append the content we just created with templates to the next page which is going to be transitioned
                            # in as the current page is transitioned out
                            $nextPage.append($content)

                            # transition out the current page
                            $currentPage.kendoStop(true).kendoAnimate { effects: "#{ pageAnimation().pageOut }", duration: 500, hide: true, complete: ->

                                # swap classes with the next page
                                $currentPage.removeClass("current-page").addClass("next-page")
                                
                                # remove any previews added
                                $currentPage.find(".preview").remove()

                            }   

                            # transition in the next page
                            $nextPage.kendoStop(true).kendoAnimate { effects: "#{ pageAnimation().pageIn }", duration: 500, show: true, complete: ->

                                # swap classes and make this the current page
                                $nextPage.removeClass("next-page").addClass("current-page")
                                
                                # clear the buffer in the effects
                                effects.clearBuffer()

                                # unpause and draw
                                paused = false

                                # enable the buttons
                                $buttons.removeAttr "disabled"
                            }


            ### Pager Actions  ###

            # when the user clicks the more button
            $container.on "click", ".more", ->

                # disable the buttons
                $buttons.attr "disabled", "disabled"

                # pause the ui
                paused = true

                # set the direction for the slide
                direction = "left"

                # if the current page is less than the total number of pages
                if ds.page() < ds.totalPages()

                    # go to the next page
                    ds.page(ds.page() + 1)            

                else

                    # otherwise, go to page 1
                    ds.page(1)

            # when the user clicks the back button
            $container.on "click", ".back", ->

                # disable the buttons
                $buttons.attr "disabled", "disabled"

                # pause the ui
                paused = true

                # set the direction for the slides
                direction = "right"

                # if the current page is page 1
                if ds.page() == 1

                    # go to the last page
                    ds.page(ds.totalPages())

                else

                    # otherwise just go back 1 page
                    ds.page(ds.page() - 1)

            # read from the datasource
            ds.read()    
    
)
