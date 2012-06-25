define([
  'libs/face/ccv'
  'libs/face/face'
], ($, kendo) ->

    face = {
        
        props: 
            glasses: new Image()
            horns: new Image()
            hipster: new Image()
            sombraro: new Image()

        backCanvas: document.createElement "canvas"

        comp: []

        lastCanvas: {}

        backCtx: {}
    }
    
    safeCanvas = document.createElement("canvas")
    safeCtx = safeCanvas.getContext("2d")

    timeStripsBuffer = []
    ghostBuffer = []

    draw = (canvas, element, effect) ->
        texture = canvas.texture(element)
        canvas.draw(texture)

        effect()

        canvas.update()
        texture.destroy()

    faceCore = (video, canvas, prop, callback) ->

        backCanvas = backCanvas || document.createElement("canvas")
        backCanvas.width = 200

        backCtx = backCtx || backCanvas.getContext("2d")

        if face.lastCanvas != canvas                      
            face.ctx = canvas.getContext "2d"

        #face.backCanvas = document.createElement canvas

        face.ctx.drawImage(video, 0, 0, video.width, video.height)
        backCtx.drawImage(video, 0, 0, backCanvas.width, backCanvas.height)

        if not pub.isPreview

            comp = ccv.detect_objects {
                canvas: backCanvas,
                cascade: cascade,
                interval: 4,
                min_neighbors: 1
            }

        else [{ x: video.width * .375, y: video.height * .375, width: video.width / 4, height: video.height / 4 }]

    trackFace = (video, canvas, prop, xoffset, yoffset, xscaler, yscaler) ->

        aspectWidth = video.width / face.backCanvas.width
        face.backCanvasheight = (video.height / video.width) * face.backCanvas.width
        aspectHeight = video.height / face.backCanvas.height

        comp = faceCore video, canvas, prop

        if comp.length
            face.comp = comp

        for i in face.comp
            face.ctx.drawImage prop, 
                (i.x * aspectWidth) - (xoffset * aspectWidth), 
                (i.y * aspectHeight) - (yoffset * aspectHeight),
                (i.width * aspectWidth) * xscaler, 
                (i.height * aspectWidth) * yscaler


    trackHead = (video, canvas, prop, xOffset, yOffset, width, height) ->

        aspectWidth = video.width / face.backCanvas.width
        face.backCanvasheight = (video.height / video.width) * face.backCanvas.width
        aspectHeight = video.height / face.backCanvas.height

        comp = faceCore video, canvas, prop

        if comp.length
            face.comp = comp

        for i in face.comp
            face.ctx.drawImage prop, 
            i.x * aspectWidth - (xOffset * aspectWidth), 
            (i.y * aspectHeight) - (yOffset * aspectHeight), 
            (i.width * aspectWidth) + (width * aspectWidth), 
            (i.height * aspectHeight) + (height * aspectHeight)     

    pub = 

        isPreview: true

        clearBuffer: ->

            timeStripsBuffer = []
            ghostBuffer = []

        init: ->

            face.props.glasses.src = "images/glasses.png"
            face.props.horns.src = "images/horns.png"
            face.props.hipster.src = "images/hipster.png"
            face.props.sombraro.src = "images/sombraro.png"


        data: [

                {

                    name: "Normal"
                    kind: "webgl"
                    filter: (canvas, element) ->
                        effect = ->
                            canvas
                        draw(canvas, element, effect)

                }


                {
                    name: "In Disguise"
                    kind: "face"
                    filter: (canvas, video) ->

                        face.ctx = canvas.getContext("2d")

                        face.backCtx = face.backCanvas.getContext("2d")

                        face.backCtx.drawImage video, 0, 0, 200, 150
                        
                        face.ctx.drawImage video, 0, 0, video.width, video.height

                        aspectWidth = video.width / face.backCanvas.width
                        face.backCanvasheight = (video.height / video.width) * face.backCanvas.width
                        aspectHeight = video.height / face.backCanvas.height

                        #face.ctx.drawImage video, 0, 0, 200, 150

                        #face.backCanvas.width = 200
                        #face.backCanvas.height = 150

                        #face.ctx.drawImage video, 0, 0, video.width, video.height

                        if not pub.isPreview

                            comp = ccv.detect_objects {
                                canvas: face.backCanvas,
                                cascade: cascade,
                                interval: 4,
                                min_neighbors: 1
                            }

                            if comp.length > 0  
                                face.comp = comp

                            for i in face.comp
                                console.log(comp.length)
                                face.ctx.drawImage face.props.glasses, 
                                (i.x * aspectWidth) - (0 * aspectWidth), 
                                (i.y * aspectHeight) - (0 * aspectHeight),
                                (i.width * aspectWidth) * 1, 
                                (i.height * aspectWidth) * 1

                        #else [{ x: video.width * .375, y: video.height * .375, width: video.width / 4, height: video.height / 4 }]

                        # safeCtx.drawImage(video, 0, 0, video.width, video.height)
                        # trackFace safeCanvas, canvas, face.props.glasses, 0, 0, 1, 1
                        
                }

                # {
                #     name: "Horns"
                #     kind: "face"
                #     filter: (canvas, video) ->

                #         ctx = canvas.getContext("2d")
                #         imgData = ctx.getImageData(video, 0, 0)
                #         ctx.putImageData(imgData, 0, 0, video.width, video.height)

                #         trackHead video, canvas, face.props.horns, 0, 25, 0, 0
                # }

                
                # {
                #     name: "Hipsterizer"
                #     kind: "face"
                #     filter: (canvas, video) ->

                #         trackFace video, canvas, face.props.hipster, 0, 0, 1, 2.2
                # }

                # {
                #     name: "Sombraro"
                #     kind: "face"
                #     filter: (canvas, video) ->

                #         trackFace video, canvas, face.props.sombraro, 75, 25, 4, 2
                # }

                
        ]
            
)
