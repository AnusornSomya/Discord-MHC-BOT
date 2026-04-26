require("dotenv").config();

const fs = require("fs");
const path = require("path");
const {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  PermissionFlagsBits,
  ChannelSelectMenuBuilder,
  RoleSelectMenuBuilder,
  StringSelectMenuBuilder,
  ChannelType
} = require("discord.js");

const config = require("./config.json");

const TOKEN = process.env.BOT_TOKEN || config.token;
const CLIENT_ID = process.env.CLIENT_ID || config.clientId;

const DATA_DIR = path.join(__dirname, "data");
const SETTINGS_FILE = path.join(DATA_DIR, "settings.json");
const USERS_FILE = path.join(DATA_DIR, "users.json");

const LEVEL_SECONDS_PER_LEVEL = 10 * 60;
const VOICE_TICK_MS = 60 * 1000;
const MAX_LEVEL = 10000;
const HIGH_LEVEL_START = 1000;
const HIGH_LEVEL_TARGET_DAYS = 180;
const HIGH_LEVEL_TARGET_SECONDS = HIGH_LEVEL_TARGET_DAYS * 24 * 60 * 60;
const HIGH_LEVEL_STEP_SECONDS = HIGH_LEVEL_TARGET_SECONDS / (MAX_LEVEL - HIGH_LEVEL_START);
const HIGH_LEVEL_ROLE_INTERVAL = 500;
const HIGH_LEVEL_ROLE_START = HIGH_LEVEL_START + HIGH_LEVEL_ROLE_INTERVAL;
const LEVEL_TIME_BRACKETS = [
  { minLevel: 1, maxLevel: 10, multiplier: 1, label: "Lv.1-10" },
  { minLevel: 11, maxLevel: 100, multiplier: 1.5, label: "Lv.11-100" },
  { minLevel: 101, maxLevel: 250, multiplier: 2, label: "Lv.101-250" },
  { minLevel: 251, maxLevel: 500, multiplier: 3, label: "Lv.251-500" },
  { minLevel: 501, maxLevel: 999, multiplier: 4.5, label: "Lv.501-999" },
  { minLevel: HIGH_LEVEL_START, maxLevel: MAX_LEVEL, fixedSeconds: HIGH_LEVEL_STEP_SECONDS, label: "Lv.1000-10000" }
];
const levelCurveCache = new Map();

const DEFAULT_GUILD_SETTINGS = {
  welcome: true,
  leave: true,
  level: true,
  verify: true,
  registrationRoleId: null,
  welcomeChannelId: null,
  leaveChannelId: null,
  levelUpChannelId: null,
  panelChannelId: null,
  voiceNotify: {
    enabled: true,
    logChannelId: null
  },
  levelSystem: {
    secondsPerLevel: LEVEL_SECONDS_PER_LEVEL,
    rankRoles: {},
    topLeaderRoleId: null,
    topLeaderUserId: null
  }
};

const DEFAULT_USER = {
  level: 1,
  xp: 0,
  voiceSeconds: 0,
  verified: false,
  name: "",
  age: "",
  gameName: "",
  verifiedAt: null
};

const LEGACY_LEVEL_ROLE_DEFINITIONS = [
  { level: 10, name: "[Lv.10] Rookie Raider", color: 0x95a5a6 },
  { level: 20, name: "[Lv.20] Iron Vanguard", color: 0x7f8c8d },
  { level: 30, name: "[Lv.30] Steel Reaper", color: 0x5d6d7e },
  { level: 40, name: "[Lv.40] Storm Hunter", color: 0x3498db },
  { level: 50, name: "[Lv.50] Shadow Striker", color: 0x34495e },
  { level: 60, name: "[Lv.60] Crimson Wolf", color: 0xe74c3c },
  { level: 70, name: "[Lv.70] Night Predator", color: 0x2c3e50 },
  { level: 80, name: "[Lv.80] Frost Warden", color: 0x5dade2 },
  { level: 90, name: "[Lv.90] Thunder Fang", color: 0xf1c40f },
  { level: 100, name: "[Lv.100] Hardcore Elite", color: 0xf39c12 },
  { level: 150, name: "[Lv.150] Ashen Commander", color: 0xd35400 },
  { level: 200, name: "[Lv.200] Phantom Captain", color: 0x8e44ad },
  { level: 250, name: "[Lv.250] Obsidian Knight", color: 0x2d3436 },
  { level: 300, name: "[Lv.300] Venom General", color: 0x16a085 },
  { level: 350, name: "[Lv.350] Abyss Walker", color: 0x1f618d },
  { level: 400, name: "[Lv.400] Inferno Marshal", color: 0xc0392b },
  { level: 450, name: "[Lv.450] Void Dominator", color: 0x6c3483 },
  { level: 500, name: "[Lv.500] Eclipse Lord", color: 0x17202a },
  { level: 550, name: "[Lv.550] Hellfire Baron", color: 0x922b21 },
  { level: 600, name: "[Lv.600] Titan Overlord", color: 0xba4a00 },
  { level: 650, name: "[Lv.650] Omega Slayer", color: 0x1abc9c },
  { level: 700, name: "[Lv.700] Chaos Sovereign", color: 0x2874a6 },
  { level: 750, name: "[Lv.750] Celestial Tyrant", color: 0x7d3c98 },
  { level: 800, name: "[Lv.800] Eternal Monarch", color: 0xb9770e },
  { level: 850, name: "[Lv.850] Doom Emperor", color: 0x943126 },
  { level: 900, name: "[Lv.900] Rift Conqueror", color: 0x117864 },
  { level: 950, name: "[Lv.950] Mythic Apex", color: 0x154360 },
  { level: 1000, name: "[Lv.1000] Hardcore Legend", color: 0xf4d03f }
];
const HIGH_LEVEL_ROLE_TITLES = [
  "Abyss Warlord",
  "Titan Revenant",
  "Chaos Tyrant",
  "Rift Emperor",
  "Mythic Overlord",
  "Void Sovereign",
  "Inferno Archon",
  "Celestial Dominator",
  "Doom Harbinger",
  "Omega Monarch",
  "Nightfall Regent",
  "Stormbreaker Prime",
  "Ashen Paragon",
  "Oblivion Herald",
  "Eternal Conqueror",
  "Phantom Exarch",
  "Crimson Apex",
  "Hardcore Immortal"
];
const HIGH_LEVEL_ROLE_COLORS = [
  0x1f618d,
  0xba4a00,
  0x2874a6,
  0x117864,
  0x6c3483,
  0x2d3436,
  0xc0392b,
  0x7d3c98,
  0x943126,
  0x1abc9c,
  0x2c3e50,
  0x3498db,
  0xd35400,
  0x154360,
  0xb9770e,
  0x8e44ad,
  0xe74c3c,
  0xffd700
];
const HIGH_LEVEL_ROLE_DEFINITIONS = HIGH_LEVEL_ROLE_TITLES.map((title, index) => {
  const level = HIGH_LEVEL_ROLE_START + (index * HIGH_LEVEL_ROLE_INTERVAL);
  return {
    level,
    name: `[Lv.${level}] ${title}`,
    color: HIGH_LEVEL_ROLE_COLORS[index % HIGH_LEVEL_ROLE_COLORS.length]
  };
});
const LEVEL_ROLE_DEFINITIONS = [
  ...LEGACY_LEVEL_ROLE_DEFINITIONS,
  ...HIGH_LEVEL_ROLE_DEFINITIONS
];
const TOP_LEVEL_ROLE_DEFINITION = {
  name: "[Top 1] Hardcore Crown",
  color: 0xffd700
};

function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function ensureFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(SETTINGS_FILE)) {
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify({ guilds: {} }, null, 2));
  }

  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify({ guilds: {} }, null, 2));
  }
}

