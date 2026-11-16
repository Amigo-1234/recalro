'use strict';
const http = require('http');
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 8000);
const PUBLIC_DIR = __dirname;
const MAX_BODY = 16 * 1024 * 1024;
const MIME_TYPES = { '.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.mp4':'video/mp4','.svg':'image/svg+xml','.ico':'image/x-icon','.woff2':'font/woff2' };
const institutionCache = new Map();
const COUNTRY_CODES = { Nigeria:'NG', Ghana:'GH', Kenya:'KE', 'South Africa':'ZA', 'United Kingdom':'GB', 'United States':'US', Canada:'CA', India:'IN' };

function json(res, status, data) { res.writeHead(status, { 'Content-Type':'application/json; charset=utf-8', 'Cache-Control':'no-store' }); res.end(JSON.stringify(data)); }
function isSupabasePublicKey(key) {
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(key)) return true;
  const payload = key.split('.')[1];
  if (!payload) return false;
  try { return JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')).role === 'anon'; }
  catch { return false; }
}
function supabaseConfig() {
  const key = process.env.SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || '';
  return {
    url:(process.env.SUPABASE_URL || '').replace(/\/+$/, ''),
    key:isSupabasePublicKey(key) ? key : ''
  };
}
function readBody(req) {
  // Vercel parses JSON before invoking a Node.js Function; the local server streams it.
  if (req.body !== undefined) {
    if (typeof req.body === 'string') {
      try { return Promise.resolve(JSON.parse(req.body || '{}')); }
      catch { return Promise.reject(Object.assign(new Error('Invalid JSON request.'), { status:400 })); }
    }
    return Promise.resolve(req.body);
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', c => {
      size += c.length;
      if (size > MAX_BODY) {
        reject(Object.assign(new Error('Request is too large. Keep uploads under 12 MB.'), { status:413 }));
        req.destroy();
      } else chunks.push(c);
    });
    req.on('end', () => {
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')); }
      catch { reject(Object.assign(new Error('Invalid JSON request.'), { status:400 })); }
    });
    req.on('error', reject);
  });
}
function requireKey(res) {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) { json(res, 503, { error:'AI is not configured yet. Add OPENAI_API_KEY to your server environment and restart Recalro.' }); return false; }
  if (!/^sk-/.test(key)) { json(res, 503, { error:'OPENAI_API_KEY is not an OpenAI secret API key. Replace it with a secret key from the OpenAI API dashboard.' }); return false; }
  return true;
}
async function requireSupabaseUser(req, res) {
  const config = supabaseConfig();
  if (!config.url || !config.key) { json(res, 503, { error:'Supabase is not configured yet. Add SUPABASE_URL and SUPABASE_PUBLISHABLE_KEY to the server environment.' }); return null; }
  const token = /^Bearer\s+(.+)$/i.exec(req.headers.authorization || '')?.[1];
  if (!token) { json(res, 401, { error:'Sign in to use Recalro AI.' }); return null; }
  const response = await fetch(`${config.url}/auth/v1/user`, { headers:{ apikey:config.key, Authorization:`Bearer ${token}` } });
  if (!response.ok) { json(res, 401, { error:'Your session has expired. Sign in again to continue.' }); return null; }
  return response.json();
}
async function openai(pathname, options) { const r = await fetch(`https://api.openai.com/v1/${pathname}`, { ...options, headers: { Authorization:`Bearer ${process.env.OPENAI_API_KEY}`, ...(options.headers || {}) } }); const data = await r.json().catch(() => ({})); if (!r.ok) throw new Error(data.error?.message || `OpenAI request failed (${r.status}).`); return data; }
function extractDocxText(buffer) {
  let cursor = 0;
  while (cursor + 46 < buffer.length) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) { cursor++; continue; }
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const nameLen = buffer.readUInt16LE(cursor + 28), extraLen = buffer.readUInt16LE(cursor + 30), commentLen = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLen).toString('utf8');
    if (name === 'word/document.xml') {
      const localNameLen = buffer.readUInt16LE(localOffset + 26), localExtraLen = buffer.readUInt16LE(localOffset + 28);
      const start = localOffset + 30 + localNameLen + localExtraLen;
      const compressed = buffer.subarray(start, start + compressedSize);
      const xml = method === 0 ? compressed.toString('utf8') : method === 8 ? zlib.inflateRawSync(compressed).toString('utf8') : '';
      if (!xml) throw new Error('This DOCX compression format is not supported. Please export it as PDF or TXT.');
      return xml.replace(/<w:tab\b[^>]*\/>/g,'\t').replace(/<w:br\b[^>]*\/>/g,'\n').replace(/<\/w:p>/g,'\n').replace(/<[^>]+>/g,' ').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/\s+/g,' ').trim();
    }
    cursor += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error('Could not read text from this DOCX file. Please export it as PDF or TXT.');
}
function dataUrlParts(value) { const m = /^data:([^;]+);base64,([A-Za-z0-9+/=]+)$/.exec(value || ''); if (!m) throw new Error('The attachment could not be read. Please upload it again.'); return { mime:m[1], buffer:Buffer.from(m[2], 'base64') }; }
const SEARCH_STOPWORDS = new Set('the a an and or of to in on for is are was were be by with as at it this that from what why how when which who does do can could would should about into your you me my we our their there than then so if not no yes explain tell give make help please'.split(' '));
function searchTerms(text) { return new Set((String(text || '').toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []).filter(word => !SEARCH_STOPWORDS.has(word))); }
function selectTutorHistory(history, prompt, options = {}) {
  const messages = (Array.isArray(history) ? history : []).filter(m => ['user','assistant'].includes(m?.role)).slice(-24).map(m => ({ role:m.role, content:String(m.content || '').trim() }));
  const maxMessages = options.maxMessages || 6, maxChars = options.maxChars || 7000, perMessage = options.perMessage || 1400;
  const recentCount = Math.min(options.recentCount || 4, maxMessages, messages.length), selected = new Set();
  for (let i = messages.length - recentCount; i < messages.length; i++) selected.add(i);
  const queryTerms = searchTerms(prompt), candidates = [];
  if (queryTerms.size) for (let i = 0; i < messages.length - recentCount; i++) {
    const terms = searchTerms(messages[i].content); let overlap = 0;
    for (const term of queryTerms) if (terms.has(term)) overlap++;
    if (overlap) candidates.push({ i, score:overlap / Math.sqrt(queryTerms.size) + i / Math.max(1, messages.length) * 0.05 });
  }
  candidates.sort((a,b) => b.score - a.score || b.i - a.i);
  for (const item of candidates) { if (selected.size >= maxMessages) break; selected.add(item.i); }
  let remaining = maxChars;
  const result = [];
  for (const i of [...selected].sort((a,b) => b-a)) {
    const content = messages[i].content.slice(0, Math.min(perMessage, remaining));
    remaining -= content.length;
    if (content) result.push({ role:messages[i].role, content });
  }
  return result.reverse();
}
function relevantExcerpts(text, prompt, options = {}) {
  const maxChunk = options.maxChunk || 1200, maxChars = options.maxChars || 6000, maxChunks = options.maxChunks || 5;
  const pieces = String(text || '').replace(/\r/g,'').split(/(?<=[.!?])\s+|\n+/).map(s => s.trim()).filter(Boolean), chunks = [];
  let current = '';
  for (const piece of pieces) {
    if (piece.length > maxChunk) {
      if (current) { chunks.push(current); current = ''; }
      for (let i = 0; i < piece.length; i += maxChunk - 120) chunks.push(piece.slice(i, i + maxChunk));
    } else if (!current || current.length + piece.length + 1 <= maxChunk) current += (current ? ' ' : '') + piece;
    else { chunks.push(current); current = piece; }
  }
  if (current) chunks.push(current);
  const terms = searchTerms(prompt);
  const ranked = chunks.map((content,index) => {
    const words = searchTerms(content); let hits = 0;
    for (const word of terms) if (words.has(word)) hits++;
    return { content,index,score:terms.size ? hits / Math.sqrt(terms.size) : 0 };
  }).sort((a,b) => b.score - a.score || a.index - b.index);
  const selected = []; let used = 0;
  for (const item of ranked) {
    if (selected.length >= maxChunks) break;
    if (used + item.content.length > maxChars) continue;
    selected.push(item); used += item.content.length;
  }
  return selected.sort((a,b) => a.index - b.index).map((item,i) => `[Excerpt ${i+1}] ${item.content}`).join('\n\n');
}
function logOpenAiUsage(route, model, result) {
  const usage = result?.usage;
  if (!usage) return;
  console.info(JSON.stringify({ event:'recalro_openai_usage', route, model, request_id:result.id || null, input_tokens:usage.input_tokens || 0, output_tokens:usage.output_tokens || 0, cached_input_tokens:usage.input_tokens_details?.cached_tokens || 0 }));
}

