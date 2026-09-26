import {describe,it,expect,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import React from 'react'
vi.mock('../../i18n/nirmaan',()=>({useCopy:()=>s=>s}))
vi.mock('./ARMeasurement',()=>({default:()=>React.createElement('div',null,'AR-MOUNTED')}))
vi.mock('./GlucoseGuide',()=>({default:()=>React.createElement('div',null,'ANIM-MOUNTED')}))
vi.mock('../../context/AuthContext',()=>({useAuth:()=>({user:{patient_id:'p'}})}))
vi.mock('../../api/client',()=>({default:{get:()=>Promise.resolve({data:{}})}}))
import {GlucoseChooser} from './ConditionGuide'
describe('GlucoseChooser',()=>{
 it('renders both options; neither guide (so no camera) is mounted by default',()=>{
  const h=renderToStaticMarkup(React.createElement(GlucoseChooser))
  expect(h).toContain('Watch step animations');expect(h).toContain('Use camera AR guide')
  expect(h).not.toContain('AR-MOUNTED');expect(h).not.toContain('ANIM-MOUNTED')
 })
})
