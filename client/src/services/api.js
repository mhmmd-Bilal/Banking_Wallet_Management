import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || "/api",
  credentials: "include", // HTTP-only auth cookie
  prepareHeaders: (headers) => {
    headers.set("X-Requested-With", "XMLHttpRequest"); // CSRF guard header expected by the API
    return headers;
  },
});

const FALLBACK = {
  401: "Your session has expired. Please sign in again.",
  403: "You do not have permission to do that.",
  404: "Not found.",
  413: "The file is too large.",
  429: "Too many requests. Please slow down.",
};

/** Normalises every failure to { status, message, errors } so UI code never touches raw responses. */
const baseQuery = async (args, queryApi, extra) => {
  const result = await rawBaseQuery(args, queryApi, extra);
  if (!result.error) return result;
  const { status, data } = result.error;
  const body =
    data && typeof data === "object" && !(data instanceof Blob) ? data : {};
  const message =
    body.message ||
    (status === "FETCH_ERROR"
      ? "Cannot reach the server. Check your connection and try again."
      : FALLBACK[status] || "Request failed");
  // A 401 on any data endpoint means the session ended: re-check who we are.
  const url = typeof args === "string" ? args : args.url;
  if (status === 401 && !String(url).startsWith("/auth/"))
    queryApi.dispatch(appApi.util.invalidateTags(["Me"]));
  return { error: { status, message, errors: body.errors || [] } };
};

export const errorMessage = (e) => e?.message || "Something went wrong";

/** Maps API validation errors to { field: message } for form display. */
export function fieldErrors(e) {
  const out = {};
  for (const item of e?.errors || [])
    if (item.field && !out[item.field]) out[item.field] = item.message;
  return out;
}

const unwrap = (r) => r.data;
const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(
      ([, v]) => v !== "" && v !== undefined && v !== null,
    ),
  );
const MONEY_TAGS = [
  "Transactions",
  "Notifications",
  "Unread",
  "AdminTx",
  "Report",
];

