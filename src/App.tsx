import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface Player {
  id: string;
  username: string;
  discordId: string;
  avatar: string;
  region: "TR" | "EU" | "NA";
  tiers: Record<string, string>;
  totalPoints: number;
  rank: number;
  tests: number;
}

type KitKey = "overall" | "vanilla" | "sword" | "axe" | "nethpot" | "pot" | "uhc" | "mace" | "smp";
type PageType = "home" | "rankings";

// UPSTASH REDIS BAĞLANTI
const UPSTASH_URL = "https://uncommon-monkey-135537.upstash.io";
const UPSTASH_TOKEN = "gQAAAAAAAhFxAAIgcDIyZDllZWY2MjZlZDU0MjAwOTYwYzhjYTkzYmI4MDY3ZQ";

// Minecraft hesabı için link
const getMinecraftLink = (username: string) => `https://nameMC.com/profile/${username}`;

const KITS: Record<string, { ad: string; icon: JSX.Element; color: string }> = {
  vanilla: { 
    ad: "Vanilla", 
    icon: <img src="https://www.tierslist.net/tier_icons/vanilla.svg" width="30" height="30" alt="Vanilla" className="w-7 h-7" />, 
    color: "#fbbf24" 
  },
  sword:   { 
    ad: "Sword", 
    icon: <img src="https://www.tierslist.net/tier_icons/sword.svg" width="30" height="30" alt="Sword" className="w-7 h-7" />, 
    color: "#60a5fa" 
  },
  axe:     { 
    ad: "Axe", 
    icon: <img src="https://www.tierslist.net/tier_icons/axe.svg" width="30" height="30" alt="Axe" className="w-7 h-7" />, 
    color: "#a78bfa" 
  },
  nethpot: { 
    ad: "NethOP", 
    icon: <img src="https://www.tierslist.net/tier_icons/nethop.svg" width="30" height="30" alt="NethOP" className="w-7 h-7" />, 
    color: "#ec4899" 
  },
  pot:     { 
    ad: "Pot", 
    icon: <img src="https://www.tierslist.net/tier_icons/pot.svg" width="30" height="30" alt="Pot" className="w-7 h-7" />, 
    color: "#f43f5e" 
  },
  uhc:     { 
    ad: "UHC", 
    icon: <img src="https://www.tierslist.net/tier_icons/uhc.svg" width="30" height="30" alt="UHC" className="w-7 h-7" />, 
    color: "#ef4444" 
  },
  smp:     { 
    ad: "SMP", 
    icon: <img src="https://www.tierslist.net/tier_icons/smp.svg" width="30" height="30" alt="SMP" className="w-7 h-7" />, 
    color: "#22c55e" 
  },
  mace:    { 
    ad: "Mace", 
    icon: <img src="https://www.tierslist.net/tier_icons/mace.svg" width="30" height="30" alt="Mace" className="w-7 h-7" />, 
    color: "#eab308" 
  },
};

// YENİ PUANLAMA SİSTEMİ (HT1=100'den başlıyor)
const TIER_POINTS: Record<string, number> = {
  HT1: 100, HT2: 85, HT3: 70, HT4: 60, HT5: 50,
  LT1: 40,  LT2: 30, LT3: 20, LT4: 10, LT5: 5,
};

const TIER_COLORS: Record<string, string> = {
  HT1: "from-amber-400 to-yellow-600",
  HT2: "from-slate-300 to-slate-500",
  HT3: "from-orange-600 to-amber-700",
  HT4: "from-blue-500 to-blue-700",
  HT5: "from-purple-500 to-purple-700",
  LT1: "from-emerald-500 to-emerald-700",
  LT2: "from-cyan-500 to-cyan-700",
  LT3: "from-indigo-500 to-indigo-700",
  LT4: "from-pink-500 to-pink-700",
  LT5: "from-gray-500 to-gray-700",
};

const KIT_ORDER: KitKey[] = ["overall", "vanilla", "sword", "axe", "nethpot", "pot", "uhc", "mace", "smp"];

const getTitle = (points: number): string => {
  if (points >= 300) return "Combat Master";
  if (points >= 200) return "Combat Ace";
  if (points >= 150) return "Combat Veteran";
  if (points >= 100) return "Combat Expert";
  if (points >= 50)  return "Combat Novice";
  return "Rookie";
};

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 127.14 96.36" fill="currentColor">
    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"/>
  </svg>
);

