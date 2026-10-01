/**
 * Данные компании: одно место на весь сайт.
 */

const PHONE_DIGITS = '77767202461'
const PHONE_DISPLAY = '+7 776 720 24 61'

export const buildWhatsAppUrl = (message: string): string =>
  `https://wa.me/${PHONE_DIGITS}?text=${encodeURIComponent(message)}`

export const site = {
  name: 'LOFTGROOT',
  tagline: 'Мангальные комплексы в стиле LOFT',
  city: 'Алматы, Казахстан',
  year: 2026,

  phone: PHONE_DISPLAY,
  phoneHref: `tel:+${PHONE_DIGITS}`,
  whatsapp: PHONE_DISPLAY,
  whatsappHref: buildWhatsAppUrl('Здравствуйте! Пишу с вашего сайта LOFTGROOT.'),

  instagram: '@loftgroot',
  instagramHref: 'https://www.instagram.com/loftgroot/',
} as const
