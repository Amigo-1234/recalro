import base64
import json
import pathlib
import time
import urllib.request

from websockets.sync.client import connect

root = pathlib.Path(__file__).resolve().parent.parent
page = next(x for x in json.load(urllib.request.urlopen('http://localhost:9224/json')) if x['type'] == 'page')
socket = connect(page['webSocketDebuggerUrl'], origin='http://localhost:9224', max_size=16_000_000)
counter = 0
errors = []

def send(method, params=None):
    global counter
    counter += 1
    ident = counter
    socket.send(json.dumps({'id': ident, 'method': method, 'params': params or {}}))
    while True:
        response = json.loads(socket.recv())
        if response.get('method') == 'Runtime.exceptionThrown':
            errors.append(response['params']['exceptionDetails'].get('text'))
        if response.get('id') == ident:
            if 'error' in response:
                raise RuntimeError(response['error'])
            return response.get('result', {})

def evaluate(expression):
    result = send('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
    if result.get('exceptionDetails'):
        raise RuntimeError(result['exceptionDetails'])
    return result.get('result', {}).get('value')

def viewport(width, height, mobile):
    send('Emulation.setDeviceMetricsOverride', {'width':width,'height':height,'deviceScaleFactor':1,'mobile':mobile,'screenWidth':width,'screenHeight':height})

def navigate(url):
    send('Page.navigate', {'url': url})
    time.sleep(2)

def shot(name):
    result = send('Page.captureScreenshot', {'format':'png'})
    (root / 'design' / name).write_bytes(base64.b64decode(result['data']))

send('Page.enable')
send('Runtime.enable')
evaluate("localStorage.removeItem('recalro-demo-session')")
viewport(390, 844, True)
navigate('http://localhost:8765/')
evaluate("document.querySelector('#features').scrollIntoView({behavior:'instant'})")
time.sleep(1)
before = evaluate("document.querySelector('.mk-th-tab[aria-selected=true]')?.id")
time.sleep(7)
after = evaluate("document.querySelector('.mk-th-tab[aria-selected=true]')?.id")
print('feature_autoplay', json.dumps({'before':before,'after':after,'cue':evaluate("getComputedStyle(document.querySelector('.mk-th-cue')).display")}))
shot('qa-feature-autoplay-mobile.png')

viewport(1440, 900, False)
navigate('http://localhost:8765/')
evaluate("document.querySelector('.mk-desktop-gallery').scrollIntoView({behavior:'instant',block:'center'})")
time.sleep(1)
print('gallery_desktop', json.dumps(evaluate("({display:getComputedStyle(document.querySelector('.mk-desktop-gallery')).display,images:document.querySelectorAll('.mk-desktop-gallery img').length,width:document.documentElement.scrollWidth,viewport:innerWidth})")))
shot('qa-gallery-desktop.png')

viewport(390, 844, True)
evaluate("localStorage.setItem('recalro-demo-session',JSON.stringify({name:'Alex Morgan',email:'alex@example.com'}))")
navigate('http://localhost:8765/#/app/profile')
document = send('DOM.getDocument')
node = send('DOM.querySelector', {'nodeId':document['root']['nodeId'],'selector':'#profilePhotoInput'})['nodeId']
print('profile_input', node)
send('DOM.setFileInputFiles', {'files':[str(root / 'assets' / 'hero-study-poster.jpg')], 'nodeId':node})
time.sleep(2)
print('profile_photo', json.dumps(evaluate("({photoLength:R.state.profile.photo.length,headerImage:!!document.querySelector('#avatarBtn img'),profileImage:!!document.querySelector('.profile-hero .avatar img'),uploadVisible:!!document.querySelector('.profile-photo-label')})")))
shot('qa-profile-photo-mobile.png')
evaluate("location.hash='#/app/dashboard'")
time.sleep(.8)
print('dashboard_avatar_position', json.dumps(evaluate("(() => {const b=document.querySelector('#avatarBtn').getBoundingClientRect(); return {right:Math.round(b.right),viewport:innerWidth,image:!!document.querySelector('#avatarBtn img'),horizontalOverflow:document.documentElement.scrollWidth>innerWidth}})()")))
shot('qa-dashboard-avatar-mobile.png')

evaluate("location.hash='#/app/settings'")
time.sleep(.8)
print('notification_controls', json.dumps(evaluate("[...document.querySelectorAll('[data-toggle]')].map(x=>x.dataset.toggle)")))
print('notifications_off', json.dumps(evaluate("(() => {document.querySelector('[data-toggle=notificationsEnabled]').click();const n=R.state.notifications.length;R.notify('test');return {enabled:R.state.settings.notificationsEnabled,countBefore:n,countAfter:R.state.notifications.length}})()")))
print('notifications_on', json.dumps(evaluate("(() => {document.querySelector('[data-toggle=notificationsEnabled]').click();const n=R.state.notifications.length;R.notify('test');return {enabled:R.state.settings.notificationsEnabled,countBefore:n,countAfter:R.state.notifications.length}})()")))
viewport(320, 700, True)
evaluate("location.hash='#/app/dashboard'")
time.sleep(.9)
print('dashboard_320', json.dumps(evaluate("(() => {const b=document.querySelector('#avatarBtn').getBoundingClientRect();return {width:document.documentElement.scrollWidth,viewport:innerWidth,avatarRight:Math.round(b.right),streak:document.querySelector('#chipStreak').innerText.trim(),stats:document.querySelectorAll('.dash-modern .stat').length}})()")))
shot('qa-dashboard-320.png')

evaluate("localStorage.removeItem('recalro-demo-session')")
viewport(390, 844, True)
navigate('http://localhost:8765/')
evaluate("document.querySelector('#heroStart').click()")
time.sleep(.6)
print('signup_account', json.dumps(evaluate("({step:RecalroSignup.step,username:!!document.querySelector('#sw-username')})")))
evaluate('''(() => {
  const data = { 'sw-name':'Alex Morgan', 'sw-username':'alex_morgan', 'sw-email':'alex@example.com', 'sw-password':'Password123', 'sw-confirm':'Password123' };
  Object.entries(data).forEach(([id,value]) => { const input=document.getElementById(id); input.value=value; input.dispatchEvent(new Event('input',{bubbles:true})); });
  document.querySelector('#sw-terms').click();
  document.querySelector('[data-next]').click();
})()''')
time.sleep(.6)
evaluate("document.querySelector('[data-next]').click()")
time.sleep(.6)
evaluate("document.querySelector('[data-bind=path][value=university]').click(); document.querySelector('[data-next]').click()")
time.sleep(.6)
print('signup_academic', json.dumps(evaluate("({step:RecalroSignup.step,country:!!document.querySelector('#sw-country'),institution:!!document.querySelector('#sw-inst'),honestCopy:document.querySelector('#sw-title-2')?.parentElement?.innerText.includes('real school')})")))
evaluate("(() => {const select=document.querySelector('#sw-country');select.value='Other';select.dispatchEvent(new Event('change',{bubbles:true}));})()")
time.sleep(.4)
print('custom_country', json.dumps(evaluate("({visible:!!document.querySelector('#sw-country-other') && !document.querySelector('[data-reveal=country]').hidden})")))
shot('qa-signup-academic-mobile.png')
print('runtime_errors', json.dumps(errors))
socket.close()
