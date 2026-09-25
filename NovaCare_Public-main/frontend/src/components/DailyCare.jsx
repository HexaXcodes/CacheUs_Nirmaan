import {Link} from 'react-router-dom'
import {useLang} from '../context/LanguageContext'

const copy={
 en:{eyebrow:'A LITTLE CARE, EVERY DAY',title:'Your daily care corner',intro:'Pointers for the conditions your doctor recorded. Follow your own care plan.',bp:'Blood pressure',diabetes:'Diabetes',more:'Why it helps',guide:'Open guided check →',source:'Read the source ↗',med:'Your prescribed routine',medText:'If prescribed, take medicines as directed. Check with your care team before changing or stopping them.',empty:'Keep your records close',emptyText:'No condition is recorded yet. Keep your history up to date and ask your doctor which checks are right for you.',history:'View history →',note:'On-screen reminders only. Check timing and treatment come from your care team.',
 bpTips:['Check when your care team recommends.','Rest quietly for five minutes before your cuff reading.','Save the reading for your next care conversation.'],bpDetail:'Use an upper-arm monitor with your arm supported at heart level. Avoid smoking, caffeine and exercise for 30 minutes before checking. Home readings support your care; they do not replace appointments.',
 diabetesTips:['Check glucose on your agreed schedule.','Take a moment to check your feet each day.','Keep your readings ready for your next visit.'],diabetesDetail:'Wash and dry your hands before a meter check. Look for cuts, blisters, redness or swelling on your feet; contact your care team promptly if you notice these. Ask your team about your personal glucose targets.'},
 hi:{eyebrow:'हर दिन, थोड़ी देखभाल',title:'आपकी रोज़ की देखभाल',intro:'डॉक्टर द्वारा दर्ज स्थितियों के लिए सुझाव। अपनी देखभाल योजना का पालन करें।',bp:'रक्तचाप',diabetes:'मधुमेह',more:'यह क्यों मदद करता है',guide:'निर्देशित जाँच खोलें →',source:'स्रोत पढ़ें ↗',med:'आपकी निर्धारित दिनचर्या',medText:'दवा निर्धारित है तो निर्देशानुसार लें। बदलने या बंद करने से पहले अपनी स्वास्थ्य टीम से पूछें।',empty:'अपने रिकॉर्ड साथ रखें',emptyText:'अभी कोई स्थिति दर्ज नहीं है। इतिहास अपडेट रखें और डॉक्टर से पूछें कि कौन-सी जाँच आपके लिए उचित है।',history:'इतिहास देखें →',note:'ये केवल स्क्रीन पर याद दिलाते हैं। जाँच का समय और उपचार आपकी स्वास्थ्य टीम तय करती है।',
 bpTips:['स्वास्थ्य टीम के बताए समय पर जाँच करें।','कफ से जाँच से पहले पाँच मिनट शांत बैठें।','अगली मुलाकात के लिए रीडिंग सहेजें।'],bpDetail:'ऊपरी बाँह वाला मॉनिटर इस्तेमाल करें और बाँह को हृदय की ऊँचाई पर सहारा दें। जाँच से 30 मिनट पहले धूम्रपान, कैफीन और व्यायाम से बचें। घर की रीडिंग डॉक्टर की मुलाकात का विकल्प नहीं है।',
 diabetesTips:['तय समय पर ग्लूकोज़ जाँचें।','हर दिन अपने पैरों को जाँचें।','अगली मुलाकात के लिए रीडिंग तैयार रखें।'],diabetesDetail:'मीटर से जाँच से पहले हाथ धोकर अच्छी तरह सुखाएँ। पैरों में कट, छाले, लालिमा या सूजन दिखे तो स्वास्थ्य टीम को जल्द बताएँ। अपने ग्लूकोज़ लक्ष्य टीम से पूछें।'},
 kn:{eyebrow:'ಪ್ರತಿದಿನ ಸ್ವಲ್ಪ ಕಾಳಜಿ',title:'ನಿಮ್ಮ ದೈನಂದಿನ ಆರೈಕೆ',intro:'ವೈದ್ಯರು ದಾಖಲಿಸಿದ ಸ್ಥಿತಿಗಳಿಗೆ ಸಲಹೆಗಳು. ನಿಮ್ಮ ಆರೈಕೆ ಯೋಜನೆಯನ್ನು ಅನುಸರಿಸಿ.',bp:'ರಕ್ತದೊತ್ತಡ',diabetes:'ಮಧುಮೇಹ',more:'ಇದು ಹೇಗೆ ಸಹಾಯ ಮಾಡುತ್ತದೆ',guide:'ಮಾರ್ಗದರ್ಶಿತ ತಪಾಸಣೆ ತೆರೆಯಿರಿ →',source:'ಮೂಲ ಓದಿ ↗',med:'ನಿಮ್ಮ ಸೂಚಿಸಿದ ದಿನಚರಿ',medText:'ಔಷಧಿ ಸೂಚಿಸಿದ್ದರೆ ಅದರಂತೆ ತೆಗೆದುಕೊಳ್ಳಿ. ಬದಲಿಸುವ ಅಥವಾ ನಿಲ್ಲಿಸುವ ಮೊದಲು ಆರೈಕೆ ತಂಡವನ್ನು ಕೇಳಿ.',empty:'ನಿಮ್ಮ ದಾಖಲೆಗಳನ್ನು ಸಿದ್ಧವಾಗಿಡಿ',emptyText:'ಇನ್ನೂ ಯಾವುದೇ ಸ್ಥಿತಿ ದಾಖಲಾಗಿಲ್ಲ. ಇತಿಹಾಸ ನವೀಕರಿಸಿ ಮತ್ತು ಯಾವ ತಪಾಸಣೆ ನಿಮಗೆ ಸೂಕ್ತ ಎಂದು ವೈದ್ಯರನ್ನು ಕೇಳಿ.',history:'ಇತಿಹಾಸ ನೋಡಿ →',note:'ಇವು ಪರದೆಯ ಮೇಲಿನ ನೆನಪುಗಳು ಮಾತ್ರ. ತಪಾಸಣೆಯ ಸಮಯ ಮತ್ತು ಚಿಕಿತ್ಸೆಯನ್ನು ಆರೈಕೆ ತಂಡ ನಿರ್ಧರಿಸುತ್ತದೆ.',
 bpTips:['ಆರೈಕೆ ತಂಡ ಸೂಚಿಸಿದ ಸಮಯದಲ್ಲಿ ತಪಾಸಣೆ ಮಾಡಿ.','ಕಫ್ ತಪಾಸಣೆಗೆ ಮೊದಲು ಐದು ನಿಮಿಷ ಶಾಂತವಾಗಿ ಕುಳಿತುಕೊಳ್ಳಿ.','ಮುಂದಿನ ಭೇಟಿಗಾಗಿ ಓದನ್ನು ಉಳಿಸಿ.'],bpDetail:'ಮೇಲ್ತೋಳಿನ ಮಾನಿಟರ್ ಬಳಸಿ, ತೋಳಿಗೆ ಹೃದಯದ ಎತ್ತರದಲ್ಲಿ ಆಧಾರ ನೀಡಿ. ತಪಾಸಣೆಗೆ 30 ನಿಮಿಷ ಮೊದಲು ಧೂಮಪಾನ, ಕೆಫೀನ್ ಮತ್ತು ವ್ಯಾಯಾಮ ತಪ್ಪಿಸಿ. ಮನೆಯ ಓದುಗಳು ವೈದ್ಯರ ಭೇಟಿಗೆ ಪರ್ಯಾಯವಲ್ಲ.',
 diabetesTips:['ಒಪ್ಪಿದ ವೇಳಾಪಟ್ಟಿಯಂತೆ ಗ್ಲೂಕೋಸ್ ಪರೀಕ್ಷಿಸಿ.','ಪ್ರತಿದಿನ ನಿಮ್ಮ ಪಾದಗಳನ್ನು ಪರಿಶೀಲಿಸಿ.','ಮುಂದಿನ ಭೇಟಿಗಾಗಿ ಓದುಗಳನ್ನು ಸಿದ್ಧವಾಗಿಡಿ.'],diabetesDetail:'ಮೀಟರ್ ತಪಾಸಣೆಗೆ ಮೊದಲು ಕೈ ತೊಳೆದು ಚೆನ್ನಾಗಿ ಒಣಗಿಸಿ. ಪಾದಗಳಲ್ಲಿ ಗಾಯ, ಗುಳ್ಳೆ, ಕೆಂಪು ಅಥವಾ ಊತ ಕಂಡರೆ ಆರೈಕೆ ತಂಡಕ್ಕೆ ಶೀಘ್ರ ತಿಳಿಸಿ. ನಿಮ್ಮ ಗ್ಲೂಕೋಸ್ ಗುರಿಗಳನ್ನು ತಂಡದ ಬಳಿ ಕೇಳಿ.'}
}
const sources={bp:'https://www.heart.org/en/health-topics/high-blood-pressure/understanding-blood-pressure-readings/monitoring-your-blood-pressure-at-home',diabetes:'https://www.cdc.gov/diabetes/treatment/your-diabetes-care-schedule.html'}
export default function DailyCare({conditions=[]}){
 const {lang}=useLang(),c=copy[lang]||copy.en
 const topics=[...(conditions.includes('hypertension')?['bp']:[]),...(conditions.includes('diabetes')?['diabetes']:[])]
 return <section className="nc-daily-care" aria-labelledby="daily-care-title">
  <header><span className="nc-eyebrow">{c.eyebrow}</span><h2 id="daily-care-title">{c.title}</h2><p>{c.intro}</p></header>
  {topics.length?<><div className="nc-daily-grid">{topics.map(kind=><article className="nc-daily-card" key={kind}>
   <div className="nc-daily-title"><span aria-hidden="true">{kind==='bp'?'♡':'◈'}</span><h3>{c[kind]}</h3></div>
   <ul>{c[kind+'Tips'].map((tip,i)=><li key={i}><span aria-hidden="true">{String(i+1).padStart(2,'0')}</span>{tip}</li>)}</ul>
   <details><summary>{c.more}</summary><p>{c[kind+'Detail']}</p><a href={sources[kind]} target="_blank" rel="noopener noreferrer">{c.source} · {kind==='bp'?'AHA':'CDC'}</a></details>
   <Link className="nc-secondary" to={'/patient/check/'+(kind==='bp'?'bp':'glucose')}>{c.guide}</Link>
  </article>)}</div><aside className="nc-daily-routine"><span aria-hidden="true">◷</span><div><strong>{c.med}</strong><p>{c.medText}</p></div></aside></>:<div className="nc-daily-card"><h3>{c.empty}</h3><p>{c.emptyText}</p><Link className="nc-secondary" to="/patient/history">{c.history}</Link></div>}
  <p className="nc-caption">{c.note}</p>
 </section>
}
