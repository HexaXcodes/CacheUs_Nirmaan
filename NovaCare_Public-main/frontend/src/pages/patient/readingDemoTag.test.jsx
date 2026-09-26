import {describe,it,expect,vi} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import React from 'react'
vi.mock('../../i18n/nirmaan',()=>({useCopy:()=>s=>s}))
vi.mock('../../context/AuthContext',()=>({useAuth:()=>({user:{}})}))
import {Reading} from './Measurements'
const base={kind:'ppg',recorded_at:'2026-01-01T00:00:00Z',status:'accepted',analysis:{quality_score:.9,heart_rate_bpm:70,model:'m',model_version:'1'}}
const html=m=>renderToStaticMarkup(React.createElement(Reading,{row:{...base,metadata:m}}))
describe('Reading demo tag',()=>{
  it('shows tag and details for dataset_simulator',()=>{
    const h=html({source:'dataset_simulator',description:'Dataset replay — BIDMC subject 02'})
    expect(h).toContain('demo-replay-tag');expect(h).toContain('demo-replay-details');expect(h).toContain('BIDMC subject 02')
    expect(h).not.toContain('role="alert" class="mt-2')
  })
  it('absent for genuine sources',()=>{
    expect(html({source:'physical_sensor',synthetic:false})).not.toContain('demo-replay-tag')
  })
})
