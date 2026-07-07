'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export type EntityOption = { id: string; name: string; city?: string | null };

// Автокомплит для справочников (клубы / тренеры): поиск по названию с
// задержкой, выбор из списка, и заявка на добавление, если не нашлось.
export default function EntityAutocomplete({
  table,
  requestType,
  userId,
  value,
  onChange,
  placeholder,
  withCity = false,
}: {
  table: 'clubs' | 'coaches';
  requestType: 'club' | 'coach';
  userId: string | null;
  value: EntityOption | null;
  onChange: (option: EntityOption | null) => void;
  placeholder: string;
  withCity?: boolean;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<EntityOption[]>([]);
  const [searching, setSearching] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [requestCity, setRequestCity] = useState('');
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const timer = setTimeout(async () => {
      // строка select() у supabase-js разбирается на уровне типов, поэтому
      // нужны две отдельные литеральные ветки, а не одна собранная на лету
      const { data } = withCity
        ? await supabase.from(table).select('id, name, city').ilike('name', `%${query.trim()}%`).limit(10)
        : await supabase.from(table).select('id, name').ilike('name', `%${query.trim()}%`).limit(10);
      setResults((data as EntityOption[]) || []);
      setSearching(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [query, table, withCity]);

  function select(o: EntityOption) {
    onChange(o);
    setQuery('');
    setResults([]);
    setShowRequestForm(false);
    setRequestSent(false);
  }

  async function submitRequest() {
    if (!userId || !query.trim()) return;
    const { error } = await supabase.from('addition_requests').insert({
      user_id: userId,
      type: requestType,
      name: query.trim(),
      city: withCity ? requestCity.trim() || null : null,
    });
    if (!error) {
      setRequestSent(true);
      setShowRequestForm(false);
      setRequestCity('');
    }
  }

  if (value) {
    return (
      <div className="flex items-center justify-between p-3 rounded-lg bg-white/10 text-white">
        <span>
          {value.name}
          {withCity && value.city ? `, ${value.city}` : ''}
        </span>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-white/50 hover:text-white text-sm shrink-0 ml-3"
        >
          Изменить
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setRequestSent(false);
          setShowRequestForm(false);
        }}
        className="w-full p-3 rounded-lg bg-white/10 text-white placeholder-white/50"
        placeholder={placeholder}
      />
      {query.trim().length >= 2 && (
        <div className="mt-2 bg-black/60 rounded-lg overflow-hidden text-sm">
          {searching ? (
            <p className="p-3 text-white/50">Ищем…</p>
          ) : results.length > 0 ? (
            results.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => select(o)}
                className="w-full text-left p-3 hover:bg-white/10 text-white/90 border-b border-white/5 last:border-0"
              >
                {o.name}
                {withCity && o.city ? `, ${o.city}` : ''}
              </button>
            ))
          ) : requestSent ? (
            <p className="p-3 text-green-400">Заявка отправлена — будет рассмотрена администратором.</p>
          ) : showRequestForm ? (
            <div className="p-3 space-y-2">
              <p className="text-white/60">«{query.trim()}»</p>
              {withCity && (
                <input
                  type="text"
                  placeholder="Город"
                  value={requestCity}
                  onChange={(e) => setRequestCity(e.target.value)}
                  className="w-full p-2 rounded bg-white/10 text-white placeholder-white/50"
                />
              )}
              <button
                type="button"
                onClick={submitRequest}
                className="px-3 py-1.5 rounded-full bg-accent text-black font-semibold"
              >
                Отправить заявку
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowRequestForm(true)}
              className="w-full text-left p-3 text-white/60 hover:text-white"
            >
              Не нашёл {requestType === 'club' ? 'клуб' : 'тренера'}? Отправить заявку
            </button>
          )}
        </div>
      )}
    </div>
  );
}
