export const MENU_ITEM_NAMES = ['archived', 'things', 'labels', 'reportIssue']

export const isMenuItemVisible = (
  item,
  { isAdmin = false, memberItems = [] } = {},
) => isAdmin || !MENU_ITEM_NAMES.includes(item) || memberItems.includes(item)
