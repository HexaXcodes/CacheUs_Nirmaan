// SIH pose indices, projected through the camera's object-fit: cover transform.
export function projectPoint(point, videoWidth, videoHeight, width, height) {
  const scale = Math.max(width / videoWidth, height / videoHeight)
  return { ...point, x: (point.x * videoWidth * scale - (videoWidth * scale - width) / 2) / width,
    y: (point.y * videoHeight * scale - (videoHeight * scale - height) / 2) / height }
}

export function bpTarget(pose, step) {
  const visible = p => p && Number.isFinite(p.x) && Number.isFinite(p.y) && (p.visibility ?? 0) >= .6
  const arms = [[11,13,15], [12,14,16]].map(ids => ids.map(i => pose?.[i]))
  const armStep = ['arm_position','cuff_position','start_measurement','complete_measurement'].includes(step)
  if (armStep) {
    const arm = arms.filter(a => a.every(visible)).sort((a,b) =>
      Math.min(...b.map(p => p.visibility)) - Math.min(...a.map(p => p.visibility)))[0]
    return arm ? {points: step === 'cuff_position' ? arm.slice(0,2) : arm, lines: [arm], label: step === 'cuff_position' ? 'Upper arm · place cuff here' : 'Arm tracked · keep supported'} : null
  }
  const shoulders = [pose?.[11],pose?.[12]]
  if (!shoulders.every(visible)) return null
  const hips = [pose?.[23],pose?.[24]]
  const torso = hips.every(visible) ? [...shoulders,...hips] : shoulders
  return {points:torso, lines:[shoulders,...arms.filter(a => a.every(visible))], label:'Body tracked · follow the step'}
}

export function handTarget(hand) {
  if (!hand || hand.length !== 21 || hand.some(p => !Number.isFinite(p.x) || !Number.isFinite(p.y))) return null
  return {points:hand,lines:[[0,1,2,3,4],[0,5,6,7,8],[5,9,10,11,12],[9,13,14,15,16],[13,17,18,19,20],[0,17]].map(ids=>ids.map(i=>hand[i])),label:'Hand tracked · follow the step'}
}
