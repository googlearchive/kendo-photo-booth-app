chrome.app.runtime.onLaunched.addListener(function() { 
  
  function onWindowLoaded(win) {
  	console.log(win)
  }

  var win = chrome.app.window.create('main.html', { 
  	width: 1024, 
  	height: 870,
  	minWidth:900,
  	minHeight:800,
  	left:500,
  	top:500
  	}, 
  	onWindowLoaded);
});

