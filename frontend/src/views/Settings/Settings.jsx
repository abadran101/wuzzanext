import { Delete, Refresh } from '@mui/icons-material'
import {
  Box,
  Button,
  Card,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormHelperText,
  Input,
  Option,
  Select,
  Typography,
} from '@mui/joy'
import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import RealTimeSettings from '../../components/RealTimeSettings'
import { useLocalization } from '../../contexts/LocalizationContext'
import Logo from '../../Logo'
import { useUserProfile } from '../../queries/UserQueries'
import { useNotification } from '../../service/NotificationProvider'
import {
  AcceptCircleMemberRequest,
  DeleteCircleMember,
  GetAllCircleMembers,
  GetCircleMemberRequests,
  GetUserCircle,
  JoinCircle,
  LeaveCircle,
  PutWebhookURL,
  UpdateMemberRole,
  UpdatePassword,
} from '../../utils/Fetcher'
import LoadingComponent from '../components/Loading'
import ConfirmationModal from '../Modals/Inputs/ConfirmationModal'
import PassowrdChangeModal from '../Modals/Inputs/PasswordChangeModal'
import UserDeletionModal from '../Modals/Inputs/UserDeletionModal'
import APITokenSettings from './APITokenSettings'
import HomeSectionsSettings from './HomeSectionsSettings'
import LayoutSettings from './LayoutSettings'
import LocalizationSettings from './LocalizationSettings'
import MFASettings from './MFASettings'
import NotificationSetting from './NotificationSetting'
import ProfileSettings from './ProfileSettings'
import StorageSettings from './StorageSettings'
import ThemeToggle from './ThemeToggle'