function readJson(file, fallback) {
  try {
    ensureFiles();
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  ensureFiles();
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

function normalizeGuildSettings(settings = {}) {
  const rawSettings = settings || {};
  const hasWelcomeChannelId = hasOwn(rawSettings, "welcomeChannelId");
  const hasLeaveChannelId = hasOwn(rawSettings, "leaveChannelId");
  const merged = {
    ...DEFAULT_GUILD_SETTINGS,
    ...rawSettings,
    voiceNotify: {
      ...DEFAULT_GUILD_SETTINGS.voiceNotify,
      ...(rawSettings.voiceNotify || {})
    },
    levelSystem: {
      ...DEFAULT_GUILD_SETTINGS.levelSystem,
      ...(rawSettings.levelSystem || {})
    }
  };

  const secondsPerLevel = Number(merged.levelSystem.secondsPerLevel);
  merged.levelSystem.secondsPerLevel = Number.isFinite(secondsPerLevel) && secondsPerLevel > 0
    ? Math.floor(secondsPerLevel)
    : LEVEL_SECONDS_PER_LEVEL;

  merged.voiceNotify.logChannelId = merged.voiceNotify.logChannelId
    ? String(merged.voiceNotify.logChannelId)
    : null;

  merged.levelSystem.rankRoles = Object.entries(merged.levelSystem.rankRoles || {}).reduce((acc, [level, roleId]) => {
    if (roleId) {
      acc[String(level)] = String(roleId);
    }
    return acc;
  }, {});
  merged.levelSystem.topLeaderRoleId = merged.levelSystem.topLeaderRoleId
    ? String(merged.levelSystem.topLeaderRoleId)
    : null;
  merged.levelSystem.topLeaderUserId = merged.levelSystem.topLeaderUserId
    ? String(merged.levelSystem.topLeaderUserId)
    : null;

  merged.panelChannelId = merged.panelChannelId ? String(merged.panelChannelId) : null;
  merged.registrationRoleId = merged.registrationRoleId ? String(merged.registrationRoleId) : null;
  merged.welcomeChannelId = hasWelcomeChannelId
    ? (rawSettings.welcomeChannelId ? String(rawSettings.welcomeChannelId) : null)
    : (config.welcomeChannelId || null);
  merged.leaveChannelId = hasLeaveChannelId
    ? (rawSettings.leaveChannelId ? String(rawSettings.leaveChannelId) : null)
    : (config.leaveChannelId || null);
  merged.levelUpChannelId = merged.levelUpChannelId ? String(merged.levelUpChannelId) : null;

  return merged;
}

function isLegacyGuildSettings(raw) {
  return ["welcome", "leave", "level", "verify", "registrationRoleId", "welcomeChannelId", "leaveChannelId", "levelUpChannelId", "panelChannelId", "voiceNotify", "levelSystem"].some((key) =>
    hasOwn(raw, key)
  );
}

function normalizeSettingsContainer(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { guilds: {} };
  }

  if (raw.guilds && typeof raw.guilds === "object" && !Array.isArray(raw.guilds)) {
    const guilds = {};
    for (const [guildId, settings] of Object.entries(raw.guilds)) {
      guilds[String(guildId)] = normalizeGuildSettings(settings);
    }
    return { guilds };
  }

  if (isLegacyGuildSettings(raw)) {
    const fallbackGuildId = String(config.guildId || "global");
    return {
      guilds: {
        [fallbackGuildId]: normalizeGuildSettings(raw)
      }
    };
  }

  return { guilds: {} };
}

function getGuildSettings(guildId) {
  const container = normalizeSettingsContainer(readJson(SETTINGS_FILE, { guilds: {} }));
  return container.guilds[String(guildId)] || normalizeGuildSettings();
}

function saveGuildSettings(guildId, settings) {
  const container = normalizeSettingsContainer(readJson(SETTINGS_FILE, { guilds: {} }));
  container.guilds[String(guildId)] = normalizeGuildSettings(settings);
  writeJson(SETTINGS_FILE, container);
}

function normalizeLevelStepSeconds(secondsPerLevel = LEVEL_SECONDS_PER_LEVEL) {
  return Math.max(1, Math.floor(Number(secondsPerLevel) || LEVEL_SECONDS_PER_LEVEL));
}

function getBracketRequiredSeconds(bracket, secondsPerLevel = LEVEL_SECONDS_PER_LEVEL) {
  if (Number.isFinite(bracket?.fixedSeconds) && bracket.fixedSeconds > 0) {
    return Math.max(60, Math.round(bracket.fixedSeconds));
  }

  return Math.max(60, Math.round(normalizeLevelStepSeconds(secondsPerLevel) * bracket.multiplier));
}

function getLevelTimeBracket(level) {
  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(level) || 1)));
  return LEVEL_TIME_BRACKETS.find((bracket) => safeLevel >= bracket.minLevel && safeLevel <= bracket.maxLevel)
    || LEVEL_TIME_BRACKETS[LEVEL_TIME_BRACKETS.length - 1];
}

function getLevelCurve(secondsPerLevel = LEVEL_SECONDS_PER_LEVEL) {
  const baseSeconds = normalizeLevelStepSeconds(secondsPerLevel);
  if (levelCurveCache.has(baseSeconds)) {
    return levelCurveCache.get(baseSeconds);
  }

  const thresholds = new Array(MAX_LEVEL + 1).fill(0);
  const stepSeconds = new Array(MAX_LEVEL + 1).fill(0);

  for (let level = 1; level < MAX_LEVEL; level += 1) {
    const bracket = getLevelTimeBracket(level);
    const requiredSeconds = getBracketRequiredSeconds(bracket, baseSeconds);
    stepSeconds[level] = requiredSeconds;
    thresholds[level + 1] = thresholds[level] + requiredSeconds;
  }

  const curve = { thresholds, stepSeconds };
  levelCurveCache.set(baseSeconds, curve);
  return curve;
}

function getVoiceSecondsRequiredForLevel(level, secondsPerLevel = LEVEL_SECONDS_PER_LEVEL) {
  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(level) || 1)));
  return getLevelCurve(secondsPerLevel).thresholds[safeLevel];
}

function getSecondsRequiredForNextLevel(level, secondsPerLevel = LEVEL_SECONDS_PER_LEVEL) {
  const safeLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(level) || 1)));
  if (safeLevel >= MAX_LEVEL) {
    return 0;
  }

  return getLevelCurve(secondsPerLevel).stepSeconds[safeLevel];
}

function getLevelRateDescriptionLines(secondsPerLevel = LEVEL_SECONDS_PER_LEVEL, prefix = "• ") {
  return LEVEL_TIME_BRACKETS.map((bracket) => (
    `${prefix}${bracket.label}: ${formatDuration(getBracketRequiredSeconds(bracket, secondsPerLevel))} / เลเวล`
  ));
}

function calculateLevelFromVoiceSeconds(voiceSeconds, secondsPerLevel = LEVEL_SECONDS_PER_LEVEL) {
  const safeSeconds = Math.max(0, Math.floor(Number(voiceSeconds) || 0));
  const { thresholds } = getLevelCurve(secondsPerLevel);
  let low = 1;
  let high = MAX_LEVEL;

  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    if (thresholds[mid] <= safeSeconds) {
      low = mid;
    } else {
      high = mid - 1;
    }
  }

  return low;
}

function normalizeUser(user = {}, secondsPerLevel = LEVEL_SECONDS_PER_LEVEL) {
  const safeUser = user || {};
  const storedLevel = Math.max(1, Math.min(MAX_LEVEL, Math.floor(Number(safeUser.level) || 1)));
  const rawVoiceSeconds = Math.max(0, Math.floor(Number(safeUser.voiceSeconds) || 0));
  const minimumVoiceSecondsForStoredLevel = getVoiceSecondsRequiredForLevel(storedLevel, secondsPerLevel);
  const voiceSeconds = Math.max(rawVoiceSeconds, minimumVoiceSecondsForStoredLevel);
  const derivedLevel = calculateLevelFromVoiceSeconds(voiceSeconds, secondsPerLevel);

  return {
    xp: Math.max(0, Math.floor(Number(safeUser.xp) || 0)),
    level: Math.max(storedLevel, derivedLevel),
    voiceSeconds,
    verified: Boolean(safeUser.verified),
    name: safeUser.name ? String(safeUser.name) : "",
    age: safeUser.age ? String(safeUser.age) : "",
    gameName: safeUser.gameName ? String(safeUser.gameName) : "",
    verifiedAt: safeUser.verifiedAt || null
  };
}

function normalizeUserMap(raw = {}, secondsPerLevel = LEVEL_SECONDS_PER_LEVEL) {
  const users = {};

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return users;
  }

  for (const [userId, userData] of Object.entries(raw)) {
    users[String(userId)] = normalizeUser(userData, secondsPerLevel);
  }

  return users;
}

function isLegacyUserMap(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return false;
  }

  const firstValue = Object.values(raw)[0];
  if (!firstValue || typeof firstValue !== "object" || Array.isArray(firstValue)) {
    return false;
  }

  return ["level", "xp", "voiceSeconds", "verified", "name", "age", "gameName"].some((key) =>
    hasOwn(firstValue, key)
  );
}

function normalizeUsersContainer(raw = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { guilds: {} };
  }

  if (raw.guilds && typeof raw.guilds === "object" && !Array.isArray(raw.guilds)) {
    const guilds = {};
    for (const [guildId, users] of Object.entries(raw.guilds)) {
      const settings = getGuildSettings(guildId);
      guilds[String(guildId)] = normalizeUserMap(users, settings.levelSystem.secondsPerLevel);
    }
    return { guilds };
  }

  if (isLegacyUserMap(raw)) {
    const fallbackGuildId = String(config.guildId || "global");
    const settings = getGuildSettings(fallbackGuildId);
    return {
      guilds: {
        [fallbackGuildId]: normalizeUserMap(raw, settings.levelSystem.secondsPerLevel)
      }
    };
  }

  return { guilds: {} };
}

function getGuildUsers(guildId) {
  const container = normalizeUsersContainer(readJson(USERS_FILE, { guilds: {} }));
  const settings = getGuildSettings(guildId);
  return normalizeUserMap(container.guilds[String(guildId)] || {}, settings.levelSystem.secondsPerLevel);
}

function saveGuildUsers(guildId, users) {
  const container = normalizeUsersContainer(readJson(USERS_FILE, { guilds: {} }));
  const settings = getGuildSettings(guildId);
  container.guilds[String(guildId)] = normalizeUserMap(users, settings.levelSystem.secondsPerLevel);
  writeJson(USERS_FILE, container);
}

function ensureUserRecord(users, userId, settings = DEFAULT_GUILD_SETTINGS) {
  const normalized = normalizeUser(
    {
      ...DEFAULT_USER,
      ...(users[String(userId)] || {})
    },
    settings.levelSystem.secondsPerLevel
  );

  users[String(userId)] = normalized;
  return normalized;
}