async function handleRequest(req, res) {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/config') {
      const config = supabaseConfig();
      return json(res, 200, { supabaseUrl:config.url, supabaseKey:config.key });
    }
    if (req.method === 'GET' && url.pathname === '/api/health') {
      const config = supabaseConfig();
      return json(res, 200, { ok:true, aiConfigured:/^sk-/.test(process.env.OPENAI_API_KEY?.trim() || ''), supabaseConfigured:Boolean(config.url && config.key) });
    }
    if (req.method === 'GET' && url.pathname === '/api/institutions') {
      const q = String(url.searchParams.get('q') || '').trim().replace(/[+\-=!(){}\[\]^"~*?:\\/|<>]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
      const country = String(url.searchParams.get('country') || '').trim().slice(0, 60);
      if (q.length < 3) return json(res, 200, { items:[] });
      const key = `${country.toLowerCase()}:${q.toLowerCase()}`;
      const cached = institutionCache.get(key);
      if (cached && cached.until > Date.now()) return json(res, 200, { items:cached.items });
      const upstream = new URL('https://api.ror.org/v2/organizations');
      upstream.searchParams.set('query', q);
      const code = COUNTRY_CODES[country];
      if (code) upstream.searchParams.set('filter', `types:education,country.country_code:${code}`);
      else if (country && country !== 'Other' && /^[\p{L} .'-]+$/u.test(country)) upstream.searchParams.set('filter', `types:education,country.country_name:${country}`);
      else upstream.searchParams.set('filter', 'types:education');
      let response;
      try { response = await fetch(upstream, { headers:{ Accept:'application/json' }, signal:AbortSignal.timeout(5000) }); }
      catch { return json(res, 503, { error:'School search is temporarily unavailable. Enter your institution manually.' }); }
      if (!response.ok) return json(res, 503, { error:'School search is temporarily unavailable. Enter your institution manually.' });
      const data = await response.json();
      const items = (Array.isArray(data.items) ? data.items : []).map(item => ({
        id:item.id,
        name:item.names?.find(n => n.types?.includes('ror_display'))?.value || item.names?.find(n => n.types?.includes('label'))?.value || '',
        country:item.locations?.[0]?.geonames_details?.country_name || ''
      })).filter(item => item.name).slice(0, 15);
      if (institutionCache.size > 150) institutionCache.clear();
      institutionCache.set(key, { items, until:Date.now() + 5*60*1000 });
      return json(res, 200, { items });
    }
    if (req.method === 'POST' && url.pathname === '/api/tutor') {
      if (!requireKey(res)) return;
      if (!await requireSupabaseUser(req, res)) return;
      const body = await readBody(req);
      const subject = String(body.subject || 'your subject').slice(0,120);
      const modePrompts = { ask:'Answer clearly and conversationally.', simple:'Explain in plain, beginner-friendly language. Define unfamiliar terms and use a relatable everyday example.', notes:'Use the supplied study material as the primary source. Distinguish what the material says from any extra explanation.', summary:'Create a well-organized, concise summary with key ideas, definitions and takeaways.', quiz:'Act as an active-recall tutor. Ask one question at a time and wait for the student to answer; do not reveal the answer immediately.', steps:'Break the solution into numbered steps, show reasoning and check units or assumptions where relevant.' };
      const message = String(body.message || 'Please help me study.').slice(0,12000);
      const instructions = `You are Recalro, a careful and encouraging academic tutor. The student's selected subject is ${subject}. ${modePrompts[body.mode] || modePrompts.ask} Give the shortest complete answer that meets the learning mode; add detail whenever the learner asks or the problem requires it. Adapt examples to the student's discipline; do not assume engineering. Explain accurately, show required calculation steps, and never invent facts, citations, or claims about uploaded documents. If a question is ambiguous, state your assumption. If the uploaded material does not answer it, say so and label any general knowledge. Use readable Markdown and LaTeX for equations. Help the student learn rather than simply doing graded work for them.`;
      const input = selectTutorHistory(body.history, message).map(m => ({ role:m.role, content:m.content }));
      const content = [{ type:'input_text', text:message }];
      if (body.attachment?.data) {
        const a = body.attachment, parts = dataUrlParts(a.data);
        if (parts.buffer.length > 12*1024*1024) return json(res,413,{error:'Attachment exceeds the 12 MB limit.'});
        if (parts.mime.startsWith('image/')) content.push({ type:'input_image', image_url:a.data, detail:'high' });
        else if (parts.mime === 'application/pdf') content.push({ type:'input_file', filename:String(a.name || 'study-material.pdf'), file_data:a.data });
        else if (parts.mime.startsWith('text/') || /\.(txt|md)$/i.test(a.name || '')) {
          const fileName = String(a.name || 'study-material.txt').replace(/[\r\n]/g,' ').slice(0,120);
          const excerpts = relevantExcerpts(parts.buffer.toString('utf8').slice(0,50000), message);
          content.push({ type:'input_text', text:`\n\nRelevant excerpts from uploaded text (${fileName}):\n${excerpts}` });
        }
        else if (/\.docx$/i.test(a.name || '') || parts.mime.includes('wordprocessingml')) {
          const fileName = String(a.name || 'study-material.docx').replace(/[\r\n]/g,' ').slice(0,120);
          const excerpts = relevantExcerpts(extractDocxText(parts.buffer).slice(0,50000), message);
          content.push({ type:'input_text', text:`\n\nRelevant excerpts from uploaded DOCX (${fileName}):\n${excerpts}` });
        }
        else return json(res,415,{error:'Unsupported attachment. Use an image, PDF, TXT or Markdown file.'});
      }
      input.push({ role:'user', content });
      const model = process.env.OPENAI_TUTOR_MODEL || 'gpt-4.1-mini';
      const mode = ['ask','simple','notes','summary','quiz','steps'].includes(body.mode) ? body.mode : 'ask';
      const detailedRequest = /\b(detailed|in depth|in-depth|comprehensive|step by step|step-by-step|show your work|show all workings|full explanation)\b/i.test(message);
      const outputLimits = { ask:900, simple:900, notes:1200, summary:1200, quiz:700, steps:1800 };
      let outputLimit = detailedRequest ? 1800 : outputLimits[mode];
      const request = (maxOutputTokens) => openai('responses', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ model, instructions, input, max_output_tokens:maxOutputTokens }) });
      let result = await request(outputLimit);
      logOpenAiUsage('tutor', model, result);
      if (result.status === 'incomplete' && result.incomplete_details?.reason === 'max_output_tokens' && outputLimit < 1800) {
        outputLimit = 1800;
        result = await request(outputLimit);
        logOpenAiUsage('tutor_quality_retry', model, result);
      }
      const answer = result.output?.flatMap(o => o.content || []).filter(c => c.type === 'output_text').map(c => c.text).join('\n').trim();
      if (!answer) throw new Error('The AI returned an empty response. Please try again.');
      return json(res,200,{answer,follow:['Give me a practical example','Quiz me on this topic','Explain that in simpler terms']});
    }
    if (req.method === 'POST' && url.pathname === '/api/voice-session') {
      if (!requireKey(res)) return;
      const user = await requireSupabaseUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const sdp = String(body.sdp || '');
      if (!sdp.trim() || sdp.length > 64*1024) return json(res,400,{error:'A valid voice connection offer is required.'});
      const subject = String(body.subject || 'general learning').slice(0,120).replace(/[\r\n]/g,' ');
      const history = selectTutorHistory(body.history, '', { maxMessages:6, maxChars:6600, perMessage:1100, recentCount:6 }).map(m => `${m.role === 'assistant' ? 'Recalro' : 'Learner'}: ${m.content}`).join('\n');
      const instructions = `You are Recalro, a warm, accurate academic tutor in a natural spoken conversation. The learner is studying ${subject}. Keep each first response brief and conversational (usually 2–4 short sentences), then let the learner guide the depth. Use the language the learner speaks. Explain clearly, ask a helpful follow-up when useful, and preserve context across turns. Do not use Markdown, stage directions, or announce that you are an AI. Never invent facts or claim to have searched the web. If an idea is uncertain, say so plainly.${history ? `\\n\\nRecent conversation for context:\\n${history}` : ''}`;
      const session = {
        type:'realtime',
        model:process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1-mini',
        instructions,
        audio:{
          input:{
            noise_reduction:{type:'near_field'},
            transcription:{model:'gpt-realtime-whisper'},
            turn_detection:{type:'server_vad',threshold:0.45,prefix_padding_ms:300,silence_duration_ms:500,create_response:true,interrupt_response:true}
          },
          output:{voice:process.env.OPENAI_REALTIME_VOICE || 'marin'}
        }
      };
      const form = new FormData(); form.set('sdp',sdp); form.set('session',JSON.stringify(session));
      const safetyId = crypto.createHash('sha256').update(String(user.id)).digest('hex');
      const upstream = await fetch('https://api.openai.com/v1/realtime/calls',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'OpenAI-Safety-Identifier':safetyId},body:form,signal:AbortSignal.timeout(30000)});
      const answer = await upstream.text();
      if (!upstream.ok) {
        let message = 'Realtime voice could not start. Check the OpenAI API configuration and try again.';
        try { message = JSON.parse(answer).error?.message || message; } catch { if (answer.trim()) message = answer.trim().slice(0,300); }
        return json(res,502,{error:message});
      }
      res.writeHead(200,{'Content-Type':'application/sdp','Cache-Control':'no-store'});
      return res.end(answer);
    }
    if (req.method === 'POST' && url.pathname === '/api/voice-usage') {
      const user = await requireSupabaseUser(req, res);
      if (!user) return;
      const body = await readBody(req);
      const source = body.usage && typeof body.usage === 'object' ? body.usage : {};
      const fields = ['responses','total_tokens','input_tokens','output_tokens','input_text_tokens','input_audio_tokens','input_image_tokens','cached_input_tokens','output_text_tokens','output_audio_tokens'];
      const usage = Object.fromEntries(fields.map(field => {
        const value = Number(source[field]);
        return [field, Number.isSafeInteger(value) && value >= 0 ? Math.min(value, 100000000) : 0];
      }));
      if (!usage.responses || !usage.input_tokens && !usage.output_tokens && !usage.total_tokens) return json(res,400,{error:'No Realtime token usage was provided.'});
      console.info(JSON.stringify({ event:'recalro_openai_usage', route:'realtime_voice', model:process.env.OPENAI_REALTIME_MODEL || 'gpt-realtime-2.1-mini', ...usage }));
      return json(res,200,{ok:true});
    }
    if (req.method === 'POST' && url.pathname === '/api/transcribe') {
      if (!requireKey(res)) return;
      if (!await requireSupabaseUser(req, res)) return;
      const body = await readBody(req); const audio = Buffer.from(String(body.audio || ''),'base64');
      if (!audio.length || audio.length > 12*1024*1024) return json(res,400,{error:'Audio is empty or exceeds the upload limit.'});
      const mime = String(body.mimeType || 'audio/webm').split(';')[0]; const ext = mime.includes('mp4') ? 'm4a' : mime.includes('ogg') ? 'ogg' : mime.includes('wav') ? 'wav' : 'webm';
      const form = new FormData(); form.append('file', new Blob([audio],{type:mime}),`voice.${ext}`); form.append('model',process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe');
      const result = await openai('audio/transcriptions',{method:'POST',body:form});
      return json(res,200,{text:result.text || ''});
    }
    if (req.method === 'POST' && url.pathname === '/api/speech') {
      if (!requireKey(res)) return;
      if (!await requireSupabaseUser(req, res)) return;
      const body = await readBody(req); const text = String(body.text || '').slice(0,4000);
      if (!text.trim()) return json(res,400,{error:'There is no text to read aloud.'});
      const speech = await fetch('https://api.openai.com/v1/audio/speech',{method:'POST',headers:{Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,'Content-Type':'application/json'},body:JSON.stringify({model:process.env.OPENAI_TTS_MODEL || 'gpt-4o-mini-tts',voice:'alloy',input:text,response_format:'mp3'})});
      if (!speech.ok) { const e=await speech.json().catch(()=>({})); throw new Error(e.error?.message || `Speech request failed (${speech.status}).`); }
      const audio = Buffer.from(await speech.arrayBuffer()); res.writeHead(200,{'Content-Type':'audio/mpeg','Content-Length':audio.length,'Cache-Control':'no-store'}); return res.end(audio);
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return json(res,405,{error:'Method not allowed.'});
    let pathname = decodeURIComponent(url.pathname);
    if (pathname === '/') pathname = '/index.html';
    if (pathname.split('/').some(part => part.startsWith('.')) || pathname === '/supabase' || pathname.startsWith('/supabase/')) return json(res,403,{error:'Forbidden'});
    const filePath = path.resolve(PUBLIC_DIR, `.${pathname}`);
    if (!filePath.startsWith(PUBLIC_DIR + path.sep)) return json(res,403,{error:'Forbidden'});
    fs.stat(filePath,(err,stat)=>{
      if (err || !stat.isFile()) { res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'}); return res.end('Not found'); }
      const ext=path.extname(filePath).toLowerCase(); const type=MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200,{'Content-Type':type,'Content-Length':stat.size,'X-Content-Type-Options':'nosniff'});
      if(req.method==='HEAD') return res.end(); fs.createReadStream(filePath).pipe(res);
    });
  } catch (err) { console.error(err); if (!res.headersSent) json(res,err.status || 500,{error:err.message || 'Unexpected server error.'}); }
}

module.exports = handleRequest;
if (require.main === module) {
  http.createServer(handleRequest).listen(PORT,()=>console.log(`Recalro running at http://localhost:${PORT}/`));
}

