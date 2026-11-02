import { createAction } from '@reduxjs/toolkit';

import { apiGetPaginatedSearch, apiGetSearch } from 'mastodon/api/search';
import type { ApiSearchType } from 'mastodon/api_types/search';
import type {
  RecentSearch,
  SearchType as RecentSearchType,
} from 'mastodon/models/search';
import { searchHistory } from 'mastodon/settings';
import {
  createDataLoadingThunk,
  createAppAsyncThunk,
} from 'mastodon/store/typed_functions';

import {
  fetchAccountsForCollectionPreview,
  importFetchedCollections,
} from '../reducers/slices/collections';

import { fetchRelationships } from './accounts';
import { importFetchedAccounts, importFetchedStatuses } from './importer';

export const SEARCH_HISTORY_UPDATE = 'SEARCH_HISTORY_UPDATE';

export const submitSearch = createDataLoadingThunk(
  'search/submit',
  async ({ q, type }: { q: string; type?: ApiSearchType }, { getState }) => {
    const signedIn = !!getState().meta.get('me');

    return apiGetPaginatedSearch({
      q,
      type,
      resolve: signedIn,
      limit: 10,
    });
  },
  async ({ results, links }, { dispatch }) => {
    const next = links.refs.find((link) => link.rel === 'next');

    if (results.accounts.length > 0) {
      dispatch(importFetchedAccounts(results.accounts));
      dispatch(
        fetchRelationships(results.accounts.map((account) => account.id)),
      );
    }

    if (results.statuses.length > 0) {
      dispatch(importFetchedStatuses(results.statuses));
    }

    if (results.collections.length > 0) {
      dispatch(importFetchedCollections(results.collections));
      await fetchAccountsForCollectionPreview(results.collections, dispatch);
    }

    return { results, next: next?.uri };
  },
  {
    useLoadingBar: false,
  },
);

export const expandSearch = createDataLoadingThunk(
  'search/expand',
  async (_args: { type: ApiSearchType }, { getState }) => {
    const nextUrl = getState().search.next;

    return apiGetPaginatedSearch(undefined, nextUrl);
  },
  async ({ results, links }, { dispatch }) => {
    const next = links.refs.find((link) => link.rel === 'next');

    if (results.accounts.length > 0) {
      dispatch(importFetchedAccounts(results.accounts));
      dispatch(
        fetchRelationships(results.accounts.map((account) => account.id)),
      );
    }

    if (results.statuses.length > 0) {
      dispatch(importFetchedStatuses(results.statuses));
    }

    if (results.collections.length > 0) {
      dispatch(importFetchedCollections(results.collections));
      await fetchAccountsForCollectionPreview(results.collections, dispatch);
    }

    return { results, next: next?.uri };
  },
  {
    useLoadingBar: true,
    condition: (_args, { getState }) =>
      !!getState().search.next && !getState().search.loading,
  },
);

export const openURL = createDataLoadingThunk(
  'search/openURL',
  ({ url }: { url: string }) =>
    apiGetSearch({
      q: url,
      resolve: true,
      limit: 1,
    }),
  (data, { dispatch }) => {
    if (data.accounts.length > 0) {
      dispatch(importFetchedAccounts(data.accounts));
    } else if (data.statuses.length > 0) {
      dispatch(importFetchedStatuses(data.statuses));
    }

    return data;
  },
  {
    useLoadingBar: true,
  },
);

export const clickSearchResult = createAppAsyncThunk(
  'search/clickResult',
  (
    { q, type }: { q: string; type?: RecentSearchType },
    { dispatch, getState },
  ) => {
    const previous = getState().search.recent;

    if (previous.some((x) => x.q === q && x.type === type)) {
      return;
    }

    const me = getState().meta.get('me') as string;
    const current = [{ type, q }, ...previous].slice(0, 4);

    searchHistory.set(me, current);
    dispatch(updateSearchHistory(current));
  },
);

export const forgetSearchResult = createAppAsyncThunk(
  'search/forgetResult',
  (
    { q, type }: { q: string; type?: RecentSearchType },
    { dispatch, getState },
  ) => {
    const previous = getState().search.recent;
    const me = getState().meta.get('me') as string;
    const current = previous.filter(
      (result) => result.q !== q || result.type !== type,
    );

    searchHistory.set(me, current);
    dispatch(updateSearchHistory(current));
  },
);

export const updateSearchHistory = createAction<RecentSearch[]>(
  'search/updateHistory',
);

export const hydrateSearch = createAppAsyncThunk(
  'search/hydrate',
  (_args, { dispatch, getState }) => {
    const me = getState().meta.get('me') as string;
    const history = searchHistory.get(me);

    if (history !== null) {
      dispatch(updateSearchHistory(history));
    }
  },
);