function inviteUrl() {
  if (!CLIENT_ID) {
    return "ยังไม่ได้ตั้งค่า clientId";
  }

  return `https://discord.com/oauth2/authorize?client_id=${CLIENT_ID}&permissions=8&integration_type=0&scope=bot+applications.commands`;
}

function isAdminMember(member) {
  if (!member) {
    return false;
  }

  if (member.permissions?.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  return Boolean(config.adminRoleId && member.roles?.cache?.has(config.adminRoleId));
}

function findTextChannel(guild, preferredChannelId) {
  const sendable = (channel) =>
    channel &&
    channel.isTextBased() &&
    guild.members.me &&
    channel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.ViewChannel) &&
    channel.permissionsFor(guild.members.me)?.has(PermissionFlagsBits.SendMessages);

  if (preferredChannelId) {
    const preferred = guild.channels.cache.get(preferredChannelId);
    if (sendable(preferred)) {
      return preferred;
    }
  }

  return guild.channels.cache.find(sendable) || null;
}

function getPanelLogChannel(guild, settings) {
  return findTextChannel(guild, settings.panelChannelId || config.welcomeChannelId || config.leaveChannelId);
}

function getVoiceNotifyLogChannel(guild, settings) {
  return findTextChannel(
    guild,
    settings.voiceNotify.logChannelId || settings.panelChannelId || config.welcomeChannelId || config.leaveChannelId
  );
}

function getWelcomeChannel(guild, settings) {
  return findTextChannel(guild, settings.welcomeChannelId || settings.panelChannelId);
}

function getLeaveChannel(guild, settings) {
  return findTextChannel(guild, settings.leaveChannelId || settings.panelChannelId);
}

function getLevelUpLogChannel(guild, settings) {
  return findTextChannel(
    guild,
    settings.levelUpChannelId || settings.panelChannelId || settings.voiceNotify.logChannelId
  );
}

function statusText(enabled) {
  return enabled ? "🟢 เปิด" : "🔴 ปิด";
}

function formatDuration(totalSeconds) {
  const safeSeconds = Math.max(0, Math.floor(Number(totalSeconds) || 0));
  const days = Math.floor(safeSeconds / 86400);
  const hours = Math.floor((safeSeconds % 86400) / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const parts = [];

  if (days) parts.push(`${days} วัน`);
  if (hours) parts.push(`${hours} ชม.`);
  if (minutes) parts.push(`${minutes} นาที`);
  if (!days && !hours && seconds) parts.push(`${seconds} วินาที`);
  if (!parts.length) parts.push(`${seconds} วินาที`);

  return parts.join(" ");
}

function formatChannelMention(guild, channelId, fallback = "ยังไม่ได้เลือก") {
  if (!channelId) {
    return fallback;
  }

  const channel = guild.channels.cache.get(channelId);
  return channel ? channel.toString() : fallback;
}

function formatRoleMention(guild, roleId, fallback = "à¸¢à¸±à¸‡à¹„à¸¡à¹ˆà¹„à¸”à¹‰à¸ªà¸£à¹‰à¸²à¸‡") {
  if (!roleId) {
    return fallback;
  }

  const role = guild.roles.cache.get(roleId);
  return role ? role.toString() : fallback;
}

function getRegistrationRoleId(settings) {
  return settings.registrationRoleId || config.verifiedRoleId || null;
}

function getRegistrationRole(guild, settings) {
  const roleId = getRegistrationRoleId(settings);
  return roleId ? guild.roles.cache.get(roleId) || null : null;
}

function buildNickname(name, age, gameName) {
  const cleanName = String(name || "").trim();
  const cleanAge = String(age || "").trim();
  const cleanGameName = String(gameName || "").trim();
  const nameAge = [cleanName, cleanAge].filter(Boolean).join(" ").trim();

  const candidates = [
    cleanGameName && nameAge ? `${nameAge} (${cleanGameName})` : "",
    cleanGameName && cleanName ? `${cleanName} (${cleanGameName})` : "",
    nameAge,
    cleanName,
    cleanGameName ? `(${cleanGameName})` : ""
  ].filter(Boolean);

  const usable = candidates.find((nickname) => nickname.length <= 32);
  return usable || cleanName.slice(0, 32) || cleanGameName.slice(0, 32) || "Member";
}

function buildToggleButton(customId, label, enabled) {
  return new ButtonBuilder()
    .setCustomId(customId)
    .setLabel(label)
    .setStyle(enabled ? ButtonStyle.Success : ButtonStyle.Secondary);
}

function buildPageMenuEmbed() {
  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("Panel Menu")
    .setDescription(
      [
        "เลือกหน้าที่ต้องการให้บอทส่งในห้องนี้",
        "",
        "หน้าที่ส่งได้:",
        "• หน้าควบคุมระบบ: สำหรับแอดมินเปิด/ปิดระบบหลักและตั้งค่ายศลงทะเบียน",
        "• หน้าลงทะเบียน: สำหรับสมาชิกกดกรอกข้อมูลและเปลี่ยนชื่อ",
        "• หน้าเลเวล: อธิบายระบบเลเวลและให้กดดูเลเวลตัวเอง",
        "• หน้าตั้งค่าห้องแจ้งเตือน: เลือกห้องข้อความของระบบแต่ละแบบ",
        "• หน้าห้องเสียง: ดูสรุประบบแจ้งเตือนห้องเสียง",
        "",
        "ห้องที่พิมพ์ !panel จะถูกใช้เป็นห้อง log หลักของระบบ"
      ].join("\n")
    )
    .setFooter({ text: "ใช้เมนูด้านล่างเพื่อเลือกหน้าที่ต้องการส่ง" });
}

function buildPageMenuRows() {
  return [
    new ActionRowBuilder().addComponents(
      new StringSelectMenuBuilder()
        .setCustomId("panel_page_select")
        .setPlaceholder("เลือกหน้าที่ต้องการให้บอทส่ง")
        .setMinValues(1)
        .setMaxValues(1)
        .addOptions(
          {
            label: "หน้าควบคุมระบบ",
            description: "ส่งแผงควบคุมหลักสำหรับแอดมิน",
            value: "control_panel_page"
          },
          {
            label: "หน้าลงทะเบียนสมาชิก",
            description: "ส่งหน้ากรอกข้อมูลพร้อมปุ่มลงทะเบียน",
            value: "registration_page"
          },
          {
            label: "หน้าเลเวล",
            description: "ส่งหน้าอธิบายเลเวลและปุ่มดูเลเวล",
            value: "level_page"
          },
          {
            label: "หน้าตั้งค่าห้องแจ้งเตือน",
            description: "เลือกห้องข้อความของระบบแต่ละแบบ",
            value: "notify_settings_page"
          },
          // {
          //   label: "หน้าห้องเสียง",
          //   description: "ส่งหน้าสรุปห้องเสียงที่เปิดแจ้งเตือน",
          //   value: "voice_page"
          // }
        )
    )
  ];
}

function buildPanelEmbed(guild) {
  const settings = getGuildSettings(guild.id);
  const users = getGuildUsers(guild.id);
  const verifiedCount = Object.values(users).filter((user) => user.verified).length;
  const registrationRole = getRegistrationRole(guild, settings);
  const topLeaderRole = formatRoleMention(guild, settings.levelSystem.topLeaderRoleId, "จะสร้างอัตโนมัติ");
  const topLeaderUser = settings.levelSystem.topLeaderUserId
    ? `<@${settings.levelSystem.topLeaderUserId}>`
    : "ยังไม่มี";

  return new EmbedBuilder()
    .setColor("#5865F2")
    .setTitle("Mode.[H]ardCore Control Panel")
    .setDescription(
      [
        "-- ระบบหลัก --",
        `แจ้งเข้าเซิร์ฟเวอร์: ${statusText(settings.welcome)}`,
        `แจ้งออกเซิร์ฟเวอร์: ${statusText(settings.leave)}`,
        `ฟอร์มกรอกข้อมูล/เปลี่ยนชื่อ: ${statusText(settings.verify)}`,
        `เลเวลจากห้องเสียง: ${statusText(settings.level)}`,
        `แจ้งเตือนเข้าออกห้องเสียง: ${statusText(settings.voiceNotify.enabled)}`,
        "",
        "-- ห้องที่ระบบใช้ --",
        `ห้อง log หลัก: ${settings.panelChannelId ? `<#${settings.panelChannelId}>` : "ยังไม่ตั้งค่า"}`,
        `ห้องแจ้งเข้าเซิร์ฟ: ${formatChannelMention(guild, settings.welcomeChannelId, "ใช้ห้อง log หลัก")}`,
        `ห้องแจ้งออกเซิร์ฟ: ${formatChannelMention(guild, settings.leaveChannelId, "ใช้ห้อง log หลัก")}`,
        `ห้องแจ้งเตือนห้องเสียง: ${formatChannelMention(guild, settings.voiceNotify.logChannelId, "ใช้ห้อง log หลัก")}`,
        `ห้องประกาศเลเวลอัป: ${formatChannelMention(guild, settings.levelUpChannelId, "ใช้ห้อง log หลัก")}`,
        `ยศหลังลงทะเบียน: ${registrationRole ? registrationRole.toString() : "ยังไม่ได้เลือก"}`,
        `ยศพิเศษคนอันดับ 1: ${topLeaderRole}`,
        `ผู้ถือยศปัจจุบัน: ${topLeaderUser}`,
        "",
        "-- กติกาเลเวล --",
        "เวลาอัปเลเวลจะเพิ่มตามช่วงเลเวล:",
        ...getLevelRateDescriptionLines(settings.levelSystem.secondsPerLevel),
        "คนเลเวลสูงสุดจะได้ยศพิเศษ 1 คน",
        "ถ้ามีคนเลเวลแซง ยศจะย้ายไปคนใหม่อัตโนมัติ",
        "นับเวลาจากทุกห้องเสียงในเซิร์ฟเวอร์",
        `ถึง Lv.${HIGH_LEVEL_START} ยังใช้สูตรเลเวลเดิม`,
        `หลัง Lv.${HIGH_LEVEL_START} ไปจนถึง Lv.${MAX_LEVEL} ใช้เวลาอีก ${formatDuration(HIGH_LEVEL_TARGET_SECONDS)} (ประมาณ 6 เดือน)`,
        "ยศช่วง Lv.1-100: ทุก 10 เลเวล",
        "ยศช่วง Lv.100-1000: ทุก 50 เลเวล",
        `ยศช่วง Lv.${HIGH_LEVEL_ROLE_START}-${MAX_LEVEL}: ทุก ${HIGH_LEVEL_ROLE_INTERVAL} เลเวล`,
        `จำนวนยศทั้งหมด: ${LEVEL_ROLE_DEFINITIONS.length} ยศ`,
        "",
        "-- สถานะเซิร์ฟเวอร์ --",
        `สมาชิกทั้งหมด: ${guild.memberCount} คน`,
        `ยืนยันข้อมูลแล้ว: ${verifiedCount} คน`,
        "",
        "หมายเหตุ: ใช้ !panel ในห้องที่ต้องการให้เป็นห้อง log หลักได้เลย"
      ].join("\n")
    )
    .setFooter({ text: "Mode.[H]ardCore" });
}

function buildRegistrationPageEmbed() {
  return new EmbedBuilder()
    .setColor("#2f3136")
    .setTitle("🛡️ REGISTRATION SYSTEM 🛡️")
    .setDescription(
      [
        "ยินดีต้อนรับเข้าสู่ระบบลงทะเบียนสมาชิก",
        "",
        "กรุณากดปุ่มด้านล่างเพื่อดำเนินการต่อ",
        "",
        "ขั้นตอน: กดลงทะเบียน -> กรอกข้อมูล -> ระบบเปลี่ยนชื่อ",
        "",
        "📋 ข้อมูลที่ต้องกรอก",
        "• ชื่อ",
        "• อายุ",
        "• ชื่อตัวละคร (IGN)"
      ].join("\n")
    )
    .setFooter({ text: "เมื่อกรอกเสร็จ ระบบจะบันทึกข้อมูลและเปลี่ยนชื่อให้อัตโนมัติ" });
}

function buildRegistrationPageRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("profile_form")
        .setLabel("ลงทะเบียนที่นี่")
        .setStyle(ButtonStyle.Primary)
    )
  ];
}

