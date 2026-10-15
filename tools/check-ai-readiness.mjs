import fs from 'node:fs/promises';
// Local configuration inspection only. Never print values or contact a provider.
const raw=await fs.readFile('.env.local','utf8').catch(()=>''),env={};
for(const line of raw.split(/\r?\n/)){const match=line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/);if(match)env[match[1]]=match[2].trim().replace(/^['"]|['"]$/g,'');}
const checks=[
  ['서버용 OpenAI 키 설정',/^sk-/.test(env.OPENAI_API_KEY||'')],
  ['Supabase URL 설정',/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.SUPABASE_URL||'')],
  ['Supabase 비밀 키 설정',/^sb_secret_/.test(env.SUPABASE_SECRET_KEY||'')||/^eyJ/.test(env.SUPABASE_SECRET_KEY||'')],
  ['일일 작업 제한',Number(env.AI_DAILY_LIMIT||30)>0&&Number(env.AI_DAILY_LIMIT||30)<=30],
  ['세션 시간당 제한',Number(env.AI_SESSION_HOURLY_LIMIT||5)>0&&Number(env.AI_SESSION_HOURLY_LIMIT||5)<=5],
];
for(const [label,ok] of checks)console.log(`${ok?'OK':'확인 필요'} · ${label}`);
console.log(`AI 호출 스위치: ${env.OPENAI_ENABLED==='true'?'활성':'꺼짐 (무료 테스트 가능)'}`);
console.log('이 검사는 외부 요청·이미지 생성·DB 쓰기를 수행하지 않습니다. 계정 잔액, 모델 권한, 실제 응답 품질은 확인하지 않습니다.');
if(Object.keys(env).some(key=>key.startsWith('NEXT_PUBLIC_')&&/(OPENAI|SECRET|SERVICE_ROLE)/.test(key))){console.error('확인 필요 · 브라우저 공개 변수에 서버 비밀 키 이름이 있습니다.');process.exitCode=1;}
if(checks.some(([,ok])=>!ok))process.exitCode=1;
