# 海南师范大学统一认证

海南师范大学正方教务的 API 3 登录扩展，继承 `builtin.zf`。教务入口为 `https://zfjw.hainnu.edu.cn/jwglxt`，通过学校 CAS OAuth2.0 授权（`https://auth.hainnu.edu.cn:9443/cas/oauth2.0/authorize`）取得教务会话。

支持账号密码登录、会话验证。统一认证登录页当前无验证码，密码按表单原文提交；遇到需要网页验证（如企业微信扫码或二次确认）时转入 App 内网页验证，返回后校验登录账号。课表、成绩、考试与选课接口由内置正方适配提供，具体可用性取决于学校开放情况。

## 登录流程

1. GET CAS 登录页，读取 `execution`。
2. POST 用户名、密码与 `execution`、`_eventId=submit`、`geolocation` 完成统一认证；这一步不携带 OAuth service，避免登录后立即跟随过长的授权回调链。
3. 第一次 GET CAS OAuth2.0 authorize 用 `authScope` 固定到 CAS `callbackAuthorize` 票据交换；在教务回调前停下。第二次 authorize 会直接进入教务回调并完成教务会话。
4. 访问 `/jwglxt/xtgl/index_cxYhxxIndex.html` 校验学号与姓名，必要时回退到主菜单页读取。

## 安装

在 App 的"插件中心 → 更多 → 导入、回滚与开发工具"导入 `.eduplugin` 开发包；或在登录页搜索"海南师范大学"选择本适配。

## 验证

本地测试覆盖 OAuth 授权登录、已有会话复用、会话失效、账号不一致、表单变化和错误响应。测试数据均为合成账号；包与源码不包含实际登录凭据。

```sh
node cli/index.mjs check hainnu-sso
node cli/index.mjs test hainnu-sso
node cli/index.mjs pack hainnu-sso
node cli/index.mjs source-zip hainnu-sso
```