function buildLevelPageEmbed(guild) {
  const settings = getGuildSettings(guild.id);
  return new EmbedBuilder()
    .setColor("#f1c40f")
    .setTitle("🏆 SERVER LEVEL SYSTEM")
    .setDescription(
      [
        "สะสมเลเวลจากการอยู่ในห้องเสียงอัตโนมัติ",
        "",
        "• เวลาอัปเลเวลจะเพิ่มขึ้นตามช่วงเลเวล",
        ...getLevelRateDescriptionLines(settings.levelSystem.secondsPerLevel),
        "• เข้าห้องเสียงไหนก็ได้เวลาทั้งหมด",
        `• เลเวลสูงสุด ${MAX_LEVEL}`,
        `• ถึง Lv.${HIGH_LEVEL_START} ยังใช้สูตรเลเวลเดิม`,
        `• จาก Lv.${HIGH_LEVEL_START} ไป Lv.${MAX_LEVEL} ต้องสะสมเวลาเพิ่มอีก ${formatDuration(HIGH_LEVEL_TARGET_SECONDS)} (ประมาณ 6 เดือน)`,
        "• คนเลเวลสูงสุดของเซิร์ฟจะได้ยศพิเศษเพียง 1 คน",
        "• ถ้ามีคนเลเวลแซง ยศนี้จะถูกย้ายให้ผู้เล่นคนนั้นอัตโนมัติ",
        "• ช่วง Lv.1 - Lv.100 ได้ยศทุก 10 เลเวล",
        "• ช่วง Lv.100 - Lv.1000 ได้ยศทุก 50 เลเวล",
        `• ช่วง Lv.${HIGH_LEVEL_ROLE_START} - Lv.${MAX_LEVEL} ได้ยศทุก ${HIGH_LEVEL_ROLE_INTERVAL} เลเวล`,
        "",
        "กดปุ่มด้านล่างเพื่อตรวจสอบเลเวลของคุณ"
      ].join("\n")
    )
    .setFooter({ text: "Server Level by Mode.[H]ardCore" });
}

function buildLevelPageRows() {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("my_level")
        .setLabel("ดูเลเวลของฉัน")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function buildVoicePageEmbed(guild) {
  const settings = getGuildSettings(guild.id);
  return new EmbedBuilder()
    .setColor("#00b894")
    .setTitle("🔔 VOICE ALERT SYSTEM")
    .setDescription(
      [
        "ระบบนี้ใช้สำหรับแจ้งเตือนคนเข้า/ออก/ย้ายห้องเสียงทุกห้องในเซิร์ฟเวอร์",
        "",
        `สถานะระบบ: ${statusText(settings.voiceNotify.enabled)}`,
        "ตรวจจับทุกห้องเสียงในเซิร์ฟเวอร์อัตโนมัติ",
        `ห้องข้อความที่ใช้แจ้งเตือน: ${formatChannelMention(guild, settings.voiceNotify.logChannelId, "ใช้ห้อง log หลัก")}`,
        "",
        "หากต้องการเปลี่ยนห้องแจ้งเตือน ให้แอดมินพิมพ์ !panel แล้วเลือกหน้าตั้งค่าห้องแจ้งเตือน"
      ].join("\n")
    )
    .setFooter({ text: "Voice Alert by Mode.[H]ardCore" });
}

function buildNotifySettingsEmbed(guild) {
  const settings = getGuildSettings(guild.id);

  return new EmbedBuilder()
    .setColor("#3498db")
    .setTitle("📢 NOTIFY CHANNEL SETTINGS")
    .setDescription(
      [
        "เลือกห้องข้อความที่แต่ละระบบจะใช้ส่งข้อความ",
        "",
        `ห้องแจ้งเข้าเซิร์ฟ: ${formatChannelMention(guild, settings.welcomeChannelId, "ใช้ห้อง log หลัก")}`,
        `ห้องแจ้งออกเซิร์ฟ: ${formatChannelMention(guild, settings.leaveChannelId, "ใช้ห้อง log หลัก")}`,
        `ห้องแจ้งเตือนห้องเสียง: ${formatChannelMention(guild, settings.voiceNotify.logChannelId, "ใช้ห้อง log หลัก")}`,
        `ห้องประกาศเลเวลอัป: ${formatChannelMention(guild, settings.levelUpChannelId, "ใช้ห้อง log หลัก")}`,
        "",
        "ถ้าไม่เลือก ระบบจะใช้ห้อง log หลักแทน"
      ].join("\n")
    )
    .setFooter({ text: "Channel Settings by Mode.[H]ardCore" });
}

function buildNotifyChannelSelector(customId, placeholder, selectedChannelId, guild) {
  const selector = new ChannelSelectMenuBuilder()
    .setCustomId(customId)
    .setPlaceholder(placeholder)
    .addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement)
    .setMinValues(0)
    .setMaxValues(1);

  if (selectedChannelId && guild.channels.cache.has(selectedChannelId)) {
    selector.setDefaultChannels(selectedChannelId);
  }

  return selector;
}

function buildNotifySettingsRows(guild) {
  const settings = getGuildSettings(guild.id);
  const availableNotifyChannels = guild.channels.cache.filter(
    (channel) => channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement
  );

  const selectors = [
    buildNotifyChannelSelector(
      "select_welcome_channel",
      settings.welcomeChannelId ? "เปลี่ยนห้องแจ้งเข้าเซิร์ฟ" : "เลือกห้องแจ้งเข้าเซิร์ฟ",
      settings.welcomeChannelId,
      guild
    ),
    buildNotifyChannelSelector(
      "select_leave_channel",
      settings.leaveChannelId ? "เปลี่ยนห้องแจ้งออกเซิร์ฟ" : "เลือกห้องแจ้งออกเซิร์ฟ",
      settings.leaveChannelId,
      guild
    ),
    buildNotifyChannelSelector(
      "select_voice_notify_channel",
      settings.voiceNotify.logChannelId
        ? "เปลี่ยนห้องแจ้งเตือนห้องเสียง"
        : "เลือกห้องแจ้งเตือนห้องเสียง",
      settings.voiceNotify.logChannelId,
      guild
    ),
    buildNotifyChannelSelector(
      "select_levelup_channel",
      settings.levelUpChannelId ? "เปลี่ยนห้องประกาศเลเวลอัป" : "เลือกห้องประกาศเลเวลอัป",
      settings.levelUpChannelId,
      guild
    )
  ];

  if (!availableNotifyChannels.size) {
    for (const selector of selectors) {
      selector
        .setDisabled(true)
        .setPlaceholder("เซิร์ฟเวอร์นี้ยังไม่มีห้องข้อความให้เลือก");
    }
  }

  return [
    new ActionRowBuilder().addComponents(selectors[0]),
    new ActionRowBuilder().addComponents(selectors[1]),
    new ActionRowBuilder().addComponents(selectors[2]),
    new ActionRowBuilder().addComponents(selectors[3]),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("clear_welcome_channel")
        .setLabel("ล้างห้องเข้า")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("clear_leave_channel")
        .setLabel("ล้างห้องออก")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("clear_voice_notify_channel")
        .setLabel("ล้างห้องเสียง")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("clear_levelup_channel")
        .setLabel("ล้างห้องเลเวล")
        .setStyle(ButtonStyle.Danger)
    )
  ];
}

