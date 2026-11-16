import base64, json, pathlib, time, urllib.request
from websockets.sync.client import connect

root = pathlib.Path(__file__).parent
page = next(p for p in json.load(urllib.request.urlopen('http://localhost:9224/json')) if p['type'] == 'page')
socket = connect(page['webSocketDebuggerUrl'], origin='http://localhost:9224', max_size=16_000_000)
ident = 0
def send(method, params=None):
    global ident
    ident += 1
    current = ident
    socket.send(json.dumps({'id':current,'method':method,'params':params or {}}))
    while True:
        result = json.loads(socket.recv())
        if result.get('id') == current:
            if 'error' in result: raise RuntimeError(result['error'])
            return result.get('result',{})
def evaluate(expression):
    result = send('Runtime.evaluate', {'expression':expression,'returnByValue':True})
    if result.get('exceptionDetails'): raise RuntimeError(result['exceptionDetails'])
    return result.get('result',{}).get('value')
send('Page.enable')
send('Runtime.enable')
send('Network.enable')
send('Network.setCacheDisabled', {'cacheDisabled':True})
evaluate("localStorage.setItem('recalro-demo-session',JSON.stringify({name:'Ekundayochristopher3',email:'test@example.com'}))")
for width in (280,320,390):
    send('Emulation.setDeviceMetricsOverride', {'width':width,'height':700,'deviceScaleFactor':1,'mobile':True,'screenWidth':width,'screenHeight':700})
    send('Page.navigate', {'url':f'http://localhost:8765/?qa={time.time_ns()}#/app/dashboard'})
    time.sleep(2)
    result = evaluate("(() => {const hero=document.querySelector('.dash-modern .hero-card'),h=document.querySelector('#dashGreeting'),a=document.querySelector('#avatarBtn'),buttons=[...document.querySelectorAll('.dash-modern .hero-actions .btn')];return {viewport:innerWidth,width:document.documentElement.scrollWidth,heroRight:Math.round(hero.getBoundingClientRect().right),headlineWidth:h.scrollWidth,headlineClient:h.clientWidth,buttons:buttons.map(b=>({right:Math.round(b.getBoundingClientRect().right),width:Math.round(b.getBoundingClientRect().width)})),avatarRight:Math.round(a.getBoundingClientRect().right),streakVisible:getComputedStyle(document.querySelector('#chipStreak')).display,actionsGrid:getComputedStyle(document.querySelector('.dash-modern .hero-actions')).gridTemplateColumns,nameDisplay:getComputedStyle(document.querySelector('.dash-name')).display,css:[...document.styleSheets].map(s=>s.href).filter(Boolean).at(-1)}})()")
    print(width,json.dumps(result))
    shot = send('Page.captureScreenshot',{'format':'png'})['data']
    (root / f'qa-narrow-{width}.png').write_bytes(base64.b64decode(shot))
socket.close()
