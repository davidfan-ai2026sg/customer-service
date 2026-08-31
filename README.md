# 味源食品客服订货工作台

演示无需第三方凭证。

给食品厂客服用的网页工作台：会话、目录、订单、发给工厂。
## 本地运行

需要 Node.js 18+。在本目录先安装依赖，再启动开发服务器。
打开 http://localhost:3000

生产构建使用 build 与 start 脚本。
可选复制环境变量示例文件。
## 如何演示

1. 打开首页会话，右侧是客户模拟器。
2. 询问：生抽多少钱？
3. 下单：我要下单，味源特级生抽，48，没有，配送，再填姓名电话地址，最后确认。
4. 打开订单页，应出现待确认新单。
5. 详情页点发给工厂，可复制或打印生产通知单。
6. 接管会话后机器人暂停，可人工回复。

## 测试

使用 test 脚本跑查价到下单的快乐路径。
浏览器测试使用 test:e2e，需应用已在 3000 端口。
## 页面

- / 会话收件箱与客户模拟器
- /orders 订单列表
- /orders/编号 订单详情与发给工厂
- /orders/编号/print 打印生产通知单
- /catalog 商品目录
- /settings 公司设置

相关接口位于 /api 下：会话、模拟聊天、商品、订单、设置、即时通讯回调、健康检查。

SQLite 默认文件 data/app.db，可用 DATABASE_PATH 覆盖。首次启动写入食品公司演示目录。
## 连接官方 Cloud API（可选）

未填写即时通讯相关环境变量时，真实通道关闭，模拟器仍可用。

若要接入官方云接口：
1. 在 Meta 开发者后台创建应用并取得令牌、号码 ID、App Secret。
2. 将本应用以 HTTPS 公网地址暴露（部署或本地隧道均可）。
3. 回调路径为 /api/whatsapp/webhook ，验证令牌与 WHATSAPP_VERIFY_TOKEN 一致，订阅 messages。
4. 在环境变量中填写 WHATSAPP_TOKEN、WHATSAPP_PHONE_NUMBER_ID、WHATSAPP_VERIFY_TOKEN、WHATSAPP_APP_SECRET、PUBLIC_APP_URL。

不使用任何非官方网页协议库。

## 可选邮件与语言模型

发给工厂：配置 RESEND_API_KEY 或 SMTP_* 。都不配时仍生成通知单，只是不发信。
语言模型：OPENAI_API_KEY 仅用于润色措辞，不得改价格数量单号。无密钥时用目录关键词匹配。

全部键名见 .env.example。
