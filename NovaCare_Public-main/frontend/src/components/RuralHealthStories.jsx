import {useEffect,useRef,useState} from 'react'
import actions from '../assets/insight-actions.png'
import diet from '../assets/insight-diet.png'
import balance from '../assets/insight-balance.png'
import faq from '../assets/insight-faq.png'
import trends from '../assets/insight-trends.png'

const who='https://www.who.int/about/accountability/results/who-results-report-2020-mtr/country-story/2022/india-hypertension-control-initiative---a-patient-centred-approach-to-control-hypertension-at-the-primary-care-level'
const nin='https://www.nin.res.in/dietaryguidelines/pdfjs/locale/DGI07052024P.pdf'
const stories=[
 {tag:'CARE CLOSER TO HOME',image:actions,title:'A clinic visit shouldn’t mean losing a whole day.',intro:'Ask about BP follow-up closer to your village.',body:'Ask your ASHA worker or local health centre where you can get BP checks and follow-up care. Confirm opening days and medicine availability before travelling; local services vary.',source:'WHO India · Primary care',url:who},
 {tag:'MEDICINE ACCESS',image:balance,title:'Plan the refill before the strip runs out.',intro:'A little planning can help avoid a gap in treatment.',body:'Keep your prescription and ask the clinic when and where to collect your next refill. Tell the care team if travel or cost makes collection difficult. Do not change doses or share medicines to stretch a supply.',source:'WHO India · Continuity of care',url:who},
 {tag:'SALT & BLOOD PRESSURE',image:diet,title:'The extra salt isn’t always in the salt shaker.',intro:'Pickle, papad and namkeen can add to the day’s salt.',body:'Notice salty extras alongside home-cooked meals. Try smaller amounts and compare salt information on packaged snacks. Your care team can help adapt familiar meals to your needs.',source:'ICMR–NIN · Dietary Guidelines 2024',url:nin},
 {tag:'SUGAR IN EVERYDAY DRINKS',image:faq,title:'Several cups of sweet chai can add up.',intro:'Look at added sugar across the whole day.',body:'Count the sugar added to tea and other drinks, not just sweets. Try gradually reducing added sugar. If you have diabetes, discuss your usual food and drink routine with your care team rather than following a blanket diet ban.',source:'ICMR–NIN · Dietary Guidelines 2024',url:nin},
 {tag:'FOOD THAT FITS YOUR HOME',image:diet,title:'Healthy eating can start with familiar foods.',intro:'Build variety around the foods available locally.',body:'A varied diet can include pulses, vegetables and suitable portions of cereals or millets. No single grain cures diabetes. Ask for a practical meal plan that fits your budget, work and prescribed treatment.',source:'ICMR–NIN · Dietary Guidelines 2024',url:nin},
 {tag:'DIABETES & FOOT CARE',image:actions,title:'After a long workday, check your feet too.',intro:'Small cuts deserve attention when you have diabetes.',body:'Look at the soles and between your toes each day. Use a mirror or ask someone you trust if needed. Report cuts, blisters, redness or swelling promptly to your care team.',source:'CDC · Diabetes care schedule',url:'https://www.cdc.gov/diabetes/treatment/your-diabetes-care-schedule.html'},
 {tag:'MAKE THE NEXT VISIT COUNT',image:trends,title:'Carry the readings, not just the memory.',intro:'A notebook works when internet access doesn’t.',body:'Keep dates and readings in a notebook or your available records. Take them and your prescription to your next appointment. Ask when your next check is due; one reading is not the full picture.',source:'AHA · Home BP monitoring',url:'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home'},
]

export default function RuralHealthStories(){
 const track=useRef(null),[position,setPosition]=useState({start:true,end:false,index:1})
 useEffect(()=>{
  const el=track.current
  const update=()=>{const cards=[...el.children];const index=cards.reduce((best,card,i)=>Math.abs(card.offsetLeft-cards[0].offsetLeft-el.scrollLeft)<Math.abs(cards[best].offsetLeft-cards[0].offsetLeft-el.scrollLeft)?i:best,0);setPosition({start:el.scrollLeft<5,end:el.scrollLeft+el.clientWidth>=el.scrollWidth-5,index:index+1})}
  update();el.addEventListener('scroll',update,{passive:true});const observer=new ResizeObserver(update);observer.observe(el)
  return()=>{el.removeEventListener('scroll',update);observer.disconnect()}
 },[])
 const move=direction=>{const el=track.current;el.scrollBy({left:direction*(el.firstElementChild.getBoundingClientRect().width+20),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})}
 return <section className="nc-patient-insights nc-rural-stories" aria-label="Everyday health in rural India" aria-roledescription="carousel">
  <header className="nc-insights-heading"><div><span className="nc-eyebrow">THE VILLAGE HEALTH EDIT</span><h2>Real life. Small steps.</h2><p>BP and diabetes pointers for everyday life in rural India.</p></div><div className="nc-story-controls"><button type="button" aria-label="Previous health cards" aria-controls="rural-health-track" disabled={position.start} onClick={()=>move(-1)}>←</button><button type="button" aria-label="Next health cards" aria-controls="rural-health-track" disabled={position.end} onClick={()=>move(1)}>→</button></div></header>
  <div id="rural-health-track" className="nc-story-track" ref={track} tabIndex={0} aria-label="Health cards. Swipe or use left and right arrow keys." onKeyDown={e=>{if(e.target===e.currentTarget&&['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();move(e.key==='ArrowLeft'?-1:1)}}}>
   {stories.map((s,i)=><article className="nc-insight-card nc-story-card" key={s.tag} aria-label={`${i+1} of ${stories.length}: ${s.title}`}>
    <div className="nc-insight-image"><img src={s.image} alt="" loading="lazy" width="600" height="400"/><span>{s.tag}</span><b className="nc-story-number" aria-hidden="true">0{i+1}</b></div>
    <div className="nc-insight-body"><h3>{s.title}</h3><p>{s.intro}</p><details><summary>What you can do <span aria-hidden="true">＋</span></summary><p>{s.body}</p><a href={s.url} target="_blank" rel="noopener noreferrer">Read the source ↗</a></details><small>{s.source}</small></div>
   </article>)}
  </div>
  <footer className="nc-story-footer"><span aria-live="polite">{position.index} / {stories.length}</span><p>Swipe to explore · Educational stories, not a live news feed.</p></footer>
 </section>
}

