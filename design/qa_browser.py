import base64
import json
import pathlib
import time
import urllib.request

from websockets.sync.client import connect


ROOT = pathlib.Path(__file__).parent
TARGETS = json.load(urllib.request.urlopen('http://localhost:9224/json'))
PAGE = next(target for target in TARGETS if target['type'] == 'page')
SOCKET = connect(PAGE['webSocketDebuggerUrl'], origin='http://localhost:9224', max_size=16_000_000)
counter = 0
errors = []


def send(method, params=None):
    global counter
    counter += 1
    command = counter
    SOCKET.send(json.dumps({'id': command, 'method': method, 'params': params or {}}))
    while True:
        response = json.loads(SOCKET.recv())
        if response.get('method') == 'Runtime.exceptionThrown':
            details = response['params']['exceptionDetails']
            errors.append(details.get('text', 'Exception'))
        if response.get('id') == command:
            if 'error' in response:
                raise RuntimeError(response['error'])
            return response.get('result', {})


def evaluate(expression):
    result = send('Runtime.evaluate', {'expression': expression, 'returnByValue': True})
    if 'exceptionDetails' in result:
        raise RuntimeError(result['exceptionDetails'])
    return result.get('result', {}).get('value')


def viewport(width, height, mobile):
    send('Emulation.setDeviceMetricsOverride', {
        'width': width, 'height': height, 'deviceScaleFactor': 1, 'mobile': mobile,
        'screenWidth': width, 'screenHeight': height,
    })


def screenshot(name, full=False, top=True):
    if top:
        send('Runtime.evaluate', {'expression': 'window.scrollTo(0, 0)'})
    time.sleep(.25)
    result = send('Page.captureScreenshot', {'format': 'png', 'captureBeyondViewport': full})
    (ROOT / name).write_bytes(base64.b64decode(result['data']))


def check(label, shot, full=False):
    time.sleep(1.2)
    stats = evaluate('''(() => ({
      url: location.href, ready: document.readyState,
      route: location.hash, appVisible: document.querySelector('#app') && !document.querySelector('#app').classList.contains('hidden'),
      title: document.querySelector('#view h1, #view h2, .mk-hero h1')?.innerText,
      width: document.documentElement.scrollWidth, viewport: innerWidth,
      height: document.documentElement.scrollHeight,
      cards: document.querySelectorAll('#view .card').length,
      errorPage: document.querySelector('#view')?.innerText.includes("This page couldn't load"),
      body: document.body?.innerText.slice(0, 90)
    }))()''')
    print(label, json.dumps(stats, ensure_ascii=False))
    screenshot(shot, full)


send('Page.enable')
send('Runtime.enable')
viewport(390, 844, True)
send('Page.navigate', {'url': 'http://localhost:8765/'})
time.sleep(3)
print('marketing_sections', json.dumps(evaluate('''[...document.querySelectorAll('#marketing section')].map(e => ({id:e.id || e.className.split(' ').slice(0,2).join('.'), top:Math.round(e.getBoundingClientRect().top + scrollY), height:Math.round(e.getBoundingClientRect().height)}))'''), ensure_ascii=False))
evaluate('''[...document.querySelectorAll('#marketing section')].forEach((e,i) => setTimeout(() => e.scrollIntoView(), i * 180))''')
time.sleep(3)
check('marketing_mobile', 'qa-marketing-mobile.png', True)
evaluate("document.querySelector('#how').scrollIntoView({behavior:'instant'})")
time.sleep(.3)
screenshot('qa-marketing-story-mobile.png', top=False)
evaluate("document.querySelector('.mk-story-steps').scrollLeft = 620")
time.sleep(.7)
print('story_carousel', json.dumps(evaluate('''({active:[...document.querySelectorAll('.mk-story-step')].findIndex(e=>e.classList.contains('is-active')), sceneDisplay:getComputedStyle(document.querySelector('.mk-story-step.is-active .mk-scene')).display})''')))
evaluate("document.querySelector('#tab-roadmap').click(); document.querySelector('#features').scrollIntoView({behavior:'instant'})")
time.sleep(.5)
print('roadmap_demo', json.dumps(evaluate('''({selected:document.querySelector('#tab-roadmap').getAttribute('aria-selected'), visible:!document.querySelector('#demo-roadmap').hidden, milestones:document.querySelectorAll('#demo-roadmap .dm-roadmap-step').length})''')))
screenshot('qa-marketing-roadmap-mobile.png', top=False)
evaluate("localStorage.setItem('recalro-theme','dark')")
send('Page.navigate', {'url': 'http://localhost:8765/'})
time.sleep(2)
print('marketing_dark_preference', json.dumps(evaluate('''({bodyDark:document.body.classList.contains('dark'), background:getComputedStyle(document.querySelector('#marketing')).backgroundColor, colorScheme:getComputedStyle(document.querySelector('#marketing')).colorScheme})''')))
evaluate("localStorage.setItem('recalro-theme','light')")
evaluate("localStorage.setItem('recalro-demo-session', JSON.stringify({name:'Alex Morgan',email:'alex@example.com'}))")
send('Page.navigate', {'url': 'http://localhost:8765/#/app/dashboard'})
check('dashboard_mobile', 'qa-dashboard-mobile.png')
for route in ('subjects', 'review', 'tutor', 'analytics', 'pastq', 'settings'):
    evaluate(f"location.hash = '#/app/{route}'")
    check(route + '_mobile', 'qa-' + route + '-mobile.png')
viewport(1440, 900, False)
evaluate("location.hash = '#/app/dashboard'")
check('dashboard_desktop', 'qa-dashboard-desktop.png')
evaluate("location.hash = '#/app/subjects'")
check('subjects_desktop', 'qa-subjects-desktop.png')
print('runtime_errors', json.dumps(errors, ensure_ascii=False))
SOCKET.close()
