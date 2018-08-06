'use strict';
let localStream = null;
let peer = null;
let existingCall = null;
let p_apikey = null;


if (1 <= document.location.search.length) {
	// URLパラメータを取得
	var data = document.location.search.substring(1);
	var parameters = data.split('?');

	// 各URLパラメータに対して処理実施
	for (var i = 0; i < parameters.length; i++) {
		var element = parameters[i].split('=');
		if (element[0] === "apikey") {
			p_apikey = element[1];
		}
	}
}


if(p_apikey == null) {
	alert("APIキーが指定されていません");
}
else {
	navigator.mediaDevices.getUserMedia({video: true, audio: false})
	    .then(function (stream) {
	        // Success
	        $('#my-video').get(0).srcObject = stream;
	        localStream = stream;
	    }).catch(function (error) {
	        // Error
	        console.error('mediaDevice.getUserMedia() error:', error);
	        return;
	    });

	peer = new Peer({
	    key: p_apikey,								// skyway
	    debug: 3
	});

	peer.on('open', function(){
		// シグナリングサーバと接続し、準備完了となった場合
	    $('#my-id').text(peer.id);
	});

	peer.on('error', function(err){
		// 何らかのエラーが生じた場合
	    alert(err.message);
	});

	peer.on('close', function(){
		//	相手との切断が切れた場合
	});


	peer.on('disconnected', function(){
		//	シグナリングサーバーとの接続が切れた場合
	});

	$('#make-call').submit(function(e){
	    // 発信ボタンクリック時の発信処理
	    e.preventDefault();
	    const call = peer.call($('#callto-id').val(), localStream);	// 相手のPeerID(別途入手)、自分のlocalStream
	    setupCallEventHandlers(call);
	});

	$('#end-call').click(function(){
		// 切断ボタンクリック時の切断処理
	    existingCall.close();
	});

	peer.on('call', function(call){
		// 着信処理	相手から接続要求が来た場合の処理
	    call.answer(localStream);
	    setupCallEventHandlers(call);
	});



	function setupCallEventHandlers(call){
	    if (existingCall) {
	        existingCall.close();
	    };

	    existingCall = call;
	    // 省略
	    
	    call.on('stream', function(stream){
	        addVideo(call,stream);
	        setupEndCallUI();
	        $('#their-id').text(call.remoteId);
	    });
	    
	    call.on('close', function(){
	        removeVideo(call.remoteId);
	        setupMakeCallUI();
	    });
	    
	}

	function addVideo(call,stream){
		// VIDEOを再生するための処理
	    $('#their-video').get(0).srcObject = stream;
	}


	function removeVideo(peerId){
		// 切断された（した）相手のvideo要素を削除するための処理
		// PeerIDを元に削除
	    $('#'+peerId).remove();
	}

	function setupMakeCallUI(){
	    $('#make-call').show();
	    $('#end-call').hide();
	}

	function setupEndCallUI() {
	    $('#make-call').hide();
	    $('#end-call').show();
	}
}









    