// Camera-only heuristics, not clinical technique verification.
const visible = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.visibility ?? 1) >= .6
const result = (tone,message) => ({tone,message})
export class PositionFeedback {
  reset(){this.history=[];this.key=''}
  constructor(){this.reset()}
  evaluate(points,kind,step,time,aspect=1){
    const key=kind+step
    if(this.key!==key){this.reset();this.key=key}
    if(!points){this.history=[];return result('neutral','Move into view')}
    const ids=kind==='glucose'?[0,5,8,9,12,17,20]:[11,12,13,14,15,16]
    const tracked=ids.map(i=>points[i])
    const allVisible=tracked.every(visible)
    if(!allVisible)this.history=[]
    if(allVisible){this.history.push({time,points:tracked});this.history=this.history.filter(f=>time-f.time<=1200)}
    const stableWindow=this.history.length>=5&&time-this.history[0].time>=700
    const span=kind==='glucose'?Math.hypot((points[0].x-points[9].x)*aspect,points[0].y-points[9].y):Math.hypot((points[11].x-points[12].x)*aspect,points[11].y-points[12].y)
    const moving=stableWindow&&this.history.some(f=>f.points.some((p,i)=>Math.hypot((p.x-tracked[i].x)*aspect,p.y-tracked[i].y)>Math.max(.015,span*.12)))
    if(kind==='glucose'){
      if(step!=='wait_reading')return result('neutral',{
        prepare_glucometer:'Wash and dry hands; prepare your meter',insert_strip:'Insert the strip into your meter',
        prepare_lancet:'Prepare your lancing device',obtain_sample:'Follow your device’s fingertip instructions',
        apply_sample:'Bring the strip to the sample',complete_measurement:'Dispose of the lancet safely'
      }[step]||'Follow the device instructions')
      if(!stableWindow)return result('neutral','Keep your hand visible and steady')
      return moving?result('red','Keep your hand still while the meter counts down'):result('green','Hand looks steady · wait for the meter')
    }
    const shoulders=[points[11],points[12]],hips=[points[23],points[24]]
    if(step==='seated_position'){
      if(![...shoulders,...hips].every(visible))return result('neutral','Step back so shoulders and hips are visible')
      const dx=((shoulders[0].x+shoulders[1].x)-(hips[0].x+hips[1].x))*aspect
      const dy=(shoulders[0].y+shoulders[1].y)-(hips[0].y+hips[1].y)
      return Math.atan2(Math.abs(dx),Math.abs(dy))*180/Math.PI>15
        ?result('red','Straighten your torso; sit upright') :result('green','Torso looks upright · support your back')
    }
    if(step==='arm_position'){
      const arms=[[11,13,15],[12,14,16]].map(ids=>ids.map(i=>points[i])).filter(a=>a.every(visible)).sort((a,b)=>Math.min(...b.map(p=>p.visibility))-Math.min(...a.map(p=>p.visibility)))
      if(!arms.length)return result('neutral','Show shoulder, elbow and wrist')
      const [s,e,w]=arms[0]
      if(w.y<s.y-.04)return result('red','Lower your raised hand; rest your arm on a table')
      const angle=Math.atan2(Math.abs(w.y-e.y),Math.abs((w.x-e.x)*aspect))*180/Math.PI
      return angle>25?result('red','Rest your forearm level on a support'):result('green','Forearm looks level · check cuff is at heart height')
    }
    if(step==='stay_still'){
      if(!allVisible)return result('neutral','Show both shoulders, elbows and wrists')
      if(points[15].y<points[11].y-.04||points[16].y<points[12].y-.04)return result('red','Lower your raised hand; relax and support your arms')
      if(!stableWindow)return result('neutral','Hold still for a moment')
      return moving?result('red','Movement detected · keep your arms and body still'):result('green','Upper body looks steady · remain silent')
    }
    return result('neutral',{
      rest_prep:'Rest quietly for five minutes',feet_position:'Check both feet are flat and legs uncrossed',
      cuff_position:'Place cuff on bare upper arm; confirm fit yourself',start_measurement:'Press start on your cuff monitor',
      complete_measurement:'Wait for the cuff to deflate and show a reading'
    }[step]||'Follow the current step')
  }
}
