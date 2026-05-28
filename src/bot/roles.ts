export type RoleId =
  | "madara" | "aizen" | "sukuna" | "muzan" | "light" | "kabuto"
  | "tsunade" | "unahana" | "tomioka" | "rengoku" | "erwin"
  | "subaru" | "obito" | "guts"
  | "rin" | "zerotwo" | "hiro" | "marin" | "takimichi" | "mayki";

export type Faction = "mafia" | "town" | "neutral";

export interface Role {
  id: RoleId;
  name: string;
  emoji: string;
  faction: Faction;
  description: string;
  ability: string;
  imageUrl: string;
  isSpecial?: boolean;
}

export const ROLES: Record<RoleId, Role> = {
  madara: {
    id: "madara", name: "Madara Uchiha", emoji: "👁", faction: "mafia",
    description: '"Bu dunyo faqat azobdan iborat." Klan yetakchisi.',
    ability: "Har kecha Mafiya qurbon tanlaydi. Madara yakuniy qarorni qabul qiladi.",
    imageUrl: "https://giantart.com/cdn/shop/files/CA15880629_c15_mfw_square_square.jpg?v=1727475382&width=1500",
  },
  aizen: {
    id: "aizen", name: "Aizen", emoji: "🦋", faction: "mafia",
    description: '"Siz qachondan beri meni aldashga qodir deb o\'yladingiz?" Hiyla ustasi.',
    ability: "O'yin davomida bir marta ovoz berish natijasini o'zgartira oladi.",
    imageUrl: "https://images4.alphacoders.com/951/thumbbig-951758.webp",
  },
  sukuna: {
    id: "sukuna", name: "Sukuna", emoji: "👹", faction: "mafia",
    description: '"Lazzatlanish vaqti keldi." Lanatlar qiroli.',
    ability: "Shavqatsiz hujumchi. Uni doktor qutqara olmaydi (bir kecha bypass).",
    imageUrl: "https://w0.peakpx.com/wallpaper/369/634/HD-wallpaper-jujutsu-kaisen-ryomen-sukuna-thumbnail.jpg",
  },
  muzan: {
    id: "muzan", name: "Muzan", emoji: "🩸", faction: "mafia",
    description: '"Menga qarshi chiqqanlar quyosh nurini ko\'rmaydi." Yashirin qotil.',
    ability: "Kunduz chiqarilsa ham uning roli oshkor qilinmaydi.",
    imageUrl: "https://poggers.com/cdn/shop/articles/7b2ca31ce50d06961ea98e7cd2c21a94_14681963-f674-407d-9064-fc593862e00e_1000x562_crop_center.webp?v=1762891165",
  },
  light: {
    id: "light", name: "Light Yagami", emoji: "📓", faction: "mafia",
    description: '"Men yangi dunyo xudosiman!" Adolat niqobidagi qotil.',
    ability: "O'yin davomida bir marta ovozlanishsiz kimnidir yo'q qila oladi (Death Note).",
    imageUrl: "https://static0.cbrimages.com/wordpress/wp-content/uploads/2022/11/Light-Yagami-Laughs-At-Task-Force-After-Admitting-He-Is-Kira-Death-Note.jpg?q=50&fit=crop&w=825&dpr=1.5",
  },
  kabuto: {
    id: "kabuto", name: "Kabuto Yakushi", emoji: "🐍", faction: "mafia",
    description: '"Men kimning tomonidaman? Buni faqat men bilaman." Mafiyaning ayg\'oqchisi.',
    ability: "Har kecha bitta o'yinchining asl rolini tekshiradi va Madaraga yetkazadi.",
    imageUrl: "https://www.behindthevoiceactors.com/_img/chars/thumbs/kabuto-yakushi-naruto-the-broken-bond-5.36_thumb.jpg",
  },
  tsunade: {
    id: "tsunade", name: "Tsunade", emoji: "🛡", faction: "town",
    description: '"Hech kim mening ko\'z o\'ngimda o\'lmaydi!" Beshinchi Hokage.',
    ability: "Har kecha bitta o'yinchini o'limdan saqlab qoladi. O'zini ham davolashi mumkin.",
    imageUrl: "https://i.pinimg.com/originals/03/18/4a/03184af627f32125179a78b0f876de55.jpg",
  },
  unahana: {
    id: "unahana", name: "Unahana", emoji: "🌸", faction: "town",
    description: '"Tabassum ortidagi o\'lim sharpasi."',
    ability: "Tsunade o'lsa uning o'rnini egallaydi — har kecha bitta o'yinchini davolaydi.",
    imageUrl: "https://preview.redd.it/retsu-unohana-fanart-v0-53mrsddkqq4d1.jpeg?width=640&crop=smart&auto=webp&s=5bb60797527a2b77eb9e173348b4aa9c56a896db",
  },
  tomioka: {
    id: "tomioka", name: "Tomioka", emoji: "🌊", faction: "town",
    description: '"Men bilan do\'stlashish shart emas, vazifamni bajarsam bo\'ldi."',
    ability: "Har kecha bitta o'yinchining rolini aniqlaydi.",
    imageUrl: "https://daweebstop.com/cdn/shop/products/t3.webp?v=1650483460&width=1946",
  },
  rengoku: {
    id: "rengoku", name: "Rengoku", emoji: "🔥", faction: "town",
    description: '"Yuragingni olovlantir!"',
    ability: "Tomioka o'lsa uning vazifasini o'z zimmasiga oladi — bitta o'yinchining rolini aniqlaydi.",
    imageUrl: "https://poggers.com/cdn/shop/files/Demon-Slayer-Flame-Breathing-Kyojuro-Rengoku-Figure-18-Scale-Kotobukiya-ArtFX-J-Series_medium.webp?v=1760462092",
  },
  erwin: {
    id: "erwin", name: "Erwin Smith", emoji: "🎖", faction: "town",
    description: '"Rozvet ko\'rpus, olg\'a!" Strategiya qiroli.',
    ability: "Dastlab himoyalangan. Tomioka va Rengoku ikkalasi o'lsa, detektiv vazifasini egallaydi.",
    imageUrl: "https://i.pinimg.com/originals/95/7e/8d/957e8d2713213c8319ea0c91e8030993.jpg",
    isSpecial: true,
  },
  subaru: {
    id: "subaru", name: "Subaru", emoji: "🎭", faction: "town",
    description: '"Necha marta o\'lsam ham, qaytib kelaman."',
    ability: "Har kecha kuzatuvchi sifatida kim kimnikiga borganini ko'ra oladi.",
    imageUrl: "https://wallpaperaccess.com/full/5993819.jpg",
    isSpecial: true,
  },
  obito: {
    id: "obito", name: "Obito", emoji: "🌀", faction: "neutral",
    description: '"Dunyoni jahannamga aylantiraman!"',
    ability: "Rin o'lgach Maniakka aylanadi — har kecha bitta o'yinchini o'ldira oladi. Rin tirik bo'lsa tinch aholi tomonida.",
    imageUrl: "https://preview.redd.it/obito-uchiha-drawing-v0-w33u50cnptkf1.jpeg?width=640&crop=smart&auto=webp&s=092e388e8520e1bc4de144c6ee164568600fb541",
    isSpecial: true,
  },
  guts: {
    id: "guts", name: "Guts", emoji: "⚔️", faction: "town",
    description: '"Meni o\'ldirsang, o\'zing bilan do\'zaxga olib ketaman."',
    ability: "Mafiya uni o'ldirsa, Guts qotilni ham o'zi bilan birga yo'q qiladi.",
    imageUrl: "https://www.sideshow.com/cdn-cgi/image/quality=90,f=auto/https://www.sideshow.com/storage/product-images/912614/guts-black-swordsman_berserk_gallery_66ba78461a1c9.jpg",
    isSpecial: true,
  },
  rin: {
    id: "rin", name: "Rin", emoji: "💚", faction: "town",
    description: "O'yinning yuragi. U yashasa — dunyo tinch, u o'lsa — Obito uyg'onadi.",
    ability: "Oddiy aholi. Lekin o'limi Obitoni Maniakka aylantiradi!",
    imageUrl: "https://i.ebayimg.com/images/g/cpcAAOSwEDFnBurW/s-l140.jpg",
  },
  zerotwo: {
    id: "zerotwo", name: "Zero Two (02)", emoji: "🌺", faction: "town",
    description: "Sirli aholi, Hiro bilan taqdiri bog'langan.",
    ability: "Agar Hiro g'alaba qozonsa, Zero Two ham g'alaba qozonadi (hatto chiqarilgan bo'lsa ham).",
    imageUrl: "https://wallpapercave.com/wp/wp2475724.png",
  },
  hiro: {
    id: "hiro", name: "Hiro", emoji: "💙", faction: "town",
    description: "Zero Twoni qutqaruvchisi.",
    ability: "Zero Two chiqarilgan bo'lsa ham, Hiro g'alaba qozonsa Zero Two ham g'alaba qozonadi.",
    imageUrl: "https://images6.alphacoders.com/917/thumb-440-917824.webp",
  },
  marin: {
    id: "marin", name: "Marin Kitagawa", emoji: "✨", faction: "town",
    description: "Shaharning eng yorqin va quvnoq vakili.",
    ability: "Oddiy aholi. Shaharni g'alaba qozonishiga yordam beradi.",
    imageUrl: "https://daweebstop.com/cdn/shop/files/s4oHJiFi1651940375-2000x3200.jpg?v=1721837532&width=1445",
  },
  takimichi: {
    id: "takimichi", name: "Takimichi", emoji: "💪", faction: "town",
    description: "Yig'loqi bo'lsa ham, oxirigacha taslim bo'lmaydi.",
    ability: "Oddiy aholi. Oxirigacha kurashadi.",
    imageUrl: "https://wallpaperaccess.com/full/5993819.jpg",
  },
  mayki: {
    id: "mayki", name: "Mayki", emoji: "👊", faction: "town",
    description: "Tinch aholi orasidagi eng kuchli zarba.",
    ability: "Oddiy aholi. Shaharning eng kuchli kurashchisi.",
    imageUrl: "https://i.pinimg.com/originals/95/7e/8d/957e8d2713213c8319ea0c91e8030993.jpg",
  },
};

export function getRolesForPlayerCount(count: number): RoleId[] {
  const pools: { min: number; roles: RoleId[] }[] = [
    { min: 4,  roles: ["madara", "tsunade", "tomioka", "rin"] },
    { min: 6,  roles: ["aizen", "guts"] },
    { min: 8,  roles: ["sukuna", "kabuto", "rengoku", "subaru"] },
    { min: 10, roles: ["muzan", "erwin", "unahana", "obito"] },
    { min: 12, roles: ["light", "zerotwo", "hiro"] },
    { min: 14, roles: ["marin", "takimichi"] },
    { min: 16, roles: ["mayki"] },
  ];

  const selected: RoleId[] = [];
  for (const pool of pools) {
    if (count >= pool.min) selected.push(...pool.roles);
  }

  const civilians: RoleId[] = ["marin", "takimichi", "mayki", "rin"];
  let i = 0;
  while (selected.length < count) {
    selected.push(civilians[i % civilians.length]);
    i++;
  }

  return selected.slice(0, count);
}
