export const DEFAULT_SIDEPANEL_CONFIG = [
  {
    id: 'welcome', // legacy name, now represents User Switcher
    name: 'User Switcher',
    nameKey: 'sidepanel.cards.welcome.name',
    description: 'Allows admins/managers to view tasks as different users',
    descriptionKey: 'sidepanel.cards.welcome.description',
    iconName: 'SupervisorAccount',
    enabled: true,
    order: 0,
  },
  {
    id: 'smartInsights',
    name: 'Smart Insights',
    nameKey: 'sidepanel.cards.smartInsights.name',
    description: 'Quick actions based on your tasks',
    descriptionKey: 'sidepanel.cards.smartInsights.description',
    iconName: 'TrendingUp',
    enabled: false,
    order: 1,
  },
  {
    id: 'assignees',
    name: 'Tasks by Assignee',
    nameKey: 'sidepanel.cards.assignees.name',
    description: 'Groups tasks by who they are assigned to',
    descriptionKey: 'sidepanel.cards.assignees.description',
    iconName: 'Person',
    enabled: true,
    order: 2,
  },
  {
    id: 'calendar',
    name: 'Calendar View',
    nameKey: 'sidepanel.cards.calendar.name',
    description: 'Shows tasks in a calendar format',
    descriptionKey: 'sidepanel.cards.calendar.description',
    iconName: 'CalendarMonth',
    enabled: true,
    order: 3,
  },
  {
    id: 'activities',
    name: 'Recent Activities',
    nameKey: 'sidepanel.cards.activities.name',
    description: 'Shows recent task completions and activities',
    descriptionKey: 'sidepanel.cards.activities.description',
    iconName: 'History',
    enabled: true,
    order: 4,
  },
  {
    id: 'weeklyGoals',
    name: 'Weekly Goals',
    nameKey: 'sidepanel.cards.weeklyGoals.name',
    description: 'Shows weekly progress and family completion stats',
    descriptionKey: 'sidepanel.cards.weeklyGoals.description',
    iconName: 'EmojiEvents',
    enabled: true,
    order: 5,
  },
]

export const getSidepanelConfig = () => {
  const saved = localStorage.getItem('sidepanelConfig')
  let savedConfig = []

  if (saved) {
    try {
      savedConfig = JSON.parse(saved)
    } catch (error) {
      console.error('Error parsing sidepanel config:', error)
      return DEFAULT_SIDEPANEL_CONFIG
    }
  }

  // Merge saved config with default config
  // This ensures new items in DEFAULT_SIDEPANEL_CONFIG are added to existing configs
  const mergedConfig = DEFAULT_SIDEPANEL_CONFIG.map(defaultItem => {
    const savedItem = savedConfig.find(item => item.id === defaultItem.id)
    return savedItem
      ? {
          ...defaultItem,
          ...savedItem,
          nameKey: defaultItem.nameKey,
          descriptionKey: defaultItem.descriptionKey,
        }
      : defaultItem
  })

  // Add any saved items that are no longer in default (for backwards compatibility)
  const newSavedItems = savedConfig.filter(
    savedItem =>
      !DEFAULT_SIDEPANEL_CONFIG.find(item => item.id === savedItem.id),
  )

  return [...mergedConfig, ...newSavedItems]
}

export const saveSidepanelConfig = config => {
  localStorage.setItem('sidepanelConfig', JSON.stringify(config))
  window.dispatchEvent(new Event('sidepanelConfigChanged'))
}

export const resetSidepanelConfig = () => {
  saveSidepanelConfig(DEFAULT_SIDEPANEL_CONFIG)
  return DEFAULT_SIDEPANEL_CONFIG
}
