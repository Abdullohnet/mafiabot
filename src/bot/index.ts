import { Telegraf, Markup } from "telegraf";
import { ROLES } from "./roles.js";
import {
  createGame, getGame, deleteGame, addPlayer, assignRoles,
  getAlivePlayers, getMafiaPlayers, getActiveDoctor, getActiveDetective,
  getPlayerByUserId, checkWinCondition, processVotes,
  type Game, type Player,
} from "./game.js";
import { logger } from "../lib/logger.js";

const MIN_PLAYERS = 4;
const NIGHT_SEC = 45;
const DAY_SEC = 60;
const VOTE_SEC = 60;

// ─── helpers ────────────────────────────────────────────────────────────────

function nameOf(p: Player) {
  return p.username ? `@${p.username}` : p.name;
}

async function tryDm(
  bot: Telegraf,
  userId: number,
  text: string,
  extra?: object,
): Promise<boolean> {
  try {
    await bot.telegram.sendMessage(userId, text, { parse_mode: "HTML", ...extra });
    return true;
  } catch {
    return false;
  }
}

async function tryDmPhoto(
  bot: Telegraf,
  userId: number,
  url: string,
  caption: string,
): Promise<boolean> {
  try {
    await bot.telegram.sendPhoto(userId, url, { caption, parse_mode: "HTML" });
    return true;
  } catch {
    // fallback to text
    return tryDm(bot, userId, caption);
  }
}

function lobbyKeyboard(game: Game) {
  return Markup.inlineKeyboard([
    [Markup.button.callback(`✋ Qo'shilish (${game.players.size})`, "join")],
    [Markup.button.callback("🎮 O'yinni boshlash", "do_start")],
  ]);
}

function aliveListText(game: Game) {
  return getAlivePlayers(game)
    .map((p, i) => `${i + 1}. ${p.name}${p.username ? ` (@${p.username})` : ""}`)
    .join("\n");
}

// ─── night ──────────────────────────────────────────────────────────────────

async function startNight(bot: Telegraf, game: Game) {
  game.phase = "night";
  game.round += 1;
  game.nightActions.clear();

  const alive = getAlivePlayers(game);
  const aliveTxt = aliveListText(game);

  await bot.telegram.sendMessage(
    game.chatId,
    `🌙 <b>${game.round}-kecha boshlanди!</b>\n\n` +
      `🔇 Hamma jim... kimdir harakat qilmoqda.\n\n` +
      `<b>Tirik o'yinchilar (${alive.length}):</b>\n${aliveTxt}\n\n` +
      `⏳ <b>${NIGHT_SEC} soniya</b> — lichkada o'z vazifangizni bajaring!`,
    { parse_mode: "HTML" },
  );

  // send night actions via DM
  await sendNightDms(bot, game);

  game.nightTimer = setTimeout(() => {
    resolveNight(bot, game).catch((e) => logger.error({ e }, "resolveNight error"));
  }, NIGHT_SEC * 1000);
}

