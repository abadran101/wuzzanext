import {
  AccountBalance,
  Book,
  Build,
  BusinessCenter,
  Code,
  Computer,
  DirectionsCar,
  FitnessCenter,
  Flight,
  FolderOpen,
  Games,
  Home,
  LocalHospital,
  MusicNote,
  Palette,
  Pets,
  PhotoCamera,
  Restaurant,
  School,
  Science,
  ShoppingCart,
  SportsSoccer,
  Work,
  Yard,
} from '@mui/icons-material'

const PROJECT_ICONS = [
  {
    name: 'Folder',
    labelKey: 'projects:icons.FolderOpen',
    icon: FolderOpen,
    value: 'FolderOpen',
  },
  { name: 'Work', labelKey: 'projects:icons.Work', icon: Work, value: 'Work' },
  { name: 'Home', labelKey: 'projects:icons.Home', icon: Home, value: 'Home' },
  {
    name: 'School',
    labelKey: 'projects:icons.School',
    icon: School,
    value: 'School',
  },
  {
    name: 'Business',
    labelKey: 'projects:icons.BusinessCenter',
    icon: BusinessCenter,
    value: 'BusinessCenter',
  },
  { name: 'Code', labelKey: 'projects:icons.Code', icon: Code, value: 'Code' },
  {
    name: 'Build',
    labelKey: 'projects:icons.Build',
    icon: Build,
    value: 'Build',
  },
  {
    name: 'Design',
    labelKey: 'projects:icons.Palette',
    icon: Palette,
    value: 'Palette',
  },
  {
    name: 'Sports',
    labelKey: 'projects:icons.SportsSoccer',
    icon: SportsSoccer,
    value: 'SportsSoccer',
  },
  {
    name: 'Fitness',
    labelKey: 'projects:icons.FitnessCenter',
    icon: FitnessCenter,
    value: 'FitnessCenter',
  },
  {
    name: 'Shopping',
    labelKey: 'projects:icons.ShoppingCart',
    icon: ShoppingCart,
    value: 'ShoppingCart',
  },
  {
    name: 'Food',
    labelKey: 'projects:icons.Restaurant',
    icon: Restaurant,
    value: 'Restaurant',
  },
  {
    name: 'Travel',
    labelKey: 'projects:icons.Flight',
    icon: Flight,
    value: 'Flight',
  },
  { name: 'Study', labelKey: 'projects:icons.Book', icon: Book, value: 'Book' },
  {
    name: 'Music',
    labelKey: 'projects:icons.MusicNote',
    icon: MusicNote,
    value: 'MusicNote',
  },
  {
    name: 'Photo',
    labelKey: 'projects:icons.PhotoCamera',
    icon: PhotoCamera,
    value: 'PhotoCamera',
  },
  {
    name: 'Games',
    labelKey: 'projects:icons.Games',
    icon: Games,
    value: 'Games',
  },
  {
    name: 'Science',
    labelKey: 'projects:icons.Science',
    icon: Science,
    value: 'Science',
  },
  {
    name: 'Finance',
    labelKey: 'projects:icons.AccountBalance',
    icon: AccountBalance,
    value: 'AccountBalance',
  },
  {
    name: 'Health',
    labelKey: 'projects:icons.LocalHospital',
    icon: LocalHospital,
    value: 'LocalHospital',
  },
  {
    name: 'Auto',
    labelKey: 'projects:icons.DirectionsCar',
    icon: DirectionsCar,
    value: 'DirectionsCar',
  },
  { name: 'Pets', labelKey: 'projects:icons.Pets', icon: Pets, value: 'Pets' },
  {
    name: 'Garden',
    labelKey: 'projects:icons.Garden',
    icon: Yard,
    value: 'Garden',
  },
  {
    name: 'Tech',
    labelKey: 'projects:icons.Computer',
    icon: Computer,
    value: 'Computer',
  },
]

export default PROJECT_ICONS

export const getIconComponent = iconValue => {
  const iconData = PROJECT_ICONS.find(icon => icon.value === iconValue)
  return iconData ? iconData.icon : FolderOpen
}
