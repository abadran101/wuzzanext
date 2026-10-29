// True when a chore text (HTML from the rich-text editor) has words or a
// picture, so an empty editor ("<p></p>") counts as no text.
export const hasChoreContent = html => {
  if (!html) return false
  if (/<img\b/i.test(html)) return true
  return (
    html
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .trim() !== ''
  )
}