async function sendNightDms(bot: Telegraf, game: Game) {
  const alive = getAlivePlayers(game);

  // --- mafia: pick kill target ---
  const mafiaLeader = getMafiaPlayers(game)[0];
  if (mafiaLeader) {
    const targets = alive.filter(
      (p) => !getMafiaPlayers(game).some((m) => m.userId === p.userId),
    );
    const btns = targets.map((p) => [
      Markup.button.callback(
        `☠️ ${p.name}`,
        `n:kill:${game.chatId}:${p.userId}`,
      ),
    ]);
    const ok = await tryDm(
      bot,
      mafiaLeader.userId,
      `🔴 <b>${ROLES[mafiaLeader.roleId].name}</b> — Kimni otasiz?\n\nSizning fraksiyangiz: ${getMafiaPlayers(game).map((m) => m.name).join(", ")}`,
      Markup.inlineKeyboard(btns),
    );
    if (!ok) {
      // notify mafia others
      for (const m of getMafiaPlayers(game).slice(1)) {
        await tryDm(
          bot,
          m.userId,
          `⚠️ ${mafiaLeader.name} lichka yopiq — qurbon tanlash o'rniga siz tanlang!`,
        );
      }
    }

    // notify other mafia members who the leader is
    for (const m of getMafiaPlayers(game).filter(
      (p) => p.userId !== mafiaLeader.userId,
    )) {
      await tryDm(
        bot,
        m.userId,
        `🔴 Kecha: ${mafiaLeader.name} qurbon tanlaydi. Natijani kutdingiz.`,
      );
    }
  }

  // --- doctor: pick save ---
  const doctor = getActiveDoctor(game);
  if (doctor) {
    const btns = alive.map((p) => [
      Markup.button.callback(
        `💊 ${p.name}`,
        `n:heal:${game.chatId}:${p.userId}`,
      ),
    ]);
    await tryDm(
      bot,
      doctor.userId,
      `🛡 <b>${ROLES[doctor.roleId].name}</b> — Kimni davolaysiz?`,
      Markup.inlineKeyboard(btns),
    );
  }

  // --- detective: pick check ---
  const det = getActiveDetective(game);
  if (det) {
    const btns = alive
      .filter((p) => p.userId !== det.userId)
      .map((p) => [
        Markup.button.callback(
          `🔍 ${p.name}`,
          `n:check:${game.chatId}:${p.userId}`,
        ),
      ]);
    await tryDm(
      bot,
      det.userId,
      `🔍 <b>${ROLES[det.roleId].name}</b> — Kimni tekshirasiz?`,
      Markup.inlineKeyboard(btns),
    );
  }

  // --- kabuto: spy ---
  const kabuto = [...game.players.values()].find(
    (p) => p.roleId === "kabuto" && p.alive,
  );
  if (kabuto) {
    const btns = alive
      .filter(
        (p) =>
          p.userId !== kabuto.userId &&
          !getMafiaPlayers(game).some((m) => m.userId === p.userId),
      )
      .map((p) => [
        Markup.button.callback(
          `🐍 ${p.name}`,
          `n:spy:${game.chatId}:${p.userId}`,
        ),
      ]);
    await tryDm(
      bot,
      kabuto.userId,
      `🐍 <b>Kabuto</b> — Kimning rolini aniqlaysiz?`,
      Markup.inlineKeyboard(btns),
    );
  }

  // --- subaru: watch ---
  const subaru = [...game.players.values()].find(
    (p) => p.roleId === "subaru" && p.alive,
  );
  if (subaru) {
    const btns = alive
      .filter((p) => p.userId !== subaru.userId)
      .map((p) => [
        Markup.button.callback(
          `👁 ${p.name}`,
          `n:watch:${game.chatId}:${p.userId}`,
        ),
      ]);
    await tryDm(
      bot,
      subaru.userId,
      `👁 <b>Subaru</b> — Kimni kuzatasiz?`,
      Markup.inlineKeyboard(btns),
    );
  }

  // --- obito (awakened): kill ---
  if (game.obitoAwakened) {
    const obito = [...game.players.values()].find(
      (p) => p.roleId === "obito" && p.alive,
    );
    if (obito) {
      const btns = alive
        .filter((p) => p.userId !== obito.userId)
        .map((p) => [
          Markup.button.callback(
            `🌀 ${p.name}`,
            `n:maniac:${game.chatId}:${p.userId}`,
          ),
        ]);
      await tryDm(
        bot,
        obito.userId,
        `🌀 <b>Obito — Maniak!</b> Kimni yo'q qilasiz?`,
        Markup.inlineKeyboard(btns),
      );
    }
  }
}

