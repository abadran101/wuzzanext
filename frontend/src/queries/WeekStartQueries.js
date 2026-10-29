import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '../utils/ApiClient'
import { DEFAULT_WEEK_START } from '../utils/WeeklyPoints'

const QUERY_KEY = ['weekStart']

// The first day of the household's points week (household setting, task
// 010). Monday until the setting loads; admins can change it.
export const useWeekStart = () => {
  const queryClient = useQueryClient()
  const query = useQuery({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      const response = await apiClient.get('/circles/week-start')
      if (!response.ok) throw new Error('Unable to load the week start')
      return response.json()
    },
  })
  const mutation = useMutation({
    mutationFn: async weekStart => {
      const response = await apiClient.put(
        '/circles/week-start',
        JSON.stringify({ weekStart }),
      )
      if (!response.ok) throw new Error('Unable to save the week start')
      return response.json()
    },
    onSuccess: data => queryClient.setQueryData(QUERY_KEY, data),
  })
  return {
    weekStart: query.data?.weekStart ?? DEFAULT_WEEK_START,
    isReady: query.isSuccess,
    isSaving: mutation.isPending,
    save: mutation.mutateAsync,
  }
}
