import { createContext, useContext, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { appApi, useGetMeQuery, useLoginMutation, useLogoutMutation, useRegisterMutation } from '../services/api';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const dispatch = useDispatch();
  // refetchOnFocus picks up verification / freeze changes made by an admin when the user returns to the tab
  const { data, error, isLoading, refetch } = useGetMeQuery(undefined, { refetchOnFocus: true, refetchOnReconnect: true });
  const [loginMutation] = useLoginMutation();
  const [registerMutation] = useRegisterMutation();
  const [logoutMutation] = useLogoutMutation();

  const unauthorized = error?.status === 401; // stale cached data must not outlive an expired session
  const user = unauthorized ? null : data?.user ?? null;
  const account = unauthorized ? null : data?.account ?? null;

  const value = useMemo(
    () => ({
      user,
      account,
      loading: isLoading,
      refresh: () => refetch(),
      login: (body) => loginMutation(body).unwrap(),
      register: (formData) => registerMutation(formData).unwrap(),
      logout: async () => {
        try { await logoutMutation().unwrap(); } catch { /* cookie may already be gone */ }
        dispatch(appApi.util.resetApiState());
      },
      // Balances only ever come from the server (mutation response or socket event)
      setBalance: (balance) =>
        dispatch(appApi.util.updateQueryData('getMe', undefined, (d) => { if (d.account) d.account.balance = balance; })),
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, account, isLoading, dispatch]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
