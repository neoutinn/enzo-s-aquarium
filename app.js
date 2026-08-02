(function(){
  "use strict";

  /* =======================================================
     SOUND (all synthesized, no external audio files)
     ======================================================= */
  var audioCtx = null;
  var soundEnabled = true;
  try{ soundEnabled = localStorage.getItem('aquarium_sound') !== '0'; }catch(e){}
  var ambienceStarted = false;
  var ambienceNodes = null;

  function ensureAudio(){
    if(!audioCtx){
      try{ audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){}
    }
    if(audioCtx && audioCtx.state === 'suspended'){ audioCtx.resume(); }
  }
  function blip(o){
    if(!soundEnabled || !audioCtx) return;
    var osc = audioCtx.createOscillator();
    var g = audioCtx.createGain();
    osc.type = o.type || 'square';
    var now = audioCtx.currentTime;
    osc.frequency.setValueAtTime(o.freqStart, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.freqEnd), now + o.dur);
    g.gain.setValueAtTime(o.gain || 0.05, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + o.dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + o.dur + 0.02);
  }
  function sKeypad(){ ensureAudio(); blip({ freqStart:700, freqEnd:500, dur:0.05, type:'square', gain:0.05 }); }
  function sButton(){ ensureAudio(); blip({ freqStart:500, freqEnd:420, dur:0.04, type:'square', gain:0.04 }); }
  function sFish(){ ensureAudio(); blip({ freqStart:380, freqEnd:660, dur:0.13, type:'sine', gain:0.06 }); }
  function sSplash(){
    ensureAudio();
    if(!soundEnabled || !audioCtx) return;
    var dur = 0.32;
    var bufferSize = Math.floor(audioCtx.sampleRate * dur);
    var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var data = buffer.getChannelData(0);
    for(var i=0;i<bufferSize;i++) data[i] = Math.random()*2-1;
    var noise = audioCtx.createBufferSource();
    noise.buffer = buffer;
    var filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1100;
    filter.Q.value = 0.6;
    var g = audioCtx.createGain();
    var now = audioCtx.currentTime;
    g.gain.setValueAtTime(0.1, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    noise.connect(filter).connect(g).connect(audioCtx.destination);
    noise.start(now);
    noise.stop(now + dur + 0.02);
  }
  function sError(){ ensureAudio(); blip({ freqStart:200, freqEnd:90, dur:0.26, type:'sawtooth', gain:0.07 }); }
  function sSuccess(){
    ensureAudio();
    blip({ freqStart:700, freqEnd:1000, dur:0.1, type:'sine', gain:0.06 });
    setTimeout(function(){ blip({ freqStart:1000, freqEnd:1500, dur:0.12, type:'sine', gain:0.06 }); }, 90);
  }
  function startAmbience(){
    if(!audioCtx || ambienceStarted || !soundEnabled) return;
    ambienceStarted = true;
    var bufferSize = audioCtx.sampleRate * 2;
    var buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    var data = buffer.getChannelData(0);
    for(var i=0;i<bufferSize;i++) data[i] = Math.random()*2-1;
    var noise = audioCtx.createBufferSource();
    noise.buffer = buffer; noise.loop = true;
    var filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 480;
    var gain = audioCtx.createGain(); gain.gain.value = 0.018;
    noise.connect(filter).connect(gain).connect(audioCtx.destination);
    noise.start();
    var lfo = audioCtx.createOscillator(); lfo.frequency.value = 0.07;
    var lfoGain = audioCtx.createGain(); lfoGain.gain.value = 140;
    lfo.connect(lfoGain).connect(filter.frequency);
    lfo.start();
    ambienceNodes = { noise:noise, filter:filter, gain:gain, lfo:lfo };
    scheduleBubbleSound();
  }
  function scheduleBubbleSound(){
    if(!ambienceStarted) return;
    var delay = 4000 + Math.random()*6000;
    setTimeout(function(){
      if(soundEnabled && audioCtx){
        blip({ freqStart:900+Math.random()*400, freqEnd:1400+Math.random()*400, dur:0.09, type:'sine', gain:0.03 });
      }
      scheduleBubbleSound();
    }, delay);
  }
  function stopAmbience(){
    if(!ambienceStarted) return;
    ambienceStarted = false;
    try{
      ambienceNodes.noise.stop();
      ambienceNodes.lfo.stop();
    }catch(e){}
    ambienceNodes = null;
  }
  function setSoundEnabled(on){
    soundEnabled = on;
    try{ localStorage.setItem('aquarium_sound', on ? '1' : '0'); }catch(e){}
    document.getElementById('soundLabel').textContent = 'SOUND: ' + (on ? 'ON' : 'OFF');
    renderSoundIcon();
    if(on){ ensureAudio(); startAmbience(); }
    else { stopAmbience(); }
  }
  document.getElementById('soundToggle') && document.getElementById('soundToggle').addEventListener('click', function(){
    setSoundEnabled(!soundEnabled);
  });
  document.addEventListener('click', function(e){
    if(e.target.closest && e.target.closest('.btn')) sButton();
  });

  /* =======================================================
     DAY / NIGHT SKY MODE
     ======================================================= */
  var SKY_MODE_KEY = 'aquarium_sky_mode';
  var SKY_MODE_ORDER = ['cycle', 'day', 'night'];
  var SKY_MODE_LABEL = { cycle:'SKY: CYCLE', day:'SKY: DAY', night:'SKY: NIGHT' };
  var skyMode = 'cycle';
  try{
    var storedSkyMode = localStorage.getItem(SKY_MODE_KEY);
    if(SKY_MODE_ORDER.indexOf(storedSkyMode) !== -1) skyMode = storedSkyMode;
  }catch(e){}

  function setSkyMode(mode){
    skyMode = mode;
    try{ localStorage.setItem(SKY_MODE_KEY, mode); }catch(e){}
    document.getElementById('skyLabel').textContent = SKY_MODE_LABEL[mode];
    renderSkyIcon();
  }
  document.getElementById('skyToggle') && document.getElementById('skyToggle').addEventListener('click', function(){
    var idx = SKY_MODE_ORDER.indexOf(skyMode);
    setSkyMode(SKY_MODE_ORDER[(idx + 1) % SKY_MODE_ORDER.length]);
  });

  /* =======================================================
     PIXEL ICONS (hand-drawn bitmaps, no image assets)
     ======================================================= */
  var HOME_ICON = [
    "...#...",
    "..###..",
    ".#####.",
    "#######",
    "#######",
    "#######",
    "#######"
  ];
  var AUTHOR_ICON = [
    "......#",
    ".....##",
    "....##.",
    "...##..",
    "..##...",
    ".##....",
    "##....."
  ];
  var NOTE_ICON = [
    "....##",
    "....#.",
    "....#.",
    "....#.",
    "....#.",
    "##..#.",
    "###.#."
  ];
  var MUTE_SLASH = [[0,6],[1,5],[2,4],[2,3],[3,2],[4,1],[5,0]];
  var SKY_DISC = [
    ".#####.",
    "#######",
    "#######",
    "#######",
    "#######",
    "#######",
    ".#####."
  ];

  function drawBitmapIcon(canvas, bitmap, cell, color){
    if(!canvas) return;
    var ictx = canvas.getContext('2d');
    ictx.imageSmoothingEnabled = false;
    ictx.clearRect(0, 0, canvas.width, canvas.height);
    ictx.fillStyle = color;
    for(var r=0;r<bitmap.length;r++){
      var row = bitmap[r];
      for(var c=0;c<row.length;c++){
        if(row[c] === '#') ictx.fillRect(c*cell, r*cell, cell, cell);
      }
    }
  }
  function renderSoundIcon(){
    var canvas = document.getElementById('soundIcon');
    drawBitmapIcon(canvas, NOTE_ICON, 2, '#f3fbf6');
    if(!soundEnabled && canvas){
      var ictx = canvas.getContext('2d');
      ictx.fillStyle = '#ff6a3d';
      MUTE_SLASH.forEach(function(p){ ictx.fillRect(p[0]*2, p[1]*2, 2, 2); });
    }
  }
  function renderStaticIcons(){
    drawBitmapIcon(document.getElementById('homeIcon'), HOME_ICON, 2, '#f3fbf6');
    drawBitmapIcon(document.getElementById('authorIcon'), AUTHOR_ICON, 1, '#8fc2b8');
  }
  function renderSkyIcon(){
    var canvas = document.getElementById('skyIcon');
    if(!canvas) return;
    if(skyMode === 'cycle'){
      var ictx = canvas.getContext('2d');
      ictx.imageSmoothingEnabled = false;
      ictx.clearRect(0, 0, canvas.width, canvas.height);
      var cell = 2;
      for(var r=0;r<SKY_DISC.length;r++){
        var row = SKY_DISC[r];
        for(var c=0;c<row.length;c++){
          if(row[c] !== '#') continue;
          ictx.fillStyle = c < 3.5 ? '#ffcf6b' : '#c9d6ff';
          ictx.fillRect(c*cell, r*cell, cell, cell);
        }
      }
    } else {
      drawBitmapIcon(canvas, SKY_DISC, 2, skyMode === 'day' ? '#ffcf6b' : '#c9d6ff');
    }
  }
  renderStaticIcons();
  renderSoundIcon();
  document.getElementById('skyLabel').textContent = SKY_MODE_LABEL[skyMode];
  renderSkyIcon();

  /* =======================================================
     VIEW PASSWORD GATE (1006)
     ======================================================= */
  var VIEW_CODE = "1006";
  var gateEntered = "";
  var gate = document.getElementById('gate');
  var gateDots = document.getElementById('gateDots').children;
  var gateMsg = document.getElementById('gateMsg');
  var keypad = document.getElementById('keypad');

  function renderDots(dotsEl, entered){
    for(var i=0;i<dotsEl.length;i++){
      dotsEl[i].className = i < entered.length ? 'filled' : '';
    }
  }
  function gateKey(k){
    sKeypad();
    if(k === 'del'){
      gateEntered = gateEntered.slice(0,-1);
      gateMsg.textContent = ' ';
      renderDots(gateDots, gateEntered);
      updateGateZoomForEntry();
      return;
    }
    if(k === 'ok'){ tryUnlock(); return; }
    if(gateEntered.length >= 4) return;
    gateEntered += k;
    renderDots(gateDots, gateEntered);
    updateGateZoomForEntry();
    if(gateEntered.length === 4){ tryUnlock(); }
  }
  function tryUnlock(){
    if(gateEntered === VIEW_CODE){
      sSuccess();
      try{ sessionStorage.setItem('aquarium_unlocked','1'); }catch(e){}
      enterTank();
    } else {
      sError();
      gateMsg.textContent = 'WRONG CODE. TRY AGAIN.';
      gate.classList.add('shake');
      setTimeout(function(){ gate.classList.remove('shake'); }, 360);
      gateEntered = '';
      renderDots(gateDots, gateEntered);
      updateGateZoomForEntry();
    }
  }
  keypad.addEventListener('click', function(e){
    var btn = e.target.closest('button[data-k]');
    if(!btn) return;
    gateKey(btn.getAttribute('data-k'));
  });
  document.addEventListener('keydown', function(e){
    if(gate.classList.contains('hidden')) return;
    if(e.key >= '0' && e.key <= '9') gateKey(e.key);
    else if(e.key === 'Backspace') gateKey('del');
    else if(e.key === 'Enter') gateKey('ok');
  });

  function enterTank(){
    ensureAudio();
    if(soundEnabled) startAmbience();
    setGateZoom(1);
    gate.classList.add('gate-exit');
    setTimeout(function(){
      gate.classList.add('hidden');
      gate.classList.remove('gate-exit');
      var dock = document.getElementById('dock');
      var soundTab = document.getElementById('soundToggle');
      var skyTab = document.getElementById('skyToggle');
      var homeBtn = document.getElementById('homeBtn');
      dock.classList.remove('hidden');
      soundTab.classList.remove('hidden');
      skyTab.classList.remove('hidden');
      homeBtn.classList.remove('hidden');
      document.getElementById('authorTab').classList.remove('hidden');
      requestAnimationFrame(function(){ dock.classList.add('show'); soundTab.classList.add('show'); skyTab.classList.add('show'); homeBtn.classList.add('show'); });
    }, 520);
    loadLibrary();
  }

  function showHome(){
    var dock = document.getElementById('dock');
    var soundTab = document.getElementById('soundToggle');
    var skyTab = document.getElementById('skyToggle');
    var homeBtn = document.getElementById('homeBtn');
    dock.classList.remove('show');
    soundTab.classList.remove('show');
    skyTab.classList.remove('show');
    homeBtn.classList.remove('show');
    setTimeout(function(){
      dock.classList.add('hidden');
      soundTab.classList.add('hidden');
      skyTab.classList.add('hidden');
      homeBtn.classList.add('hidden');
    }, 500);
    document.getElementById('authorTab').classList.add('hidden');
    document.getElementById('pageNav').classList.add('hidden');
    gateEntered = '';
    renderDots(gateDots, gateEntered);
    gateMsg.textContent = ' ';
    if(boat){
      var homeXFrac = boatXFracForPage(0);
      boat.curXFrac = boat.fromXFrac = boat.toXFrac = homeXFrac;
    }
    setGateOrigin();
    updateGateZoomForEntry();
    gate.classList.add('gate-exit');
    gate.classList.remove('hidden');
    void gate.offsetWidth;
    requestAnimationFrame(function(){ gate.classList.remove('gate-exit'); });
  }
  document.getElementById('homeBtn').addEventListener('click', showHome);

  /* =======================================================
     ADMIN (AUTHOR) GATE (9365) — only you know this code
     ======================================================= */
  var ADMIN_CODE = "9365";
  var adminEntered = "";
  var isAdmin = false;
  var adminGate = document.getElementById('adminGate');
  var adminDots = document.getElementById('adminDots').children;
  var adminMsg = document.getElementById('adminMsg');
  var adminKeypad = document.getElementById('adminKeypad');
  var authorTab = document.getElementById('authorTab');

  try{ isAdmin = sessionStorage.getItem('aquarium_admin') === '1'; }catch(e){}

  function applyAdminUI(){
    document.getElementById('authorLabel').textContent = isAdmin ? 'AUTHOR: ON' : 'AUTHOR';
    authorTab.classList.toggle('on', isAdmin);
    document.getElementById('newFishBtn').classList.toggle('hidden', !isAdmin);
    document.getElementById('showJsonBtn').classList.toggle('hidden', !isAdmin);
    updateModalAdminUI();
  }
  authorTab.addEventListener('click', function(){
    if(isAdmin){
      isAdmin = false;
      try{ sessionStorage.removeItem('aquarium_admin'); }catch(e){}
      applyAdminUI();
      toast('AUTHOR MODE OFF.');
      return;
    }
    adminEntered = '';
    renderDots(adminDots, adminEntered);
    adminMsg.textContent = ' ';
    adminGate.classList.remove('hidden');
  });
  document.getElementById('adminCancelBtn').addEventListener('click', function(){
    adminGate.classList.add('hidden');
  });
  adminKeypad.addEventListener('click', function(e){
    var btn = e.target.closest('button[data-k]');
    if(!btn) return;
    adminKey(btn.getAttribute('data-k'));
  });
  function adminKey(k){
    sKeypad();
    if(k === 'del'){
      adminEntered = adminEntered.slice(0,-1);
      renderDots(adminDots, adminEntered);
      return;
    }
    if(k === 'ok'){ tryAdminUnlock(); return; }
    if(adminEntered.length >= 4) return;
    adminEntered += k;
    renderDots(adminDots, adminEntered);
    if(adminEntered.length === 4){ tryAdminUnlock(); }
  }
  function tryAdminUnlock(){
    if(adminEntered === ADMIN_CODE){
      sSuccess();
      isAdmin = true;
      try{ sessionStorage.setItem('aquarium_admin','1'); }catch(e){}
      adminGate.classList.add('hidden');
      applyAdminUI();
      toast('AUTHOR MODE UNLOCKED.');
    } else {
      sError();
      adminMsg.textContent = 'NOT YOUR CODE.';
      adminGate.classList.add('shake');
      setTimeout(function(){ adminGate.classList.remove('shake'); }, 360);
      adminEntered = '';
      renderDots(adminDots, adminEntered);
    }
  }
  document.addEventListener('keydown', function(e){
    if(adminGate.classList.contains('hidden')) return;
    if(e.key >= '0' && e.key <= '9') adminKey(e.key);
    else if(e.key === 'Backspace') adminKey('del');
    else if(e.key === 'Enter') adminKey('ok');
    else if(e.key === 'Escape') adminGate.classList.add('hidden');
  });

  /* =======================================================
     INDEXEDDB (this device's copy of the library)
     ======================================================= */
  var DB_NAME = 'enzos-aquarium-db', STORE = 'fish';
  var dbPromise = null;
  function openDB(){
    if(dbPromise) return dbPromise;
    dbPromise = new Promise(function(resolve,reject){
      var req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = function(){
        req.result.createObjectStore(STORE, { keyPath:'id' });
      };
      req.onsuccess = function(){ resolve(req.result); };
      req.onerror = function(){ reject(req.error); };
    });
    return dbPromise;
  }
  function dbPut(record){
    return openDB().then(function(db){
      return new Promise(function(resolve,reject){
        var tx = db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).put(record);
        tx.oncomplete = function(){ resolve(record); };
        tx.onerror = function(){ reject(tx.error); };
      });
    });
  }
  function dbGetAll(){
    return openDB().then(function(db){
      return new Promise(function(resolve,reject){
        var tx = db.transaction(STORE,'readonly');
        var req = tx.objectStore(STORE).getAll();
        req.onsuccess = function(){ resolve(req.result || []); };
        req.onerror = function(){ reject(req.error); };
      });
    });
  }
  function dbDelete(id){
    return openDB().then(function(db){
      return new Promise(function(resolve,reject){
        var tx = db.transaction(STORE,'readwrite');
        tx.objectStore(STORE).delete(id);
        tx.oncomplete = function(){ resolve(); };
        tx.onerror = function(){ reject(tx.error); };
      });
    });
  }

  /* =======================================================
     TOASTS
     ======================================================= */
  function toast(msg, isErr){
    var host = document.getElementById('toasts');
    var el = document.createElement('div');
    el.className = 'toast frame-outer frame-sm';
    var d = document.createElement('div');
    d.className = 'frame-inner';
    d.style.color = isErr ? 'var(--danger)' : 'var(--sand)';
    d.textContent = msg;
    el.appendChild(d);
    host.appendChild(el);
    setTimeout(function(){
      el.classList.add('toast-fade');
      setTimeout(function(){ el.remove(); }, 450);
    }, 3400);
  }

  /* =======================================================
     UTIL
     ======================================================= */
  function hashStr(s){
    var h = 2166136261;
    for(var i=0;i<s.length;i++){
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }
  function fmtDate(ts){
    var d = new Date(ts);
    return d.toLocaleDateString(undefined,{ year:'numeric', month:'short', day:'numeric' });
  }
  function uid(){
    return 'f' + Date.now().toString(36) + Math.random().toString(36).slice(2,9);
  }

  /* =======================================================
     SEED LIBRARY
     Fish baked into this published page so anyone who opens
     the link and enters 1006 sees them, on any device, without
     needing their own upload. New fish hatched later through
     author mode only appear elsewhere once folded back in here.
     ======================================================= */
  var SEED_FISH = [
    { id:"seed-2025-06-20", name:"June 20, 2025", addedAt:1750420800000, text:"In every playlist lies pieces of you in it.\nAnd in every time spent deciding on which food to pick,\nlies pieces of you in it.\nWithin every room I stumble into,\nand in every sound heard,\nlies pieces of you in it.\n\nEverything that is touched, or merely thought about,\nlies you in it.\n\nAnd now as I lie in bed,\nprancing upon the lilies of sorrowful thoughts,\nlies your tender soul,\nas sweetening as forenoon’s nectar.\n\nAnd as I indulge in such luciousness,\nI savour and examine upon the complexities in the taste of your love.\nIt is a taste I want to continue to relish,\nlong past the wilting of petals.\n\nIn every word and sentenced stringed,\nlies pieces of you in it." },
    { id:"seed-2025-06-30", name:"June 30, 2025", addedAt:1751284800000, text:"I used to hate a lot of things. Small talk. Check-ins. Writing. Being emotionally open. Letting people in. Putting effort into things. Even just waking up and doing life. It all felt exhausting in ways I couldn’t really explain. I’d roll my eyes at surface-level conversations, keep people at arm’s length, pretend I didn’t care. I didn’t want to talk about how I was doing, and I definitely didn’t want to hear someone else’s life story either.\n\nWriting felt like a chore. It made me sit with thoughts I didn’t want to face. And being vulnerable? That was the worst. I didn’t like being soft. I didn’t like showing emotion. I didn’t like the risk of being seen, of being misunderstood, or worse—ignored. So I kept things short, kept them safe. Didn’t ask too many questions. Didn’t give many answers. I figured if I didn’t expect much, I wouldn’t get disappointed.\n\nI think I was just tired of feeling like I had to try all the time. Trying meant the chance of failing, and failing felt personal. I didn’t want to invest energy into people or goals or conversations that might not go anywhere. It felt easier to stay distant. Easier not to care too deeply.\n\nAnd then I met you.\n\nAnd things started changing in ways I didn’t plan for. It wasn’t overnight. But little by little, I started doing the things I used to avoid. I started asking how your day was and actually wanting to know. I started listening to the small details—not out of obligation, but because they mattered to you, and that made them matter to me. You could tell me about how your lunch didn’t taste right or how the wind felt weird this morning, and I’d want to hear it. Not because it was dramatic or life-changing, but because it was you.\n\nI started checking in more. Asking if you slept okay. I paid attention to what drinks you liked, what made you tired, what stressed you out. It all became important. Even the parts you didn’t think twice about.\n\nI guess I started trying, without even realizing it. Not because I had to—but because I wanted to. I wanted to be better for you. Not perfect. Just real. The kind of version of myself I could feel good handing over. The kind of person you’d want to grow old next to.\n\nAnd now, I picture that—years from now. Us being older, slower. Our hands not as steady, our voices not as strong. I imagine us sitting together, maybe in a quiet room or on a porch somewhere, looking back. Thinking about everything we went through. Everything we built. The version of life we created together, one day at a time.\n\nAnd in that moment, I know I’d smile. Because even though I started off hating all these little parts of life—talking, trying, opening up—it all changed because of you. You made it safe. You made it feel worth it. You made me want to show up, and keep showing up.\n\nI’m not trying to be dramatic when I say this—I just really mean it: I used to feel like I was just passing time. Now, I feel like I’m building something. Something with you.\n\nAnd that’s all I’ve ever really wanted, even when I was too scared to admit it." },
    { id:"seed-2025-07-04", name:"July 4, 2025", addedAt:1751630400000, text:"Sometimes, I feel like it’s inevitable—that one day, she’ll come to terms with reality and realize I’m not the best for her. Not because I did something wrong, but because I’m simply not everything. I’m not the tallest guy she’ll meet. I’m not the most attractive or the richest or the smartest. And maybe, eventually, whatever it is I bring to the table won’t be enough to keep her there.\n\nI think I’ve known that from the start. Known it and tried to ignore it. Because she’s not new to love. She’s not untouched by it. She’s had her heart cracked open before, had her expectations raised and broken, had her world revolve around someone who wasn’t me. And that knowledge sits heavy. Not as jealousy exactly, but as fear. As comparison. Because I know what it means to love someone for the first time.\n\nShe is my first love.\n\nNot in the shallow, high school, hold-hands-and-break-up-a-week-later kind of way. But in the real way. The way where you look at someone and see them fully. Where their mood affects yours without them even saying a word. Where every small thing they do—their laugh, their sigh—feels like magic. Where you stay up late just to hear how their day went. Where you choose them, over and over, even when they’re not easy to hold.\n\nShe is my first everything. The first person I’ve loved in full. The first person I’ve seen as a whole world, not just a person. And that kind of love—it sticks. It shapes you. It carves out permanent space.\n\nThat’s why I can’t stop thinking about the fact that I’m not hers. I’m not her first. And even if I become her last, I’ll never be her beginning. I’ll never be the one who taught her how to love, or the one who made her believe in it for the first time. I’ll never be the first set of arms she ran to when everything went wrong. I’ll never be the name that makes her flinch a little when it comes up years later.\n\nAnd that stays with me. The thought that maybe, no matter how good things are now, a part of her will always belong to him. That no matter how much time passes, or how deeply she cares about me, there will always be a quiet corner in her heart where he still lives. Not out of choice, but out of memory. Out of firsts.\n\nBecause the truth is: nothing compares to a first. We spend our lives chasing that feeling—the first high, the first rush, the first kiss that made us dizzy. We are nostalgic creatures, always trying to recreate the initial spark that made life feel new. And no matter how much better or healthier things get, there’s always a shadow of that first time. A “what if” that lingers.\n\nSo yes, maybe she’s moved on. Maybe she’s deleted the photos, blocked the number, rewritten her story. But I know how memory works. I know how a song can come on and gut you. How an old hoodie can make someone feel like they’re back in a moment they didn’t realize they missed. How a single, stupid detail can take you right back to the person you swore you were over.\n\nAnd what scares me most—what breaks me—is the thought that she’ll never love me the way I love her. Because the way I love her is untouched. It’s not a second draft. There’s no ghost in the background. There’s no one else I measure her against. She is the start of everything for me. My first I love you. My first late-night “get home safe” texts. My first future I actually wanted to build with someone.\n\nBut I know I’m not that for her. And I’m terrified that deep down, she’s still chasing a version of what she had. That when she lies next to me, part of her is lying somewhere else, in some other bed, in some other life, with him. That even if she stays, some part of her has already left. Or worse—never fully arrived.\n\nAnd I know it’s not her fault. This isn’t about blame. It’s about weight. The weight of knowing you’re giving someone everything, and still wondering if it will ever be enough. The weight of loving someone in a way they can’t fully give back, not because they don’t care, but because they’ve already spent that kind of love on someone else.\n\nI try not to think about it. I try to focus on what we have now. But it creeps in—the doubt. The quiet ache of feeling second, even when you're the one they’re with. The fear that no matter how well I treat her, how much I try to understand her, how deeply I love her... there’s someone else who got there first.\n\nAnd he will always have that.\n\nA part of me will probably always compare myself to him. Even if I never say it out loud. Even if I know it’s unfair. Because when you love someone like this, it’s not about logic. It’s about longing. It’s about wanting to be the person for someone, not just a person.\n\nAnd what hurts most of all—what really stays with me—is knowing she’s that person for me. She’s the one I’d never forget, no matter how it ends. And if we do grow old together, if we get there—grey hair, tired eyes, quiet mornings—I’ll look back and smile. I’ll be proud. I’ll be grateful. But I’ll always know she wasn’t mine from the start.\n\nShe is the first for me.\nAnd I’ll never get to be that for her." },
    { id:"seed-2025-07-25", name:"July 25, 2025", addedAt:1753444800000, text:"Like every fool before me who’s ever been in love—the millions before me, aching and hopeful and human—I make the same promises. I promise you the world. I promise not to leave when things get hard. I promise to look at you the same way even when we’re old and tired and soft around the edges. I promise to find ways, big and small, to remind you that you matter. That you’re enough. That you’re it.\n\nI know I’m not the first to say these things. I know I won’t be the last. But even knowing that, it feels like something entirely mine when I say it to you. When I speak it with your name in my mouth. When I mean it with your face in my hands. I don’t care how cliché it sounds—I’d carve every word into the sky if it meant you’d believe me.\n\nBecause it feels right, doing this for you. Not because I’m chasing some perfect version of love, but because when I look at you—really look at you—I see something I can’t explain. And maybe I’ll never fully understand why my heart reacts the way it does. Why I can be in a crowded room and still only see you. Why your laugh feels like gravity. Why my hands naturally find yours without even thinking. Why your presence makes me want to become a softer man, a better one.\n\nIt’s not just love. It’s something deeper. Something messier and more permanent.\n\nMy mind always circles back to you. Even when I try to think about other things, you're there—in the background, in the quiet. In the way I notice the moon a little more. In the way I start remembering the names of flowers. In the way I pause before making decisions, wondering how they’ll affect us, not just me.\n\nIt’s a feeling that will take me lifetimes to understand. And maybe I never will. Maybe there’s no language big enough to hold what I feel for you. No metaphor strong enough to carry the weight of it. But still—I’ll go through the motions with you. I’ll keep trying. I’ll keep showing up. I’ll keep fumbling and reaching and choosing you, over and over again.\n\nBecause yes, I’m a fool. I’m a fool in love, like every fool who came before me. But I’ll gladly out-fool every one of them if it means I get to keep waking up in this story with you.\n\nI’ll love you with all the clumsy, imperfect tenderness I have. With shaking hands and wide eyes. I’ll love you through your worst days and mine. Through change and fear and uncertainty. I’ll love you even when I’m tired. Even when it’s hard. Especially when it’s hard.\n\nBecause if this love makes me a fool, then let me be the most foolish man this world has ever known.\n\nLet me be remembered for how much I loved you.\n\nLet me leave behind that kind of mark.\n\nBecause in the end, I don’t need to be wise. I just need to be yours." },
    { id:"seed-2025-08-17", name:"August 17, 2025", addedAt:1755432000000, text:"I want to learn her in fragments. The small, overlooked subtleties that slip by everyone else. The glow in her eyes when her favorite show pulls her in, the way her laughter spills differently depending on whether she’s surprised or already bracing for the joke. How her expression softens when she eats something she craves. The way her hand curls around her pencil while studying. I want to memorize her voice in the morning, fragile and unguarded, and the way her skin smells faintly of soap after a shower.\n\nIt’s not the grand gestures I crave—it’s the small, ordinary, everyday moments that feel almost too delicate to name. The face she makes in her sleep, like she’s fighting invisible battles behind closed eyes. The glassiness in her gaze after she’s cried. The particular tilt of her brow when she’s concentrating, the pauses she doesn’t realize she takes when she’s lost in thought. I could keep going until my hands ache, until language itself frays under the weight of trying to capture her.\n\nSometimes I catch myself wondering why these fragments matter so much. Maybe it’s because those are the pieces no one performs. They slip out when she isn’t trying, proof that who she is can’t be rehearsed. It makes every glance feel like a secret I’ve stumbled into by accident.\n\nI think part of me is shaped by what I’ve seen in my parents, the way they still find traces of joy in the simple lives they’ve built, even while no longer together. There’s something steady in that, something that doesn’t need to be loud to be real. And I think that’s how I want to love her too. In a world obsessed with noise and spectacle, I want the opposite. I don’t want to love her as a performance. I want to love her quietly, without reason or audience. Just because I do.\n\nAnd maybe that’s the truth of it: I adore everything she does, every unconscious movement, every detail that slips past the surface. It’s why I long to see her all the time, why I hold back from asking, “When’s the next time I can be near you?” Until then, I’m left rehearsing the moment in my head, imagining the way my own face will soften when I finally get to watch her closely again.\n\nWhen that moment comes, I don’t think I’ll say much. Just looking at her will be enough." },
    { id:"seed-2026-02-22", name:"February 22, 2026", addedAt:1771761600000, text:"I like expectable outcomes and immovable routines.\n\nIn feeling the sun radiate over me as I lay solemnly in bed, or the rush of dopamine blossoming within my brain as I lift weights.\n\nResiding in hours of doomscrolling, or an intrinsically assembled burger.\n\nThese foreseeable endings—whilst rewatching my favourite movies—satisfy a shallow vessel of my gratification.\n\nBut what made those movies, my favourite, is the sublimeness that occupied the emotional surprise and questioning those films encapsulated.\n\nAnd in learning the complexities I stumble upon in devoting myself to you, I am reminded as to why you’re my favourite, of all things.\n\nIn studying your face, attempting to differentiate your lashes and mapping the moles residing on the side of your face, or when asking your preferences and perceptions on my trivial questions, I learn one new shade of your abstruse colour.\n\nMy favourite food, colour, film, and memories; are captured within your individuality.\n\nI like expectable outcomes and immovable routines.\n\nAnd I am irrevocably in love with your complexities and the fluctuation of your days.\n\nYou are the colour with infinite qualities to observe, to adore, to cherish." },
    { id:"seed-2026-03-12", name:"March 12, 2026", addedAt:1773316800000, text:"In tracing the slenderness of your arms, the curvature of your figure, the suppleness of your lips, the femininity of your mien charms me. Taking my breath and skipping the rhythm of my heart.\n\nOh, how I adore that smile, that bewitching smile, the tenderness of your face sculpting the beauty of it. As rare as a gemstone, of which you hide in instinctual ways.\n\nEven in the softness of your speech, entangling your cadencies with that tone of yours, as quick-witted as gentle, I love it.\n\nYou are the femininity my heart aches for, of which I am completely vulnerable to. Every analogy and description I make of you undermines the connection you have emplaced upon my soul.\n\nI miss you more than the sun misses the moon at night, my dear one, my lover." },
    { id:"seed-2026-03-30", name:"March 30, 2026", addedAt:1774872000000, text:"I am grateful for you.\n\nFor your birth, for the moment the world met you, for the way I just know—without ever needing to be told—that you must have lit up the room when you arrived. I wonder if the doctors and nurses paused for just a second, if the universe itself held its breath, knowing someone extraordinary had just entered its orbit. I wasn’t there, but I feel it in my bones: the inevitability of you.\n\nI am grateful for every hardship that shaped you, for the sharp edges that softened over time, for the wounds that healed into wisdom. I don’t love that you had to hurt, but I love the person you became because of it. The one who stands before me now, strong in ways you don’t even realize. The one who is kind to me in ways I never expected, who makes space for me without hesitation, without effort—like it’s the most natural thing in the world.\n\nI am grateful for your moods, even the ones that come without warning, even the ones that turn the air heavy between us. I am grateful for the way you get annoyed so easily, because it reminds me that you feel everything deeply. That you are alive in the fullest sense of the word. And I am just as grateful for the way your laughter follows so easily after—the way I can say something barely worth a smirk, yet you laugh like I have given you a gift. Like my presence alone is enough to make joy spill out of you.\n\nI am grateful for your voice. For the softness of it. For the way it carries the weight of everything you’ve been through, the way it lingers in the air long after you’ve stopped speaking. It is the kind of voice that makes people listen. The kind that settles inside you like a quiet revelation.\n\nAnd more than anything, I am grateful for your love.\n\nI am still learning what it means, what it holds, what it asks of me. But I know I am lucky to have it. I know that love like yours—steady, unforced, unshaken—is rare. And I know that if I spent the rest of my life searching, I would never find another you.\n\nBecause you are the exception." },
    { id:"seed-2026-04-01", name:"April 1, 2026", addedAt:1775044800000, text:"I woke with her name tangled in my breath, as if it had spent the night threading itself through my lungs, wrapping around each inhale and exhale until I could no longer tell where it ended and I began. It’s strange, the weight of a name. How it can press into you, settle between your ribs, leave bruises that no one else can see.\n\nHer name still hums beneath my skin, a quiet echo in my bones. It lingers, not just in memory, but in the very structure of me, as if my veins remember the shape of her better than I do. There are days I wonder if love is nothing more than a form of haunting—how else can I explain the way she moves through me, the way she occupies space I didn’t know I had?\n\nSome nights, I think about carving her name into my bones, pressing her memory so deep inside me that even the marrow would recognize her touch. Maybe then, I would never have to worry about forgetting. Maybe then, she would become something I could never lose.\n\nBut the truth is, I could never lose her. Not really. She is in everything. In the way the morning light spills through my window, in the rhythm of my pulse, in the quiet moments when the world stills and all that remains is the warmth of her voice in my mind. She has rooted herself so deeply within me that even the simplest things remind me of her—a song, a scent, the way the wind moves through the trees. She is everywhere. She is everything.\n\nShe is the happiest thought I have ever had. The gentlest, the brightest, the most certain thing in a world that so often feels unsteady. And I have never felt more sure of anything than I am of her. She is not just someone I love—she is the very reason I understand what love is. If I could gather up all the words in the world, if I could weave them into something grand enough, beautiful enough, maybe then I could come close to describing what she means to me. But even then, it would never be enough.\n\nShe is my favorite feeling. My quietest comfort. The best thing that has ever happened to me. And I, I am the luckiest person in the world, simply because I get to love her." },
    { id:"seed-2026-04-03", name:"April 3, 2026", addedAt:1775217600000, text:"You are all the little things.\n\nThe quiet glances and the half-formed thoughts. The thread woven through the ordinary that makes everything feel softer. You are my favourite responsibility—the only weight I carry that makes me feel lighter.\n\nI cannot imagine a future without you, even when I know how dangerous that is. Even when the thought tightens in my chest like a string pulled too taut. You are not just in my life; you are etched into the way I move through it.\n\nLoving you is not instinct.\n\nIt is not breath or blood or something the body does without knowing. It is a choice—a deliberate, stubborn, tender decision I keep making. I carve out time for you in the quiet corners of my day. I pour pieces of myself into every conversation, not because I’m expected to, but because I want to. Because you matter.\n\nThey say love just happens. That it erupts, like a spark struck in the dark. But this—this is different. This is the slow, burning kind. The kind you tend to with gentle hands and tired eyes. The kind that doesn’t beg to be noticed, but simply exists, steady and sure.\n\nWe could’ve stopped.\n\nWe could’ve let silence fill the spaces where our voices once lived. We could’ve let time do what time always does—pull people apart like tide against stone. But we didn’t.\n\nWe stayed. We chose to show up—again and again and again. To talk. To listen. To see each other.\n\nThere is something unspeakably beautiful in that.\n\nIn the way we keep choosing one another, even when the world asks us not to. In the way our love rages and rests, flickers and flares, never quite settling, never quite burning out.\n\nLove, real love, is not survival.\n\nWe do not need it to live—but we let it shape us anyway. And maybe that’s what makes it sacred: That despite everything, despite the noise, the doubt, the heaviness of being human—I choose to love you. And you choose me back. Not because it’s easy. Not because it’s perfect. But because in this chaotic, ever-changing world, We found something worth holding onto.\n\nSomething worth staying for. Something worth choosing, every single day." },
    { id:"seed-2026-04-04", name:"April 4, 2026", addedAt:1775304000000, text:"She is,\n\nShe is a beautiful shade of hickory brown, and the transcendent colour of madonna lilies in June.\n\nShe is the choice of gold over silver, savoury over sweet, sunny over rainy days, and walking fast over slow.\n\nShe is the sincerity of knowing one’s preference and the simplicities of enjoyment life has to offer.\n\nShe is the personification of laughter, the warmth of an August evening, and the satisfaction of a good nights rest.\n\nShe is an amazing conversation, and the suppleness of a newborn's skin.\n\nShe embodies the love found between our lines of text, restaurant booths, and my dad’s car seats.\n\nShe is the roof over my head, the shoes beneath my feet.\n\nShe is a beautiful shade of hickory brown.\nThe transcendent colour of madonna lilies in June.\n\nShe is, my lover." },
    { id:"seed-2026-06-08", name:"she loved the boy", addedAt:1780920000000, text:"she didn’t just love the young man—\nshe loved the boy I tried to forget.\n\nthe boy who swallowed his voice\nbecause every word felt like too much.\nthe boy who cried quietly,\nface buried in a pillow,\nhoping someone might hear\nbut knowing no one would come.\n\nshe loved the boy who ate fast\nlike he didn’t deserve to be full,\nlike love was something rationed,\nand he’d already taken too much.\n\nshe found the boy\nwho sat in rooms filled with people\nand still felt like background noise.\nthe one who started asking\nwhy no one ever really saw him—\nwhy being alive didn’t feel like being here.\n\nshe held the boy who tried\nto speak his truth,\nonly to be met with correction,\ndismissal,\na sigh.\nhe learned to shrink,\nto apologize for existing,\nto disappear while staying put.\n\nand still—\nshe stayed.\nnot just with me,\nbut with him.\n\nshe didn’t turn away\nfrom the broken parts,\nthe scared parts,\nthe tired parts.\nshe looked right at the boy I abandoned\nand whispered,\nyou didn’t do anything wrong.\n\nand in that moment,\nhe wept.\n\nnot out of pain,\nbut because someone finally saw him\nand didn’t flinch.\n\nshe loved the boy I buried\nso gently,\nhe came back to life\njust to rest in her arms." }
  ];
  function getDeletedSeeds(){
    try{ return JSON.parse(localStorage.getItem('aquarium_deleted_seeds') || '[]'); }catch(e){ return []; }
  }
  function markSeedDeleted(id){
    var d = getDeletedSeeds();
    if(d.indexOf(id) === -1){
      d.push(id);
      try{ localStorage.setItem('aquarium_deleted_seeds', JSON.stringify(d)); }catch(e){}
    }
  }
  function seedLibrary(existingIds){
    var deleted = getDeletedSeeds();
    var toAdd = SEED_FISH.filter(function(s){ return existingIds.indexOf(s.id) === -1 && deleted.indexOf(s.id) === -1; });
    if(toAdd.length === 0) return Promise.resolve();
    return Promise.all(toAdd.map(function(s){
      var record = { id:s.id, name:s.name, text:s.text, addedAt:s.addedAt };
      return dbPut(record).then(function(){ addToLibrary(record); });
    }));
  }

  /* =======================================================
     FISH SPRITES (pixel bitmaps, modeled loosely on real species)
     ======================================================= */
  var DARTER_BASE = [ // slim streamlined body (tetra/clownfish/goldfish family)
    "..............",
    "......FF......",
    "....FFFFFF....",
    "..BBBBBBBBBB..",
    ".TBBBBBBBBBBB.",
    "TTBbbbbbbbbbHE",
    ".TBBBBBBBBBBB.",
    "..BBBBBBBBBB..",
    "....ffffff....",
    "......ff......"
  ];
  var ANGEL_BASE = [ // tall disc body with long trailing fins (angelfish family)
    "....FF......",
    "...FFFF.....",
    "..FBBBBF....",
    ".FBBBBBBF...",
    "TBBBBBBBBB..",
    "TBBbbbbbBHE.",
    "TBBBBBBBBB..",
    ".FBBBBBBF...",
    "..FBBBBF....",
    "...FFFF.....",
    "....FF......"
  ];
  var BETTA_BASE = [ // showy flowing fins (betta / fancy fantail family)
    "................",
    "........FF......",
    "......FFFFFF....",
    ".TTBBBBBBBBBB...",
    "TTTBBBBBBBBBBB..",
    "TTTTTbbbbbbbbbHE",
    "TTTBBBBBBBBBBB..",
    ".TTBBBBBBBBBB...",
    "......ffffff....",
    "........ff......"
  ];

  // Replaces body characters at fixed columns to lay down stripe/bar markings
  // without hand-aligning every row (keeps species art edit-safe).
  function stripeCols(rows, cols, ch, targets){
    targets = targets || { B:1, b:1 };
    return rows.map(function(row){
      var arr = row.split('');
      cols.forEach(function(ci){
        if(arr[ci] !== undefined && targets[arr[ci]]) arr[ci] = ch;
      });
      return arr.join('');
    });
  }

  var CLOWNFISH_SPRITE = stripeCols(stripeCols(DARTER_BASE, [5,9], 'W'), [4,10], 'O');
  var ANGELFISH_SPRITE = stripeCols(ANGEL_BASE, [3,7], 'S');

  function jitter(h, shift, range){ return (h >>> shift) % range; }

  var SPECIES = [
    { // Clownfish - Amphiprion ocellaris: orange body, white bars edged in black
      sprite: CLOWNFISH_SPRITE,
      palette: function(h){
        var hue = 14 + jitter(h, 2, 10);
        var sat = 82 + jitter(h, 5, 12);
        var l = 52 + jitter(h, 8, 8);
        return {
          B: 'hsl(' + hue + ' ' + sat + '% ' + l + '%)',
          b: 'hsl(' + hue + ' ' + sat + '% ' + (l-16) + '%)',
          O: '#1c0f08', T: '#1c0f08', F: '#1c0f08', f: '#1c0f08',
          W: '#fff8ee', H: 'hsl(' + hue + ' 90% 88%)',
          E: '#fffdf7', P: '#140b06'
        };
      }
    },
    { // Neon Tetra - Paracheirodon innesi: iridescent blue-green top, red lower half
      sprite: DARTER_BASE,
      palette: function(h){
        var hueTop = 186 + jitter(h, 2, 16);
        var hueBot = 350 + jitter(h, 6, 14);
        var l = 50 + jitter(h, 9, 8);
        return {
          B: 'hsl(' + hueTop + ' 85% ' + (l+4) + '%)',
          b: 'hsl(' + hueBot + ' 80% ' + (l-10) + '%)',
          T: 'hsl(' + hueBot + ' 80% ' + (l-2) + '%)',
          F: 'hsl(' + hueTop + ' 35% 90%)', f: 'hsl(' + hueTop + ' 35% 90%)',
          H: 'hsl(200 25% 93%)', E: '#f2fbff', P: '#0a1420'
        };
      }
    },
    { // Goldfish - Carassius auratus: solid warm orange-red, no markings
      sprite: DARTER_BASE,
      palette: function(h){
        var hue = 20 + jitter(h, 2, 14);
        var sat = 85 + jitter(h, 5, 10);
        var l = 52 + jitter(h, 8, 10);
        return {
          B: 'hsl(' + hue + ' ' + sat + '% ' + l + '%)',
          b: 'hsl(' + hue + ' ' + sat + '% ' + (l-16) + '%)',
          T: 'hsl(' + hue + ' ' + sat + '% ' + (l+8) + '%)',
          F: 'hsl(' + hue + ' ' + Math.max(40,sat-20) + '% ' + (l+18) + '%)',
          f: 'hsl(' + hue + ' ' + Math.max(40,sat-20) + '% ' + (l+18) + '%)',
          H: 'hsl(' + hue + ' 90% 90%)', E: '#fffaf0', P: '#241006'
        };
      }
    },
    { // Angelfish - Pterophyllum scalare: silver body, dark vertical bars
      sprite: ANGELFISH_SPRITE,
      palette: function(h){
        var l = 76 + jitter(h, 3, 10);
        return {
          B: 'hsl(200 12% ' + l + '%)',
          b: 'hsl(200 14% ' + (l-18) + '%)',
          S: 'hsl(220 30% ' + (12 + jitter(h,6,8)) + '%)',
          F: 'hsl(205 20% 85%)', f: 'hsl(205 20% 85%)',
          T: 'hsl(200 14% 55%)', H: 'hsl(45 70% 88%)',
          E: '#fbfefe', P: '#0a1420'
        };
      }
    },
    { // Betta - Betta splendens: jewel-toned body with huge flowing fins
      sprite: BETTA_BASE,
      palette: function(h){
        var hue = (h * 83) % 360;
        var sat = 70 + jitter(h, 3, 20);
        return {
          B: 'hsl(' + hue + ' ' + sat + '% 42%)',
          b: 'hsl(' + hue + ' ' + sat + '% 30%)',
          T: 'hsl(' + hue + ' ' + Math.min(95,sat+15) + '% 52%)',
          F: 'hsl(' + hue + ' ' + Math.min(95,sat+15) + '% 55%)',
          f: 'hsl(' + hue + ' ' + Math.min(95,sat+15) + '% 55%)',
          H: 'hsl(' + hue + ' 60% 78%)', E: '#fdf7ff', P: '#120a18'
        };
      }
    },
    { // Guppy - Poecilia reticulata: pale small body, wildly colorful tail/fins
      sprite: DARTER_BASE,
      palette: function(h){
        var bodyHue = 200 + jitter(h, 2, 40);
        var tailHue = (h * 47) % 360;
        return {
          B: 'hsl(' + bodyHue + ' 25% 68%)',
          b: 'hsl(' + bodyHue + ' 25% 50%)',
          T: 'hsl(' + tailHue + ' 85% 60%)',
          F: 'hsl(' + tailHue + ' 80% 65%)', f: 'hsl(' + tailHue + ' 80% 65%)',
          H: 'hsl(' + bodyHue + ' 40% 90%)', E: '#fbfffb', P: '#0a1420'
        };
      }
    }
  ];

  function makeFishDef(record){
    var h = hashStr(record.id + record.name);
    var species = SPECIES[h % SPECIES.length];
    var sprite = species.sprite;
    var palette = species.palette(h);
    var w = sprite[0].length, hgt = sprite.length;
    var cell = 2 + (h % 2); // bigger fish: each sprite cell is 2-3 logical px
    return {
      id: record.id,
      name: record.name,
      text: record.text,
      addedAt: record.addedAt,
      sprite: sprite, spriteW: w, spriteH: hgt, cell: cell,
      w: w*cell, h: hgt*cell,
      palette: palette,
      x: 0, y: 0, baseY: 0, targetY: 0,
      dir: (h % 2 === 0) ? 1 : -1,
      speed: 6 + (h % 100) / 12,
      bobPhase: (h % 628) / 100,
      bobAmp: 1.2 + (h % 5) * 0.3,
      wanderAt: 0
    };
  }

  /* =======================================================
     TANK RENDERER
     ======================================================= */
  var canvas = document.getElementById('tank');
  var ctx = canvas.getContext('2d');
  var PIXEL_SCALE = 3;
  var W = 0, H = 0;
  var DOCK_H = 30;
  var SAND_H = 14;
  var SKY_H = 60;
  var fishes = [];
  var bubbles = [];
  var weeds = [];
  var sparkles = [];
  var stars = [];
  var clouds = [];
  var birds = [];
  var glowMotes = [];
  var planeBanner = null;
  var reelAnim = null;
  var splashes = [];
  var running = false;
  var t = 0;
  var decor = [];
  var pageTransition = null;
  var boat = null;
  function easeInOutCubic(x){
    return x < 0.5 ? 4*x*x*x : 1 - Math.pow(-2*x+2, 3)/2;
  }
  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- color helpers for day/night blending ---- */
  function clamp01(x){ return Math.max(0, Math.min(1, x)); }
  function smoothstep(e0, e1, x){ var k = clamp01((x-e0)/(e1-e0)); return k*k*(3-2*k); }
  function hexToRgb(hex){
    var v = parseInt(hex.replace('#',''), 16);
    return [(v>>16)&255, (v>>8)&255, v&255];
  }
  // Accepts '#hex' or an already-built 'rgb()'/'rgba()' string, so a color
  // that was lerped once can be fed into a second lerp (used to chain the
  // vertical and day/night blends when building dithered sky/water bands).
  function anyToRgb(c){
    if(c.charAt(0) === '#') return hexToRgb(c);
    var m = c.match(/rgba?\(([-\d.]+)[,\s]+([-\d.]+)[,\s]+([-\d.]+)/);
    return m ? [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])] : [0,0,0];
  }
  function lerpColor(colorA, colorB, k){
    var a = anyToRgb(colorA), b = anyToRgb(colorB);
    var r = Math.round(a[0]+(b[0]-a[0])*k);
    var g = Math.round(a[1]+(b[1]-a[1])*k);
    var bl = Math.round(a[2]+(b[2]-a[2])*k);
    return 'rgb(' + r + ',' + g + ',' + bl + ')';
  }
  function lerpColorAlpha(colorA, colorB, k, alpha){
    var a = anyToRgb(colorA), b = anyToRgb(colorB);
    var r = Math.round(a[0]+(b[0]-a[0])*k);
    var g = Math.round(a[1]+(b[1]-a[1])*k);
    var bl = Math.round(a[2]+(b[2]-a[2])*k);
    return 'rgba(' + r + ',' + g + ',' + bl + ',' + alpha + ')';
  }

  /* ---- ordered dithering (4x4 Bayer matrix) ----
     A flat canvas fill only ever shows exactly the colors we tell it to; a
     32-bit-era sprite/background looked denser mostly because artists faked
     more tones than the hardware really had by alternating two solid colors
     pixel-by-pixel in a fixed pattern. Used throughout the tank renderer
     below in place of the old flat bands and smooth canvas gradients. */
  var BAYER4 = [
    [ 0, 8, 2, 10],
    [12, 4, 14, 6],
    [ 3, 11, 1, 9],
    [15, 7, 13, 5]
  ];
  function bayer(x, y){
    return (BAYER4[((y%4)+4)%4][((x%4)+4)%4] + 0.5) / 16; // 0..1, evenly spaced
  }
  // Quantizes value (0..1) into `bands` discrete steps, dithering exactly at
  // the boundary between two adjacent steps instead of hard-cutting.
  function ditherBand(value, bands, x, y){
    var scaled = clamp01(value) * (bands - 1);
    var lo = Math.floor(scaled);
    var frac = scaled - lo;
    if(frac > bayer(x, y) && lo < bands - 1) lo++;
    return lo;
  }

  /* ---- day / night cycle state ---- */
  var DAYNIGHT_CYCLE_SECONDS = 480;
  var skyPhase = 0.25, sunElevation = 1, moonElevation = -1, skyDayFactor = 1;
  function getSkyPhase(){
    if(skyMode === 'day') return 0.25;
    if(skyMode === 'night') return 0.75;
    return (t / DAYNIGHT_CYCLE_SECONDS) % 1;
  }
  function updateSkyState(){
    skyPhase = getSkyPhase();
    var angle = skyPhase * Math.PI * 2;
    sunElevation = Math.sin(angle);
    moonElevation = -sunElevation;
    skyDayFactor = smoothstep(-0.28, 0.28, sunElevation);
  }

  function resize(){
    W = Math.max(80, Math.floor(window.innerWidth / PIXEL_SCALE));
    H = Math.max(60, Math.floor(window.innerHeight / PIXEL_SCALE));
    SKY_H = Math.max(36, Math.min(110, Math.round(H * 0.2)));
    canvas.width = W; canvas.height = H;
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    ctx.imageSmoothingEnabled = false;
    fishes.forEach(clampFish);
  }
  window.addEventListener('resize', resize);

  function clampFish(f){
    var top = Math.max(DOCK_H, SKY_H) + 4, bottom = H - SAND_H - f.h - 2;
    if(bottom < top) bottom = top;
    if(f.x === 0 && f.y === 0){
      f.x = Math.random() * Math.max(1, W - f.w);
      f.baseY = top + Math.random() * Math.max(1,(bottom - top));
      f.targetY = f.baseY;
      f.y = f.baseY;
    } else {
      f.baseY = Math.min(Math.max(f.baseY, top), bottom);
      f.targetY = f.baseY;
    }
  }

  var WEED_KINDS = ['blade','blade','blade','fan','kelp'];
  function initWeeds(){
    weeds = [];
    var n = Math.max(8, Math.floor(W / 24));
    for(var i=0;i<n;i++){
      var colorRoll = Math.random();
      var hue = colorRoll < 0.78 ? (104 + Math.random()*56)   // mostly greens
        : colorRoll < 0.92 ? (272 + Math.random()*46)          // occasional purple sea whip
        : (186 + Math.random()*22);                             // occasional teal
      weeds.push({
        x: Math.round((i+0.5) * (W/n) + (Math.random()*10-5)),
        segs: 5 + Math.floor(Math.random()*4),
        kind: WEED_KINDS[Math.floor(Math.random()*WEED_KINDS.length)],
        hue: hue,
        speed: 0.6 + Math.random()*0.6,
        phase: Math.random()*10,
        glow: Math.random() < 0.2,
        glowHue: 165 + Math.random()*55
      });
    }
  }
  function initBubbles(){
    bubbles = [];
    for(var i=0;i<16;i++) bubbles.push(spawnBubble(true));
  }
  function spawnBubble(anywhere){
    return {
      x: Math.random()*W,
      y: anywhere ? SKY_H + Math.random()*(H-SAND_H-SKY_H) : H - SAND_H - Math.random()*4,
      r: 1 + Math.floor(Math.random()*2),
      vy: 6 + Math.random()*10,
      wob: Math.random()*10
    };
  }
  function initSparkles(){
    sparkles = [];
    for(var i=0;i<10;i++) sparkles.push(newSparkle());
  }
  function newSparkle(){
    return { x: Math.random()*W, y: SKY_H + Math.random()*40, life: Math.random()*2, max: 1.4+Math.random()*1.6 };
  }
  var DECOR_POOL = [
    'rock','rock','shell','shell','starfish','coral','coral','pebbles','pebbles',
    'coralReef','coralReef','anemone','anemone'
  ];
  function initDecor(){
    decor = [];
    var n = Math.max(12, Math.floor(W / 40));
    for(var i=0;i<n;i++){
      decor.push({ type: DECOR_POOL[Math.floor(Math.random()*DECOR_POOL.length)], x: Math.random()*W, hue: Math.random()*360 });
    }
    decor.push({ type:'chest', x: W*0.15 + Math.random()*W*0.7 });
    decor.push({ type:'sandcastle', x: W*0.06 + Math.random()*W*0.18 });
    decor.push({ type:'sandcastle', x: W*0.76 + Math.random()*W*0.18 });
  }

  /* ---- sky: stars, clouds, glow motes, birds ---- */
  function initStars(){
    stars = [];
    var n = Math.max(18, Math.floor(W/14));
    for(var i=0;i<n;i++){
      stars.push({
        x: Math.random()*W,
        y: 4 + Math.random()*Math.max(4, SKY_H-10),
        phase: Math.random()*10,
        speed: 0.5 + Math.random()*1.2,
        size: Math.random() < 0.15 ? 2 : 1
      });
    }
  }
  function newCloud(anywhere){
    var dir = Math.random() < 0.5 ? 1 : -1;
    return {
      x: anywhere ? Math.random()*W : (dir > 0 ? -40 - Math.random()*40 : W + 40 + Math.random()*40),
      y: 6 + Math.random()*Math.max(6, SKY_H*0.5),
      speed: 2 + Math.random()*2.4,
      scale: 0.7 + Math.random()*0.9,
      dir: dir
    };
  }
  function initClouds(){
    clouds = [];
    var n = 4 + Math.floor(Math.random()*2);
    for(var i=0;i<n;i++) clouds.push(newCloud(true));
  }
  function newGlowMote(){
    return {
      x: Math.random()*W,
      y: SKY_H + Math.random()*Math.max(1,(H-SAND_H-SKY_H)),
      hue: 165 + Math.random()*60,
      phase: Math.random()*10,
      speed: 0.3 + Math.random()*0.4
    };
  }
  function initGlowMotes(){
    glowMotes = [];
    for(var i=0;i<14;i++) glowMotes.push(newGlowMote());
  }
  function spawnBird(){
    var fromLeft = Math.random() < 0.5;
    birds.push({
      x: fromLeft ? -14 : W+14,
      y: 6 + Math.random()*Math.max(6, SKY_H*0.45),
      vx: (fromLeft ? 1 : -1) * (10 + Math.random()*6),
      bob: Math.random()*10,
      flapPhase: Math.random()*10
    });
  }
  function scheduleBird(){
    var delay = 18000 + Math.random()*24000;
    setTimeout(function(){
      if(!reducedMotion) spawnBird();
      scheduleBird();
    }, delay);
  }

  /* ---- aerial banner plane: flies over ever so often, towing a message ---- */
  var HEART_GLYPH = [
    ".HH.HH.",
    "HHHHHHH",
    "HHHHHHH",
    ".HHHHH.",
    "..HHH..",
    "...H..."
  ];
  function drawPixelHeart(x, y, cell, color){
    ctx.fillStyle = color;
    for(var r=0;r<HEART_GLYPH.length;r++){
      var row = HEART_GLYPH[r];
      for(var c=0;c<row.length;c++){
        if(row[c] === '.') continue;
        ctx.fillRect(Math.round(x+c*cell), Math.round(y+r*cell), cell, cell);
      }
    }
  }
  function spawnPlaneBanner(){
    var fromLeft = Math.random() < 0.5;
    planeBanner = {
      x: fromLeft ? -140 : W + 140,
      y: 9 + Math.random()*Math.max(6, SKY_H*0.3),
      vx: (fromLeft ? 1 : -1) * (14 + Math.random()*4)
    };
  }
  function schedulePlaneBanner(){
    var delay = 90000 + Math.random()*90000; // ever so often — roughly every 1.5-3 minutes
    setTimeout(function(){
      if(!reducedMotion) spawnPlaneBanner();
      schedulePlaneBanner();
    }, delay);
  }
  function drawPlane(x, y, dir){
    ctx.fillStyle = '#e6e6e6';
    ctx.fillRect(x-6, y-1, 12, 2);
    ctx.fillStyle = '#c8c8d0';
    ctx.fillRect(x-6, y, 12, 1);
    ctx.fillStyle = '#ff5a3d';
    ctx.fillRect(x + dir*6, y-1, 1, 2);
    ctx.fillStyle = '#2a3a4a';
    ctx.fillRect(x + dir*2, y-2, 2, 1);
    ctx.fillStyle = '#b8bcc4';
    ctx.fillRect(x-2, y+1, 5, 1);
    ctx.fillStyle = '#c8c8d0';
    ctx.fillRect(x - dir*6, y-3, 1, 3);
    ctx.fillRect(x - dir*7, y-1, 2, 1);
    ctx.fillStyle = 'rgba(70,70,75,0.65)';
    if(Math.sin(t*40) > 0) ctx.fillRect(x+dir*7, y-2, 1, 4);
    else ctx.fillRect(x+dir*7-1, y, 3, 1);
  }
  function drawPlaneBanner(dt, offsetX){
    offsetX = offsetX || 0;
    if(!planeBanner) return;
    var pb = planeBanner;
    pb.x += pb.vx * dt;
    if((pb.vx > 0 && pb.x > W + 140) || (pb.vx < 0 && pb.x < -140)){
      planeBanner = null;
      return;
    }
    var dir = pb.vx > 0 ? 1 : -1;
    var px = Math.round(pb.x + offsetX), py = Math.round(pb.y);

    drawPlane(px, py, dir);

    ctx.font = "7px 'Press Start 2P', monospace";
    ctx.textBaseline = 'top';
    var partA = 'enzo', partB = "'s Jireh";
    var wA = ctx.measureText(partA).width;
    var wB = ctx.measureText(partB).width;
    var heartCell = 1, heartW = 7*heartCell, gap = 3;
    var contentW = wA + gap + heartW + gap + wB;
    var padX = 5, padY = 3;
    var bannerH = 7 + padY*2;
    var bannerW = Math.round(contentW + padX*2);

    var tailX = px - dir*7;
    var ropeLen = 12;
    var nearX = tailX - dir*ropeLen;
    var farX = nearX - dir*bannerW;
    var bx0 = Math.round(Math.min(nearX, farX));
    var by0 = py + 2;

    ctx.strokeStyle = 'rgba(40,40,40,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(tailX, py);
    ctx.lineTo(nearX, by0+1);
    ctx.stroke();

    ctx.fillStyle = '#fdf6e3';
    ctx.fillRect(bx0, by0, bannerW, bannerH);
    ctx.fillStyle = '#c94321';
    ctx.fillRect(bx0, by0, bannerW, 1);
    ctx.fillRect(bx0, by0+bannerH-1, bannerW, 1);
    ctx.fillRect(bx0, by0, 1, bannerH);
    ctx.fillRect(bx0+bannerW-1, by0, 1, bannerH);

    var tx = bx0 + padX, ty = by0 + padY;
    ctx.fillStyle = '#1c0f08';
    ctx.fillText(partA, tx, ty);
    var heartX = tx + wA + gap;
    drawPixelHeart(heartX, ty, heartCell, '#ff5a6a');
    ctx.fillText(partB, heartX + heartW + gap, ty);
  }

  function drawBand(y0, y1, color){
    ctx.fillStyle = color;
    ctx.fillRect(0, y0, W, y1-y0);
  }
  var SKY_BANDS = 6;
  function drawSky(offsetX){
    offsetX = offsetX || 0;
    var df = skyDayFactor;
    var topColor = lerpColor('#050914', '#8fd3ff', df);
    var horizonColor = lerpColor('#131c30', '#eaf6ff', df);
    var skyH = SKY_H + 3; // +3 covers waveY()'s max dip so no gap shows through at the waterline
    var bandH = skyH / SKY_BANDS;
    for(var bi=0; bi<SKY_BANDS; bi++){
      var y0 = Math.round(bi*bandH), y1 = Math.round((bi+1)*bandH);
      ctx.fillStyle = lerpColor(topColor, horizonColor, bi/(SKY_BANDS-1));
      ctx.fillRect(0, y0, W, y1-y0);
    }
    // dithered seam between each pair of bands so the vertical gradient
    // reads as one continuous fade rather than flat stacked stripes
    for(var bs=0; bs<SKY_BANDS-1; bs++){
      var seamY = Math.round((bs+1)*bandH);
      var cA = lerpColor(topColor, horizonColor, bs/(SKY_BANDS-1));
      var cB = lerpColor(topColor, horizonColor, (bs+1)/(SKY_BANDS-1));
      for(var sx=0; sx<W; sx++){
        ctx.fillStyle = bayer(sx, seamY) > 0.5 ? cA : cB;
        ctx.fillRect(sx, seamY-1, 1, 2);
      }
    }

    var starAlpha = 1 - df;
    if(starAlpha > 0.02){
      for(var i=0;i<stars.length;i++){
        var s = stars[i];
        var tw = 0.5 + 0.5*Math.sin(t*s.speed + s.phase);
        ctx.fillStyle = 'rgba(255,255,255,' + (starAlpha*(0.35+0.5*tw)).toFixed(3) + ')';
        ctx.fillRect(Math.round(s.x + offsetX*0.15), Math.round(s.y), s.size, s.size);
      }
    }

    var centerX = W/2, radiusX = W*0.4;
    var angle = skyPhase * Math.PI * 2;
    function bodyY(elev){ var e = Math.max(0, elev); return 8 + (1-e) * Math.max(10, SKY_H-24); }

    if(sunElevation > -0.12){
      var sx = centerX - Math.cos(angle)*radiusX + offsetX*0.1;
      var sy = bodyY(sunElevation);
      var sAlpha = smoothstep(-0.12, 0.05, sunElevation);
      var sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 16);
      sg.addColorStop(0, 'rgba(255,224,140,' + (0.55*sAlpha).toFixed(3) + ')');
      sg.addColorStop(1, 'rgba(255,224,140,0)');
      ctx.fillStyle = sg;
      ctx.beginPath(); ctx.arc(sx, sy, 16, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(255,214,120,' + sAlpha.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI*2); ctx.fill();
    }
    if(moonElevation > -0.12){
      var mx = centerX + Math.cos(angle)*radiusX + offsetX*0.1;
      var my = bodyY(moonElevation);
      var mAlpha = smoothstep(-0.12, 0.05, moonElevation);
      var mg = ctx.createRadialGradient(mx, my, 0, mx, my, 12);
      mg.addColorStop(0, 'rgba(210,225,255,' + (0.4*mAlpha).toFixed(3) + ')');
      mg.addColorStop(1, 'rgba(210,225,255,0)');
      ctx.fillStyle = mg;
      ctx.beginPath(); ctx.arc(mx, my, 12, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(223,232,255,' + mAlpha.toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(mx, my, 4, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = 'rgba(15,20,36,' + (0.55*mAlpha).toFixed(3) + ')';
      ctx.beginPath(); ctx.arc(mx+2, my-1, 3.4, 0, Math.PI*2); ctx.fill();
    }
  }
  function drawCloudShape(x, y, scale, color){
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x-10*scale), Math.round(y), Math.round(20*scale), Math.round(5*scale));
    ctx.fillRect(Math.round(x-6*scale), Math.round(y-3*scale), Math.round(14*scale), Math.round(5*scale));
    ctx.fillRect(Math.round(x+1*scale), Math.round(y-1*scale), Math.round(10*scale), Math.round(4*scale));
  }
  function drawClouds(offsetX, dt){
    offsetX = offsetX || 0;
    var color = lerpColorAlpha('#28324a', '#ffffff', skyDayFactor, 0.55);
    for(var i=0;i<clouds.length;i++){
      var c = clouds[i];
      c.x += c.dir * c.speed * dt;
      if(c.dir > 0 && c.x > W + 60){ clouds[i] = newCloud(false); clouds[i].dir = 1; continue; }
      if(c.dir < 0 && c.x < -60){ clouds[i] = newCloud(false); clouds[i].dir = -1; continue; }
      drawCloudShape(c.x + offsetX, c.y, c.scale, color);
    }
  }
  function drawGlowMotes(dt){
    var night = 1 - skyDayFactor;
    if(night <= 0.02) return;
    for(var i=0;i<glowMotes.length;i++){
      var m = glowMotes[i];
      var flick = 0.5 + 0.5*Math.sin(t*m.speed + m.phase);
      var a = night * flick * 0.55;
      if(a <= 0.02) continue;
      ctx.fillStyle = 'hsl(' + m.hue + ' 90% 70% / ' + a.toFixed(3) + ')';
      ctx.fillRect(Math.round(m.x), Math.round(m.y), 1, 1);
    }
  }
  function drawBirds(dt){
    var col = lerpColorAlpha('#0c1220', '#1b2436', skyDayFactor, 0.8);
    for(var i=birds.length-1;i>=0;i--){
      var b = birds[i];
      b.x += b.vx*dt;
      var flap = Math.sin(t*9 + b.flapPhase) > 0;
      var by = Math.round(b.y + Math.sin(t*1.4+b.bob)*2);
      var bx = Math.round(b.x);
      ctx.fillStyle = col;
      var wing = flap ? 0 : 1;
      if(b.vx > 0){
        ctx.fillRect(bx-3, by-wing, 2, 1);
        ctx.fillRect(bx-1, by-(1-wing), 1, 1);
        ctx.fillRect(bx, by-(1-wing), 1, 1);
        ctx.fillRect(bx+1, by-wing, 2, 1);
      } else {
        ctx.fillRect(bx+1, by-wing, 2, 1);
        ctx.fillRect(bx, by-(1-wing), 1, 1);
        ctx.fillRect(bx-1, by-(1-wing), 1, 1);
        ctx.fillRect(bx-3, by-wing, 2, 1);
      }
      if((b.vx > 0 && b.x > W+20) || (b.vx < 0 && b.x < -20)) birds.splice(i, 1);
    }
  }
  function waveY(x){
    return Math.sin(t*1.1 + x*0.045) * 1.4 + Math.sin(t*0.6 + x*0.09) * 0.7;
  }
  function drawWater(offsetX){
    offsetX = offsetX || 0;
    var pad = Math.ceil(Math.abs(offsetX)) + 4;
    var roundOff = Math.round(offsetX);
    var df = skyDayFactor;
    var bands = [
      { c: lerpColor('#123a5c','#3fb3e6', df), frac:0.24 },
      { c: lerpColor('#0e3050','#33a0d8', df), frac:0.22 },
      { c: lerpColor('#0c2846','#2a94cf', df), frac:0.20 },
      { c: lerpColor('#081c33','#1c76ad', df), frac:0.18 },
      { c: lerpColor('#051425','#125786', df), frac:0.16 }
    ];
    var y = SKY_H;
    var totalH = H - SAND_H - SKY_H;
    var prevColor = null;
    for(var i=0;i<bands.length;i++){
      var bh = Math.round(totalH * bands[i].frac);
      if(i === 0){
        ctx.fillStyle = bands[i].c;
        for(var wx=-pad; wx<W+pad; wx++){
          // +3 stretches past the flat band below so a raised wave crest never gaps at the seam
          ctx.fillRect(Math.round(wx+offsetX), Math.round(y + waveY(wx+offsetX)), 1, bh + 3);
        }
      } else {
        drawBand(y, y+bh, bands[i].c);
        // dithered seam blending into the band above, so the steps read as
        // one deepening gradient instead of flat stacked stripes
        for(var sx=-pad; sx<W+pad; sx++){
          ctx.fillStyle = bayer(sx+roundOff, y) > 0.5 ? prevColor : bands[i].c;
          ctx.fillRect(sx+roundOff, y-1, 1, 2);
        }
      }
      prevColor = bands[i].c;
      y += bh;
    }
    if(y < H - SAND_H) drawBand(y, H-SAND_H, lerpColor('#051425','#125786', df));

    /* sand: dithered grain instead of flat color + evenly-spaced speckles,
       for a denser, less mechanical-looking texture */
    ctx.fillStyle = lerpColor('#3d290f','#8a5424', df);
    ctx.fillRect(0, H-SAND_H, W, SAND_H);
    for(var gy=0; gy<SAND_H; gy++){
      for(var gx=-pad; gx<W+pad; gx++){
        var grain = bayer(gx+roundOff, gy*3+1);
        if(grain > 0.82) ctx.fillStyle = 'rgba(255,205,120,' + (0.18+0.16*df).toFixed(3) + ')';
        else if(grain < 0.1) ctx.fillStyle = 'rgba(45,22,6,0.30)';
        else continue;
        ctx.fillRect(gx+roundOff, H-SAND_H+gy, 1, 1);
      }
    }

    ctx.fillStyle = lerpColorAlpha('#0c2032','#eaf8ff', df, 0.35+0.3*df);
    for(var lx=-pad; lx<W+pad; lx++){
      ctx.fillRect(Math.round(lx+offsetX), Math.round(SKY_H-1 + waveY(lx+offsetX)), 1, 2);
    }
  }
  function drawCaustics(offsetX){
    var df = skyDayFactor;
    var alpha = 0.045 + 0.085*df;
    if(alpha <= 0.02) return;
    var top = SKY_H + 6, bottom = H - SAND_H - 10;
    if(bottom <= top) return;
    ctx.fillStyle = 'rgba(255,255,255,' + alpha.toFixed(3) + ')';
    var step = 4;
    for(var yy=top; yy<bottom; yy+=step){
      for(var xx=-8; xx<W+8; xx+=step){
        var v = Math.sin((xx+offsetX)*0.05 + yy*0.12 + t*0.8) + Math.sin((xx+offsetX)*0.03 - yy*0.05 - t*0.5);
        if(v > 1.5) ctx.fillRect(Math.round(xx+offsetX), yy, 2, 6);
      }
    }
  }
  function drawSparkles(dt){
    ctx.fillStyle = 'rgba(190,255,235,0.8)';
    for(var i=0;i<sparkles.length;i++){
      var s = sparkles[i];
      s.life += dt;
      if(s.life > s.max){ sparkles[i] = newSparkle(); continue; }
      var a = 1 - (s.life / s.max);
      if(a > 0.15) ctx.fillRect(Math.round(s.x), Math.round(s.y), 1, 1);
    }
  }
  // Soft additive glow used to make bioluminescent decor/weeds pop at night.
  function drawGlowBloom(x, y, hue, alpha, r){
    if(alpha <= 0.02) return;
    var grad = ctx.createRadialGradient(x, y, 0, x, y, r);
    grad.addColorStop(0, 'hsla(' + hue + ',95%,72%,' + alpha.toFixed(3) + ')');
    grad.addColorStop(1, 'hsla(' + hue + ',95%,72%,0)');
    var prevOp = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI*2);
    ctx.fill();
    ctx.globalCompositeOperation = prevOp;
  }
  function drawWeeds(offsetX){
    offsetX = offsetX || 0;
    var night = 1 - skyDayFactor;
    for(var i=0;i<weeds.length;i++){
      var w = weeds[i];
      var baseX = w.x + offsetX;
      var baseY = H - SAND_H;
      var segs = w.kind === 'kelp' ? w.segs + 3 : w.segs;
      var width = w.kind === 'fan' ? 3 : 2;
      ctx.fillStyle = 'hsl(' + w.hue + ' 88% 36%)';
      var tipX = baseX, tipY = baseY;
      for(var s=0; s<segs; s++){
        var swayAmp = w.kind === 'kelp' ? s*0.8 : s*0.55;
        var sway = Math.sin(t*w.speed + w.phase + s*0.6) * swayAmp;
        var sx = Math.round(baseX + sway);
        var sy = baseY - s*3;
        ctx.fillRect(sx, sy-3, width, 3);
        if(w.kind === 'fan' && s > 1 && s % 2 === 0){
          ctx.fillRect(sx-3, sy-2, 2, 2);
          ctx.fillRect(sx+width+1, sy-2, 2, 2);
        }
        tipX = sx; tipY = sy-3;
      }
      if(w.glow) drawGlowBloom(tipX + width/2, tipY, w.glowHue, 0.4*night, 6);
    }
  }
  function drawBubbles(dt){
    ctx.fillStyle = 'rgba(190,235,225,0.75)';
    for(var i=0;i<bubbles.length;i++){
      var b = bubbles[i];
      b.y -= b.vy*dt;
      var wobX = b.x + Math.sin(t*2 + b.wob) * 2;
      if(b.y < SKY_H){ bubbles[i] = spawnBubble(false); continue; }
      ctx.fillRect(Math.round(wobX), Math.round(b.y), b.r, b.r);
    }
  }

  /* ---- seafloor clutter ---- */
  function drawRock(x, baseY){
    ctx.fillStyle = '#403f42';
    ctx.fillRect(x-4, baseY-2, 9, 3);
    ctx.fillStyle = '#65636a';
    ctx.fillRect(x-2, baseY-4, 5, 2);
    ctx.fillStyle = '#8a888f';
    ctx.fillRect(x-2, baseY-4, 2, 1);
    ctx.fillStyle = '#242327';
    ctx.fillRect(x-4, baseY, 9, 1);
  }
  function drawShell(x, baseY, hue){
    ctx.fillStyle = 'hsl(' + hue + ' 55% 78%)';
    ctx.fillRect(x-3, baseY-1, 7, 2);
    ctx.fillRect(x-2, baseY-2, 5, 1);
    ctx.fillStyle = 'hsl(' + hue + ' 60% 60%)';
    ctx.fillRect(x-1, baseY-2, 1, 2);
    ctx.fillStyle = 'hsl(' + hue + ' 70% 92%)';
    ctx.fillRect(x-2, baseY-2, 1, 1);
  }
  function drawStarfish(x, baseY, hue){
    ctx.fillStyle = 'hsl(' + hue + ' 78% 55%)';
    ctx.fillRect(x, baseY-4, 1, 4);
    ctx.fillRect(x-3, baseY-2, 2, 1);
    ctx.fillRect(x+2, baseY-2, 2, 1);
    ctx.fillRect(x-2, baseY, 1, 1);
    ctx.fillRect(x+2, baseY, 1, 1);
    ctx.fillRect(x-1, baseY-1, 3, 1);
    ctx.fillStyle = 'hsl(' + hue + ' 85% 72%)';
    ctx.fillRect(x, baseY-4, 1, 1);
    ctx.fillStyle = 'hsl(' + hue + ' 60% 38%)';
    ctx.fillRect(x, baseY, 1, 1);
  }
  function drawCoralBranch(x, baseY, hue, sway){
    ctx.fillStyle = 'hsl(' + hue + ' 72% 55%)';
    ctx.fillRect(x + Math.round(sway*0.3), baseY-7, 2, 7);
    ctx.fillRect(x - 3 + Math.round(sway*0.5), baseY-4, 2, 4);
    ctx.fillRect(x + 3 + Math.round(sway*0.5), baseY-3, 2, 3);
    ctx.fillStyle = 'hsl(' + hue + ' 90% 75%)';
    ctx.fillRect(x + Math.round(sway*0.3), baseY-7, 2, 1);
    ctx.fillStyle = 'hsl(' + hue + ' 55% 32%)';
    ctx.fillRect(x - 3 + Math.round(sway*0.5), baseY-1, 2, 1);
  }
  function drawPebbles(x, baseY, hue){
    ctx.fillStyle = 'hsl(' + hue + ' 20% 45%)';
    ctx.fillRect(x, baseY-1, 1, 1);
    ctx.fillRect(x+3, baseY-1, 1, 1);
    ctx.fillRect(x-2, baseY, 1, 1);
  }
  function drawChest(x, baseY){
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(x-6, baseY-6, 12, 6);
    ctx.fillStyle = '#3d2513';
    ctx.fillRect(x-6, baseY-6, 12, 2);
    ctx.fillStyle = '#7a4d28';
    ctx.fillRect(x-6, baseY-4, 12, 1);
    ctx.fillStyle = '#e0b84b';
    ctx.fillRect(x-1, baseY-5, 2, 2);
    ctx.fillStyle = '#fbe38a';
    ctx.fillRect(x-1, baseY-5, 1, 1);
    ctx.fillStyle = '#7a4d28';
    ctx.fillRect(x-7, baseY-1, 14, 1);
  }
  function drawSandcastle(x, baseY){
    ctx.fillStyle = '#d9a86a';
    ctx.fillRect(x-6, baseY-6, 13, 6);
    ctx.fillStyle = '#f0c98a';
    ctx.fillRect(x-6, baseY-6, 13, 1);
    ctx.fillStyle = '#b8834a';
    ctx.fillRect(x-6, baseY-1, 13, 1);
    ctx.fillStyle = '#e6bb82';
    ctx.fillRect(x-6, baseY-9, 3, 4);
    ctx.fillRect(x+3, baseY-9, 3, 4);
    ctx.fillStyle = '#c99760';
    ctx.fillRect(x-6, baseY-9, 3, 1);
    ctx.fillRect(x+3, baseY-9, 3, 1);
    ctx.fillStyle = '#5c3a1e';
    ctx.fillRect(x-1, baseY-4, 2, 4);
    ctx.fillStyle = '#7a5230';
    ctx.fillRect(x-5, baseY-11, 1, 3);
    ctx.fillStyle = '#ff5a6a';
    ctx.fillRect(x-4, baseY-11, 2, 2);
  }
  function drawCoralReef(x, baseY, hue, sway){
    var hue2 = (hue + 42) % 360, hue3 = (hue + 300) % 360;
    ctx.fillStyle = 'hsl(' + hue + ' 80% 60%)';
    ctx.fillRect(x-1 + Math.round(sway*0.4), baseY-9, 2, 9);
    ctx.fillRect(x-5 + Math.round(sway*0.6), baseY-5, 2, 5);
    ctx.fillStyle = 'hsl(' + hue2 + ' 82% 62%)';
    ctx.fillRect(x+4 + Math.round(sway*0.5), baseY-7, 2, 7);
    ctx.fillRect(x+2 + Math.round(sway*0.3), baseY-3, 2, 3);
    ctx.fillStyle = 'hsl(' + hue3 + ' 75% 65%)';
    ctx.fillRect(x-2 + Math.round(sway*0.5), baseY-4, 2, 4);
    ctx.fillStyle = 'hsl(' + hue + ' 95% 80%)';
    ctx.fillRect(x-1 + Math.round(sway*0.4), baseY-10, 2, 1);
    ctx.fillRect(x+4 + Math.round(sway*0.5), baseY-8, 2, 1);
  }
  function drawAnemone(x, baseY, hue){
    ctx.fillStyle = 'hsl(' + hue + ' 40% 40%)';
    ctx.fillRect(x-4, baseY-1, 9, 1);
    for(var i=0;i<6;i++){
      var sway = Math.sin(t*1.3 + i*1.1 + x) * 1.6;
      var tx = x - 5 + i*2 + Math.round(sway*0.4);
      var reach = 5 + Math.abs(Math.round(sway*0.5));
      var h2 = (hue + i*14) % 360;
      ctx.fillStyle = 'hsl(' + h2 + ' 85% 62%)';
      ctx.fillRect(tx, baseY-reach, 1, reach-1);
      ctx.fillStyle = 'hsl(' + h2 + ' 95% 78%)';
      ctx.fillRect(tx, baseY-reach-1, 1, 1);
    }
  }
  function drawDecor(offsetX){
    offsetX = offsetX || 0;
    var baseY = H - SAND_H;
    var night = 1 - skyDayFactor;
    for(var i=0;i<decor.length;i++){
      var d = decor[i];
      var sway = Math.sin(t*0.5 + i);
      var x = d.x + offsetX;
      if(d.type === 'rock') drawRock(x, baseY);
      else if(d.type === 'shell') drawShell(x, baseY, d.hue);
      else if(d.type === 'starfish'){
        drawStarfish(x, baseY, d.hue);
        drawGlowBloom(x, baseY-2, d.hue, 0.26*night, 7);
      }
      else if(d.type === 'coral') drawCoralBranch(x, baseY, d.hue, sway);
      else if(d.type === 'pebbles') drawPebbles(x, baseY, d.hue);
      else if(d.type === 'chest') drawChest(x, baseY);
      else if(d.type === 'sandcastle') drawSandcastle(x, baseY);
      else if(d.type === 'coralReef'){
        drawCoralReef(x, baseY, d.hue, sway*3);
        drawGlowBloom(x, baseY-6, d.hue, 0.3*night, 10);
      }
      else if(d.type === 'anemone'){
        drawAnemone(x, baseY, d.hue);
        drawGlowBloom(x, baseY-5, d.hue, 0.32*night, 9);
      }
    }
  }

  // A single boat/fisherman persists across the whole session — only its
  // target X position changes per page, and it sails there smoothly rather
  // than being swapped for a freshly-randomized boat on every page flip.
  function boatXFracForPage(pageIdx){
    // Page 0 is where the boat sits behind the gate on first load — pin it
    // near an outer edge so the zoomed-in fisherman isn't hidden behind the
    // (nearly full-width) passcode card. Other pages stay randomized.
    if(pageIdx === 0) return 0.08;
    var h = hashStr('boat-pos-' + pageIdx);
    return 0.16 + ((h >>> 16) % 68) / 100;
  }
  function initBoat(){
    var h = hashStr('boat-identity');
    var xFrac = boatXFracForPage(0);
    boat = {
      hullHue: h % 360,
      trimHue: (h % 360 + 35) % 360,
      shirtHue: (h >> 6) % 360,
      hatHue: (h >> 13) % 360,
      skinHue: 22 + ((h >> 9) % 14),
      faceDir: (h % 2 === 0) ? 1 : -1,
      bobSeed: h,
      curXFrac: xFrac,
      fromXFrac: xFrac,
      toXFrac: xFrac,
      transStart: 0,
      transDur: 1.8 // slower than the page-flip itself, so the boat keeps sailing after the fish have settled
    };
  }
  function setBoatTargetPage(pageIdx){
    if(!boat) return;
    boat.fromXFrac = boat.curXFrac;
    boat.toXFrac = boatXFracForPage(pageIdx);
    boat.transStart = t;
  }
  function updateBoat(){
    if(!boat) return;
    var progress = boat.transDur > 0 ? Math.min(1, (t - boat.transStart) / boat.transDur) : 1;
    var eased = easeInOutCubic(progress);
    boat.curXFrac = boat.fromXFrac + (boat.toXFrac - boat.fromXFrac) * eased;
  }
  function boatScreenX(){
    return boat ? Math.round(W * boat.curXFrac) : Math.round(W * 0.5);
  }

  /* ---- gate camera: starts zoomed in on the boat, eases out as the code is typed ---- */
  var GATE_ZOOM_START = 2.5;
  function setGateOrigin(){
    if(!boat) return;
    var ox = boatScreenX(), oy = SKY_H;
    canvas.style.setProperty('--gate-ox', (W ? (ox / W * 100) : 50) + '%');
    canvas.style.setProperty('--gate-oy', (H ? (oy / H * 100) : 40) + '%');
  }
  function setGateZoom(scale){
    canvas.style.setProperty('--gate-zoom', scale);
  }
  function updateGateZoomForEntry(){
    setGateZoom(GATE_ZOOM_START + (1 - GATE_ZOOM_START) * (gateEntered.length / 4));
  }
  function initGateZoom(){
    setGateOrigin();
    canvas.style.transition = 'none';
    setGateZoom(GATE_ZOOM_START);
    void canvas.offsetWidth;
    canvas.style.transition = '';
  }

  // Where the fishing line meets the rod tip (above water) and the water's
  // surface (where the bobber sits) — shared by drawBoat and the reel-in animation.
  function boatRodTip(){
    if(!boat) return { x: W/2, y: SKY_H-10, waterX: W/2, waterY: SKY_H, faceDir: 1 };
    var bx = boatScreenX();
    var by = Math.round(SKY_H + waveY(bx) - 1);
    var px = bx + boat.faceDir*2;
    var rodTipX = px + boat.faceDir*10, rodTipY = by-10;
    return { x: rodTipX, y: rodTipY, waterX: rodTipX, waterY: SKY_H + waveY(rodTipX), faceDir: boat.faceDir };
  }
  function drawBoat(){
    if(!boat) return;
    var hullHue = boat.hullHue, trimHue = boat.trimHue, shirtHue = boat.shirtHue,
        hatHue = boat.hatHue, skinHue = boat.skinHue, faceDir = boat.faceDir;
    var bx = boatScreenX();
    var by = Math.round(SKY_H + waveY(bx) - 1);

    /* hull */
    ctx.fillStyle = 'hsl(' + trimHue + ' 55% 58%)';
    ctx.fillRect(bx-9, by-6, 18, 1);
    ctx.fillStyle = 'hsl(' + hullHue + ' 45% 34%)';
    ctx.fillRect(bx-9, by-5, 18, 2);
    ctx.fillStyle = 'hsl(' + hullHue + ' 42% 26%)';
    ctx.fillRect(bx-7, by-3, 14, 1);
    ctx.fillRect(bx-5, by-2, 10, 1);
    ctx.fillRect(bx-2, by-1, 4, 1);

    /* fisherman */
    var px = bx + faceDir*2;
    ctx.fillStyle = 'hsl(' + hatHue + ' 55% 45%)';
    ctx.fillRect(px-1, by-11, 2, 1);
    ctx.fillStyle = 'hsl(' + skinHue + ' 45% 55%)';
    ctx.fillRect(px-1, by-10, 2, 2);
    ctx.fillStyle = 'hsl(' + shirtHue + ' 55% 42%)';
    ctx.fillRect(px-1, by-8, 2, 3);
    ctx.fillStyle = 'hsl(' + skinHue + ' 45% 50%)';
    ctx.fillRect(px + faceDir, by-7, 1, 1);

    /* rod + line + bobber */
    var rodBaseX = px + faceDir, rodBaseY = by-7;
    var rodTipX = px + faceDir*10, rodTipY = by-10;
    var steps = 8, i;
    ctx.fillStyle = 'hsl(28 40% 30%)';
    for(i=0;i<=steps;i++){
      var lx = rodBaseX + (rodTipX-rodBaseX) * (i/steps);
      var ly = rodBaseY + (rodTipY-rodBaseY) * (i/steps);
      ctx.fillRect(Math.round(lx), Math.round(ly), 1, 1);
    }
    var waterAtLine = SKY_H + waveY(rodTipX);
    ctx.fillStyle = 'rgba(15,15,15,0.5)';
    var lineSteps = Math.max(1, Math.round(waterAtLine - rodTipY));
    for(i=0;i<=lineSteps;i+=2) ctx.fillRect(rodTipX, Math.round(rodTipY+i), 1, 1);
    var bobY = waterAtLine + Math.sin(t*3 + boat.bobSeed)*0.6;
    ctx.fillStyle = '#ff5a3d';
    ctx.fillRect(rodTipX-1, Math.round(bobY), 2, 1);
  }

  /* ---- splash particles: droplets + expanding ripple rings ---- */
  function spawnSplash(x, y, power){
    power = power || 1;
    var n = 8 + Math.floor(Math.random()*5);
    for(var i=0;i<n;i++){
      var ang = -Math.PI*0.15 - Math.random()*Math.PI*0.7;
      var spd = (10 + Math.random()*16) * power;
      splashes.push({
        kind: 'drop',
        x: x, y: y,
        vx: Math.cos(ang)*spd*(Math.random()<0.5?-1:1),
        vy: -Math.abs(Math.sin(ang)*spd),
        life: 0, max: 0.5 + Math.random()*0.35
      });
    }
    splashes.push({ kind:'ring', x:x, y:y, life:0, max:0.6, r1: 10*power });
    splashes.push({ kind:'ring', x:x, y:y, life:0, max:0.9, r1: 17*power });
  }
  function updateDrawSplashes(dt){
    for(var i=splashes.length-1;i>=0;i--){
      var s = splashes[i];
      s.life += dt;
      if(s.life >= s.max){ splashes.splice(i,1); continue; }
      var k = s.life / s.max;
      if(s.kind === 'drop'){
        s.vy += 46*dt;
        s.x += s.vx*dt;
        s.y += s.vy*dt;
        var dx = Math.round(s.x), dy = Math.round(s.y);
        ctx.fillStyle = 'rgba(20,50,70,' + ((1-k)*0.5).toFixed(3) + ')';
        ctx.fillRect(dx-1, dy-1, 4, 4);
        ctx.fillStyle = 'rgba(150,215,235,' + (1-k).toFixed(3) + ')';
        ctx.fillRect(dx, dy, 2, 2);
      } else {
        var r = s.r1 * k;
        ctx.strokeStyle = 'rgba(90,175,205,' + ((1-k)*0.8).toFixed(3) + ')';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(Math.round(s.x), Math.round(s.y), r, Math.max(1, r*0.4), 0, 0, Math.PI*2);
        ctx.stroke();
      }
    }
  }

  /* ---- reel-in: clicking a fish hooks it, pulls it to the boat, then opens it ---- */
  function startReelIn(f){
    if(reelAnim || pageTransition) return;
    var idx = fishes.indexOf(f);
    if(idx === -1) return;
    fishes.splice(idx, 1);
    var tip = boatRodTip();
    reelAnim = {
      fish: f,
      startX: f.x, startY: f.y,
      waterX: tip.waterX, waterY: tip.waterY,
      tipX: tip.x, tipY: tip.y,
      startT: t,
      pullDuration: 0.95 + Math.random()*0.2,
      riseDuration: 0.38,
      phase: 'pull'
    };
    sFish();
  }
  function updateReelAnim(){
    if(!reelAnim) return;
    var ra = reelAnim, f = ra.fish;
    if(ra.phase === 'pull'){
      var k = Math.min(1, (t - ra.startT) / ra.pullDuration);
      var eased = easeInOutCubic(k);
      var targetX = ra.waterX - f.w/2, targetY = ra.waterY - f.h;
      var wiggle = (1-eased) * Math.sin(t*22) * (f.w*0.3);
      f.x = ra.startX + (targetX - ra.startX) * eased + wiggle;
      f.y = ra.startY + (targetY - ra.startY) * eased;
      f.dir = (targetX >= ra.startX) ? 1 : -1;
      if(k >= 1){
        spawnSplash(ra.waterX, ra.waterY, 1);
        sSplash();
        ra.phase = 'rise';
        ra.riseStart = t;
      }
      return;
    }
    if(ra.phase === 'rise'){
      var rk = Math.min(1, (t - ra.riseStart) / ra.riseDuration);
      var reased = easeInOutCubic(rk);
      var fromY = ra.waterY - f.h;
      f.x = ra.waterX - f.w/2;
      f.y = fromY + (ra.tipY - fromY) * reased;
      if(rk >= 1){
        var id = f.id;
        reelAnim = null;
        openFish(id);
      }
    }
  }
  function releaseFishBack(id){
    var record = records[id];
    if(!record) return;
    var def = makeFishDef(record);
    var tip = boatRodTip();
    def.x = tip.waterX - def.w/2;
    def.y = def.baseY = def.targetY = tip.waterY - def.h/2;
    clampFish(def);
    fishes.push(def);
    spawnSplash(tip.waterX, tip.waterY, 0.7);
    sSplash();
  }

  function hslAlpha(hslStr, alpha){
    return hslStr.replace(')', ' / ' + alpha + ')');
  }
  function drawFishGlow(f, hovered, offsetX){
    offsetX = offsetX || 0;
    var cx = f.x + offsetX + f.w/2, cy = f.y + f.h/2;
    var baseR = Math.max(f.w, f.h);
    var nightBoost = (1 - skyDayFactor) * 0.5;
    var r = baseR * (hovered ? 2.1 : (1.5 + nightBoost*0.6));
    var alpha = (hovered ? 0.42 : 0.22) + nightBoost*0.22;
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, hslAlpha(f.palette['B'], alpha));
    grad.addColorStop(1, hslAlpha(f.palette['B'], 0));
    var prevOp = ctx.globalCompositeOperation;
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI*2);
    ctx.fill();
    ctx.globalCompositeOperation = prevOp;
  }
  // Per-column top/bottom row of the body fill (chars 'B'/'b'), used to turn
  // each body column into a top-to-bottom shading ramp. Computed once per
  // sprite array and cached on it — the same handful of sprite arrays are
  // reused by every fish of a given species, only the palette differs.
  function bodySpans(sprite){
    if(sprite.__spans) return sprite.__spans;
    var cols = sprite[0].length, spans = new Array(cols);
    for(var c=0;c<cols;c++){
      var top=-1, bottom=-1;
      for(var r=0;r<sprite.length;r++){
        var ch = sprite[r][c];
        if(ch === 'B' || ch === 'b'){
          if(top === -1) top = r;
          bottom = r;
        }
      }
      spans[c] = { top: top, bottom: bottom };
    }
    sprite.__spans = spans;
    return spans;
  }
  // Shared sprite renderer used by both the swimming tank fish and the
  // zoomed modal portrait. Adds a silhouette outline, a dithered multi-band
  // shading ramp + scale-glint texture on the body, a specular rim along its
  // top edge, and two-tone ray striping on fins — sprite art itself is
  // untouched, this is entirely a render pass on top of it.
  function drawFishSprite(gctx, sprite, palette, originX, originY, cell, facingRight){
    var pupilSize = Math.max(1, Math.floor(cell/2));
    var spans = bodySpans(sprite);
    function filledAt(r,c){
      if(r<0 || r>=sprite.length) return false;
      var row = sprite[r];
      if(c<0 || c>=row.length) return false;
      return row[c] !== '.';
    }
    gctx.fillStyle = 'rgba(8,6,5,0.55)';
    for(var r=0;r<sprite.length;r++){
      var row = sprite[r];
      for(var c=0;c<row.length;c++){
        if(row[c] === '.') continue;
        if(filledAt(r-1,c) && filledAt(r+1,c) && filledAt(r,c-1) && filledAt(r,c+1)) continue;
        var col = facingRight ? c : (row.length - 1 - c);
        gctx.fillRect(originX+col*cell-1, originY+r*cell-1, cell+2, cell+2);
      }
    }
    for(var r2=0;r2<sprite.length;r2++){
      var row2 = sprite[r2];
      for(var c2=0;c2<row2.length;c2++){
        var ch = row2[c2];
        if(ch === '.') continue;
        var col2 = facingRight ? c2 : (row2.length - 1 - c2);
        var px = originX+col2*cell, py = originY+r2*cell;
        gctx.fillStyle = palette[ch];
        gctx.fillRect(px, py, cell, cell);

        if(ch === 'E'){
          var offX = facingRight ? cell-pupilSize : 0;
          gctx.fillStyle = palette['P'];
          gctx.fillRect(px+offX, py + Math.floor((cell-pupilSize)/2), pupilSize, pupilSize);
          continue;
        }

        if(ch === 'B' || ch === 'b'){
          var span = spans[c2];
          var norm = (span.bottom > span.top) ? (r2 - span.top) / (span.bottom - span.top) : 0;
          var band = ditherBand(norm, 4, px, py); // 0 = top highlight .. 3 = bottom shadow
          if(band === 0) gctx.fillStyle = 'rgba(255,255,255,0.22)';
          else if(band === 1) gctx.fillStyle = 'rgba(255,255,255,0.06)';
          else if(band === 2) gctx.fillStyle = 'rgba(8,6,4,0.10)';
          else gctx.fillStyle = 'rgba(8,6,4,0.26)';
          gctx.fillRect(px, py, cell, cell);

          if(cell >= 3){
            // dithered scale-glint texture, denser and less mechanical than
            // a flat checkerboard so the body reads with more perceived tones
            var g = bayer(px, py);
            gctx.fillStyle = ((px+py) % 2 === 0)
              ? 'rgba(255,255,255,' + (g*0.16).toFixed(3) + ')'
              : 'rgba(6,4,3,' + (g*0.14).toFixed(3) + ')';
            gctx.fillRect(px, py, cell, cell);
          }

          if(r2 === span.top){
            gctx.fillStyle = 'rgba(255,255,255,0.30)';
            gctx.fillRect(px, py, cell, Math.max(1, Math.floor(cell/3)));
          }
          continue;
        }

        if((ch === 'F' || ch === 'f' || ch === 'T') && cell >= 2){
          var rayW = Math.max(1, Math.floor(cell/3));
          if(c2 % 2 === 0){
            gctx.fillStyle = 'rgba(0,0,0,0.18)';
            gctx.fillRect(px, py, rayW, cell);
          } else {
            gctx.fillStyle = 'rgba(255,255,255,0.10)';
            gctx.fillRect(px, py, rayW, cell);
          }
        }
      }
    }
  }
  function drawFish(f, hovered, offsetX){
    offsetX = offsetX || 0;
    var bx = Math.round(f.x + offsetX), by = Math.round(f.y);
    drawFishSprite(ctx, f.sprite, f.palette, bx, by, f.cell, f.dir > 0);
    if(hovered){
      ctx.strokeStyle = hslAlpha(f.palette['H'], 0.95);
      ctx.lineWidth = 1;
      ctx.strokeRect(bx - 2, by - 2, f.w + 4, f.h + 4);
    }
  }
  function updateFish(f, dt){
    f.x += f.dir * f.speed * dt;
    var top = Math.max(DOCK_H, SKY_H) + 4, bottom = H - SAND_H - f.h - 2;
    if(bottom < top) bottom = top;
    if(f.x < -f.w){ f.x = -f.w; f.dir = 1; }
    if(f.x > W){ f.x = W; f.dir = -1; }
    if(f.x < 0 && f.dir < 0){ f.dir = 1; }
    if(f.x > W - f.w && f.dir > 0){ f.dir = -1; }
    if(t > f.wanderAt){
      f.wanderAt = t + 6 + Math.random()*8;
      f.targetY = top + Math.random() * Math.max(1,(bottom-top));
    }
    f.baseY += (f.targetY - f.baseY) * Math.min(1, dt*0.4);
    f.y = f.baseY + Math.sin(t*1.6 + f.bobPhase) * f.bobAmp;
  }

  var lastTs = 0;
  function frame(ts){
    if(!running) return;
    var dt = lastTs ? Math.min(0.05, (ts-lastTs)/1000) : 0.016;
    lastTs = ts;
    t += dt * (reducedMotion ? 0.35 : 1);
    updateSkyState();

    ctx.clearRect(0,0,W,H);

    var parallax = 0;
    var eased = 1;
    if(pageTransition){
      var elapsed = t - pageTransition.startT;
      var progress = Math.min(1, elapsed / pageTransition.duration);
      eased = easeInOutCubic(progress);
      parallax = -eased * W * pageTransition.dir * 0.28;
    }
    drawSky(parallax*0.35);
    drawClouds(parallax*0.35, dt);
    drawBirds(dt);
    drawPlaneBanner(dt);
    drawWater(parallax);
    drawCaustics(parallax);
    drawDecor(parallax);
    drawGlowMotes(dt);
    drawSparkles(dt);
    drawWeeds(parallax);
    drawBubbles(dt * (reducedMotion?0.4:1));

    updateBoat();
    drawBoat();
    updateReelAnim();
    if(reelAnim){
      drawFishGlow(reelAnim.fish, false);
      drawFish(reelAnim.fish, false);
    }
    updateDrawSplashes(dt);

    if(pageTransition){
      var pt = pageTransition;
      var offsetOut = -eased * W * pt.dir;
      var offsetIn = (1 - eased) * W * pt.dir;
      for(var i=0;i<pt.fromFish.length;i++){
        drawFishGlow(pt.fromFish[i], false, offsetOut);
        drawFish(pt.fromFish[i], false, offsetOut);
      }
      for(var j=0;j<pt.toFish.length;j++){
        drawFishGlow(pt.toFish[j], false, offsetIn);
        drawFish(pt.toFish[j], false, offsetIn);
      }
      if(eased >= 1){
        fishes = pt.toFish;
        pageTransition = null;
      }
    } else {
      for(var k=0;k<fishes.length;k++){
        var f = fishes[k];
        updateFish(f, reducedMotion ? dt*0.25 : dt);
        var hovered = f.id === hoveredFishId;
        drawFishGlow(f, hovered);
        drawFish(f, hovered);
      }
    }
    requestAnimationFrame(frame);
  }

  function findFishAt(logicalX, logicalY){
    if(pageTransition) return null;
    for(var i=fishes.length-1;i>=0;i--){
      var f = fishes[i];
      var pad = 1;
      if(logicalX >= f.x-pad && logicalX <= f.x+f.w+pad && logicalY >= f.y-pad && logicalY <= f.y+f.h+pad){
        return f;
      }
    }
    return null;
  }
  function toLogical(clientX, clientY){
    var rect = canvas.getBoundingClientRect();
    return { x:(clientX-rect.left)/rect.width*W, y:(clientY-rect.top)/rect.height*H };
  }

  var hoveredFishId = null;
  var tooltip = document.getElementById('tooltip');
  canvas.addEventListener('mousemove', function(e){
    var p = toLogical(e.clientX, e.clientY);
    var f = findFishAt(p.x, p.y);
    hoveredFishId = f ? f.id : null;
    canvas.classList.toggle('pointable', !!f);
    if(f){
      tooltip.classList.remove('hidden');
      tooltip.style.left = e.clientX + 'px';
      tooltip.style.top = e.clientY + 'px';
      tooltip.querySelector('.tt-name').textContent = f.name;
    } else {
      tooltip.classList.add('hidden');
    }
  });
  canvas.addEventListener('mouseleave', function(){
    hoveredFishId = null;
    tooltip.classList.add('hidden');
    canvas.classList.remove('pointable');
  });
  canvas.addEventListener('click', function(e){
    var p = toLogical(e.clientX, e.clientY);
    var f = findFishAt(p.x, p.y);
    if(f) startReelIn(f);
  });
  canvas.addEventListener('touchstart', function(e){
    if(!e.touches || !e.touches[0]) return;
    var touch = e.touches[0];
    var p = toLogical(touch.clientX, touch.clientY);
    var f = findFishAt(p.x, p.y);
    if(f) startReelIn(f);
  }, { passive:true });

  /* =======================================================
     LIBRARY <-> TANK BRIDGE (paginated, PAGE_SIZE fish on screen)
     ======================================================= */
  var records = {};
  var library = [];
  var PAGE_SIZE = 12;
  var pageIndex = 0;

  function totalPages(){
    return Math.max(1, Math.ceil(library.length / PAGE_SIZE));
  }
  function updatePageUI(){
    var tp = totalPages();
    document.getElementById('pageIndicator').textContent = 'PAGE ' + (pageIndex+1) + ' / ' + tp;
    document.getElementById('pagePrev').disabled = pageIndex <= 0;
    document.getElementById('pageNext').disabled = pageIndex >= tp - 1;
    document.getElementById('pageNav').classList.toggle('hidden', library.length <= PAGE_SIZE);
    document.getElementById('emptyState').classList.toggle('hidden', library.length !== 0);
  }
  function buildPageFish(idx){
    return library.slice(idx*PAGE_SIZE, idx*PAGE_SIZE + PAGE_SIZE).map(function(r){
      var def = makeFishDef(r);
      clampFish(def);
      return def;
    });
  }
  function renderPage(){
    fishes = buildPageFish(pageIndex);
    updatePageUI();
  }
  function goToPage(newIndex, dir){
    if(pageTransition || reelAnim) return;
    if(newIndex < 0 || newIndex > totalPages()-1) return;
    var toFish = buildPageFish(newIndex);
    pageTransition = { fromFish: fishes, toFish: toFish, dir: dir, startT: t, duration: reducedMotion ? 0.001 : 0.55, fromIndex: pageIndex, toIndex: newIndex };
    pageIndex = newIndex;
    setBoatTargetPage(newIndex);
    updatePageUI();
  }
  function addToLibrary(record){
    records[record.id] = record;
    library.push(record);
  }
  function removeFromLibrary(id){
    delete records[id];
    library = library.filter(function(r){ return r.id !== id; });
  }

  function initTankVisuals(){
    resize();
    initWeeds();
    initBubbles();
    initSparkles();
    initDecor();
    initStars();
    initClouds();
    initGlowMotes();
    initBoat();
    initGateZoom();
    scheduleBird();
    schedulePlaneBanner();
    running = true;
    requestAnimationFrame(frame);
  }
  function loadLibrary(){
    applyAdminUI();
    dbGetAll().then(function(all){
      // A device may still have baked-in seed fish from an older version of
      // SEED_FISH (e.g. the original placeholder set) cached in its local
      // IndexedDB from a previous visit. Author-made fish never get a
      // 'seed-' id (see uid()), so any 'seed-' record no longer present in
      // the current SEED_FISH is a leftover from a prior seed list — drop it
      // so the library always matches what's actually baked into app.js.
      var currentSeedIds = SEED_FISH.map(function(s){ return s.id; });
      var stale = all.filter(function(r){ return r.id.indexOf('seed-') === 0 && currentSeedIds.indexOf(r.id) === -1; });
      all = all.filter(function(r){ return stale.indexOf(r) === -1; });
      all.sort(function(a,b){ return a.addedAt - b.addedAt; });
      var ids = all.map(function(r){ return r.id; });
      records = {};
      library = [];
      all.forEach(addToLibrary);
      return Promise.all(stale.map(function(r){ return dbDelete(r.id); })).then(function(){
        return seedLibrary(ids);
      });
    }).then(function(){
      renderPage();
    }).catch(function(){
      toast('COULD NOT OPEN LOCAL STORAGE.', true);
    });
  }
  initTankVisuals();

  document.getElementById('pagePrev').addEventListener('click', function(){
    goToPage(pageIndex - 1, -1);
  });
  document.getElementById('pageNext').addEventListener('click', function(){
    goToPage(pageIndex + 1, 1);
  });

  /* =======================================================
     CREATE FISH (author only)
     ======================================================= */
  var createOverlay = document.getElementById('createOverlay');
  document.getElementById('newFishBtn').addEventListener('click', function(){
    if(!isAdmin) return;
    document.getElementById('newFishName').value = '';
    document.getElementById('newFishText').value = '';
    createOverlay.classList.remove('hidden');
    document.getElementById('newFishName').focus();
  });
  document.getElementById('createCancelBtn').addEventListener('click', function(){
    createOverlay.classList.add('hidden');
  });
  document.getElementById('createSaveBtn').addEventListener('click', function(){
    var name = document.getElementById('newFishName').value.trim();
    var text = document.getElementById('newFishText').value;
    if(!name){ toast('GIVE THE FISH A NAME FIRST.', true); return; }
    if(!text.trim()){ toast('THE FISH NEEDS SOME WORDS INSIDE IT.', true); return; }
    var record = { id: uid(), name: name, text: text, addedAt: Date.now() };
    dbPut(record).then(function(){
      addToLibrary(record);
      pageIndex = totalPages() - 1;
      renderPage();
      createOverlay.classList.add('hidden');
      toast('HATCHED: ' + record.name);
    }).catch(function(){
      toast('COULD NOT SAVE THAT FISH.', true);
    });
  });

  /* =======================================================
     LIBRARY DATA EXPORT (author only, for handing back to Claude)
     ======================================================= */
  var jsonOverlay = document.getElementById('jsonOverlay');
  document.getElementById('showJsonBtn').addEventListener('click', function(){
    if(!isAdmin) return;
    var all = Object.keys(records).map(function(id){ return records[id]; });
    var payload = JSON.stringify({ aquarium:1, items: all.map(function(r){
      return { id:r.id, name:r.name, text:r.text, addedAt:r.addedAt };
    }) }, null, 2);
    var ta = document.getElementById('jsonText');
    ta.value = payload;
    jsonOverlay.classList.remove('hidden');
    ta.focus();
    ta.select();
  });
  document.getElementById('jsonCloseBtn').addEventListener('click', function(){
    jsonOverlay.classList.add('hidden');
  });

  /* =======================================================
     READ / EDIT MODAL
     ======================================================= */
  var modalOverlay = document.getElementById('modalOverlay');
  var modalFishCanvas = document.getElementById('modalFishCanvas');
  var modalTitle = document.getElementById('modalTitle');
  var modalTitleInput = document.getElementById('modalTitleInput');
  var modalMeta = document.getElementById('modalMeta');
  var nameEditActions = document.getElementById('nameEditActions');
  var readPanel = document.getElementById('readPanel');
  var readPanelEdit = document.getElementById('readPanelEdit');
  var footDefault = document.getElementById('modalFootDefault');
  var footTextEdit = document.getElementById('modalFootTextEdit');
  var footConfirm = document.getElementById('modalFootConfirm');
  var currentId = null;

  function updateModalAdminUI(){
    var open = !modalOverlay.classList.contains('hidden');
    if(!open) return;
    footDefault.classList.toggle('hidden', !isAdmin);
  }

  function renderModalFish(id){
    var live = fishes.filter(function(f){ return f.id === id; })[0];
    var def = live || makeFishDef(records[id]);
    var cell = 9;
    var mctx = modalFishCanvas.getContext('2d');
    modalFishCanvas.width = def.spriteW * cell;
    modalFishCanvas.height = def.spriteH * cell;
    mctx.imageSmoothingEnabled = false;
    drawFishSprite(mctx, def.sprite, def.palette, 0, 0, cell, true);
  }

  function resetModalModes(){
    modalTitle.classList.remove('hidden');
    modalTitleInput.classList.add('hidden');
    nameEditActions.classList.add('hidden');
    readPanel.classList.remove('hidden');
    readPanelEdit.classList.add('hidden');
    footTextEdit.classList.add('hidden');
    footConfirm.classList.add('hidden');
    footDefault.classList.toggle('hidden', !isAdmin);
  }

  function openFish(id){
    var record = records[id];
    if(!record) return;
    sFish();
    currentId = id;
    modalTitle.textContent = record.name;
    modalMeta.textContent = 'ADDED ' + fmtDate(record.addedAt);
    readPanel.textContent = record.text;
    renderModalFish(id);
    resetModalModes();
    modalOverlay.classList.remove('hidden');
  }
  function closeModal(){
    var releasedId = currentId;
    modalOverlay.classList.add('hidden');
    currentId = null;
    if(releasedId) releaseFishBack(releasedId);
  }
  document.getElementById('modalClose').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', function(e){ if(e.target === modalOverlay) closeModal(); });
  document.addEventListener('keydown', function(e){
    if(e.key === 'Escape' && !modalOverlay.classList.contains('hidden')) closeModal();
  });

  // ---- name edit ----
  document.getElementById('editNameBtn').addEventListener('click', function(){
    if(!isAdmin || !currentId) return;
    modalTitleInput.value = records[currentId].name;
    modalTitle.classList.add('hidden');
    modalTitleInput.classList.remove('hidden');
    nameEditActions.classList.remove('hidden');
    modalTitleInput.focus();
  });
  document.getElementById('nameCancelBtn').addEventListener('click', function(){
    modalTitle.classList.remove('hidden');
    modalTitleInput.classList.add('hidden');
    nameEditActions.classList.add('hidden');
  });
  document.getElementById('nameSaveBtn').addEventListener('click', function(){
    var newName = modalTitleInput.value.trim();
    if(!newName || !currentId) return;
    var record = records[currentId];
    record.name = newName;
    dbPut(record).then(function(){
      modalTitle.textContent = newName;
      var live = fishes.filter(function(f){ return f.id === currentId; })[0];
      if(live) live.name = newName;
      modalTitle.classList.remove('hidden');
      modalTitleInput.classList.add('hidden');
      nameEditActions.classList.add('hidden');
      toast('RENAMED FISH.');
    }).catch(function(){ toast('COULD NOT SAVE THE NEW NAME.', true); });
  });

  // ---- text edit ----
  document.getElementById('editTextBtn').addEventListener('click', function(){
    if(!isAdmin || !currentId) return;
    readPanelEdit.value = records[currentId].text;
    readPanel.classList.add('hidden');
    readPanelEdit.classList.remove('hidden');
    footDefault.classList.add('hidden');
    footTextEdit.classList.remove('hidden');
    readPanelEdit.focus();
  });
  document.getElementById('textCancelBtn').addEventListener('click', function(){
    readPanel.classList.remove('hidden');
    readPanelEdit.classList.add('hidden');
    footTextEdit.classList.add('hidden');
    footDefault.classList.remove('hidden');
  });
  document.getElementById('textSaveBtn').addEventListener('click', function(){
    if(!currentId) return;
    var record = records[currentId];
    record.text = readPanelEdit.value;
    dbPut(record).then(function(){
      readPanel.textContent = record.text;
      var live = fishes.filter(function(f){ return f.id === currentId; })[0];
      if(live) live.text = record.text;
      readPanel.classList.remove('hidden');
      readPanelEdit.classList.add('hidden');
      footTextEdit.classList.add('hidden');
      footDefault.classList.remove('hidden');
      toast('SAVED.');
    }).catch(function(){ toast('COULD NOT SAVE THE TEXT.', true); });
  });

  // ---- delete ----
  document.getElementById('deleteBtn').addEventListener('click', function(){
    footDefault.classList.add('hidden');
    footConfirm.classList.remove('hidden');
  });
  document.getElementById('cancelDeleteBtn').addEventListener('click', function(){
    footConfirm.classList.add('hidden');
    footDefault.classList.remove('hidden');
  });
  document.getElementById('confirmDeleteBtn').addEventListener('click', function(){
    var id = currentId;
    var name = records[id] ? records[id].name : '';
    dbDelete(id).then(function(){
      removeFromLibrary(id);
      if(id.indexOf('seed-') === 0) markSeedDeleted(id);
      if(pageIndex >= totalPages()) pageIndex = totalPages() - 1;
      renderPage();
      closeModal();
      toast('REMOVED: ' + name);
    }).catch(function(){
      toast('COULD NOT DELETE THAT FISH.', true);
    });
  });

  /* =======================================================
     BOOT
     ======================================================= */
  var wasUnlocked = false;
  try{ wasUnlocked = sessionStorage.getItem('aquarium_unlocked') === '1'; }catch(e){}
  if(wasUnlocked) enterTank();

})();
