"""Apply this project's static routes/headers using an already authorized Render CLI.

Credentials are read in memory from the CLI's local store and never printed or copied.
Requires PyYAML locally; no Python process runs on the deployed static site.
"""
from pathlib import Path
import json
import os
import urllib.request
import urllib.error
import yaml

resources = json.loads(Path('deploy/resources.json').read_text(encoding='utf-8'))
config_dir = Path(os.environ.get('RENDER_CLI_CONFIG_DIR', Path.home() / '.render'))
config_path = Path(os.environ.get('RENDER_CLI_CONFIG_PATH', config_dir / 'cli.yaml'))
config = yaml.safe_load(config_path.read_text(encoding='utf-8'))
if config.get('workspace') != resources['renderWorkspaceId']:
    raise SystemExit('Select the intended Render workspace with the CLI first.')
token = os.environ.get('RENDER_API_KEY') or config.get('api', {}).get('key')
if not token:
    raise SystemExit('Authorize the Render CLI before applying configuration.')
service_id = resources['renderServiceId']
base = 'https://api.render.com/v1/services/' + service_id

def request(method, suffix='', data=None):
    body = json.dumps(data).encode('utf-8') if data is not None else None
    req = urllib.request.Request(base + suffix, data=body, method=method,
        headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json',
                 'Content-Type': 'application/json', 'User-Agent': 'UMA-deployment-config/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            raw = response.read()
            return json.loads(raw) if raw else None
    except urllib.error.HTTPError as error:
        raise SystemExit(f'Render configuration request failed: HTTP {error.code}; no credentials logged.')

service = request('GET')
if service.get('ownerId') != resources['renderWorkspaceId'] or service.get('repo', '').removesuffix('.git') != resources['repository']:
    raise SystemExit('Service identity or source does not match this project.')
if service.get('type') != 'static_site':
    raise SystemExit('Refusing to configure a non-static service.')
definition = yaml.safe_load(Path('render.yaml').read_text(encoding='utf-8'))['services'][0]
headers = request('GET', '/headers?limit=100')
existing_headers = [row.get('headers', row.get('header', row)) for row in headers]
for header in definition.get('headers', []):
    current = next((h for h in existing_headers if h.get('path') == header['path'] and h.get('name', '').lower() == header['name'].lower()), None)
    if current:
        if current.get('value') != header['value']:
            raise SystemExit('An existing header differs; review before replacing it: ' + header['name'])
    else:
        request('POST', '/headers', header)
    print('Verified header:', header['name'])
existing_routes = [row.get('route', row) for row in request('GET', '/routes?limit=100')]
routes = [{key: route[key] for key in ('type', 'source', 'destination')} for route in existing_routes]
for route in definition.get('routes', []):
    current = next((r for r in routes if r['source'] == route['source']), None)
    if current and current != route:
        raise SystemExit('An existing route differs; review before replacing it: ' + route['source'])
    if not current:
        routes.append(route)
if len(routes) != len(existing_routes):
    request('PUT', '/routes', routes)
print('Verified route count:', len(routes))
print('Static service configuration applied without exposing credentials.')
