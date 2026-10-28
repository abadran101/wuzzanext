import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '../utils/ApiClient'
import { isMenuItemVisible } from '../utils/MenuVisibility'
import { useCircleMembers, useUserProfile } from './UserQueries'

const EMPTY_ITEMS = []
const QUERY_KEY = ['menuItems']

// Which optional menu items regular members see (household setting, task
// 024). Admins always see every item. Until the setting loads, regular
// members see none, so hidden items never flash in.
export const useMenuVisibility = () => {
  const { data: profile } = useUserProfile()
  const { data: members } = useCircleMembers()
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: QUERY_KEY,
    enabled: !!profile,
    queryFn: async () => {
      const response = await apiClient.get('/circles/menu-items')
      if (!response.ok) throw new Error('Unable to load menu items')
      return response.json()
    },
  })
  const mutation = useMutation({
    mutationFn: async memberItems => {
      const response = await apiClient.put(
        '/circles/menu-items',
        JSON.stringify({ memberItems }),
      )
      if (!response.ok) throw new Error('Unable to save menu items')
      return response.json()
    },
    onSuccess: data => queryClient.setQueryData(QUERY_KEY, data),
  })
  // The person shown, so an admin acting as someone else sees their menu.
  const impersonatedID = Number(localStorage.getItem('impersonatedUserId'))
  const personID = impersonatedID || profile?.id
  const isAdmin = !!members?.res?.some(
    member =>
      member.userId === personID && member.role === 'admin' && member.isActive,
  )
  const memberItems = query.data?.memberItems || EMPTY_ITEMS
  return {
    isAdmin,
    memberItems,
    isReady: query.isSuccess,
    isSaving: mutation.isPending,
    save: mutation.mutateAsync,
    isVisible: item => isMenuItemVisible(item, { isAdmin, memberItems }),
  }
}
