/* eslint-disable require-jsdoc */
let p_apikey = null;
let p_peerID = null;

// URLパラメータを取得
var data = document.location.search.substring(1);
var parameters = data.split('?');

// 各URLパラメータに対して処理実施
if (1 <= document.location.search.length) {
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
	const peer = new Peer({
		key: p_apikey,
		debug: 3,
	});

	let localStream;

	peer.on('open', () => {
		$('#my-id').text(peer.id);
		$('#your-id').text(p_peerID);
		const call = peer.call(p_peerID);

		// Wait for stream on the call, then set peer video display
		call.on('stream', stream => {
			const el = $('#video').get(0);
			el.srcObject = stream;
			el.play();
		});

		call.on('close', () => {
			console.log('connection closed');
		});
		//});
	});

	// Receiving a call
	peer.on('call', call => {
		// Answer the call automatically (instead of prompting user) for demo purposes
		call.answer(localStream);
	});

	peer.on('error', err => {
		//alert(err.message);
		alert("接続相手の電源が入っていないもしくはネット接続されていません");
		window.open('about:blank', '_self').close();
	});
}


