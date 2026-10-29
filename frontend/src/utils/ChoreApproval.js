// A chore asks for a thumbs up by default when it is given to someone other
// than the person creating it; one's own chore doesn't (owner's choice, 009).
export const asksForThumbsUpByDefault = (assigneeIds, creatorId) =>
  (assigneeIds || []).some(
    id => id !== null && id !== undefined && id !== creatorId,
  )

const escapeAttr = value =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

// Adds an uploaded done photo to a completion note (rich-text HTML), keeping
// the storage path so the picture can be re-signed later.
export const withDonePhoto = (html, src, path) => {
  const photo = `<p><img src="${escapeAttr(src)}" dt-data-path="${escapeAttr(path)}"></p>`
  const current = html || ''
  return current.trim() === '' || current === '<p><br></p>'
    ? photo
    : current + photo
}