export default function App() {
  const [currentPage, setCurrentPage] = useState<PageType>("home");
  const [selectedKit, setSelectedKit] = useState<KitKey>("overall");
  const [searchQuery, setSearchQuery] = useState("");
  const [players, setPlayers] = useState<Player[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  
  const [stats, setStats] = useState({
    totalPlayers: 0,
    activeKits: 8,
    tierLevels: 10,
    onlineStatus: "ON"
  });

  // Redis'ten oyuncu verilerini yükle
  useEffect(() => {
    const loadPlayers = async () => {
      try {
        const response = await fetch(`${UPSTASH_URL}/get/players`, {
          headers: { Authorization: `Bearer ${UPSTASH_TOKEN}` }
        });
        if (response.ok) {
          const data = await response.json();
          if (data.result) {
            const playersData = JSON.parse(data.result);
            setPlayers(playersData);
            setStats(prev => ({ ...prev, totalPlayers: playersData.length }));
          }
        }
      } catch (error) {
        console.log("Redis'den yüklenemedi:", error);
      }
    };
    loadPlayers();
    const interval = setInterval(loadPlayers, 15000);
    return () => clearInterval(interval);
  }, []);

  // Oyuncuların toplam puanlarını hesapla
  useEffect(() => {
    const updatedPlayers = players.map(player => {
      let total = 0;
      for (const tier of Object.values(player.tiers)) {
        total += TIER_POINTS[tier] || 0;
      }
      return { ...player, totalPoints: total };
    });
    updatedPlayers.sort((a, b) => b.totalPoints - a.totalPoints);
    updatedPlayers.forEach((p, idx) => { p.rank = idx + 1; });
    setPlayers(updatedPlayers);
    setStats(prev => ({ ...prev, totalPlayers: updatedPlayers.length }));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    if (!searchQuery) return players;
    return players.filter(p =>
      p.username.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [players, searchQuery]);

  const kitPlayers = useMemo(() => {
    if (selectedKit === "overall") return filteredPlayers;
    return [...filteredPlayers]
      .filter(p => p.tiers[selectedKit])
      .sort((a, b) => {
        const pa = TIER_POINTS[a.tiers[selectedKit]] || 0;
        const pb = TIER_POINTS[b.tiers[selectedKit]] || 0;
        return pb - pa;
      });
  }, [filteredPlayers, selectedKit]);

  const playersByTier = useMemo(() => {
    if (selectedKit === "overall") return null;
    const groups: Record<number, Player[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
    kitPlayers.forEach(player => {
      const tier = player.tiers[selectedKit];
      if (!tier) return;
      let groupNum = 0;
      if (tier === "HT1" || tier === "LT1") groupNum = 1;
      else if (tier === "HT2" || tier === "LT2") groupNum = 2;
      else if (tier === "HT3" || tier === "LT3") groupNum = 3;
      else if (tier === "HT4" || tier === "LT4") groupNum = 4;
      else if (tier === "HT5" || tier === "LT5") groupNum = 5;
      if (groupNum >= 1 && groupNum <= 5) groups[groupNum].push(player);
    });
    return groups;
  }, [kitPlayers, selectedKit]);

  return (
    <div className="min-h-screen bg-[#0a0e14] text-white">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[120px]" />
      </div>

      <header className="relative z-50 sticky top-0 backdrop-blur-xl bg-[#0f141b]/80 border-b border-white/5">
        <div className="max-w-[1400px] mx-auto px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 cursor-pointer" onClick={() => setCurrentPage("home")}>
                <img src="/logo.png" className="h-12 w-12 rounded-xl object-cover" />
                <div>
                  <h1 className="text-xl font-black">ABYSSAL OCEAN</h1>
                  <p className="text-[11px] text-white/40">TIER LIST</p>
                </div>
              </div>
              <nav className="hidden lg:flex gap-1">
                <button onClick={() => setCurrentPage("home")} className={`px-4 py-2 rounded-lg text-sm font-medium ${currentPage === "home" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}>🏠 Home</button>
                <button onClick={() => setCurrentPage("rankings")} className={`px-4 py-2 rounded-lg text-sm font-medium ${currentPage === "rankings" ? "bg-white/10 text-white" : "text-white/60 hover:text-white"}`}>🏆 Rankings</button>
              </nav>
            </div>
            <div className="flex gap-3">
              {currentPage === "rankings" && (
                <div className="relative hidden md:block">
                  <input type="text" placeholder="Oyuncu ara..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-[220px] pl-9 pr-4 py-2 bg-[#1a1f2e] border border-white/10 rounded-xl text-sm" />
                </div>
              )}
              <a href="https://discord.gg/cKFwKcfcWn" target="_blank" className="flex items-center gap-2 px-4 py-2 bg-[#5865F2] rounded-xl text-sm"><DiscordIcon className="w-5 h-5" /> Discord</a>
            </div>
          </div>
        </div>
      </header>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentPage}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
          className="relative z-10"
        >
          {currentPage === "home" && (
            <main className="max-w-[1400px] mx-auto px-4 py-12">
              <div className="text-center mb-16">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm font-semibold mb-6">
                  <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></span>
                  Minecraft Tier Sunucusu
                </div>
                <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight">
                  <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-500 bg-clip-text text-transparent">ABYSSAL OCEAN</span>
                  <br />
                  <span className="text-white">Tier Sunucusu</span>
                </h1>
                <p className="text-lg md:text-xl text-white/60 max-w-2xl mx-auto mb-8">Türkiye'nin en kaliteli Minecraft PvP tier test sunucusu. Yeteneğini kanıtla, sıralamada yüksel, efsane ol!</p>
                <div className="flex flex-wrap items-center justify-center gap-3 mt-6">
                  <button onClick={() => setCurrentPage("rankings")} className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl font-semibold">🏆 Sıralamayı Gör</button>
                  <a href="https://discord.gg/cKFwKcfcWn" target="_blank" className="px-6 py-3 bg-[#5865F2] rounded-xl font-semibold flex items-center gap-2"><DiscordIcon className="w-5 h-5" /> Discord'a Katıl</a>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                {[
                  { label: "Toplam Oyuncu", value: stats.totalPlayers, icon: "👥", color: "from-cyan-500 to-blue-600" },
                  { label: "Aktif Kit", value: stats.activeKits, icon: "⚔️", color: "from-purple-500 to-pink-600" },
                  { label: "Tier Seviyesi", value: stats.tierLevels, icon: "🏆", color: "from-amber-500 to-orange-600" },
                  { label: "7/24 Online", value: stats.onlineStatus, icon: "🟢", color: "from-emerald-500 to-green-600" },
                ].map((stat, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-[#11161f] border border-white/5 rounded-2xl p-6">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.color} flex items-center justify-center text-2xl mb-4`}>{stat.icon}</div>
                    <div className="text-3xl font-black mb-1">{stat.value}</div>
                    <div className="text-sm text-white/50">{stat.label}</div>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-16">
                {Object.entries(KITS).map(([key, kit], i) => (
                  <motion.div key={key} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }} className="bg-[#11161f] border border-white/5 rounded-2xl p-6 hover:border-cyan-500/30 cursor-pointer group" onClick={() => { setCurrentPage("rankings"); setSelectedKit(key as KitKey); }}>
                    <div className="mb-3 group-hover:scale-110 transition-transform flex justify-center">{kit.icon}</div>
                    <h3 className="text-lg font-bold text-center">{kit.ad}</h3>
                    <p className="text-xs text-white/40 text-center">Tier sistemiyle test edilebilir</p>
                  </motion.div>
                ))}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
                {[
                  { icon: "🎯", title: "Adil Tier Sistemi", desc: "Tecrübeli ekibimiz tarafından objektif olarak değerlendirilirsin." },
                  { icon: "🏅", title: "Profesyonel Testerlar", desc: "Yıllardır PvP yapan deneyimli ekibimizle test ol." },
                  { icon: "🔥", title: "Sürekli Güncelleme", desc: "Sunucumuz sürekli geliştirilir, yeni özellikler eklenir." },
                  { icon: "👥", title: "Aktif Topluluk", desc: "Discord'umuzda yüzlerce aktif üye seni bekliyor." },
                  { icon: "🛡️", title: "Güvenli Ortam", desc: "Hile, küfür ve toxic davranışlara sıfır tolerans." },
                ].map((feature, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="bg-[#11161f] border border-white/5 rounded-2xl p-6">
                    <div className="text-4xl mb-4">{feature.icon}</div>
                    <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
                    <p className="text-sm text-white/60 leading-relaxed">{feature.desc}</p>
                  </motion.div>
                ))}
              </div>

              <div className="relative bg-gradient-to-br from-cyan-600/20 via-blue-600/20 to-purple-600/20 border border-white/10 rounded-3xl p-8 md:p-12 text-center overflow-hidden">
                <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-purple-500/20 rounded-full blur-[100px]" />
                <div className="relative">
                  <h2 className="text-3xl md:text-5xl font-black mb-4">Hazır mısın?</h2>
                  <p className="text-lg text-white/70 mb-6 max-w-2xl mx-auto">Discord sunucumuza katıl, tier test başvurusu yap ve yeteneğini herkese kanıtla!</p>
                  <a href="https://discord.gg/cKFwKcfcWn" target="_blank" className="inline-flex items-center gap-2 px-8 py-4 bg-[#5865F2] rounded-xl font-bold text-lg"><DiscordIcon className="w-6 h-6" /> Hemen Katıl</a>
                </div>
              </div>

              <div className="mt-16 pt-8 border-t border-white/5 text-center text-white/40 text-sm">
                <p>© 2025 Abyssal Ocean Tier List. Tüm hakları saklıdır.</p>
              </div>
            </main>
          )}

          {currentPage === "rankings" && (
            <main className="max-w-[1400px] mx-auto px-4 py-6">
              <div className="mb-6 overflow-x-auto scrollbar-hide">
                <div className="flex gap-2 pb-2">
                  {KIT_ORDER.map((key, index) => {
                    const isOverall = key === "overall";
                    const kit = isOverall ? { ad: "Overall", icon: <span className="text-xl">🏆</span> } : KITS[key];
                    const isActive = selectedKit === key;
                    return (
                      <motion.button
                        key={key}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05, duration: 0.3 }}
                        onClick={() => setSelectedKit(key)}
                        className={`px-5 py-3 rounded-2xl font-medium whitespace-nowrap flex items-center gap-2.5 transition-all ${
                          isActive ? "bg-white text-black shadow-lg" : "bg-[#1a1f2e] text-white/60 hover:bg-[#222838] hover:text-white"
                        }`}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <div className="w-7 h-7 flex items-center justify-center">{kit.icon}</div>
                        <span className="text-sm font-semibold">{kit.ad}</span>
                        {isActive && (
                          <motion.div
                            layoutId="activeTab"
                            className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-1 bg-white rounded-full"
                            transition={{ type: "spring", stiffness: 500, damping: 30 }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {selectedKit === "overall" ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[#11161f] rounded-2xl border border-white/5 overflow-hidden">
                  {players.length === 0 ? (
                    <div className="py-32 text-center">
                      <div className="text-6xl mb-4 opacity-20">🏆</div>
                      <h3 className="text-xl font-bold text-white/30 mb-2">Henüz Oyuncu Yok</h3>
                      <p className="text-white/20 text-sm max-w-md mx-auto">Discord botunuzda /test-sonuc komutunu kullandığınızda oyuncular burada görünecek.</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-white/5 bg-[#0f141b]/50">
                            <th className="text-left px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider w-16">#</th>
                            <th className="text-left px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Oyuncu</th>
                            <th className="text-center px-4 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider w-24">Bölge</th>
                            <th className="text-right px-6 py-4 text-xs font-semibold text-white/40 uppercase tracking-wider">Tierler</th>
                          <tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.03]">
                          {kitPlayers.slice(0, 50).map((player, idx) => (
                            <motion.tr
                              key={player.id}
                              initial={{ opacity: 0, x: -20 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.01 }}
                              onClick={() => setSelectedPlayer(player)}
                              className="group hover:bg-white/5 cursor-pointer transition-all"
                            >
                              <td className="px-6 py-4">
                                {player.rank <= 3 ? (
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-lg ${
                                    player.rank === 1 ? "bg-gradient-to-br from-amber-400 to-yellow-600 text-black" :
                                    player.rank === 2 ? "bg-gradient-to-br from-slate-300 to-slate-500 text-black" :
                                    "bg-gradient-to-br from-orange-600 to-amber-700 text-white"
                                  }`}>
                                    {player.rank}
                                  </div>
                                ) : (
                                  <span className="w-10 text-center text-xl font-bold text-white/30 block group-hover:text-white/60 transition-colors">
                                    {player.rank}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-4">
                                  <a href={getMinecraftLink(player.username)} target="_blank" rel="noopener noreferrer">
                                    <img src={player.avatar} alt={player.username} className="w-12 h-12 rounded-xl ring-2 ring-white/10 group-hover:ring-cyan-500/50 transition-all" onError={(e) => { (e.target as HTMLImageElement).src = `https://mc-heads.net/avatar/Steve/64`; }} />
                                  </a>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <a href={getMinecraftLink(player.username)} target="_blank" rel="noopener noreferrer" className="font-bold text-white hover:text-cyan-400 transition-colors">
                                        {player.username}
                                      </a>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className={`text-xs font-medium ${
                                        player.totalPoints >= 300 ? "text-amber-400" :
                                        player.totalPoints >= 200 ? "text-purple-400" : "text-cyan-400"
                                      }`}>
                                        {getTitle(player.totalPoints)}
                                      </span>
                                      <span className="text-xs text-white/30">•</span>
                                      <span className="text-xs text-white/50">{player.totalPoints} puan</span>
                                    </div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-4 text-center">
                                <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-emerald-500/15 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                                  {player.region}
                                </span>
                              </td>
                              <td className="px-6 py-4">
                                <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                  {Object.entries(KITS).map(([kitKey, kit]) => {
                                    const tier = player.tiers[kitKey];
                                    return (
                                      <div key={kitKey} className="w-9 h-9 rounded-lg bg-[#0f141b] border border-white/10 flex flex-col items-center justify-center hover:border-white/20 transition-all hover:scale-110" title={`${kit.ad}: ${tier || "—"}`}>
                                        <div className="text-[10px] leading-none flex justify-center">{kit.icon}</div>
                                        <span className={`text-[9px] font-bold leading-none mt-0.5 ${tier?.startsWith("HT") ? "text-amber-400" : "text-white/60"}`}>
                                          {tier || "—"}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </td>
                            </motion.tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </motion.div>
              ) : (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                  {[1, 2, 3, 4, 5].map((tierNum, idx) => {
                    const tierPlayers = playersByTier?.[tierNum] || [];
                    return (
                      <motion.div
                        key={tierNum}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        className="bg-[#11161f] rounded-xl border border-white/5 overflow-hidden"
                      >
                        <div className={`px-4 py-3 border-b border-white/5 ${
                          tierNum === 1 ? "bg-gradient-to-r from-amber-500/20 to-yellow-600/20" :
                          tierNum === 2 ? "bg-gradient-to-r from-slate-500/20 to-slate-600/20" :
                          tierNum === 3 ? "bg-gradient-to-r from-orange-600/20 to-amber-700/20" :
                          "bg-[#0f141b]/50"
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="text-xl">
                                {tierNum === 1 ? "👑" : tierNum === 2 ? "🥈" : tierNum === 3 ? "🥉" : "🏅"}
                              </span>
                              <h3 className="font-bold">Tier {tierNum}</h3>
                            </div>
                            <span className="text-xs text-white/50">{tierPlayers.length}</span>
                          </div>
                        </div>
                        <div className="p-2 max-h-[600px] overflow-y-auto custom-scroll">
                          {tierPlayers.length === 0 ? (
                            <div className="py-16 text-center">
                              <div className="text-3xl mb-2 opacity-20">👤</div>
                              <p className="text-xs text-white/30">Henüz oyuncu yok</p>
                            </div>
                          ) : (
                            <div className="space-y-1">
                              {tierPlayers.map((player) => {
                                const tier = player.tiers[selectedKit];
                                return (
                                  <button
                                    key={player.id}
                                    onClick={() => setSelectedPlayer(player)}
                                    className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-white/5 transition-all group text-left"
                                  >
                                    <img src={player.avatar} alt="" className="w-8 h-8 rounded-lg ring-1 ring-white/10 group-hover:ring-cyan-500/50 transition-all" onError={(e) => { (e.target as HTMLImageElement).src = `https://mc-heads.net/avatar/Steve/32`; }} />
                                    <div className="flex-1 min-w-0">
                                      <span className="text-sm font-medium truncate group-hover:text-cyan-400 transition-colors block">
                                        {player.username}
                                      </span>
                                      <div className="flex items-center gap-1.5 mt-0.5">
                                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold bg-gradient-to-r ${TIER_COLORS[tier] || "from-gray-600 to-gray-700"} text-white`}>{tier}</span>
                                        <span className="text-[10px] text-white/40">{TIER_POINTS[tier]}p</span>
                                      </div>
                                    </div>
                                    <svg className="w-3.5 h-3.5 text-white/20 group-hover:text-white/60 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                    </svg>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </motion.div>
              )}
            </main>
          )}
        </motion.div>
      </AnimatePresence>

      {selectedPlayer && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" onClick={() => setSelectedPlayer(null)}>
          <div className="relative w-full max-w-2xl bg-[#11161f] rounded-2xl border border-white/10 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-600/10 via-blue-600/10 to-purple-600/10" />
            <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-[100px]" />
            <div className="relative">
              <div className="flex items-start justify-between p-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-400 to-blue-600 blur-xl opacity-50" />
                    <a href={getMinecraftLink(selectedPlayer.username)} target="_blank" rel="noopener noreferrer">
                      <img src={selectedPlayer.avatar} alt="" className="relative w-20 h-20 rounded-2xl ring-2 ring-white/20" onError={(e) => { (e.target as HTMLImageElement).src = `https://mc-heads.net/avatar/Steve/64`; }} />
                    </a>
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <a href={getMinecraftLink(selectedPlayer.username)} target="_blank" rel="noopener noreferrer" className="text-2xl font-black hover:text-cyan-400 transition-colors">
                        {selectedPlayer.username}
                      </a>
                    </div>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                        selectedPlayer.totalPoints >= 300 ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                        selectedPlayer.totalPoints >= 200 ? "bg-purple-500/20 text-purple-400 border border-purple-500/30" :
                        "bg-cyan-500/20 text-cyan-400 border border-cyan-500/30"
                      }`}>
                        {getTitle(selectedPlayer.totalPoints)}
                      </span>
                      <span className="text-sm text-white/60">#{selectedPlayer.rank} • {selectedPlayer.totalPoints} puan</span>
                    </div>
                  </div>
                </div>
                <button onClick={() => setSelectedPlayer(null)} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6">
                <h3 className="text-sm font-semibold text-white/40 uppercase tracking-wider mb-4">Tüm Kit Tierleri</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {Object.entries(KITS).map(([kitKey, kit]) => {
                    const tier = selectedPlayer.tiers[kitKey];
                    const points = TIER_POINTS[tier] || 0;
                    return (
                      <div key={kitKey} className="bg-[#0f141b] border border-white/10 rounded-2xl p-4 hover:border-white/20 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <div className="w-8 h-8 flex items-center justify-center">{kit.icon}</div>
                          {tier ? (
                            <span className={`text-xs font-bold px-2 py-1 rounded-lg bg-gradient-to-r ${TIER_COLORS[tier]} text-white`}>{tier}</span>
                          ) : (
                            <span className="text-xs text-white/30">—</span>
                          )}
                        </div>
                        <div className="text-sm font-medium text-white/90">{kit.ad}</div>
                        <div className="text-xs text-white/40 mt-1">{points} puan</div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-3 gap-4">
                  {[
                    { label: "Toplam Test", value: selectedPlayer.tests },
                    { label: "HT Kit Sayısı", value: Object.values(selectedPlayer.tiers).filter(t => t?.startsWith("HT")).length },
                    { label: "Bölge", value: selectedPlayer.region },
                  ].map((stat) => (
                    <div key={stat.label} className="text-center">
                      <div className="text-2xl font-black text-white">{stat.value}</div>
                      <div className="text-xs text-white/40 mt-1">{stat.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .custom-scroll::-webkit-scrollbar { width: 4px; }
        .custom-scroll::-webkit-scrollbar-track { background: transparent; }
        .custom-scroll::-webkit-scrollbar-thumb { background: rgb(255 255 255 / 0.1); border-radius: 2px; }
        .custom-scroll::-webkit-scrollbar-thumb:hover { background: rgb(255 255 255 / 0.2); }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
        .scrollbar-hide::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