export const appApi = createApi({
  reducerPath: "api",
  baseQuery,
  tagTypes: [
    "Me",
    "Transactions",
    "Notifications",
    "Unread",
    "AdminUsers",
    "AdminUser",
    "AdminTx",
    "Report",
  ],
  endpoints: (b) => ({
    // ---------- auth ----------
    getMe: b.query({
      query: () => "/auth/me",
      transformResponse: unwrap,
      providesTags: ["Me"],
    }),
    login: b.mutation({
      query: (body) => ({ url: "/auth/login", method: "POST", body }),
      transformResponse: unwrap,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(appApi.util.upsertQueryData("getMe", undefined, data));
        } catch {
          /* surfaced to the caller */
        }
      },
    }),
    register: b.mutation({
      query: (body) => ({ url: "/auth/register", method: "POST", body }), // FormData
      transformResponse: unwrap,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled;
          dispatch(appApi.util.upsertQueryData("getMe", undefined, data));
        } catch {
          /* surfaced to the caller */
        }
      },
    }),
    logout: b.mutation({
      query: () => ({ url: "/auth/logout", method: "POST" }),
      transformResponse: unwrap,
    }),

    // ---------- own account ----------
    openAccount: b.mutation({
      query: (body) => ({ url: "/accounts", method: "POST", body }),
      transformResponse: unwrap,
      async onQueryStarted(_, { dispatch, queryFulfilled }) {
        try {
          const { data } = await queryFulfilled; // server-confirmed account
          dispatch(
            appApi.util.updateQueryData("getMe", undefined, (d) => {
              d.account = data.account;
              if (d.user) d.user.accountStatus = data.account.status;
            }),
          );
        } catch {
          /* surfaced to the caller */
        }
      },
    }),

    // ---------- money movement (idempotency key per request) ----------
    deposit: b.mutation({
      query: ({ body, key }) => ({
        url: "/transactions/deposit",
        method: "POST",
        body,
        headers: { "Idempotency-Key": key },
      }),
      transformResponse: unwrap,
      invalidatesTags: MONEY_TAGS,
    }),
    withdraw: b.mutation({
      query: ({ body, key }) => ({
        url: "/transactions/withdraw",
        method: "POST",
        body,
        headers: { "Idempotency-Key": key },
      }),
      transformResponse: unwrap,
      invalidatesTags: MONEY_TAGS,
    }),
    transfer: b.mutation({
      query: ({ body, key }) => ({
        url: "/transactions/transfer",
        method: "POST",
        body,
        headers: { "Idempotency-Key": key },
      }),
      transformResponse: unwrap,
      invalidatesTags: MONEY_TAGS,
    }),
    listMyTransactions: b.query({
      query: (params) => ({ url: "/transactions/my", params: clean(params) }),
      transformResponse: unwrap,
      providesTags: ["Transactions"],
    }),
    getMyTransaction: b.query({
      query: (id) => `/transactions/${id}`,
      transformResponse: unwrap,
      providesTags: ["Transactions"],
    }),

    // ---------- notifications ----------
    listNotifications: b.query({
      query: (params) => ({ url: "/notifications", params: clean(params) }),
      transformResponse: unwrap,
      providesTags: ["Notifications"],
    }),
    getUnreadCount: b.query({
      query: () => "/notifications/unread-count",
      transformResponse: unwrap,
      providesTags: ["Unread"],
    }),
    markNotificationRead: b.mutation({
      query: (id) => ({ url: `/notifications/${id}/read`, method: "PATCH" }),
      transformResponse: unwrap,
      invalidatesTags: ["Notifications", "Unread"],
    }),

    // ---------- admin ----------
    getAdminUsers: b.query({
      query: (params) => ({ url: "/admin/users", params: clean(params) }),
      transformResponse: unwrap,
      providesTags: ["AdminUsers"],
    }),
    getPendingUsers: b.query({
      query: (params) => ({
        url: "/admin/users/pending",
        params: clean(params),
      }),
      transformResponse: unwrap,
      providesTags: ["AdminUsers"],
    }),
    getAdminUser: b.query({
      query: (id) => `/admin/users/${id}`,
      transformResponse: unwrap,
      providesTags: (r, e, id) => [{ type: "AdminUser", id }],
    }),
    getAdminDocument: b.query({
      // Fetched with the admin's cookie as a blob; never exposed through a public URL
      query: (id) => ({
        url: `/admin/users/${id}/document`,
        responseHandler: (res) => res.blob(),
      }),
      keepUnusedDataFor: 0,
    }),
    verifyUser: b.mutation({
      query: (id) => ({ url: `/admin/users/${id}/verify`, method: "PATCH" }),
      transformResponse: unwrap,
      invalidatesTags: ["AdminUsers", "AdminUser", "Report"],
    }),
    freezeAccount: b.mutation({
      query: (accountId) => ({
        url: `/admin/accounts/${accountId}/freeze`,
        method: "PATCH",
      }),
      transformResponse: unwrap,
      invalidatesTags: ["AdminUsers", "AdminUser"],
    }),
    unfreezeAccount: b.mutation({
      query: (accountId) => ({
        url: `/admin/accounts/${accountId}/unfreeze`,
        method: "PATCH",
      }),
      transformResponse: unwrap,
      invalidatesTags: ["AdminUsers", "AdminUser"],
    }),
    createCustomer: b.mutation({
      query: (body) => ({ url: "/admin/users", method: "POST", body }), // FormData
      transformResponse: unwrap,
      invalidatesTags: ["AdminUsers"],
    }),
    getAdminTransactions: b.query({
      query: (params) => ({
        url: "/admin/transactions",
        params: clean(params),
      }),
      transformResponse: unwrap,
      providesTags: ["AdminTx"],
    }),
    getAdminTransaction: b.query({
      query: (id) => `/admin/transactions/${id}`,
      transformResponse: unwrap,
      providesTags: ["AdminTx"],
    }),
    getReports: b.query({
      query: (params) => ({ url: "/admin/reports", params: clean(params) }),
      transformResponse: unwrap,
      providesTags: ["Report"],
    }),
  }),
});

export const {
  useGetMeQuery,
  useLoginMutation,
  useRegisterMutation,
  useLogoutMutation,
  useOpenAccountMutation,
  useDepositMutation,
  useWithdrawMutation,
  useTransferMutation,
  useListMyTransactionsQuery,
  useGetMyTransactionQuery,
  useListNotificationsQuery,
  useGetUnreadCountQuery,
  useMarkNotificationReadMutation,
  useGetAdminUsersQuery,
  useGetPendingUsersQuery,
  useGetAdminUserQuery,
  useLazyGetAdminDocumentQuery,
  useVerifyUserMutation,
  useFreezeAccountMutation,
  useUnfreezeAccountMutation,
  useCreateCustomerMutation,
  useGetAdminTransactionsQuery,
  useGetAdminTransactionQuery,
  useGetReportsQuery,
} = appApi;
