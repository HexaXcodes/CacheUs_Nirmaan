import insightActions from '../assets/insight-actions.png'
import insightFaq from '../assets/insight-faq.png'
import insightTrends from '../assets/insight-trends.png'

// Reuses the older NovaCare story-card imagery. Evergreen education, not a live news feed.
const cards = [
  {image:insightActions,tag:'BLOOD PRESSURE',title:'A better reading starts before the cuff.',
   intro:'A quiet pause. A supported arm. Small details matter.',
   tips:['Rest quietly for at least five minutes before checking.','Use an automatic upper-arm monitor; support your arm at heart level.','Avoid smoking, caffeine and exercise for 30 minutes beforehand.'],
   source:'American Heart Association',url:'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home'},
  {image:insightFaq,tag:'BLOOD GLUCOSE',title:'Clean hands. Ready meter. Clear steps.',
   intro:'Make preparation part of every glucose check.',
   tips:['Wash your hands with soap and warm water, then dry them well.','Follow your meter’s instructions and use the appropriate test strips.','Ask your care team when to check and what your personal targets are.'],
   source:'CDC',url:'https://www.cdc.gov/diabetes/diabetes-testing/monitoring-blood-sugar.html'},
  {image:insightTrends,tag:'YOUR RECORDS',title:'Bring the pattern to your next visit.',
   intro:'Your reading history helps start a better conversation.',
   tips:['Record your readings and take the log to your appointments.','Discuss changes with your healthcare professional.','Do not stop blood-pressure medication based on home readings without checking with your healthcare professional.'],
   source:'American Heart Association',url:'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home'},
]

export default function HealthInsights(){
 return <div className="nc-insights">
   <header className="nc-insights-heading"><div><span className="nc-eyebrow">THE NOVACARE EDIT</span><h2>Small steps. Better informed.</h2></div><p>Health pointers, without the information overload.</p></header>
   <div className="nc-insight-grid">{cards.map(c=><article className="nc-insight-card" key={c.tag}>
     <div className="nc-insight-image"><img src={c.image} alt="" loading="lazy" width="600" height="400"/><span>{c.tag}</span></div>
     <div className="nc-insight-body"><h3>{c.title}</h3><p>{c.intro}</p>
       <details><summary>Quick pointers <span aria-hidden="true">＋</span></summary><ul>{c.tips.map(t=><li key={t}>{t}</li>)}</ul><a href={c.url} target="_blank" rel="noopener noreferrer">Read the {c.source} guide ↗</a></details>
       <small>Source: {c.source} · Health education</small>
     </div>
   </article>)}</div>
   <p className="nc-insight-note">General education, not a diagnosis or personalised treatment advice.</p>
 </div>
}