async function resolveNight(bot: Telegraf, game: Game) {
  if (game.phase !== "night") return;
  if (game.nightTimer) clearTimeout(game.nightTimer);

  const killAction = game.nightActions.get("kill");
  const healAction = game.nightActions.get("heal");
  const maniacAction = game.nightActions.get("maniac");
  const watchAction = game.nightActions.get("watch");

  const deaths: Player[] = [];
  const msgs: string[] = [];

  // resolve mafia kill
  if (killAction?.targetId != null) {
    const target = getPlayerByUserId(game, killAction.targetId);
    if (target?.alive) {
      const isHealed = healAction?.targetId === target.userId;
      const sukuna = getMafiaPlayers(game).find((p) => p.roleId === "sukuna");
      const bypass = !!sukuna && !game.sukunaBypassUsed;

      if (isHealed && !bypass) {
        msgs.push(
          `🛡 <b>Doktor kimnidir o'limdan qutqardi!</b> (Kim ekani sir...)`,
        );
      } else {
        if (bypass) game.sukunaBypassUsed = true;

        if (target.roleId === "guts") {
          const killer = getMafiaPlayers(game)[0];
          if (killer) {
            killer.alive = false;
            deaths.push(killer);
          }
          target.alive = false;
          deaths.push(target);
          msgs.push(`⚔️ <b>Guts o'ldi — lekin qotilni ham birga olib ketdi!</b>`);
        } else if (target.roleId === "erwin" && game.erwinShielded) {
          game.erwinShielded = false;
          msgs.push(`🎖 <b>Erwin bu safar himoyalangan edi!</b> Keyingisiga tayyor emas.`);
        } else {
          target.alive = false;
          deaths.push(target);
          onPlayerDeath(game, target, bot);
        }
      }
    }
  }

  // resolve obito kill
  if (maniacAction?.targetId != null) {
    const t = getPlayerByUserId(game, maniacAction.targetId);
    if (t?.alive && t.userId !== killAction?.targetId) {
      t.alive = false;
      deaths.push(t);
      onPlayerDeath(game, t, bot);
    }
  }

  // subaru watch result
  if (watchAction?.targetId != null) {
    const watched = getPlayerByUserId(game, watchAction.targetId);
    const killerPlayer = getPlayerByUserId(
      game,
      killAction?.actorId ?? 0,
    );
    const watcherPlayer = getPlayerByUserId(game, watchAction.actorId);
    if (watcherPlayer && watched) {
      const visitedWatched = killAction?.targetId === watched.userId;
      const msg = visitedWatched && killerPlayer
        ? `👁 <b>Kuzatuv:</b> Bu kecha <b>${killerPlayer.name}</b> → ${watched.name} ga bordi.`
        : `👁 <b>Kuzatuv:</b> Bu kecha ${watched.name} ga hech kim bormadi.`;
      await tryDm(bot, watcherPlayer.userId, msg);
    }
  }

  // build report
  let report = `🌅 <b>${game.round}-kecha natijasi:</b>\n\n`;
  if (deaths.length === 0 && msgs.length === 0) {
    report += `😌 Bu kecha hech kim o'lmadi!`;
  } else {
    if (msgs.length) report += msgs.join("\n") + "\n\n";
    for (const d of deaths) {
      const role = ROLES[d.roleId];
      const hidden = d.roleId === "muzan";
      report += `💀 <b>${d.name}</b> o'ldirildi!`;
      if (!hidden) report += ` (${role.emoji} ${role.name})`;
      report += "\n";
    }
  }

  await bot.telegram.sendMessage(game.chatId, report, { parse_mode: "HTML" });

  const winner = checkWinCondition(game);
  if (winner) return endGame(bot, game, winner);

  // start day
  await startDay(bot, game);
}

// ─── day & voting ────────────────────────────────────────────────────────────

async function startDay(bot: Telegraf, game: Game) {
  game.phase = "day";
  const alive = getAlivePlayers(game);

  await bot.telegram.sendMessage(
    game.chatId,
    `☀️ <b>Kunduz boshlandi! Muhokama qiling.</b>\n\n` +
      `<b>Tirik (${alive.length}):</b>\n${aliveListText(game)}\n\n` +
      `⏳ ${DAY_SEC} soniyadan so'ng ovoz berish boshlanadi.`,
    { parse_mode: "HTML" },
  );

  game.dayTimer = setTimeout(() => {
    startVoting(bot, game).catch((e) =>
      logger.error({ e }, "startVoting error"),
    );
  }, DAY_SEC * 1000);
}

async function startVoting(bot: Telegraf, game: Game) {
  if (game.phase !== "day") return;
  if (game.dayTimer) clearTimeout(game.dayTimer);
  game.phase = "voting";
  game.votes.clear();

  const alive = getAlivePlayers(game);
  const btns = alive.map((p) => [
    Markup.button.callback(`${p.name}`, `vote:${game.chatId}:${p.userId}`),
  ]);

  await bot.telegram.sendMessage(
    game.chatId,
    `🗳 <b>KIM CHIQARILSIN?</b>\n\n` +
      `Har bir o'yinchi <b>bir marta</b> ovoz beradi.\n⏳ ${VOTE_SEC} soniya!`,
    { parse_mode: "HTML", ...Markup.inlineKeyboard(btns) },
  );

  game.nightTimer = setTimeout(() => {
    resolveVoting(bot, game).catch((e) =>
      logger.error({ e }, "resolveVoting error"),
    );
  }, VOTE_SEC * 1000);
}

