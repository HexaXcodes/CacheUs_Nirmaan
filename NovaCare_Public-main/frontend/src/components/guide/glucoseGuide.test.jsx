import {describe,it,expect} from 'vitest'
import {renderToStaticMarkup} from 'react-dom/server'
import React from 'react'
import {getGlucoseGuideSteps} from './glucoseSteps'
import StepAnimation from './StepAnimation'

describe('glucose guide',()=>{
  it('has 8 ordered steps ending with log_result',()=>{
    const s=getGlucoseGuideSteps('en')
    expect(s.map(x=>x.id)).toEqual(['prepare_glucometer','insert_strip','prepare_lancet','obtain_sample','apply_sample','wait_reading','complete_measurement','log_result'])
    expect(s[7].title).toBe('Log the result')
  })
  it('renders an accessible animation per step',()=>{
    for(const {id} of getGlucoseGuideSteps('en')){
      const h=renderToStaticMarkup(React.createElement(StepAnimation,{stepId:id}))
      expect(h).toContain('role="img"');expect(h).toContain('aria-label="Animation:')
    }
  })
})
