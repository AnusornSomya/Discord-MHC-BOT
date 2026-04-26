# discord-bot-Mode.[H]ardCore

บอท Discord สำหรับรันเอง มีระบบ:
- แจ้งเตือนคนเข้า
- แจ้งเตือนคนออก
- ระบบเลเวล
- ระบบยืนยันตัวตน กรอก ชื่อ / อายุ / ชื่อในเกมส์
- ระบบสร้างลิงก์เชิญบอทเข้า Discord
- Panel ปุ่มควบคุม

## วิธีติดตั้ง

```bash
npm install
```

## ตั้งค่า

คัดลอก `config.example.json` เป็น `config.json` แล้วกรอกค่าของบอท

```json
{
  "token": "ใส่ TOKEN บอท",
  "clientId": "ใส่ Application ID",
  "guildId": "ใส่ Server ID",
  "welcomeChannelId": "",
  "leaveChannelId": "",
  "verifiedRoleId": "",
  "adminRoleId": ""
}
```

ถ้าไม่ใส่ `welcomeChannelId` หรือ `leaveChannelId` บอทจะส่งแจ้งเตือนในห้องแรกที่บอทส่งข้อความได้

## สร้างลิงก์เชิญบอท

```bash
npm run invite
```

หรือใช้ลิงก์นี้ แล้วเปลี่ยน CLIENT_ID:

```txt
https://discord.com/oauth2/authorize?client_id=CLIENT_ID&permissions=8&integration_type=0&scope=bot+applications.commands
```

## รันบอท

```bash
npm start
```

## คำสั่งใน Discord

```txt
!panel
```

ใช้เพื่อเปิดหน้าเมนูระบบ

## หมายเหตุ

ต้องเปิด Intents ใน Discord Developer Portal:
- SERVER MEMBERS INTENT
- MESSAGE CONTENT INTENT

ไปที่:
Developer Portal > Applications > Bot > Privileged Gateway Intents
