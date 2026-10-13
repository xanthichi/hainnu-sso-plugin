# 更新日志

## 1.1.0 - 2026-10-13

### 修复

- 修复账号密码登录时因 CAS OAuth2.0 跳转链过长导致的“跳转次数超过上限”。
- 将 CAS 登录与 OAuth 授权拆分：先完成统一认证登录，再完成 OAuth 票据交换与教务回调。
- 使用 `authScope` 固定第一段 OAuth 的 `callbackAuthorize` 范围，避免提前消耗授权 code。
- 统一认证登录请求补齐同源 Referer，适配学校登录页校验。

### 验证

- 真实账号密码链路已验证 CAS 登录、OAuth 回调、教务会话建立与学号/姓名读取。
- `check`、`test`、`pack`、`source-zip` 全部通过，共 10 个脱敏测试场景。
