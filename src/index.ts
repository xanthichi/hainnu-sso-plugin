import type {AcademicPlugin, AuthState, ErrorCode, HostSdk, Result} from '../../../sdk/index';

const origin = 'https://zfjw.hainnu.edu.cn';
const base = origin + '/jwglxt';
const casHost = 'https://auth.hainnu.edu.cn:9443';
const clientId = 'afc636ed721044c09a8380492f355164';
const serviceCallback = origin + '/sso/hnsflogin';
const entry = casHost + '/cas/oauth2.0/authorize?response_type=code&client_id=' + clientId + '&redirect_uri=' + encodeURIComponent(serviceCallback);
const completion = base + '/xtgl/index_initMenu.html';
const ok = <T>(data: T): Result<T> => ({ok: true, data});
function fail(code: ErrorCode, message: string): never { throw Object.assign(new Error(message), {code}); }
function exactPage(url: string, page: string) { return url === page || url.startsWith(page + '?') || url.startsWith(page + ';'); }
function onCas(url: string) { return url.startsWith(casHost + '/cas/'); }
interface Pending {id: string; expires: number}

async function pending(s: HostSdk, id: string): Promise<Pending> {
  const saved = await s.state.get<Pending>('pending');
  if (!saved || saved.id !== id || saved.expires < Date.now()) {
    await s.state.remove('pending'); fail('SESSION_EXPIRED', '海南师范大学登录验证已过期，请重新登录');
  }
  return saved;
}
function webResult(p: Pending): Result<AuthState> {
  return ok({status: 'webLogin', continuationId: p.id, url: entry, completionUrl: completion});
}
async function web(s: HostSdk): Promise<Result<AuthState>> {
  const p = {id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2), expires: Date.now() + 20 * 60_000};
  await s.state.set('pending', p); return webResult(p);
}
function identity(html: string, s: HostSdk) {
  if (s.html.select(html, '#loginForm,input[name=mm],input[name=password]').length) return {studentId: '', studentName: ''};
  const value = (selector: string) => {
    const node = s.html.select(html, selector)[0];
    return (node?.attributes.value || node?.text || '').replace(/\s+/g, ' ').trim();
  };
  return {studentId: value('#sessionUserKey,input[name=xh],#studentId'),
    studentName: value('input[name=xm],.media-heading,#xhxm').replace(/(?:同学|学生|教师|老师)$/, '').trim()};
}
async function validate(s: HostSdk): Promise<Result<AuthState>> {
  const profileUrl = base + '/xtgl/index_cxYhxxIndex.html?gnmkdm=index';
  const profile = await s.http({url: profileUrl, purpose: 'query', charset: 'UTF-8'});
  if (profile.status >= 500) fail('NETWORK_RETRYABLE', '海南师范大学教务暂时不可用，请稍后重试');
  if (profile.status !== 200 || !exactPage(profile.url, profileUrl.split('?')[0])) fail('SESSION_EXPIRED', '海南师范大学教务会话失效，请重新登录');
  let info = identity(profile.body, s);
  if (!info.studentId || !info.studentName) {
    const menu = await s.http({url: completion, purpose: 'query', charset: 'UTF-8'});
    if (menu.status >= 500) fail('NETWORK_RETRYABLE', '海南师范大学教务暂时不可用，请稍后重试');
    if (menu.status === 200 && exactPage(menu.url, completion)) {
      const fallback = identity(menu.body, s);
      info = {studentId: info.studentId || fallback.studentId, studentName: info.studentName || fallback.studentName};
    }
  }
  if (!info.studentId || !info.studentName) fail('SESSION_EXPIRED', '尚未取得海南师范大学教务身份，请完成学校登录');
  const account = await s.state.get<string>('account');
  if (account && info.studentId !== account) fail('INVALID_CREDENTIALS', '网页登录账号与当前账号不一致，请使用当前账号登录');
  await s.state.remove('pending');
  return ok({status: 'authenticated', ...info});
}

export default {
  auth: {
    start: async (args, _context, s) => {
      const username = args.username.trim();
      if (!username || !args.password) fail('INVALID_CREDENTIALS', '请输入海南师范大学统一认证账号和密码');
      await s.state.remove('pending'); await s.state.set('account', username);
      const page = await s.http({url: entry, purpose: 'auth', charset: 'UTF-8'});
      if (page.status >= 500) fail('NETWORK_RETRYABLE', '海南师范大学统一认证暂时不可用，请稍后重试');
      if (page.url.startsWith(origin + '/')) return validate(s);
      if (!onCas(page.url)) fail('PAGE_CHANGED', '海南师范大学统一认证入口发生变化');
      const form = s.html.form(page.body, 'form');
      if (!form.execution || !form._eventId) fail('PAGE_CHANGED', '海南师范大学统一认证表单发生变化');
      if (s.html.select(page.body, 'input[name=captcha],input[name=rand],input[name=code]').length) return web(s);
      // No password, encryption payload or CAS ticket is retained in plugin state.
      const response = await s.http({url: page.url, method: 'POST', purpose: 'auth', charset: 'UTF-8',
        form: {username, password: args.password, execution: form.execution, _eventId: form._eventId, geolocation: ''}});
      if (response.status >= 500) fail('NETWORK_RETRYABLE', '海南师范大学统一认证暂时不可用，请稍后重试');
      if (onCas(response.url)) {
        const error = s.html.select(response.body, '#errormsg,#msg,.errors').map(n => n.text).join('').trim();
        if (/验证码|二次|动态码|扫码/.test(error)) return web(s);
        if (error || response.status === 401) fail('INVALID_CREDENTIALS', '海南师范大学统一认证未通过，请检查账号和密码');
        return web(s);
      }
      if (!response.url.startsWith(origin + '/')) fail('PAGE_CHANGED', '海南师范大学统一认证未完成教务跳转');
      return validate(s);
    },
    resume: async (args, _context, s) => {
      await pending(s, args.continuationId);
      if (!args.webLoginCompleted) fail('WEB_LOGIN_REQUIRED', '请先在海南师范大学网页完成登录');
      return validate(s);
    },
    refreshCaptcha: async (args, _context, s) => webResult(await pending(s, args.continuationId)),
    validate: (_args, _context, s) => validate(s),
  },
} satisfies AcademicPlugin;