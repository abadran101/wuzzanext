import { useTranslation } from 'react-i18next'

import LogoImage from '@/assets/logo.png'
const Logo = ({ size = '128px' }) => {
  const { t } = useTranslation('common')
  return (
    <div className='logo'>
      <img src={LogoImage} alt={t('logoAlt')} width={size} height={size} />
    </div>
  )
}
export default Logo
