import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export const COMPARE_MAX = 4;
const KEY = 'kk-compare-ids';
const Ctx = createContext(null);

export function CompareProvider({ children }) {
  const [ids, setIds] = useState(() => {
    try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.slice(0, COMPARE_MAX) : []; } catch { return []; }
  });
  useEffect(() => { try { localStorage.setItem(KEY, JSON.stringify(ids)); } catch { /* ignore */ } }, [ids]);

  const has = useCallback(id => ids.includes(id), [ids]);
  const add = useCallback(id => setIds(s => (s.includes(id) || s.length >= COMPARE_MAX ? s : [...s, id])), []);
  const remove = useCallback(id => setIds(s => s.filter(x => x !== id)), []);
  const toggle = useCallback(id => setIds(s => (s.includes(id) ? s.filter(x => x !== id) : s.length >= COMPARE_MAX ? s : [...s, id])), []);
  const clear = useCallback(() => setIds([]), []);
  const value = useMemo(() => ({ ids, has, add, remove, toggle, clear, full: ids.length >= COMPARE_MAX, count: ids.length, max: COMPARE_MAX }), [ids, has, add, remove, toggle, clear]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const useCompare = () => useContext(Ctx);
