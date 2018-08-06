'use strict';
let localStream = null;
let peer = null;
let existingCall = null;
let p_apikey = null;


if (1 <= document.location.search.length) {
	// URL�p�����[�^���擾
	var data = document.location.search.substring(1);
	var parameters = data.split('?');

	// �eURL�p�����[�^�ɑ΂��ď������{
	for (var i = 0; i < parameters.length; i++) {
		var element = parameters[i].split('=');
		if (element[0] === "apikey") {
			p_apikey = element[1];
		}
	}
}


if(p_apikey == null) {
	alert("API�L�[���w�肳��Ă��܂���");
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
		// �V�O�i�����O�T�[�o�Ɛڑ����A���������ƂȂ����ꍇ
	    $('#my-id').text(peer.id);
	});

	peer.on('error', function(err){
		// ���炩�̃G���[���������ꍇ
	    alert(err.message);
	});

	peer.on('close', function(){
		//	����Ƃ̐ؒf���؂ꂽ�ꍇ
	});


	peer.on('disconnected', function(){
		//	�V�O�i�����O�T�[�o�[�Ƃ̐ڑ����؂ꂽ�ꍇ
	});

	$('#make-call').submit(function(e){
	    // ���M�{�^���N���b�N���̔��M����
	    e.preventDefault();
	    const call = peer.call($('#callto-id').val(), localStream);	// �����PeerID(�ʓr����)�A������localStream
	    setupCallEventHandlers(call);
	});

	$('#end-call').click(function(){
		// �ؒf�{�^���N���b�N���̐ؒf����
	    existingCall.close();
	});

	peer.on('call', function(call){
		// ���M����	���肩��ڑ��v���������ꍇ�̏���
	    call.answer(localStream);
	    setupCallEventHandlers(call);
	});



	function setupCallEventHandlers(call){
	    if (existingCall) {
	        existingCall.close();
	    };

	    existingCall = call;
	    // �ȗ�
	    
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
		// VIDEO���Đ����邽�߂̏���
	    $('#their-video').get(0).srcObject = stream;
	}


	function removeVideo(peerId){
		// �ؒf���ꂽ�i�����j�����video�v�f���폜���邽�߂̏���
		// PeerID�����ɍ폜
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









    