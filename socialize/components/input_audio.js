import { useState } from 'react';

const InputAudio = ({list}) => {

	const [disp , setDisp] = useState(false);

	const toggleDisp = () => {
		setDisp(!disp);
	}

	return(
		<ol className='mb-5'>
			<li key='1' className='grid grid-cols-[max-content_1fr_max-content] space-x-3 border border-gray-400 px-4 cursor-default'>
				<span>Input Audio : </span>
				<span>{list[0]['label']}</span>
				<span className={`text-xl ${disp ? 'transition transition-transform duration-300 rotate-90' :'transition transition-transform duration-300 -rotate-90'}`} onClick={toggleDisp}>&lt;</span>
			</li>
			{disp
			?
			<>
				{list.map((item , index)=>(
					<li className='border border-gray-400 px-1 hover:bg-gray-100 cursor-default' key={index}>{item['label']}</li>
				))}
			</>
			:
			null
			}
		</ol>
	)
}
export default InputAudio;