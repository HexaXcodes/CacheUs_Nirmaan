import procedures from '../ar/procedures.json'
import {arTitles} from '../../i18n/arCopy'

/** Glucose steps in order, localized where available. The last step is the log form. */
export function getGlucoseGuideSteps(lang='en'){
  return procedures.glucose_measurement.steps.map(s=>({
    ...s,
    title:arTitles[lang]?.[s.id]||s.title,
    text:s.instruction[lang]||s.instruction.en,
  }))
}
