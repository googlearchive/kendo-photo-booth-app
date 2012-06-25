chrome.experimental.app.onLaunched.addListener(function() { 
  
  function onWindowLoaded(win) {
  	console.log(win)
  }

  var win = chrome.appWindow.create('main.html', { 
  	width: 1024, 
  	height: 870,
  	minWidth:900,
  	minHeight:800,
  	left:500,
  	top:500
  	}, 
  	onWindowLoaded);
});

