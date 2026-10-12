# 海南师范大学统一认证

海南师范大学正方教务的 API 3 登录扩展，继承 `builtin.zf`。教务入口为 `https://zfjw.hainnu.edu.cn/jwglxt`，通过学校统一身份认证（`https://auth.hainnu.edu.cn:9443/cas/login`）取得教务会话。

支持账号密码登录、会话验证。统一认证登录页当前无验证码，密码按表单原文提交；遇到需要网页验证（如企业微信扫码或二次确认）时转入 App 内网页验证，返回后校验登录账号。课表、成绩、考试与选课接口由内置正方适配提供，具体可用性取决于学校开放情况。

## 登录流程

1. GET 统一认证登录页（service 指向教务 ticket 入口 `/jwglxt/xtgl/login_sso.html`），读取本次 `execution`。
2. POST 用户名、密码与 `execution`、`_eventId=submit`、`geolocation` 到登录页。
3. CAS 跳转教务 ticket 入口验证并建立教务会话。
4. 访问 `/jwglxt/xtgl/index_cxYhxxIndex.html` 校验学号与姓名，必要时回退到主菜单页读取。

## 安装

在 App 的“插件中心 → 更多 → 导入、回滚与开发工具”导入 `.eduplugin` 开发包；或在登录页搜索“海南师范大学”选择本适配。

## 验证

本地测试覆盖 CAS 明文表单登录、已有会话复用、会话失效、账号不一致、表单变化和错误响应。测试数据均为合成账号；包与源码不包含实际登录凭据。

```sh
node cli/index.mjs check hainnu-sso
node cli/index.mjs test hainnu-sso
node cli/index.mjs pack hainnu-sso
node cli/index.mjs source-zip hainnu-sso
```

真实设备与海南师范大学登录尚未实测；CAS service 白名单是否接受 `login_sso.html` 回调需在设备上确认。