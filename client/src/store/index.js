import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { appApi } from '../services/api';

export const store = configureStore({
  reducer: { [appApi.reducerPath]: appApi.reducer },
  middleware: (getDefault) =>
    getDefault({
      // FormData request args and Blob responses (KYC documents) are intentionally non-serialisable
      serializableCheck: {
        ignoredActionPaths: ['meta.arg', 'meta.baseQueryMeta', 'payload'],
        ignoredPaths: [appApi.reducerPath],
      },
    }).concat(appApi.middleware),
});

setupListeners(store.dispatch); // enables refetchOnFocus / refetchOnReconnect
