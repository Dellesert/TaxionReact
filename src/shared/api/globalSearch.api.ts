/**
 * Global Search API
 * API-клиент для унифицированного поиска по всем сущностям
 */

import api from './axios.config';
import { API_ENDPOINTS } from '@shared/constants/api.constants';
import { GlobalSearchParams, GlobalSearchResponse } from '@shared/types/globalSearch.types';

export const globalSearch = async (params: GlobalSearchParams): Promise<GlobalSearchResponse> => {
  const response = await api.get<GlobalSearchResponse>(API_ENDPOINTS.SEARCH.GLOBAL, {
    params: {
      q: params.q,
      ...(params.type && params.type.length > 0 && { type: params.type }),
      ...(params.limit !== undefined && { limit: params.limit }),
      ...(params.category && { category: params.category }),
      ...(params.offset !== undefined && { offset: params.offset }),
    },
  });
  return response.data;
};
