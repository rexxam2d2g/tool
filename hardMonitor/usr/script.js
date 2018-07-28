/* eslint-disable require-jsdoc */
let p_apikey = null;
let p_peerID = null;

// URLパラメータを取得
var data = document.location.search.substring(1);
var parameters = data.split('?');

// 各URLパラメータに対して処理実施
if (1 >= document.location.search.length) {
	alert("test");
	for (var i = 0; i < parameters.length; i++) {
		// 各パラメータを格納
		var element = parameters[i].split('=');
		if (element[0] === "apikey") {
			p_apikey = element[1];
		}
		else if (element[0] === "peerID") {
			p_peerID = element[1];
		}
	}
}


// 適切なパラメータが無ければ停止
if (p_apikey == null) {
	alert("APIキーが指定されていません");
	window.open('about:blank', '_self').close();
}
else if (p_peerID == null) {
	alert("PeerIDが指定されていません");
	window.open('about:blank', '_self').close();
}
else {
	// Peer object
	alert("test");
	const peer = new Peer({
		key: p_apikey,
		debug: 3,
	});

	let localStream;

	peer.on('open', () => {
		$('#my-id').text(peer.id);
	});

	// Receiving a call
	peer.on('call', call => {
		// Answer the call automatically (instead of prompting user) for demo purposes
		call.answer(localStream);
	});

	peer.on('error', err => {
		alert(err.message);
	});

	// Click handlers setup
	/*
	$('#broadcast').on('submit', e => {
		e.preventDefault();
		navigator.mediaDevices.getUserMedia({ audio: true, video: true }).then(stream => {
			$('#video').get(0).srcObject = stream;
			localStream = stream;
		}).catch(err => {
			$('#step1-error').show();
			console.error(err);
		});
	});
	*/

	$('#watch').on('submit', e => {
		e.preventDefault();
		// Initiate a call!
		console.log($('#callto-id').val());
		const call = peer.call($('#callto-id').val());

		// Wait for stream on the call, then set peer video display
		call.on('stream', stream => {
			const el = $('#video').get(0);
			el.srcObject = stream;
			el.play();
		});

		call.on('close', () => {
			console.log('connection closed');
		});
	});
}


