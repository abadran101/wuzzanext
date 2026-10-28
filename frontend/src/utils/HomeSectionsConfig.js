export const DEFAULT_HOME_SECTIONS_CONFIG = [
  {
    id: 'greeting',
    name: 'Greeting',
    nameKey: 'homeSections.sections.greeting.name',
    description: 'The headline at the top that sums up your day',
    descriptionKey: 'homeSections.sections.greeting.description',
    iconName: 'WavingHand',
    enabled: true,
    order: 0,
  },
  {
    id: 'glance',
    name: 'At a Glance',
    nameKey: 'homeSections.sections.glance.name',
    description: 'Overdue / due today / needs review / unplanned counts',
    descriptionKey: 'homeSections.sections.glance.description',
    iconName: 'Checklist',
    enabled: true,
    order: 1,
  },
  {
    id: 'circle',
    name: 'Your Circle',
    nameKey: 'homeSections.sections.circle.name',
    description: 'Shows what everyone in your circle is carrying this week',
    descriptionKey: 'homeSections.sections.circle.description',
    iconName: 'Groups',
    enabled: true,
    order: 2,
  },
  {
    id: 'review',
    name: 'Needs Review',
    nameKey: 'homeSections.sections.review.name',
    description: 'Finished tasks waiting to be signed off',
    descriptionKey: 'homeSections.sections.review.description',
    iconName: 'FactCheck',
    enabled: true,
    order: 3,
  },
  {
    id: 'overdue',
    name: 'Overdue',
    nameKey: 'homeSections.sections.overdue.name',
    description: 'Tasks that have slipped past their due date',
    descriptionKey: 'homeSections.sections.overdue.description',
    iconName: 'ErrorOutline',
    enabled: true,
    order: 4,
  },
  {
    id: 'nextUp',
    name: 'Coming Up',
    nameKey: 'homeSections.sections.nextUp.name',
    description: "What's due today and tomorrow",
    descriptionKey: 'homeSections.sections.nextUp.description',
    iconName: 'Upcoming',
    enabled: true,
    order: 5,
  },
  {
    id: 'filters',
    name: 'Filters',
    nameKey: 'homeSections.sections.filters.name',
    description: 'Quick access to your pinned and most useful filters',
    descriptionKey: 'homeSections.sections.filters.description',
    iconName: 'FilterAlt',
    enabled: true,
    order: 6,
  },
  {
    id: 'projects',
    name: 'Projects',
    nameKey: 'homeSections.sections.projects.name',
    description: 'Where the work is piling up, by project',
    descriptionKey: 'homeSections.sections.projects.description',
    iconName: 'FolderOpen',
    enabled: true,
    order: 7,
  },
]

const STORAGE_KEY = 'homeSectionsConfig'

export const getHomeSectionsConfig = () => {
  const saved = localStorage.getItem(STORAGE_KEY)
  let savedConfig = []

  if (saved) {
    try {
      savedConfig = JSON.parse(saved)
    } catch (error) {
      console.error('Error parsing home sections config:', error)
      return DEFAULT_HOME_SECTIONS_CONFIG
    }
  }

  // Merge saved config with default config
  // This ensures new sections added to DEFAULT_HOME_SECTIONS_CONFIG show up for
  // existing users instead of silently disappearing.
  const mergedConfig = DEFAULT_HOME_SECTIONS_CONFIG.map(defaultItem => {
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

  // Keep any saved sections that are no longer in default, for backwards compat.
  const newSavedItems = savedConfig.filter(
    savedItem =>
      !DEFAULT_HOME_SECTIONS_CONFIG.find(item => item.id === savedItem.id),
  )

  return [...mergedConfig, ...newSavedItems]
}

export const saveHomeSectionsConfig = config => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  window.dispatchEvent(new Event('homeSectionsConfigChanged'))
}

export const resetHomeSectionsConfig = () => {
  saveHomeSectionsConfig(DEFAULT_HOME_SECTIONS_CONFIG)
  return DEFAULT_HOME_SECTIONS_CONFIG
}