const Settings = () => {
  const { t } = useTranslation('settings')
  const { data: userProfile } = useUserProfile()
  const queryClient = useQueryClient()
  const { showNotification } = useNotification()
  const navigate = useNavigate()
  const { fmt } = useLocalization()

  const [userCircles, setUserCircles] = useState([])
  const [circleMemberRequests, setCircleMemberRequests] = useState([])
  const [circleInviteCode, setCircleInviteCode] = useState('')
  const [circleMembers, setCircleMembers] = useState([])
  const [webhookURL, setWebhookURL] = useState(null)
  const [webhookError, setWebhookError] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [lastRefresh, setLastRefresh] = useState(null)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const [changePasswordModal, setChangePasswordModal] = useState(false)
  const [userDeletionModal, setUserDeletionModal] = useState(false)
  const [confirmModalConfig, setConfirmModalConfig] = useState({})

  const showConfirmation = (
    message,
    title,
    onConfirm,
    confirmText = t('common.confirm'),
    cancelText = t('common.cancel'),
    color = 'primary',
  ) => {
    setConfirmModalConfig({
      isOpen: true,
      message,
      title,
      confirmText,
      cancelText,
      color,
      onClose: isConfirmed => {
        if (isConfirmed) {
          onConfirm()
        }
        setConfirmModalConfig({})
      },
    })
  }
  const refreshMemberRequests = async () => {
    setIsRefreshing(true)
    try {
      const resp = await GetCircleMemberRequests()
      const data = await resp.json()
      setCircleMemberRequests(data.res ? data.res : [])
      setLastRefresh(new Date())
    } catch (error) {
      showNotification({
        type: 'error',
        message: t('circleSettings.refreshFailed'),
      })
    } finally {
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    GetUserCircle().then(resp => {
      resp.json().then(data => {
        setUserCircles(data.res ? data.res : [])
        setWebhookURL(data.res ? data.res[0].webhook_url : null)
      })
    })
    GetCircleMemberRequests().then(resp => {
      resp.json().then(data => {
        setCircleMemberRequests(data.res ? data.res : [])
        setLastRefresh(new Date())
      })
    })
    GetAllCircleMembers().then(data => {
      setCircleMembers(data.res ? data.res : [])
    })
  }, [])
  // useEffect when circleMembers and userprofile:
  useEffect(() => {
    if (userProfile && userProfile.id) {
      const isUserAdmin = circleMembers.some(
        member => member.userId === userProfile.id && member.role === 'admin',
      )
      setIsAdmin(isUserAdmin)
    }
  }, [circleMembers, userProfile])

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash
      if (hash) {
        // Small delay to ensure the component is fully rendered before scrolling
        setTimeout(() => {
          const section = document.getElementById(hash.slice(1))
          if (section) {
            // Get the element position and scroll with some offset for the title
            const elementPosition = section.offsetTop
            const offsetPosition = elementPosition - 20 // 20px padding above the title

            window.scrollTo({
              top: offsetPosition,
              behavior: 'instant', // Use 'smooth' for smooth scrolling
            })
          }
        }, 500)
      }
    }

    // Handle initial hash on mount
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [])

  if (userProfile === null) {
    return (
      <Container className='flex h-full items-center justify-center'>
        <Box className='flex flex-col items-center justify-center'>
          <CircularProgress
            color='success'
            sx={{ '--CircularProgress-size': '200px' }}
          >
            <Logo />
          </CircularProgress>
        </Box>
      </Container>
    )
  }
  if (!userProfile) {
    return <LoadingComponent />
  }

  return (
    <Container>
      <ProfileSettings />
      <div className='grid gap-4 py-4' id='circle'>
        <Typography level='h3'>{t('circleSettings.title')}</Typography>
        <Divider />
        <Typography level='body-md'>
          {t('circleSettings.description')}
        </Typography>
        <Typography level='title-sm' mb={-1}>
          {userCircles[0]?.userRole === 'member'
            ? t('circleSettings.memberOf', { name: userCircles[0]?.name })
            : t('circleSettings.yourCircleCode')}

          <Input
            value={userCircles[0]?.invite_code}
            disabled
            size='lg'
            sx={{
              width: '220px',
              mb: 1,
            }}
          />
          <Button
            variant='soft'
            onClick={() => {
              navigator.clipboard.writeText(userCircles[0]?.invite_code)
              showNotification({
                type: 'success',
                message: t('circleSettings.codeCopied'),
              })
            }}
          >
            {t('circleSettings.copyCode')}
          </Button>
          <Button
            variant='soft'
            sx={{ ml: 1 }}
            onClick={() => {
              navigator.clipboard.writeText(
                window.location.protocol +
                  '//' +
                  window.location.host +
                  `/circle/join?code=${userCircles[0]?.invite_code}`,
              )
              showNotification({
                type: 'success',
                message: t('circleSettings.linkCopied'),
              })
            }}
          >
            {t('circleSettings.copyLink')}
          </Button>
          {userCircles.length > 0 && userCircles[0]?.userRole === 'member' && (
            <Button
              color='danger'
              variant='outlined'
              sx={{ ml: 1 }}
              onClick={() => {
                showConfirmation(
                  t('circleSettings.leaveConfirmMessage'),
                  t('circleSettings.leaveConfirmTitle'),
                  () => {
                    LeaveCircle(userCircles[0]?.id).then(resp => {
                      if (resp.ok) {
                        showNotification({
                          type: 'success',
                          message: t('circleSettings.leftCircle'),
                        })
                      } else {
                        showNotification({
                          type: 'error',
                          message: t('circleSettings.leaveFailed'),
                        })
                      }
                    })
                  },
                  t('circleSettings.leaveConfirmButton'),
                  t('common.cancel'),
                  'danger',
                )
              }}
            >
              {t('circleSettings.leave')}
            </Button>
          )}
        </Typography>

        <Typography level='title-md'>
          {t('circleSettings.circleMembers')}
        </Typography>
        {circleMembers.map(member => (
          <Card key={member.id} className='p-4'>
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Box>
                <Typography level='body-md'>
                  {member.displayName.charAt(0).toUpperCase() +
                    member.displayName.slice(1)}
                  {member.userId === userProfile.id
                    ? t('circleSettings.you')
                    : ''}{' '}
                  <Chip>
                    {' '}
                    {member.isActive
                      ? member.role
                      : t('circleSettings.pendingApproval')}
                  </Chip>
                </Typography>
                {member.isActive ? (
                  <Typography level='body-sm'>
                    {t('circleSettings.joinedOn', {
                      date: fmt.date(member.createdAt),
                    })}
                  </Typography>
                ) : (
                  <Typography level='body-sm' color='danger'>
                    {t('circleSettings.requestedToJoin', {
                      date: fmt.date(member.updatedAt),
                    })}
                  </Typography>
                )}
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {member.userId !== userProfile.id && isAdmin && (
                  <Select
                    size='sm'
                    sx={{ mr: 1 }}
                    value={member.role}
                    renderValue={() => (
                      <Typography>
                        {member.role.charAt(0).toUpperCase() +
                          member.role.slice(1)}
                      </Typography>
                    )}
                    onChange={(e, value) => {
                      UpdateMemberRole(member.userId, value).then(resp => {
                        if (resp.ok) {
                          const newCircleMembers = circleMembers.map(m => {
                            if (m.userId === member.userId) {
                              m.role = value
                            }
                            return m
                          })
                          setCircleMembers(newCircleMembers)
                        } else {
                          showNotification({
                            type: 'error',
                            message: t('circleSettings.roleUpdateFailed'),
                          })
                        }
                      })
                    }}
                  >
                    {['member', 'manager', 'admin'].map((option, index) => (
                      <Option value={option} key={index}>
                        <Box
                          sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'start',
                            alignItems: 'start',
                            width: '100%',
                            gap: 0.5,
                          }}
                        >
                          <Typography
                            level='title-sm'
                            sx={{ mb: 0, mt: 0, lineHeight: 1.1 }}
                          >
                            {t(`circleSettings.roles.${option}`)}
                          </Typography>
                          <Typography
                            level='body-sm'
                            sx={{ mt: 0, mb: 0, lineHeight: 1.1 }}
                          >
                            {t(`circleSettings.roles.${option}Description`)}
                          </Typography>
                        </Box>
                      </Option>
                    ))}
                  </Select>
                )}
                {isAdmin &&
                  member.userId !== userProfile.id &&
                  member.isActive && (
                    <Button
                      variant='outlined'
                      color='danger'
                      size='sm'
                      onClick={() => {
                        showConfirmation(
                          t('circleSettings.removeMemberMessage', {
                            name: member.displayName,
                          }),
                          t('circleSettings.removeMemberTitle'),
                          () => {
                            DeleteCircleMember(
                              member.circleId,
                              member.userId,
                            ).then(resp => {
                              if (resp.ok) {
                                showNotification({
                                  type: 'success',
                                  message: t('circleSettings.memberRemoved'),
                                })
                                // Invalidate and refetch circle-related queries
                                queryClient.invalidateQueries({
                                  queryKey: ['circleMembers'],
                                })
                                queryClient.invalidateQueries({
                                  queryKey: ['userCircle'],
                                })
                                queryClient.refetchQueries({
                                  queryKey: ['circleMembers'],
                                })
                                queryClient.refetchQueries({
                                  queryKey: ['userCircle'],
                                })
                                // Update local state immediately
                                setCircleMembers(prevMembers =>
                                  prevMembers.filter(
                                    m => m.userId !== member.userId,
                                  ),
                                )
                              }
                            })
                          },
                          t('common.remove'),
                          t('common.cancel'),
                          'danger',
                        )
                      }}
                    >
                      <Delete />
                    </Button>
                  )}
              </Box>
            </Box>
          </Card>
        ))}

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            mb: 1,
          }}
        >
          <Typography level='title-md'>
            {t('circleSettings.circleMemberRequests')}
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {lastRefresh && (
              <Typography level='body-sm' color='neutral'>
                {t('circleSettings.lastUpdated', {
                  time: fmt.dateTime(lastRefresh),
                })}
              </Typography>
            )}
            <Button
              size='sm'
              variant='soft'
              onClick={refreshMemberRequests}
              disabled={isRefreshing}
              startDecorator={
                isRefreshing ? <CircularProgress size='sm' /> : <Refresh />
              }
            >
              {isRefreshing
                ? t('circleSettings.refreshing')
                : t('common.refresh')}
            </Button>
          </Box>
        </Box>

        {circleMemberRequests.map(request => (
          <Card key={request.id} className='p-4'>
            <Typography level='body-md'>
              {t('circleSettings.wantsToJoin', { name: request.displayName })}
            </Typography>
            <Button
              variant='soft'
              color='success'
              onClick={() => {
                showConfirmation(
                  t('circleSettings.acceptRequestMessage', {
                    name: request.displayName,
                    username: request.username,
                  }),
                  t('circleSettings.acceptRequestTitle'),
                  () => {
                    AcceptCircleMemberRequest(request.id).then(resp => {
                      if (resp.ok) {
                        showNotification({
                          type: 'success',
                          message: t('circleSettings.requestAccepted'),
                        })
                        // Invalidate and refetch circle-related queries
                        queryClient.invalidateQueries({
                          queryKey: ['circleMembers'],
                        })
                        queryClient.invalidateQueries({
                          queryKey: ['circleMemberRequests'],
                        })
                        queryClient.invalidateQueries({
                          queryKey: ['userCircle'],
                        })
                        queryClient.refetchQueries({
                          queryKey: ['circleMembers'],
                        })
                        queryClient.refetchQueries({
                          queryKey: ['circleMemberRequests'],
                        })
                        queryClient.refetchQueries({ queryKey: ['userCircle'] })
                        // Refresh local state
                        refreshMemberRequests()
                        GetAllCircleMembers().then(data => {
                          setCircleMembers(data.res ? data.res : [])
                        })
                      }
                    })
                  },
                  t('circleSettings.accept'),
                  t('common.cancel'),
                )
              }}
            >
              {t('circleSettings.accept')}
            </Button>
          </Card>
        ))}
        <Divider> {t('circleSettings.or')} </Divider>

        <Typography level='body-md'>
          {t('circleSettings.joinOtherDescription')}
        </Typography>

        <Typography level='title-sm' mb={-1}>
          {t('circleSettings.enterCircleCode')}
          <Input
            placeholder={t('circleSettings.enterCodePlaceholder')}
            value={circleInviteCode}
            onChange={e => setCircleInviteCode(e.target.value)}
            size='lg'
            sx={{
              width: '220px',
              mb: 1,
            }}
          />
          <Button
            variant='soft'
            onClick={() => {
              JoinCircle(circleInviteCode).then(resp => {
                if (resp.ok) {
                  showNotification({
                    type: 'success',
                    message: t('circleSettings.joinedPending'),
                  })
                  setTimeout(() => navigate('/'), 3000)
                } else {
                  if (resp.status === 409) {
                    showNotification({
                      type: 'error',
                      message: t('circleSettings.alreadyMember'),
                    })
                  } else {
                    showNotification({
                      type: 'error',
                      message: t('circleSettings.joinFailed'),
                    })
                  }
                  setTimeout(() => navigate('/'), 3000)
                }
              })
            }}
          >
            {t('circleSettings.joinCircle')}
          </Button>
        </Typography>
        {circleMembers.find(m => userProfile.id == m.userId)?.role ===
          'admin' && (
          <>
            <Typography level='title-lg' mt={2}>
              {t('advanced.webhookTitle')}
            </Typography>
            <Typography level='body-md' mt={-1}>
              {t('advanced.webhookDescription')}
            </Typography>
            <FormControl sx={{ mt: 1 }}>
              <Checkbox
                checked={webhookURL !== null}
                onClick={() => {
                  if (webhookURL === null) {
                    setWebhookURL('')
                  } else {
                    setWebhookURL(null)
                  }
                }}
                variant='soft'
                label={t('advanced.webhookToggle')}
                overlay
              />
              <FormHelperText>{t('advanced.webhookHelper')}</FormHelperText>
            </FormControl>

            {webhookURL !== null && (
              <Box>
                <Typography level='title-sm'>
                  {t('advanced.webhookURL')}
                </Typography>
                <Input
                  value={webhookURL ? webhookURL : ''}
                  onChange={e => setWebhookURL(e.target.value)}
                  size='lg'
                  sx={{
                    width: '220px',
                    mb: 1,
                  }}
                />
                {webhookError && (
                  <Typography level='body-sm' color='danger'>
                    {webhookError}
                  </Typography>
                )}
                <Button
                  variant='soft'
                  sx={{ width: '110px', mt: 1 }}
                  onClick={() => {
                    PutWebhookURL(webhookURL).then(resp => {
                      if (resp.ok) {
                        showNotification({
                          type: 'success',
                          message: t('advanced.webhookUpdated'),
                        })
                      } else {
                        showNotification({
                          type: 'error',
                          message: t('advanced.webhookUpdateFailed'),
                        })
                      }
                    })
                  }}
                >
                  {t('common.save')}
                </Button>
              </Box>
            )}
          </>
        )}

        {/* WebSocket Settings */}
        {/* <WebSocketSettings /> */}
        <RealTimeSettings />
      </div>

      <div className='grid gap-4 py-4' id='account'>
        <Typography level='h3'>{t('accountSettings.title')}</Typography>
        <Divider />
        {import.meta.env.VITE_IS_SELF_HOSTED === 'true' && (
          <Box>
            <Typography level='title-md' mb={1}>
              {t('accountSettings.password')}
            </Typography>
            <Typography mb={1} level='body-sm'></Typography>
            <Button
              variant='soft'
              onClick={() => {
                setChangePasswordModal(true)
              }}
            >
              {t('accountSettings.changePassword')}
            </Button>
            {changePasswordModal ? (
              <PassowrdChangeModal
                isOpen={changePasswordModal}
                onClose={password => {
                  if (password) {
                    UpdatePassword(password).then(resp => {
                      if (resp.ok) {
                        showNotification({
                          type: 'success',
                          message: t('accountSettings.passwordChanged'),
                        })
                      } else {
                        showNotification({
                          type: 'error',
                          message: t('accountSettings.passwordChangeFailed'),
                        })
                      }
                    })
                  }
                  setChangePasswordModal(false)
                }}
              />
            ) : null}
          </Box>
        )}

        <Box>
          <Typography level='title-md' mb={1} color='danger'>
            {t('accountSettings.dangerZone')}
          </Typography>
          <Typography level='body-sm' mb={2} color='neutral'>
            {t('accountSettings.dangerZoneDescription')}
          </Typography>
          <Button
            variant='outlined'
            color='danger'
            onClick={() => setUserDeletionModal(true)}
          >
            {t('accountSettings.deleteAccount')}
          </Button>
        </Box>
      </div>
      <NotificationSetting />
      <MFASettings />
      <APITokenSettings />
      <StorageSettings />
      <div className='grid gap-4 py-4' id='homeSections'>
        <Typography level='h3'>{t('homeSections.title')}</Typography>
        <Divider />
        <Typography level='body-md'>
          {t('homeSections.detailedDescription')}
        </Typography>
        <HomeSectionsSettings />
      </div>

      <div className='grid gap-4 py-4' id='layout'>
        <Typography level='h3'>{t('layout.title')}</Typography>
        <Divider />
        <Typography level='body-md'>
          {t('layout.detailedDescription')}
        </Typography>
        <LayoutSettings />
      </div>

      <div className='grid gap-4 py-4' id='theme'>
        <Typography level='h3'>{t('theme.title')}</Typography>
        <Divider />
        <Typography level='body-md'>{t('theme.description')}</Typography>
        <ThemeToggle />
      </div>

      <div className='grid gap-4 py-4' id='localization'>
        <Typography level='h3'>{t('localization.title')}</Typography>
        <Divider />
        <Typography level='body-md'>
          {t('localization.descriptionLong')}
        </Typography>
        <LocalizationSettings />
      </div>

      {/* Modals */}
      {confirmModalConfig?.isOpen && (
        <ConfirmationModal config={confirmModalConfig} />
      )}

      <UserDeletionModal
        isOpen={userDeletionModal}
        onClose={success => {
          setUserDeletionModal(false)
          if (success) {
            showNotification({
              type: 'success',
              message: 'Account deleted successfully',
            })
          }
        }}
        userProfile={userProfile}
      />
    </Container>
  )
}

export default Settings
