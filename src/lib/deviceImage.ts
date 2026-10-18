import type { SyntheticEvent } from 'react'
import type { Device } from './api.ts'

// Official Marstek product images, keyed by device type. Includes Venus D
// (VNSD-0) and Venus A (VNSA-0), which the vanilla tool was missing.
const GENERIC = 'https://marstekenergy.com/cdn/shop/files/1_2_d5e4109f-859e-46be-be9b-40e262490d4f.jpg?v=1740540638'

// onError handler: swap a broken product image for the generic one (once, so no loop).
export function imageFallback(e: SyntheticEvent<HTMLImageElement>) {
  if (e.currentTarget.src !== GENERIC) e.currentTarget.src = GENERIC
}

export function deviceImage(device: Device): { src: string; alt: string } {
  const type = device.type || ''
  const name = (device.name || '').toUpperCase()

  // Venus E Pro: type code not confirmed yet, match on several guesses (placeholder image)
  if (/^(VEPRO|VNSEP)/.test(type.toUpperCase()) || name.includes('VEPRO') || name.includes('VENUS E PRO')) {
    return { src: 'https://de.marstekenergy.com/cdn/shop/files/VE-PRO-2X_EXTRASLAVE.png?format=webp&v=1792031474&width=960', alt: 'Venus E Pro' }
  }
  // Venus E Mini: type code not confirmed yet, same approach as the Pro
  if (/^(VEMINI|VNSEM)/.test(type.toUpperCase()) || name.includes('VEMINI') || name.includes('VENUS E MINI')) {
    return { src: 'https://marstekenergy.com/cdn/shop/files/VB_1270x.webp?v=1773640503', alt: 'Venus E Mini' }
  }
  // Venus E Max: type code not confirmed yet, same approach as the Pro
  if (/^(VEMAX|VNSEMAX)/.test(type.toUpperCase()) || name.includes('VEMAX') || name.includes('VENUS E MAX')) {
    return { src: 'https://marstekenergy.com/cdn/shop/files/1_fef8f7c7-a914-4ec6-93f6-50671ecc43f1_1880x.png?v=1785310599', alt: 'Venus E Max' }
  }
  // Venus E 4.0: VNSE4-0 follows the VNSE3-0 pattern, not confirmed yet
  if (/^VNSE4/.test(type.toUpperCase()) || name.includes('VENUS E V4') || name.includes('VENUS E 4')) {
    return { src: 'https://marstekenergy.com/cdn/shop/files/2_b7e74386-ff71-4581-ba40-8a6900ea5c78_1880x.png?v=1785310593', alt: 'Venus E 4.0' }
  }
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
