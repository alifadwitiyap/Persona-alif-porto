"""Screenshot the six v3 overlay surfaces (forced states) for visual review.

Usage: python lab/shots_overlays.py [url]
Writes lab/shots/ov-*.png
"""
import sys, time, base64, os, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("verify", os.path.join(HERE, "verify.py"))
v = importlib.util.module_from_spec(spec); spec.loader.exec_module(v)

URL = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8077/index.html"
v.URL = URL; v.PORT = 9481
OUT = os.path.join(HERE, "shots"); os.makedirs(OUT, exist_ok=True)

def ev(s, e): return v.ev(s, e)

def shot(sock, name):
    r = v.send(sock, "Page.captureScreenshot", {"format": "png", "captureBeyondViewport": False})
    msg = v.recv_until(sock, r, timeout=25)
    data = None
    for m in (msg if isinstance(msg, list) else [msg]):
        if isinstance(m, dict) and m.get("result", {}).get("data"):
            data = m["result"]["data"]
    if not data:
        print("  no data for", name); return
    p = os.path.join(OUT, f"ov-{name}.png")
    open(p, "wb").write(base64.b64decode(data))
    print("  wrote", p)

def main():
    assert v.launch(), "chrome CDP not up"
    page = next(t for t in v.http_json("/json/list") if t.get("type") == "page")
    sock = v.connect(page["id"])
    for m in ("Page.enable", "Runtime.enable"):
        v.recv_until(sock, v.send(sock, m), timeout=10)
    v.send(sock, "Emulation.setDeviceMetricsOverride",
           {"width": 1440, "height": 900, "deviceScaleFactor": 1, "mobile": False})
    v.recv_until(sock, v.send(sock, "Page.navigate", {"url": URL}), timeout=25)
    time.sleep(3.0); v.drain(sock, 0.6)

    # 1. topbar: progress bar + MENU + M hint
    ev(sock, "document.querySelector('.chapter-progress').style.setProperty('--progress','0.62');"
             "document.getElementById('chapter-progress-fill').style.transform='scaleX(0.62)';"
             "document.getElementById('chapter-progress-label').textContent='CHAPTER 04 / 06';"
             "window.scrollTo(0,0)")
    time.sleep(0.4); shot(sock, "1-topbar-progress")

    # 2. chapter menu overlay (inject items to mimic menu.js render)
    ev(sock, """(function(){
      var l=document.getElementById('chapter-menu-list');
      if(l && !l.children.length){
        var rows=[['01','IDENTITY FILE','Identity File'],['02','HALL OF FAME','Hall of Fame'],
                  ['03','SKILL ARSENAL','Skill Arsenal'],['04','MISSION LOG','Mission Log'],
                  ['05','CASE FILES','Case Files'],['06','OPEN CHANNEL','Open Channel']];
        l.innerHTML=rows.map(function(r){return '<li><button class="chapter-menu__link" type="button"><span class="chapter-menu__num">'+r[0]+'</span><span class="chapter-menu__label">'+r[1]+'</span><span class="chapter-menu__hud">'+r[2]+'</span></button></li>';}).join('');
      }
      var b=l.querySelectorAll('.chapter-menu__link'); if(b[1]){b[1].setAttribute('data-active','true');b[1].setAttribute('aria-current','true');}
      document.getElementById('chapter-menu').removeAttribute('hidden');
    })()""")
    time.sleep(0.6); shot(sock, "2-chapter-menu")
    ev(sock, "document.getElementById('chapter-menu').setAttribute('hidden','')")

    # 3. intro screen
    ev(sock, """(function(){
      if(!document.getElementById('intro')){
        var d=document.createElement('div');d.className='intro';d.id='intro';
        d.innerHTML='<div class="intro__inner"><p class="intro__kicker">4<span class="brand__heart">♥</span>LIFE // INITIATING</p><p class="intro__title">MISSION ARCHIVE</p><div class="intro__bar"><span class="intro__bar-fill" id="intro-fill"></span></div><p class="intro__status">PREPARING EXPERIENCE</p><button class="intro__skip btn" type="button">SKIP INTRO</button></div>';
        document.body.appendChild(d);
      }
      document.getElementById('intro').removeAttribute('hidden');
      document.getElementById('intro-fill').style.transform='scaleX(0.55)';
    })()""")
    time.sleep(0.5); shot(sock, "3-intro")
    ev(sock, "document.getElementById('intro')?.remove()")

    # 4. story beat (hall-of-fame section)
    ev(sock, "document.getElementById('hall-of-fame').scrollIntoView({block:'center'})")
    time.sleep(0.8); shot(sock, "4-story-beat")

    v.cleanup(); print("done")

if __name__ == "__main__":
    main()
