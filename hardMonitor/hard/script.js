'use strict';
let s_localStream = null;
let s_peer = null;
let s_existingCall = null;
let p_apikey = null;
let p_peerID = null;


//////////////////////////////////////////////////////////////////////
// 定義部
//////////////////////////////////////////////////////////////////////
const C_DEBUG_MODE = false;
const C_AUDIO_ENABLE = true;
const C_VIDEO_ENABLE = true;

// シグナリングサーバ接続監視時間
const c_server_chkTime = 5 * 1000;

// シグナリングサーバ切断監視周期
const c_chk_disconnectTime = 1 * 1000;

// シグナリングサーバ切断待機周期数
const c_wait_disconnectTime = 5;


//////////////////////////////////////////////////////////////////////
// ウィンドウ更新処理
//////////////////////////////////////////////////////////////////////
var s_closeReq = false;
function windowClose(mes) {

	if (C_DEBUG_MODE) {
		alert(mes);
	}

	// 通信終了毎にブラウザを閉じなくても再接続可能になったので
	// 以下処理は未実施
	return;

	if (!s_closeReq) {
		s_closeReq = true;
		if (s_peer == null) {												// peer未接続？
			//window.location.reload();										// ブラウザ更新処理
			//windows.close();
			window.open('about:blank', '_self').close();
		}
		else {																// peer接続？
			peerClose();													// peer切断処理
			var tmCnt = 0;
			var tm = setInterval(() => {									// peer切断監視タイマ開始
				if (s_peerCloseRun == true) {								// peerが切断？
					console.log("正常終了しました");
					window.open('about:blank', '_self').close();
					clearInterval(tm);										// peer切断監視タイマ停止
				}
				else {
					tmCnt++;
					if (tmCnt >= c_wait_disconnectTime) {					// 任意周期分、切断待機した？
						console.log("Peer切断が確認できませんが、強制的に修了します");
						window.open('about:blank', '_self').close();
						clearInterval(tm);									// peer切断監視タイマ停止
					}
				}
			}, c_chk_disconnectTime);
		}
	}

	// ラズパイ側のウェブ起動モジュールで再起動を行う想定だったが
	// 不可であった為、ブラウザ側で更新する仕様に変更。
	// "End Call"ボタンクリック時にURLパラメータが消されてしまう為
	// 上記ボタンで閉じずにブラウザ自体を閉じて終了すること
	//windows.close();
}


//////////////////////////////////////////////////////////////////////
// Peer切断処理
//////////////////////////////////////////////////////////////////////
var s_peerCloseReq = false;
var s_peerCloseRun = false;
function peerClose() {
	if (s_peer) {															// peer接続済み？
		if (!s_peerCloseReq) {												// peer切断要求が初回？
			s_peerCloseReq = true;											// peer切断要求を立てる
			s_peer.disconnect();											// シグナリングサーバへの接続を閉じ、disconnectedイベントを送出
			s_peer.destroy();												// 全てのコネクションを閉じ、シグナリングサーバへの接続を切断
		}
	}
}


//////////////////////////////////////////////////////////////////////
// メイン処理
//////////////////////////////////////////////////////////////////////
console.log("Skyway処理を開始します");
var s_isOpen = false;
try {

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
		$('#my-id').text("Not setting to API Key");
		windowClose("APIキーが指定されていません");
	}
	else {
		// 利用可能な映像・音声デバイスの情報を取得
		navigator.mediaDevices.enumerateDevices()
			.then(function (devices) {

				// デバイス接続パラメータの生成(デバイスの検出は自動で行う)
				var constraints = {
					video: C_VIDEO_ENABLE,
					audio: C_AUDIO_ENABLE
				}

				// デバイス接続処理
				navigator.mediaDevices.getUserMedia(constraints)
					.then(function (stream) {
						// 自身のストリーミングをローカルに設定
						$('#their-video').get(0).srcObject = stream;
						s_localStream = stream;
					}).catch(function (error) {
						windowClose('デバイス接続処理に失敗しました:', error);
						return;
					});

			})
			.catch(function (err) {
				windowClose("利用可能な映像・音声デバイスが存在しません");
			});



		// シグナリングサーバとの接続実行
		console.log("シグナリングサーバとの接続を開始します");
		s_peer = new Peer(
			p_peerID,
			{
				key: p_apikey,
				debug: 3
			}
		);

		// シグナリングサーバ接続監視処理(接続要求から任意時間内に接続されない場合はリロード)
		var chkPeerOpen = setTimeout(() => {
			windowClose("シグナリングサーバとの接続に失敗しました");
		}, c_server_chkTime);

		// シグナリングサーバと接続し、準備完了となった場合
		s_peer.on('open', function () {
			clearTimeout(chkPeerOpen);
			s_isOpen = true;
			$('#my-id').text(s_peer.id);
			setMyPeerID(s_peer.id);
			console.log("シグナリングサーバと接続に成功しました");
		});

		// 何らかのエラーが生じた場合
		s_peer.on('error', function (err) {
			windowClose("シグナリングサーバとの通信中にエラーが発生しました");
		});

		//	相手との切断が切れた場合
		s_peer.on('close', function () {
			if (s_isOpen) {
				s_peerCloseRun = true;
				windowClose("シグナリングサーバとの通信が閉じられました");
			}
		});

		//	シグナリングサーバーとの接続が切れた場合
		s_peer.on('disconnected', function () {
			if (s_isOpen) {
				s_peerCloseRun = true;
				windowClose("シグナリングサーバとの通信が切断されました");
			}
		});

		// 着信処理	相手から接続要求が来た場合の処理
		s_peer.on('call', function (call) {
			call.answer(s_localStream);
			setupCallEventHandlers(call);
		});

		// Callイベントハンドラ作成
		function setupCallEventHandlers(call) {
			if (s_existingCall) {
				s_existingCall.close();
			};

			s_existingCall = call;
			// 省略

			/*
			call.on('stream', function (stream) {
				addVideo(call, stream);
				$('#your-id').text(call.remoteId);
				console.log("通信相手のストリームを取得しました");
			});
			*/

			call.on('close', function () {
				windowClose("通信相手との通信が閉じられました");
			});

		}

		/*
		// VIDEOを再生するための処理
		function addVideo(call, stream) {
			$('#their-video').get(0).srcObject = stream;
		}
		*/

		// PeerIDをローカルストレージに書き込み(別アプリにて本データを使用)
		function setMyPeerID(peerID) {
			localStorage.setItem('skyway-peerID', peerID);
		}
	}
}
catch (e) {
	windowClose("Skyway処理中に例外が発生しました" + e);
}
