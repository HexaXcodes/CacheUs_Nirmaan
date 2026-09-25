import {useEffect,useRef,useState} from 'react'
import {PositionFeedback} from './positionFeedback'
import {bpTarget,handTarget,projectPoint} from './bpGeometry'
import {useCopy} from '../../i18n/nirmaan'

// Reuses SIH's pretrained PoseLandmarker and model; no new model training,
// frame upload, or automatic medical-technique verdicts.
const WASM='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.17/wasm'
const MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task'
const HAND_MODEL='https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'
export default function TrackingOverlay({videoRef,stepId,kind}) {
  const t=useCopy()
  const layer=useRef(null),step=useRef(stepId)
  step.current=stepId
  const [frame,setFrame]=useState(null),[state,setState]=useState('loading'),[retry,setRetry]=useState(0)
  useEffect(()=>{setFrame(null)},[stepId])
  useEffect(()=>{
    let cancelled=false,detector,timer,lastTime=-1,lastFrameAt=0,watchdog
    const feedback=new PositionFeedback();let verdicts=[],lastStep=step.current
    setState('loading');setFrame(null)
    const fail=()=>{if(!cancelled){setState('error');setFrame(null)}}
    // A blocked asset request must not leave an endless loading state.
    watchdog=setTimeout(fail,20000)
    async function start(){
      try{
        const {FilesetResolver,PoseLandmarker,HandLandmarker}=await import('@mediapipe/tasks-vision')
        const files=await FilesetResolver.forVisionTasks(WASM)
        if(cancelled)return
        const Task=kind==='glucose'?HandLandmarker:PoseLandmarker
        const options={baseOptions:{modelAssetPath:kind==='glucose'?HAND_MODEL:MODEL,delegate:'GPU'},runningMode:'VIDEO',...(kind==='glucose'?{numHands:1}:{numPoses:1})}
        try{detector=await Task.createFromOptions(files,options)}
        catch{if(cancelled)return;detector=await Task.createFromOptions(files,{...options,baseOptions:{...options.baseOptions,delegate:'CPU'}})}
        clearTimeout(watchdog)
        if(cancelled){detector.close();return}
        tick()
      }catch{clearTimeout(watchdog);fail()}
    }
    function tick(){
      if(cancelled)return
      try{
        const v=videoRef.current,r=layer.current?.getBoundingClientRect()
        if(v?.readyState>=2&&v.videoWidth&&r?.width&&v.currentTime!==lastTime){
          lastTime=v.currentTime
          lastFrameAt=performance.now()
          const pose=detector.detectForVideo(v,performance.now()).landmarks?.[0]
          if(lastStep!==step.current){verdicts=[];lastStep=step.current}
          const assessment=feedback.evaluate(pose,kind,step.current,performance.now(),v.videoWidth/v.videoHeight)
          verdicts.push(assessment);verdicts=verdicts.slice(-4)
          const settled=assessment.tone==='neutral'||(verdicts.length===4&&verdicts.every(v=>v.tone===assessment.tone))
          const guidance=settled?assessment:{tone:'neutral',message:'Checking position…'}
          const target=kind==='glucose'?handTarget(pose):bpTarget(pose,step.current)
          if(target){
            const project=p=>projectPoint(p,v.videoWidth,v.videoHeight,r.width,r.height)
            const points=target.points.map(project)
            // Off-screen/cropped landmarks cannot guide the user visibly.
            if(points.some(p=>p.x<0||p.x>1||p.y<0||p.y>1)){setFrame(null);setState('searching')}
            else {setFrame({...target,guidance,points,lines:target.lines.map(line=>line.map(project))});setState('tracking')}
          }else{setFrame(null);setState('searching')}
        }else if(performance.now()-lastFrameAt>1500){setFrame(null);setState('searching')}
        timer=setTimeout(tick,100)
      }catch{fail()}
    }
    start()
    return()=>{cancelled=true;clearTimeout(timer);clearTimeout(watchdog);detector?.close()}
  },[videoRef,retry,kind])
  const arm=['arm_position','cuff_position','start_measurement','complete_measurement'].includes(stepId)
  const message=state==='loading'?`Loading ${kind==='glucose'?'hand':'body'} tracking…`:state==='error'?'Tracking unavailable · continue manually':state==='searching'?(kind==='glucose'?'Show your hand in the camera':arm?'Show shoulder, elbow and wrist':'Step back · show your upper body'):frame?.guidance?.message||frame?.label
  const tone=state==='tracking'?frame?.guidance?.tone:'neutral'
  const color=tone==='green'?'#22c55e':tone==='red'?'#f87171':'#38bdf8'
  const xs=frame?.points.map(p=>p.x)||[],ys=frame?.points.map(p=>p.y)||[]
  const left=Math.max(0,Math.min(...xs)-.035),top=Math.max(0,Math.min(...ys)-.04)
  const right=Math.min(1,Math.max(...xs)+.035),bottom=Math.min(1,Math.max(...ys)+.04)
  return <div ref={layer} className="nc-bp-tracking" data-tracking-state={state} data-position-feedback={tone}>
    {frame&&<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-label="Live body landmarks">
      <rect x={left*100} y={top*100} width={(right-left)*100} height={(bottom-top)*100} rx="1.5" fill={color+'22'} stroke={color} strokeWidth="3" vectorEffect="non-scaling-stroke"/>
      {frame.lines.map((line,i)=><polyline key={i} points={line.map(p=>`${p.x*100},${p.y*100}`).join(' ')} fill="none" stroke={color} strokeWidth="4" vectorEffect="non-scaling-stroke"/>)}
    </svg>}
    {frame?.points.map((p,i)=><i key={i} className="nc-track-dot" style={{background:color,left:`${p.x*100}%`,top:`${p.y*100}%`}}/>)}
    {!frame&&state!=='error'&&<div className="nc-bp-search" aria-hidden="true"/>}
    <div className="nc-bp-feedback" style={{borderColor:color}} role="status">{tone==='green'?'✓ ':tone==='red'?'↺ ':'◎ '}{t(message)}<small style={{display:'block',fontSize:10,marginTop:4}}>{t('Camera guidance · confirm each step yourself')}</small>{state==='error'&&<button onClick={()=>setRetry(n=>n+1)}>{t('Retry tracking')}</button>}</div>
  </div>
}

