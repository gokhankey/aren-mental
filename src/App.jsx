import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  Trophy, Play, RefreshCw, Eye, CheckCircle2, 
  XCircle, Info, Volume2, VolumeX, Layers, Calculator, Hash, Plus, ChevronDown, ChevronRight
} from 'lucide-react';

// Konfeti efekti için yardımcı hook
const useConfetti = () => {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js';
    script.async = true;
    document.body.appendChild(script);
    return () => { if (document.body.contains(script)) document.body.removeChild(script); };
  }, []);

  const fire = useCallback(() => {
    if (window.confetti) {
      window.confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#a855f7', '#ec4899', '#ffffff']
      });
    }
  }, []);
  return fire;
};

const App = () => {
  const fireConfetti = useConfetti();
  const [view, setView] = useState('setup');
  const [isMuted, setIsMuted] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState('simple'); 
  const [settings, setSettings] = useState({
    level: '1', 
    count: '10',
    speed: '1.0',
    digits: 1
  });
  
  const [numbers, setNumbers] = useState([]); 
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [userAnswer, setUserAnswer] = useState('');
  const [correctAnswer, setCorrectAnswer] = useState("");

  const audioRefs = useRef({
    pop: new Audio('https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3'),
    correct: new Audio('https://assets.mixkit.co/active_storage/sfx/2019/2019-preview.mp3'),
    wrong: new Audio('https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3'),
    start: new Audio('https://assets.mixkit.co/active_storage/sfx/2569/2569-preview.mp3')
  });

  const playSound = useCallback((type) => {
    if (isMuted) return;
    const audio = audioRefs.current[type];
    if (audio) {
      audio.currentTime = 0;
      audio.volume = 0.3;
      audio.play().catch(() => {});
    }
  }, [isMuted]);

  const getFontSize = (digits) => {
    const d = parseInt(digits);
    if (d <= 1) return 'text-[9rem]';
    if (d <= 3) return 'text-[7rem]';
    if (d <= 5) return 'text-[5rem]';
    if (d <= 8) return 'text-[3.5rem]';
    return 'text-[2.5rem]';
  };

  // Abaküs Mantık Motoru: Boncukların durumuna göre kural analizi yapar
  const analyzeStep = (sDigit, nDigit, sign) => {
    if (sign === '+') {
      if (sDigit + nDigit < 10) {
        const currentLower = sDigit % 5;
        const addLower = nDigit % 5;
        if (currentLower + addLower > 4 || (sDigit >= 5 && nDigit >= 5)) return "small_friend_add";
        return "simple";
      } else {
        const friendToSub = 10 - nDigit;
        const earthlyAvailable = sDigit % 5;
        let canRemoveDirectly = false;
        if (friendToSub <= 4) canRemoveDirectly = earthlyAvailable >= friendToSub;
        else if (friendToSub === 5) canRemoveDirectly = sDigit >= 5;
        else canRemoveDirectly = (sDigit >= 5 && (sDigit % 5) >= (friendToSub - 5));
        return canRemoveDirectly ? "big_friend_add" : "combination_add";
      }
    } else {
      if (sDigit - nDigit >= 0) {
        const sLower = sDigit % 5;
        const nLower = nDigit % 5;
        const sUpper = sDigit >= 5 ? 5 : 0;
        const nUpper = nDigit >= 5 ? 5 : 0;
        if (sLower >= nLower && sUpper >= nUpper) return "simple";
        return "small_friend_sub"; 
      } else {
        const friendToAdd = 10 - nDigit;
        const sLower = sDigit % 5;
        const fLower = friendToAdd % 5;
        const sUpper = sDigit >= 5 ? 5 : 0;
        const fUpper = friendToAdd >= 5 ? 5 : 0;
        // Saf Büyük Kardeş Çıkarma kontrolü (Eklenecek kardeş doğrudan sığmalı)
        const canAddDirectly = (sLower + fLower <= 4) && !(sUpper === 5 && fUpper === 5);
        return canAddDirectly ? "big_friend_sub" : "combination_sub";
      }
    }
  };

  const generateProblemSet = (count, level, digits) => {
    let currentSum = BigInt(0);
    let problemSet = [];
    let totalAttempts = 0;
    let lastNumStr = "";
    const threshold = BigInt(Math.pow(10, digits));

    for (let i = 0; i < count; i++) {
      let validStepFound = false;
      let attemptsForThisStep = 0;
      const currentDigits = (i === 0 && level === '6') ? digits + 1 : digits;

      while (!validStepFound && attemptsForThisStep < 5000) {
        attemptsForThisStep++;
        totalAttempts++;
        if (totalAttempts > 500000) break;

        let sumStr = currentSum.toString();
        let lastDigit = parseInt(sumStr[sumStr.length - 1] || "0");
        let nextSign = "+";

        if (i === 0) {
          nextSign = "+";
        } else {
          if (level === '6') {
             if (currentSum < threshold) nextSign = "+";
             else if (lastDigit >= 8) nextSign = "-";
             else nextSign = Math.random() < 0.7 ? "-" : "+";
          } else if (level === '3') {
             nextSign = lastDigit >= 5 ? "-" : "+";
          } else if (['2', '5', '9'].includes(level)) {
             nextSign = "+";
          } else {
             nextSign = currentSum >= BigInt(20) ? "-" : (Math.random() < 0.45 ? "-" : "+");
          }
        }

        let tempNumStr = "";
        let isAllZero = true;
        let stepTypes = [];

        for (let j = 0; j < currentDigits; j++) {
          const sDigitIdx = sumStr.length - currentDigits + j;
          const sDigit = sDigitIdx >= 0 ? parseInt(sumStr[sDigitIdx]) : 0;
          let possible = [1, 2, 3, 4, 5, 6, 7, 8, 9];

          if (level === '6') {
            if (nextSign === '-') {
              let rules = possible.filter(d => {
                const type = analyzeStep(sDigit, d, '-');
                return (type === "big_friend_sub" || type === "simple") && type !== "combination_sub";
              });
              possible = rules;
            } else {
              possible = possible.filter(d => analyzeStep(sDigit, d, '+') === "simple" && sDigit + d < 10);
            }
          } 
          else if (level === '3') {
            if (nextSign === '-') possible = possible.filter(d => analyzeStep(sDigit, d, '-') === "small_friend_sub");
            else possible = possible.filter(d => analyzeStep(sDigit, d, '+') === "simple" && sDigit + d < 10);
          }
          else if (nextSign === '+' && ['2', '3', '4'].includes(level)) {
            possible = possible.filter(d => sDigit + d < 10);
          }

          if (possible.length === 0) possible = [1];
          let chosen = possible[Math.floor(Math.random() * possible.length)];
          stepTypes.push(analyzeStep(sDigit, chosen, nextSign));
          if (chosen !== 0) isAllZero = false;
          tempNumStr += chosen.toString();
        }

        if (isAllZero || tempNumStr === lastNumStr) continue;
        let tempVal = BigInt(tempNumStr);
        if (nextSign === '-' && tempVal > currentSum) continue;

        let pass = false;
        const has = (t) => stepTypes.includes(t);

        if (level === '1') {
          if (stepTypes.every(t => t === "simple")) pass = true;
        } 
        else if (level === '2') {
          if (nextSign === '+' && (has("small_friend_add") || currentSum === BigInt(0))) pass = true;
          else if (nextSign === '-' && stepTypes.every(t => t === "simple")) pass = true;
        }
        else if (level === '3') {
          if (nextSign === '-' && has("small_friend_sub")) pass = true;
          else if (nextSign === '+' && stepTypes.every(t => t === "simple")) pass = true;
        }
        else if (level === '4') {
          if (!has("big_friend_add") && !has("big_friend_sub") && !has("combination_add") && !has("combination_sub")) pass = true;
        }
        else if (level === '5') {
          if (has("big_friend_add") && !has("combination_add")) pass = true;
        }
        else if (level === '6') {
          if (nextSign === '-') {
             if (!has("combination_sub") && !has("small_friend_sub")) {
                if (has("big_friend_sub") || attemptsForThisStep > 1500) pass = true;
             }
          } else {
             if (stepTypes.every(t => t === "simple")) pass = true;
          }
        }
        else if (level === '7') {
          if (!has("combination_add") && !has("combination_sub") && (has("big_friend_add") || has("big_friend_sub"))) pass = true;
        }
        else if (level === '8') {
          if (has("combination_add") || has("combination_sub")) pass = true;
        }
        else if (level === '9') {
          if (nextSign === '+') pass = true;
        }

        if (pass) {
          currentSum = nextSign === '+' ? currentSum + tempVal : currentSum - tempVal;
          problemSet.push({ val: tempNumStr.replace(/^0+/, '') || "0", sign: nextSign });
          lastNumStr = tempNumStr;
          validStepFound = true;
        }
      }
      
      if (!validStepFound) {
         let fallbackVal = currentSum < threshold ? "4" : "1";
         problemSet.push({ val: fallbackVal, sign: "+" });
         currentSum += BigInt(fallbackVal);
         validStepFound = true;
      }
    }
    return { problemSet, finalSum: currentSum.toString() };
  };

  const handleStart = () => {
    const count = parseInt(settings.count) || 10;
    setUserAnswer('');
    
    try {
        const { problemSet, finalSum } = generateProblemSet(count, settings.level, settings.digits);
        setNumbers(problemSet); setCorrectAnswer(finalSum); playSound('start');
        setView('playing'); setCurrentIndex(-1);
        const speed = parseFloat(settings.speed) || 1.0;
        setTimeout(() => {
          let idx = 0;
          const interval = setInterval(() => {
            if (idx < problemSet.length) { setCurrentIndex(idx); playSound('pop'); idx++; }
            else { clearInterval(interval); setTimeout(() => { setView('input'); setCurrentIndex(-1); }, speed * 1000); }
          }, speed * 1000);
        }, 1000);
    } catch (error) { resetGame(); }
  };

  const checkAnswer = (e) => {
    e.preventDefault();
    if (userAnswer === "") return;
    let isCorrect = false;
    try { isCorrect = BigInt(userAnswer) === BigInt(correctAnswer); }
    catch { isCorrect = userAnswer === correctAnswer; }
    if (isCorrect) { playSound('correct'); fireConfetti(); } else { playSound('wrong'); }
    setView('result');
  };

  const resetGame = () => { setView('setup'); setUserAnswer(''); setNumbers([]); setCurrentIndex(-1); };

  const menuFolders = [
    {
      id: 'simple',
      label: 'Basit İşlemler',
      icon: <Calculator size={18} />,
      levels: [
        {id: '1', label: '1. Basit İşlemler', sub: 'Doğrudan hamleler (+/-)'}
      ]
    },
    {
      id: 'small',
      label: 'Küçük Kardeş',
      icon: <Layers size={18} />,
      levels: [
        {id: '2', label: '2. K. Kardeş Toplama', sub: 'Kural Odaklı (+/-)'},
        {id: '3', label: '3. K. Kardeş Çıkarma', sub: 'Kural Odaklı (-/+)'},
        {id: '4', label: '4. K. Kardeş Karışık', sub: 'K.Kardeş (+/-) ve Basit'}
      ]
    },
    {
      id: 'big',
      label: 'Büyük Kardeş',
      icon: <Hash size={18} />,
      levels: [
        {id: '5', label: '5. B. Kardeş Toplama', sub: 'Sadece Toplama (+)'},
        {id: '6', label: '6. B. Kardeş Çıkarma', sub: 'Borç Alma (Resetli)'},
        {id: '7', label: '7. B. Kardeş Karışık', sub: 'B.Kardeş (+/-) ve Basit'}
      ]
    },
    {
      id: 'family',
      label: 'Boncuk Kuralı',
      icon: <Plus size={18} />,
      levels: [
        {id: '9', label: '9. Boncuk Kuralı', sub: 'Tüm kurallar dahil (+)'},
        {id: '8', label: '8. Boncuk Kuralı Karışık', sub: 'Kombinasyon (Karma +/-)'}
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-[#0f172a] text-slate-100 font-sans flex flex-col items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-indigo-600/10 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-violet-600/10 blur-[150px] rounded-full pointer-events-none" />

      <div className="max-w-md w-full bg-slate-800/90 backdrop-blur-3xl rounded-[3rem] shadow-2xl border border-white/10 overflow-hidden relative z-10 flex flex-col h-[720px]">
        
        {/* Header Bölümü */}
        <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Calculator size={24} className="text-white" />
            </div>
            <div>
              <h1 className="text-xl font-black bg-gradient-to-r from-indigo-300 to-violet-300 bg-clip-text text-transparent tracking-tight uppercase leading-tight">AREN ACADEMY</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 italic font-mono text-center">v6.0 • Müfredat Sistemi</p>
            </div>
          </div>
          <button onClick={() => setIsMuted(!isMuted)} className={`p-2.5 rounded-full transition-all ${isMuted ? 'bg-red-500/20 text-red-400' : 'hover:bg-white/10 text-slate-400'}`}>
            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
          </button>
        </div>

        <div className="flex-1 relative flex flex-col items-center overflow-hidden">
          {view === 'setup' && (
            <div className="w-full p-8 space-y-6 animate-in fade-in slide-in-from-top-4 duration-500 overflow-y-auto text-left custom-scrollbar">
              <div className="space-y-4">
                <div className="space-y-3">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest px-1 flex items-center gap-2 justify-center">
                    <Layers size={14} /> Eğitim Modülleri
                  </span>
                  
                  <div className="space-y-2">
                    {menuFolders.map((folder) => (
                      <div key={folder.id} className="space-y-1">
                        <button 
                          onClick={() => setExpandedCategory(expandedCategory === folder.id ? null : folder.id)}
                          className={`w-full p-4 rounded-2xl flex items-center justify-between transition-all border ${expandedCategory === folder.id ? 'bg-indigo-600/20 border-indigo-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'}`}
                        >
                          <div className="flex items-center gap-3">
                            {folder.icon}
                            <span className="text-sm font-black uppercase tracking-tight">{folder.label}</span>
                          </div>
                          {expandedCategory === folder.id ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                        </button>
                        
                        {expandedCategory === folder.id && (
                          <div className="pl-4 pr-1 py-1 space-y-1 animate-in slide-in-from-top-2 duration-300">
                            {folder.levels.map((lvl) => (
                              <button 
                                key={lvl.id} 
                                onClick={() => { setSettings({...settings, level: lvl.id}); playSound('pop'); }}
                                className={`w-full p-3 rounded-xl text-left transition-all border flex flex-col gap-0.5 ${settings.level === lvl.id ? 'bg-indigo-600 border-indigo-400 text-white shadow-lg' : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10'}`}
                              >
                                <span className="text-[11px] font-black uppercase tracking-tight">{lvl.label}</span>
                                <span className="text-[9px] opacity-60 italic">{lvl.sub}</span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 shrink-0 font-bold">
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 uppercase italic tracking-tighter text-center block">İşlem Adedi</span>
                    <input type="number" value={settings.count} onChange={(e) => setSettings({...settings, count: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none text-center focus:border-indigo-500" />
                  </div>
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-slate-500 uppercase italic tracking-tighter text-center block">Saniye (Hız)</span>
                    <input type="number" step="1" min="1" value={settings.speed} onChange={(e) => setSettings({...settings, speed: e.target.value})} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 outline-none text-center focus:border-indigo-500" />
                  </div>
                </div>
                
                <div className="space-y-3 text-center shrink-0">
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block"><Hash size={12} className="inline mr-1"/> Basamak Sayısı (n)</span>
                  <div className="flex items-center gap-3">
                    <input type="range" min="1" max="13" value={settings.digits} onChange={(e) => setSettings({...settings, digits: parseInt(e.target.value)})} className="flex-1 accent-indigo-500 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer" />
                    <span className="bg-indigo-600/20 text-indigo-300 font-black px-4 py-1.5 rounded-xl border border-indigo-500/30 min-w-[3.5rem] text-center">{settings.digits}</span>
                  </div>
                </div>
              </div>
              
              <button onClick={handleStart} className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-black py-5 rounded-[2rem] shadow-2xl flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all uppercase tracking-[0.2em] text-xs">
                <Play size={20} fill="currentColor" /> ANTRENMANI BAŞLAT
              </button>
            </div>
          )}

          {view === 'playing' && (
            <div className="flex-1 flex flex-col items-center justify-center w-full px-4 overflow-hidden relative">
              {currentIndex === -1 ? <div className="text-4xl font-black text-indigo-400 animate-pulse uppercase tracking-[0.3em]">HAZIRLAN</div> : (
                <div key={currentIndex} className="flex flex-col items-center animate-in zoom-in duration-75 w-full">
                  <div className={`${getFontSize(numbers[currentIndex].val.length)} font-black tracking-tighter text-white drop-shadow-[0_0_35px_rgba(99,102,241,0.5)] flex items-center justify-center leading-none text-center break-all w-full`}>
                    {(['2', '5', '9'].indexOf(settings.level) === -1 && currentIndex > 0) && (
                        <span className={`mr-2 font-light ${numbers[currentIndex].sign === '+' ? 'text-indigo-400' : 'text-red-400'}`}>{numbers[currentIndex].sign === '+' ? '+' : '−'}</span>
                    )}
                    {numbers[currentIndex].val}
                  </div>
                </div>
              )}
            </div>
          )}

          {view === 'input' && (
            <form onSubmit={checkAnswer} className="flex-1 flex flex-col items-center justify-center w-full p-8 space-y-10 animate-in slide-in-from-bottom-8 duration-500">
              <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">SONUÇ NEDİR?</h2>
              <input autoFocus type="number" value={userAnswer} onChange={(e) => setUserAnswer(e.target.value)} placeholder="?" className="w-full text-center text-7xl font-black bg-transparent border-b-2 border-white/10 focus:border-indigo-400 transition-all text-white outline-none" />
              <button type="submit" className="w-full bg-white text-slate-900 font-black py-6 rounded-[2rem] hover:bg-indigo-50 transition-all uppercase tracking-[0.2em] text-sm">KONTROL ET</button>
            </form>
          )}

          {view === 'result' && (
            <div className="flex-1 flex flex-col items-center justify-center w-full p-8 space-y-6 animate-in zoom-in duration-500 overflow-y-auto font-bold text-center">
              <div className="text-center flex flex-col items-center">
                {userAnswer === correctAnswer ? (
                  <div className="bg-green-500/10 p-6 rounded-[3rem] mb-4 border border-green-500/20 shadow-lg"><Trophy size={60} className="text-green-500" /></div>
                ) : (
                  <div className="bg-red-500/10 p-6 rounded-[3rem] mb-4 border border-red-500/20 shadow-lg"><XCircle size={60} className="text-red-500" /></div>
                )}
                <h2 className="text-3xl font-black tracking-tighter uppercase italic text-white leading-tight">{userAnswer === correctAnswer ? 'TEBRİKLER!' : 'MAALESEF!'}</h2>
              </div>
              <div className="grid grid-cols-1 gap-3 w-full">
                <div className="p-4 bg-white/5 rounded-[1.5rem] border border-white/5 text-center font-bold">
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest mb-1">Cevabın</p>
                  <p className={`text-2xl ${userAnswer === correctAnswer ? 'text-green-400' : 'text-red-400'} break-all`}>{userAnswer || '0'}</p>
                </div>
                <div className="p-4 bg-indigo-500/10 rounded-[1.5rem] border border-indigo-500/20 text-center font-bold">
                  <p className="text-[10px] text-indigo-400 uppercase tracking-widest mb-1">Doğru Sonuç</p>
                  <p className="text-2xl text-indigo-300 break-all">{correctAnswer}</p>
                </div>
              </div>
              <button onClick={handleStart} className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl flex items-center justify-center gap-2 uppercase tracking-widest text-xs shadow-xl"><RefreshCw size={18} /> YENİDEN BAŞLAT</button>
              <button onClick={resetGame} className="w-full bg-white/5 text-slate-500 font-bold py-3 rounded-xl text-xs uppercase">AYARLARA DÖN</button>
            </div>
          )}

          {view === 'playing' && (
            <div className="w-full p-6 bg-black/20 border-t border-white/5 shrink-0 text-center font-bold">
                <div className="h-2 bg-white/5 rounded-full overflow-hidden p-[2px]">
                    <div className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 rounded-full transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.4)]" style={{ width: `${((currentIndex + 1) / numbers.length) * 100}%` }} />
                </div>
                <div className="flex justify-between mt-3 px-1 text-center font-black">
                    <span className="text-slate-500 text-[9px] uppercase italic tracking-widest">İşlem</span>
                    <span className="text-indigo-400 text-[9px] uppercase tracking-widest">{currentIndex + 1} / {numbers.length}</span>
                </div>
            </div>
          )}
        </div>
      </div>
      <p className="mt-8 text-slate-600 text-[10px] font-bold tracking-[0.4em] uppercase opacity-40 text-center leading-relaxed font-mono">Aren Academy • Profesyonel Eğitim</p>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default App;