function buildPanelRows(guild) {
  const settings = getGuildSettings(guild.id);

  const roleSelector = new RoleSelectMenuBuilder()
    .setCustomId("select_registration_role")
    .setPlaceholder(
      settings.registrationRoleId
        ? "เปลี่ยนยศที่จะให้หลังลงทะเบียน"
        : "เลือกยศที่จะให้หลังลงทะเบียน"
    )
    .setMinValues(0)
    .setMaxValues(1);

  if (settings.registrationRoleId && guild.roles.cache.has(settings.registrationRoleId)) {
    roleSelector.setDefaultRoles(settings.registrationRoleId);
  }

  return [
    new ActionRowBuilder().addComponents(
      buildToggleButton("toggle_welcome", "แจ้งเข้าเซิร์ฟเวอร์", settings.welcome),
      buildToggleButton("toggle_leave", "แจ้งออกเซิร์ฟเวอร์", settings.leave),
      buildToggleButton("toggle_verify", "ฟอร์มข้อมูล", settings.verify),
      buildToggleButton("toggle_level", "เลเวลเสียง", settings.level),
      buildToggleButton("toggle_voice_notify", "แจ้งเตือนห้อง", settings.voiceNotify.enabled)
    ),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("profile_form")
        .setLabel("กรอกข้อมูล")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("my_level")
        .setLabel("ดูเลเวล")
        .setStyle(ButtonStyle.Secondary),
      new ButtonBuilder()
        .setCustomId("setup_level_roles")
        .setLabel("สร้างยศเลเวล")
        .setStyle(ButtonStyle.Primary)
    ),
    new ActionRowBuilder().addComponents(roleSelector),
    new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("clear_registration_role")
        .setLabel("ล้างยศลงทะเบียน")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("invite_link")
        .setLabel("ลิงก์เชิญบอท")
        .setStyle(ButtonStyle.Secondary)
    )
  ];
}

function getHighestRankDefinition(level) {
  let currentRank = null;

  for (const definition of LEVEL_ROLE_DEFINITIONS) {
    if (level >= definition.level) {
      currentRank = definition;
    }
  }

  return currentRank;
}

function getTopLeaderRole(guild, settings) {
  const roleId = settings.levelSystem.topLeaderRoleId;
  return roleId ? guild.roles.cache.get(roleId) || null : null;
}

async function ensureTopLeaderRole(guild) {
  const me = guild.members.me;
  if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error("BOT_NEEDS_MANAGE_ROLES");
  }

  const settings = getGuildSettings(guild.id);
  let role = getTopLeaderRole(guild, settings);

  if (!role) {
    role = guild.roles.cache.find((existingRole) => existingRole.name === TOP_LEVEL_ROLE_DEFINITION.name) || null;
  }

  if (!role) {
    role = await guild.roles.create({
      name: TOP_LEVEL_ROLE_DEFINITION.name,
      color: TOP_LEVEL_ROLE_DEFINITION.color,
      reason: "Create special top level leader role"
    });
  } else if (role.editable && (
    role.name !== TOP_LEVEL_ROLE_DEFINITION.name || role.color !== TOP_LEVEL_ROLE_DEFINITION.color
  )) {
    await role.edit({
      name: TOP_LEVEL_ROLE_DEFINITION.name,
      color: TOP_LEVEL_ROLE_DEFINITION.color,
      reason: "Sync special top level leader role"
    }).catch(() => {});
  }

  if (settings.levelSystem.topLeaderRoleId !== role.id) {
    settings.levelSystem.topLeaderRoleId = role.id;
    saveGuildSettings(guild.id, settings);
  }

  return role;
}

function compareUsersByLeaderboard([aId, aUser], [bId, bUser]) {
  const levelDiff = (Math.floor(Number(bUser?.level) || 0)) - (Math.floor(Number(aUser?.level) || 0));
  if (levelDiff) {
    return levelDiff;
  }

  const voiceDiff = (Math.floor(Number(bUser?.voiceSeconds) || 0)) - (Math.floor(Number(aUser?.voiceSeconds) || 0));
  if (voiceDiff) {
    return voiceDiff;
  }

  const xpDiff = (Math.floor(Number(bUser?.xp) || 0)) - (Math.floor(Number(aUser?.xp) || 0));
  if (xpDiff) {
    return xpDiff;
  }

  return String(aId).localeCompare(String(bId));
}

async function fetchGuildMemberById(guild, userId) {
  if (!userId) {
    return null;
  }

  return guild.members.fetch(String(userId)).catch(() => null);
}

async function selectTopLeader(guild, users = {}, currentHolderId = null) {
  const entries = Object.entries(users || {}).filter(([, user]) => user && Number(user.level) > 0);
  if (!entries.length) {
    return null;
  }

  entries.sort(compareUsersByLeaderboard);

  const normalizedCurrentHolderId = currentHolderId ? String(currentHolderId) : null;
  if (normalizedCurrentHolderId) {
    const currentHolderEntry = entries.find(([userId]) => userId === normalizedCurrentHolderId);
    const currentHolderMember = currentHolderEntry
      ? await fetchGuildMemberById(guild, normalizedCurrentHolderId)
      : null;

    if (currentHolderEntry && currentHolderMember && !currentHolderMember.user.bot) {
      const currentHolderLevel = Math.max(1, Math.floor(Number(currentHolderEntry[1].level) || 1));

      for (const [userId, user] of entries) {
        const candidateLevel = Math.max(1, Math.floor(Number(user.level) || 1));
        if (candidateLevel <= currentHolderLevel) {
          break;
        }

        const candidateMember = await fetchGuildMemberById(guild, userId);
        if (candidateMember && !candidateMember.user.bot) {
          return { userId, user, member: candidateMember };
        }
      }

      return {
        userId: normalizedCurrentHolderId,
        user: currentHolderEntry[1],
        member: currentHolderMember
      };
    }
  }

  for (const [userId, user] of entries) {
    const member = await fetchGuildMemberById(guild, userId);
    if (member && !member.user.bot) {
      return { userId, user, member };
    }
  }

  return null;
}

async function syncTopLeaderRole(guild, users = null, settings = null) {
  const guildSettings = settings || getGuildSettings(guild.id);
  const guildUsers = users || getGuildUsers(guild.id);
  const role = await ensureTopLeaderRole(guild);
  const previousHolderId = guildSettings.levelSystem.topLeaderUserId
    ? String(guildSettings.levelSystem.topLeaderUserId)
    : null;
  const leader = await selectTopLeader(guild, guildUsers, previousHolderId);
  const nextHolderId = leader ? leader.userId : null;

  const staleCachedMembers = [...guild.members.cache.values()].filter((member) => (
    !member.user.bot &&
    member.roles.cache.has(role.id) &&
    member.id !== nextHolderId
  ));

  for (const staleMember of staleCachedMembers) {
    await staleMember.roles.remove(role).catch(() => {});
  }

  if (previousHolderId && previousHolderId !== nextHolderId) {
    const previousHolderMember = await fetchGuildMemberById(guild, previousHolderId);
    if (previousHolderMember && previousHolderMember.roles.cache.has(role.id)) {
      await previousHolderMember.roles.remove(role).catch(() => {});
    }
  }

  if (leader && !leader.member.roles.cache.has(role.id)) {
    await leader.member.roles.add(role).catch(() => {});
  }

  if (
    guildSettings.levelSystem.topLeaderRoleId !== role.id ||
    guildSettings.levelSystem.topLeaderUserId !== nextHolderId
  ) {
    guildSettings.levelSystem.topLeaderRoleId = role.id;
    guildSettings.levelSystem.topLeaderUserId = nextHolderId;
    saveGuildSettings(guild.id, guildSettings);
  }

  return leader;
}