async function resolveVoting(bot: Telegraf, game: Game) {
  if (game.phase !== "voting") return;
  if (game.nightTimer) clearTimeout(game.nightTimer);

  const eliminatedId = processVotes(game);
  let msg = "";

  if (!eliminatedId) {
    msg = `🤝 <b>Ovozlar teng tushdi!</b> Hech kim chiqarilmadi.`;
  } else {
    const p = getPlayerByUserId(game, eliminatedId);
    if (p?.alive) {
      p.alive = false;
      const hidden = p.roleId === "muzan";
      const role = ROLES[p.roleId];
      msg = `⚖️ <b>Xalq qaror qildi!</b>\n\n💀 <b>${p.name}</b> chiqarildi!`;
      if (!hidden) msg += `\nRoli: ${role.emoji} <b>${role.name}</b>`;
      onPlayerDeath(game, p, bot);
    }
  }

  await bot.telegram.sendMessage(game.chatId, msg || "⚠️ Natija yo'q.", {
    parse_mode: "HTML",
  });

  const winner = checkWinCondition(game);
  if (winner) return endGame(bot, game, winner);

  await startNight(bot, game);
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function onPlayerDeath(game: Game, p: Player, _bot: Telegraf) {
  if (p.roleId === "rin") {
    game.rinDead = true;
    const obito = [...game.players.values()].find(
      (o) => o.roleId === "obito" && o.alive,
    );
    if (obito) {
      game.obitoAwakened = true;
      tryDm(
        _bot,
        obito.userId,
        `🌀 <b>Rin o'ldirildi! Sen endi Maniakka aylandingiz!</b>\nHar kecha bitta o'yinchini yo'q qila olasiz!`,
      ).catch(() => {});
    }
  }
  if (p.roleId === "tomioka") game.tomiokaDead = true;
  if (p.roleId === "rengoku") game.rengokuDead = true;
  if (p.roleId === "tsunade") game.tsunadeDead = true;
}

async function endGame(
  bot: Telegraf,
  game: Game,
  winner: "mafia" | "town" | "obito",
) {
  game.phase = "ended";

  const titles: Record<string, string> = {
    mafia:
      `🔴 <b>MAFIYA KLAN G'ALABA QOZONDI!</b>\n\nZulmat kuchlari shaharni egallab oldi!`,
    town:
      `🔵 <b>SHAHAR HIMOYACHILARI G'ALABA QOZONDI!</b>\n\nTinchlik tiklandi!`,
    obito: `🌀 <b>OBITO G'ALABA QOZONDI!</b>\n\nManiak hamma ni yo'q qildi!`,
  };

  const allRoles = [...game.players.values()]
    .map((p) => {
      const r = ROLES[p.roleId];
      return `${p.alive ? "✅" : "💀"} ${p.name} — ${r.emoji} ${r.name}`;
    })
    .join("\n");

  let txt = (titles[winner] ?? "") + `\n\n<b>Barcha rollar:</b>\n${allRoles}`;

  // zero two bonus win
  const zerotwo = [...game.players.values()].find(
    (p) => p.roleId === "zerotwo",
  );
  const hiro = [...game.players.values()].find((p) => p.roleId === "hiro");
  if (zerotwo && !zerotwo.alive && hiro?.alive && winner === "town") {
    txt += `\n\n🌺 <b>Zero Two ham g'alaba qozondi!</b> (Hiro omon qoldi)`;
  }

  await bot.telegram.sendMessage(game.chatId, txt, { parse_mode: "HTML" });
  deleteGame(game.chatId);
}

// ─── send role DM ─────────────────────────────────────────────────────────────

async function sendRoleDm(
  bot: Telegraf,
  player: Player,
  game: Game,
): Promise<boolean> {
  const role = ROLES[player.roleId];
  const faction =
    role.faction === "mafia"
      ? "🔴 Mafiya Klani"
      : role.faction === "neutral"
        ? "🟡 Betaraf"
        : "🔵 Shahar Himoyachilari";

  const mafiaInfo =
    role.faction === "mafia"
      ? `\n\n👥 <b>Mafiya sheriklaringiz:</b>\n${getMafiaPlayers(game).map((m) => `${ROLES[m.roleId].emoji} ${m.name} — ${ROLES[m.roleId].name}`).join("\n")}`
      : "";

  const caption =
    `🎭 <b>Sizning rolingiz:</b>\n\n` +
    `${role.emoji} <b>${role.name}</b>\n` +
    `${faction}\n\n` +
    `📖 ${role.description}\n\n` +
    `⚡ <b>Qobiliyat:</b> ${role.ability}` +
    mafiaInfo;

  return tryDmPhoto(bot, player.userId, role.imageUrl, caption);
}

// ─── bot setup ───────────────────────────────────────────────────────────────

export function setupBot(token: string): Telegraf {
  const bot = new Telegraf(token);

  // ── /start ──
  bot.command("start", async (ctx) => {
    const isPrivate = ctx.chat.type === "private";
    await ctx.reply(
      `👁 <b>MAFIA KLAN — Zulmat Kuchlari</b>\n\n` +
        (isPrivate
          ? `✅ Siz DM ni yoqdingiz! Endi guruh chatda o'yinga qo'shilishingiz mumkin.\n\n`
          : "") +
        `<b>Guruhda o'yin boshlash uchun:</b>\n` +
        `1️⃣ /newgame — yangi o'yin yaratish\n` +
        `2️⃣ Inline tugma orqali qo'shilish\n` +
        `3️⃣ /startgame — o'yinni boshlash\n\n` +
        `<b>Buyruqlar:</b>\n` +
        `/newgame | /startgame | /endgame | /players\n` +
        `/deathnote @username — Light Yagami maxsus qobiliyati\n\n` +
        `<i>Minimal: ${MIN_PLAYERS} o'yinchi. Kamida 1 Mafia, 1 Doktor bo'lishi kerak.</i>`,
      { parse_mode: "HTML" },
    );
  });

  bot.command("help", (ctx) =>
    ctx.reply(
      `❓ <b>Mafia Klan — Qo'llanma</b>\n\n` +
        `<b>Fraksiyalar:</b>\n` +
        `🔴 Mafiya — shaharni egallash\n` +
        `🔵 Shahar — mafiyani topib yo'q qilish\n` +
        `🟡 Betaraf — o'z maqsadi\n\n` +
        `<b>G'alaba:</b>\n` +
        `Shahar: barcha mafia yo'q qilinsa\n` +
        `Mafia: soni shahar ≥ mafiya bo'lsa\n\n` +
        `⚠️ Rol olish uchun avval botga <b>lichkada /start</b> yuboring!`,
      { parse_mode: "HTML" },
    ),
  );

  // ── /newgame ──
  bot.command("newgame", async (ctx) => {
    if (ctx.chat.type === "private")
      return void ctx.reply("⚠️ Bu buyruq faqat guruh chatda ishlaydi!");

    const chatId = ctx.chat.id;
    if (getGame(chatId))
      return void ctx.reply(
        "⚠️ Allaqachon o'yin bor! /endgame bilan bekor qiling.",
      );

    const game = createGame(chatId, ctx.from.id);
    addPlayer(game, ctx.from.id, ctx.from.username ?? "", ctx.from.first_name);

    await ctx.reply(
      `👁 <b>MAFIA KLAN o'yini yaratildi!</b>\n\n` +
        `Yaratuvchi: <b>${ctx.from.first_name}</b>\n\n` +
        `✋ <b>Qo'shilish uchun quyidagi tugmani bosing!</b>\n` +
        `⚠️ Avval botga lichkada /start yubormagan bo'lsangiz, <a href="https://t.me/${ctx.botInfo.username}">shu yerga bosing</a> va /start yuboring!\n\n` +
        `O'yinchilar (1): ${ctx.from.first_name}`,
      {
        parse_mode: "HTML",
        ...Markup.inlineKeyboard([
          [Markup.button.callback(`✋ Qo'shilish (1)`, "join")],
          [Markup.button.callback("🎮 O'yinni boshlash", "do_start")],
        ]),
      },
    );
  });

  // ── /players ──
  bot.command("players", async (ctx) => {
    if (ctx.chat.type === "private") return;
    const game = getGame(ctx.chat.id);
    if (!game) return void ctx.reply("⚠️ Faol o'yin yo'q.");
    await ctx.reply(
      `📋 <b>O'yinchilar (${game.players.size}):</b>\n\n` +
        [...game.players.values()]
          .map((p, i) => `${i + 1}. ${p.name}`)
          .join("\n"),
      { parse_mode: "HTML" },
    );
  });

  // ── /startgame ──
  bot.command("startgame", async (ctx) => {
    if (ctx.chat.type === "private") return;
    const game = getGame(ctx.chat.id);
    if (!game) return void ctx.reply("⚠️ Faol o'yin yo'q.");
    if (game.phase !== "lobby")
      return void ctx.reply("⚠️ O'yin allaqachon boshlangan!");
    if (ctx.from.id !== game.hostId)
      return void ctx.reply("⚠️ Faqat o'yin yaratuvchisi boshlay oladi!");
    if (game.players.size < MIN_PLAYERS)
      return void ctx.reply(
        `⚠️ Kamida ${MIN_PLAYERS} o'yinchi kerak! (hozir: ${game.players.size})`,
      );
    await launchGame(bot, game, ctx.chat.id);
  });

  // ── /endgame ──
  bot.command("endgame", async (ctx) => {
    if (ctx.chat.type === "private") return;
    const game = getGame(ctx.chat.id);
    if (!game) return void ctx.reply("⚠️ Faol o'yin yo'q.");
    if (ctx.from.id !== game.hostId)
      return void ctx.reply("⚠️ Faqat host bekor qila oladi!");
    deleteGame(ctx.chat.id);
    await ctx.reply("❌ <b>O'yin bekor qilindi!</b>", { parse_mode: "HTML" });
  });

  // ── /deathnote ──
  bot.command("deathnote", async (ctx) => {
    if (ctx.chat.type === "private") return;
    const game = getGame(ctx.chat.id);
    if (!game || game.phase !== "day") return;
    const player = getPlayerByUserId(game, ctx.from.id);
    if (!player || player.roleId !== "light" || !player.alive) return;
    if (player.hasUsedSpecial)
      return void ctx.reply("📓 Death Note bir marta ishlatiladi!");

    const raw = ctx.message.text?.split(" ")[1]?.replace("@", "");
    if (!raw) return void ctx.reply("📓 /deathnote @username");
    const target = [...game.players.values()].find(
      (p) => p.username === raw && p.alive,
    );
    if (!target)
      return void ctx.reply("⚠️ Bunday o'yinchi yo'q yoki tirik emas.");

    player.hasUsedSpecial = true;
    target.alive = false;
    onPlayerDeath(game, target, bot);

    const role = ROLES[target.roleId];
    await ctx.reply(
      `📓 <b>Death Note ishlatildi!</b>\n\n💀 <b>${target.name}</b> o'ldirildi!\nRoli: ${role.emoji} ${role.name}`,
      { parse_mode: "HTML" },
    );

    const winner = checkWinCondition(game);
    if (winner) return endGame(bot, game, winner);
  });

  // ── callback_query ──
  bot.on("callback_query", async (ctx) => {
    const data = (ctx.callbackQuery as { data?: string }).data ?? "";
    const fromId = ctx.from.id;
    const chatId = ctx.chat?.id;

    // ─ JOIN button (in group) ─
    if (data === "join") {
      if (!chatId) return void ctx.answerCbQuery("Xatolik!");
      const game = getGame(chatId);
      if (!game) return void ctx.answerCbQuery("O'yin topilmadi.");
      if (game.phase !== "lobby")
        return void ctx.answerCbQuery("O'yin boshlangan!");

      const name = ctx.from.first_name;
      const username = ctx.from.username ?? "";
      const added = addPlayer(game, fromId, username, name);
      if (!added) return void ctx.answerCbQuery("Siz allaqachon o'yindasiz!");

      const count = game.players.size;
      try {
        await ctx.editMessageReplyMarkup(
          Markup.inlineKeyboard([
            [Markup.button.callback(`✋ Qo'shilish (${count})`, "join")],
            [Markup.button.callback("🎮 O'yinni boshlash", "do_start")],
          ]).reply_markup,
        );
      } catch { /* message may not be editable */ }

      await ctx.answerCbQuery(`✅ ${name} qo'shildi!`);

      // announce in chat
      const list = [...game.players.values()].map((p) => p.name).join(", ");
      await bot.telegram
        .sendMessage(
          chatId,
          `✋ <b>${name}</b> qo'shildi! (${count}/${MIN_PLAYERS} min)\nO'yinchilar: ${list}`,
          { parse_mode: "HTML" },
        )
        .catch(() => {});
      return;
    }

    // ─ START button (in group) ─
    if (data === "do_start") {
      if (!chatId) return void ctx.answerCbQuery("Xatolik!");
      const game = getGame(chatId);
      if (!game) return void ctx.answerCbQuery("O'yin topilmadi.");
      if (game.phase !== "lobby")
        return void ctx.answerCbQuery("O'yin allaqachon boshlangan!");
      if (fromId !== game.hostId)
        return void ctx.answerCbQuery(
          "Faqat o'yin yaratuvchisi boshlaydi!",
        );
      if (game.players.size < MIN_PLAYERS)
        return void ctx.answerCbQuery(
          `Kamida ${MIN_PLAYERS} kishi kerak! (hozir: ${game.players.size})`,
        );
      await ctx.answerCbQuery("O'yin boshlanmoqda...");
      await launchGame(bot, game, chatId);
      return;
    }

    // ─ NIGHT actions (from DM) ─
    if (data.startsWith("n:")) {
      const parts = data.split(":");
      // n:action:chatId:targetId
      const action = parts[1];
      const gChatId = parseInt(parts[2]);
      const targetId = parseInt(parts[3]);

      const game = getGame(gChatId);
      if (!game) return void ctx.answerCbQuery("O'yin tugagan!");
      if (game.phase !== "night")
        return void ctx.answerCbQuery("Kecha tugagan!");

      const actor = getPlayerByUserId(game, fromId);
      if (!actor?.alive)
        return void ctx.answerCbQuery("Siz o'yinda emassiz!");

      if (action === "kill") {
        const isMafia = ROLES[actor.roleId].faction === "mafia";
        if (!isMafia)
          return void ctx.answerCbQuery(
            "Bu qobiliyat sizga tegishli emas!",
          );
        if (game.nightActions.has("kill"))
          return void ctx.answerCbQuery("Nishon allaqachon belgilangan!");
        game.nightActions.set("kill", { actorId: fromId, targetId });
        const target = getPlayerByUserId(game, targetId);
        await ctx.answerCbQuery(`✅ Nishon: ${target?.name}`);
        // notify all mafia
        for (const m of getMafiaPlayers(game)) {
          await tryDm(
            bot,
            m.userId,
            `🔴 <b>Kecha nishon:</b> ${target?.name}`,
          );
        }
        // check if all key night actions done → early resolve
        checkEarlyResolve(bot, game);
      } else if (action === "heal") {
        if (!["tsunade", "unahana"].includes(actor.roleId))
          return void ctx.answerCbQuery(
            "Bu qobiliyat sizga tegishli emas!",
          );
        game.nightActions.set("heal", { actorId: fromId, targetId });
        const target = getPlayerByUserId(game, targetId);
        await ctx.answerCbQuery(`💊 ${target?.name} davolanadi!`);
        checkEarlyResolve(bot, game);
      } else if (action === "check") {
        if (!["tomioka", "rengoku", "erwin"].includes(actor.roleId))
          return void ctx.answerCbQuery(
            "Bu qobiliyat sizga tegishli emas!",
          );
        game.nightActions.set("check", { actorId: fromId, targetId });
        const target = getPlayerByUserId(game, targetId);
        const role = ROLES[target!.roleId];
        const faction =
          role.faction === "mafia" ? "🔴 MAFIA" : "🔵 SHAHAR";
        await ctx.answerCbQuery("🔍 Tekshirildi!");
        await tryDm(
          bot,
          fromId,
          `🔍 <b>Natija:</b> ${target?.name} — ${role.emoji} ${role.name} (${faction})`,
        );
        checkEarlyResolve(bot, game);
      } else if (action === "spy") {
        if (actor.roleId !== "kabuto")
          return void ctx.answerCbQuery(
            "Bu qobiliyat sizga tegishli emas!",
          );
        game.nightActions.set("spy", { actorId: fromId, targetId });
        const target = getPlayerByUserId(game, targetId);
        const role = ROLES[target!.roleId];
        await ctx.answerCbQuery("🐍 Tekshirildi!");
        await tryDm(
          bot,
          fromId,
          `🐍 ${target?.name} — ${role.emoji} ${role.name}`,
        );
        const madara = [...game.players.values()].find(
          (p) => p.roleId === "madara" && p.alive,
        );
        if (madara)
          await tryDm(
            bot,
            madara.userId,
            `🐍 <b>Kabuto razvedkasi:</b> ${target?.name} — ${role.emoji} ${role.name}`,
          );
      } else if (action === "watch") {
        if (actor.roleId !== "subaru")
          return void ctx.answerCbQuery(
            "Bu qobiliyat sizga tegishli emas!",
          );
        game.nightActions.set("watch", { actorId: fromId, targetId });
        await ctx.answerCbQuery("👁 Kuzatuv o'rnatildi!");
      } else if (action === "maniac") {
        if (actor.roleId !== "obito" || !game.obitoAwakened)
          return void ctx.answerCbQuery(
            "Bu qobiliyat sizga tegishli emas!",
          );
        game.nightActions.set("maniac", { actorId: fromId, targetId });
        const target = getPlayerByUserId(game, targetId);
        await ctx.answerCbQuery(`🌀 ${target?.name} nishonga olindi!`);
        checkEarlyResolve(bot, game);
      }
      return;
    }

    // ─ VOTE (in group) ─
    if (data.startsWith("vote:")) {
      const parts = data.split(":");
      const gChatId = parseInt(parts[1]);
      const targetId = parseInt(parts[2]);
      const game = getGame(gChatId);
      if (!game) return void ctx.answerCbQuery("O'yin tugagan!");
      if (game.phase !== "voting")
        return void ctx.answerCbQuery("Ovoz berish tugagan!");
      const voter = getPlayerByUserId(game, fromId);
      if (!voter?.alive)
        return void ctx.answerCbQuery("Siz o'yinchi emassiz!");
      if (game.votes.has(fromId))
        return void ctx.answerCbQuery("Allaqachon ovoz berdingiz!");
      const target = getPlayerByUserId(game, targetId);
      if (!target?.alive)
        return void ctx.answerCbQuery("Bu o'yinchi tirik emas!");

      game.votes.set(fromId, targetId);
      const vCount = [...game.votes.values()].filter(
        (v) => v === targetId,
      ).length;
      await ctx.answerCbQuery(
        `✅ ${target.name} ga ovoz berdingiz! (${vCount} ovoz)`,
      );

      // announce vote in group
      await bot.telegram
        .sendMessage(
          gChatId,
          `🗳 <b>${voter.name}</b> → ${target.name} (${vCount} ovoz)`,
          { parse_mode: "HTML" },
        )
        .catch(() => {});

      // if everyone voted → resolve early
      if (game.votes.size >= getAlivePlayers(game).length) {
        if (game.nightTimer) clearTimeout(game.nightTimer);
        await resolveVoting(bot, game);
      }
      return;
    }

    await ctx.answerCbQuery();
  });

  bot.catch((err: unknown) => {
    logger.error({ err }, "Bot error");
  });

  return bot;
}

// ─── launch game ─────────────────────────────────────────────────────────────

async function launchGame(bot: Telegraf, game: Game, chatId: number) {
  game.phase = "night"; // temporary to prevent double-start
  assignRoles(game);
  game.phase = "lobby";

  await bot.telegram.sendMessage(
    chatId,
    `🎮 <b>MAFIA KLAN O'YINI BOSHLANMOQDA!</b>\n\n` +
      `👥 ${game.players.size} ta o'yinchi\n\n` +
      `📩 Har bir o'yinchi <b>lichkada</b> o'z rolini oladi.\n` +
      `⚠️ Agar DM olmagan bo'lsangiz: <b>avval botga /start yuboring!</b>`,
    { parse_mode: "HTML" },
  );

  // send roles
  const failed: string[] = [];
  for (const p of game.players.values()) {
    const ok = await sendRoleDm(bot, p, game);
    if (!ok) failed.push(p.name);
  }

  if (failed.length) {
    await bot.telegram.sendMessage(
      chatId,
      `⚠️ Quyidagi o'yinchilar <b>DM yopiq</b> — ular rol olishdi emas:\n${failed.join(", ")}\n\nUlar avval botga lichkada /start yuborishlari kerak!`,
      { parse_mode: "HTML" },
    );
  }

  // short delay then start night
  await new Promise((r) => setTimeout(r, 2000));
  await startNight(bot, game);
}

// ─── early resolve helper ─────────────────────────────────────────────────────

function checkEarlyResolve(bot: Telegraf, game: Game) {
  if (game.phase !== "night") return;

  const hasKill = game.nightActions.has("kill");
  const doctor = getActiveDoctor(game);
  const hasHeal = !doctor || game.nightActions.has("heal");
  const det = getActiveDetective(game);
  const hasCheck = !det || game.nightActions.has("check");

  if (hasKill && hasHeal && hasCheck) {
    if (game.nightTimer) clearTimeout(game.nightTimer);
    resolveNight(bot, game).catch((e) =>
      logger.error({ e }, "resolveNight early error"),
    );
  }
}
