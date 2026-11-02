import api, { apiRequestGet, getLinks } from 'mastodon/api';
import type {
  ApiSearchType,
  ApiSearchResultsJSON,
} from 'mastodon/api_types/search';

export const apiGetSearch = (
  params: {
    q: string;
    resolve?: boolean;
    type?: ApiSearchType;
    limit?: number;
    offset?: number;
  },
  options: {
    signal?: AbortSignal;
  } = {},
) =>
  apiRequestGet<ApiSearchResultsJSON>(
    'v2/search',
    {
      ...params,
    },
    options,
  );

export const apiGetPaginatedSearch = async (
  params?: {
    q: string;
    resolve?: boolean;
    type?: ApiSearchType;
    limit?: number;
  },
  url?: string,
) => {
  const response = await api().request<ApiSearchResultsJSON>({
    method: 'GET',
    url: url ?? '/api/v2/search',
    params,
  });

  return {
    results: response.data,
    links: getLinks(response),
  };
};
