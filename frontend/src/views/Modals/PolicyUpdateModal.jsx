import { Link } from '@mui/joy'
import { useTranslation } from 'react-i18next'

import ModalActions from '../../components/common/ModalActions.jsx'
import { useResponsiveModal } from '../../hooks/useResponsiveModal.js'

const PolicyUpdateModal = ({ onAcknowledge, onClose, open }) => {
  const { t } = useTranslation('common')
  const { ResponsiveModal } = useResponsiveModal()
  const handleAcknowledge = () => {
    onAcknowledge?.()
    onClose()
  }

  return (
    <ResponsiveModal
      open={open}
      onClose={handleAcknowledge}
      size='sm'
      title={t('about.title')}
      description={t('about.description')}
      footer={
        <ModalActions
          primary={{
            label: t('policyUpdate.acknowledge'),
            onClick: handleAcknowledge,
          }}
        />
      }
    >
      <Link href='/about' onClick={handleAcknowledge}>
        {t('about.title')}
      </Link>
    </ResponsiveModal>
  )
}

export default PolicyUpdateModal
