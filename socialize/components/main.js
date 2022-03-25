import { useEffect , useState , useRef } from 'react';
import InputVideo from './input_video';
import InputAudio from './input_audio';
import OutputSpeaker from './output_speaker';

const Main = () => {

	const inputRef = useRef(null);
	const [username , setUsername] = useState('');
	const [audioinput , setAudioInput] = useState([]);
	const [videoinput , setVideoInput] = useState([]);
	const [speakeroutput , setSpeakerOutput] = useState([]);
	const [mediastream , setMediaStream] = useState(null);
	const [ready , setReady] = useState(false);
	const [camera , setCamera] = useState(true);
	const [socket , setSocket] = useState(null);

	const makeOfferCall = async(ws , pc) => {

		mediastream.getTracks().forEach(track=>{
			pc.addTrack(track , mediastream);
		});

		pc.addEventListener('connectionstatechange' , async event => {
			console.log('connection state change');
			console.log(event);
		})

		pc.addEventListener('track' , async(event) => {
			console.log('inside make offer console');
			const [remoteStream] = event.streams;
			document.querySelector('#receiver').srcObject = event.streams[0];
			console.log(remoteStream);
		})

		pc.addEventListener('icecandidate' , event => {
			// THIS IS THE EVENT OF THE CALLER
			if(event.candidate){
				ws.send(JSON.stringify({'new-ice-candidate' : event.candidate}));
			}
		})


		const offer = await pc.createOffer();
		await pc.setLocalDescription(offer);
		ws.send(JSON.stringify({'offer' : offer}));
	}

	const makeAnswerCall = async(ws , pc , parsed_offer , id) => {

		mediastream.getTracks().forEach(track=>{
			pc.addTrack(track , mediastream);
		});

		pc.addEventListener('connectionstatechange' , event => {
			console.log('aswer');
			console.log(event);
		})

		pc.addEventListener('track' , async(event) => {
			console.log('stream');
			console.log(event);
			const [remoteStream] = event.streams;
			document.querySelector('#receiver').srcObject = event.streams[0];
		})

		pc.addEventListener('icecandidate' , event => {
			// THIS IS THE EVENT OF THE RECEIVER
			if(event.candidate){
				ws.send(JSON.stringify({'new-ice-candidate' : event.candidate , 'id' : id}));
			}
		})

		const remoteDesc = new RTCSessionDescription(parsed_offer);
		await pc.setRemoteDescription(remoteDesc);

		const answer = await pc.createAnswer();
		await pc.setLocalDescription(answer);
		// ws.send(JSON.stringify({'type' : 'answer' , 'answer' : answer , 'id' : id}));
		ws.send(JSON.stringify({'answer' : answer , 'id' : id}));

	}

	const addUser = () => {
		if(username !== '' || username !== ' '){
			setUsername('');

			// CREATING A SIGNALLING CHANNEL
			const ws = new WebSocket(`ws://127.0.0.1:8000/ws/video_call/${username}/`);

			let id=''

			const configuration = {'iceServers' : [{'urls' : 'stun:stun.l.google.com:19302'}]};
			const peerConnection = new RTCPeerConnection(configuration);

			ws.onmessage = async(event) => {
				const data = JSON.parse(event.data);

				if(data.status === 201 && data.msg === 'create_offer'){
					makeOfferCall(ws , peerConnection);
				}
				else{
					if(data.offer){
						// setId(data['_id']);
						id = data['_id']
						// PEER HAS SENT AN OFFER REQUEST
						// SEND AN ANSWER SDP BACK TO THE PEER
						
						makeAnswerCall(ws , peerConnection , data.offer , data['_id']);
					}
					else {
						if(data.answer){
							const remoteDesc = new RTCSessionDescription(data.answer);
							await peerConnection.setRemoteDescription(remoteDesc)
						}
						else {
							if(data.candidate){
								try {
									await peerConnection.addIceCandidate(data);
								}
								catch(error){
									console.log(error);
									console.log(data)
									console.log(data.candidate);
								}
							}
						}
					}
				}
			}
			setSocket({socket : ws});
		}
	}

	const checkkey = event => {
		if(event.which === 13) {
			addUser();
		}
	}

	const handleInput = event => {
		setUsername(event.target.value);
	}

	const inputAudioSource = souce => {
		console.log(source);
	}

	const inputVideoSource = event => {
		console.log(source);
	}

	const ouputSpeakerSource = souce => {
		console.log(source);
	}

	const enableCamera = (opt) => {
		const videoTrack = mediastream.getVideoTracks()[0];
		if(opt === 'on'){
			setCamera(true);
			videoTrack.enabled = true;
		}
		else{
			if(opt === 'off'){
				setCamera(false);
				videoTrack.enabled = false;

			}
		}
	}

	useEffect(()=>{
		inputRef.current.focus();

		navigator.mediaDevices.getUserMedia({
			'audio' : true,
			'video' : {
					'width' : {ideal : 1920 },
					'height' : { ideal : 1080 },
			}
		})
		.then(mediaStream => {
			setMediaStream(mediaStream);
			document.querySelector('#caller').srcObject = mediaStream;
			navigator.mediaDevices.enumerateDevices()
			.then(devices => {
				let audioinputlist = [];
				let videoinputlist = [];
				let audiooutputlist = [];

				devices.forEach(device => {
					if(device.kind === 'audioinput'){
						audioinputlist.push({'deviceId' : device.deviceId , 'kind' : device.kind , 'label' : device.label});
					}
					else{
						if(device.kind === 'audiooutput'){
							audiooutputlist.push({'deviceId' : device.deviceId , 'kind' : device.kind , 'label' : device.label});
						}
						else{
							if(device.kind === 'videoinput'){
								videoinputlist.push({'deviceId' : device.deviceId , 'kind' : device.kind , 'label' : device.label});
							}
						}
					}
				});

				setAudioInput(audioinput => audioinputlist);
				setVideoInput(videoinput => videoinputlist);
				setSpeakerOutput(speakeroutput => audiooutputlist);
				setReady(true);
			})
			.catch(error=>console.log(error));
		})
		.catch(error=>console.log(error));
	},[])

	return(
		<>
			{ready
			?
			<>
				<InputAudio list={audioinput} />
				<InputVideo list={videoinput} />
				<OutputSpeaker list={speakeroutput} />
			</>
			:
			null
			}
			<div className='text-center pt-20 space-x-3'>
				<input type='text' className='w-40 focus:outline-none border border-gray-300 p-1 rounded-lg' placeholder='Enter username' value={username} ref={inputRef} onChange={handleInput} onKeyUp={checkkey} />
				<button className='outline-none border border-gray-400 bg-white shadow-inner text-lg px-3 rounded-lg hover:bg-gray-100 focus:bg-gray-200' onClick={addUser}>Send</button>
			</div>
			<video autoPlay playsInline id='caller' className='w-96 h-96 bg-black mb-1 object-cover' />
			<br />
			<button className='border border-gray-400 px-8 hover:bg-gray-100 active:bg-gray-200' onClick={()=>enableCamera('on')}>
				On
			</button>
			<button className='border border-gray-400 px-8 hover:bg-gray-100 active:bg-gray-200' onClick={()=>enableCamera('off')}>Off</button>
			<video autoPlay playsInline id='receiver' className='mt-8 w-96 h-96 bg-black object-cover' />
		</>
	);
}
export default Main;