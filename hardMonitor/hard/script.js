'use strict';
let s_localStream = null;
let s_peer = null;
let s_existingCall = null;
let p_apikey = null;
let p_peerID = null;
let p_isDeviceTemp = null;


//////////////////////////////////////////////////////////////////////
// 定義部
//////////////////////////////////////////////////////////////////////
const C_DEBUG_MODE = false;
const C_AUDIO_ENABLE = false;
const C_VIDEO_ENABLE = true;

// 映像・音声デバイスの規定値
// ※オーディオはブラウザ画面のアドレスバー内のカメラアイコンから確認して任意のものを指定
// ※ビデオは"console.log(device)"のコメントを外してブラウザの開発者ツールから確認して任意のものを指定
const c_AUDIO_MIC_KIND = "audioinput";
const c_AUDIO_MIC_LABEL = "AK5371, USB Audio-Default Audio Device";
const c_AUDIO_SPEAKER_KIND = "audiooutput";
const c_AUDIO_SPEAKER_LABEL = "C-Media USB Headphone Set, USB Audio-Hardware device with all software conversions";
const c_VIDEO_KIND = "videoinput";
const c_VIDEO_LABEL = "mmal service 16.1";

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
					//window.location.reload();								// ブラウザを更新
					//windows.close();
					window.open('about:blank', '_self').close();
					clearInterval(tm);										// peer切断監視タイマ停止
				}
				else {
					tmCnt++;
					if (tmCnt >= c_wait_disconnectTime) {					// 任意周期分、切断待機した？
						console.log("Peer切断が確認できませんが、強制的に修了します");
						//window.location.reload();							// 強制的にブラウザを更新
						//windows.close();
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
	if (s_peer) {																// peer接続済み？
		if (!s_peerCloseReq) {												// peer切断要求が初回？
			s_peerCloseReq = true;											// peer切断要求を立てる
			s_peer.disconnect();												// シグナリングサーバへの接続を閉じ、disconnectedイベントを送出
			s_peer.destroy();													// 全てのコネクションを閉じ、シグナリングサーバへの接続を切断
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
			else if (element[0] === "isDeviceTemp") {
				p_isDeviceTemp = element[1];
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

				var constraints = null;

				// デバイス規定フラグが立っている？
				if (p_isDeviceTemp) {
					// 指定した映像・音声デバイスのIDを取得
					var micID = null
					var speakerID = null;
					var videoID = null;
					devices.forEach(function (device) {
						if ((device.kind == c_AUDIO_MIC_KIND) && (device.label == c_AUDIO_MIC_LABEL)) {
							micID = device.deviceId;
						}
						else if ((device.kind == c_AUDIO_SPEAKER_KIND) && (device.label == c_AUDIO_SPEAKER_LABEL)) {
							speakerID = device.deviceId;
						}
						else if ((device.kind == c_VIDEO_KIND) && (device.label == c_VIDEO_LABEL)) {
							videoID = device.deviceId;
						}
						//console.log(device);
					});

					// 指定した映像・音声デバイスが存在するか確認
					if (micID == null) {
						windowClose("既定のマイクが見つかりません\n" + c_AUDIO_MIC_LABEL);
					}
					else if (speakerID == null) {
						windowClose("既定のスピーカーが見つかりません\n" + c_AUDIO_SPEAKER_LABEL);
					}
					else if (videoID == null) {
						windowClose("既定のカメラが見つかりません\n" + c_VIDEO_LABEL);
					}
					else {
						// デバイス接続パラメータの生成(デバイスを直接指定)
						constraints = {
							"audio": {
								"deviceId": micID
							},
							"video": {
								"deviceId": videoID
							}
						};
						if (C_DEBUG_MODE) {
							alert("デバイス指定モードで起動します");
						}
					}
				}
				else {
					// デバイス接続パラメータの生成(デバイスの検出は自動で行う)
					constraints = {
						video: C_VIDEO_ENABLE,
						audio: C_AUDIO_ENABLE
					}
					if (C_DEBUG_MODE) {
						alert("デバイスオート指定モードで起動します");
					}
				}

				if (constraints == null) {
					windowClose('デバイス情報がセットされませんでした');
				}
				else {
					// デバイス接続処理
					//navigator.mediaDevices.getUserMedia({video: true, audio: true})
					navigator.mediaDevices.getUserMedia(constraints)
						.then(function (stream) {
							// 自身のストリーミングをローカルに設定
							$('#my-video').get(0).srcObject = stream;
							s_localStream = stream;

							// 相手のストリーミングの再生先を指定
							if (p_isDeviceTemp) {
								$('#their-video').get(0).setSinkId(speakerID)
									.then(function () {
										console.log('相手のストリーミングの再生先の指定に成功しました');
									})
									.catch(function (err) {
										windowClose('相手のストリーミングの再生先の指定に失敗しました:' + err);
									});
							}
						}).catch(function (error) {
							windowClose('デバイス接続処理に失敗しました:', error);
							return;
						});
				}
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
		if (C_DEBUG_MODE) {
			alert("下記にpeerの情報を示します\n" + s_peer);
			alert("API key : " + p_apikey);
			alert("PeerID : " + p_peerID);
		}

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

		// 発信ボタンクリック時の発信処理
		$('#make-call').submit(function (e) {
			// 発信ボタンは使わない仕様の為、未処理
			/*
			e.preventDefault();
			const call = s_peer.call($('#callto-id').val(), s_localStream);	// 相手のPeerID(別途入手)、自分のlocalStream
			setupCallEventHandlers(call);
			*/
		});

		// 切断ボタンクリック時の切断処理
		$('#end-call').click(function () {
			//s_existingCall.close();
			windowClose("切断ボタンがクリックされました");
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

			call.on('stream', function (stream) {
				addVideo(call, stream);
				setupEndCallUI();
				$('#their-id').text(call.remoteId);
				console.log("通信相手のストリームを取得しました");
			});

			call.on('close', function () {
				//removeVideo(call.remoteId);
				//setupMakeCallUI();
				windowClose("通信相手との通信が閉じられました");
			});

		}

		// VIDEOを再生するための処理
		function addVideo(call, stream) {
			$('#their-video').get(0).srcObject = stream;
		}

		// 切断された（した）相手のvideo要素を削除するための処理
		function removeVideo(peerId) {
			// PeerIDを元に削除
			$('#' + peerId).remove();
		}

		// Callボタン表示
		function setupMakeCallUI() {
			$('#make-call').show();
			$('#end-call').hide();
		}

		// Endボタン表示
		function setupEndCallUI() {
			$('#make-call').hide();

			// "End Call"ボタンにより通信終了した場合、URLパラメータが消されて
			// しまう為、操作不可とする。
			// アプリ終了はブラウザ自体を閉じることで行う。
			//$('#end-call').show();
		}

		// PeerIDをローカルストレージに書き込み
		function setMyPeerID(peerID) {
			//alert("set peerID : " + peerID);
			localStorage.setItem('skyway-peerID', peerID);
		}
	}
}
catch (e) {
	windowClose("Skyway処理中に例外が発生しました" + e);
}