function buildLevelEmbed(member, user, settings) {
  const currentRank = getHighestRankDefinition(user.level);
  const topLeaderRole = getTopLeaderRole(member.guild, settings);
  const isTopLeader = settings.levelSystem.topLeaderUserId === member.id;
  const currentLevelFloor = getVoiceSecondsRequiredForLevel(user.level, settings.levelSystem.secondsPerLevel);
  const nextLevelStep = getSecondsRequiredForNextLevel(user.level, settings.levelSystem.secondsPerLevel);
  const nextLevelAt = user.level >= MAX_LEVEL ? null : currentLevelFloor + nextLevelStep;
  const currentProgress = user.voiceSeconds - currentLevelFloor;
  const remainingSeconds = nextLevelAt === null ? 0 : Math.max(0, nextLevelAt - user.voiceSeconds);

  return new EmbedBuilder()
    .setColor("#00b894")
    .setTitle(`เลเวลของ ${member.displayName}`)
    .addFields(
      { name: "เลเวล", value: `Lv.${user.level}`, inline: true },
      { name: "เวลาในห้องเสียง", value: formatDuration(user.voiceSeconds), inline: true },
      {
        name: "อัตราเลเวลตอนนี้",
        value: nextLevelAt === null ? "ถึงเลเวลสูงสุดแล้ว" : `${formatDuration(nextLevelStep)} / เลเวล`,
        inline: true
      },
      {
        name: "ยศพิเศษ",
        value: isTopLeader && topLeaderRole ? topLeaderRole.toString() : "ยังไม่ได้ถือยศอันดับ 1",
        inline: false
      },
      { name: "ยศปัจจุบัน", value: currentRank ? currentRank.name : "ยังไม่มียศ", inline: false },
      {
        name: "ความคืบหน้า",
        value: nextLevelAt === null
          ? "ถึงเลเวลสูงสุดแล้ว"
          : `${formatDuration(currentProgress)} / ${formatDuration(nextLevelStep)}\nเหลืออีก ${formatDuration(remainingSeconds)}`,
        inline: false
      }
    )
    .setFooter({ text: "เลเวลจะเพิ่มเมื่ออยู่ในห้องเสียงต่อเนื่อง" });
}

function isCountableVoiceState(voiceState) {
  const member = voiceState.member;
  const channel = voiceState.channel;

  if (!member || member.user.bot || !channel) {
    return false;
  }

  return channel.type === ChannelType.GuildVoice || channel.type === ChannelType.GuildStageVoice;
}

function getLevelSetupErrorMessage(error) {
  if (error?.message === "BOT_NEEDS_MANAGE_ROLES") {
    return "บอทต้องมีสิทธิ์ Manage Roles ก่อน ถึงจะสร้างยศเลเวลให้อัตโนมัติได้";
  }

  return "สร้างยศเลเวลไม่สำเร็จ ตรวจสิทธิ์ของบอทแล้วลองใหม่อีกครั้ง";
}

async function ensureLevelRoles(guild) {
  const me = guild.members.me;
  if (!me || !me.permissions.has(PermissionFlagsBits.ManageRoles)) {
    throw new Error("BOT_NEEDS_MANAGE_ROLES");
  }

  const settings = getGuildSettings(guild.id);
  const rankRoles = { ...settings.levelSystem.rankRoles };
  let changed = false;

  for (const definition of LEVEL_ROLE_DEFINITIONS) {
    let role = rankRoles[String(definition.level)]
      ? guild.roles.cache.get(rankRoles[String(definition.level)])
      : null;

    if (!role) {
      role = guild.roles.cache.find((existingRole) => existingRole.name === definition.name) || null;
    }

    if (!role) {
      role = await guild.roles.create({
        name: definition.name,
        color: definition.color,
        reason: "Create server level rank roles"
      });
    } else if (role.editable && (role.name !== definition.name || role.color !== definition.color)) {
      await role.edit({
        name: definition.name,
        color: definition.color,
        reason: "Sync server level rank roles"
      }).catch(() => {});
    }

    if (role && rankRoles[String(definition.level)] !== role.id) {
      rankRoles[String(definition.level)] = role.id;
      changed = true;
    }
  }

  if (changed) {
    settings.levelSystem.rankRoles = rankRoles;
    saveGuildSettings(guild.id, settings);
  }

  return rankRoles;
}

async function syncMemberRankRole(member, users = null, settings = null) {
  const guildSettings = settings || getGuildSettings(member.guild.id);
  const guildUsers = users || getGuildUsers(member.guild.id);
  const user = ensureUserRecord(guildUsers, member.id, guildSettings);
  const highestRank = getHighestRankDefinition(user.level);
  const managedRankRoleIds = Object.values(guildSettings.levelSystem.rankRoles || {});
  const targetRoleId = highestRank ? guildSettings.levelSystem.rankRoles[String(highestRank.level)] : null;

  if (!managedRankRoleIds.length) {
    return highestRank;
  }

  const removableRoleIds = managedRankRoleIds.filter(
    (roleId) => roleId && roleId !== targetRoleId && member.roles.cache.has(roleId)
  );

  if (removableRoleIds.length) {
    await member.roles.remove(removableRoleIds).catch(() => {});
  }

  if (targetRoleId && !member.roles.cache.has(targetRoleId)) {
    await member.roles.add(targetRoleId).catch(() => {});
  }

  return highestRank;
}

async function restoreMemberState(member) {
  const settings = getGuildSettings(member.guild.id);
  const users = getGuildUsers(member.guild.id);
  const user = users[member.id];

  if (!user) {
    return;
  }

  if (user.verified) {
    const registrationRole = getRegistrationRole(member.guild, settings);
    if (registrationRole && !member.roles.cache.has(registrationRole.id)) {
      await member.roles.add(registrationRole).catch(() => {});
    }
  }

  if (user.verified && member.manageable) {
    const nickname = buildNickname(user.name, user.age, user.gameName);
    if (member.nickname !== nickname) {
      await member.setNickname(nickname, "Restore verified member nickname").catch(() => {});
    }
  }

  if (settings.level) {
    await syncMemberRankRole(member, users, settings).catch(() => {});
    await syncTopLeaderRole(member.guild, users, settings).catch(() => {});
  }
}

async function refreshPanelMessage(message) {
  if (!message?.guild) {
    return;
  }

  await message.edit({
    embeds: [buildPanelEmbed(message.guild)],
    components: buildPanelRows(message.guild)
  }).catch(() => {});
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ],
  partials: [Partials.Channel]
});

let voiceTickInterval = null;
let voiceTickRunning = false;

async function processVoiceLevelTick() {
  if (voiceTickRunning) {
    return;
  }

  voiceTickRunning = true;

  try {
    for (const guild of client.guilds.cache.values()) {
      const settings = getGuildSettings(guild.id);
      if (!settings.level) {
        continue;
      }

      const activeVoiceStates = [...guild.voiceStates.cache.values()].filter(isCountableVoiceState);
      if (!activeVoiceStates.length) {
        continue;
      }

      const users = getGuildUsers(guild.id);
      const levelUps = [];

      for (const voiceState of activeVoiceStates) {
        const member = voiceState.member;
        const user = ensureUserRecord(users, member.id, settings);
        const previousLevel = user.level;

        user.voiceSeconds += 60;
        user.level = calculateLevelFromVoiceSeconds(user.voiceSeconds, settings.levelSystem.secondsPerLevel);

        if (user.level > previousLevel) {
          levelUps.push({
            member,
            previousLevel,
            currentLevel: user.level
          });
        }
      }

      saveGuildUsers(guild.id, users);

      if (!levelUps.length) {
        continue;
      }

      try {
        await ensureLevelRoles(guild);
      } catch (error) {
        console.log(`[Level Roles] ${guild.name}: ${getLevelSetupErrorMessage(error)}`);
      }

      try {
        await syncTopLeaderRole(guild, users, settings);
      } catch (error) {
        console.log(`[Top Leader Role] ${guild.name}: ${getLevelSetupErrorMessage(error)}`);
      }

      const latestSettings = getGuildSettings(guild.id);
      const announceChannel = getLevelUpLogChannel(guild, latestSettings);

      for (const levelUp of levelUps) {
        await syncMemberRankRole(levelUp.member, users, latestSettings).catch(() => {});

        if (!announceChannel) {
          continue;
        }

        const user = users[levelUp.member.id];
        const currentRank = getHighestRankDefinition(user.level);

        await announceChannel.send({
          content: [
            `🎉 ${levelUp.member} เลเวลอัปเป็น Lv.${levelUp.currentLevel}`,
            `เวลาในห้องเสียงสะสม: ${formatDuration(user.voiceSeconds)}`,
            currentRank ? `ยศล่าสุด: **${currentRank.name}**` : null
          ].filter(Boolean).join("\n")
        }).catch(() => {});
      }
    }
  } finally {
    voiceTickRunning = false;
  }
}

client.once("ready", async () => {
  ensureFiles();
  console.log(`Mode.[H]ardCore Online: ${client.user.tag}`);
  console.log(`Invite Link: ${inviteUrl()}`);

  if (voiceTickInterval) {
    clearInterval(voiceTickInterval);
  }

  voiceTickInterval = setInterval(() => {
    processVoiceLevelTick().catch((error) => {
      console.error("[Voice Tick Error]", error);
    });
  }, VOICE_TICK_MS);

  for (const guild of client.guilds.cache.values()) {
    const settings = getGuildSettings(guild.id);
    if (!settings.level) {
      continue;
    }

    await ensureLevelRoles(guild).catch(() => {});
    await syncTopLeaderRole(guild, null, settings).catch(() => {});
  }
});

