import type { Device } from './api.ts'

// Official Marstek product images, keyed by device type. Includes Venus D
// (VNSD-0) and Venus A (VNSA-0), which the vanilla tool was missing.
const GENERIC = 'https://eu.marstekenergy.com/cdn/shop/files/1_2_d5e4109f-859e-46be-be9b-40e262490d4f.jpg?v=1740540638'

export function deviceImage(device: Device): { src: string; alt: string } {
  const type = device.type || ''
  const name = (device.name || '').toUpperCase()

  if (type.startsWith('VNSE') || name.includes('VENUS E V3') || name.includes('VNSE')) {
    return { src: 'https://eu.marstekenergy.com/cdn/shop/files/1.1_a3444687-64a0-4ed7-8ed9-9f9966428883.jpg?v=1755566381', alt: 'Venus E V3' }
  }
  if (type === 'VNSD-0' || name.includes('VENUS D') || name.includes('VNSD')) {
    return { src: 'https://eu.marstekenergy.com/cdn/shop/files/1_004a49b7-0c21-4257-8031-335124506038_large.webp?v=1757904157', alt: 'Venus D' }
  }
  if (type === 'VNSA-0' || name.includes('VENUS A') || name.includes('VNSA')) {
    return { src: 'https://eu.marstekenergy.com/cdn/shop/files/1_8bd3eed7-111c-4155-8256-bd2db99e44a8.webp?v=1757001771', alt: 'Venus A' }
  }
  if (type === 'HME-3') {
    return { src: 'https://eu.marstekenergy.com/cdn/shop/files/1_a21575ea-19c4-4f61-98d1-83e6112704a0.jpg?v=1739950399', alt: 'HME-3' }
  }
  if (type === 'HME-4') {
    return { src: 'https://eu.marstekenergy.com/cdn/shop/files/3_894259a1-4bf3-4f47-b87b-72efab6ea298.jpg?v=1740573047', alt: 'HME-4' }
  }
  if (type === 'HMG-25') {
    return { src: 'https://eu.marstekenergy.com/cdn/shop/files/1_2_d5e4109f-859e-46be-be9b-40e262490d4f.jpg?v=1740540638', alt: 'Venus C' }
  }
  // HMG-50 / Venus E V1/V2 / anything else → generic
  return { src: GENERIC, alt: type || 'Marstek device' }
}
