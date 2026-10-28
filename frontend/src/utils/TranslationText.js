// Decides whether a chore's text is worth sending to the server for
// translation. Only English and Arabic are translated, so a quick look at the
// script is enough: English readers with English chores never send anything.

export const MAX_TRANSLATION_BATCH = 100

const ARABIC_LETTER = /[ؠ-يٮ-ۓۺ-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-ﻼ]/
const LATIN_LETTER = /[A-Za-zÀ-ɏ]/

// translationTarget maps the app language to the language chores are shown
// in, or null when chores are not translated for it.
export const translationTarget = language => {
  const base = String(language || '')
    .toLowerCase()
    .split(/[-_]/)[0]
  return base === 'ar' || base === 'en' ? base : null
}

// plainText drops HTML tags and entities, so markup is not mistaken for
// English words.
export const plainText = text =>
  String(text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&[#a-z0-9]+;/gi, ' ')

export const hasArabicLetters = text => ARABIC_LETTER.test(plainText(text))

export const textNeedsTranslation = (text, target) => {
  const plain = plainText(text)
  if (!plain.trim()) return false
  if (target === 'ar') {
    return LATIN_LETTER.test(plain) && !ARABIC_LETTER.test(plain)
  }
  if (target === 'en') return ARABIC_LETTER.test(plain)
  return false
}

export const choreNeedsTranslation = (chore, target) =>
  Boolean(
    chore &&
    (textNeedsTranslation(chore.name, target) ||
      textNeedsTranslation(chore.description, target)),
  )

const tagsOf = html =>
  (String(html || '').match(/<[^>]*>/g) || [])
    .map(tag => tag.toLowerCase().replace(/\s+/g, '').replace(/\/>$/, '>'))
    .sort()
    .join('')

// sameMarkup is true when the translated details carry exactly the tags of the
// original (in any order). Translated details are rendered as HTML, so an
// answer that adds or changes markup is not shown.
export const sameMarkup = (original, translated) =>
  tagsOf(original) === tagsOf(translated)

// translatedChoreText picks the text to show from the server's answer for one
// chore; anything not translated keeps the original.
export const translatedChoreText = (chore, answer) => {
  const name =
    answer?.name?.status === 'translated' && answer.name.text
      ? answer.name.text
      : chore?.name
  const description =
    answer?.description?.status === 'translated' &&
    answer.description.text &&
    sameMarkup(chore?.description, answer.description.text)
      ? answer.description.text
      : chore?.description
  return {
    name,
    description,
    translated: name !== chore?.name || description !== chore?.description,
  }
}

export const chunk = (items, size = MAX_TRANSLATION_BATCH) => {
  const parts = []
  for (let i = 0; i < items.length; i += size) {
    parts.push(items.slice(i, i + size))
  }
  return parts
}