client.on("guildMemberAdd", async (member) => {
  const settings = getGuildSettings(member.guild.id);
  const channel = getWelcomeChannel(member.guild, settings);

  if (settings.welcome && channel) {
    const embed = new EmbedBuilder()
      .setColor("#00b894")
      .setTitle("สมาชิกเข้าเซิร์ฟเวอร์")
      .setDescription(`ยินดีต้อนรับ ${member} เข้าสู่ **${member.guild.name}**`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();

    channel.send({ embeds: [embed] }).catch(() => {});
  }

  await restoreMemberState(member).catch(() => {});
});

client.on("guildMemberRemove", async (member) => {
  const settings = getGuildSettings(member.guild.id);
  if (settings.leave) {
    const channel = getLeaveChannel(member.guild, settings);
    if (channel) {
      const embed = new EmbedBuilder()
        .setColor("#d63031")
        .setTitle("สมาชิกออกจากเซิร์ฟเวอร์")
        .setDescription(`${member.user.tag} ออกจากเซิร์ฟเวอร์แล้ว`)
        .setThumbnail(member.user.displayAvatarURL())
        .setTimestamp();

      channel.send({ embeds: [embed] }).catch(() => {});
    }
  }

  if (settings.level) {
    await syncTopLeaderRole(member.guild).catch(() => {});
  }
});

client.on("voiceStateUpdate", async (oldState, newState) => {
  const guild = newState.guild;
  const settings = getGuildSettings(guild.id);
  const member = newState.member || oldState.member;

  if (!member || member.user.bot || !settings.voiceNotify.enabled) {
    return;
  }

  if (oldState.channelId === newState.channelId) {
    return;
  }

  const oldWasVoice = Boolean(oldState.channel && (
    oldState.channel.type === ChannelType.GuildVoice || oldState.channel.type === ChannelType.GuildStageVoice
  ));
  const newIsVoice = Boolean(newState.channel && (
    newState.channel.type === ChannelType.GuildVoice || newState.channel.type === ChannelType.GuildStageVoice
  ));

  if (!oldWasVoice && !newIsVoice) {
    return;
  }

  const logChannel = getVoiceNotifyLogChannel(guild, settings);
  if (!logChannel) {
    return;
  }

  let embed = null;

  if (!oldWasVoice && newIsVoice) {
    embed = new EmbedBuilder()
      .setColor("#2ecc71")
      .setTitle("แจ้งเตือนเข้าห้องเสียง")
      .setDescription(`${member} เข้าห้อง ${newState.channel}`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
  } else if (oldWasVoice && !newIsVoice) {
    embed = new EmbedBuilder()
      .setColor("#e74c3c")
      .setTitle("แจ้งเตือนออกห้องเสียง")
      .setDescription(`${member} ออกจากห้อง ${oldState.channel}`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
  } else if (oldWasVoice && newIsVoice) {
    embed = new EmbedBuilder()
      .setColor("#f1c40f")
      .setTitle("แจ้งเตือนย้ายห้องเสียง")
      .setDescription(`${member} ย้ายจาก ${oldState.channel} ไป ${newState.channel}`)
      .setThumbnail(member.user.displayAvatarURL())
      .setTimestamp();
  }

  if (embed) {
    logChannel.send({ embeds: [embed] }).catch(() => {});
  }
});

client.on("messageCreate", async (message) => {
  if (message.author.bot || !message.guild) {
    return;
  }

  if (message.content.trim().toLowerCase() !== "!panel") {
    return;
  }

  if (!isAdminMember(message.member)) {
    await message.reply("คำสั่งนี้ใช้ได้เฉพาะแอดมิน");
    return;
  }

  const settings = getGuildSettings(message.guild.id);
  settings.panelChannelId = message.channel.id;
  saveGuildSettings(message.guild.id, settings);

  if (settings.level) {
    await ensureLevelRoles(message.guild).catch(() => {});
    await syncTopLeaderRole(message.guild, null, settings).catch(() => {});
  }

  await message.channel.send({
    embeds: [buildPageMenuEmbed()],
    components: buildPageMenuRows()
  });
});

client.on("interactionCreate", async (interaction) => {
  if (!interaction.guild) {
    return;
  }

  if (interaction.isButton()) {
    const settings = getGuildSettings(interaction.guild.id);
    const isAdmin = isAdminMember(interaction.member);
    const buildNotifySettingsPayload = () => ({
      embeds: [buildNotifySettingsEmbed(interaction.guild)],
      components: buildNotifySettingsRows(interaction.guild)
    });

    if ([
      "toggle_welcome",
      "toggle_leave",
      "toggle_verify",
      "toggle_level",
      "toggle_voice_notify",
      "setup_level_roles",
      "clear_welcome_channel",
      "clear_leave_channel",
      "clear_voice_notify_channel",
      "clear_levelup_channel",
      "clear_registration_role"
    ].includes(interaction.customId) && !isAdmin) {
      await interaction.reply({ content: "ใช้ได้เฉพาะแอดมิน", ephemeral: true });
      return;
    }

    if (interaction.customId === "toggle_welcome") {
      settings.welcome = !settings.welcome;
      settings.panelChannelId = interaction.channelId || settings.panelChannelId;
      saveGuildSettings(interaction.guild.id, settings);
      await interaction.update({
        embeds: [buildPanelEmbed(interaction.guild)],
        components: buildPanelRows(interaction.guild)
      });
      return;
    }

    if (interaction.customId === "toggle_leave") {
      settings.leave = !settings.leave;
      settings.panelChannelId = interaction.channelId || settings.panelChannelId;
      saveGuildSettings(interaction.guild.id, settings);
      await interaction.update({
        embeds: [buildPanelEmbed(interaction.guild)],
        components: buildPanelRows(interaction.guild)
      });
      return;
    }

    if (interaction.customId === "toggle_verify") {
      settings.verify = !settings.verify;
      settings.panelChannelId = interaction.channelId || settings.panelChannelId;
      saveGuildSettings(interaction.guild.id, settings);
      await interaction.update({
        embeds: [buildPanelEmbed(interaction.guild)],
        components: buildPanelRows(interaction.guild)
      });
      return;
    }

    if (interaction.customId === "toggle_level") {
      settings.level = !settings.level;
      settings.panelChannelId = interaction.channelId || settings.panelChannelId;
      saveGuildSettings(interaction.guild.id, settings);

      if (settings.level) {
        await ensureLevelRoles(interaction.guild).catch(() => {});
        await syncTopLeaderRole(interaction.guild, null, settings).catch(() => {});
      }

      await interaction.update({
        embeds: [buildPanelEmbed(interaction.guild)],
        components: buildPanelRows(interaction.guild)
      });
      return;
    }

    if (interaction.customId === "toggle_voice_notify") {
      settings.voiceNotify.enabled = !settings.voiceNotify.enabled;
      settings.panelChannelId = interaction.channelId || settings.panelChannelId;
      saveGuildSettings(interaction.guild.id, settings);
      await interaction.update({
        embeds: [buildPanelEmbed(interaction.guild)],
        components: buildPanelRows(interaction.guild)
      });
      return;
    }

    if (interaction.customId === "clear_welcome_channel") {
      settings.welcomeChannelId = null;
      settings.panelChannelId = interaction.channelId || settings.panelChannelId;
      saveGuildSettings(interaction.guild.id, settings);
      await interaction.update(buildNotifySettingsPayload());
      return;
    }

    if (interaction.customId === "clear_leave_channel") {
      settings.leaveChannelId = null;
      settings.panelChannelId = interaction.channelId || settings.panelChannelId;
      saveGuildSettings(interaction.guild.id, settings);
      await interaction.update(buildNotifySettingsPayload());
      return;
    }

    if (interaction.customId === "clear_voice_notify_channel") {
      settings.voiceNotify.logChannelId = null;
      settings.panelChannelId = interaction.channelId || settings.panelChannelId;
      saveGuildSettings(interaction.guild.id, settings);
      await interaction.update(buildNotifySettingsPayload());
      return;
    }

    if (interaction.customId === "clear_levelup_channel") {
      settings.levelUpChannelId = null;
      settings.panelChannelId = interaction.channelId || settings.panelChannelId;
      saveGuildSettings(interaction.guild.id, settings);
      await interaction.update(buildNotifySettingsPayload());
      return;
    }

    if (interaction.customId === "clear_registration_role") {
      settings.registrationRoleId = null;
      settings.panelChannelId = interaction.channelId || settings.panelChannelId;
      saveGuildSettings(interaction.guild.id, settings);
      await interaction.update({
        embeds: [buildPanelEmbed(interaction.guild)],
        components: buildPanelRows(interaction.guild)
      });
      return;
    }

    if (interaction.customId === "setup_level_roles") {
      await interaction.deferReply({ ephemeral: true });

      try {
        await ensureLevelRoles(interaction.guild);
        await ensureTopLeaderRole(interaction.guild);
      } catch (error) {
        await interaction.editReply(getLevelSetupErrorMessage(error));
        return;
      }

      await interaction.guild.members.fetch().catch(() => {});

      const latestSettings = getGuildSettings(interaction.guild.id);
      const users = getGuildUsers(interaction.guild.id);
      let syncedCount = 0;

      for (const member of interaction.guild.members.cache.values()) {
        if (member.user.bot || !users[member.id]) {
          continue;
        }

        await syncMemberRankRole(member, users, latestSettings).catch(() => {});
        syncedCount += 1;
      }

      await syncTopLeaderRole(interaction.guild, users, latestSettings).catch(() => {});

      await refreshPanelMessage(interaction.message);
      await interaction.editReply(`สร้าง/ตรวจยศเลเวล ${LEVEL_ROLE_DEFINITIONS.length} ยศ พร้อมยศพิเศษอันดับ 1 แล้ว และซิงก์สมาชิก ${syncedCount} คน`);
      return;
    }

    if (interaction.customId === "invite_link") {
      await interaction.reply({
        content: `ลิงก์เชิญบอท:\n${inviteUrl()}`,
        ephemeral: true
      });
      return;
    }

    if (interaction.customId === "my_level") {
      const users = getGuildUsers(interaction.guild.id);
      const hadUser = Boolean(users[interaction.user.id]);
      const user = ensureUserRecord(users, interaction.user.id, settings);

      if (!hadUser) {
        saveGuildUsers(interaction.guild.id, users);
      }

      await syncMemberRankRole(interaction.member, users, settings).catch(() => {});
      await syncTopLeaderRole(interaction.guild, users, settings).catch(() => {});

      await interaction.reply({
        embeds: [buildLevelEmbed(interaction.member, user, settings)],
        ephemeral: true
      });
      return;
    }

    if (interaction.customId === "profile_form") {
      if (!settings.verify) {
        await interaction.reply({
          content: "ระบบกรอกข้อมูลถูกปิดอยู่ตอนนี้",
          ephemeral: true
        });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId("profile_modal")
        .setTitle("กรอกข้อมูลสมาชิก");

      const nameInput = new TextInputBuilder()
        .setCustomId("real_name")
        .setLabel("ชื่อ")
        .setPlaceholder("เช่น แจ็ค")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(30);

      const ageInput = new TextInputBuilder()
        .setCustomId("age")
        .setLabel("อายุ")
        .setPlaceholder("เช่น 20")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(3);

      const gameInput = new TextInputBuilder()
        .setCustomId("game_name")
        .setLabel("ชื่อตัวละคร")
        .setPlaceholder("เช่น HardcoreJack")
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMaxLength(40);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nameInput),
        new ActionRowBuilder().addComponents(ageInput),
        new ActionRowBuilder().addComponents(gameInput)
      );

      await interaction.showModal(modal);
    }
  }

  if (interaction.isStringSelectMenu()) {
    if (interaction.customId !== "panel_page_select") {
      return;
    }

    if (!isAdminMember(interaction.member)) {
      await interaction.reply({ content: "ใช้ได้เฉพาะแอดมิน", ephemeral: true });
      return;
    }

    const [selectedPage] = interaction.values;
    const settings = getGuildSettings(interaction.guild.id);
    settings.panelChannelId = interaction.channelId || settings.panelChannelId;
    saveGuildSettings(interaction.guild.id, settings);

    let payload = null;
    let successMessage = "ส่งหน้าที่เลือกแล้ว";

    if (selectedPage === "control_panel_page") {
      if (settings.level) {
        await ensureLevelRoles(interaction.guild).catch(() => {});
        await syncTopLeaderRole(interaction.guild, null, settings).catch(() => {});
      }

      payload = {
        embeds: [buildPanelEmbed(interaction.guild)],
        components: buildPanelRows(interaction.guild)
      };
      successMessage = "ส่งหน้าควบคุมระบบแล้ว";
    }

    if (selectedPage === "registration_page") {
      if (!settings.verify) {
        settings.verify = true;
        saveGuildSettings(interaction.guild.id, settings);
      }

      payload = {
        embeds: [buildRegistrationPageEmbed()],
        components: buildRegistrationPageRows()
      };
      successMessage = "ส่งหน้าลงทะเบียนสมาชิกแล้ว และเปิดระบบกรอกข้อมูลให้อัตโนมัติ";
    }

    if (selectedPage === "level_page") {
      payload = {
        embeds: [buildLevelPageEmbed(interaction.guild)],
        components: buildLevelPageRows()
      };
      successMessage = "ส่งหน้าเลเวลแล้ว";
    }

    if (selectedPage === "notify_settings_page") {
      payload = {
        embeds: [buildNotifySettingsEmbed(interaction.guild)],
        components: buildNotifySettingsRows(interaction.guild)
      };
      successMessage = "ส่งหน้าตั้งค่าห้องแจ้งเตือนแล้ว";
    }

    if (selectedPage === "voice_page") {
      payload = {
        embeds: [buildVoicePageEmbed(interaction.guild)]
      };
      successMessage = "ส่งหน้าห้องเสียงแล้ว";
    }

    if (!payload) {
      await interaction.reply({ content: "ไม่พบหน้าที่เลือก", ephemeral: true });
      return;
    }

    await interaction.channel.send(payload);
    await interaction.reply({ content: successMessage, ephemeral: true });
    return;
  }

  if (interaction.isChannelSelectMenu()) {
    if (![
      "select_welcome_channel",
      "select_leave_channel",
      "select_voice_notify_channel",
      "select_levelup_channel"
    ].includes(interaction.customId)) {
      return;
    }

    if (!isAdminMember(interaction.member)) {
      await interaction.reply({ content: "ใช้ได้เฉพาะแอดมิน", ephemeral: true });
      return;
    }

    const settings = getGuildSettings(interaction.guild.id);
    const selectedChannelId = interaction.values[0] || null;

    if (interaction.customId === "select_welcome_channel") {
      settings.welcomeChannelId = selectedChannelId;
    }

    if (interaction.customId === "select_leave_channel") {
      settings.leaveChannelId = selectedChannelId;
    }

    if (interaction.customId === "select_voice_notify_channel") {
      settings.voiceNotify.logChannelId = selectedChannelId;
    }

    if (interaction.customId === "select_levelup_channel") {
      settings.levelUpChannelId = selectedChannelId;
    }

    settings.panelChannelId = interaction.channelId || settings.panelChannelId;
    saveGuildSettings(interaction.guild.id, settings);

    await interaction.update({
      embeds: [buildNotifySettingsEmbed(interaction.guild)],
      components: buildNotifySettingsRows(interaction.guild)
    });
    return;
  }

  if (interaction.isRoleSelectMenu()) {
    if (interaction.customId !== "select_registration_role") {
      return;
    }

    if (!isAdminMember(interaction.member)) {
      await interaction.reply({ content: "ใช้ได้เฉพาะแอดมิน", ephemeral: true });
      return;
    }

    const settings = getGuildSettings(interaction.guild.id);
    const selectedRoleId = interaction.values[0] || null;

    settings.registrationRoleId = selectedRoleId === interaction.guild.id ? null : selectedRoleId;
    settings.panelChannelId = interaction.channelId || settings.panelChannelId;
    saveGuildSettings(interaction.guild.id, settings);

    await interaction.update({
      embeds: [buildPanelEmbed(interaction.guild)],
      components: buildPanelRows(interaction.guild)
    });
    return;
  }

  if (interaction.isModalSubmit()) {
    if (interaction.customId !== "profile_modal") {
      return;
    }

    const settings = getGuildSettings(interaction.guild.id);
    if (!settings.verify) {
      await interaction.reply({
        content: "ระบบกรอกข้อมูลถูกปิดอยู่ตอนนี้",
        ephemeral: true
      });
      return;
    }

    const name = interaction.fields.getTextInputValue("real_name").trim();
    const age = interaction.fields.getTextInputValue("age").trim();
    const gameName = interaction.fields.getTextInputValue("game_name").trim();

    if (!/^\d+$/.test(age)) {
      await interaction.reply({
        content: "กรุณากรอกอายุเป็นตัวเลขเท่านั้น",
        ephemeral: true
      });
      return;
    }

    const users = getGuildUsers(interaction.guild.id);
    const user = ensureUserRecord(users, interaction.user.id, settings);

    user.verified = true;
    user.name = name;
    user.age = age;
    user.gameName = gameName;
    user.verifiedAt = new Date().toISOString();

    saveGuildUsers(interaction.guild.id, users);

    const targetNickname = buildNickname(name, age, gameName);
    let nicknameChanged = false;
    let nicknameWarning = "";

    if (interaction.member.manageable) {
      try {
        await interaction.member.setNickname(targetNickname, "Member profile form submitted");
        nicknameChanged = true;
      } catch {
        nicknameWarning = "บอทไม่มีสิทธิ์เปลี่ยนชื่อในเซิร์ฟเวอร์";
      }
    } else {
      nicknameWarning = "บอทไม่มีสิทธิ์เปลี่ยนชื่อในเซิร์ฟเวอร์";
    }

    let verifiedRoleGranted = false;
    const registrationRole = getRegistrationRole(interaction.guild, settings);
    if (registrationRole) {
      await interaction.member.roles.add(registrationRole).then(() => {
        verifiedRoleGranted = true;
      }).catch(() => {});
    }

    await syncMemberRankRole(interaction.member, users, settings).catch(() => {});

    const responseLines = [
      "บันทึกข้อมูลเรียบร้อยแล้ว",
      `ชื่อ: ${name}`,
      `อายุ: ${age}`,
      `ชื่อตัวละคร: ${gameName}`,
      `ชื่อที่ระบบจะใช้: ${targetNickname}`
    ];

    if (nicknameChanged) {
      responseLines.push("เปลี่ยนชื่อในเซิร์ฟเวอร์ให้แล้ว");
    } else if (nicknameWarning) {
      responseLines.push(nicknameWarning);
    }

    if (verifiedRoleGranted) {
      responseLines.push(`ให้ยศแล้ว: ${registrationRole.name}`);
    } else if (registrationRole) {
      responseLines.push(`ยังให้ยศ ${registrationRole.name} ไม่ได้ ตรวจสิทธิ์ของบอทและลำดับยศอีกครั้ง`);
    }

    await interaction.reply({
      content: responseLines.join("\n"),
      ephemeral: true
    });
  }
});

if (!TOKEN) {
  console.log("กรุณาใส่ BOT_TOKEN ใน .env หรือ config.json ก่อน");
  process.exit(1);
}

client.login(TOKEN);
