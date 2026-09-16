(function(){
  "use strict";
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- Clock & uptime ---------------- */
  var startTime = Date.now();
  function pad(n){ return n<10 ? '0'+n : ''+n; }
  function fmtClock(d){ return pad(d.getHours())+':'+pad(d.getMinutes())+':'+pad(d.getSeconds()); }
  function tickClock(){
    var now = new Date();
    document.getElementById('clock').textContent = fmtClock(now);
    document.getElementById('videoClock').textContent = fmtClock(now);
    var up = Math.floor((Date.now()-startTime)/1000);
    var h = Math.floor(up/3600), m = Math.floor((up%3600)/60), s = up%60;
    document.getElementById('uptime').textContent = pad(h)+':'+pad(m)+':'+pad(s);
    document.getElementById('fusionTime').textContent = fmtClock(now);
  }
  tickClock();
  setInterval(tickClock, 1000);

  /* ---------------- State ---------------- */
  var state = {
    gas: 42, temp: 31, hum: 65,
    fire: false, worker: true, obstacle: true,
    battery: 86, link: 'STRONG'
  };

  function clamp(v,a,b){ return Math.max(a, Math.min(b, v)); }
  function jitter(v, amount){ return v + (Math.random()*2-1)*amount; }

  function pillHTML(kind, text){
    return '<span class="status-pill '+kind+'"><span class="dot"></span>'+text+'</span>';
  }

  function riskFromState(){
    if(state.fire || state.gas > 85) return 'danger';
    if(state.gas > 55 || state.obstacle || state.temp > 36) return 'warn';
    return 'safe';
  }

  function updateReadouts(){
    // gas
    state.gas = clamp(jitter(state.gas, 4), 5, 100);
    document.getElementById('gasVal').innerHTML = Math.round(state.gas)+' ppm ' +
      (state.gas>85 ? pillHTML('danger','DANGER') : state.gas>55 ? pillHTML('warn','WARNING') : pillHTML('safe','NORMAL'));
    document.getElementById('gasBar').style.width = clamp(state.gas,0,100)+'%';
    document.getElementById('gasBar').style.background = state.gas>85 ? 'var(--danger)' : state.gas>55 ? 'var(--warn)' : 'var(--cyan)';

    // temp
    state.temp = clamp(jitter(state.temp, 0.4), 24, 42);
    document.getElementById('tempVal').textContent = state.temp.toFixed(1)+' °C';
    document.getElementById('tempBar').style.width = clamp((state.temp-20)/25*100,0,100)+'%';
    document.getElementById('tempBar').style.background = state.temp>36 ? 'var(--warn)' : 'var(--cyan)';

    // humidity
    state.hum = clamp(jitter(state.hum, 1.2), 30, 95);
    document.getElementById('humVal').textContent = Math.round(state.hum)+' %';
    document.getElementById('humBar').style.width = clamp(state.hum,0,100)+'%';

    // occasional flips
    if(Math.random() < 0.02) state.fire = !state.fire && Math.random() < 0.3 ? true : false;
    if(Math.random() < 0.05) state.worker = Math.random() < 0.85;
    if(Math.random() < 0.06) state.obstacle = Math.random() < 0.6;

    document.getElementById('firePill').innerHTML = state.fire ? pillHTML('danger','DETECTED') : pillHTML('safe','NOT DETECTED');
    document.getElementById('workerPill').innerHTML = state.worker ? pillHTML('safe','DETECTED') : pillHTML('warn','SIGNAL LOST');
    document.getElementById('obstaclePill').innerHTML = state.obstacle ? pillHTML('warn','DETECTED') : pillHTML('safe','CLEAR');

    // battery drains slowly
    state.battery = clamp(state.battery - Math.random()*0.02, 8, 100);
    document.getElementById('battVal').textContent = Math.round(state.battery)+'%';

    // risk banner
    var risk = riskFromState();
    var banner = document.getElementById('riskBanner');
    var badge = document.getElementById('riskBadge');
    banner.classList.remove('warn','danger');
    if(risk==='warn') banner.classList.add('warn');
    if(risk==='danger') banner.classList.add('danger');
    badge.textContent = risk==='safe' ? 'SAFE' : risk==='warn' ? 'WARNING' : 'DANGER';
    document.getElementById('riskHeadline').textContent =
      risk==='safe' ? 'All monitored parameters within safe range' :
      risk==='warn' ? 'Elevated readings detected — monitor closely' :
      'Critical hazard detected — evacuate sector immediately';
    document.getElementById('riskSub').textContent =
      risk==='danger' ? 'Fire/gas threshold breached · rescue team alert dispatched' :
      'Sensor fusion updated continuously from onboard rover telemetry';
  }
  updateReadouts();
  setInterval(updateReadouts, 2200);

  /* ---------------- Alerts feed ---------------- */
  var alertBank = [
    {k:'safe', t:'Gas levels nominal', s:'MQ-135 · sector 4B'},
    {k:'warn', t:'Obstacle detected ahead', s:'Ultrasonic · 0.8m range'},
    {k:'safe', t:'Worker heat signature confirmed', s:'FLIR · thermal ID #1'},
    {k:'warn', t:'Humidity trending upward', s:'DHT11 · +4% in 3 min'},
    {k:'danger', t:'CO concentration spike', s:'MQ-7 · threshold exceeded'},
    {k:'safe', t:'Rover checkpoint reached', s:'Sector 4B — junction 3'},
    {k:'warn', t:'Signal strength degraded', s:'Wi-Fi mesh · relay 2'},
    {k:'danger', t:'Thermal anomaly — possible fire source', s:'FLIR · sector 4B-east'},
    {k:'safe', t:'Structural vibration within limits', s:'IMU · rover chassis'}
  ];
  var alertList = document.getElementById('alertList');
  var alertCountEl = document.getElementById('alertCount');
  var newCount = 0;

  function pushAlert(){
    var a = alertBank[Math.floor(Math.random()*alertBank.length)];
    var row = document.createElement('div');
    row.className = 'alert-item';
    var now = new Date();
    row.innerHTML =
      '<div class="alert-time">'+fmtClock(now)+'</div>'+
      '<div class="alert-dot '+a.k+'"></div>'+
      '<div class="alert-text"><b>'+a.t+'</b><span>'+a.s+'</span></div>';
    alertList.insertBefore(row, alertList.firstChild);
    while(alertList.children.length > 14){ alertList.removeChild(alertList.lastChild); }
    newCount++;
    alertCountEl.textContent = newCount+' NEW';
  }
  pushAlert();
  setInterval(pushAlert, 4500);

  /* ---------------- Video canvas: stylised tunnel ---------------- */
  var vCanvas = document.getElementById('videoCanvas');
  var vCtx = vCanvas.getContext('2d');
  function sizeCanvas(c){
    var rect = c.parentElement.getBoundingClientRect();
    c.width = rect.width * (window.devicePixelRatio||1);
    c.height = rect.height * (window.devicePixelRatio||1);
  }
  sizeCanvas(vCanvas);

  var vT = 0;
  function drawTunnel(){
    var w = vCanvas.width, h = vCanvas.height;
    vCtx.clearRect(0,0,w,h);
    vCtx.fillStyle = '#050a0b';
    vCtx.fillRect(0,0,w,h);

    var cx = w/2, cy = h/2;
    var rings = 9;
    for(var i=rings; i>=0; i--){
      var depth = (i + (vT%1)) / rings;
      var scale = Math.pow(depth, 1.6);
      var rw = w*0.62*scale + w*0.05;
      var rh = h*0.62*scale + h*0.05;
      var alpha = 0.15 + depth*0.5;
      var green = Math.floor(90 + depth*90);
      vCtx.strokeStyle = 'rgba('+Math.floor(green*0.5)+','+green+','+Math.floor(green*0.65)+','+alpha+')';
      vCtx.lineWidth = Math.max(1, 2*scale);
      vCtx.beginPath();
      vCtx.ellipse(cx, cy, rw, rh, 0, 0, Math.PI*2);
      vCtx.stroke();
    }
    // side rails
    vCtx.strokeStyle = 'rgba(80,150,120,0.25)';
    vCtx.lineWidth = 1.5;
    vCtx.beginPath();
    vCtx.moveTo(cx - w*0.06, h); vCtx.lineTo(cx - w*0.02, 0);
    vCtx.moveTo(cx + w*0.06, h); vCtx.lineTo(cx + w*0.02, 0);
    vCtx.stroke();

    // scanline flicker + grain
    vCtx.fillStyle = 'rgba(150,255,200,0.03)';
    for(var y=0; y<h; y+=3){ vCtx.fillRect(0,y,w,1); }

    // moving dust particle
    var px = cx + Math.sin(vT*1.3)*w*0.15;
    var py = cy + Math.cos(vT*0.9)*h*0.12;
    var grad = vCtx.createRadialGradient(px,py,0,px,py,w*0.02);
    grad.addColorStop(0,'rgba(180,255,220,0.5)');
    grad.addColorStop(1,'rgba(180,255,220,0)');
    vCtx.fillStyle = grad;
    vCtx.beginPath(); vCtx.arc(px,py,w*0.02,0,Math.PI*2); vCtx.fill();

    // vignette
    var vg = vCtx.createRadialGradient(cx,cy,h*0.2,cx,cy,h*0.75);
    vg.addColorStop(0,'rgba(0,0,0,0)');
    vg.addColorStop(1,'rgba(0,0,0,0.65)');
    vCtx.fillStyle = vg;
    vCtx.fillRect(0,0,w,h);

    vT += 0.012;
  }

  /* ---------------- Thermal canvas ---------------- */
  var tCanvas = document.getElementById('thermalCanvas');
  var tCtx = tCanvas.getContext('2d');
  sizeCanvas(tCanvas);
  var tT = 0;
  function stopColor(t){
    // simple thermal palette: blue -> purple -> red -> orange -> yellow
    var stops = [
      [0.0,  10,10,60],
      [0.25, 90,10,120],
      [0.5,  200,30,40],
      [0.75, 240,120,10],
      [1.0,  255,230,60]
    ];
    for(var i=0;i<stops.length-1;i++){
      var a = stops[i], b = stops[i+1];
      if(t>=a[0] && t<=b[0]){
        var f = (t-a[0])/(b[0]-a[0]);
        return [a[1]+(b[1]-a[1])*f, a[2]+(b[2]-a[2])*f, a[3]+(b[3]-a[3])*f];
      }
    }
    return [255,230,60];
  }
  function drawThermal(){
    var w = tCanvas.width, h = tCanvas.height;
    // background base gradient (cool)
    for(var y=0;y<h;y+=4){
      var c = stopColor(0.05 + 0.05*Math.sin(y*0.01+tT));
      tCtx.fillStyle = 'rgb('+c[0]+','+c[1]+','+c[2]+')';
      tCtx.fillRect(0,y,w,4);
    }
    // hotspot (worker) drifting
    var hx = w*0.55 + Math.sin(tT*0.7)*w*0.12;
    var hy = h*0.55 + Math.cos(tT*0.5)*h*0.15;
    var r = Math.min(w,h)*0.22;
    var grad = tCtx.createRadialGradient(hx,hy,0,hx,hy,r);
    grad.addColorStop(0,'rgba(255,240,180,0.95)');
    grad.addColorStop(0.35,'rgba(255,150,40,0.85)');
    grad.addColorStop(0.7,'rgba(180,20,60,0.55)');
    grad.addColorStop(1,'rgba(180,20,60,0)');
    tCtx.fillStyle = grad;
    tCtx.beginPath(); tCtx.arc(hx,hy,r,0,Math.PI*2); tCtx.fill();

    // secondary warm structure (machinery)
    var mx = w*0.2, my = h*0.75;
    var grad2 = tCtx.createRadialGradient(mx,my,0,mx,my,w*0.12);
    grad2.addColorStop(0,'rgba(255,120,40,0.5)');
    grad2.addColorStop(1,'rgba(255,120,40,0)');
    tCtx.fillStyle = grad2;
    tCtx.beginPath(); tCtx.arc(mx,my,w*0.12,0,Math.PI*2); tCtx.fill();

    // grid overlay
    tCtx.strokeStyle = 'rgba(0,0,0,0.15)';
    tCtx.lineWidth = 1;
    for(var gx=0; gx<w; gx+=w/12){ tCtx.beginPath(); tCtx.moveTo(gx,0); tCtx.lineTo(gx,h); tCtx.stroke(); }

    // crosshair on hotspot
    tCtx.strokeStyle = 'rgba(255,255,255,0.85)';
    tCtx.lineWidth = 1.5;
    tCtx.beginPath();
    tCtx.moveTo(hx-14,hy); tCtx.lineTo(hx+14,hy);
    tCtx.moveTo(hx,hy-14); tCtx.lineTo(hx,hy+14);
    tCtx.stroke();

    document.getElementById('hotspotTemp').textContent = (36 + Math.sin(tT)*0.6).toFixed(1)+'°C';
    tT += 0.01;
  }

  function loop(){
    drawTunnel();
    drawThermal();
    if(!reduceMotion) requestAnimationFrame(loop);
  }
  if(reduceMotion){ drawTunnel(); drawThermal(); }
  else requestAnimationFrame(loop);

  window.addEventListener('resize', function(){
    sizeCanvas(vCanvas); sizeCanvas(tCanvas);
  });

  /* ---------------- Hazard map (SVG) ---------------- */
  var svgNS = 'http://www.w3.org/2000/svg';
  var mapSvg = document.getElementById('mapSvg');

  // static tunnel network path
  var tunnelPath = 'M 40 320 L 200 320 L 200 200 L 380 200 L 380 90 L 560 90 L 560 220 L 700 220';
  var branchPath = 'M 380 200 L 380 320 L 560 320';

  function svgEl(tag, attrs){
    var el = document.createElementNS(svgNS, tag);
    for(var k in attrs) el.setAttribute(k, attrs[k]);
    return el;
  }

  // background
  mapSvg.appendChild(svgEl('rect',{x:0,y:0,width:800,height:400,fill:'transparent'}));

  // grid dots
  for(var gx=20; gx<800; gx+=40){
    for(var gy=20; gy<400; gy+=40){
      mapSvg.appendChild(svgEl('circle',{cx:gx,cy:gy,r:1,fill:'var(--border)'}));
    }
  }

  mapSvg.appendChild(svgEl('path',{d:tunnelPath, stroke:'var(--text-faint)', 'stroke-width':16, fill:'none','stroke-linecap':'round','stroke-linejoin':'round',opacity:0.25}));
  mapSvg.appendChild(svgEl('path',{d:branchPath, stroke:'var(--text-faint)', 'stroke-width':16, fill:'none','stroke-linecap':'round','stroke-linejoin':'round',opacity:0.25}));
  mapSvg.appendChild(svgEl('path',{d:tunnelPath, stroke:'var(--cyan)', 'stroke-width':2, fill:'none','stroke-dasharray':'2 6', opacity:0.7}));
  mapSvg.appendChild(svgEl('path',{d:branchPath, stroke:'var(--cyan)', 'stroke-width':2, fill:'none','stroke-dasharray':'2 6', opacity:0.4}));

  // hazard markers
  var hazards = [
    {x:380,y:90,label:'GAS',kind:'warn'},
    {x:560,y:320,label:'HEAT',kind:'danger'},
    {x:200,y:200,label:'OK',kind:'safe'}
  ];
  hazards.forEach(function(hz){
    var col = hz.kind==='danger' ? 'var(--danger)' : hz.kind==='warn' ? 'var(--warn)' : 'var(--safe)';
    var ring = svgEl('circle',{cx:hz.x,cy:hz.y,r:14,fill:'none',stroke:col,'stroke-width':1.5,opacity:0.5});
    mapSvg.appendChild(ring);
    mapSvg.appendChild(svgEl('circle',{cx:hz.x,cy:hz.y,r:5,fill:col}));
    var t = svgEl('text',{x:hz.x, y:hz.y-20, fill:col, 'font-family':'var(--mono)', 'font-size':10, 'text-anchor':'middle'});
    t.textContent = hz.label;
    mapSvg.appendChild(t);
  });

  // worker marker
  var workerMarker = svgEl('g',{});
  workerMarker.appendChild(svgEl('circle',{cx:560,cy:90,r:8,fill:'var(--safe)'}));
  var wt = svgEl('text',{x:560,y:75,fill:'var(--safe)','font-family':'var(--mono)','font-size':10,'text-anchor':'middle'});
  wt.textContent = 'WORKER';
  workerMarker.appendChild(wt);
  mapSvg.appendChild(workerMarker);

  // rover marker (animated along path)
  var roverPathPoints = [
    [40,320],[200,320],[200,200],[380,200],[380,90],[560,90],[560,220],[700,220],
    [560,220],[560,320],[380,320],[380,200]
  ];
  var roverGroup = svgEl('g',{});
  var roverGlow = svgEl('circle',{r:12, fill:'var(--cyan)', opacity:0.25});
  var roverDot = svgEl('circle',{r:6, fill:'var(--cyan)', stroke:'#fff','stroke-width':1});
  roverGroup.appendChild(roverGlow);
  roverGroup.appendChild(roverDot);
  mapSvg.appendChild(roverGroup);

  var segIdx = 0, segProg = 0;
  function animateRover(){
    var a = roverPathPoints[segIdx];
    var b = roverPathPoints[(segIdx+1)%roverPathPoints.length];
    var speed = 0.006;
    segProg += speed;
    if(segProg >= 1){ segProg = 0; segIdx = (segIdx+1)%roverPathPoints.length; }
    var x = a[0] + (b[0]-a[0])*segProg;
    var y = a[1] + (b[1]-a[1])*segProg;
    roverGroup.setAttribute('transform','translate('+x+','+y+')');
    document.getElementById('roverCoord').textContent = 'X '+Math.round(x)+' · Y '+Math.round(y);
    if(!reduceMotion) requestAnimationFrame(animateRover);
  }
  if(reduceMotion){
    roverGroup.setAttribute('transform','translate(200,200)');
  } else {
    requestAnimationFrame(animateRover);
  }

})();
