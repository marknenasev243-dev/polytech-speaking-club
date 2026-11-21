// Supabase Edge Function: club-reminders
// Scheduled by pg_cron / pg_net. JWT verification must be disabled for THIS function.
// Access is protected with an independent X-Reminder-Secret header.
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_PROJECT_URL = Deno.env.get('SUPABASE_URL') || '';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const BOT_TOKEN = Deno.env.get('BOT_TOKEN') || '';
const REMINDER_CRON_SECRET = Deno.env.get('REMINDER_CRON_SECRET') || '';
const db = createClient(SUPABASE_PROJECT_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const respond = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' },
  });

const esc = (value: unknown) => String(value ?? '').replace(/[&<>"']/g, (s) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[s] || s));

type Reminder = {
  reminder_id: number;
  registration_id: number;
  telegram_user_id: number;
  event_id: number;
  title: string;
  building: string;
  room: string;
  starts_at: string;
  table_number: number | null;
  language: string | null;
};

async function updateReminder(id: number, state: 'sent' | 'failed' | 'skipped', error?: string) {
  const { error: dbError } = await db.from('club_event_reminders').update({
    state,
    locked_at: null,
    sent_at: state === 'sent' ? new Date().toISOString() : null,
    last_error: error ? error.slice(0, 200) : null,
  }).eq('id', id);
  if (dbError) throw dbError;
}

function formatMessage(r: Reminder): string {
  const date = new Intl.DateTimeFormat('ru-RU', {
    timeZone: 'Europe/Moscow',
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(new Date(r.starts_at));
  const lang = r.language === 'ru' ? 'Русский' : r.language === 'en' ? 'Английский' : 'Не указан';
  return (
    '🔔 <b>Напоминание о встрече</b>\n\n' +
    'До встречи Speaking Club остались примерно сутки!\n\n' +
    `🗣 <b>${esc(r.title)}</b>\n` +
    `📅 <b>${esc(date)} (МСК)</b>\n` +
    `📍 ${esc(r.building)}, аудитория ${esc(r.room)}\n` +
    `🌐 Язык: ${esc(lang)}\n` +
    `🪑 Ваш стол: №${r.table_number ?? 'не назначен'}\n\n` +
    'Ждём тебя на встрече! 💙'
  );
}

async function processReminder(r: Reminder): Promise<'sent' | 'failed' | 'skipped'> {
  try {
    // A registration might have been cancelled or an event changed after claim.
    const [regRes, eventRes] = await Promise.all([
      db.from('registrations').select('status,table_number,language').eq('id', r.registration_id).maybeSingle(),
      db.from('events').select('status,starts_at,title,building,room').eq('id', r.event_id).maybeSingle(),
    ]);
    if (regRes.error) throw regRes.error;
    if (eventRes.error) throw eventRes.error;
    if (!regRes.data || !eventRes.data || regRes.data.status !== 'approved' ||
        eventRes.data.status !== 'published' || eventRes.data.starts_at !== r.starts_at) {
      await updateReminder(r.reminder_id, 'skipped');
      return 'skipped';
    }

    const fresh = {
      ...r,
      title: eventRes.data.title,
      building: eventRes.data.building,
      room: eventRes.data.room,
      table_number: regRes.data.table_number,
      language: regRes.data.language,
    };
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        chat_id: r.telegram_user_id,
        text: formatMessage(fresh),
        parse_mode: 'HTML',
      }),
      signal: AbortSignal.timeout(12000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || result.ok !== true) {
      throw new Error(`Telegram API response ${response.status}; code=${result.error_code ?? 'unknown'}`);
    }
    await updateReminder(r.reminder_id, 'sent');
    return 'sent';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Reminder failed (id only):', r.reminder_id, message);
    await updateReminder(r.reminder_id, 'failed', message);
    return 'failed';
  }
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return respond({ error: 'Method not allowed' }, 405);
  if (!BOT_TOKEN || !SERVICE_ROLE_KEY || !SUPABASE_PROJECT_URL || !REMINDER_CRON_SECRET) {
    return respond({ error: 'Missing server secrets' }, 503);
  }
  if (req.headers.get('x-reminder-secret') !== REMINDER_CRON_SECRET) {
    return respond({ error: 'Forbidden' }, 403);
  }
  try {
    const { data, error } = await db.rpc('club_claim_due_reminders');
    if (error) throw error;
    const reminders: Reminder[] = data || [];
    let sent = 0, failed = 0, skipped = 0;
    // Batches reduce burst/rate pressure on Telegram and avoid long serial processing.
    for (let i = 0; i < reminders.length; i += 5) {
      const outcomes = await Promise.all(reminders.slice(i, i + 5).map(processReminder));
      for (const outcome of outcomes) {
        if (outcome === 'sent') sent++;
        else if (outcome === 'failed') failed++;
        else skipped++;
      }
    }
    console.log('Reminders run:', { claimed: reminders.length, sent, failed, skipped });
    return respond({ ok: true, claimed: reminders.length, sent, failed, skipped });
  } catch (error) {
    console.error('Reminder scheduler failed:', error);
    return respond({ error: 'Reminder processing error' }, 500);
  }
});
