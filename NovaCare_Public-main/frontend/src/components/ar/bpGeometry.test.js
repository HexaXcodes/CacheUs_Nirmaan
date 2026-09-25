import test from 'node:test'
import assert from 'node:assert/strict'
import {bpTarget,handTarget,projectPoint} from './bpGeometry.js'

test('arm step refuses absent or occluded arms rather than a static detected box',()=>{
  assert.equal(bpTarget(undefined,'arm_position'),null)
  const pose=Array.from({length:33},()=>({x:.5,y:.5,visibility:.1}))
  pose[11].visibility=pose[12].visibility=1
  assert.equal(bpTarget(pose,'arm_position'),null)
  assert.ok(bpTarget(pose,'seated_position'))
})
test('arm overlay follows visible shoulder, elbow and wrist; cuff targets upper arm',()=>{
  const pose=Array.from({length:33},()=>({x:.5,y:.5,visibility:.1}))
  for(const i of [12,14,16])pose[i]={x:i/33,y:i/40,visibility:.9}
  assert.deepEqual(bpTarget(pose,'arm_position').points,[pose[12],pose[14],pose[16]])
  assert.deepEqual(bpTarget(pose,'cuff_position').points,[pose[12],pose[14]])
})
test('cover projection accounts for landscape video cropped by portrait viewport',()=>{
  assert.equal(projectPoint({x:.5,y:.5},1920,1080,390,844).x,.5)
  assert.ok(projectPoint({x:0,y:.5},1920,1080,390,844).x<0)
  assert.deepEqual(projectPoint({x:.2,y:.3},1920,1080,960,540),{x:.2,y:.3})
})
test('glucose requires real complete hand landmarks and follows fingertip movement',()=>{
  assert.equal(handTarget(undefined),null)
  assert.equal(handTarget([{x:.5,y:.5}]),null)
  const hand=Array.from({length:21},()=>({x:.4,y:.5}))
  hand[8]={x:.7,y:.2}
  assert.deepEqual(handTarget(hand).lines[1].at(-1),hand[8])
})
