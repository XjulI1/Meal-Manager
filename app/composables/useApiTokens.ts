import type {
  CreatePersonalAccessTokenDto,
  CreatedPersonalAccessTokenView,
  PersonalAccessTokenView,
} from '../../shared/dto/personal-access-tokens'

export function useApiTokens() {
  async function list(): Promise<PersonalAccessTokenView[]> {
    return $fetch<PersonalAccessTokenView[]>('/api/me/tokens')
  }

  async function create(payload: CreatePersonalAccessTokenDto): Promise<CreatedPersonalAccessTokenView> {
    return $fetch<CreatedPersonalAccessTokenView>('/api/me/tokens', {
      method: 'POST',
      body: payload,
    })
  }

  async function revoke(id: string): Promise<void> {
    await $fetch(`/api/me/tokens/${id}`, { method: 'DELETE' })
  }

  return { list, create, revoke }
}
