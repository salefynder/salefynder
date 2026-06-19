import urllib.request, urllib.parse, json, math

def haversine(lat1, lng1, lat2, lng2):
    R = 3958.8
    to_rad = lambda d: d * math.pi / 180
    dlat = to_rad(lat2 - lat1)
    dlng = to_rad(lng2 - lng1)
    a = math.sin(dlat/2)**2 + math.cos(to_rad(lat1)) * math.cos(to_rad(lat2)) * math.sin(dlng/2)**2
    return R * 2 * math.asin(math.sqrt(a))

query = urllib.parse.quote('97401')
url = f'https://nominatim.openstreetmap.org/search?q={query}&format=json&limit=1&countrycodes=us'
req = urllib.request.Request(url, headers={'User-Agent': 'SaleFynder/1.0'})
with urllib.request.urlopen(req) as r:
    results = json.loads(r.read())
center_lat = float(results[0]['lat'])
center_lng = float(results[0]['lon'])
print(f'97401 center: {center_lat:.6f}, {center_lng:.6f}')
print()

SUPABASE_URL = 'https://gzoqehooamrudcevfybf.supabase.co'
SUPABASE_KEY = 'sb_publishable_3xhPUfoa2u_EKG5je44FTA_2P-m6LC4'
req2 = urllib.request.Request(
    f'{SUPABASE_URL}/rest/v1/sales?select=title,address,city,lat,lng',
    headers={'apikey': SUPABASE_KEY, 'Authorization': f'Bearer {SUPABASE_KEY}'}
)
with urllib.request.urlopen(req2) as r:
    sales = json.loads(r.read())

radius = 5
included = []
excluded = []
for sale in sales:
    if not sale['lat'] or not sale['lng']:
        excluded.append((sale['title'], sale['address'], sale['city'], None))
        continue
    dist = haversine(center_lat, center_lng, float(sale['lat']), float(sale['lng']))
    if dist <= radius:
        included.append((sale['title'], sale['address'], sale['city'], dist))
    else:
        excluded.append((sale['title'], sale['address'], sale['city'], dist))

included.sort(key=lambda x: x[3])
excluded.sort(key=lambda x: x[3] if x[3] else 9999)

print(f'WITHIN 5 miles ({len(included)}):')
for title, addr, city, dist in included:
    print(f'  {dist:4.1f} mi  {addr}, {city}  --  {title}')

print()
print(f'EXCLUDED ({len(excluded)}):')
for title, addr, city, dist in excluded:
    d = f'{dist:.1f} mi' if dist else 'no lat/lng'
    print(f'  {d:7}  {addr}, {city}  --  {title}')
